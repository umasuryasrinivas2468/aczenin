"use server";

/*
  Server Actions for /nova-api/axe, the Nova admin portal.

  "use server" is the first line of the file because Next requires it to head
  the module; a statement above it silently turns every export below into an
  ordinary function the client can no longer call.

  === EVERY ACTION IS A PUBLIC HTTP ENDPOINT ================================
  Same warning as app/Finathon/axe/26/actions.ts. Each export compiles to a POST
  route whose id ships in the page HTML. The gate in ./layout.tsx guards
  RENDERING; it does not guard an action invocation. So every action except
  sign-in calls requireAdmin() as its FIRST statement, before it reads its own
  arguments. That check is the only authorisation these endpoints have.
  ==========================================================================

  Errors: the UI gets a short generic message; the real error (which carries
  PostgREST detail about tables and constraints) goes to console.error only.
*/

// Request headers for the client IP; cookies for minting / clearing the session.
import { cookies, headers } from "next/headers";
// Drops the cached RSC payload so the next render shows the write.
import { revalidatePath } from "next/cache";

// The IP hash is the rate-limit identity; a raw IP is never stored (identity.ts).
import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
// Reused verbatim so this gate cannot drift from /axe on a flag like Secure.
import { AXE_COOKIE_OPTIONS, mintSessionCookie } from "@/lib/axe/session";
// The gate primitives this file wraps.
import { NOVA_ADMIN_COOKIE_NAME, hasNovaAdminSession, verifyNovaAdminPassword } from "@/lib/nova/adminGate";
// Nova-project client. NovaDbError carries the HTTP status for the 409 check.
import { NovaDbError, novaRead, novaWrite } from "@/lib/nova/db";

// Every action result the client components render. One shape, so each form
// handles success and failure the same way.
export type ActionResult = { ok: boolean; message: string };

// The route revalidated after each write. A constant so a typo cannot make one
// action refresh a path nobody is looking at.
const ADMIN_PATH = "/nova-api/axe";
// Same budget as the Finathon and /axe gates (design §5): 8 tries / 15 min / IP.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
// Pragmatic shape check, not RFC 5322: one @, a dot in the domain, no spaces.
// The real test of an address is whether the sign-in code arrives.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// RFC 5321's practical maximum; also keeps a pasted essay out of a PK column.
const EMAIL_MAX_LENGTH = 254;
// A note is a reminder, not a document.
const NOTE_MAX_LENGTH = 200;
// Postgres gen_random_uuid() output shape. Validated before it reaches a
// PostgREST filter so a tampered id cannot smuggle extra query syntax.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The schema's CHECK bounds on rate_limit_per_min, enforced here first so the
// admin gets a sentence instead of a constraint error.
const RATE_LIMIT_MIN = 1;
const RATE_LIMIT_MAX = 6000;
// Deliberately identical for every failure mode of sign-in, including the
// rate-limit branch: a distinct message would confirm the limiter exists.
const LOGIN_FAILED: ActionResult = { ok: false, message: "Incorrect password, or too many attempts. Try again later." };
// The catch-all for unexpected failures in the admin actions.
const GENERIC_FAILURE: ActionResult = { ok: false, message: "Something went wrong. Details are in the server logs." };

/*
  Refuses to continue unless the caller holds a valid nova-admin session.

  Throws rather than returning false, like requireSession in the Finathon
  actions: a caller that forgot to check a boolean would carry on and write,
  whereas an exception cannot be ignored by omission.
*/
async function requireAdmin(): Promise<void> {
  // The await matters: an un-awaited Promise is truthy and would pass everyone.
  if ((await hasNovaAdminSession()) !== true) {
    // Generic: this surfaces to whoever sent the request.
    throw new Error("Not authorised.");
  }
}

// Reads a text field from FormData, treating a File or a missing field as "".
function field(formData: FormData, name: string): string {
  // FormData.get returns a File for file inputs and null when absent; typeof is
  // the only safe narrowing (strictNullChecks is off in this repo).
  const raw = formData.get(name);
  return typeof raw === "string" ? raw.trim() : "";
}

/*
  Records one admin sign-in attempt in nova_auth_attempt (kind 'admin').

  In the NOVA project, not the site's axe_auth_attempt: the admin gate guards
  Nova data, and the whole point of the second project is that its code never
  needs the site credentials. Failures are swallowed so a broken audit insert
  cannot lock the admin out, but they are logged so the gap is visible.
*/
async function logAttempt(ipHash: string, succeeded: boolean): Promise<void> {
  try {
    // Awaited: a serverless instance may freeze as soon as the action returns.
    await novaWrite("POST", "nova_auth_attempt", "", { ip_hash: ipHash, kind: "admin", succeeded });
  } catch (error) {
    // Server log only; nothing about the audit table reaches the browser.
    console.error("[nova-api/axe] could not record admin auth attempt:", error);
  }
}

