import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Countdown from "@/components/finathon/Countdown";
import Timeline, { type ScheduleDay } from "@/components/finathon/Timeline";

/*
  Finathon 2026 — aczen.in/Finathon

  Design concept: a statement of account. Aczen's product is invoicing, GST and
  accounting, so the page is built from the vernacular of a financial statement
  — a labelled gutter, hairline rules, right-aligned tabular figures, greenbar
  bands, and a closing balance. The 36 hours are ledger entries; the hiring
  offer is a credit column; the prize amounts you have not set yet are drawn as
  blank ruled lines, the way an unissued cheque is blank.

  Every value still to be confirmed is marked TODO(finathon). Run
  `grep -rn "TODO(finathon)" app src` for the full list, or read
  docs/finathon-blanks.md.
*/

/* ---------------------------------------------------------------------------
   The registration seam.

   One constant feeds all six CTAs. While it is empty every CTA renders as a
   designed "opening soon" state instead of a dead link; the moment the
   Devnovate URL lands here, the whole page goes live. Nothing else changes.
   ------------------------------------------------------------------------ */
// Live. Filling this single constant flipped every call to action on the page
// from the "opening shortly" state to a working link — the whole point of
// routing them all through one name instead of repeating the URL per button.
const REGISTRATION_URL = "https://devnovate.co/event/Finathon-by-Aczen";

const REGISTRATION_OPEN = REGISTRATION_URL.length > 0;

/* --------------------------------------------------------------------------
   Event facts
   ------------------------------------------------------------------------ */

const EVENT = {
  name: "Finathon 2026",
  host: "Aczen",
  venue: "MLR Institute of Technology",
  // TODO(finathon): confirm the exact campus address line before launch.
  venueAddress: "Laxman Reddy Avenue, Dundigal, Hyderabad, Telangana 500043",
  venueMapUrl: "https://www.google.com/maps/search/?api=1&query=MLR+Institute+of+Technology+Dundigal+Hyderabad",
  startsLabel: "Wed 30 Sep, 08:00",
  endsLabel: "Thu 1 Oct, 20:00",
  deadlineLabel: "Sun 27 Sep",
  // Spelled out for the panel, where the countdown gives the duration and this
  // gives the thing people actually diarise.
  deadlineFull: "Sunday 27 September, 11.59 pm IST",
  duration: "36 hours",
  teamSize: "3 to 4 members",
  // TODO(finathon): set the registration fee, then delete the blank-line fallback below.
  fee: "",
};

/*
  Tracks. Held as an array and rendered as full-width ledger rows rather than a
  fixed set of cards, which is why adding the security track was one object and
  not a layout rewrite. A fifth would cost the same.
*/
const DOMAINS = [
  {
    name: "Fintech",
    lead: true,
    summary:
      "Payments, lending, invoicing, GST and compliance, credit, reconciliation. The problems Aczen works on every day, and the track we care most about.",
    examples: ["Payments", "Lending", "GST & compliance", "Invoicing", "Credit"],
  },
  {
    name: "AI & Machine Learning",
    lead: false,
    summary:
      "Models that do something a business can actually use — document extraction, forecasting, agents that finish a task, anomaly detection on real transaction data.",
    examples: ["Agents", "Document AI", "Forecasting", "Anomaly detection"],
  },
  {
    name: "Business Systems",
    lead: false,
    summary:
      "The software a company runs on internally. Customer systems, people systems, and the unglamorous internal tools that decide whether a team ships.",
    examples: ["CRM", "HRM", "Internal tools", "Workflow automation"],
  },
  {
    name: "Cybersecurity",
    lead: false,
    summary:
      "Money makes a system a target. Fraud detection, KYC and identity, securing payment flows, threat modelling, and finding what breaks before somebody else does.",
    examples: ["Fraud detection", "KYC & identity", "Payment security", "Threat modelling"],
  },
];

/* The roles Aczen is hiring into. Deliberately no headcount and no numbers —
   the offer is described, never quantified. */
const ROLES = ["Full Stack Developer", "AI / ML Engineer", "Cybersecurity Engineer"];

