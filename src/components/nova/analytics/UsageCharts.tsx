"use client";

/*
  The two charts on /nova-api/usage. Client-only because recharts measures
  the DOM; the page passes plain aggregated numbers, never raw rows.

  FORM CHOICE (dataviz skill): calls per day is a count per discrete day, so
  columns from a zero baseline, stacked because Succeeded + Failed = all calls
  and the total height is itself meaningful. Status codes are a handful of
  categories with a count each, so a plain column chart.

  COLOUR: two roles, validated with the dataviz validator against THIS site's
  surfaces (white, and .dark's #020817):
    light  succeeded #2a78d6 · failed #d03b3b  → all checks pass (CVD ΔE 23.8)
    dark   succeeded #3987e5 · failed #e66767  → all checks pass (CVD ΔE 19.2)
  Blue/red rather than green/red: green/red is the classic colour-blind trap.
  Aczen orange (--primary) is kept for UI accents, not data, so a series is
  never mistaken for a button. Dark is a SELECTED step via Tailwind's `.dark`
  class (darkMode: "class"), not an automatic inversion.
*/

// recharts is already a dependency (used by the admin UsagePanel).
import { Bar, BarChart, CartesianGrid, Cell, Legend, Tooltip, XAxis, YAxis } from "recharts";
// Our own width measurement; see SizedChart for why not ResponsiveContainer.
import { useEffect, useRef, useState, type ReactNode } from "react";

// Reused formatter: same Indian digit grouping as the admin panels, hydration-safe.
import { formatCount } from "@/components/nova/admin/format";

// Scoped CSS variables with a selected dark step; every mark reads these, so
// light/dark swap in one place. Applied on each chart's wrapper.
const SERIES_VARS = "[--nova-ok:#2a78d6] [--nova-fail:#d03b3b] dark:[--nova-ok:#3987e5] dark:[--nova-fail:#e66767]";

// Axis chrome in the site's muted token, so it recedes in both themes and
// text never wears a series colour.
const AXIS_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  // The gridlines already guide the eye; tick marks and axis lines are extra ink.
  tickLine: false,
  axisLine: false,
} as const;

// Axis-title styling shared by both charts.
const AXIS_LABEL = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

// Tooltip on card tokens, so it is legible in dark mode.
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--card-foreground))",
} as const;

// "2026-09-29" → "29 Sept". UTC in and out, so the label is the IST day the
// server bucketed it under, whatever the viewer's zone.
function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

// Long form for the tooltip and the table view, where there is room.
function longDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/*
  Measures its own width and hands it to the chart as a number.
  Why not recharts' ResponsiveContainer: Next 15's App Router renders with its
  bundled React 19, whose elements carry Symbol(react.transitional.element);
  recharts 2.13 checks children with react-is 18, which does not recognise
  them, so ResponsiveContainer never passes a width and the chart renders
  NOTHING (no error). Measuring here sidesteps the version check entirely.
  ponytail: drop this for ResponsiveContainer once recharts/react-is are on 19.
*/
function SizedChart({ height, children }: { height: number; children: (width: number) => ReactNode }) {
  // The wrapper we observe.
  const ref = useRef<HTMLDivElement>(null);
  // 0 until measured, so the server render and first paint draw no chart
  // (and no hydration mismatch), just the reserved height.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    // The ref is set by the time effects run; guard keeps TS and StrictMode honest.
    const node = ref.current;
    if (!node) return;
    // Re-measures on sidebar toggles and window resizes, not only on mount.
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    // Disconnect on unmount so a detached node is not observed forever.
    return () => observer.disconnect();
  }, []);
  return (
    // Fixed height reserves the space up front, so nothing jumps when the chart appears.
    <div ref={ref} style={{ height }} className="w-full">
      {width > 0 && children(width)}
    </div>
  );
}

