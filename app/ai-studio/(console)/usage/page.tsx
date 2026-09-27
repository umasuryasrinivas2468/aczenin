import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DailyAreaChart, HourlyStatusChart, StatusBreakdown } from "@/components/ai-studio/charts";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { formatCompact, formatTokens, formatWhen, PageHeader, Panel, StatTile, statusClassOf } from "@/components/ai-studio/ui";
import { loadUserDashboard } from "@/lib/ai-studio/dashboard";
import { getUserSession } from "@/lib/ai-studio/session";
import { cn } from "@/lib/utils";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Usage & logs" };

const PERIODS = [7, 14, 30] as const;

const STATUS_TEXT: Record<number, string> = {
  200: "OK", 400: "Bad request", 401: "Unauthorized", 403: "Forbidden", 404: "Not found",
  413: "Too large", 429: "Rate limited", 499: "Client closed", 502: "Upstream error",
  503: "Unavailable", 504: "Timeout",
};

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await getUserSession();
  if (!session || session.stage !== "full") redirect("/ai-studio/login");

  const requested = Number((await searchParams).days);
  const days = (PERIODS as readonly number[]).includes(requested) ? requested : 14;
  const data = await loadUserDashboard(session.user.id, days);

  const totals = data.series.reduce(
    (acc, day) => ({
      requests: acc.requests + day.requests,
      denied: acc.denied + day.denied,
      input: acc.input + day.input_tokens,
      output: acc.output + day.output_tokens,
    }),
    { requests: 0, denied: 0, input: 0, output: 0 },
  );
  const tokenSeries = data.series.map((day) => ({ day: day.day, tokens: day.input_tokens + day.output_tokens }));
  const breakdown = data.status_codes.map((row) => {
    const cls = statusClassOf(row.status);
    return { status: row.status, count: row.count, label: STATUS_TEXT[row.status] ?? cls.label, color: cls.color };
  });

  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Analytics"
          title="Usage & logs"
          description="Every request that reached the gateway with one of your keys, including the ones limits refused. Prompts and responses are never stored."
          actions={
            <div role="group" aria-label="Period" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {PERIODS.map((period) => (
                <Link
                  key={period}
                  href={`/ai-studio/usage?days=${period}`}
                  aria-current={period === days ? "true" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    period === days ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {period}d
                </Link>
              ))}
            </div>
          }
        />
      </Reveal>

      <Reveal delay={0.04} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={`Requests · ${days}d`} value={formatCompact(totals.requests)} />
        <StatTile label="Refused by limits" value={formatCompact(totals.denied)} tone={totals.denied > 0 ? "warn" : "default"} />
        <StatTile label="Input tokens" value={formatTokens(totals.input)} />
        <StatTile label="Output tokens" value={formatTokens(totals.output)} />
      </Reveal>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Reveal delay={0.07}>
          <Panel title="Tokens per day" description="Input + output">
            <DailyAreaChart data={tokenSeries} valueKey="tokens" label="Tokens" kind="tokens" />
          </Panel>
        </Reveal>
        <Reveal delay={0.09}>
          <Panel title="Status codes · last 24 hours">
            <HourlyStatusChart data={data.hourly} />
          </Panel>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Reveal delay={0.1}>
          <Panel title={`Status codes · ${days}d`} description="Share of all requests">
            <StatusBreakdown rows={breakdown} />
            {data.outcomes.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">By outcome</p>
                <ul className="space-y-1.5 text-sm">
                  {data.outcomes.slice(0, 8).map((row) => (
                    <li key={row.outcome} className="flex justify-between gap-3">
                      <code className="font-mono text-[0.78rem] text-slate-700">{row.outcome}</code>
                      <span className="tabular-nums text-slate-600">{row.count.toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.12}>
          <Panel title="Recent requests" description="Latest 50" bodyClassName="p-0">
            {data.recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No requests yet. Try the Quickstart.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-medium text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-medium">Time (IST)</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Outcome</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Tokens in / out</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Latency</th>
                      <th scope="col" className="px-5 py-2.5 font-medium">Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recent.map((row, index) => {
                      const cls = statusClassOf(row.status_code);
                      return (
                        <tr key={`${row.request_id ?? index}`} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-5 py-2.5 text-slate-600">{formatWhen(row.occurred_at)}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 font-mono text-[0.8rem] font-semibold text-slate-900">
                              <span className="h-2 w-2 rounded-full" style={{ background: cls.color }} aria-hidden />
                              {row.status_code}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[0.75rem] text-slate-600">{row.outcome}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                            {formatTokens(row.input_tokens)} / {formatTokens(row.output_tokens)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                            {row.latency_ms ? `${row.latency_ms} ms` : "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-2.5 font-mono text-[0.75rem] text-slate-500" title={row.request_id ?? undefined}>
                            {row.key_name ?? row.key_hint ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>
      </div>
    </>
  );
}
