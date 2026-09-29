/*
  Nova API keys: generation, hashing, and authenticate-and-meter.
  Design: docs/nova-api-architecture.md §4.4 (nova_authenticate_key) and §5.

  WHY SHA-256 AND NOT SCRYPT: a key is 32 random bytes (256 bits of entropy),
  so there is nothing to brute-force offline and a fast hash is correct. A slow
  hash would add ~50 ms to every API call for zero security gain. (Passwords
  and 6-digit codes are the opposite case — low entropy — and get scrypt/HMAC.)
*/

// node:crypto only: randomBytes for the secret, sha256 for the stored hash.
import { createHash, randomBytes } from "node:crypto";

// Read-only surface only (design §4.2 layer 2); novaWrite is never imported here.
import { novaRpc } from "@/lib/nova/db";

// Visible, greppable prefix: secret scanners (and humans) can spot a leaked key.
export const API_KEY_PREFIX = "nova_sk_";

// Exact shape of a key: prefix + 43 base64url chars (32 bytes, unpadded).
// Checked before any DB call so garbage never costs a round trip.
const API_KEY_PATTERN = /^nova_sk_[A-Za-z0-9_-]{43}$/;

// A new key. `key` is shown to the user once and never stored.
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  // 32 bytes = 256 bits; base64url so it is safe in headers and URLs.
  const key = API_KEY_PREFIX + randomBytes(32).toString("base64url");
  // First 16 chars ("nova_sk_" + 8) — enough to tell keys apart in the UI,
  // far too little to guess the rest from.
  return { key, prefix: key.slice(0, 16), hash: hashApiKey(key) };
}

// The only form a key is stored or looked up in.
export function hashApiKey(key: string): string {
  // Hex so it round-trips through PostgREST JSON and SQL text unchanged.
  return createHash("sha256").update(key, "utf8").digest("hex");
}

// What the /v1 route knows about the caller once the key checks out.
export type AuthenticatedKey = {
  // nova_api_key.id (uuid) — what usage rows and revocation are keyed on.
  keyId: string;
  // Owner, still allowlisted (the RPC joins nova_allowlist).
  email: string;
  // The user's label for the key, shown by /me.
  name: string;
  // Display prefix, shown by /me so users can match it to the dashboard.
  prefix: string;
  // Per-key ceiling; the route compares requestCount against it.
  rateLimitPerMin: number;
  // Post-increment count for the current minute, this request included.
  requestCount: number;
  // ISO timestamp of the current one-minute window's start.
  windowStart: string;
  // When the key was minted, shown by /me.
  createdAt: string;
};

// Row shape nova_authenticate_key returns (001_schema.sql `returns table`);
// names must match it exactly because PostgREST passes them through.
type AuthenticateRow = {
  // uuid as a JSON string.
  key_id: string;
  // Owner email.
  email: string;
  // Aliased from nova_api_key.name.
  key_name: string;
  // Aliased from nova_api_key.prefix.
  key_prefix: string;
  // integer column → JSON number.
  rate_limit_per_min: number;
  // integer column → JSON number.
  request_count: number;
  // timestamptz → ISO string.
  window_start: string;
  // timestamptz → ISO string.
  key_created_at: string;
};

/*
  Parses "Bearer <key>", then authenticates AND meters it in one RPC.
  Returns null for a missing/malformed/unknown/revoked key → caller sends 401.
  A database failure THROWS (NovaDbError) → caller sends 502: fail closed,
  because a request that cannot be authenticated cannot be served (§5).
*/
export async function authenticateApiKey(authorizationHeader: string | null): Promise<AuthenticatedKey | null> {
  // No header at all.
  if (authorizationHeader === null) return null;
  // Scheme is case-insensitive per RFC 7235; exactly one token after it.
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorizationHeader);
  // Wrong scheme or empty token.
  if (match === null) return null;
  // The key itself.
  const key = match[1];
  // Wrong prefix or length: reject without spending a DB round trip (and
  // without incrementing anyone's usage counter).
  if (!API_KEY_PATTERN.test(key)) return null;
  // PostgREST returns a set-returning function as a JSON array.
  const rows = await novaRpc<AuthenticateRow[]>("nova_authenticate_key", { p_key_hash: hashApiKey(key) });
  // Zero rows = unknown key, revoked key, or owner removed from the allowlist.
  if (!Array.isArray(rows) || rows.length === 0) return null;
  // At most one row: key_hash is unique.
  const row = rows[0];
  // snake_case → camelCase at the boundary, so callers never see DB names.
  return {
    keyId: row.key_id,
    email: row.email,
    name: row.key_name,
    prefix: row.key_prefix,
    rateLimitPerMin: row.rate_limit_per_min,
    requestCount: row.request_count,
    windowStart: row.window_start,
    createdAt: row.key_created_at,
  };
}
