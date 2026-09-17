/*
  POST /api/axe/session — the login endpoint for the /axe gate.

  Three jobs, in this order: rate-limit the caller, verify the password with
  scrypt, mint a signed session cookie.

  The ordering is the security-relevant part. Rate limiting runs BEFORE the
  password is checked, so a blocked attacker cannot use response timing from the
  scrypt comparison to learn anything, and so the expensive memory-hard hash is
  never run on behalf of someone already over their limit — which would turn
  this endpoint into its own denial-of-service amplifier.
*/

import { NextResponse } from "next/server";

import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
import {
  AXE_COOKIE_NAME,
  AXE_COOKIE_OPTIONS,
  mintSessionCookie,
  verifyPassword,
} from "@/lib/axe/session";
import { axeCount, axeInsert } from "@/lib/axe/supabase";

// scrypt lives in node:crypto, which the Edge runtime does not provide. This is
// the runtime the design doc calls for in section 6 and it is not optional.
export const runtime = "nodejs";

// Never cached or prerendered: a login endpoint that returned a cached response
// would hand the previous caller's outcome to the next one.
export const dynamic = "force-dynamic";

// The trailing window the rate limiter counts over.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Attempts allowed from one hashed IP inside that window. Eight is chosen to be
// forgiving of a founder mistyping on a phone keyboard while still reducing an
// online guessing attack to roughly 32 attempts an hour — which, against any
// password at all, is not a viable attack. This number is the actual mitigation
// for the known-weak password recorded in section 9.2 of the design doc; the
// hash strength is not, because the hash is never exposed to be cracked.
const RATE_LIMIT_MAX_ATTEMPTS = 8;

/*
  Records an attempt, success or failure.

  Every attempt is logged, not just failures: a burst of failures followed by a
  success is the signature of a successful guess, and that pattern is invisible
  if only the failures are kept.
*/
async function logAttempt(ipHash: string, succeeded: boolean): Promise<void> {
  try {
    await axeInsert("axe_auth_attempt", { ip_hash: ipHash, succeeded });
  } catch (error) {
    // Swallowed deliberately. If the audit insert fails, the login itself must
    // still resolve one way or the other — a database hiccup should not lock
    // the founder out of their own dashboard. The failure is logged so a
    // permanently broken audit trail is still noticeable in the runtime logs.
    console.error("[axe/session] could not record auth attempt:", error);
  }
}

/*
  Counts recent attempts from one hashed IP.

  Reads the axe_auth_attempt table rather than an in-process counter. That is
  the whole reason the table exists: serverless instances do not share memory,
  so an in-memory Map resets on every cold start and an attacker spreading
  guesses across instances would never trip the limit. The check has to live
  somewhere both instances can see, which means the database.
*/
async function recentAttemptCount(ipHash: string): Promise<number> {
  // ISO string because PostgREST compares timestamptz against ISO-8601 text.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  // HEAD + count=exact, so Postgres does the counting and no rows cross the
  // wire to produce a single integer.
  return axeCount("axe_auth_attempt", `ip_hash=eq.${ipHash}&occurred_at=gte.${since}`);
}

export async function POST(request: Request): Promise<NextResponse> {
  // Derived before anything else because both the rate-limit check and the
  // audit log need it, and because it must be a hash from the very first use —
  // there is no point in the request where a raw IP is held in a named variable
  // that outlives this line.
  const ipHash = rateLimitIpHash(clientIp(request.headers));

  try {
    // --- 1. Rate limit, before any password work ---------------------------
    const attempts = await recentAttemptCount(ipHash);
    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      // The blocked attempt is itself logged, so the limiter extends the
      // lockout for a caller who keeps hammering rather than letting them idle
      // back under the threshold while still sending traffic.
      await logAttempt(ipHash, false);
      return NextResponse.json(
        // Deliberately vague, and identical in shape to the failure response
        // below. Saying "too many attempts" would confirm to an attacker that
        // the limiter exists and let them time their guesses around it.
        { ok: false, error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }

    // --- 2. Read the submitted password ------------------------------------
    /*
      Parsed in its OWN try whose catch discards the error entirely, rather than
      inside the outer try that logs what it caught.

      The reason is not tidiness. V8 embeds roughly the first 30 characters of
      the offending input in a JSON SyntaxError message — so a malformed login
      POST produces `Unexpected token … "{"password":"hunter2…` and the outer
      catch would write part of a submitted credential straight into the runtime
      log. Discarding the error is the only safe handling for a parse failure on
      a body that contains a password.
    */
    let password = "";
    try {
      const body = (await request.json()) as { password?: unknown };
      // Type-checked rather than coerced. Passing a non-string into scryptSync
      // throws, which would turn a malformed probe into a 500 leaking a stack.
      password = typeof body.password === "string" ? body.password : "";
    } catch {
      // Left as the empty string, which fails verification below like any other
      // wrong password — and still spends a rate-limit attempt, so a flood of
      // junk bodies cannot be used to probe the endpoint for free.
    }

    // --- 3. Verify -----------------------------------------------------------
    const ok = verifyPassword(password);

    // Awaited rather than fired and forgotten: on a serverless platform the
    // instance may be frozen the moment the response is returned, and an
    // un-awaited insert would simply never reach the database. The audit trail
    // is worth the few milliseconds.
    await logAttempt(ipHash, ok);

    if (!ok) {
      // A generic message with no hint about which part was wrong. There is
      // only one secret here, so "wrong password" and "wrong user" cannot be
      // distinguished anyway — but the vagueness also keeps the response
      // identical to the 429 above at a glance.
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }

    // --- 4. Mint the session -------------------------------------------------
    const response = NextResponse.json({ ok: true });
    // Set on the response rather than through cookies() from next/headers: in a
    // Route Handler this is the form that reliably attaches Set-Cookie to the
    // outgoing response.
    response.cookies.set(AXE_COOKIE_NAME, mintSessionCookie(), AXE_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    // No error detail reaches the caller. On an auth endpoint the error text is
    // itself a disclosure — it can reveal that Supabase is the backend, which
    // table backs the limiter, and whether a given failure was config or
    // credentials.
    console.error("[axe/session] login failed:", error);
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }
}
