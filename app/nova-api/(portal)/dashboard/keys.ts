/*
  API-key queries for the developer dashboard: list, create, revoke.

  WHY THIS IS NOT IN actions.ts: every export of a "use server" file becomes a
  public POST endpoint. These functions take the owner's email as an argument,
  so exporting them from actions.ts would let anyone call listKeys("victim@…").
  Here they are plain server functions; actions.ts derives the email from the
  session and only then calls in.
*/

// The one owner of key generation and hashing (being written in parallel).
import { generateApiKey } from "@/lib/nova/apiKeys";
// Portals may write; /v1 never imports novaWrite (db.ts header).
import { NovaDbError, novaRead, novaWrite } from "@/lib/nova/db";

// Same tripwire as the lib modules: this file talks to the service role.
if (typeof window !== "undefined") {
  throw new Error("app/nova-api/(portal)/dashboard/keys.ts is server-only and must never reach the browser.");
}

// One active key per email (user decision 2026-09-29). The database is the
// real enforcer: partial unique index nova_api_key_one_active_per_email on
// (email) WHERE revoked_at IS NULL. This constant only drives the UI and the
// friendly pre-check below.
export const MAX_ACTIVE_KEYS = 1;
// Shown by both the pre-check and the 409 from the unique index, so a race
// and a normal attempt read identically.
const ONE_KEY_MESSAGE = "You already have an active key. Revoke it to create a new one.";
// Matches the nova_api_key.name CHECK (length between 1 and 60).
export const KEY_NAME_MAX = 60;
// Supabase caps a response at 1000 rows by default; page by exactly that.
const USAGE_PAGE = 1000;

// A key as the dashboard shows it — never the hash, never the secret.
export type DashboardKey = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  // Sum of nova_api_usage.request_count over the last 24 hours.
  requests_24h: number;
};

// uuid v1–v8 shape; checked before an id reaches a PostgREST filter.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
  The caller's keys, newest first, with 24h request counts. Two kinds of
  reads: the keys, then their usage rows paged until the exact total is read.
*/
export async function listKeys(email: string): Promise<DashboardKey[]> {
  // Explicit column list: key_hash is never selected, so it can never leak.
  const { rows: keys } = await novaRead<Omit<DashboardKey, "requests_24h">>(
    "nova_api_key",
    `select=id,name,prefix,created_at,last_used_at,revoked_at&email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
  );
  // No keys, no usage query.
  if (keys.length === 0) return [];

  // Start of the 24h window.
  const since = encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  // PostgREST in-list of this user's key ids (uuids need no quoting).
  const ids = keys.map((key) => key.id).join(",");
  // Running totals per key.
  const totals = new Map<string, number>();
  // ponytail: sums client-side over 1440 rows per key used in the window
  // (one active key, plus any revoked earlier today), paged by 1000. A view or
  // RPC doing sum() server-side is one trip — add it if keys or the window grow.
  for (let offset = 0; ; offset += USAGE_PAGE) {
    // Stable order so offset paging neither skips nor repeats rows.
    const { rows, total } = await novaRead<{ key_id: string; request_count: number }>(
      "nova_api_usage",
      `select=key_id,request_count&key_id=in.(${ids})&window_start=gte.${since}` +
        `&order=key_id,window_start&limit=${USAGE_PAGE}&offset=${offset}`,
    );
    // Accumulate this page.
    for (const row of rows) totals.set(row.key_id, (totals.get(row.key_id) ?? 0) + row.request_count);
    // Done once the exact total is covered (or the page came back short).
    if (offset + USAGE_PAGE >= total || rows.length < USAGE_PAGE) break;
  }

  // Attach the counts; a key with no usage rows shows 0.
  return keys.map((key) => ({ ...key, requests_24h: totals.get(key.id) ?? 0 }));
}

// Outcome of a create: the plaintext key exactly once, or a user-facing reason.
export type CreateKeyResult =
  | { ok: true; key: string; prefix: string }
  | { ok: false; message: string };

// Creates a key for the caller, enforcing the name rule and the 5-key cap.
export async function createKey(email: string, rawName: unknown): Promise<CreateKeyResult> {
  // Trimmed so "   " cannot pass as a name.
  const name = typeof rawName === "string" ? rawName.trim() : "";
  // Same bounds as the DB CHECK, but with a readable message instead of a 400.
  if (name.length < 1 || name.length > KEY_NAME_MAX) {
    return { ok: false, message: `Give the key a name of 1–${KEY_NAME_MAX} characters.` };
  }

  // Count active keys via the exact total; limit=1 avoids reading rows.
  const { total } = await novaRead<{ id: string }>(
    "nova_api_key",
    `select=id&email=eq.${encodeURIComponent(email)}&revoked_at=is.null&limit=1`,
  );
  // Fast path for the common case; the unique index below closes the race
  // where two tabs create at once.
  if (total >= MAX_ACTIVE_KEYS) {
    return { ok: false, message: ONE_KEY_MESSAGE };
  }

  // Secret, display prefix, and sha256 — generated in one place.
  const { key, prefix, hash } = generateApiKey();
  // Only the hash is stored; the secret goes back to the user once and is gone.
  try {
    await novaWrite("POST", "nova_api_key", "", { email, name, prefix, key_hash: hash });
  } catch (error) {
    // PostgREST answers a unique violation (Postgres 23505) with 409: the
    // other tab won the race, which is the user's doing, not an outage.
    if (error instanceof NovaDbError && error.status === 409) return { ok: false, message: ONE_KEY_MESSAGE };
    // Anything else is infrastructure; the action logs it and shows the generic text.
    throw error;
  }
  return { ok: true, key, prefix };
}

// Revokes one of the caller's keys. Returns false when nothing matched.
export async function revokeKey(email: string, rawId: unknown): Promise<boolean> {
  // Reject anything that is not a uuid before it reaches a filter.
  if (typeof rawId !== "string" || !UUID_RE.test(rawId)) return false;
  // Filtered by id AND email: a user who submits someone else's key id matches
  // zero rows. revoked_at=is.null keeps the original revoke time intact.
  const rows = await novaWrite(
    "PATCH",
    "nova_api_key",
    `id=eq.${rawId}&email=eq.${encodeURIComponent(email)}&revoked_at=is.null`,
    { revoked_at: new Date().toISOString() },
  );
  // One row means it was ours and was live.
  return rows.length > 0;
}

/*
  The caller's team data slice: slot % slice_count (supabase/nova/004_team_slices.sql).
  Read-only and display-only — /v1 applies the same rule itself, in SQL; this
  just tells the developer which slice their key sees. Null when either row
  is missing, so the page simply omits the line.
*/
export async function getDatasetSlice(email: string): Promise<number | null> {
  // Both reads are independent, so they run in parallel.
  const [allowlist, meta] = await Promise.all([
    // The team's slot, assigned once when it was allowlisted.
    novaRead<{ slot: number }>("nova_allowlist", `select=slot&email=eq.${encodeURIComponent(email)}&limit=1`),
    // A single-row table (id = true) holding the current slice count.
    novaRead<{ slice_count: number }>("nova_dataset_meta", "select=slice_count&limit=1"),
  ]);
  // Missing slot or meta row: nothing trustworthy to show.
  const slot = allowlist.rows[0]?.slot;
  const sliceCount = meta.rows[0]?.slice_count;
  // typeof checks, since the repo compiles without strictNullChecks.
  if (typeof slot !== "number" || typeof sliceCount !== "number" || sliceCount < 1) return null;
  // Same formula the database uses to filter rows.
  return slot % sliceCount;
}