/* The hiring pipeline. This genuinely is a sequence, so it is the one place
   besides the schedule where ordered markers are honest. */
const PIPELINE = [
  { step: "Build", detail: "Ship something real in 36 hours. We watch how you work, not just what you demo." },
  { step: "Offer", detail: "Standout builders are offered an internship at Aczen with a stipend." },
  { step: "Six months", detail: "You work on production fintech with the team that ships it." },
  { step: "PPO", detail: "A pre-placement offer, decided on performance over those six months." },
];

/* What everyone gets, win or lose. This is the section that matters most for
   registrations: almost nobody believes they will place top three. */
const PARTICIPANT_BENEFITS = [
  {
    title: "A route to an interview without winning",
    detail: "Top performers across every track are fast-tracked straight into the Aczen interview process.",
  },
  {
    title: "Mentorship from the Aczen tech team",
    detail: "Engineers who ship the product circulate through the floor for the full 36 hours.",
  },
  {
    title: "Credits on AI build tools",
    detail: "Participants receive credits on AI development tools to keep building after the event.",
    // TODO(finathon): confirm which tools and credit amounts before launch (Lovable, others).
  },
  {
    title: "Certificate of participation",
    detail: "Issued to every participant who submits a project.",
  },
  {
    title: "Aczen goodies and swag",
    detail: "Details to be announced closer to the event.",
    // TODO(finathon): confirm the swag list, then replace the placeholder line above.
  },
];

const SCHEDULE: ScheduleDay[] = [
  {
    label: "Day one",
    date: "Wed 30 September",
    entries: [
      { time: "07:00", title: "Check-in opens", note: "Bring your college ID and your own laptop." },
      { time: "08:00", title: "Opening ceremony", note: "Problem statements and judging criteria are revealed here.", major: true },
      { time: "09:00", title: "Hacking begins", note: "Hour zero of thirty-six.", major: true },
      { time: "12:30", title: "Mentor round one", note: "Aczen engineers on the floor." },
      { time: "13:30", title: "Lunch" },
      { time: "17:00", title: "Checkpoint one", note: "Show what you have. No slides." },
      { time: "20:00", title: "Dinner" },
      { time: "23:00", title: "Mentor round two", note: "For teams that are stuck." },
    ],
  },
  {
    label: "Day two",
    date: "Thu 1 October",
    entries: [
      { time: "01:00", title: "Midnight refuel" },
      { time: "08:00", title: "Breakfast", note: "Hour twenty-three." },
      { time: "11:00", title: "Checkpoint two", note: "Demo readiness review." },
      { time: "14:00", title: "Code freeze and submission", note: "Repositories lock. Nothing after this counts.", major: true },
      { time: "15:00", title: "Lunch" },
      { time: "15:30", title: "Round one judging", note: "Every team demos." },
      { time: "18:00", title: "Finalists pitch the Aczen panel" },
      { time: "19:30", title: "Results and hiring shortlist", note: "Winners announced, shortlisted builders notified.", major: true },
      { time: "20:00", title: "Close" },
    ],
  },
];

const FAQ = [
  {
    q: "Who can participate?",
    a: "Third and fourth year students from any college in Telangana. Bring a team of three or four.",
  },
  {
    q: "Do I need a team before I register?",
    a: "Yes — register as a team of three or four. If you are short of members, join the WhatsApp community and find them there before registration closes.",
  },
  {
    q: "What does it cost?",
    // TODO(finathon): replace this answer once the registration fee is decided.
    a: "The registration fee is being finalised and will be published here before registration opens.",
  },
  {
    q: "How will projects be judged?",
    a: "The judging criteria are revealed at the opening ceremony on 30 September, so every team starts from the same line.",
  },
  {
    q: "Can I bring code I have already written?",
    a: "You can use open source libraries and public APIs freely. The project itself must be built during the 36 hours.",
  },
  {
    q: "Is it fully offline?",
    a: "Yes. All 36 hours are on campus at MLR Institute of Technology. There is no remote track.",
  },
  {
    q: "Do I have to build on Aczen's product?",
    a: "No. Build anything that fits your track. Aczen APIs are available if you want them, and ignoring them costs you nothing.",
  },
  {
    q: "Are travel and accommodation covered?",
    // TODO(finathon): confirm the travel and accommodation policy for outstation teams.
    a: "Arrangements for outstation teams will be confirmed here before registration closes.",
  },
];

