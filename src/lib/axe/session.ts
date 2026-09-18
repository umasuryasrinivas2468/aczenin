/*
  The /axe password gate: password verification and session cookie minting.

  This module is shared by two callers that must agree exactly — the route that
  MINTS the cookie (app/api/axe/session/route.ts) and the page that VERIFIES it
  (app/axe/page.tsx). Signing and checking logic drifting apart across two files
  is the classic way an auth cookie ends up trivially forgeable, so both sides
  live here and neither reimplements the other.
*/

// Node's crypto for all three primitives used below. scrypt in particular is
// the reason the /axe routes must run on the Node.js runtime rather than Edge.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Same guard as supabase.ts, and the same caveat applies: this fires at RUNTIME
// in the browser, whereas the `server-only` package fails the BUILD. It is a
// loud crash after the fact, not prevention. What it guards is serious — if
// this module reached a client bundle, AXE_COOKIE_SECRET and AXE_GATE_HASH
// would ship to every visitor and the gate would be forgeable by anyone who
// opened DevTools.
if (typeof window !== "undefined") {
  throw new Error("src/lib/axe/session.ts is server-only and must never reach the browser.");
}

// The cookie name. Deliberately opaque: "axe_session" says nothing about what
// it gates, whereas "founder_analytics_auth" would advertise the existence of a
// private dashboard to anyone glancing at their own cookie jar.
export const AXE_COOKIE_NAME = "axe_session";

// Eight hours. Long enough to cover a working day without re-entering the
// password, short enough that a session left open on an unattended laptop
// expires by itself overnight.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// The scrypt output length, in bytes. MUST match the keylen used when
// AXE_GATE_HASH was generated (scryptSync(password, salt, 64)) — a mismatch
// produces a different derived key and every correct password is rejected.
const SCRYPT_KEYLEN = 64;

/*
  Verifies a submitted password against AXE_GATE_HASH.

  WHY scrypt RATHER THAN bcrypt: scrypt is in the Node standard library, so
  there is no third-party dependency to audit or keep patched, and it is
  memory-hard, which makes GPU cracking far more expensive than bcrypt. The
  cost is that it needs the Node.js runtime, not Edge.
*/
export function verifyPassword(submitted: string): boolean {
  return verifyPasswordAgainst(submitted, process.env.AXE_GATE_HASH);
}

