/*
  A single headline metric with its change against the previous period.

  Deliberately NOT a chart. A single number's job is to be read, not compared
  across a shape — plotting one value as a gauge or a one-bar chart adds
  decoration and removes precision.

  No "use client": this renders identically on every request from props alone
  and has no interactivity, so keeping it a Server Component keeps it out of the
  JavaScript bundle entirely.
*/

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  // Pre-formatted by the caller rather than formatted here: a percentage, a
  // count and a duration all want different formatting, and passing a
  // format hint would reimplement Intl badly.
  value: string;
  // null when the previous period had no data to compare against — see the note
  // on Metric.changePct in queries.ts for why that is not the same as zero.
  changePct: number | null;
  // Some metrics are better when they fall. None today, but the flag exists so
  // a future bounce-rate tile cannot be added with a silently inverted colour.
  invertTrend?: boolean;
  /*
    A one-line definition of what the number actually counts.

    Not decoration. Two tiles on this dashboard measure something subtly
    different from what their short label implies, because the daily-rotating
    salt makes a hash comparable only within one day. A reader who assumes
    "unique visitors" means "distinct people over 30 days" will draw wrong
    conclusions from a correct number, and the fix for that is to say so on the
    tile rather than in a comment they will never open.
  */
  hint?: string;
};

export default function StatTile({
  label,
  value,
  changePct,
  invertTrend = false,
  hint,
}: StatTileProps) {
  // Computed once here so the arrow, the sign and the colour cannot disagree
  // with each other — three separate inline ternaries is how they drift.
  const hasComparison = changePct !== null && Number.isFinite(changePct);
  const rising = hasComparison && changePct! > 0;
  const flat = hasComparison && changePct === 0;
  // "Good" is direction-aware rather than "up is green", which would be wrong
  // the first time a metric where down is better appears on this page.
  const good = invertTrend ? !rising : rising;

  return (
    <Card>
      {/* Tighter padding than the shadcn default: four of these sit in a row and
          the card default leaves them looking like empty boxes with a number. */}
      <CardContent className="p-5">
        {/* Label above the number. The number is what the eye should land on, so
            the label is small, muted and out of the way. */}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>

        {/* Rendered only when supplied, so tiles whose label is unambiguous do
            not carry an empty line that throws the row out of alignment. */}
        {hint ? <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground/80">{hint}</p> : null}

        {/* tabular-nums stops the digits shifting width as the value updates,
            which otherwise makes a row of tiles jitter on every refresh. */}
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>

        {hasComparison ? (
          <p
            className={cn(
              "mt-1 text-sm tabular-nums",
              // Flat is muted rather than green or red: no change is not good
              // news or bad news, and colouring it as either is a lie.
              flat && "text-muted-foreground",
              !flat && good && "text-emerald-600 dark:text-emerald-400",
              !flat && !good && "text-destructive",
            )}
          >
            {/* An arrow glyph alongside the colour, so the direction is still
                readable to someone who cannot distinguish red from green.
                Colour is never the only carrier of meaning here. */}
            {flat ? "→" : rising ? "↑" : "↓"}{" "}
            {/* Math.abs because the arrow already carries the sign; "↓ -12%"
                reads as a double negative. */}
            {Math.abs(changePct!).toFixed(1)}%
            <span className="text-muted-foreground"> vs previous period</span>
          </p>
        ) : (
          // An explicit dash rather than an empty space, so the tile's height
          // matches its neighbours and the row does not sit unevenly.
          <p className="mt-1 text-sm text-muted-foreground">— no prior period</p>
        )}
      </CardContent>
    </Card>
  );
}
