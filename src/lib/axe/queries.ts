/*
  Dashboard aggregation for the /axe Overview.

  WHY EVERY AGGREGATE IS COMPUTED IN NODE RATHER THAN IN SQL:
  Supabase exposes the database over PostgREST, which has no general GROUP BY.
  Server-side aggregation would mean SQL functions in a migration; the raw rows
  for the window are fetched once and reduced here instead.

  That is fine at this site's scale and genuinely bad at a much larger one. The
  honest limit is the `truncated` flag returned below: when it is true the
  figures are a floor, and the UI says so rather than quietly showing a smaller
  chart. An analytics tool that lies by omission is worse than one that admits
  it stopped counting.
*/

import { axeSelect } from "@/lib/axe/supabase";

// The row shapes actually fetched — a subset of the table columns, because the
// bytes not selected are bytes not transferred, and this runs on every load.
type PageViewRow = {
  occurred_at: string;
  path: string;
  referrer_host: string | null;
  country: string | null;
  city: string | null;
  device: string;
  is_bot: boolean;
  visitor_hash: string;
};

type LeadRow = {
  occurred_at: string;
  source_path: string | null;
  form_name: string;
};

// A metric with its comparison against the preceding period of equal length.
// Bundled as one type because a number without its trend is what makes a
// dashboard look informative while telling the reader nothing.
export type Metric = {
  // Nullable because some metrics are genuinely undefined rather than zero —
  // see the conversion rate below, where a zero denominator means "cannot be
  // computed", not "nobody converted".
  value: number | null;
  // null, not 0, when the previous period had nothing to compare against.
  // A jump from 0 to 40 is not "+infinity% growth" and not "0% change"; it is
  // a comparison that cannot be made, and the UI renders it as a dash.
  changePct: number | null;
};

// One row of the traffic chart: area for traffic, bars for leads beneath it.
export type DailyPoint = {
  date: string;
  pageviews: number;
  visitors: number;
  leads: number;
};

// A "label plus count" pair, reused by top pages, referrers, devices, cities
// and the bot split. One type rather than five identical ones, which would
// drift apart the first time a chart needed a tweak.
export type Breakdown = {
  label: string;
  value: number;
  /*
    Visitor-days for this path, not distinct people — the same semantics as the
    headline visitors tile, and for the same reason (the hash rotates daily).

    Note these do NOT sum to the headline figure: one person reading three pages
    in a day counts once in the tile and three times across these rows. The
    table column is labelled accordingly.
  */
  visitors?: number;
};

/*
  A breakdown plus the denominator its shares should be computed against.

  This exists because of a specific bug: rendering "38.2%" next to a referrer
  when that is 38.2% OF THE VISIBLE TOP TEN, not of all traffic, is a materially
  different business fact presented identically. The chart is handed a top-N
  slice, so it cannot compute the real denominator itself — it has to be told.
*/
export type BreakdownGroup = {
  rows: Breakdown[];
  // Sum across EVERY bucket, including the ones cut off by the top-N limit.
  total: number;
};

export type OverviewData = {
  rangeDays: number;
  uniqueVisitors: Metric;
  pageviews: Metric;
  leads: Metric;
  conversionRate: Metric;
  daily: DailyPoint[];
  topPages: Breakdown[];
  // The true total pageview count behind the top-pages list, for shares.
  topPagesTotal: number;
  referrers: BreakdownGroup;
  devices: BreakdownGroup;
  cities: BreakdownGroup;
  botSplit: BreakdownGroup;
  truncated: boolean;
};

// The hard ceiling on rows pulled per table, covering both windows at once.
const ROW_LIMIT = 50_000;

// One day in milliseconds, named because it appears in every date computation
// below and a bare 86400000 is unreadable.
const DAY_MS = 24 * 60 * 60 * 1000;

/*
  India Standard Time as a fixed offset in minutes.

  A fixed offset is exactly correct rather than an approximation: India has
  never observed daylight saving, so IST is permanently UTC+05:30.
*/
const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60_000;

