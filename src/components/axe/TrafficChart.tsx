"use client";

/*
  Traffic over the period, with lead submissions aligned beneath it.

  === WHY THIS IS TWO CHARTS AND NOT ONE ===================================
  The design doc asks for leads "overlaid as bars" on the traffic area. Built
  literally, that is a dual-axis chart, and it fails in both available forms:

    - One shared axis: traffic runs in the hundreds and leads in single digits,
      so every lead bar renders as a sub-pixel smear on the baseline. The
      information is technically present and practically invisible.
    - Two y-axes: the relative height of the two series then depends entirely on
      where the axis ranges were set, so the chart can be made to show
      correlation or contradiction at will. It is the single most common way a
      chart misleads its own author.

  The fix that keeps the actual requirement — "judge a traffic spike on whether
  it paid" — is two charts stacked on a SHARED X-AXIS, linked by recharts'
  syncId so one hover crosshairs both. The vertical alignment does the
  comparison the overlay was for, and neither series distorts the other.
  ==========================================================================
*/

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyPoint } from "@/lib/axe/queries";

// Linking the two charts. Hovering either one draws the crosshair on both, so a
// spike and its lead count are read at the same instant rather than by eye.
const SYNC_ID = "axe-traffic";

/*
  Formats an ISO date as a short axis label.

  Trimmed to "17 Sep" because a 30-point axis showing full dates collides into
  unreadable mush at any realistic card width.
*/
function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  // en-IN and UTC explicitly: the series was bucketed by IST day upstream, so
  // re-reading the label in the viewer's local zone could shift it a day.
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

// Shared axis and grid styling, defined once. Two charts with subtly different
// tick sizes read as a rendering bug rather than a design.
const AXIS_PROPS = {
  stroke: "var(--axe-axis)",
  fontSize: 11,
  // No tick marks or axis line: they are chrome, and the grid already gives the
  // eye everything it needs to trace a value back to the axis.
  tickLine: false,
  axisLine: false,
} as const;

// Tooltip chrome, matched to the site's card tokens so the hover layer looks
// native rather than like recharts' default white box.
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--card-foreground))",
} as const;

export default function TrafficChart({ data }: { data: DailyPoint[] }) {
  return (
    // The palette scope. Every var(--axe-*) below resolves against the rules in
    // AxeVizTheme, which is mounted once in the /axe layout.
    <div className="axe-viz space-y-1">
      {/* --- Traffic --------------------------------------------------------
          Two series on ONE axis, which is legitimate here because pageviews and
          unique visitors are the same kind of quantity at the same scale —
          unlike leads, which are not. */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          {/* A gradient fill so the area reads as a soft region rather than a
              solid block that hides the visitors line crossing it. */}
          <defs>
            <linearGradient id="axe-pageviews-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--axe-series-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--axe-series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Horizontal rules only. Vertical grid lines on a time axis add
              density without adding readings — the x positions are already
              marked by the ticks. */}
          <CartesianGrid vertical={false} stroke="var(--axe-grid)" />

          <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS_PROPS} />
          {/* allowDecimals=false: there is no such thing as 2.5 pageviews, and
              recharts will happily invent fractional ticks on a small range. */}
          <YAxis allowDecimals={false} width={48} {...AXIS_PROPS} />

          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            // The full date in the tooltip, where there is room for it — the
            // axis abbreviation is a compromise the hover layer need not repeat.
            labelFormatter={(value) => shortDate(String(value))}
            // A crosshair rather than the default highlight rectangle: it points
            // at one day across BOTH charts, which is the whole purpose of the
            // shared syncId.
            cursor={{ stroke: "var(--axe-axis)", strokeWidth: 1 }}
          />

          <Area
            // "monotone" rather than a natural spline: monotone never overshoots
            // between points, so the curve cannot imply a peak on a day that had
            // no such value.
            type="monotone"
            dataKey="pageviews"
            name="Pageviews"
            stroke="var(--axe-series-1)"
            // 2px per the mark spec — thin enough to stay recessive, thick
            // enough to read at a glance.
            strokeWidth={2}
            fill="url(#axe-pageviews-fill)"
            // No dot on every point: 30 dots is noise. The active dot on hover
            // is what makes an individual day readable.
            dot={false}
            activeDot={{ r: 4 }}
          />

          <Line
            type="monotone"
            dataKey="visitors"
            name="Unique visitors"
            stroke="var(--axe-series-2)"
            strokeWidth={2}
            // Unfilled deliberately: two filled areas would occlude each other
            // and the lower series would be unreadable wherever they overlap.
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* A legend in text, not a swatch box. Two series need identity carried by
          something other than colour, and naming them next to their own colour
          does that in less space than recharts' Legend component. */}
      <div className="flex gap-4 pl-12 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {/* aria-hidden: the swatch is decorative, and the adjacent text is
              what a screen reader should announce. */}
          <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--axe-series-1)" }} />
          Pageviews
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--axe-series-2)" }} />
          Unique visitors
        </span>
      </div>

      {/* --- Leads -----------------------------------------------------------
          Its own chart, its own axis, deliberately short. Aligned under the
          traffic chart so a spike above can be read against the bars below. */}
      <p className="pl-12 pt-2 text-xs font-medium text-muted-foreground">Lead submissions</p>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--axe-grid)" />
          {/* The x-axis is drawn once, on the chart above. Repeating the labels
              here would double the chrome for no extra reading — but the axis
              itself must still exist so both charts share identical spacing and
              the columns line up. */}
          <XAxis dataKey="date" tick={false} height={1} {...AXIS_PROPS} />
          <YAxis allowDecimals={false} width={48} {...AXIS_PROPS} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(value) => shortDate(String(value))}
            cursor={{ fill: "var(--axe-grid)" }}
          />
          <Bar
            dataKey="leads"
            name="Leads"
            fill="var(--axe-series-3)"
            // Rounded top corners only, so the bar stays visually anchored to
            // the baseline it is measured from.
            radius={[4, 4, 0, 0]}
            // Capped so a 30-day view does not render a few leads as absurdly
            // wide slabs that imply more data than exists.
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
