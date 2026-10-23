/*
  /nova-api/usage — "Usage & logs": which of the signed-in user's calls
  succeeded, which failed, why, and what each status code means.

  A Server Component. All rows are read and aggregated on the server from a
  query filtered by the SESSION's email; the browser receives only this
  user's numbers and 50 recent rows. The two charts are the only client
  islands (recharts needs the DOM). Filters are plain links that change
  ?range= and ?status=, so the page works before hydration and every view
  is a shareable URL.

  Only page content lives here: the (portal) layout supplies the sidebar
  shell and the max-w-5xl container.
*/

// Page metadata type.
import type { Metadata } from "next";
// Client-side navigation for the filter links.
import Link from "next/link";
// Server-side redirect for visitors without a session.
import { redirect } from "next/navigation";

// Shared portal pieces, reused rather than re-implemented.
import { formatCount, formatDateTime } from "@/components/nova/admin/format";
import { CallsPerDayChart, StatusCodeChart } from "@/components/nova/analytics/UsageCharts";
import { FIX_BY_CODE, StatusBadge, StatusCodeTable } from "@/components/nova/analytics/statusCodes";
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import CopyButton from "@/components/nova/portal/CopyButton";
// Session lookup.
import { getPortalUser } from "@/lib/nova/portalAuth";
// Loader and parsers for this page.
import { isSuccess, loadUsage, parseRange, parseStatusFilter, type RangeDays, type StatusFilter, type UsageData } from "./data";

// node:crypto via portalAuth.
export const runtime = "nodejs";

// Per-user, cookie-derived content must never be cached or shared.
export const dynamic = "force-dynamic";

// Private page: keep it out of search results.
export const metadata: Metadata = {
  title: "Usage & logs",
  robots: { index: false, follow: false },
};

// www, not the apex: the apex 308-redirects and HTTP clients drop the
// Authorization header across hosts, so an apex base URL 401s every call.
const BASE_URL = "https://www.aczen.in/nova-api/v1";

// The empty state's first call; the key placeholder is obvious on purpose.
const FIRST_CALL = `curl "${BASE_URL}/invoices?limit=1" \\\n  -H "Authorization: Bearer nova_sk_YOUR_KEY"`;

// Next 15: searchParams is a Promise.
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Builds a filter link that changes one param and keeps the other.
function hrefFor(range: RangeDays, status: StatusFilter): string {
  // Defaults are omitted so the canonical URL stays /nova-api/usage.
  const params = new URLSearchParams();
  if (range !== 7) params.set("range", String(range));
  if (status !== "all") params.set("status", status);
  // "?" only when there is something after it.
  const query = params.toString();
  return query ? `/nova-api/usage?${query}` : "/nova-api/usage";
}