/*
  The same check against an explicitly supplied hash.

  Split out so a second gate — the Finathon registrations dashboard, which has
  its own password and its own FINATHON_GATE_HASH — can reuse this verification
  verbatim instead of copying scrypt, the length guard and the constant-time
  compare into a second file. Three subtle security details reimplemented twice
  is three chances to get one of them wrong in only one of the copies.
*/
export function verifyPasswordAgainst(submitted: string, stored: string | undefined): boolean {

  // Fail CLOSED when the hash is missing.
  //
  // Section 6 of the design doc allows a hardcoded hash constant as a fallback.
  // Not doing that, deliberately: the password is a known dictionary word by
  // the founder's own decision, and the stated mitigation for that weakness is
  // that the hash stays out of git so it cannot be cracked offline. A constant
  // in this file would put it in git and remove exactly that mitigation. A gate
  // that refuses everyone when misconfigured is a visible outage; a gate that
  // silently falls back to a committed hash is a quiet vulnerability.
  if (!stored) {
    return false;
  }

  // Format is `saltHex:keyHex`, produced with scryptSync(password, saltBuf, 64).
  const [saltHex, keyHex] = stored.split(":");
  // A malformed value means the variable was truncated or wrongly pasted.
  // Treated as "no valid hash" rather than throwing, so a config error shows up
  // as a failed login rather than a 500 that leaks a stack trace.
  if (!saltHex || !keyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");

  // Derive with the same parameters used to produce the stored hash. Node's
  // defaults (N=16384, r=8, p=1) are used on both sides; changing them here
  // without regenerating AXE_GATE_HASH would lock the founder out.
  const derived = scryptSync(submitted, salt, SCRYPT_KEYLEN);

  // timingSafeEqual THROWS on mismatched lengths, which would turn a corrupt
  // env var into a 500. Checking first also avoids leaking the expected length
  // through the difference between a throw and a false.
  if (derived.length !== expected.length) {
    return false;
  }

  // Constant-time comparison, not ===. A byte-by-byte early-exit compare leaks
  // how many leading bytes were correct through response timing, which lets an
  // attacker recover the hash one byte at a time instead of guessing it whole.
  return timingSafeEqual(derived, expected);
}

/*
  Mints a signed session cookie value.

  Shape: `<expiryMillis>.<nonce>.<hmacHex>`.

  The expiry is carried IN the value and signed, rather than relying on the
  cookie's own Max-Age. A browser-side expiry is a hint the client is free to
  ignore — an attacker replaying a captured cookie simply does not honour it.
  A signed expiry is checked by the server and cannot be extended without the
  secret.
*/
export function mintSessionCookie(now: number = Date.now()): string {
  const expiresAt = now + SESSION_TTL_MS;
  // A random nonce makes every issued cookie unique even when two logins land
  // in the same millisecond, so one captured value can be told apart from
  // another in the auth log if that is ever needed.
  const nonce = randomBytes(9).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

/*
  Verifies a cookie value produced by mintSessionCookie.

  Returns a plain boolean: the caller only ever needs to know "let this request
  see the dashboard or not", and returning a richer object would invite call
  sites to trust fields that are not actually authenticated.
*/
export function verifySessionCookie(value: string | undefined, now: number = Date.now()): boolean {
  // No cookie at all is the overwhelmingly common case — every first visit and
  // every crawler — so it is handled first and cheaply.
  if (!value) {
    return false;
  }

  const parts = value.split(".");
  // Exactly three segments, or the value did not come from mintSessionCookie.
  if (parts.length !== 3) {
    return false;
  }

  const [expiresAtRaw, nonce, signature] = parts;
  const payload = `${expiresAtRaw}.${nonce}`;

  // Signature is checked BEFORE the expiry is trusted. The expiry is
  // attacker-supplied text until the HMAC proves otherwise, so reading it first
  // would mean acting on unverified input — the standard ordering mistake in
  // signed-token verification.
  if (!signatureMatches(payload, signature)) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  // Number() yields NaN for junk, and every comparison against NaN is false, so
  // an explicit finiteness check is what stops a malformed-but-signed value
  // from slipping through the comparison below.
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return now < expiresAt;
}

/*
  HMAC-SHA256 over the payload using AXE_COOKIE_SECRET.

  HMAC rather than a plain hash of secret + payload: the naive construction is
  vulnerable to length-extension against SHA-2, which would let an attacker
  append to a payload and still produce a valid tag. HMAC is built to resist it.
*/
function sign(payload: string): string {
  const secret = process.env.AXE_COOKIE_SECRET;
  // Throwing here rather than signing with a default: a predictable secret
  // means anyone can forge a session, so a hard failure at mint time is far
  // preferable to a gate that appears to work and does not.
  if (!secret) {
    throw new Error("AXE_COOKIE_SECRET is not set; refusing to mint an unsigned session.");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/*
  Constant-time signature comparison.

  Separated from sign() because verification must tolerate a missing secret by
  returning false rather than throwing: an unauthenticated visitor hitting /axe
  on a misconfigured deploy should see the password form, not a 500.
*/
function signatureMatches(payload: string, candidate: string): boolean {
  const secret = process.env.AXE_COOKIE_SECRET;
  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  // Compared as UTF-8 bytes of the hex strings. Both are the same length by
  // construction when genuine, and the length guard below keeps
  // timingSafeEqual from throwing on a forged value of the wrong size.
  const expectedBuffer = Buffer.from(expected, "utf8");
  const candidateBuffer = Buffer.from(candidate, "utf8");
  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  // Same constant-time reasoning as verifyPassword: an early-exit compare here
  // would let an attacker forge a signature byte by byte using timing alone.
  return timingSafeEqual(expectedBuffer, candidateBuffer);
}

/*
  The cookie attributes, in one place so the mint site cannot get them subtly
  wrong. Every flag here is load-bearing:

  - httpOnly  : JavaScript cannot read the value, so an employee with DevTools
                open — the actual threat model for a founder-only dashboard —
                sees nothing useful.
  - secure    : never sent over plain HTTP, so it cannot be captured in transit.
                Disabled in development because localhost is not HTTPS and the
                cookie would otherwise be silently dropped on every login.
  - sameSite  : 'lax' blocks the cookie on cross-site POSTs (CSRF) while still
                allowing it on a normal top-level navigation to /axe, which is
                how the founder actually arrives.
  - path '/'  : scoped to the whole site rather than /axe, so the sign-out route
                and any future /api/axe/* endpoint see the same cookie.
*/
export const AXE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // Mirrors the signed expiry so the browser also discards the cookie on time.
  // Belt and braces: the signed value is what is actually enforced.
  maxAge: SESSION_TTL_MS / 1000,
};