/*
  Signs the admin in.

  ORDER IS THE SECURITY: rate limit BEFORE scrypt. A blocked caller then learns
  nothing from the comparison's timing and cannot use this endpoint to burn
  CPU. The limiter query fails CLOSED — if the attempt count cannot be read, the
  login is refused, because an unmeasured caller is an unlimited one.
*/
export async function signInNovaAdmin(formData: FormData): Promise<ActionResult> {
  // Outer try: any unexpected throw (missing AXE_SALT, DB down) becomes the same
  // generic refusal rather than a stack trace in the action response.
  try {
    // Hashed immediately; the raw IP never leaves this expression.
    const ipHash = rateLimitIpHash(clientIp(await headers()));
    // Start of the trailing window.
    const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();

    // --- 1. Rate limit, before any password work ---------------------------
    // select=id&limit=1: we only want the exact count from Content-Range, not
    // the rows. The ip_hash is hex, so it is safe in the query string as is.
    const { total } = await novaRead(
      "nova_auth_attempt",
      `select=id&kind=eq.admin&ip_hash=eq.${ipHash}&occurred_at=gte.${since}&limit=1`,
    );
    // At or over budget: record the knock (so hammering extends the lockout) and
    // refuse with the same message as a wrong password.
    if (total >= LOGIN_MAX_ATTEMPTS) {
      await logAttempt(ipHash, false);
      return LOGIN_FAILED;
    }

    // --- 2. Verify ------------------------------------------------------------
    // Not trimmed: a password with a deliberate trailing space must still work.
    const raw = formData.get("password");
    // A non-string (File) or absent field is just a wrong password, and still
    // spends an attempt so junk submissions are not a free probe.
    const ok = verifyNovaAdminPassword(typeof raw === "string" ? raw : "");
    // Every attempt counts toward the budget, success included (design §5).
    await logAttempt(ipHash, ok);
    // Wrong password: same message as the rate-limit branch.
    if (!ok) return LOGIN_FAILED;

    // --- 3. Mint the session ----------------------------------------------------
    // Setting a cookie inside a Server Action also tells Next to re-render the
    // current route, so the client's router.refresh() lands on the dashboard.
    (await cookies()).set(NOVA_ADMIN_COOKIE_NAME, mintSessionCookie("nova-admin"), AXE_COOKIE_OPTIONS);
    return { ok: true, message: "Signed in." };
  } catch (error) {
    // Details for the operator; the error text could name env vars or tables.
    console.error("[nova-api/axe] sign-in failed:", error);
    return LOGIN_FAILED;
  }
}

/*
  Signs the admin out by deleting the cookie.

  No session check: signing out is harmless for anyone to invoke, and requiring
  a valid session would trap an admin whose cookie had just expired.
*/
export async function signOutNovaAdmin(): Promise<void> {
  // path must match the one the cookie was set with ("/"), or the delete
  // silently no-ops and the session survives.
  (await cookies()).delete({ name: NOVA_ADMIN_COOKIE_NAME, path: AXE_COOKIE_OPTIONS.path });
  // Re-render so the layout swaps the dashboard for the gate form.
  revalidatePath(ADMIN_PATH);
}

/*
  Adds an email to the allowlist.

  Upsert-safe the cheap way: a plain INSERT, and a 409 from the primary key is
  translated into "already on the list". No read-then-write race, because the
  database's own uniqueness is the check.
*/
export async function addAllowlistEmail(formData: FormData): Promise<ActionResult> {
  // First statement, before the body is read. See the module header.
  await requireAdmin();
  // Lowercased here AND by the schema CHECK; doing it here means a typed
  // "Teja@X.com" succeeds instead of tripping the constraint.
  const email = field(formData, "email").toLowerCase();
  // Empty note stored as null, so "no note" and "an empty note" are one state.
  const note = field(formData, "note");
  // Shape and length checks give the admin a sentence, not a Postgres error.
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  // maxLength on the input is a browser courtesy; this is the enforcement.
  if (note.length > NOTE_MAX_LENGTH) {
    return { ok: false, message: `Keep the note under ${NOTE_MAX_LENGTH} characters.` };
  }
  try {
    // Only the two admin-supplied columns; created_at defaults server-side.
    await novaWrite("POST", "nova_allowlist", "", { email, note: note === "" ? null : note });
  } catch (error) {
    // 409 = unique violation on the email PK: a duplicate, not a failure.
    if (error instanceof NovaDbError && error.status === 409) {
      return { ok: false, message: `${email} is already on the allowlist.` };
    }
    // Anything else is logged in full and shown generically.
    console.error("[nova-api/axe] add allowlist email failed:", error);
    return GENERIC_FAILURE;
  }
  // Refresh the panel so the new row appears without a manual reload.
  revalidatePath(ADMIN_PATH);
  return { ok: true, message: `Added ${email}.` };
}

