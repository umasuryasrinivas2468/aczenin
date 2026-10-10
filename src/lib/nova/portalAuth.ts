/*
  Nova developer-portal sign-in: allowlisted email + password, and
  server-side portal sessions (design: docs/nova-api-architecture.md §4.4, §5).

  THE SHAPE OF THE FLOW
    signIn(email, password) → throttle → allowlist + password==email → session cookie
    getPortalUser()         → cookie → session row joined to the allowlist
    signOut()               → delete the session row and the cookie

  The password is the user's own allowlisted email (decided 2026-09-29), so
  there is no stored password and no reset flow. See the ponytail note in
  signIn() for what that trades away.

  TWO PROPERTIES EVERYTHING BELOW SERVES
  1. One failure message for unknown email and wrong password alike.
  2. Revocation is instant. Sessions live in the database, not in a signed
     cookie, and every read joins the allowlist — delete the row, access ends.

  Throws only for infrastructure failures (DB down). The caller
  (app/nova-api/actions.ts) turns those into a generic message; every
  EXPECTED outcome (throttled, wrong password) comes back as a value.
*/

// sha256 for session tokens; randomBytes for tokens and the dummy hash.
import { createHash, randomBytes } from "node:crypto";
// Request-scoped cookie and header access, valid in server components and actions.
import { cookies, headers } from "next/headers";

// Reused, not reimplemented: the audited IP hashing from the /axe gate.
import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
// Same cookie flags as every other gate.
import { AXE_COOKIE_OPTIONS } from "@/lib/axe/session";
// GET/POST/DELETE against the Nova project (portals may use novaWrite).
import { novaRead, novaWrite } from "@/lib/nova/db";

// Same tripwire as db.ts: this module holds the service-role call paths.
if (typeof window !== "undefined") {
  throw new Error("src/lib/nova/portalAuth.ts is server-only and must never reach the browser.");
}

// Distinct from axe_session / fin_session / nova_admin so no gate's cookie can
// be mistaken for another's.
export const PORTAL_COOKIE_NAME = "nova_session";

// Design §4.4: portal sessions last a week.
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// One window for both throttles.
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
// Any outcome counts toward the IP budget: stops one machine spraying guesses.
const LOGIN_MAX_PER_IP = 10;
// Beyond this, a "password" is junk input; cap it before normalising.
const PASSWORD_MAX_LENGTH = 1024;

// One message for unknown email, wrong password and malformed input alike.
const BAD_CREDENTIALS = "Incorrect email or password.";
// Throttle text. Safe to differ: it is decided per IP, before the allowlist
// lookup, so it says nothing about whether an email is listed.
const THROTTLED_MESSAGE = "Too many attempts. Wait 15 minutes and try again.";

// What callers get back for every expected outcome.
export type PortalResult = { ok: true; message: string } | { ok: false; message: string };

// Returned by getPortalUser; deliberately just the email — nothing else is needed.
export type PortalUser = { email: string };

/*
  Lowercase + trim, then a conservative shape check. Returns null when the
  input is not plausibly an email. The character whitelist matters beyond
  validation: the value is interpolated into PostgREST filters, and keeping
  out ",()" means it can never be read as filter syntax even before encoding.
*/
export function normaliseEmail(raw: unknown): string | null {
  // Server actions receive whatever the client sent; never trust the type.
  if (typeof raw !== "string") return null;
  // The allowlist CHECK constraint forces lowercase, so lookups must match it.
  const email = raw.trim().toLowerCase();
  // 254 is the SMTP path limit; anything longer is not a real address.
  if (email.length > 254) return null;
  // local@domain.tld with a safe character set; a pragmatic subset of RFC 5322.
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) ? email : null;
}

// sha256 hex — for session tokens, which carry 256 bits and need no slow hash.
function sha256Hex(value: string): string {
  // Hex because the schema stores token_hash as text and hex is unambiguous.
  return createHash("sha256").update(value).digest("hex");
}

// An instant as an ISO string, URL-encoded, ready for a PostgREST filter value.
function isoParam(ms: number): string {
  // Encoded because ":" and "." are meaningful in some PostgREST positions.
  return encodeURIComponent(new Date(ms).toISOString());
}

/*
  Counts portal_login attempts in the throttle window matching a filter.
  Uses the exact count from Content-Range, so it reads one id at most.
*/
async function recentAttempts(filter: string): Promise<number> {
  // Start of the window.
  const since = isoParam(Date.now() - THROTTLE_WINDOW_MS);
  // limit=1: only Content-Range's total is needed, not the rows.
  const { total } = await novaRead<{ id: number }>(
    "nova_auth_attempt",
    `select=id&kind=eq.portal_login&${filter}&occurred_at=gte.${since}&limit=1`,
  );
  // The exact number of matching attempts in the window.
  return total;
}

// Records one attempt as a failure and returns its id. Awaited and NOT
// swallowed: an unrecorded attempt is an unthrottled one, so a DB error
// propagates and the caller's generic error path refuses the sign-in.
async function logAttempt(ipHash: string, email: string | null): Promise<number> {
  // Email kept for the audit trail (who was tried), not for throttling.
  const [row] = await novaWrite<{ id: number }>("POST", "nova_auth_attempt", "", {
    kind: "portal_login",
    ip_hash: ipHash,
    email,
    succeeded: false,
  });
  // return=representation always hands back the inserted row.
  return row.id;
}

