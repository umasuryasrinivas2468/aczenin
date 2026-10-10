/*
  Service-role PostgREST access for Aczen AI Studio.

  Modelled on src/lib/axe/supabase.ts and deliberately kept separate from it:
  that client's table union is the /axe pipeline's allowlist, and widening it to
  cover AI Studio would let a typo in one product reach the other's tables.

  The same two rules carry over unchanged:
  - service_role bypasses RLS, so this module is server-only. Every ai_* table
    is RLS-forced with zero policies and revoked from anon, so nothing else can
    read them at all.
  - Error bodies are never logged or rethrown verbatim. Postgres puts offending
    row values in `message`/`details`, and here those would be key hashes,
    email addresses and password hashes. Only the SQLSTATE and hint survive.
*/

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/db.ts is server-only and must never reach the browser.");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Bounded so a slow database fails a request quickly instead of holding a
// gateway call (and its concurrency lease) open until the platform kills it.
const DB_TIMEOUT_MS = 8_000;

export type AiTable =
  | "ai_settings"
  | "ai_user"
  | "ai_api_key"
  | "ai_usage_event"
  | "ai_usage_daily"
  | "ai_spend_daily"
  | "ai_auth_attempt"
  | "ai_admin_audit"
  | "ai_alert";

export type AiFunction =
  | "ai_gateway_admit"
  | "ai_gateway_finalize"
  | "ai_create_key"
  | "ai_user_dashboard"
  | "ai_admin_dashboard"
  | "ai_admin_users"
  | "ai_anomaly_candidates"
  | "ai_month_spend"
  | "ai_housekeeping";

/* A failure carrying only the SQLSTATE, never row data. */
export class AiDbError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(message: string, code: string | null, status: number) {
    super(message);
    this.name = "AiDbError";
    this.code = code;
    this.status = status;
  }
}

function base(): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set; AI Studio cannot reach Supabase.");
  }
  return SUPABASE_URL.replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; AI Studio cannot reach Supabase.");
  }
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function failure(operation: string, target: string, response: Response): Promise<AiDbError> {
  const prefix = `Supabase ${operation} on ${target} failed (${response.status})`;
  try {
    const parsed = JSON.parse(await response.text()) as { code?: unknown; hint?: unknown };
    // Whitelisted by name, never spread — see the header comment.
    const code = typeof parsed.code === "string" ? parsed.code : null;
    const hint = typeof parsed.hint === "string" ? parsed.hint : null;
    return new AiDbError(
      `${prefix}${code ? ` [${code}]` : ""}${hint ? ` hint: ${hint}` : ""}`,
      code,
      response.status,
    );
  } catch {
    return new AiDbError(prefix, null, response.status);
  }
}

async function request(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  });
}

/*
  PostgREST filter values are URL query parameters, so anything interpolated
  into one must be encoded. Callers pass user-influenced ids through this so a
  value like "x&status=eq.active" cannot append its own filter.
*/
export function eq(value: string | number | boolean): string {
  return `eq.${encodeURIComponent(String(value))}`;
}

export async function aiSelect<T>(table: AiTable, params: string, limit = 1000): Promise<T[]> {
  const response = await request(`${base()}/rest/v1/${table}?${params}`, {
    method: "GET",
    headers: { ...authHeaders(), Range: `0-${limit - 1}` },
  });
  if (!response.ok) throw await failure("select", table, response);
  return (await response.json()) as T[];
}

export async function aiSelectOne<T>(table: AiTable, params: string): Promise<T | null> {
  const rows = await aiSelect<T>(table, params, 1);
  return rows.length > 0 ? rows[0] : null;
}

export async function aiInsert<T = unknown>(
  table: AiTable,
  rows: Record<string, unknown> | Record<string, unknown>[],
  options: { returning?: boolean; ignoreDuplicates?: boolean } = {},
): Promise<T[]> {
  const prefer = [options.returning ? "return=representation" : "return=minimal"];
  if (options.ignoreDuplicates) prefer.push("resolution=ignore-duplicates");
  const response = await request(`${base()}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...authHeaders(), Prefer: prefer.join(",") },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw await failure("insert", table, response);
  return options.returning ? ((await response.json()) as T[]) : [];
}

/*
  UPDATE rows matching `filter`. Always returns the updated rows so callers can
  tell "matched nothing" (wrong owner, already revoked) from success — the
  difference between an authorization check and a silent no-op.
*/
export async function aiUpdate<T = unknown>(
  table: AiTable,
  filter: string,
  patch: Record<string, unknown>,
): Promise<T[]> {
  if (!filter) {
    // An unfiltered PATCH would update every row in the table.
    throw new Error("aiUpdate requires a filter.");
  }
  const response = await request(`${base()}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...authHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw await failure("update", table, response);
  return (await response.json()) as T[];
}

export async function aiCount(table: AiTable, params: string): Promise<number> {
  const response = await request(`${base()}/rest/v1/${table}?${params}&select=id`, {
    method: "HEAD",
    headers: { ...authHeaders(), Prefer: "count=exact", Range: "0-0" },
  });
  if (!response.ok) {
    throw new AiDbError(`Supabase count on ${table} failed (${response.status})`, null, response.status);
  }
  const total = Number((response.headers.get("content-range") ?? "").split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

export async function aiRpc<T>(fn: AiFunction, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await request(`${base()}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await failure("rpc", fn, response);
  return (await response.json()) as T;
}