// Legend text in ink, not the series colour (dataviz rule: identity is the swatch).
function legendText(value: string) {
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

// Stacked Succeeded/Failed columns per IST day, plus an sr-only table.
export function CallsPerDayChart({ daily }: { daily: { date: string; succeeded: number; failed: number }[] }) {
  return (
    <figure>
      {/* aria-hidden: the table below carries the same numbers navigably. */}
      <div className={`w-full ${SERIES_VARS}`} aria-hidden="true">
        <SizedChart height={256}>
          {(width) => (
          // bottom margin leaves room for the x-axis title under the ticks.
          <BarChart width={width} height={256} data={daily} margin={{ top: 8, right: 8, left: 4, bottom: 16 }}>
            {/* Horizontal hairlines only; days are marked by ticks. */}
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDay}
              // Let recharts drop ticks that would collide (7 labels overlap at 390px,
              // 30 at any width), always keeping the first and last day.
              interval="preserveStartEnd"
              minTickGap={12}
              label={{ value: "Day (IST)", position: "insideBottom", offset: -12, ...AXIS_LABEL }}
              {...AXIS_PROPS}
            />
            <YAxis
              // Calls are whole numbers.
              allowDecimals={false}
              width={48}
              tickFormatter={(v: number) => formatCount(v)}
              label={{ value: "Calls", angle: -90, position: "insideLeft", ...AXIS_LABEL }}
              {...AXIS_PROPS}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(value) => longDay(String(value))}
              // Grouped counts; the series name comes from each Bar's `name`.
              formatter={(value, name) => [formatCount(Number(value)), name]}
              // Highlight band makes the hovered day obvious.
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            {/* Legend always present for two series (colour is never the only cue). */}
            <Legend verticalAlign="top" align="right" height={28} iconType="square" formatter={legendText} />
            {/* Base segment, square at the baseline; each segment's 1px card-coloured stroke adds up to the
                2px surface gap between stacked segments. */}
            <Bar
              dataKey="succeeded"
              name="Succeeded"
              stackId="calls"
              fill="var(--nova-ok)"
              stroke="hsl(var(--card))"
              strokeWidth={1}
              maxBarSize={24}
            />
            {/* Top segment carries the 4px rounded data-end. */}
            <Bar
              dataKey="failed"
              name="Failed"
              stackId="calls"
              fill="var(--nova-fail)"
              stroke="hsl(var(--card))"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
          )}
        </SizedChart>
      </div>
      {/* The accessible table view of every plotted value. */}
      <table className="sr-only">
        <caption>Calls per day (IST), succeeded and failed</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Succeeded</th>
            <th scope="col">Failed</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            // Date strings are unique within the range.
            <tr key={d.date}>
              <td>{longDay(d.date)}</td>
              <td>{formatCount(d.succeeded)}</td>
              <td>{formatCount(d.failed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// One column per status code, coloured by success/failure, plus an sr-only table.
export function StatusCodeChart({ byStatus }: { byStatus: { status: number; count: number }[] }) {
  // recharts wants a string category; "200" reads the same either way.
  const data = byStatus.map((s) => ({ code: String(s.status), count: s.count, ok: s.status >= 200 && s.status < 300 }));
  return (
    <figure>
      {/* Same scoped colours as the daily chart, so red means "failed" on both. */}
      <div className={`w-full ${SERIES_VARS}`} aria-hidden="true">
        <SizedChart height={224}>
          {(width) => (
          // Same margins as the daily chart, so the two plots line up.
          <BarChart width={width} height={224} data={data} margin={{ top: 8, right: 8, left: 4, bottom: 16 }}>
            {/* Horizontal hairlines only. */}
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="code"
              // Only a handful of codes exist; label every one.
              interval={0}
              label={{ value: "HTTP status", position: "insideBottom", offset: -12, ...AXIS_LABEL }}
              {...AXIS_PROPS}
            />
            <YAxis
              allowDecimals={false}
              width={48}
              tickFormatter={(v: number) => formatCount(v)}
              label={{ value: "Calls", angle: -90, position: "insideLeft", ...AXIS_LABEL }}
              {...AXIS_PROPS}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(value) => `Status ${value}`}
              formatter={(value) => [formatCount(Number(value)), "Calls"]}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            {/* 4px rounded data-end, square at the baseline, capped at 24px thick. */}
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {data.map((d) => (
                // Per-bar colour: the class (ok/failed) is the identity, the axis names the code.
                <Cell key={d.code} fill={d.ok ? "var(--nova-ok)" : "var(--nova-fail)"} />
              ))}
            </Bar>
          </BarChart>
          )}
        </SizedChart>
      </div>
      {/* Visible key: the colour meaning is not left to guesswork. */}
      <figcaption className={`mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground ${SERIES_VARS}`}>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[var(--nova-ok)]" />
          2xx succeeded
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[var(--nova-fail)]" />
          4xx / 5xx failed
        </span>
      </figcaption>
      {/* Table view of the same counts. */}
      <table className="sr-only">
        <caption>Calls by HTTP status code</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Calls</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            // Codes are unique after aggregation.
            <tr key={d.code}>
              <td>{d.code}</td>
              <td>{formatCount(d.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
