/*
  A ranked horizontal bar list — used for referrers, cities, device split and
  the bot/human split.

  === WHY THIS IS HTML AND CSS RATHER THAN RECHARTS ========================
  Recharts earns its place on the time series, where the work is scales, curve
  interpolation and a synced crosshair. It does not earn it here. A ranked bar
  list is one div per row with a percentage width, and doing it in SVG costs
  three things that matter on this page:

    - Long labels. Half these rows are paths like /gst-compliance-software.
      A recharts category axis has a fixed pixel width and truncates them to
      ellipses; CSS gives the label the full row and wraps or truncates with the
      full value still in the title attribute.
    - Client JavaScript. This component is a Server Component with no bundle
      cost at all. The recharts equivalent would ship the library to render bars
      that never animate and never need a tooltip.
    - The relief rule. The validated palette WARNs on light-mode contrast for
      two of its hues, which obliges a visible label on every mark. Here the
      value sits in the row as real text — selectable, searchable, and read by a
      screen reader without any ARIA scaffolding.
  ==========================================================================
*/

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Breakdown } from "@/lib/axe/queries";

type BreakdownBarsProps = {
  title: string;
  rows: Breakdown[];
  /*
    How colour is being used, which is not a style choice but a data one:

    - "magnitude": every row is the same kind of thing (pages, referrers,
      cities) and only the LENGTH carries meaning, so every bar is one hue.
      Giving each row its own colour would imply a categorical distinction that
      does not exist and would exhaust the palette on a ten-row list.
    - "categorical": the rows are different KINDS (mobile vs desktop, bot vs
      human), so each gets a fixed palette slot, assigned by position and never
      cycled.
  */
  variant?: "magnitude" | "categorical";
  /*
    The TRUE denominator for the share percentages, across every bucket —
    including the ones cut off by the top-N slice this component was handed.

    Passed in rather than derived, because deriving it from `rows` is a real bug
    that reads as a correct number: a referrer showing "38.2%" would mean 38.2%
    of the visible top ten, not of all traffic, and those are materially
    different business facts rendered identically. Omit it only when the rows
    genuinely are the whole population (the device split and the bot split are
    the two cases here).
  */
  total?: number;
  // Shown when there is nothing to plot, so an empty chart explains itself
  // instead of looking broken.
  emptyLabel?: string;
};

// The categorical slots, in fixed order. An array rather than a lookup by label
// so the assignment is positional and stable: filtering a row out never
// repaints the rows that remain.
const CATEGORICAL_SLOTS = [
  "var(--axe-series-1)",
  "var(--axe-series-2)",
  "var(--axe-series-3)",
  "var(--axe-series-4)",
];

export default function BreakdownBars({
  title,
  rows,
  variant = "magnitude",
  total: providedTotal,
  emptyLabel = "No data yet",
}: BreakdownBarsProps) {
  // The bar widths are relative to the LARGEST row, not to the total. Relative
  // to the total, a well-distributed ten-row list would render as ten short
  // stubs and the ranking — the only thing the chart is for — becomes unreadable.
  const max = rows.reduce((highest, row) => Math.max(highest, row.value), 0);
  // The percentage denominator, which is a genuinely different quantity from
  // `max` above — conflating the two is a classic bug. Falls back to the sum of
  // the visible rows only when the caller did not supply the real total, which
  // is correct exactly when the rows ARE the whole population.
  const total = providedTotal ?? rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card className="axe-viz">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          // A definition list: each row is genuinely a term (the label) and its
          // value, which is what a screen reader should hear rather than a pile
          // of unrelated divs.
          <dl className="space-y-2.5">
            {rows.map((row, index) => {
              // Guarded against a zero max, which only happens when every row is
              // zero — division there yields NaN and an invalid CSS width.
              const widthPct = max === 0 ? 0 : (row.value / max) * 100;
              const sharePct = total === 0 ? 0 : (row.value / total) * 100;
              // Modulo so a categorical list longer than the palette reuses
              // slots rather than producing `undefined` and an invisible bar.
              // In practice neither categorical list here exceeds four rows.
              const fill =
                variant === "categorical"
                  ? CATEGORICAL_SLOTS[index % CATEGORICAL_SLOTS.length]
                  : "var(--axe-magnitude)";

              return (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    {/* title carries the untruncated value, so a long path is
                        still recoverable on hover after CSS has ellipsed it. */}
                    <dt className="truncate font-medium" title={row.label}>
                      {row.label}
                    </dt>
                    {/* The direct label the relief rule requires. tabular-nums
                        keeps the column of numbers aligned down the list. */}
                    <dd className="shrink-0 tabular-nums text-muted-foreground">
                      {row.value.toLocaleString("en-IN")}
                      {/* Share of total alongside the count: 400 views means
                          nothing without knowing whether that is most of the
                          traffic or a rounding error. */}
                      <span className="ml-2 text-xs">{sharePct.toFixed(1)}%</span>
                    </dd>
                  </div>
                  {/* The track. A muted background makes the bar's length
                      readable against something, rather than floating in space. */}
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full rounded-sm"
                      // Inline because the width is data, not design — it cannot
                      // be expressed as a Tailwind class without generating one
                      // class per possible percentage.
                      style={{ width: `${widthPct}%`, background: fill }}
                    />
                  </div>
                </div>
              );
            })}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
