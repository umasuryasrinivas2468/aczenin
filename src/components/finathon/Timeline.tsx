/*
  The 36-hour schedule, set as a statement of account.

  This is the one place on the page where sequence markers are honest — these
  entries genuinely happen in order — and the timestamps carry that better than
  a decorative 01 / 02 / 03 ever would.

  A server component on purpose: it holds no state, so keeping it off the
  client bundle costs nothing and saves the visitor the download.
*/

export type ScheduleEntry = {
  time: string;
  /* The closing time of a slot that runs for a stretch. Set on its own line
     under the start rather than as "9:45 AM – 10:45 AM" on one: a range that
     wide forces the figure column past a third of a phone screen, and the
     ledger's whole argument is a narrow figure column. */
  until?: string;
  title: string;
  note?: string;
  /* Marks the structural beats — kick-off, the phase that starts the build,
     judging, the winner announcement — which are rendered in ink rather than
     grey so the shape of the event is readable at a glance without reading
     every line. */
  major?: boolean;
};

export type ScheduleDay = {
  label: string;
  date: string;
  entries: ScheduleEntry[];
};

export default function Timeline({ days }: { days: ScheduleDay[] }) {
  return (
    <div className="mt-2">
      {days.map((day) => (
        <section key={day.date} className="mb-10 last:mb-0">
          {/* Day header doubles as the statement's period heading. */}
          <header className="flex items-baseline justify-between gap-4 border-b pb-2" style={{ borderColor: "var(--rule-strong)" }}>
            <h3 className="fin-serif text-xl sm:text-2xl">{day.label}</h3>
            <span className="fin-meta">{day.date}</span>
          </header>

          <ol>
            {day.entries.map((entry, index) => (
              <li
                key={`${day.date}-${entry.time}-${entry.title}`}
                className="grid grid-cols-[5rem_1fr] items-baseline gap-x-4 gap-y-1 border-b px-2 py-3 sm:grid-cols-[7rem_1fr] sm:gap-x-8 sm:px-3"
                style={{
                  borderColor: "var(--rule)",
                  // The greenbar: alternating bands are what make a long ruled
                  // list scannable, and they are the most literal reference to
                  // continuous-feed accounting paper on the page.
                  background: index % 2 === 1 ? "var(--band)" : "transparent",
                }}
              >
                {/* Right-aligned figures, left-aligned text — the alignment
                    convention of every printed ledger. */}
                <time className="block text-right">
                  <span
                    className="block text-sm font-semibold sm:text-base"
                    style={{ color: entry.major ? "var(--accent-ink)" : "var(--ink-faint)" }}
                  >
                    {entry.time}
                  </span>
                  {entry.until ? (
                    <span className="block text-xs sm:text-sm" style={{ color: "var(--ink-faint)" }}>
                      to {entry.until}
                    </span>
                  ) : null}
                </time>

                <div>
                  <p
                    className={entry.major ? "font-semibold" : "font-medium"}
                    style={{ color: entry.major ? "var(--ink)" : "var(--ink-soft)" }}
                  >
                    {entry.title}
                  </p>
                  {entry.note ? (
                    <p className="mt-0.5 text-sm" style={{ color: "var(--ink-faint)" }}>
                      {entry.note}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
