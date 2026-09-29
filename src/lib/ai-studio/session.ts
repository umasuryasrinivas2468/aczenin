/*
  Sessions for the two AI Studio gates:

  - "ais": team leads at /ai-studio. Stateless signed cookie carrying the user
    id, the user's session_version and a stage ("full" or "pwchange"). Every
    verification re-reads the user row, so suspending an account, changing a
    password or an admin force-logout (all of which bump session_version or
    status) takes effect on the very next request.
  - "aia": the admin at /ai-studio/axe. Short-lived, separate secret, separate
    cookie, SameSite=Strict.

  Neither gate shares a secret or a cookie with /axe or /Finathon/axe/26, so a
  session for one can never be replayed against another.
*/

import { cookies } from "next/headers";

import { aiSelectOne, eq } from "@/lib/ai-studio/db";
import { randomId, signToken, verifyToken } from "@/lib/ai-studio/crypto";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/session.ts is server-only and must never reach the browser.");
}

const PROD = process.env.NODE_ENV === "production";

/*
  __Host- prefix in production: the browser then refuses the cookie unless it
  is Secure, has Path=/ and has NO Domain attribute — so a sibling subdomain
  can never set or overwrite it (cookie tossing). Plain names in development,
  where localhost is not HTTPS and the prefix would make the browser drop it.
*/
export const USER_COOKIE = PROD ? "__Host-aczen_ais" : "aczen_ais";
export const ADMIN_COOKIE = PROD ? "__Host-aczen_aia" : "aczen_aia";

const USER_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_TTL_MS = 30 * 60 * 1000;

export type UserStage = "full" | "pwchange";

export interface StudioUser {
  id: string;
  email: string;
  display_name: string | null;
  team_name: string | null;
  status: "active" | "suspended" | "disabled";
  status_reason: string | null;
  must_change_password: boolean;
  session_version: number;
  last_login_at: string | null;
}

export interface StudioSession {
  user: StudioUser;
  stage: UserStage;
}

export const USER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: PROD,
  sameSite: "lax" as const,
  path: "/",
  maxAge: USER_TTL_MS / 1000,
};

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: PROD,
  sameSite: "strict" as const,
  path: "/",
  maxAge: ADMIN_TTL_MS / 1000,
};

/* ============================ Team leads ============================ */

export function mintUserSession(userId: string, sessionVersion: number, stage: UserStage): string {
  const expiresAt = Date.now() + USER_TTL_MS;
  return signToken("AI_STUDIO_SESSION_SECRET", [
    "ais", userId, String(sessionVersion), stage, String(expiresAt), randomId(9),
  ]);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function readUserSessionFrom(value: string | undefined): Promise<StudioSession | null> {
  const fields = verifyToken("AI_STUDIO_SESSION_SECRET", value, 6);
  if (!fields) return null;
  const [gate, userId, versionRaw, stage, expiresRaw] = fields;
  if (gate !== "ais" || !UUID.test(userId)) return null;
  if (stage !== "full" && stage !== "pwchange") return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return null;

  const user = await aiSelectOne<StudioUser>(
    "ai_user",
    `id=${eq(userId)}&select=id,email,display_name,team_name,status,status_reason,must_change_password,session_version,last_login_at`,
  );
  if (!user) return null;
  // A bumped version means every earlier session was revoked.
  if (String(user.session_version) !== versionRaw) return null;
  if (user.status === "disabled") return null;

  // The database is authoritative for the stage: a "full" cookie for an
  // account an admin has since reset back to its initial password is demoted.
  const effectiveStage: UserStage = user.must_change_password ? "pwchange" : (stage as UserStage);
  return { user, stage: effectiveStage };
}

export async function getUserSession(): Promise<StudioSession | null> {
  const store = await cookies();
  try {
    return await readUserSessionFrom(store.get(USER_COOKIE)?.value);
  } catch (error) {
    console.error("[ai-studio/session] user session lookup failed:", (error as Error).message);
    return null;
  }
}

/* The fields safe to hand to client components. */
export function publicUser(user: StudioUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    teamName: user.team_name,
    status: user.status,
    statusReason: user.status_reason,
  };
}

/* =============================== Admin =============================== */

export function mintAdminSession(): string {
  return signToken("AI_STUDIO_ADMIN_SESSION_SECRET", ["aia", String(Date.now() + ADMIN_TTL_MS), randomId(9)]);
}

export function verifyAdminSession(value: string | undefined): boolean {
  const fields = verifyToken("AI_STUDIO_ADMIN_SESSION_SECRET", value, 3);
  if (!fields) return false;
  const [gate, expiresRaw] = fields;
  if (gate !== "aia") return false;
  const expiresAt = Number(expiresRaw);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export async function hasAdminSession(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_COOKIE)?.value);
}

/*
  Optional IP allowlist for the admin panel (AI_STUDIO_ADMIN_IP_ALLOWLIST,
  comma-separated exact IPs). Unset = open to any IP (password + lockout only).
  When set and the caller is not on it, the admin routes answer 404 so the
  panel's existence is not confirmed.
*/
export function adminIpAllowed(ip: string): boolean {
  const raw = process.env.AI_STUDIO_ADMIN_IP_ALLOWLIST?.trim();
  if (!raw) return true;
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean).includes(ip);
}
