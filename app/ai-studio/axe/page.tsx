import Link from "next/link";
import { notFound } from "next/navigation";

import { DailyAreaChart, HourlyStatusChart, StatusBreakdown } from "@/components/ai-studio/charts";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import {
  Banner,
  formatCompact,
  formatTokens,
  PageHeader,
  Panel,
  StatTile,
  statusClassOf,
  StatusPill,
} from "@/components/ai-studio/ui";
import { loadAdminDashboard, loadAdminUsers } from "@/lib/ai-studio/dashboard";
import { hasAdminSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";

function money(currency: string, value: number): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: value < 100 ? 2 : 0 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default async function AdminOverviewPage() {
  if (!(await hasAdminSession())) notFound();

  const [data, users] = await Promise.all([loadAdminDashboard(30), loadAdminUsers()]);
  const s = data.settings;
  const budget = Number(s.monthly_budget);
  const spend = data.month_spend;
  const forecast = data.day_of_month > 0 ? (spend / data.day_of_month) * data.days_in_month : 0;
  const pct = budget > 0 ? (spend / budget) * 100 : 0;
  const dailyCap = budget > 0 ? (budget / data.days_in_month) * Number(s.daily_cap_factor) : 0;
  const pricesUnset = Number(s.price_input_per_mtok) === 0 && Number(s.price_output_per_mtok) === 0;
  const breakerOpen = !!s.breaker_open_until && new Date(s.breaker_open_until) > new Date();
  const envKill = process.env.AI_STUDIO_KILL_SWITCH === "1";
  const harnessMissing = !process.env.AI_HARNESS_URL;

  const state =
    envKill || s.global_kill ? { label: "Paused", tone: "on" }
      : pct >= Number(s.hard_stop_pct) ? { label: "Budget stop", tone: "on" }
        : pct >= Number(s.throttle_pct) ? { label: "Throttled", tone: "suspended" }
          : breakerOpen ? { label: "Breaker open", tone: "suspended" }
            : { label: "Serving", tone: "active" };

  const breakdown = data.status_codes.map((row) => {
    const cls = statusClassOf(row.status);
    return { status: row.status, count: row.count, label: cls.label.replace(/^\S+\s/, ""), color: cls.color };
  });
  const top = users.filter((user) => user.month_requests > 0).slice(0, 8);
  const totalTokens = data.month.input_tokens + data.month.output_tokens;

  // Budget bar: spend, forecast marker and the three thresholds on one scale.
  const scaleMax = Math.max(budget * (Number(s.hard_stop_pct) / 100), forecast, spend, 1) * 1.08;
  const at = (value: number) => `${Math.min(100, (value / scaleMax) * 100)}%`;

  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Operator"
          title="Platform overview"
          description={`Month to date (IST), day ${data.day_of_month} of ${data.days_in_month}.`}
          actions={<StatusPill status={state.tone}>{state.label}</StatusPill>}
        />
      </Reveal>

      <div className="mb-6 space-y-3">
        {envKill && <Banner tone="bad" title="Env kill switch is on">AI_STUDIO_KILL_SWITCH=1 overrides the dashboard toggle. Remove it in Vercel to resume.</Banner>}
        {s.global_kill && <Banner tone="bad" title="Global kill switch is on">{s.global_kill_reason ?? "No reason recorded."}</Banner>}
        {harnessMissing && <Banner tone="bad" title="Harness not configured">AI_HARNESS_URL / AI_HARNESS_API_KEY are not set, so every request returns 503.</Banner>}
        {pricesUnset && (
          <Banner tone="warn" title="Token prices are not set">
            Spend is being recorded as zero, so budget alerts, throttling and the hard stop cannot trigger.{" "}
            <Link className="font-semibold underline" href="/ai-studio/axe/controls">Set prices</Link>
          </Banner>
        )}
        {breakerOpen && <Banner tone="warn" title="Circuit breaker open">Upstream failures crossed the threshold. It closes automatically.</Banner>}
      </div>

      <Reveal delay={0.03}>
        <Panel title="Budget vs spend" description={`Monthly budget ${money(s.currency, budget)} · daily cap ${money(s.currency, dailyCap)}`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">{money(s.currency, spend)}</span>
                <span className="text-sm text-slate-500">{pct.toFixed(1)}% of budget</span>
              </div>
              <div className="relative mt-6 h-3 rounded-full bg-slate-100" role="img" aria-label={`Spend ${pct.toFixed(1)} percent of budget; forecast ${money(s.currency, forecast)}`}>
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${pct >= Number(s.throttle_pct) ? "bg-red-600" : pct >= Number(s.alert_pct) ? "bg-amber-500" : "bg-smebank-500"}`}
                  style={{ width: at(spend) }}
                />
                {forecast > spend && (
                  <div className="absolute inset-y-0 rounded-r-full border-2 border-dashed border-slate-300" style={{ left: at(spend), width: `calc(${at(forecast)} - ${at(spend)})` }} aria-hidden />
                )}
                {[
                  [Number(s.alert_pct), "Alert"],
                  [Number(s.throttle_pct), "Throttle"],
                  [Number(s.hard_stop_pct), "Stop"],
                ].map(([threshold, label]) => (
                  <div key={label as string} className="absolute -top-1.5 bottom-[-6px] w-px bg-slate-500" style={{ left: at((budget * (threshold as number)) / 100) }}>
                    <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[0.68rem] font-medium text-slate-500">
                      {label} {threshold}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-smebank-500" aria-hidden /> Spend to date</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full border-2 border-dashed border-slate-300" aria-hidden /> Forecast to month end</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm lg:grid-cols-1">
              <div><dt className="text-xs text-slate-500">Forecast (month end)</dt><dd className={`mt-0.5 font-semibold tabular-nums ${forecast > budget && budget > 0 ? "text-red-700" : "text-slate-900"}`}>{money(s.currency, forecast)}</dd></div>
              <div><dt className="text-xs text-slate-500">Today</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{money(s.currency, data.today_spend)}</dd></div>
              <div><dt className="text-xs text-slate-500">Remaining</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{money(s.currency, Math.max(0, budget - spend))}</dd></div>
              <div><dt className="text-xs text-slate-500">Limit multiplier</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">×{Number(s.limit_multiplier).toFixed(2)}</dd></div>
            </dl>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.06} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Requests this month" value={formatCompact(data.month.requests)} hint={`${data.inflight} in flight now`} />
        <StatTile label="Tokens this month" value={formatTokens(totalTokens)} hint={`${formatTokens(data.month.input_tokens)} in · ${formatTokens(data.month.output_tokens)} out`} />
        <StatTile label="Team leads" value={data.users.active} hint={`${data.users.suspended} suspended · ${data.users.pending_password} not yet signed in`} />
        <StatTile label="Latency p50 / p95 · 24h" value={data.latency.count ? `${Math.round(data.latency.p50)} ms` : "—"} hint={data.latency.count ? `p95 ${Math.round(data.latency.p95)} ms · ${data.active_keys} active keys` : `${data.active_keys} active keys`} />
      </Reveal>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Reveal delay={0.08}>
          <Panel title="Spend per day" description="Last 30 days">
            <DailyAreaChart data={data.spend_series} valueKey="cost" label="Spend" kind="money" currency={s.currency} />
          </Panel>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel title="Status codes · last 24 hours">
            <HourlyStatusChart data={data.hourly} />
          </Panel>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Reveal delay={0.11}>
          <Panel title="Status codes · 30 days">
            <StatusBreakdown rows={breakdown} />
          </Panel>
        </Reveal>
        <Reveal delay={0.12}>
          <Panel
            title="Top users this month"
            action={<Link href="/ai-studio/axe/users" className="text-sm font-medium text-smebank-700 hover:text-smebank-800">All users</Link>}
            bodyClassName="p-0"
          >
            {top.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No traffic yet this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-medium">User</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Requests</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Tokens / quota</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {top.map((user) => (
                      <tr key={user.id}>
                        <td className="max-w-[16rem] truncate px-5 py-2.5 text-slate-800">{user.email}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatCompact(user.month_requests)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                          {formatTokens(user.month_tokens)} <span className="text-xs text-slate-400">/ {formatTokens(user.tpm)}</span>
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-medium text-slate-900">{money(s.currency, user.month_cost)}</td>
                      </tr>
                    ))}
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
