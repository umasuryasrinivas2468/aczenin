/*
  /axe — the Overview section.

  A Server Component. Every number on this page is computed on the server and
  arrives as rendered HTML; the browser receives no Supabase key, no query, and
  no row it is not shown. The only JavaScript that ships is the traffic chart
  and the sortable table, both of which receive their data as props.

  COUNTS ONLY, by the founder's instruction. Nothing on this page identifies a
  person — not a name, not an email, not a "latest lead" preview. The strongest
  form of that guarantee is that the query behind it never selects such a field,
  which is enforced in queries.ts rather than by careful rendering here.
*/

import BreakdownBars from "@/components/axe/BreakdownBars";
import StatTile from "@/components/axe/StatTile";
import TopPagesTable from "@/components/axe/TopPagesTable";
import TrafficChart from "@/components/axe/TrafficChart";
import { hasAxeSession } from "@/lib/axe/guard";
import { getOverview } from "@/lib/axe/queries";

// node:crypto reaches this route through the session verification in the guard.
export const runtime = "nodejs";

// Analytics must reflect the moment they are read. Any caching at all would
// serve stale numbers under a fresh-looking page, which is worse than no
// dashboard because it is believed.
export const dynamic = "force-dynamic";

export default async function AxeOverviewPage() {
  // Checked before the query, not after. An early return here means an
  // unauthenticated request never reaches Supabase at all — so the gate also
  // stops /axe being used as an unauthenticated way to generate database load.
  if (!(await hasAxeSession())) {
    // Renders nothing. The layout is what shows the password form; this branch
    // exists purely so the fetch below cannot run without a session.
    return null;
  }

  const data = await getOverview(30);

  return (
    <div className="space-y-6">
      {/* Shown only when the row cap was hit, so the founder knows the figures
          are a floor rather than a count. An analytics tool that quietly stops
          counting is worse than one that admits it did. */}
      {data.truncated ? (
        <p
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          More events exist than could be read in one query. Every figure below is
          an undercount.
        </p>
      ) : null}

      {/* --- Tiles ---------------------------------------------------------
          Four across on desktop, two on a phone. One column at phone width
          would push the traffic chart below three screens of scrolling. */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* `?? 0` on these three is defensive rather than load-bearing: only
            the conversion rate can actually be null, because only it has a
            denominator that may be zero. The others are array lengths and a
            summed count, which are always numbers. */}
        <StatTile
          label="Unique visitors"
          // The hint is load-bearing, not decoration. The visitor hash rotates
          // with a daily salt — that rotation is what keeps this data anonymous
          // and out of DPDP/GDPR scope — so a person visiting on three days is
          // three visitors here. Saying that on the tile is the difference
          // between a correct number and a correctly-read one.
          hint="Daily uniques, summed — a return visit on another day counts again"
          // en-IN grouping, which is the lakh/crore convention the founder
          // reads numbers in — 1,00,000 rather than 100,000.
          value={(data.uniqueVisitors.value ?? 0).toLocaleString("en-IN")}
          changePct={data.uniqueVisitors.changePct}
        />
        <StatTile
          label="Pageviews"
          value={(data.pageviews.value ?? 0).toLocaleString("en-IN")}
          changePct={data.pageviews.changePct}
        />
        <StatTile
          label="Leads"
          value={(data.leads.value ?? 0).toLocaleString("en-IN")}
          changePct={data.leads.changePct}
        />
        <StatTile
          label="Visitor → lead"
          // Named for its actual denominator. "Conversion rate" would imply the
          // share of PEOPLE who converted, which cannot be computed once the
          // hash rotates daily; leads per visitor-day is what this is.
          hint="Leads per visitor-day, not share of people"
          // A dash, not "0.00%", when there were no visitor-days to divide
          // by: leads can exist with a zero denominator, and printing zero
          // beside a non-zero Leads tile states something false.
          value={
            data.conversionRate.value === null
              ? "—"
              : `${data.conversionRate.value.toFixed(2)}%`
          }
          changePct={data.conversionRate.changePct}
        />
      </section>

      {/* --- Traffic over time ---------------------------------------------- */}
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-base font-medium">Traffic</h2>
          <p className="text-sm text-muted-foreground">
            {/* States the window and the bot exclusion up front. A reader who
                does not know bots were filtered cannot interpret the number,
                and burying that in a tooltip means nobody learns it. */}
            Last {data.rangeDays} days · bots excluded · lead submissions aligned below
          </p>
        </div>
        <TrafficChart data={data.daily} />
      </section>

      {/* --- Pages -----------------------------------------------------------
          The bar chart and the full table are deliberately both present: the
          chart answers "what is winning", the table answers "what is not". */}
      <section className="grid gap-4 lg:grid-cols-2">
        <BreakdownBars
          title="Top pages"
          // Ten in the chart — past that the bars are too short to compare and
          // the full list is one card away in the table below.
          rows={data.topPages.slice(0, 10)}
          // The real denominator across every path, not just the visible ten.
          total={data.topPagesTotal}
          emptyLabel="No pageviews recorded yet."
        />
        <TopPagesTable rows={data.topPages} />
      </section>

      {/* --- Sources and audience -------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <BreakdownBars
          title="Referrers"
          rows={data.referrers.rows}
          total={data.referrers.total}
          emptyLabel="No referred traffic yet — all visits were direct."
        />
        <BreakdownBars
          title="Cities"
          rows={data.cities.rows}
          total={data.cities.total}
          emptyLabel="No geography recorded yet."
        />
        <BreakdownBars
          title="Devices"
          // Categorical: mobile, desktop and tablet are different KINDS of
          // visitor, not different amounts of one thing.
          variant="categorical"
          rows={data.devices.rows}
          // Omitted deliberately: the four device buckets ARE the whole
          // population, so the visible rows are the correct denominator.
          emptyLabel="No device data yet."
        />
        <BreakdownBars
          title="Bots vs humans"
          variant="categorical"
          // The one breakdown computed over unfiltered rows — see queries.ts.
          // It is on the page because it is how every other number gets
          // validated: a sudden swing here explains a swing everywhere else.
          rows={data.botSplit.rows}
          emptyLabel="No traffic recorded yet."
        />
      </section>
    </div>
  );
}
