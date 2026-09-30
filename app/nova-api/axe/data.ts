/*
  Reads for the Nova admin portal, and the usage aggregation.

  WHY AGGREGATE IN NODE: PostgREST exposes no GROUP BY, and adding a SQL view or
  RPC would mean editing supabase/nova/001_schema.sql, which is a frozen
  contract for this build. nova_api_usage holds one row per key per ACTIVE
  minute, so seven days of a handful of dev keys is thousands of rows at most —
  cheap to sum here.

  Server-only: it imports src/lib/nova/db.ts, which holds the service-role key.
*/

// novaRead is the GET-only surface; this module never writes.
import { novaRead } from "@/lib/nova/db";

// Same tripwire as every module that can reach the service key: a client import
// of this file would be a loud crash rather than a silent key leak.
if (typeof window !== "undefined") {
  // The path names the offending module in the stack trace.
  throw new Error("app/nova-api/axe/data.ts is server-only and must never reach the browser.");
}

// India has no DST, so a fixed +05:30 is exact. IST days match how the rest of
// the site's dashboards bucket time (src/lib/axe/identity.ts istDateStamp).
const IST_OFFSET_MS = 330 * 60_000;
// One day in ms; named so the window arithmetic below reads as days, not digits.
const DAY_MS = 24 * 60 * 60 * 1000;
// Supabase caps a PostgREST response at 1000 rows by default and truncates
// SILENTLY past it, so every multi-row read pages at exactly that size.
const PAGE_SIZE = 1000;
// ponytail: hard ceiling of 50 pages (50k usage rows ≈ 5 keys busy every minute
// for a week). Past that, move the aggregation into a SQL view/RPC.
const MAX_PAGES = 50;

// One allowlisted person, as the allowlist panel shows them.
export type AllowlistRow = {
  // Lowercase primary key (the schema CHECK guarantees it).
  email: string;
  // Admin's free-text reason for access; null when none was written.
  note: string | null;
  // ISO timestamp; rendered by the client in the viewer's locale.
  created_at: string;
  // Permanent team position, assigned by the database on insert (004). Read
  // only: the UI never sets it, so two teams can never be handed one slot.
  slot: number;
  // Which data slice the team reads: slot % slice_count, the same rule
  // nova_authenticate_key applies, computed here so the UI cannot disagree.
  dataSlice: number;
  // Keys this person holds that are not revoked — the useful "is this person
  // actually using it" signal next to a remove button.
  activeKeys: number;
};

// One API key as the keys panel shows it. key_hash is deliberately absent:
// the admin never needs it, so it is never selected.
export type KeyRow = {
  // uuid; the handle revoke / rate-limit actions address the key by.
  id: string;
  // Owner, for telling whose key is misbehaving.
  email: string;
  // The label the owner typed.
  name: string;
  // First 16 chars, safe to display (design §4.4).
  prefix: string;
  // Current per-minute ceiling, 1–6000 by CHECK constraint.
  rate_limit_per_min: number;
  // ISO timestamps; last_used_at null means "never called".
  created_at: string;
  last_used_at: string | null;
  // null = active. Soft revoke keeps usage history intact.
  revoked_at: string | null;
  // Sum of request_count in the trailing 24 hours.
  requests24h: number;
};

// One bar of the 7-day chart.
export type DailyUsage = {
  // YYYY-MM-DD in IST — a string key so the chart's x-axis is categorical.
  date: string;
  // Total requests across every key that IST day.
  requests: number;
};

// The one-row nova_dataset_meta, as Overview shows it.
export type DatasetMeta = {
  // How many coherent data slices the seed produced (>= 1 by CHECK).
  sliceCount: number;
  // ISO timestamp of the last seed run.
  seededAt: string;
};

// Everything the page renders, loaded in one go so the page makes one call.
export type AdminData = {
  allowlist: AllowlistRow[];
  // null only if the meta row is missing; the auth function then treats it as 1 slice.
  dataset: DatasetMeta | null;
  keys: KeyRow[];
  daily: DailyUsage[];
  totals: {
    // Requests since IST midnight today.
    today: number;
    // Requests across the seven IST days shown in the chart.
    last7d: number;
    // Non-revoked keys.
    activeKeys: number;
    // Rows in nova_allowlist.
    allowlisted: number;
  };
};

// Raw usage row, exactly the three columns selected below.
type UsageRow = { key_id: string; window_start: string; request_count: number };

