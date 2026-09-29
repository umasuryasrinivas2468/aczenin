/*
  Data for /nova-api/usage: one signed-in user's API calls, aggregated.

  Server-only (it imports db.ts, which throws in a browser). Every query is
  filtered by the email passed in, and the page passes ONLY the session's
  email, so no other user's calls can reach this module's output.

  WHY AGGREGATE IN NODE: PostgREST cannot GROUP BY, and it caps a response at
  1000 rows. So we page through the selected range with limit/offset and fold
  the rows here. Cheap at sandbox volume.
  ponytail: page-and-fold is O(rows) per page view and stops at MAX_PAGES;
  once a user logs >20k calls per 30 days, replace it with a SQL RPC that
  returns the daily/status/error/endpoint aggregates (GROUP BY on the
  (email, occurred_at) index) and fetches only the 50 recent rows.
*/

// The only read surface the portal needs; novaWrite is deliberately not imported.
import { novaRead } from "@/lib/nova/db";

// Shape of the columns we select; mirrors 003_one_key_and_request_log.sql.
export type RequestRow = {
  // bigint identity, used as a React key and a tiebreaker.
  id: number;
  // timestamptz as ISO text.
  occurred_at: string;
  // GET/HEAD in practice; 405s would show other verbs.
  method: string;
  // Path relative to /v1, e.g. "/invoices/inv_8f2c91a4".
  path: string;
  // Raw query string without "?", or null.
  query: string | null;
  // HTTP status returned to the caller.
  status: number;
  // Stable error code; null on 2xx.
  error_code: string | null;
  // Human message sent with the error; null on 2xx.
  error_message: string | null;
  // Server handling time.
  duration_ms: number;
  // Same uuid as the X-Request-Id header, for support.
  request_id: string;
};

// The two ranges the toggle offers; anything else in ?range= falls back to 7.
export type RangeDays = 7 | 30;
// The three recent-calls filters; anything else in ?status= falls back to "all".
export type StatusFilter = "all" | "ok" | "failed";

// Everything the page renders, computed in one pass.
export type UsageData = {
  // Headline tiles.
  totals: { calls: number; succeeded: number; failed: number; avgMs: number; p95Ms: number };
  // One entry per IST day in the range, oldest first, zero-filled.
  daily: { date: string; succeeded: number; failed: number }[];
  // Calls per status code, ascending code order.
  byStatus: { status: number; count: number }[];
  // Failure reasons, most frequent first.
  byError: { code: string; count: number; example: string | null }[];
  // Endpoints by volume, ids collapsed.
  endpoints: { pattern: string; calls: number; failed: number }[];
  // Newest 50 calls matching the status filter.
  recent: RequestRow[];
  // True when MAX_PAGES was hit, so the page can say the numbers are partial.
  truncated: boolean;
};

// PostgREST's default max-rows; asking for more returns 1000 anyway.
const PAGE_SIZE = 1000;
// Bounds the work per page view (20k rows); see the ponytail note above.
const MAX_PAGES = 20;
// Rows the recent-calls table shows.
const RECENT_LIMIT = 50;
// Only the columns the page uses; key_id and email are not rendered.
const COLUMNS = "id,occurred_at,method,path,query,status,error_code,error_message,duration_ms,request_id";

// Days are bucketed in IST because that is where the team and users are, and
// it matches the admin usage chart. en-CA formats as YYYY-MM-DD.
const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

// The IST calendar day an instant falls on, as "YYYY-MM-DD".
function istDay(ms: number): string {
  // Intl does the zone math, so no hand-rolled +05:30 arithmetic on instants.
  return IST_DAY.format(new Date(ms));
}

// 2xx is success; everything else (4xx, 5xx) is a failure the user should see.
export function isSuccess(status: number): boolean {
  // Explicit bounds so a hypothetical 1xx/3xx never counts as success.
  return status >= 200 && status < 300;
}

// Parses ?range=, defaulting to 7 for missing or unexpected values.
export function parseRange(raw: string | string[] | undefined): RangeDays {
  // Only the exact string "30" selects the long range; arrays are junk input.
  return raw === "30" ? 30 : 7;
}

// Parses ?status=, defaulting to "all".
export function parseStatusFilter(raw: string | string[] | undefined): StatusFilter {
  // Whitelist, so the value can be echoed into links without escaping worries.
  return raw === "ok" || raw === "failed" ? raw : "all";
}

/*
  "/invoices/inv_8f2c91a4/lines" → "/invoices/{id}/lines".
  The route's shape is /{resource}/{id}/{child}, so the SECOND segment is
  always an id; collapsing by position is exact, where a regex on the value
  would also eat resource names (they share the id charset).
*/
export function endpointPattern(path: string): string {
  // Leading "/" makes segment 0 empty; the id then sits at index 2.
  return path
    .split("/")
    .map((segment, index) => (index === 2 && segment ? "{id}" : segment))
    .join("/");
}

