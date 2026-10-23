/*
  The password gate for /nova-api/axe, the Nova admin portal
  (docs/nova-api-architecture.md §5, "Admin password").

  A THIRD GATE, NOT A REUSE OF /axe OR /Finathon/axe/26. The Nova admin decides
  who may call the Nova API at all — allowlist, keys, rate limits — which is a
  different power from reading traffic counts or registrations. A separate
  password means rotating one never locks out the readers of the other two.

  What IS shared is the cryptography, exactly as src/lib/finathon/gate.ts does:
  scrypt verification, cookie minting and cookie verification all come from
  @/lib/axe/session. Constant-time compares and signed expiries are the details
  that rot when two copies exist and only one gets patched.

  THE PASSWORD NEVER APPEARS IN THE REPO. Only its scrypt `salt:hash` lives in
  the NOVA_ADMIN_GATE_HASH environment variable (design §8).
*/

// Next 15's request-scoped cookie jar; the only way a Server Component or
// Server Action can read the incoming session cookie.
import { cookies } from "next/headers";
// Node's CSPRNG and scrypt, the same primitives session.ts verifies with.
import { randomBytes, scryptSync } from "node:crypto";

// The audited primitives: scrypt check against an explicit hash, and the
// gate-bound HMAC cookie verifier. Imported, never re-implemented.
import { verifyPasswordAgainst, verifySessionCookie } from "@/lib/axe/session";

// Same runtime-only guard as gate.ts and session.ts. Weaker than the
// `server-only` package (it fires after the bundle shipped) but it turns a
// silent leak of NOVA_ADMIN_GATE_HASH into a loud crash.
if (typeof window !== "undefined") {
  // The file path in the message says exactly which import dragged it in.
  throw new Error("src/lib/nova/adminGate.ts is server-only and must never reach the browser.");
}

/*
  The admin session cookie's name.

  Opaque on purpose, like axe_session and fin_session: it says nothing about
  what it unlocks to someone glancing at their cookie jar. And, as with the
  other two, the NAME is not the control — the gate "nova-admin" is inside the
  signed payload, so an axe_session renamed to nova_admin fails the HMAC check.
*/
export const NOVA_ADMIN_COOKIE_NAME = "nova_admin";

/*
  Verifies a submitted admin password against NOVA_ADMIN_GATE_HASH.

  Fails closed when the variable is missing (verifyPasswordAgainst returns
  false for an undefined hash). There is deliberately no hardcoded fallback:
  the password is two dictionary words (design §5), and the only thing keeping
  that acceptable is the hash never entering git.
*/
export function verifyNovaAdminPassword(submitted: string): boolean {
  // Read per call, not at module load, so a rotated hash takes effect on the
  // next cold start without anyone having to reason about module caching.
  return verifyPasswordAgainst(submitted, process.env.NOVA_ADMIN_GATE_HASH);
}

/*
  True when the current request carries a valid, unexpired nova-admin session.

  Called by the gating layout, again by the page before it queries, and AGAIN
  as the first statement of every Server Action — because an action is a public
  POST endpoint that the layout's "don't render children" never protects.
*/
export async function hasNovaAdminSession(): Promise<boolean> {
  // Awaited: cookies() is async in Next 15, and an un-awaited Promise is truthy.
  const cookieStore = await cookies();
  // "nova-admin" is the gate bound into the HMAC; a cookie minted for "axe" or
  // "finathon" is validly signed but rejected here — that is the point.
  return verifySessionCookie("nova-admin", cookieStore.get(NOVA_ADMIN_COOKIE_NAME)?.value);
}

/*
  Hashes a developer-portal password for nova_allowlist.password_hash.

  Output format is scrypt "saltHex:keyHex" — a 16-byte random salt and a
  64-byte key from scryptSync(password, salt, 64) with Node's defaults
  (N=16384, r=8, p=1). That is byte-for-byte the AXE_GATE_HASH format, so the
  portal's sign-in verifies it with the SAME verifyPasswordAgainst the gates
  use; one verifier means one place for the constant-time compare to be right.
  The schema CHECK ('^[0-9a-f]{32}:[0-9a-f]{128}$') pins this exact shape.

  Lives here, not in portalAuth.ts, because only the admin portal SETS
  passwords; the portal only ever verifies them.
*/
export function hashPortalPassword(password: string): string {
  // Fresh salt per password, so two users with the same password get
  // different hashes and one cracked hash says nothing about the other.
  const salt = randomBytes(16);
  // 64 must match SCRYPT_KEYLEN in session.ts, or verification always fails.
  const key = scryptSync(password, salt, 64);
  // Lowercase hex on both halves, which is what the CHECK constraint expects.
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}
