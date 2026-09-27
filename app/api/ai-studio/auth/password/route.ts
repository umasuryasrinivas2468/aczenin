/*
  POST /api/ai-studio/auth/password — set a new password.

  Accepted in either stage: it is the ONLY thing a "pwchange" session can do.
  Always requires the current password (for initial accounts that is the
  email), so a hijacked-but-unattended session cannot silently take over the
  account. On success session_version is bumped — every other session of the
  user is signed out — and this browser gets a fresh full-stage cookie.
*/

import { NextResponse } from "next/server";

import { audit } from "@/lib/ai-studio/audit";
import { recordAttempt, userLoginBlocked } from "@/lib/ai-studio/auth-guard";
import { burnPasswordCost, hashEmail, hashPassword, safeEqual, verifyPassword } from "@/lib/ai-studio/crypto";
import { aiSelectOne, aiUpdate, eq } from "@/lib/ai-studio/db";
import {
  BAD_REQUEST,
  FORBIDDEN_ORIGIN,
  ipHashOf,
  isSameOriginJson,
  jsonError,
  readJsonBody,
  UNAUTHENTICATED,
} from "@/lib/ai-studio/http";
import { checkPassword } from "@/lib/ai-studio/password-policy";
import { getUserSession, mintUserSession, USER_COOKIE, USER_COOKIE_OPTIONS } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  const session = await getUserSession();
  if (!session) return UNAUTHENTICATED();

  const body = await readJsonBody<{ currentPassword?: unknown; newPassword?: unknown }>(request, 4096);
  if (!body) return BAD_REQUEST();
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";

  const { user } = session;
  const policy = checkPassword(next, user.email);
  if (!policy.ok) return jsonError(422, "weak_password", policy.problems[0]);

  try {
    const ipHash = ipHashOf(request);
    const subjectHash = hashEmail(user.email);
    // Same limiter as sign-in: this endpoint also verifies a password.
    if (await userLoginBlocked(ipHash, subjectHash)) {
      return jsonError(429, "too_many_attempts", "Too many attempts. Try again in 15 minutes.", { "retry-after": "900" });
    }

    const row = await aiSelectOne<{ password_hash: string | null; session_version: number }>(
      "ai_user",
      `id=${eq(user.id)}&select=password_hash,session_version`,
    );
    if (!row) return UNAUTHENTICATED();

    let ok: boolean;
    if (row.password_hash) {
      ok = await verifyPassword(current, row.password_hash);
      if (ok && (await verifyPassword(next, row.password_hash))) {
        return jsonError(422, "weak_password", "Choose a password you haven't used here before.");
      }
    } else {
      await burnPasswordCost(current);
      ok = safeEqual(current.trim().toLowerCase(), user.email);
    }

    if (!ok) {
      await recordAttempt("user", ipHash, false, subjectHash);
      return jsonError(401, "invalid_credentials", "Your current password is incorrect.");
    }

    const newVersion = row.session_version + 1;
    // Conditional on the version read above, so two concurrent changes cannot
    // both succeed with the second silently overwriting the first.
    const updated = await aiUpdate(
      "ai_user",
      `id=${eq(user.id)}&session_version=${eq(row.session_version)}`,
      {
        password_hash: await hashPassword(next),
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
        session_version: newVersion,
        updated_at: new Date().toISOString(),
      },
    );
    if (updated.length === 0) {
      return jsonError(409, "conflict", "Your password was changed elsewhere. Sign in again.");
    }

    await audit({ actor: "user", action: "password_changed", targetType: "user", targetId: user.id, ipHash });

    const response = NextResponse.json({ ok: true, next: "/ai-studio" }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(USER_COOKIE, mintUserSession(user.id, newVersion, "full"), USER_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("[ai-studio/password] failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not change the password right now. Try again shortly.");
  }
}