/*
  Reads every row of a query by paging through it.

  The loop stops on whichever comes first: all `total` rows fetched, a short
  page (nothing more to read), or MAX_PAGES. An explicit `order` in `query` is
  required by the caller — offset paging over an unordered set can skip or
  repeat rows between pages.
*/
async function readAll<T>(relation: string, query: string): Promise<T[]> {
  // Accumulates pages in order.
  const rows: T[] = [];
  // Bounded loop, never while(true): a PostgREST that kept reporting a larger
  // total must not spin a serverless function until it times out.
  for (let page = 0; page < MAX_PAGES; page++) {
    // limit/offset rather than a Range header, because novaRead owns headers.
    const result = await novaRead<T>(relation, `${query}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
    // Appended in place; spreading a 1000-row array is fine at this size.
    rows.push(...result.rows);
    // Done when the page came back short or we have everything counted.
    if (result.rows.length < PAGE_SIZE || rows.length >= result.total) break;
  }
  return rows;
}

// The IST calendar date an instant falls on, as YYYY-MM-DD. Shifting by the
// fixed offset then reading the UTC date is exact because IST has no DST.
export function istDate(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// The UTC instant of IST midnight at the start of the day containing `ms`.
function istMidnight(ms: number): number {
  // Floor in shifted time, then shift back, so the boundary is IST's, not UTC's.
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/*
  Pure aggregation, split out from the fetching so it can be exercised without
  a database — the IST bucketing is the part most likely to be off by a day.

  Returns the seven IST days ending today — ALWAYS seven entries, zero-filled,
  so a quiet day is a visible zero bar rather than a missing one that silently
  compresses the x-axis — plus today's total and per-key 24h sums.
*/
export function aggregateUsage(usage: UsageRow[], now: number) {
  // Midnight today in IST; "today" means the IST working day, like /axe.
  const todayStart = istMidnight(now);
  // Seed every day at zero, oldest first, so the chart reads left-to-right.
  const perDay = new Map<string, number>();
  // i from 6 down to 0 walks from six days ago to today.
  for (let i = 6; i >= 0; i--) perDay.set(istDate(todayStart - i * DAY_MS), 0);
  // The 24h window is trailing, not calendar, so it means the same thing at
  // 00:05 and 23:55.
  const since24h = now - DAY_MS;
  // Per-key running sums for the keys table.
  const perKey24h = new Map<string, number>();
  // Running total since IST midnight.
  let today = 0;
  // One pass over the rows; each row is one key-minute.
  for (const row of usage) {
    // Parsed once; PostgREST returns timestamptz as ISO with offset.
    const t = Date.parse(row.window_start);
    // Guard against a null/garbage count so one bad row cannot NaN the totals.
    const n = Number(row.request_count) || 0;
    // Bucket label for this minute.
    const day = istDate(t);
    // has() check drops rows outside the seven-day window instead of adding
    // an eighth bar for a row that straddled the query boundary.
    if (perDay.has(day)) perDay.set(day, perDay.get(day) + n);
    // Today's headline number.
    if (t >= todayStart) today += n;
    // Per-key trailing-24h sum.
    if (t >= since24h) perKey24h.set(row.key_id, (perKey24h.get(row.key_id) ?? 0) + n);
  }
  // Map preserves insertion order, which is oldest→newest from the seed loop.
  const daily: DailyUsage[] = [...perDay].map(([date, requests]) => ({ date, requests }));
  // 7-day total is the sum of the bars, so the tile and the chart cannot disagree.
  const last7d = daily.reduce((sum, d) => sum + d.requests, 0);
  return { daily, today, last7d, perKey24h };
}

/*
  Loads the whole admin view.

  The three reads are independent, so they run concurrently; the page's
  latency is the slowest one rather than the sum.
*/
export async function loadAdminData(now: number = Date.now()): Promise<AdminData> {
  // Oldest instant any tile or bar needs: IST midnight six days ago. Always at
  // or before now-24h, so this one query also feeds the per-key 24h column.
  const windowStart = istMidnight(now) - 6 * DAY_MS;
  // Fired together; each is paged internally.
  const [allowlist, keys, usage, meta] = await Promise.all([
    // Newest first, so the person just added is at the top of the list.
    readAll<Omit<AllowlistRow, "activeKeys" | "dataSlice">>(
      "nova_allowlist",
      "select=email,note,created_at,slot&order=created_at.desc,email.asc",
    ),
    // key_hash is NOT in the select list — the admin never needs it.
    readAll<Omit<KeyRow, "requests24h">>(
      "nova_api_key",
      "select=id,email,name,prefix,rate_limit_per_min,created_at,last_used_at,revoked_at&order=created_at.desc,id.asc",
    ),
    // Uses nova_api_usage_window_idx. Ordered by the full PK so paging is stable.
    readAll<UsageRow>(
      "nova_api_usage",
      `select=key_id,window_start,request_count&window_start=gte.${new Date(windowStart).toISOString()}&order=window_start.asc,key_id.asc`,
    ),
    // One row by design (boolean PK), so a plain read with limit=1 is enough.
    novaRead<{ slice_count: number; seeded_at: string }>("nova_dataset_meta", "select=slice_count,seeded_at&limit=1"),
  ]);
  // Missing row → null for the UI, but modulus 1, mirroring the auth function's coalesce.
  const metaRow = meta.rows[0];
  // Guarded again here although the CHECK says >= 1: a zero would NaN every slice.
  const sliceCount = metaRow && metaRow.slice_count >= 1 ? metaRow.slice_count : 1;
  // Sums computed once and shared by the tiles, the chart and the keys table.
  const agg = aggregateUsage(usage, now);
  // Active-key count per email for the allowlist panel.
  const activeByEmail = new Map<string, number>();
  // Only non-revoked keys count as "active".
  for (const k of keys) if (!k.revoked_at) activeByEmail.set(k.email, (activeByEmail.get(k.email) ?? 0) + 1);
  return {
    // `?? 0` so a person with no keys shows 0, not blank.
    allowlist: allowlist.map((a) => ({ ...a, dataSlice: a.slot % sliceCount, activeKeys: activeByEmail.get(a.email) ?? 0 })),
    // Only surfaced when the row exists; the page shows nothing rather than a guess.
    dataset: metaRow ? { sliceCount: metaRow.slice_count, seededAt: metaRow.seeded_at } : null,
    // A key with no usage rows in the window shows 0.
    keys: keys.map((k) => ({ ...k, requests24h: agg.perKey24h.get(k.id) ?? 0 })),
    daily: agg.daily,
    totals: {
      today: agg.today,
      last7d: agg.last7d,
      // Sum of the per-email counts is exactly the non-revoked key count.
      activeKeys: [...activeByEmail.values()].reduce((s, n) => s + n, 0),
      allowlisted: allowlist.length,
    },
  };
}
