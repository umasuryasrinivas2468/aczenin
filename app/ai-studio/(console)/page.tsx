import { ArrowRight, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DailyAreaChart, HourlyStatusChart } from "@/components/ai-studio/charts";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { Banner, formatCompact, formatTokens, Meter, PageHeader, Panel, StatTile } from "@/components/ai-studio/ui";
import { loadUserDashboard } from "@/lib/ai-studio/dashboard";
import { listKeys } from "@/lib/ai-studio/keys";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const session = await getUserSession();
  if (!session || session.stage !== "full") redirect("/ai-studio/login");

  const [data, keys] = await Promise.all([loadUserDashboard(session.user.id, 14), listKeys(session.user.id)]);
  const activeKeys = keys.filter((key) => key.status === "active" && (!key.expires_at || new Date(key.expires_at) > new Date()));
  const requests14 = data.series.reduce((sum, day) => sum + day.requests, 0);
  const errors14 = data.series.reduce((sum, day) => sum + day.errors, 0);
  const errorRate = requests14 > 0 ? (errors14 / requests14) * 100 : 0;
  const name = session.user.display_name?.split(" ")[0];

  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Aczen AI Studio"
          title={name ? `Welcome back, ${name}` : "Welcome to Aczen AI Studio"}
          description="Your keys, traffic and limits at a glance. Figures update in real time; days roll over at midnight IST."
          actions={
            <Link
              href="/ai-studio/keys"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-smebank-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-smebank-700"
            >
              <KeyRound className="h-4 w-4" aria-hidden /> Manage API keys
            </Link>
          }
        />
      </Reveal>

      {activeKeys.length === 0 && (
        <Reveal delay={0.03} className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-smeorange-200 bg-gradient-to-r from-smeorange-50 via-white to-smebank-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Create your first API key</p>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              One key gives your project access to Aczen AI with RAG and guardrails built in. It takes under a minute.
            </p>
            <Link href="/ai-studio/keys" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-smebank-700 hover:text-smebank-800">
              Create a key <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      )}

      {data.limits.throttled && (
        <div className="mb-6">
          <Banner tone="warn" title="Limits temporarily reduced">
            Platform demand is high, so every account is running at reduced limits for now. The meters below show your
            current limits.
          </Banner>
        </div>
      )}

      <Reveal delay={0.05} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Requests today" value={formatCompact(data.today.requests)} hint={`${formatCompact(data.today.denied)} refused by limits`} />
        <StatTile label="Tokens this month" value={formatTokens(data.month.tokens)} hint={`${formatCompact(data.month.requests)} requests`} />
        <StatTile
          label="Error rate · 14 days"
          value={`${errorRate.toFixed(errorRate > 0 && errorRate < 1 ? 2 : 1)}%`}
          tone={errorRate >= 5 ? "bad" : errorRate >= 1 ? "warn" : "default"}
          hint={`${formatCompact(errors14)} of ${formatCompact(requests14)} failed`}
        />
        <StatTile
          label="Latency · p50 / p95"
          value={data.latency.count ? `${Math.round(data.latency.p50)} ms` : "—"}
          hint={data.latency.count ? `p95 ${Math.round(data.latency.p95)} ms` : "No successful requests yet"}
        />
      </Reveal>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Reveal delay={0.08}>
          <Panel title="Requests" description="Admitted requests per day, last 14 days">
            <DailyAreaChart data={data.series} valueKey="requests" label="Requests" />
          </Panel>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel title="Your limits" description={`${data.inflight} request${data.inflight === 1 ? "" : "s"} in flight now`}>
            <div className="space-y-5">
              <Meter label="Requests today" used={data.today.requests} limit={data.limits.rpd} hint="Resets at midnight IST" />
              <Meter label="Tokens today" used={data.today.tokens} limit={data.limits.tpd} format={formatTokens} />
              <Meter label="Tokens this month" used={data.month.tokens} limit={data.limits.tpm} format={formatTokens} />
              <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
                {[
                  ["Per minute", data.limits.rpm],
                  ["Burst", data.limits.burst],
                  ["Concurrent", data.limits.concurrency],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-[0.72rem] font-medium text-slate-500">{label}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>
        </Reveal>
      </div>

      <Reveal delay={0.12} className="mt-6">
        <Panel
          title="Status codes · last 24 hours"
          description="Every request, by response class"
          action={<Link href="/ai-studio/usage" className="text-sm font-medium text-smebank-700 hover:text-smebank-800">View logs</Link>}
        >
          <HourlyStatusChart data={data.hourly} />
        </Panel>
      </Reveal>
    </>
  );
}
