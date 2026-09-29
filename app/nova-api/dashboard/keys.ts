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
import { novaRead, novaWrite } from "@/lib/nova/db";

// Same tripwire as the lib modules: this file talks to the service role.
if (typeof window !== "undefined") {
  throw new Error("app/nova-api/dashboard/keys.ts is server-only and must never reach the browser.");
}

// Design §5: at most five active keys per email.
export const MAX_ACTIVE_KEYS = 5;
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
  // ponytail: sums client-side over ≤7200 rows (5 keys × 1440 min), up to 8
  // pages. A view or RPC doing sum() server-side is one trip — add it to the
  // schema when keys-per-user or the window grows.
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
  // ponytail: count-then-insert lets two simultaneous creates reach 6 keys;
  // harmless for a sandbox. A partial-unique trigger would make it exact.
  if (total >= MAX_ACTIVE_KEYS) {
    return { ok: false, message: `You already have ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` };
  }

  // Secret, display prefix, and sha256 — generated in one place.
  const { key, prefix, hash } = generateApiKey();
  // Only the hash is stored; the secret goes back to the user once and is gone.
  await novaWrite("POST", "nova_api_key", "", { email, name, prefix, key_hash: hash });
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
