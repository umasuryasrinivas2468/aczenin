"use client";

import { useEffect, useState } from "react";

/*
  Finathon countdown.

  Isolated into its own component for one reason that matters: it re-renders
  once per second. Keeping it separate means the ~800 lines of static markup
  in the page never re-run on a tick. (Separating stateful from presentational
  components — the same reason the sticky bar is its own file.)

  It walks three phases on its own, so nobody has to redeploy on the 27th:
    "registration" -> counting down to the registration deadline
    "event"        -> counting down to the 9.45 am kick-off
    "live"         -> the hackathon is running
    "done"         -> it is over
*/

// All event instants are written with the +05:30 offset rather than as bare
// local dates. Without it a visitor in another timezone sees a clock that is
// hours wrong, and a build machine running in UTC bakes in the wrong target.
const REGISTRATION_CLOSES = new Date("2026-09-27T23:59:59+05:30");
const EVENT_STARTS = new Date("2026-09-30T09:45:00+05:30");
const EVENT_ENDS = new Date("2026-10-01T14:30:00+05:30");

type Phase = "registration" | "event" | "live" | "done";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function splitDuration(milliseconds: number): Remaining {
  // Clamp at zero so a tick that lands microseconds past the target renders
  // 00:00:00 rather than briefly flashing negative numbers.
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function resolvePhase(now: number): { phase: Phase; target: Date; label: string } {
  if (now < REGISTRATION_CLOSES.getTime()) {
    // The deadline is the urgent number, not the event date — "registration
    // closes in 3 days" converts far harder than "event starts in 13 days".
    return { phase: "registration", target: REGISTRATION_CLOSES, label: "Registration closes in" };
  }
  if (now < EVENT_STARTS.getTime()) {
    return { phase: "event", target: EVENT_STARTS, label: "Hacking begins in" };
  }
  if (now < EVENT_ENDS.getTime()) {
    return { phase: "live", target: EVENT_ENDS, label: "Time remaining" };
  }
  return { phase: "done", target: EVENT_ENDS, label: "Finathon 2026" };
}

/*
  tone picks the surface the clock is sitting on. An explicit prop rather than
  CSS-variable overrides on the parent, because --ink doubles as the dark card's
  own background: redefining it inside the card would repaint the card itself.
*/
export default function Countdown({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const ruleColor = dark ? "var(--ink-on-dark)" : "var(--rule-strong)";
  const labelColor = dark ? "var(--ink-on-dark)" : "var(--ink-faint)";
  const digitColor = dark ? "var(--paper)" : "var(--ink)";
  // Sizes live in finathon.css as clamp() curves rather than breakpoint steps,
  // because the card's width changes continuously and a stepped size does not.
  const digitSize = dark ? "fin-clock-dark" : "fin-clock";
  const groupGap = dark ? "gap-x-3 gap-y-2 sm:gap-x-4" : "gap-x-3 gap-y-2 sm:gap-x-8";

  // Starts null and fills on mount. The server and the browser are never on
  // the same second, so rendering a live clock during SSR guarantees a
  // hydration mismatch — deferring the first value to the client avoids it.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  /*
    Before the effect runs there is no trustworthy clock, so nothing
    phase-dependent is rendered.

    The previous fallback was REGISTRATION_CLOSES.getTime() itself. resolvePhase
    compares with strict `<`, so a value sitting exactly on the boundary failed
    the first test and fell through to the next phase — meaning the server HTML
    and the first client paint always claimed "Hacking begins in" with a
    ~2 day 8 hour figure, whatever the real date was. Wrong content, baked into
    the static HTML that crawlers and no-JS visitors see.

    A skeleton avoids it without risking a hydration mismatch: the server and
    the first client render produce identical markup, because neither consults a
    clock at all.
  */
  if (now === null) {
    return (
      <div className="border-t-2 pt-4" style={{ borderColor: ruleColor }}>
        <p className="fin-meta" style={{ color: labelColor }}>
          Registration closes
        </p>
        {/* Same structure and sizing as the live clock, so hydration swaps the
            digits in without shifting anything around them. */}
        <div className={`fin-clock-row mt-3 min-w-0 ${groupGap}`} aria-hidden="true">
          {["days", "hrs", "min", "sec"].map((unit) => (
            <div key={unit} className="flex items-baseline gap-1.5">
              <span
                className={`${digitSize} font-semibold leading-none`}
                style={{ letterSpacing: "-0.045em", color: digitColor, opacity: 0.35 }}
              >
                00
              </span>
              <span
                className="fin-meta text-[0.625rem] sm:text-xs"
                style={{ letterSpacing: "0.1em", color: labelColor }}
              >
                {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const resolved = resolvePhase(now);
  const remaining = splitDuration(resolved.target.getTime() - now);

  if (resolved.phase === "done") {
    return (
      <div className="border-t-2 pt-4" style={{ borderColor: ruleColor }}>
        <p className="fin-meta" style={{ color: labelColor }}>Finathon 2026</p>
        <p className="fin-serif fin-h3 mt-2" style={{ color: digitColor }}>
          That is a wrap. Thank you for building with us.
        </p>
      </div>
    );
  }

  const units: Array<[string, number]> = [
    ["days", remaining.days],
    ["hrs", remaining.hours],
    ["min", remaining.minutes],
    ["sec", remaining.seconds],
  ];

  return (
    /*
      Laid out as the closing balance of a statement: a heavy rule, a label on
      the left, figures right-aligned underneath. That framing is why this does
      not read as the default "big gradient number" hero treatment.
    */
    <div className="border-t-2 pt-4" style={{ borderColor: ruleColor }}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="fin-meta" style={{ color: labelColor }}>{resolved.label}</p>
        {/* Screen readers get a stable sentence instead of four numbers that
            change every second and would otherwise be announced constantly. */}
        <p className="sr-only" aria-live="off">
          {remaining.days} days, {remaining.hours} hours and {remaining.minutes} minutes remaining.
        </p>
        {resolved.phase === "live" ? (
          <span className="fin-meta" style={{ color: dark ? "var(--accent-on-dark)" : "var(--accent-ink)" }}>
            Live now
          </span>
        ) : null}
      </div>

      {/* min-w-0 plus a smaller phone size: four digit groups at the desktop
          size are wider than a 375px viewport, and a grid item's default
          min-width:auto means it refuses to shrink — so the overflow is pushed
          out to the whole page rather than contained here. */}
      <div className={`fin-clock-row mt-3 min-w-0 ${groupGap}`} aria-hidden="true">
        {units.map(([unit, value]) => (
          <div key={unit} className="flex items-baseline gap-1.5">
            <span
              // Fixed tracking plus the page-wide tabular figures keeps the
              // digits from shifting horizontally on every tick.
              className={`${digitSize} font-semibold leading-none`}
              style={{ letterSpacing: "-0.045em", color: digitColor }}
            >
              {/* Padded so the clock never changes width going 10 -> 9. */}
              {String(value).padStart(2, "0")}
            </span>
            <span
              className="fin-meta text-[0.625rem] sm:text-xs"
              style={{ letterSpacing: "0.1em", color: labelColor }}
            >
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