/*
  Checks the credentials and, on success, opens a session (sets the cookie).
  Order matters, as in the /axe gate: throttle BEFORE the lookup, so a blocked
  caller cannot use this action to burn server CPU.
*/
export async function signIn(rawEmail: unknown, rawPassword: unknown): Promise<PortalResult> {
  // Normalise first so "A@x.com " and "a@x.com" share one budget.
  const email = normaliseEmail(rawEmail);
  // Untyped input from the client; anything but a bounded string is a wrong password.
  const password =
    typeof rawPassword === "string" && rawPassword.length <= PASSWORD_MAX_LENGTH ? rawPassword : "";

  // Hashed IP, never the raw address (identity.ts). headers() is async in Next 15.
  const ipHash = rateLimitIpHash(clientIp(await headers()));

  /*
    LOG FIRST, THEN COUNT — the same TOCTOU fix as the admin gate (security
    review, 2026-09-29): a parallel burst can no longer all read "under
    budget" before any of them is recorded. The row starts as a failure and
    is flipped on success.

    Per-IP only. The per-email failure lockout was removed on purpose: with
    the password equal to the email it protects no secret, and it let anyone
    who knew a listed address keep that user locked out indefinitely.
  */
  const attemptId = await logAttempt(ipHash, email);
  // Includes this attempt, hence > rather than >=.
  if ((await recentAttempts(`ip_hash=eq.${ipHash}`)) > LOGIN_MAX_PER_IP) {
    return { ok: false, message: THROTTLED_MESSAGE };
  }

  // The allowlist row, if any. Skipped for a malformed email (nothing to find).
  const { rows } = email
    ? await novaRead<{ email: string }>(
        "nova_allowlist",
        `select=email&email=eq.${encodeURIComponent(email)}&limit=1`,
      )
    : { rows: [] as { email: string }[] };

  /*
    The password IS the allowlisted email (Teja, 2026-09-29: "default password
    is their mail id, no reset"). Normalised the same way as the email, so
    "Teja@X.com" typed into either box still matches.

    ponytail: this makes the password a formality — anyone who knows an
    allowlisted address can sign in. The real control is the allowlist plus
    the throttles above. Acceptable for a dummy-data sandbox; if real data
    ever lands here, restore per-user scrypt hashes (nova_allowlist.password_hash
    and verifyPasswordAgainst are still in place for exactly that).
  */
  const typed = normaliseEmail(password);
  // Listed AND the typed password is that same address.
  const ok = rows.length > 0 && typed !== null && typed === email;

  // One message for every failure shape; the row already says succeeded=false.
  if (!ok) return { ok: false, message: BAD_CREDENTIALS };
  // Audit trail only — the attempt is already counted, so a failed PATCH must
  // not block a legitimate sign-in.
  await novaWrite("PATCH", "nova_auth_attempt", `id=eq.${attemptId}`, { succeeded: true }).catch((error) =>
    console.error("[nova-api] could not mark portal attempt successful:", error),
  );

  // 32 random bytes → 43 base64url chars: unguessable and cookie-safe.
  const token = randomBytes(32).toString("base64url");
  // Only the hash is stored, so a DB leak yields no usable cookies.
  await novaWrite("POST", "nova_portal_session", "", {
    token_hash: sha256Hex(token),
    email,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });

  // Shared flags (httpOnly, secure in prod, lax, path /), but a week, not 8h.
  (await cookies()).set(PORTAL_COOKIE_NAME, token, {
    ...AXE_COOKIE_OPTIONS,
    maxAge: SESSION_TTL_MS / 1000,
  });
  return { ok: true, message: "Signed in." };
}

// The session token cookie, if present and well-formed (43 base64url chars).
async function readSessionToken(): Promise<string | null> {
  // cookies() is async in Next 15.
  const token = (await cookies()).get(PORTAL_COOKIE_NAME)?.value;
  // Rejecting junk here saves a DB round trip per forged cookie.
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

/*
  The signed-in portal user, or null. Never throws: a DB failure reads as
  "signed out", which is the safe direction (the dashboard redirects).
*/
export async function getPortalUser(): Promise<PortalUser | null> {
  // No cookie: no query.
  const token = await readSessionToken();
  if (!token) return null;

  try {
    // !inner turns the embed into an INNER JOIN, so a session whose email left
    // the allowlist returns no row even if the cascade somehow missed it.
    const { rows } = await novaRead<{ email: string }>(
      "nova_portal_session",
      `select=email,nova_allowlist!inner(email)&token_hash=eq.${sha256Hex(token)}` +
        `&expires_at=gt.${isoParam(Date.now())}&limit=1`,
    );
    // Found and live: the email is the whole identity.
    return rows[0] ? { email: rows[0].email } : null;
  } catch (error) {
    // Logged for the operator; the user just sees the sign-in form.
    console.error("[nova/portalAuth] session lookup failed:", error);
    return null;
  }
}

// Ends the session server-side (so a copied cookie dies too) and clears it.
export async function signOut(): Promise<void> {
  // The raw token, if any; nothing to delete otherwise.
  const token = await readSessionToken();
  // Row first: deleting only the cookie would leave a stolen copy valid.
  if (token) {
    try {
      // Filtered by the hash, so this can only ever remove this one session.
      await novaWrite("DELETE", "nova_portal_session", `token_hash=eq.${sha256Hex(token)}`);
    } catch (error) {
      // Still clear the cookie below; the row expires on its own in 7 days.
      console.error("[nova/portalAuth] session delete failed:", error);
    }
  }
  // Same path as when it was set, or the browser keeps it.
  (await cookies()).delete({ name: PORTAL_COOKIE_NAME, path: "/" });
}
