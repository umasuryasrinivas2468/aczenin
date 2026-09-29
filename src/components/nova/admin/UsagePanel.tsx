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

// recharts is already a dependency (package.json), used by /axe's TrafficChart.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

// One stat tile. Tiny and used four times, so it lives here rather than in its own file.
function Tile({ label, value }: { label: string; value: number }) {
  return (
    // <div> with the label first in DOM order, so a screen reader says
    // "Requests today, 1,204" rather than a bare number.
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{formatCount(value)}</p>
    </div>
  );
}

export default function UsagePanel({ daily, totals }: Pick<AdminData, "daily" | "totals">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage</CardTitle>
        <CardDescription>All keys combined. Days are India Standard Time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Two per row on phones, four from sm up; never wider than 320px allows. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Requests today" value={totals.today} />
          <Tile label="Requests, 7 days" value={totals.last7d} />
          <Tile label="Active keys" value={totals.activeKeys} />
          <Tile label="Allowlisted users" value={totals.allowlisted} />
        </div>

        <figure className="space-y-2">
          {/* The chart's title, which is also its only series name. */}
          <figcaption className="text-sm font-medium">Requests per day, last 7 days</figcaption>
          {/* The series colour as a scoped CSS variable with a selected dark
              step; the chart reads var(--nova-series) below. aria-hidden
              because the sr-only table underneath carries the same numbers
              in a form a screen reader can navigate. */}
          <div className="h-56 w-full [--nova-series:#2a78d6] dark:[--nova-series:#3987e5]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              {/* left margin trimmed: the y-axis label already reserves room. */}
              <BarChart data={daily} margin={{ top: 8, right: 8, left: 4, bottom: 16 }}>
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
            </ResponsiveContainer>
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
  );
}
