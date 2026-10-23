"use client";

/*
  Usage at a glance: four headline tiles and requests per day for seven days.

  FORM CHOICE: the tiles are single numbers, so they are numbers, not charts.
  The daily series is a count per discrete day, so it is a bar chart — bars
  encode magnitude from a zero baseline, which a line does not promise.
  One series, so no legend: the card title names it.

  COLOUR: one blue, validated with the dataviz palette checker against this
  site's own surfaces — #2a78d6 on white and #3987e5 on the dark background
  (#020817) both pass lightness band, chroma and >= 3:1 contrast. Dark mode is
  a SELECTED step, not an automatic inversion, and it follows the site's
  `.dark` class (tailwind darkMode: "class").

  Client component only because recharts measures the DOM.
*/

// Measures the chart's box, since ResponsiveContainer cannot (see useWidth).
import { useEffect, useRef, useState } from "react";
// recharts is already a dependency (package.json), used by /axe's TrafficChart.
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

// shadcn card for the panel frame.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Types only; data.ts is server-only at runtime.
import type { AdminData } from "../../../../app/nova-api/axe/data";
// Indian digit grouping, hydration-safe.
import { formatCount } from "./format";

// Axis/grid ink uses the site's own tokens so the chart chrome recedes in both
// themes; text never wears the series colour.
const AXIS_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  // Tick marks and axis lines are chrome; the grid already carries the eye.
  tickLine: false,
  axisLine: false,
} as const;

// Tooltip matched to card tokens, so it is legible in dark mode too.
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--card-foreground))",
} as const;

// "2026-09-29" → "29 Sept". Parsed as UTC midnight and formatted in UTC so the
// label is the IST day it was bucketed under, not shifted by the viewer's zone.
function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

// Long form for the tooltip and the screen-reader table, where there is room.
function longDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Chart height in px; one constant so the reserved box and the SVG agree.
const CHART_HEIGHT = 256;

/*
  The element's content width, live. WHY NOT ResponsiveContainer: Next 15 renders
  with its bundled React 19, whose elements recharts 2.13's react-is 18 check does
  not recognise, so ResponsiveContainer never passes a width and draws nothing,
  with no error. Same fix as src/components/nova/analytics/UsageCharts.tsx.
  ponytail: back to ResponsiveContainer once recharts is on react-is 19.
*/
function useWidth<T extends HTMLElement>() {
  // The box being measured.
  const ref = useRef<T>(null);
  // 0 on the server and first paint, so no chart is drawn and nothing mismatches on hydration.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    // Set by the time effects run; the guard satisfies TS and StrictMode double-mounts.
    const node = ref.current;
    if (!node) return;
    // Re-measures on window resize and on the shell's sheet opening, not just on mount.
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    // Stops observing a node that has left the page.
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// One stat tile. Tiny and used four times, so it lives here rather than in its own file.
function Tile({ label, value }: { label: string; value: number }) {
  return (
    // <div> with the label first in DOM order, so a screen reader says
    // "Requests today, 1,204" rather than a bare number.
    // bg-card + shadow-sm: the same surface as the chart card, so the page reads as one set.
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCount(value)}</p>
    </div>
  );
}

export default function UsagePanel({ daily, totals }: Pick<AdminData, "daily" | "totals">) {
  // The chart box's width, handed to BarChart as a number.
  const [chartRef, chartWidth] = useWidth<HTMLDivElement>();
  return (
    // One wrapper so the tiles and the chart card share a single vertical rhythm.
    <div className="space-y-6">
      {/* Two per row until lg, four from lg: at 1366px beside the 256px
          sidebar each tile still has room for a six-digit count. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Requests today" value={totals.today} />
        <Tile label="Requests, 7 days" value={totals.last7d} />
        <Tile label="Active keys" value={totals.activeKeys} />
        <Tile label="Allowlisted users" value={totals.allowlisted} />
      </div>

      <Card>
        {/* The page header already says "Overview"; the card names only its chart. */}
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Requests per day</CardTitle>
          <CardDescription>Last 7 days, all keys.</CardDescription>
        </CardHeader>
        <CardContent>
        <figure>
          {/* The series colour as a scoped CSS variable with a selected dark
              step; the chart reads var(--nova-series) below. aria-hidden
              because the sr-only table underneath carries the same numbers
              in a form a screen reader can navigate. */}
          <div
            ref={chartRef}
            // Fixed height reserves the space up front, so nothing jumps when the chart appears.
            style={{ height: CHART_HEIGHT }}
            className="w-full [--nova-series:#2a78d6] dark:[--nova-series:#3987e5]"
            aria-hidden="true"
          >
            {/* Drawn only once measured; a 0-width chart would render empty SVG. */}
            {chartWidth > 0 ? (
              // left margin trimmed: the y-axis label already reserves room.
              <BarChart width={chartWidth} height={CHART_HEIGHT} data={daily} margin={{ top: 8, right: 8, left: 4, bottom: 16 }}>
                {/* Horizontal rules only; days are already marked by ticks. */}
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  // Every day labelled: seven ticks always fit, even at 320px.
                  interval={0}
                  label={{ value: "Day (IST)", position: "insideBottom", offset: -12, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  {...AXIS_PROPS}
                />
                <YAxis
                  // No fractional requests.
                  allowDecimals={false}
                  width={52}
                  tickFormatter={(v: number) => formatCount(v)}
                  label={{
                    value: "Requests",
                    angle: -90,
                    position: "insideLeft",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  {...AXIS_PROPS}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(value) => longDay(String(value))}
                  // Shows "Requests: 1,204" with grouping, in text ink.
                  formatter={(value) => [formatCount(Number(value)), "Requests"]}
                  // Subtle highlight band so the hovered day is obvious.
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                {/* 4px rounded data-end, square at the baseline; maxBarSize keeps
                    bars thin on a wide screen rather than turning into slabs. */}
                <Bar dataKey="requests" fill="var(--nova-series)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            ) : null}
          </div>
          {/* The accessible table view of the same seven values. */}
          <table className="sr-only">
            <caption>Requests per day, last 7 days (IST)</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Requests</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                // The date string is unique within the seven days.
                <tr key={d.date}>
                  <td>{longDay(d.date)}</td>
                  <td>{formatCount(d.requests)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
        </CardContent>
      </Card>
    </div>
  );
}