/* --------------------------------------------------------------------------
   Small presentational helpers, local to this page
   ------------------------------------------------------------------------ */

/* The ledger row: a label in the gutter, content in the measure. Used for every
   section so the page reads as one continuous ruled document. */
function Row({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    // label is no longer drawn — it names the section for assistive tech only.
    // scroll-mt clears the site's fixed navbar when a link jumps to this row,
    // otherwise the heading lands underneath it.
    <section id={id} aria-label={label} className="fin-row scroll-mt-24">
      {children}
    </section>
  );
}

/* A value that has not been decided yet, drawn as the blank line on an unissued
   cheque. Turning the gap into a deliberate mark is what stops the page looking
   unfinished while the numbers are still open. */
function BlankLine({ width = "7rem" }: { width?: string }) {
  return (
    <span
      aria-label="to be announced"
      className="inline-block translate-y-[-0.15em] border-b"
      style={{ width, borderColor: "var(--ink-faint)" }}
    />
  );
}

/* The primary call to action, in both of its states. Written once so the six
   places it appears can never drift apart. */
function RegisterCta({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  // On ink the default button would be invisible, so the dark variant inverts
  // to the teal accent — the one place on the page it is used as a fill.
  const darkStyle =
    tone === "dark"
      ? { background: "var(--accent-fill)", borderColor: "var(--accent-fill)", color: "#ffffff" }
      : undefined;

  if (!REGISTRATION_OPEN) {
    return (
      <span
        className={`fin-cta ${className}`}
        aria-disabled="true"
        style={tone === "dark" ? { color: "var(--ink-on-dark)", borderColor: "var(--ink-on-dark)" } : undefined}
      >
        Registration opens shortly
      </span>
    );
  }
  return (
    <a
      className={`fin-cta ${className}`}
      style={darkStyle}
      href={REGISTRATION_URL}
      target="_blank"
      rel="noreferrer noopener"
    >
      Register on Devnovate
    </a>
  );
}

/* --------------------------------------------------------------------------
   Page
   ------------------------------------------------------------------------ */

export default function Finathon() {
  return (
    <div className="fin min-h-screen">
      <Navbar />

      <main>
        {/* ---------------------------------------------------------------
            Hero. The statement header: who issued it, what it covers, and
            the closing balance — here, the time left to register.
            --------------------------------------------------------------- */}
        {/* Navbar is position:fixed at roughly 64px tall, so the hero has to
            reserve that space itself or its first line sits underneath it. */}
        <header className="fin-shell pt-24 sm:pt-28">
          {/* The issuer line of a statement. Two facts, opposite ends, one
              rule under them — not a decorative eyebrow. */}
          <div
            className="flex items-baseline justify-between gap-4 border-b pb-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <span className="fin-meta">{EVENT.host}</span>
            <span className="fin-meta">Hyderabad, India</span>
          </div>

          {/* Wordmark and year on one baseline. The flex row is what lets the
              year sit beside the mark instead of stacking under it and adding
              another line of vertical space to the hero. */}
          {/* One grid, aligned to the top, so the countdown sits level with the
              wordmark and the lede and buttons carry on underneath it. Aligning
              to the end instead would drop the clock to the bottom of the
              column and leave the space beside the wordmark empty again. */}
          <div className="mt-6 grid gap-x-16 gap-y-9 sm:mt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            {/* min-w-0 on every grid child: without it each column is at least
                as wide as its own content, and one wide child silently widens
                the whole page instead of wrapping. */}
            <div className="min-w-0">
              <h1 className="fin-serif fin-display flex flex-wrap items-start gap-x-4">
                <span>Finathon</span>
                <span className="fin-year">2026</span>
              </h1>

              {/* The event is a company's hiring drive, not a student club
                  event, and the lockup is what says so at a glance. */}
              <p className="fin-lockup mt-5">
                <img src="/images/aczenimg.jpeg" alt="" aria-hidden="true" />
                <span>
                  Hosted by <strong className="font-semibold" style={{ color: "var(--ink)" }}>Aczen</strong>
                </span>
              </p>

              <p className="fin-serif fin-lede mt-7">
                A 36-hour build at MLR Institute of Technology, hosted by the team behind Aczen&rsquo;s
                financial OS. Four tracks, one campus, no remote option. The builders who stand out
                leave with an internship, not a certificate.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-8">
                <a className="fin-cta-ghost" href="#schedule">
                  Read the 36-hour schedule
                </a>
              </div>
            </div>

            {/* The deadline panel. Everything time-critical lives in one dark
                block: the date, the clock, and the button. */}
            <div className="fin-card min-w-0 lg:mt-2">
              {/* No heading above the clock: the countdown states its own phase
                  ("Registration closes in"), and a second line saying the same
                  thing was the panel reading its label out twice. */}
              <Countdown tone="dark" />

              {/* A duration is not a date. People plan against "Sunday the 27th",
                  and this is also the line that survives a screenshot. */}
              <p className="mt-4 text-sm font-medium" style={{ color: "var(--paper)" }}>
                {EVENT.deadlineFull}
              </p>

              <div className="mt-6">
                <RegisterCta tone="dark" className="w-full" />
              </div>

              <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--ink-on-dark)" }}>
                Teams of {EVENT.teamSize.replace(" members", "")}. Third and fourth year students,
                any college in Telangana.
              </p>
            </div>
          </div>

          {/* The four facts a visitor checks before anything else, set as ruled
              statement cells rather than a dot-joined meta string. */}
          <dl className="fin-statgrid mt-10">
            {[
              ["Begins", EVENT.startsLabel],
              ["Ends", EVENT.endsLabel],
              ["Venue", EVENT.venue],
              ["Team size", EVENT.teamSize],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="fin-meta">{term}</dt>
                <dd className="mt-1.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Signals continuation without naming the next section: the gutter
              label of that section already reads "Why enter", and having both
              on screen at once said it twice. */}

        </header>

        <div className="fin-shell">
          {/* ---------------------------------------------------------------
              Why this is a hiring hackathon. The strongest thing you have, so
              it sits directly under the hero rather than below the domains.
              --------------------------------------------------------------- */}
          <Row label="Why enter" id="why-enter">
            <h2 className="fin-serif fin-h2">The prize is not the point.</h2>
            <p className="fin-body mt-5">
              Aczen is hiring interns, and 36 hours of watching someone build under pressure tells us
              more than any interview round. Finathon is how we find people. Every track is scouted,
              and you do not have to place in the top three to be noticed.
            </p>

            <p className="fin-meta mt-10">Roles we are hiring into</p>
            <ul className="mt-3 border-t" style={{ borderColor: "var(--rule-strong)" }}>
              {ROLES.map((role) => (
                <li
                  key={role}
                  className="fin-serif border-b py-4 text-xl sm:text-2xl"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {role}
                </li>
              ))}
            </ul>

            {/* The pipeline is a real sequence, so ordered markers here are
                information rather than decoration. */}
            <ol className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--rule)" }}>
              {PIPELINE.map((stage, index) => (
                <li key={stage.step} className="p-5" style={{ background: "var(--paper)" }}>
                  <span className="fin-meta" style={{ color: "var(--accent-ink)" }}>
                    Stage {index + 1}
                  </span>
                  <h3 className="fin-serif mt-2 text-xl">{stage.step}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                    {stage.detail}
                  </p>
                </li>
              ))}
            </ol>
          </Row>

          {/* ---------------------------------------------------------------
              Domains as ledger line items. Not cards — cards would read as a
              pricing table, and would flatten Fintech into one of three equals
              when it is explicitly the lead track.
              --------------------------------------------------------------- */}
          <Row label="Tracks">
            <h2 className="fin-serif fin-h2">Four tracks. Pick one.</h2>

            <div className="mt-10 border-t" style={{ borderColor: "var(--rule-strong)" }}>
              {DOMAINS.map((domain) => (
                <article
                  key={domain.name}
                  className="grid gap-3 border-b py-8 md:grid-cols-[1fr_1.35fr] md:gap-12"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <div>
                    <h3 className="fin-serif fin-h3" style={{ color: domain.lead ? "var(--accent-ink)" : "var(--ink)" }}>
                      {domain.name}
                    </h3>
                    {/* The lead track earns one extra mark. Ranking encoded in
                        the design rather than stated in a sentence. */}
                    {domain.lead ? (
                      <p className="fin-meta mt-2" style={{ color: "var(--accent-ink)" }}>
                        Primary track
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="fin-body">{domain.summary}</p>
                    {/* Separated by space alone. Rules between items were the
                        first attempt, but a divider cannot know where the line
                        wraps, so any wrapped line began with a hanging rule.
                        Uppercase and tracking already read as discrete labels,
                        and this holds at every width. */}
                    <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1.5">
                      {domain.examples.map((example) => (
                        <li key={example} className="fin-meta" style={{ letterSpacing: "0.07em" }}>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </Row>

          {/* ---------------------------------------------------------------
              Rewards. The undecided prize amounts are the design feature here,
              not the problem — an unissued cheque is a blank cheque.
              --------------------------------------------------------------- */}
          <Row label="Rewards">
            <h2 className="fin-serif fin-h2">Prize pool</h2>

            <ol className="mt-8 border-t" style={{ borderColor: "var(--rule-strong)" }}>
              {["First place", "Second place", "Third place"].map((place) => (
                <li
                  key={place}
                  className="flex items-baseline justify-between gap-6 border-b py-5"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span className="fin-serif text-xl sm:text-2xl">{place}</span>
                  {/* TODO(finathon): replace BlankLine with the prize amount, e.g. <span>₹50,000</span>. */}
                  <span className="flex items-baseline gap-2 text-xl sm:text-2xl">
                    <span style={{ color: "var(--ink-faint)" }}>&#8377;</span>
                    <BlankLine width="9rem" />
                  </span>
                </li>
              ))}
            </ol>
            <p className="fin-meta mt-3">Prize amounts announced before registration opens</p>

            <h3 className="fin-serif fin-h3 mt-16">And what everyone else leaves with</h3>
            <p className="fin-body mt-3">
              Three teams place. Everyone who submits a project leaves with the rest of this.
            </p>

            <ul className="mt-8 grid gap-px sm:grid-cols-2" style={{ background: "var(--rule)" }}>
              {PARTICIPANT_BENEFITS.map((benefit) => (
                <li
                  key={benefit.title}
                  // There are an odd number of these, so the final item spans the
                  // full row instead of leaving an empty cell showing the grid's
                  // rule colour as a dead grey box.
                  className="p-6 sm:last:col-span-2"
                  style={{ background: "var(--accent-wash)" }}
                >
                  <h4 className="font-semibold" style={{ color: "var(--ink)" }}>
                    {benefit.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                    {benefit.detail}
                  </p>
                </li>
              ))}
            </ul>
          </Row>

          {/* --------------------------------------------------------------- */}
          <section id="schedule" aria-label="Schedule" className="fin-row scroll-mt-24">
            <h2 className="fin-serif fin-h2">Thirty-six hours, start to finish.</h2>
            <p className="fin-body mt-4">
              Timings are indicative and will be confirmed at the opening ceremony.
            </p>
            <div className="mt-10">
              <Timeline days={SCHEDULE} />
            </div>
          </section>

          {/* --------------------------------------------------------------- */}
          <Row label="Eligibility">
            <h2 className="fin-serif fin-h2">Who can enter</h2>

            <dl className="mt-8 border-t" style={{ borderColor: "var(--rule-strong)" }}>
              {[
                ["Year of study", "Third and fourth year students only"],
                ["Colleges", "Open to every college in Telangana"],
                ["Team size", EVENT.teamSize],
                ["Format", "Fully offline, on campus, for the whole 36 hours"],
                ["Registration closes", EVENT.deadlineLabel],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="grid gap-1 border-b py-4 sm:grid-cols-[14rem_1fr] sm:gap-8"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <dt className="fin-meta pt-1">{term}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              {/* Fee is kept as its own row so the blank reads as pending rather
                  than as free entry — an important distinction to get wrong. */}
              <div
                className="grid gap-1 border-b py-4 sm:grid-cols-[14rem_1fr] sm:gap-8"
                style={{ borderColor: "var(--rule)" }}
              >
                <dt className="fin-meta pt-1">Registration fee</dt>
                <dd className="flex items-baseline gap-2 font-medium">
                  <span style={{ color: "var(--ink-faint)" }}>&#8377;</span>
                  {/* TODO(finathon): set EVENT.fee and this renders the amount instead of a blank. */}
                  {EVENT.fee ? <span>{EVENT.fee}</span> : <BlankLine width="6rem" />}
                </dd>
              </div>
            </dl>
          </Row>

          {/* ---------------------------------------------------------------
              Mentors and judges. Rendered as empty ruled slots on purpose: an
              announced-but-unfilled panel reads as a programme in progress,
              whereas invented placeholder names would be a lie on a live page.
              --------------------------------------------------------------- */}
          <Row label="Panel">
            <h2 className="fin-serif fin-h2">Mentors, judges and speakers</h2>
            <p className="fin-body mt-4">
              The panel is being confirmed. Aczen engineers mentor on the floor for the full 36 hours.
            </p>

            {/* TODO(finathon): replace each slot with { name, role, org, photo }.
                Photos go in public/images/finathon/ and are referenced from here. */}
            <ul className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--rule)" }}>
              {["Judge", "Judge", "Judge", "Mentor", "Mentor", "Speaker"].map((slotRole, index) => (
                <li key={`${slotRole}-${index}`} className="p-6" style={{ background: "var(--paper)" }}>
                  <div
                    className="mb-4 h-14 w-14 border border-dashed"
                    style={{ borderColor: "var(--rule)" }}
                    aria-hidden="true"
                  />
                  <p className="fin-meta">{slotRole}</p>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-faint)" }}>
                    To be announced
                  </p>
                </li>
              ))}
            </ul>
          </Row>

          {/* --------------------------------------------------------------- */}
          <Row label="Partners">
            <h2 className="fin-serif fin-h2">Sponsors and partners</h2>
            <p className="fin-body mt-4">
              Finathon puts your brand in front of several hundred third and fourth year engineering
              students in Hyderabad for 36 continuous hours.
            </p>

            {/* TODO(finathon): drop sponsor logos into public/images/finathon/sponsors/
                and replace these slots with <Image> elements. */}
            <ul className="mt-10 grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: "var(--rule)" }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <li
                  key={index}
                  className="flex h-24 items-center justify-center"
                  style={{ background: "var(--paper)" }}
                >
                  {/* Was --rule, which measured 1.47:1 — invisible to anyone
                      with low vision rather than merely quiet. */}
                  <span className="fin-meta" style={{ color: "var(--ink-faint)" }}>
                    Open
                  </span>
                </li>
              ))}
            </ul>

            <a className="fin-cta-ghost mt-8" href="mailto:finathon@aczen.in?subject=Finathon%202026%20sponsorship">
              Talk to us about sponsoring
            </a>
          </Row>

          {/* --------------------------------------------------------------- */}
          <Row label="Venue">
            <h2 className="fin-serif fin-h2">{EVENT.venue}</h2>
            <p className="fin-body mt-4">{EVENT.venueAddress}</p>
            {/* A link rather than an embedded map: an iframe would add a
                third-party tracker, a cookie-consent question and page weight
                to solve a problem one link already solves. */}
            <a
              className="fin-cta-ghost mt-6"
              href={EVENT.venueMapUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open in Google Maps
            </a>
          </Row>

          {/* --------------------------------------------------------------- */}
          <Row label="Questions">
            <h2 className="fin-serif fin-h2">Before you register</h2>

            <div className="mt-8 border-t" style={{ borderColor: "var(--rule-strong)" }}>
              {FAQ.map((item) => (
                /* Native <details> rather than a JS accordion: it is keyboard
                   accessible and findable by in-page search for free, and it
                   keeps this whole section out of the client bundle. */
                <details key={item.q} className="group border-b" style={{ borderColor: "var(--rule)" }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium marker:content-none">
                    <span className="fin-serif text-lg sm:text-xl">{item.q}</span>
                    <span
                      className="shrink-0 text-xl leading-none transition-transform duration-200 group-open:rotate-45"
                      style={{ color: "var(--ink-faint)" }}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="fin-body pb-6 pr-10">{item.a}</p>
                </details>
              ))}
            </div>
          </Row>

          {/* --------------------------------------------------------------- */}
          <Row label="Contact">
            <h2 className="fin-serif fin-h2">Talk to the organisers</h2>

            <dl className="mt-8 border-t" style={{ borderColor: "var(--rule-strong)" }}>
              <div className="grid gap-1 border-b py-4 sm:grid-cols-[14rem_1fr] sm:gap-8" style={{ borderColor: "var(--rule)" }}>
                <dt className="fin-meta pt-1">Event email</dt>
                {/* TODO(finathon): confirm this mailbox exists and is monitored. */}
                <dd>
                  <a className="underline underline-offset-4" href="mailto:finathon@aczen.in">
                    finathon@aczen.in
                  </a>
                </dd>
              </div>

              {/* TODO(finathon): replace both coordinators with real names and phone numbers. */}
              {["Student coordinator", "Student coordinator"].map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="grid gap-1 border-b py-4 sm:grid-cols-[14rem_1fr] sm:gap-8"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <dt className="fin-meta pt-1">{label}</dt>
                  <dd className="flex items-baseline gap-3" style={{ color: "var(--ink-faint)" }}>
                    <BlankLine width="9rem" />
                    <BlankLine width="7rem" />
                  </dd>
                </div>
              ))}

              <div className="grid gap-1 border-b py-4 sm:grid-cols-[14rem_1fr] sm:gap-8" style={{ borderColor: "var(--rule)" }}>
                <dt className="fin-meta pt-1">Community</dt>
                {/* TODO(finathon): paste the WhatsApp community invite link here. */}
                <dd style={{ color: "var(--ink-faint)" }}>
                  WhatsApp group link to be published with registration
                </dd>
              </div>
            </dl>
          </Row>

          {/* ---------------------------------------------------------------
              Closing balance. The last line of a statement is the total, so the
              page ends on the single number that matters: the deadline.
              --------------------------------------------------------------- */}
          <section
            className="my-16 border-t-2 px-6 py-14 sm:px-10"
            style={{ borderColor: "var(--rule-strong)", background: "var(--ink)" }}
          >
            <p className="fin-meta" style={{ color: "var(--ink-on-dark)" }}>
              Registration closes {EVENT.deadlineLabel}
            </p>
            <h2 className="fin-serif fin-h2 mt-3 max-w-[18ch]" style={{ color: "var(--paper)" }}>
              Thirty-six hours is enough to change what happens after graduation.
            </h2>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              {REGISTRATION_OPEN ? (
                <a
                  className="fin-cta"
                  style={{ background: "var(--accent-fill)", borderColor: "var(--accent-fill)", color: "#fff" }}
                  href={REGISTRATION_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Register on Devnovate
                </a>
              ) : (
                <span className="fin-cta" aria-disabled="true" style={{ color: "var(--ink-on-dark)", borderColor: "var(--ink-on-dark)" }}>
                  Registration opens shortly
                </span>
              )}
              <Link
                className="fin-cta-ghost"
                href="/about"
                style={{ color: "var(--paper)", borderColor: "var(--paper)" }}
              >
                About Aczen
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