// A segmented control of links; the current option is marked for sight and AT.
function Segmented({ label, options }: { label: string; options: { href: string; text: string; active: boolean }[] }) {
  return (
    // nav + aria-label: a named group of links, announced as such.
    <nav aria-label={label} className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          // aria-current tells a screen reader which view is showing.
          aria-current={o.active ? "page" : undefined}
          // Aczen orange marks the active option: brand colour on UI, never on data.
          // scroll={false} keeps the reader where they were when filtering the table.
          scroll={false}
          className={`whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            o.active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.text}
        </Link>
      ))}
    </nav>
  );
}

// One KPI tile: label first in DOM order so AT reads "Failed calls, 12".
function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    // Same card surface as the chart panels, so the page reads as one set.
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {/* Optional context line, e.g. the count behind a percentage. */}
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// A titled card; used for every panel below the tiles.
function Panel({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    // aria-labelledby names the landmark after its visible heading.
    // min-w-0 lets the panel shrink inside the grid instead of widening the page.
    <section aria-labelledby={id} className="min-w-0 space-y-3 rounded-xl border bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// "12 ms" / "1,204 ms" with grouping.
function ms(value: number): string {
  return `${formatCount(value)} ms`;
}

export default async function NovaUsagePage({ searchParams }: PageProps) {
  // Re-checked here even though the layout checks too: defence in depth, and
  // this page must never query without a verified email.
  const user = await getPortalUser();
  // redirect() throws, so nothing below runs for a signed-out visitor.
  if (!user) redirect("/nova-api");

  // Whitelisted parse: junk in the URL falls back to the defaults.
  const params = await searchParams;
  const range = parseRange(params.range);
  const status = parseStatusFilter(params.status);

  // Loaded apart from the session check so a DB failure shows an inline
  // error instead of bouncing a signed-in user to the sign-in form.
  let data: UsageData | null = null;
  try {
    // ONLY the session's email, never anything from the URL.
    data = await loadUsage(user.email, range, status);
  } catch (error) {
    // Detail for the operator; generic text for the user below.
    console.error("[nova/usage] loadUsage failed:", error);
  }

  // Header and the range toggle, shared by every state of the page.
  const header = (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Usage &amp; logs</h1>
        <p className="text-sm text-muted-foreground">
          Every authenticated call your keys made, in IST. Calls rejected for a missing or unknown key (401) have no
          key to attribute them to, so they are not logged here.
        </p>
      </div>
      <Segmented
        label="Date range"
        options={[
          { href: hrefFor(7, status), text: "7 days", active: range === 7 },
          { href: hrefFor(30, status), text: "30 days", active: range === 30 },
        ]}
      />
    </header>
  );

  // --- DB failure --------------------------------------------------------
  if (data === null) {
    return (
      <div className="space-y-8">
        {header}
        {/* Generic on purpose; the detail is in the server log. */}
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          We couldn&apos;t load your usage right now. Please refresh in a minute.
        </p>
      </div>
    );
  }

  // --- Empty state: nothing in this range yet ------------------------------
  if (data.totals.calls === 0) {
    return (
      <div className="space-y-8">
        {header}
        <section aria-labelledby="empty-title" className="space-y-4 rounded-xl border border-dashed p-6">
          <div className="space-y-1">
            <h2 id="empty-title" className="text-lg font-semibold">
              No calls in the last {range} days
            </h2>
            <p className="text-sm text-muted-foreground">
              Make your first call and it shows up here within seconds. You need a key: create one on your{" "}
              <Link href="/nova-api/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
                API keys page
              </Link>
              .
            </p>
          </div>
          <CodeBlock code={FIRST_CALL} title="cURL" />
        </section>
        {/* The code reference is still useful before the first call. */}
        <Panel id="codes-title" title="Status codes explained">
          <StatusCodeTable />
        </Panel>
      </div>
    );
  }

  // Derived once for the tiles.
  const { totals } = data;
  // One decimal: 99.9% and 100% must read differently.
  const successRate = `${((totals.succeeded / totals.calls) * 100).toFixed(1)}%`;

  return (
    <div className="space-y-8">
      {header}

      {/* Partial-data notice; only appears past the loader's page cap. */}
      {data.truncated && (
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          This range has more calls than the page can summarise at once; figures cover the most recent 20,000.
        </p>
      )}

      {/* --- 1. KPI tiles -------------------------------------------------- */}
      {/* 2 per row on phones, 3 on tablets, all 5 in one row on wide screens. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Total calls" value={formatCount(totals.calls)} hint={`Last ${range} days`} />
        <Tile label="Success rate" value={successRate} hint={`${formatCount(totals.succeeded)} succeeded (2xx)`} />
        <Tile label="Failed calls" value={formatCount(totals.failed)} hint="4xx and 5xx" />
        <Tile label="Average latency" value={ms(totals.avgMs)} hint="Server handling time" />
        <Tile label="p95 latency" value={ms(totals.p95Ms)} hint="95% of calls were faster" />
      </div>

      {/* --- 2. Calls per day ---------------------------------------------- */}
      <Panel id="daily-title" title="Calls per day" description={`Succeeded vs failed, last ${range} days (IST).`}>
        <CallsPerDayChart daily={data.daily} />
      </Panel>

      {/* --- 3. Status codes + failure reasons, side by side on wide screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="status-title" title="Calls by status code">
          <StatusCodeChart byStatus={data.byStatus} />
        </Panel>
        <Panel id="reasons-title" title="Top failure reasons" description="By error code, most frequent first.">
          {data.byError.length === 0 ? (
            // A real, good state: say so rather than showing an empty list.
            <p className="text-sm text-muted-foreground">No failed calls in this range.</p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {data.byError.map((e) => (
                // Codes are unique after aggregation.
                <li key={e.code} className="space-y-1 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <code className="min-w-0 break-all font-mono text-sm font-medium">{e.code}</code>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatCount(e.count)}</span>
                  </div>
                  {/* The latest message the caller actually received for this code. */}
                  {e.example && <p className="break-words text-xs text-muted-foreground">“{e.example}”</p>}
                  {/* How to fix, from the same list as the reference table. */}
                  {FIX_BY_CODE.has(e.code) && <p className="text-xs">Fix: {FIX_BY_CODE.get(e.code)}</p>}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* --- 4. Top endpoints ---------------------------------------------- */}
      <Panel id="endpoints-title" title="Top endpoints" description="Ids collapsed, so every invoice lookup counts as one endpoint.">
        {/* Own scroll wrapper: a long path must never widen the page. */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Endpoint</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Calls</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Failed</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Failure rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.endpoints.map((e) => (
                // Patterns are unique after aggregation.
                <tr key={e.pattern}>
                  <td className="px-3 py-2 font-mono text-xs">{e.pattern}</td>
                  {/* tabular-nums: numeric columns must align vertically. */}
                  <td className="px-3 py-2 text-right tabular-nums">{formatCount(e.calls)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCount(e.failed)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{((e.failed / e.calls) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* --- 6. Recent calls (before the reference: it is what people come for) */}
      <Panel id="recent-title" title="Recent calls" description={`The latest 50 in the last ${range} days.`}>
        <Segmented
          label="Filter recent calls"
          options={[
            { href: hrefFor(range, "all"), text: "All", active: status === "all" },
            { href: hrefFor(range, "ok"), text: "Succeeded", active: status === "ok" },
            { href: hrefFor(range, "failed"), text: "Failed", active: status === "failed" },
          ]}
        />
        {data.recent.length === 0 ? (
          // The filter can empty the list even when the range has calls.
          <p className="text-sm text-muted-foreground">No calls match this filter.</p>
        ) : (
          // Scrolls horizontally inside itself and vertically after ~12 rows,
          // so 50 rows never make the page wider or endlessly long.
          <div className="max-h-[32rem] overflow-auto rounded-lg border">
            <table className="w-full min-w-[56rem] text-left text-sm">
              {/* Sticky header keeps the columns named while scrolling. */}
              <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Time (IST)</th>
                  <th scope="col" className="px-3 py-2 font-medium">Method</th>
                  <th scope="col" className="px-3 py-2 font-medium">Path</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Error</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Duration</th>
                  <th scope="col" className="px-3 py-2 font-medium">Request id</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recent.map((row) => {
                  // Path as the caller typed it, query included, for the tooltip and cell.
                  const fullPath = row.query ? `${row.path}?${row.query}` : row.path;
                  return (
                    // id is the table's primary key.
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDateTime(row.occurred_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.method}</td>
                      {/* Truncated to one line; title shows the full text on hover. */}
                      <td className="max-w-[16rem] px-3 py-2">
                        <span title={fullPath} className="block truncate font-mono text-xs">
                          {fullPath}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      {/* Why it failed: the code, then the exact message sent. */}
                      <td className="max-w-[18rem] px-3 py-2">
                        {isSuccess(row.status) ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            <code className="block font-mono text-xs font-medium">{row.error_code ?? "unknown"}</code>
                            {row.error_message && (
                              <span title={row.error_message} className="line-clamp-2 text-xs text-muted-foreground">
                                {row.error_message}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{ms(row.duration_ms)}</td>
                      {/* Shortened for the eye; the button copies the full uuid for support. */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <code title={row.request_id} className="font-mono text-xs">
                            {row.request_id.slice(0, 8)}…
                          </code>
                          <CopyButton value={row.request_id} label="Copy" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* --- 5. Status codes explained ------------------------------------- */}
      <Panel id="codes-title" title="Status codes explained" description="Every status the API returns, and what to do about it.">
        <StatusCodeTable />
      </Panel>
    </div>
  );
}
