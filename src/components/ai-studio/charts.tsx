"use client";

/*
  Charts for AI Studio, following the dataviz method:
  - one hue (brand blue) for single-series magnitude;
  - the reserved status palette for HTTP status classes, always with a legend
    and text labels, never colour alone;
  - thin marks, 2px gaps between stacked fills, recessive grid, a hover
    tooltip on every chart, and a table view alongside (the logs/breakdowns).
*/

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatTokens, STATUS_CLASSES } from "@/components/ai-studio/ui";

const AXIS = { stroke: "#94a3b8", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = "#eef1f5";
const BLUE = "#2e77ff";

function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; color?: string }>;
}) {
  return (
    <div className="min-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-slate-900">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            {row.color && <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} aria-hidden />}
            {row.label}
          </span>
          <span className="font-medium tabular-nums text-slate-900">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

function formatter(kind: "number" | "tokens" | "money", currency: string): (n: number) => string {
  if (kind === "tokens") return formatTokens;
  if (kind === "money") {
    return (n: number) => {
      try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);
      } catch {
        return n.toFixed(2);
      }
    };
  }
  return (n: number) => n.toLocaleString("en-IN");
}

/* Single-series area over days. */
export function DailyAreaChart({
  data,
  valueKey,
  label,
  kind = "number",
  currency = "INR",
  height = 220,
}: {
  data: object[];
  valueKey: string;
  label: string;
  // A format KIND rather than a function: this is a client component rendered
  // from server components, and functions cannot cross that boundary.
  kind?: "number" | "tokens" | "money";
  currency?: string;
  height?: number;
}) {
  const format = formatter(kind, currency);
  return (
    <div style={{ height }} role="img" aria-label={`${label} per day`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickFormatter={dayLabel} {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} width={52} tickFormatter={(value: number) => format(value)} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={dayLabel(String(payload[0].payload.day))}
                  rows={[{ label, value: format(Number(payload[0].value)), color: BLUE }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke={BLUE}
            strokeWidth={2}
            fill={`url(#fill-${valueKey})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Stacked hourly status classes for the last 24h. */
export function HourlyStatusChart({ data, height = 220 }: { data: object[]; height?: number }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legend">
        {STATUS_CLASSES.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
      <div style={{ height }} role="img" aria-label="Requests per hour by status class, last 24 hours">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="hour" tickFormatter={hourLabel} {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} width={52} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={`${hourLabel(String(payload[0].payload.hour))}:00 IST`}
                    rows={STATUS_CLASSES.map((item) => ({
                      label: item.label,
                      value: Number(payload[0].payload[item.key] ?? 0).toLocaleString("en-IN"),
                      color: item.color,
                    }))}
                  />
                ) : null
              }
            />
            {STATUS_CLASSES.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                stackId="status"
                fill={item.color}
                stroke="#ffffff"
                strokeWidth={index === 0 ? 0 : 2}
                radius={index === STATUS_CLASSES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* Horizontal breakdown of individual status codes, with counts as text. */
export function StatusBreakdown({ rows }: { rows: Array<{ status: number; count: number; label: string; color: string }> }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-slate-400">No requests in this period yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const pct = (row.count / total) * 100;
        return (
          <li key={row.status}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: row.color }} aria-hidden />
                <span className="font-mono text-[0.8rem] font-semibold text-slate-900">{row.status}</span>
                <span className="text-slate-500">{row.label}</span>
              </span>
              <span className="tabular-nums text-slate-600">
                {row.count.toLocaleString("en-IN")} <span className="text-xs text-slate-400">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 0.5)}%`, background: row.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