/*
  Removes an email from the allowlist.

  The schema's ON DELETE CASCADE deletes the person's API keys (and with them
  their usage rows) and their portal sessions in the same statement, so access
  ends immediately — the UI's confirm dialog says so before this runs.
*/
export async function removeAllowlistEmail(formData: FormData): Promise<ActionResult> {
  // First statement. See the module header.
  await requireAdmin();
  // Same normalisation as add, so the filter matches the stored lowercase value.
  const email = field(formData, "email").toLowerCase();
  // A malformed value is a tampered or stale form; refuse before touching the DB.
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return GENERIC_FAILURE;
  }
  try {
    // encodeURIComponent: a "+" in an address would otherwise decode to a space
    // and the filter would match nobody (or, worse, somebody else).
    const deleted = await novaWrite("DELETE", "nova_allowlist", `email=eq.${encodeURIComponent(email)}`);
    // Zero rows back means someone else already removed it; say so honestly.
    if (deleted.length === 0) return { ok: false, message: `${email} was not on the allowlist.` };
  } catch (error) {
    // Full detail to the log only.
    console.error("[nova-api/axe] remove allowlist email failed:", error);
    return GENERIC_FAILURE;
  }
  // Refresh so the row, its keys and the totals all update together.
  revalidatePath(ADMIN_PATH);
  return { ok: true, message: `Removed ${email} and deleted their keys and sessions.` };
}

/*
  Revokes one API key (soft: sets revoked_at, keeps the row for usage history).

  The filter also requires revoked_at IS NULL, so a second click cannot move
  the recorded revocation time forward.
*/
export async function revokeApiKey(formData: FormData): Promise<ActionResult> {
  // First statement. See the module header.
  await requireAdmin();
  // The key's uuid, from a hidden input.
  const id = field(formData, "id");
  // Validated so nothing but a uuid reaches the PostgREST filter.
  if (!UUID_PATTERN.test(id)) return GENERIC_FAILURE;
  try {
    // nova_authenticate_key ignores revoked keys, so this takes effect on the
    // key's very next request.
    const updated = await novaWrite("PATCH", "nova_api_key", `id=eq.${id}&revoked_at=is.null`, {
      revoked_at: new Date().toISOString(),
    });
    // No row changed: already revoked, or deleted by an allowlist removal.
    if (updated.length === 0) return { ok: false, message: "That key was already revoked or no longer exists." };
  } catch (error) {
    // Full detail to the log only.
    console.error("[nova-api/axe] revoke key failed:", error);
    return GENERIC_FAILURE;
  }
  // Refresh so the status badge and the active-key counts update.
  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Key revoked." };
}

/*
  Changes one key's per-minute rate limit.

  Allowed on revoked keys too — harmless, and it means the value is already
  right if a key is ever un-revoked by hand in SQL.
*/
export async function updateKeyRateLimit(formData: FormData): Promise<ActionResult> {
  // First statement. See the module header.
  await requireAdmin();
  // The key's uuid, from a hidden input.
  const id = field(formData, "id");
  // Number(), not parseInt(): parseInt("12abc") is 12; Number("12abc") is NaN.
  const limit = Number(field(formData, "rate_limit_per_min"));
  // Same guard as revoke: only a uuid may reach the filter.
  if (!UUID_PATTERN.test(id)) return GENERIC_FAILURE;
  // The schema's CHECK bounds, as a sentence instead of a 400.
  if (!Number.isInteger(limit) || limit < RATE_LIMIT_MIN || limit > RATE_LIMIT_MAX) {
    return { ok: false, message: `Rate limit must be a whole number from ${RATE_LIMIT_MIN} to ${RATE_LIMIT_MAX}.` };
  }
  try {
    // The /v1 handler reads the limit from the auth RPC on every request, so
    // the new ceiling applies from the next minute window onward.
    const updated = await novaWrite("PATCH", "nova_api_key", `id=eq.${id}`, { rate_limit_per_min: limit });
    // No row: the key was deleted (allowlist removal) since the page loaded.
    if (updated.length === 0) return { ok: false, message: "That key no longer exists." };
  } catch (error) {
    // Full detail to the log only.
    console.error("[nova-api/axe] update rate limit failed:", error);
    return GENERIC_FAILURE;
  }
  // Refresh so the table shows the stored value.
  revalidatePath(ADMIN_PATH);
  return { ok: true, message: `Rate limit set to ${limit}/min.` };
}