/*
  The calendar day an instant falls on, in IST, as YYYY-MM-DD.

  MUST AGREE WITH THE SALT ROTATION IN identity.ts, which also rotates on the
  IST date. If one used UTC and the other IST they would disagree for the 05:30
  window after UTC midnight, and a visitor active either side of that boundary
  would carry two hashes inside a single chart bucket — counted as two people.
*/
function istDayKey(iso: string): string | null {
  const parsed = new Date(iso).getTime();
  // Guarded because new Date(NaN).toISOString() THROWS rather than returning a
  // sentinel, so one malformed timestamp would take down the whole page instead
  // of costing one row. Returning null lets the caller skip it.
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/*
  The instant at which the current IST day began, as a UTC epoch millisecond.

  THIS IS WHAT ANCHORS THE WINDOW TO WHOLE DAYS. Anchoring to "now minus 30
  days" instead produces two bugs at once: the last bucket is the current
  partial day but is never seeded (so today's traffic silently vanishes from the
  chart), and the first bucket covers only the hours after the current
  wall-clock time (so the leftmost bar is always artificially short and reads as
  "traffic was low a month ago").
*/
function istDayStart(nowMs: number): number {
  const shifted = nowMs + IST_OFFSET_MS;
  // Floored to the day boundary in shifted space, then shifted back, so the
  // result is a real UTC instant corresponding to 00:00 IST.
  return Math.floor(shifted / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/*
  Percentage change from previous to current.

  Returns null rather than a number when there is no meaningful comparison —
  see the note on Metric.changePct for why that matters.
*/
function changePct(current: number | null, previous: number | null): number | null {
  // Either side being undefined makes the comparison undefined; a null treated
  // as zero would invent a 100% swing out of missing data.
  if (current === null || previous === null) {
    return null;
  }
  // Dividing by a zero baseline yields Infinity, which renders as "∞%" and
  // tells the reader nothing about whether growth was good.
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/*
  Counts occurrences of a key and returns the largest buckets PLUS the true
  total across all of them.

  Written once and reused by every breakdown, because five hand-rolled
  reduce-sort-slice chains is five chances to sort ascending by mistake and ship
  a "top pages" chart showing the least-visited pages.
*/
function topBy<T>(rows: T[], key: (row: T) => string | null, limit: number): BreakdownGroup {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = key(row);
    // Null is a real answer for referrer (direct traffic) and city (geo
    // unavailable), and it is excluded rather than bucketed as "unknown":
    // an "unknown" bar would usually be the tallest and would crowd out every
    // real value the chart exists to show.
    if (!label) {
      continue;
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  // Summed over EVERY bucket before slicing, so a share computed against it is
  // a share of all counted traffic rather than of the visible rows.
  let total = 0;
  for (const count of counts.values()) {
    total += count;
  }

  return {
    rows: Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      // Descending: the whole point of a "top N" is the largest first.
      .sort((a, b) => b.value - a.value)
      .slice(0, limit),
    total,
  };
}

/*
  Unique visitors, counted PER DAY and then summed.

  === READ THIS BEFORE "SIMPLIFYING" IT TO ONE SET OVER THE RANGE ==========
  visitor_hash includes the date and the salt rotates daily (see identity.ts).
  That rotation is not a tuning choice — it is what makes this data anonymous
  rather than merely pseudonymous, and therefore what keeps it outside the scope
  of the DPDP Act 2023 and GDPR.

  The consequence is that A HASH IS ONLY COMPARABLE WITHIN ONE DAY. The same
  person carries a different hash tomorrow, by design and irreversibly.

  So "distinct visitors over 30 days" is not a number this system can produce.
  What it returns instead is the sum of each day's distinct visitors: someone
  visiting on three days counts three times. That is the honest definition, not
  an error, and the tile displaying it says so.

  A single Set over the whole range returns the identical number today, which is
  exactly what makes the naive version dangerous: it looks equivalent, it reads
  as "distinct people", and it becomes wrong the moment the rotation changes.
  ==========================================================================
*/
function sumOfDailyUniqueVisitors(rows: PageViewRow[]): number {
  const perDay = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = istDayKey(row.occurred_at);
    // Skipped rather than thrown: one unparseable timestamp should cost one row,
    // not the whole dashboard.
    if (!key) {
      continue;
    }
    if (!perDay.has(key)) {
      perDay.set(key, new Set());
    }
    perDay.get(key)!.add(row.visitor_hash);
  }

  // Summed rather than averaged: this tile answers "how much reach did the
  // period have", and an average would answer a different question that the
  // percentage-change comparison beneath it would then misrepresent.
  let total = 0;
  for (const set of perDay.values()) {
    total += set.size;
  }
  return total;
}

export async function getOverview(rangeDays = 30): Promise<OverviewData> {
  const now = Date.now();
  // Anchored to IST midnight so every bucket is a whole day — see istDayStart.
  // rangeDays - 1 because the range INCLUDES today: 30 days ending today starts
  // 29 days ago, and using rangeDays here would silently produce 31 buckets.
  const currentStartMs = istDayStart(now) - (rangeDays - 1) * DAY_MS;
  // The preceding window of equal length, which every percentage change is
  // measured against.
  const previousStartMs = currentStartMs - rangeDays * DAY_MS;
  const since = new Date(previousStartMs).toISOString();

  // Issued in parallel: the two tables are independent, so awaiting them in
  // sequence would add the slower one's latency to the faster one's for nothing.
  const [pageViews, leads] = await Promise.all([
    axeSelect<PageViewRow>(
      "page_view",
      /*
        DESCENDING, and that is load-bearing rather than cosmetic.

        PostgREST caps the result with a Range header, so it keeps the FIRST
        rows in the requested order. Ascending would keep the OLDEST rows —
        meaning that at the cap, the previous period survives intact while the
        current period is the part thrown away. Every percentage change would
        then read as a catastrophic decline on a growing site, complete with a
        red arrow, which is far worse than an undercount because it is a
        confident lie in the opposite direction.
      */
      `select=occurred_at,path,referrer_host,country,city,device,is_bot,visitor_hash&occurred_at=gte.${since}&order=occurred_at.desc`,
      ROW_LIMIT,
    ),
    axeSelect<LeadRow>(
      "lead_event",
      // Note what is NOT selected: this query never asks for anything that could
      // identify a person. The Overview is counts only, and the safest way to
      // honour that is to never fetch such a field in the first place.
      `select=occurred_at,source_path,form_name&occurred_at=gte.${since}&order=occurred_at.desc`,
      ROW_LIMIT,
    ),
  ]);

  // Hitting the cap means rows were dropped, so every figure below is a floor.
  const truncated = pageViews.length >= ROW_LIMIT || leads.length >= ROW_LIMIT;

  // Bots are excluded from every figure EXCEPT the bot-vs-human split itself.
  // Leaving them in would mean a crawler flood reads as growth, which is the
  // specific failure the is_bot column exists to prevent.
  const humanViews = pageViews.filter((row) => !row.is_bot);

  // Split into the two windows once and reused, rather than re-filtering inside
  // each metric where the two sides could drift apart.
  const inCurrent = (iso: string): boolean => new Date(iso).getTime() >= currentStartMs;
  const currentViews = humanViews.filter((row) => inCurrent(row.occurred_at));
  const previousViews = humanViews.filter((row) => !inCurrent(row.occurred_at));
  const currentLeads = leads.filter((row) => inCurrent(row.occurred_at));
  const previousLeads = leads.filter((row) => !inCurrent(row.occurred_at));

  // --- Tiles ----------------------------------------------------------------
  const currentUnique = sumOfDailyUniqueVisitors(currentViews);
  const previousUnique = sumOfDailyUniqueVisitors(previousViews);

  /*
    Conversion is leads per VISITOR, not per pageview. Per pageview would make
    the rate fall every time someone reads more pages, so a more engaged
    audience would look like a worse-performing site.

    null rather than 0 when there are no visitor-days: leads can exist with a
    zero denominator (the originating pageview was flagged as a bot, predates
    the window, or was dropped by the row cap), and printing "0.00%" beside a
    Leads tile reading 3 states something false. A dash states the truth, which
    is that the ratio is undefined.
  */
  const rate = (leadCount: number, visitorDays: number): number | null =>
    visitorDays === 0 ? null : (leadCount / visitorDays) * 100;
  const currentConversion = rate(currentLeads.length, currentUnique);
  const previousConversion = rate(previousLeads.length, previousUnique);

  // --- Daily series ---------------------------------------------------------
  // Seeded with every day in the range at zero BEFORE counting, so days with no
  // traffic appear as gaps at zero rather than vanishing — a chart that drops
  // empty days compresses its x-axis and makes a quiet week look busy.
  //
  // Because the window is anchored to IST midnight, the LAST seeded bucket is
  // today. Anchoring to "now minus 30 days" left today unseeded, and the guard
  // below then discarded every one of today's rows on every single load.
  const dailyMap = new Map<string, DailyPoint>();
  for (let day = 0; day < rangeDays; day += 1) {
    const key = istDayKey(new Date(currentStartMs + day * DAY_MS).toISOString());
    if (key) {
      dailyMap.set(key, { date: key, pageviews: 0, visitors: 0, leads: 0 });
    }
  }

  // Unique visitors per day need their own per-day Sets; a running total cannot
  // be de-duplicated after the fact.
  const visitorsByDay = new Map<string, Set<string>>();
  for (const row of currentViews) {
    const key = istDayKey(row.occurred_at);
    const point = key ? dailyMap.get(key) : undefined;
    // Now genuinely exceptional rather than routine: with the window anchored to
    // whole IST days, every current-period row falls in a seeded bucket.
    if (!point || !key) {
      continue;
    }
    point.pageviews += 1;
    if (!visitorsByDay.has(key)) {
      visitorsByDay.set(key, new Set());
    }
    visitorsByDay.get(key)!.add(row.visitor_hash);
  }

  for (const row of currentLeads) {
    const key = istDayKey(row.occurred_at);
    const point = key ? dailyMap.get(key) : undefined;
    if (point) {
      point.leads += 1;
    }
  }

  // Folded in after the fact, once each day's Set is complete.
  for (const [key, set] of visitorsByDay) {
    const point = dailyMap.get(key);
    if (point) {
      point.visitors = set.size;
    }
  }

  // Sorted by date string: ISO dates sort lexicographically in chronological
  // order, so no date parsing is needed to order the series correctly.
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // --- Top pages ------------------------------------------------------------
  // Views and visitors per path answer different questions: a page with 500
  // views from 3 visitors is not popular, it is being refreshed.
  //
  // Grouped by path AND day then summed, for the same reason as the headline
  // tile — a hash is only comparable within one day, so a Set keyed on path
  // alone would assert a cross-day identity the salt rotation destroys.
  const pageVisitorsByDay = new Map<string, Map<string, Set<string>>>();
  for (const row of currentViews) {
    const dayKey = istDayKey(row.occurred_at);
    if (!dayKey) {
      continue;
    }
    if (!pageVisitorsByDay.has(row.path)) {
      pageVisitorsByDay.set(row.path, new Map());
    }
    const days = pageVisitorsByDay.get(row.path)!;
    if (!days.has(dayKey)) {
      days.set(dayKey, new Set());
    }
    days.get(dayKey)!.add(row.visitor_hash);
  }

  // Flattened to one number per path so the table and chart consume one shape.
  const pageVisitors = new Map<string, number>();
  for (const [path, days] of pageVisitorsByDay) {
    let total = 0;
    for (const set of days.values()) {
      total += set.size;
    }
    pageVisitors.set(path, total);
  }

  // 48 covers every route on the site, so the sortable table can show them all
  // rather than a truncated top ten that hides the underperformers — which are
  // the rows most worth finding.
  const pageGroup = topBy(currentViews, (row) => row.path, 48);
  const topPages = pageGroup.rows.map((entry) => ({
    ...entry,
    // ?? 0 because reading a Map that might miss is how a NaN reaches a table
    // cell, and the default costs nothing.
    visitors: pageVisitors.get(entry.label) ?? 0,
  }));

  return {
    rangeDays,
    uniqueVisitors: { value: currentUnique, changePct: changePct(currentUnique, previousUnique) },
    pageviews: {
      value: currentViews.length,
      changePct: changePct(currentViews.length, previousViews.length),
    },
    leads: {
      value: currentLeads.length,
      changePct: changePct(currentLeads.length, previousLeads.length),
    },
    conversionRate: {
      value: currentConversion,
      changePct: changePct(currentConversion, previousConversion),
    },
    daily,
    topPages,
    topPagesTotal: pageGroup.total,
    // Ten is about what fits a readable horizontal bar chart; beyond that the
    // labels collide and the long tail is noise on a site this size.
    referrers: topBy(currentViews, (row) => row.referrer_host, 10),
    // Four at most, because the CHECK constraint on the column allows exactly
    // four values — asking for more could never return more.
    devices: topBy(currentViews, (row) => row.device, 4),
    // City rather than country: this is an India-first market, where "IN" on
    // every row carries no information and the city does.
    cities: topBy(currentViews, (row) => row.city, 10),
    /*
      The one breakdown computed over rows that were NOT bot-filtered, since
      excluding bots from the bot chart would leave it reading 100% human.

      It is still filtered to the CURRENT period. It previously ran over the raw
      fetch, which spans both windows — so the "Human" bar read roughly twice
      the Pageviews tile beside it, and the ratio looked right enough that the
      absolute numbers never got checked.
    */
    botSplit: topBy(
      pageViews.filter((row) => inCurrent(row.occurred_at)),
      (row) => (row.is_bot ? "Bot" : "Human"),
      2,
    ),
    truncated,
  };
}
