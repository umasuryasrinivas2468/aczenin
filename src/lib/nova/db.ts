/*
  PostgREST client for the NOVA Supabase project — a separate project from the
  aczen.in site database (design: docs/nova-api-architecture.md §4.1).

  Same hand-rolled fetch pattern as src/lib/axe/supabase.ts, for the same reason
  (supabase-js is not installed and would only wrap these same HTTP calls). It
  is a separate module rather than a parameterised axe client because it reads
  DIFFERENT env vars: the whole point of the second project is that a bug here
  can never reach Finathon PII, and sharing a client would put both keys one
  argument apart.

  TWO SURFACES, ON PURPOSE (design §4.2 layer 2):
  - novaRead / novaRpc  — what the public /v1 API imports. GET + RPC only.
  - novaWrite           — insert/update/delete for the portals. /v1 must never
                          import it; `grep -rn "^import.*novaWrite"` under
                          app/nova-api/v1 must stay empty.
*/

// Runtime guard, same as the axe modules: turns a leak of the service key into
// the browser bundle into a loud crash instead of a silent disclosure.
if (typeof window !== "undefined") {
  throw new Error("src/lib/nova/db.ts is server-only and must never reach the browser.");
}

// Read once at module load; Vercel injects env at boot, not per request.
const NOVA_URL = process.env.NOVA_SUPABASE_URL;
// Service role bypasses RLS — which is exactly why it only ever lives here.
const NOVA_KEY = process.env.NOVA_SUPABASE_SERVICE_ROLE_KEY;

// Thrown for any non-2xx from PostgREST, carrying the status so /v1 can map
// it to 502 upstream_error without string-matching messages.
export class NovaDbError extends Error {
  // The HTTP status PostgREST returned (0 when the fetch itself failed).
  status: number;
  constructor(message: string, status: number) {
    // Standard Error message, so logs show what failed.
    super(message);
    // Named so instanceof-free checks (error.name) also work across bundles.
    this.name = "NovaDbError";
    // Kept for the caller's status mapping.
    this.status = status;
  }
}

// Builds the REST URL, failing loudly when the project is not configured.
function restUrl(path: string): string {
  // Missing env is a deploy problem; say which variable, not a vague 500.
  if (!NOVA_URL) throw new NovaDbError("NOVA_SUPABASE_URL is not set.", 0);
  // Strip a pasted trailing slash so we never produce "//rest/v1".
  return `${NOVA_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

// PostgREST needs the key in BOTH headers: apikey routes the gateway,
// Authorization sets the Postgres role (see axe/supabase.ts authHeaders).
function headers(extra: Record<string, string> = {}): Record<string, string> {
  // Same loud failure as restUrl, for the key.
  if (!NOVA_KEY) throw new NovaDbError("NOVA_SUPABASE_SERVICE_ROLE_KEY is not set.", 0);
  return {
    apikey: NOVA_KEY,
    Authorization: `Bearer ${NOVA_KEY}`,
    "Content-Type": "application/json",
    // Caller-specific headers (Prefer, Range) win over the defaults.
    ...extra,
  };
}

// Shared fetch wrapper: no caching (every read is authenticated per request),
// and a uniform error on failure.
async function call(url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    // cache: "no-store" stops Next's fetch cache from serving one user's
    // response to another request.
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch (error) {
    // Network failure (DNS, paused project) — status 0 marks "never answered".
    throw new NovaDbError(`Nova DB unreachable: ${(error as Error).message}`, 0);
  }
  // PostgREST puts the reason in the body; include it for the server log only.
  if (!response.ok) {
    throw new NovaDbError(`Nova DB ${response.status}: ${await response.text()}`, response.status);
  }
  return response;
}

/*
  SELECT from a table or view with a PostgREST query string.
  Returns rows plus the exact total (from Content-Range), which is what the
  API's pagination.total and has_more are built from.
*/
export async function novaRead<T>(
  // e.g. "nova_invoices_v"
  relation: string,
  // Already-validated PostgREST params, e.g. "status=eq.paid&limit=50&offset=0".
  query: string,
): Promise<{ rows: T[]; total: number }> {
  const response = await call(restUrl(`${relation}${query ? `?${query}` : ""}`), {
    method: "GET",
    // count=exact makes PostgREST report the full match count in Content-Range.
    headers: headers({ Prefer: "count=exact" }),
  });
  // Content-Range looks like "0-49/412" (or "*/0" when empty).
  const range = response.headers.get("content-range") ?? "";
  // The number after the slash is the total; "*" or garbage falls back to 0.
  const total = Number(range.split("/")[1]);
  return { rows: (await response.json()) as T[], total: Number.isFinite(total) ? total : 0 };
}

// Calls a Postgres function via /rest/v1/rpc/<name>. Used for
// nova_authenticate_key, which is read-and-meter in one round trip.
export async function novaRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const response = await call(restUrl(`rpc/${fn}`), {
    // RPC is always POST in PostgREST, even for a function that only reads.
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
  });
  return (await response.json()) as T;
}

/*
  Writes for the PORTALS ONLY (allowlist, codes, sessions, keys, attempts).
  One function with an explicit method rather than three helpers: the call
  sites are few and each reads clearly as "POST to X" / "PATCH X where Y".
*/
export async function novaWrite<T = unknown>(
  // Only the three verbs PostgREST uses for row writes.
  method: "POST" | "PATCH" | "DELETE",
  // Table name.
  table: string,
  // Filter string for PATCH/DELETE ("id=eq.<uuid>"); empty for POST.
  query: string,
  // Row(s) for POST, changed fields for PATCH, nothing for DELETE.
  body?: unknown,
): Promise<T[]> {
  // A PATCH/DELETE without a filter would hit every row; refuse it outright.
  if (method !== "POST" && !query) {
    throw new NovaDbError(`Refusing unfiltered ${method} on ${table}.`, 0);
  }
  const response = await call(restUrl(`${table}${query ? `?${query}` : ""}`), {
    method,
    // return=representation hands back the written rows, so callers can read
    // generated ids without a second query.
    headers: headers({ Prefer: "return=representation" }),
    // DELETE carries no body; JSON.stringify(undefined) would send "undefined".
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // An empty 204 body is possible; treat it as "no rows returned".
  const text = await response.text();
  return text ? (JSON.parse(text) as T[]) : [];
}
