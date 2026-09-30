/*
  POST /api/ai-studio/auth/login — team lead sign-in.

  Order matters, as in /api/axe/session: origin check, then rate limit, then
  the password check, so a blocked caller never gets to run scrypt (no timing
  oracle, no CPU amplification).

  Initial accounts have no password hash: their password is their email
  address, by design decision. Such a login succeeds into the "pwchange"
  stage only — every page and API except the change-password form refuses it
  until a real password is set.

  Every failure returns the same message and roughly the same timing, whether
  the email is unknown, the password is wrong, or the account is disabled, so
  the endpoint cannot be used to discover which team-lead emails exist.
*/

import { NextResponse } from "next/server";

import { recordAttempt, userLoginBlocked } from "@/lib/ai-studio/auth-guard";
import { burnPasswordCost, hashEmail, safeEqual, verifyPassword } from "@/lib/ai-studio/crypto";
import { aiSelectOne, aiUpdate, eq } from "@/lib/ai-studio/db";
import { BAD_REQUEST, FORBIDDEN_ORIGIN, ipHashOf, isSameOriginJson, jsonError, readJsonBody } from "@/lib/ai-studio/http";
import { mintUserSession, USER_COOKIE, USER_COOKIE_OPTIONS } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID = () => jsonError(401, "invalid_credentials", "Incorrect email or password.");

interface LoginUser {
  id: string;
  email: string;
  password_hash: string | null;
  status: string;
  session_version: number;
  must_change_password: boolean;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();

  const body = await readJsonBody<{ email?: unknown; password?: unknown }>(request, 4096);
  if (!body) return BAD_REQUEST();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 256) return INVALID();

  try {
    const ipHash = ipHashOf(request);
    const subjectHash = hashEmail(email);

    // Refused attempts are not recorded, so a flood cannot grow the ledger.
    if (await userLoginBlocked(ipHash, subjectHash)) {
      return jsonError(429, "too_many_attempts", "Too many sign-in attempts. Try again in 15 minutes.", {
        "retry-after": "900",
      });
    }

    const user = await aiSelectOne<LoginUser>(
      "ai_user",
      `email=${eq(email)}&select=id,email,password_hash,status,session_version,must_change_password`,
    );

    let ok = false;
    if (!user) {
      await burnPasswordCost(password);
    } else if (user.password_hash) {
      ok = await verifyPassword(password, user.password_hash);
    } else {
      // Initial password = the email address, compared case-insensitively
      // (people type their address in whatever case). The dummy scrypt keeps
      // this branch as slow as the others.
      await burnPasswordCost(password);
      ok = safeEqual(password.trim().toLowerCase(), user.email);
    }

    if (ok && user.status === "disabled") ok = false;
    await recordAttempt("user", ipHash, ok, subjectHash);
    if (!ok || !user) return INVALID();

    await aiUpdate("ai_user", `id=${eq(user.id)}`, { last_login_at: new Date().toISOString() });

    const stage = user.must_change_password || !user.password_hash ? "pwchange" : "full";
    const response = NextResponse.json(
      { ok: true, next: stage === "pwchange" ? "/ai-studio/change-password" : "/ai-studio" },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(USER_COOKIE, mintUserSession(user.id, user.session_version, stage), USER_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("[ai-studio/login] failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Sign-in is temporarily unavailable. Try again shortly.");
  }
}
