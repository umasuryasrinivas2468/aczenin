/*
  POST /api/finathon/session — the login endpoint for the /Finathon/axe/26 gate.

  A near-copy of /api/axe/session in shape, differing in exactly two places: the
  password it checks (FINATHON_GATE_HASH rather than AXE_GATE_HASH) and the
  cookie it mints (fin_session rather than axe_session). Those two differences
  are the whole reason the dashboards are independent, so they are the two lines
  worth reading carefully here.

  The ordering below is the security-relevant part and is unchanged from the
  /axe route: rate limit BEFORE the password check, so a blocked caller learns
  nothing from the timing of the scrypt comparison and cannot use this endpoint
  as its own denial-of-service amplifier.
*/

import { NextResponse } from "next/server";

import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
import { AXE_COOKIE_OPTIONS, mintSessionCookie } from "@/lib/axe/session";
import { FINATHON_COOKIE_NAME, verifyFinathonPassword } from "@/lib/finathon/gate";
import { axeCount, axeInsert } from "@/lib/axe/supabase";

// scrypt lives in node:crypto, which Edge does not provide.
export const runtime = "nodejs";

// A login endpoint that returned a cached response would hand the previous
// caller's outcome to the next one.
export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

/*
  Attempts are recorded in the shared axe_auth_attempt table.

  Shared rather than a second table of its own: the row holds only a hashed IP,
  a timestamp and a boolean, with nothing saying which gate it belonged to. The
  practical effect is that the two gates share one attempt budget per IP, which
  is if anything the safer reading — somebody guessing at both dashboards from
  one address is exactly who should be slowed down twice as fast.
*/
async function logAttempt(ipHash: string, succeeded: boolean): Promise<void> {
  try {
    await axeInsert("axe_auth_attempt", { ip_hash: ipHash, succeeded });
  } catch (error) {
    // Swallowed: a failed audit insert must not lock the organisers out of
    // their own registrations list. It is logged so a permanently broken audit
    // trail is still visible in the runtime logs.
    console.error("[finathon/session] could not record auth attempt:", error);
  }
}

async function recentAttemptCount(ipHash: string): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  return axeCount("axe_auth_attempt", `ip_hash=eq.${ipHash}&occurred_at=gte.${since}`);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Inside the try for the same reason as the register route: this throws
    // when AXE_SALT is unset, and outside it that is an unhandled exception and
    // a bodyless 500 rather than the JSON error the gate form expects.
    const ipHash = rateLimitIpHash(clientIp(request.headers));

    // --- 1. Rate limit, before any password work ---------------------------
    const attempts = await recentAttemptCount(ipHash);
    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      await logAttempt(ipHash, false);
      return NextResponse.json(
        // Deliberately shaped like the failure response below: saying "too many
        // attempts" would confirm the limiter exists and let an attacker time
        // their guesses around it.
        { ok: false, error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }

    // --- 2. Read the submitted password ------------------------------------
    // Own try, error discarded — the outer catch logs, and a JSON SyntaxError
    // carries the first ~30 characters of the body, which here is a password.
    let password = "";
    try {
      const body = (await request.json()) as { password?: unknown };
      password = typeof body.password === "string" ? body.password : "";
    } catch {
      // Left empty; fails verification below like any other wrong password, and
      // still spends an attempt so junk bodies are not a free probe.
    }

    // --- 3. Verify -----------------------------------------------------------
    const ok = verifyFinathonPassword(password);

    // Awaited, not fired and forgotten: a serverless instance may be frozen the
    // moment the response returns, and an un-awaited insert would never land.
    await logAttempt(ipHash, ok);

    if (!ok) {
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }

    // --- 4. Mint the session -------------------------------------------------
    const response = NextResponse.json({ ok: true });
    // AXE_COOKIE_OPTIONS is reused verbatim: httpOnly, secure in production,
    // sameSite lax, path '/'. Every flag applies here for the same reason, and
    // duplicating the object would let the two gates drift apart on a detail
    // like the Secure flag, which fails silently.
    response.cookies.set(FINATHON_COOKIE_NAME, mintSessionCookie(), AXE_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("[finathon/session] login failed:", error);
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }
}
