/*
  POST   /api/ai-studio/axe/session — admin sign-in
  DELETE /api/ai-studio/axe/session — admin sign-out

  The password is checked against AI_STUDIO_ADMIN_PASSWORD_HASH (scrypt,
  `saltHex:keyHex`, same format and verifier as /axe). It fails closed: with
  the variable unset, no password is accepted. The plain password is never in
  the repo or the environment — only its hash.

  Lockouts (see auth-guard.ts): 3 failures per IP per hour, 20 across all IPs
  per hour. The first time the global lock trips in an hour, an alert email
  goes out — a distributed guess against the admin password is exactly the
  event someone should hear about.
*/

import { NextResponse } from "next/server";

import { adminLoginBlocked, recordAttempt } from "@/lib/ai-studio/auth-guard";
import { audit } from "@/lib/ai-studio/audit";
import { aiInsert, AiDbError } from "@/lib/ai-studio/db";
import { clientIp, FORBIDDEN_ORIGIN, ipHashOf, isSameOriginJson, jsonError, readJsonBody } from "@/lib/ai-studio/http";
import { adminAlertRecipients, sendStudioMail } from "@/lib/ai-studio/mail";
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS, adminIpAllowed, mintAdminSession } from "@/lib/ai-studio/session";
import { verifyPasswordAgainst } from "@/lib/axe/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function alertGlobalLock(): Promise<void> {
  const period = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 13);
  try {
    await aiInsert("ai_alert", { kind: "admin_login_locked", period });
  } catch (error) {
    if (error instanceof AiDbError && error.code === "23505") return;
    throw error;
  }
  await sendStudioMail(adminAlertRecipients(), "Admin sign-in locked after repeated failures", [
    "The AI Studio admin sign-in received 20 or more failed attempts in the last hour and is locked for everyone until the hour passes.",
    "If this wasn't you, someone is guessing the admin password. Consider setting AI_STUDIO_ADMIN_IP_ALLOWLIST and changing the password.",
  ]);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!adminIpAllowed(clientIp(request.headers))) return new NextResponse("Not Found", { status: 404 });
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();

  try {
    // Inside the try: ipHashOf throws when AI_STUDIO_KEY_PEPPER is unset, and
    // outside it that became an unhandled 500 the form showed as "Something
    // went wrong" instead of the logged, explained 503 below.
    const ipHash = ipHashOf(request);
    const { blocked, global } = await adminLoginBlocked(ipHash);
    // Refused attempts are not recorded: the lock already holds, and a write
    // per refused request would let a flood grow the ledger without bound.
    if (blocked) {
      if (global) await alertGlobalLock().catch(() => undefined);
      return jsonError(429, "locked", "Too many attempts. Sign-in is locked for up to an hour.", { "retry-after": "3600" });
    }

    let password = "";
    const body = await readJsonBody<{ password?: unknown }>(request, 1024);
    if (body && typeof body.password === "string") password = body.password;

    const ok = password.length > 0 && password.length <= 256
      && verifyPasswordAgainst(password, process.env.AI_STUDIO_ADMIN_PASSWORD_HASH);
    await recordAttempt("admin", ipHash, ok);

    if (!ok) return jsonError(401, "invalid_credentials", "Incorrect password.");

    await audit({ action: "admin_login", ipHash });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ADMIN_COOKIE, mintAdminSession(), ADMIN_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("[ai-studio/axe/session] login failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Sign-in is temporarily unavailable.");
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, "", { ...ADMIN_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