// Nearest-rank percentile on an ascending array; 0 for an empty one.
function percentile(sorted: number[], p: number): number {
  // No calls, no latency to report.
  if (sorted.length === 0) return 0;
  // Nearest-rank: ceil(p·n) is 1-based, hence the -1; clamped for p = 0.
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

/*
  Loads and aggregates one user's calls for the last `days` IST days
  (today included). Throws NovaDbError on DB failure; the page catches it.
*/
export async function loadUsage(email: string, days: RangeDays, statusFilter: StatusFilter): Promise<UsageData> {
  // Today's IST day, the last bucket.
  const today = istDay(Date.now());
  // The day keys, oldest first. Stepping by 24h from IST noon never skips or
  // repeats a day (IST has no DST, and noon keeps clear of midnight edges).
  const noonToday = Date.parse(`${today}T12:00:00+05:30`);
  const dayKeys = Array.from({ length: days }, (_, i) => istDay(noonToday - (days - 1 - i) * 86_400_000));
  // Range start is IST midnight of the first day, as a real instant.
  const since = new Date(`${dayKeys[0]}T00:00:00+05:30`).toISOString();

  // Filter pinned to the caller's email, encoded so it can never become filter syntax.
  const base =
    `select=${COLUMNS}&email=eq.${encodeURIComponent(email)}` +
    `&occurred_at=gte.${encodeURIComponent(since)}&order=occurred_at.desc,id.desc`;

  // Collected newest first, so "recent" is just the head of this list.
  const rows: RequestRow[] = [];
  // Set when we stop at the page cap with rows still unread.
  let truncated = false;
  // Sequential pages: each page's size tells us whether there is another.
  for (let page = 0; page < MAX_PAGES; page++) {
    // id.desc tiebreak in `order` keeps offset pages stable under equal timestamps.
    const { rows: batch } = await novaRead<RequestRow>("nova_api_request", `${base}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
    rows.push(...batch);
    // A short page is the last page.
    if (batch.length < PAGE_SIZE) break;
    // A full last page under the cap means there may be more we skipped.
    if (page === MAX_PAGES - 1) truncated = true;
  }

  // Zero-filled day buckets, so quiet days show as gaps, not missing ticks.
  const daily = new Map(dayKeys.map((date) => [date, { date, succeeded: 0, failed: 0 }]));
  // Maps, not objects: keys are data (codes, paths), never prototype names.
  const byStatus = new Map<number, number>();
  const byError = new Map<string, { count: number; example: string | null }>();
  const endpoints = new Map<string, { calls: number; failed: number }>();
  // Collected once, sorted once for p95.
  const durations: number[] = [];
  // Running success count for the tiles.
  let succeeded = 0;

  // One pass over the rows builds every aggregate.
  for (const row of rows) {
    // Classified once, used by four aggregates.
    const ok = isSuccess(row.status);
    // Success tally for the rate tile.
    if (ok) succeeded++;
    // The day bucket; a row stamped a hair before `since` by clock skew is skipped.
    const bucket = daily.get(istDay(Date.parse(row.occurred_at)));
    if (bucket) bucket[ok ? "succeeded" : "failed"]++;
    // Status histogram.
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    // Failure reasons; rows are newest first, so the first message kept is the latest.
    if (!ok) {
      // A failure with no code (should not happen) still counts, under a visible label.
      const code = row.error_code ?? "unknown";
      const entry = byError.get(code) ?? { count: 0, example: row.error_message };
      entry.count++;
      byError.set(code, entry);
    }
    // Endpoint table, ids collapsed so /invoices/a and /invoices/b are one row.
    const pattern = endpointPattern(row.path);
    const endpoint = endpoints.get(pattern) ?? { calls: 0, failed: 0 };
    endpoint.calls++;
    if (!ok) endpoint.failed++;
    endpoints.set(pattern, endpoint);
    // Latency sample.
    durations.push(row.duration_ms);
  }

  // Ascending for the nearest-rank percentile.
  durations.sort((a, b) => a - b);
  // Sum for the mean; reduce over an empty array needs the 0 seed.
  const totalMs = durations.reduce((sum, ms) => sum + ms, 0);

  // The recent table's filter, applied to rows we already hold (no extra query).
  const recent = rows
    .filter((row) => statusFilter === "all" || (statusFilter === "ok") === isSuccess(row.status))
    .slice(0, RECENT_LIMIT);

  return {
    totals: {
      calls: rows.length,
      succeeded,
      failed: rows.length - succeeded,
      // Rounded: sub-millisecond precision is noise for an HTTP call.
      avgMs: rows.length ? Math.round(totalMs / rows.length) : 0,
      p95Ms: percentile(durations, 0.95),
    },
    // Map preserves insertion order, which is oldest-first.
    daily: [...daily.values()],
    // Ascending code order reads 200 → 4xx → 5xx, left to right.
    byStatus: [...byStatus].map(([status, count]) => ({ status, count })).sort((a, b) => a.status - b.status),
    // Most frequent failure first: that is the one to fix first.
    byError: [...byError].map(([code, e]) => ({ code, ...e })).sort((a, b) => b.count - a.count),
    // Busiest first, capped so the table stays scannable.
    endpoints: [...endpoints]
      .map(([pattern, e]) => ({ pattern, ...e }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10),
    recent,
    truncated,
  };
}
