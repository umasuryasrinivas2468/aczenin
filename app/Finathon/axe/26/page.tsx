/*
  /Finathon/axe/26 — the Finathon 2026 team review queue.

  A Server Component. Rows are fetched and rendered on the server, so the
  browser receives HTML and never a Supabase key, a query, or a row it is not
  shown. That property is what lets the screenshot links below be signed URLs
  minted with the service-role key: the key does the signing here and the
  browser only ever receives the 60-second result.

  === WHAT CHANGED AND WHY =================================================
  This page used to list one flat `finathon_registration` row per team lead. The
  §4.2 reshape splits that into `finathon_team` + `finathon_participant`, adds a
  payment screenshot and a pending → approved/rejected review workflow. Three
  things about the old page were wrong in ways the new shape makes worse:

    1. The search was a `<form method="get">` over NAME, ROLL NUMBER and UTR.
       Every search wrote a student's name and a real bank UTR into browser
       history, the `Referer` header and Vercel's request log. It is now a POST
       to a Server Action; see searchState.ts for the full argument.
    2. `matches()` called `.toLowerCase()` unguarded. With `strictNullChecks:
       false` in this repo the compiler cannot flag that, and the new schema has
       four nullable columns — so the old code would have thrown on EVERY render
       the first time a legacy row with no screenshot appeared. Every field read
       below goes through `lower()`, which cannot throw.
    3. The empty-state cell hard-coded `colSpan={4}`. Any column added to the
       header would have silently mis-spanned it. The columns are now a single
       array that both the header and the colSpan are derived from, so they
       cannot drift apart again.

  FILTERING HAPPENS IN NODE, not in the query — the opposite of the rule
  /axe/leads follows, and for the same reason the old page gave: this is one row
  per team for one event, hundreds and not millions. The status tiles need
  counts across every status, so the unfiltered set must be in memory anyway;
  filtering in the query would then cost a second round trip to rebuild them.

  IT ALSO SIDESTEPS A KNOWN BUG. Query-side filtering would mean `ilike`, and
  `quoteFilterValue` in src/lib/finathon/registrations.ts escapes `"` and `\`
  but not `*`, which PostgREST reads as a wildcard. A search for `*` would match
  every row. That file belongs to another worker; this page simply never calls
  into it.
  ==========================================================================
*/

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasFinathonSession } from "@/lib/finathon/gate";

import { applySearch, clearSearch, reviewTeam } from "./actions";
import {
  assignTeamCodes,
  listTeams,
  signScreenshotUrls,
  sortRoster,
  toStatusFilter,
  REVIEW_NOTE_MAX_LENGTH,
  STATUS_FILTERS,
  type Participant,
  type ReviewNotice,
  type StatusFilter,
  type Team,
  type TeamStatus,
} from "./data";
import { readSearchQuery } from "./searchState";

// node:crypto reaches this route through the session verification in the gate.
export const runtime = "nodejs";

// Never cached, for two independent reasons. A cached list goes stale the
// moment a team registers or a volunteer approves one — and the signed
// screenshot URLs on it expire after sixty seconds, so a cached page would
// serve dead links for the rest of its cache lifetime.
export const dynamic = "force-dynamic";

/*
  The table's columns, as data.

  === WHY AN ARRAY AND NOT EIGHT <TableHead> TAGS ==========================
  The old page hard-coded `colSpan={4}` in its empty state, and that number had
  to agree with a count of sibling JSX elements written eighty lines away. A
  number that must match something invisible from where it is written is a bug
  waiting for the next column. Deriving both the header cells and the colSpan
  from one array makes the agreement structural instead of remembered.
  ==========================================================================

  `numeric` drives right alignment, so the money and the identifiers line up
  under each other when read down the column against a bank statement.
*/
const COLUMNS: { label: string; numeric?: boolean }[] = [
  { label: "Submitted" },
  { label: "Team" },
  { label: "Roster" },
  { label: "UTR" },
  { label: "Amount", numeric: true },
  { label: "Payment" },
  { label: "Status" },
  { label: "Review" },
];

/*
  The banner text for each notice code the review action can redirect with.

  A lookup table rather than a `notice` string printed directly: the query
  string is attacker-controllable, and printing it would let anyone hand a
  volunteer a link that makes the dashboard say something in its own voice. An
  unrecognised code finds nothing here and renders nothing.
*/
const NOTICE_MESSAGES: Record<ReviewNotice, string> = {
  approved: "Team approved.",
  rejected: "Team rejected.",
  "note-too-long": `That note was longer than ${REVIEW_NOTE_MAX_LENGTH} characters. Nothing was saved.`,
  // Worded as "someone else" rather than "failed", because that is what it
  // almost always is: two volunteers working the same queue.
  stale: "Nothing changed — that team was already reviewed, or the page was out of date.",
  failed: "That review could not be saved. Try again.",
};

/*
  How each status is presented.

  === COLOUR IS NEVER THE ONLY CARRIER OF MEANING ==========================
  Every status gets a WORD and a GLYPH as well as a colour, matching what
  StatTile already does with its ↑ / ↓ / → arrows. Roughly one man in twelve
  cannot reliably separate the red from the green, and this table's whole job is
  to tell approved from rejected. A row of coloured dots would make that
  distinction unreadable for them — and unreadable in a greyscale printout, and
  unreadable in a screenshot pasted into a group chat with a colour filter on.
  ==========================================================================

  The glyph is decorative BECAUSE the word is already there, so it is hidden
  from assistive technology at the call site; a screen reader announcing
  "check mark Approved" is noise.
*/
function statusPresentation(status: TeamStatus): {
  word: string;
  glyph: string;
  className: string;
} {
  switch (status) {
    case "approved":
      return {
        word: "Approved",
        glyph: "✓",
        className:
          "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
      };
    case "rejected":
      return {
        word: "Rejected",
        glyph: "✕",
        // `text-destructive` rather than a raw red, so it tracks the theme the
        // rest of the site already defines for "this went wrong".
        className: "border-destructive/40 bg-destructive/10 text-destructive",
      };
    case "legacy":
      return {
        word: "Legacy",
        // A hollow glyph: legacy rows were imported from the old table (§4.4)
        // and were never reviewed, which is a third thing from pending.
        glyph: "◌",
        className: "border-border bg-muted text-muted-foreground",
      };
    // 'pending' and anything unexpected land here. Defaulting to "needs
    // attention" is the safe direction: a status this page does not know about
    // should be looked at, not quietly rendered as done.
    default:
      return {
        word: "Pending",
        glyph: "◷",
        className: "border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-400",
      };
  }
}

/*
  Formats a timestamp for display.

  Asia/Kolkata explicitly, not the server's zone: this runs in whatever region
  Vercel schedules it in, so without a fixed zone the same registration would
  show a different time depending on where it executed.
*/
function formatTimestamp(iso: string): string {
  // Guarded, unlike the old version. `reviewed_at` is nullable in §4.2 and
  // `new Date(null)` is the epoch, which would print "1 Jan, 05:30" and read as
  // a real review that happened in 1970.
  if (typeof iso !== "string" || iso === "") {
    return "—";
  }
  const date = new Date(iso);
  // An unparseable string yields an Invalid Date, whose toLocaleString is the
  // literal text "Invalid Date" — worse than a dash because it looks like data.
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
  Renders integer paise as rupees.

  Divided here rather than stored as a decimal, because §4.2 deliberately stores
  money as integer paise: this figure is reconciled against a bank statement by
  a human, and 499.00 is not representable in binary floating point. The division
  happens once, at the last possible moment, for display only.
*/
function formatAmount(paise: number): string {
  // A null or missing amount must not render as "₹NaN", which looks like a
  // pricing bug rather than a missing value.
  if (typeof paise !== "number" || !Number.isFinite(paise)) {
    return "—";
  }
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    // The event fee is a whole number of rupees; two trailing zeros on every
    // row is visual noise that makes the column harder to scan.
    maximumFractionDigits: 0,
  });
}

/*
  Lowercases anything, safely.

  === THIS FUNCTION IS THE FIX FOR THE CRASH ===============================
  The old `matches()` called `row.team_lead_name.toLowerCase()` directly. With
  `strictNullChecks: false`, TypeScript types a nullable column as plain
  `string` and raises nothing — so the first null in `screenshot_path`,
  `review_note` or an absent participant field would throw a TypeError inside
  the filter, on EVERY render, for EVERY reviewer, until someone deleted the
  row. One unguarded property access taking down the whole queue is exactly the
  failure that made this rewrite necessary.
  ==========================================================================
*/
function lower(value: unknown): string {
  // typeof, not `value ?? ""`: a number column would satisfy `??` and then
  // throw on `.toLowerCase()` just the same.
  return typeof value === "string" ? value.toLowerCase() : "";
}

/*
  Case-insensitive match across everything a reviewer would search by.

  Searches the participants too, not just the team: at a registration desk the
  question is almost always "is THIS student registered", and the student may be
  any of the five — the old page could only find the lead.
*/
function matchesTeam(team: Team, needle: string): boolean {
  // An empty search matches everything, checked first so the common case costs
  // nothing.
  if (needle === "") {
    return true;
  }
  // Team-level fields first: they are one comparison each and are what a
  // reviewer reconciling a bank statement is most likely to paste in.
  if (lower(team.team_name).includes(needle) || lower(team.utr).includes(needle)) {
    return true;
  }
  // Array.isArray, not a truthiness check: the embedded resource is absent
  // rather than empty if PostgREST fails to resolve the relationship, and
  // `.some` on undefined throws inside the filter that renders the page.
  const roster = Array.isArray(team.finathon_participant) ? team.finathon_participant : [];
  return roster.some(
    (person) =>
      lower(person.full_name).includes(needle) ||
      lower(person.roll_number).includes(needle) ||
      lower(person.email).includes(needle) ||
      lower(person.phone).includes(needle) ||
      lower(person.college).includes(needle),
  );
}

/*
  One headline count.

  Extracted because the four tiles below were otherwise four near-identical
  blocks of markup differing only in a label and a number — the shape where a
  styling fix gets applied to three of them and the fourth quietly drifts. It is
  deliberately NOT src/components/axe/StatTile: that component's whole job is
  the period-over-period arrow, and these counts have no previous period to
  compare against. Reusing it would mean passing `changePct={null}` four times
  to switch off its only feature.
*/
function CountTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  // Optional, so only the tile that needs a caveat carries one and the rest do
  // not get an empty line that throws the row out of alignment.
  hint?: string;
}) {
  return (
    <Card>
      {/* Tighter than the shadcn default, matching StatTile: four of these sit
          in a row and the card default leaves them looking like empty boxes. */}
      <CardContent className="p-5">
        {/* Label above the number, because the number is what the eye should
            land on. */}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {/* tabular-nums stops the digits changing width between renders, which
            otherwise makes the row of tiles jitter on every refresh. */}
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          {/* en-IN grouping — the lakh/crore convention these numbers are read
              in, and what /axe already uses. */}
          {value.toLocaleString("en-IN")}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground/80">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/*
  One person in the roster cell.

  A plain function rather than a component file: it is used once, it has no
  state, and moving it to src/components would put a Finathon-specific row
  shape in the shared component directory where the next reader has to work out
  what it is for.
*/
function RosterLine({ person }: { person: Participant }) {
  return (
    <li className="leading-snug">
      {/* The lead is marked with a WORD, not with bold text alone. Weight is
          invisible at a glance in a dense table and absent entirely from a
          screen reader; "Lead" is neither. */}
      {person.is_lead === true ? (
        <span className="mr-1 rounded bg-foreground/10 px-1 text-[10px] font-semibold uppercase tracking-wide">
          Lead
        </span>
      ) : null}
      {/* `|| "—"` rather than a bare render: a null name would collapse the
          line and leave the roll number looking like the person's name. */}
      <span className="font-medium">{person.full_name || "—"}</span>
      {/* Monospace and uppercase: a roll number is read character by character
          against a college list, which a proportional face makes needlessly
          hard. */}
      <span className="ml-1.5 font-mono text-xs uppercase text-muted-foreground">
        {person.roll_number || "—"}
      </span>
      {/* College on its own line, muted: it is context for disambiguating two
          students with the same name, not something scanned down the column. */}
      <span className="block text-xs text-muted-foreground">
        {person.college || "—"} · {person.phone || "—"}
      </span>
    </li>
  );
}

export default async function FinathonReviewQueuePage({
  // searchParams is a Promise in Next 15. Destructuring it directly yields a
  // Promise object, and every filter would silently read as undefined.
  searchParams,
}: {
  searchParams: Promise<{ status?: string; notice?: string }>;
}) {
  // Checked before the query, not after. An early return here means an
  // unauthenticated request never reaches Supabase — so this page cannot be
  // used as an unauthenticated way to generate database load either. The
  // layout's gate is not enough on its own: it protects by not rendering
  // {children}, which is a property of how React renders rather than a check.
  if ((await hasFinathonSession()) !== true) {
    // Renders nothing; the layout is what shows the password form. This branch
    // exists purely so the fetch below cannot run without a session.
    return null;
  }

  const params = await searchParams;
  // Whitelisted, so an unknown or tampered value falls back to the default view
  // rather than reaching the row comparison as a free-form string.
  const status: StatusFilter = toStatusFilter(params.status);

  /*
    THE STATUS FILTER STAYS IN THE URL AND THE SEARCH TEXT DOES NOT, and the
    difference is the whole point. 'approved' is an enum value from a set of
    five that this repo defines — it identifies nobody, it is safe in history,
    in a `Referer` header and in a request log, and keeping it in the URL makes
    the view shareable and bookmarkable for free. A student's name is none of
    those things. Same page, two kinds of state, two different homes.
  */
  const query = (await readSearchQuery()).toLowerCase();

  // Read from the lookup table, never printed from the URL. An unknown code
  // yields undefined and the banner is simply not rendered.
  const notice =
    typeof params.notice === "string"
      ? NOTICE_MESSAGES[params.notice as ReviewNotice]
      : undefined;

  const all = await listTeams();
  // From the unfiltered set, so a team's code does not change with the tab.
  const teamCodes = assignTeamCodes(all);

  /*
    Counts computed from the UNFILTERED set, so the tiles keep reading as event
    totals while a search or a status tab is active rather than silently
    becoming result counts. Built in one pass rather than four `.filter().length`
    calls over the same array.
  */
  const counts = { pending: 0, approved: 0, rejected: 0, legacy: 0 };
  for (const team of all) {
    // The `in` guard means a status this page does not know about — added to
    // the CHECK constraint later — increments nothing instead of creating a
    // stray `undefined` key that renders as NaN on a tile.
    if (team.status in counts) {
      counts[team.status as keyof typeof counts] += 1;
    }
  }

  // Status first, then text: the status comparison is one string equality and
  // discards most of the set before the more expensive roster scan runs.
  const rows = all.filter(
    (team) => (status === "all" || team.status === status) && matchesTeam(team, query),
  );

  /*
    Signed URLs are minted only for the rows actually being rendered.

    Not an optimisation — a scoping decision. A signed URL is a bearer token:
    anyone holding it can fetch that screenshot without a session for the next
    sixty seconds. Minting one for a team the reviewer has filtered out would
    put a live token for a payment record into a page that was never going to
    show it.
  */
  const screenshotUrls = await signScreenshotUrls(rows.map((team) => team.screenshot_path));

  return (
    <div className="space-y-6">
      {/* --- Notice ------------------------------------------------------- */}
      {/* role="status" so a screen reader announces the outcome of a review
          without the reviewer having to go looking for it. Rendered above the
          controls because after a redirect the page is scrolled to the top. */}
      {notice ? (
        <p
          role="status"
          className="rounded-md border border-border bg-muted px-4 py-3 text-sm"
        >
          {notice}
        </p>
      ) : null}

      {/* --- Totals ------------------------------------------------------- */}
      {/* Four across on desktop, two on a phone. One column at phone width
          would push the queue below two screens of scrolling. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Pending first, because it is the number this page exists to drive
            to zero — the reading order is the priority order. */}
        <CountTile label="Awaiting review" value={counts.pending} />
        <CountTile label="Approved" value={counts.approved} />
        <CountTile label="Rejected" value={counts.rejected} />
        <CountTile
          label="Teams in total"
          value={all.length}
          // Legacy rows are called out rather than folded into the total
          // silently: they were imported from the old form and have no payment
          // to check, so a total that hides them overstates how much money has
          // actually been reconciled against the bank statement.
          hint={`${counts.legacy.toLocaleString("en-IN")} imported from the old form`}
        />
      </div>
      {/* --- Status tabs -------------------------------------------------- */}
      {/* Plain links, not a JavaScript tab widget. The status is already in the
          URL, so a link is the whole feature — and it keeps working with the
          back button, middle-click and a bookmark, none of which a click
          handler gives for free. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <a
            key={option}
            // The notice is deliberately dropped from these links: a banner
            // saying "Team approved." must not follow the reviewer around as
            // they move between tabs.
            href={`/Finathon/axe/26?status=${option}`}
            // aria-current is what tells a screen reader which tab is active.
            // Without it the selected state exists only as a background colour.
            aria-current={status === option ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm capitalize transition-colors",
              status === option
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </a>
        ))}
      </nav>
        {/* A plain download link: the route checks the session itself and
            exports the tab currently selected. */}
        <Button asChild variant="outline" size="sm">
          <a href={`/Finathon/axe/26/export?status=${status}`} download>
            Export CSV
          </a>
        </Button>
      </div>

      {/* --- Search ------------------------------------------------------- */}
      {/*
        A POST to a Server Action, NOT `method="get"`.

        This is the security fix this rewrite was commissioned for. The previous
        form put team-lead names, roll numbers and real bank UTRs into the URL,
        which means browser history, the `Referer` header sent to every
        third-party asset, and Vercel's retained request log. A POST body
        appears in none of those. See searchState.ts for where the value goes
        instead and what that costs.
      */}
      <form action={applySearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          {/* htmlFor/id pairing, so clicking the label focuses the field and a
              screen reader reads the two as one control. */}
          <label htmlFor="q" className="text-sm text-muted-foreground">
            Search team, any participant, roll number, email or UTR
          </label>
          <Input
            id="q"
            name="q"
            // defaultValue and not value: this is an uncontrolled input in a
            // Server Component, and `value` without an onChange would render a
            // field that cannot be typed into.
            defaultValue={query}
            // Mirrors the cap the action re-applies server-side. The browser
            // attribute is a courtesy that keeps the field honest; the server
            // check is what actually bounds the cookie.
            maxLength={120}
            className="mt-1.5"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* A second form, because it posts to a DIFFERENT action. Nesting forms
          is invalid HTML, and a `formAction` attribute would hide which of two
          behaviours a button has inside an attribute nobody reads. Rendered
          only while a search is active, so the controls do not carry a button
          that does nothing most of the time. */}
      {query !== "" ? (
        <form action={clearSearch}>
          <Button type="submit" variant="outline">
            Clear search
          </Button>
        </form>
      ) : null}

      {/* --- The queue ---------------------------------------------------- */}
      <Card>
        <CardContent className="p-0">
          {/* Horizontal scroll rather than a wrapped or hidden column: eight
              columns of payment data do not fit a phone, and truncating the one
              that happens to be last is worse than letting the reviewer swipe. */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Generated from COLUMNS so the header and the empty state's
                      colSpan below cannot disagree. */}
                  {COLUMNS.map((column) => (
                    <TableHead
                      key={column.label}
                      className={cn("whitespace-nowrap", column.numeric && "text-right")}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    {/* One spanning cell rather than an empty tbody: an empty
                        table renders as a stray header with no explanation.
                        colSpan is DERIVED — the old hard-coded 4 would have
                        mis-spanned the moment this page grew a column, which is
                        precisely what just happened to it. */}
                    <TableCell
                      colSpan={COLUMNS.length}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {/* Three distinct messages, because "nothing here" has
                          three different causes and only one of them means
                          something is wrong. */}
                      {all.length === 0
                        ? "No registrations yet."
                        : query !== ""
                          ? "No teams match that search."
                          : `No teams with status "${status}".`}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((team) => {
                    // Computed once per row rather than inline three times, so
                    // the word, the glyph and the colour cannot drift apart.
                    const presentation = statusPresentation(team.status);
                    // Looked up by the ORIGINAL column value, which is the key
                    // signScreenshotUrls promised to return.
                    const screenshotUrl = screenshotUrls.get(team.screenshot_path);
                    // Legacy rows predate the screenshot requirement and have
                    // no payment to verify, so they are excluded from review
                    // here as well as by the PATCH filter in data.ts. Two
                    // layers, because the UI layer is the one a reviewer sees
                    // and the data layer is the one that is actually binding.
                    const reviewable = team.status !== "legacy";
                    return (
                      <TableRow key={team.id} className="align-top">
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatTimestamp(team.submitted_at)}
                        </TableCell>

                        <TableCell className="font-medium">
                          {team.team_name || "—"}
                          <span className="block font-mono text-xs font-normal text-muted-foreground">
                            {teamCodes.get(team.id)}
                          </span>
                          {/* The roster size, stated. §4.2 allows 3 to 5, and a
                              team that somehow has 2 is a data problem the
                              reviewer should see rather than count by hand. */}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {(team.finathon_participant?.length ?? 0).toLocaleString("en-IN")}{" "}
                            members
                          </span>
                        </TableCell>

                        <TableCell className="min-w-[18rem]">
                          {/* An ordered list, because the order is meaningful —
                              lead first, then position — and a <ul> would tell
                              a screen reader otherwise. */}
                          <ol className="space-y-1.5 text-sm">
                            {sortRoster(team.finathon_participant).map((person) => (
                              <RosterLine key={person.id} person={person} />
                            ))}
                          </ol>
                        </TableCell>

                        {/* Monospace: a UTR is read character by character
                            against a bank statement. */}
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {team.utr || "—"}
                        </TableCell>

                        {/* tabular-nums and right-aligned so the rupee figures
                            line up under one another down the column. */}
                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                          {formatAmount(team.amount_paise)}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm">
                          {/* `=== "string"` rather than truthiness, because the
                              Map returns undefined for a row whose signing
                              call failed and that must read differently from a
                              row that never had a screenshot. */}
                          {typeof screenshotUrl === "string" ? (
                            <a
                              href={screenshotUrl}
                              // A new tab: the reviewer loses their place in a
                              // long queue otherwise, and the signed URL is a
                              // different origin so the back button is the only
                              // way home.
                              target="_blank"
                              /*
                                noreferrer AND noopener, both load-bearing.
                                noreferrer stops this dashboard's URL being sent
                                to supabase.co in the `Referer` header; noopener
                                stops the opened page reaching back through
                                window.opener. The URL itself is deliberately on
                                supabase.co rather than proxied through aczen.in
                                — a crafted polyglot file (valid JPEG header,
                                HTML payload) then cannot execute script in this
                                site's origin, where the session cookie lives.
                              */
                              rel="noopener noreferrer"
                              className="underline underline-offset-4"
                            >
                              View
                              {/* Says out loud that the link is short-lived, so
                                  a reviewer who copies it and finds it dead ten
                                  minutes later knows why. */}
                              <span className="block text-[10px] text-muted-foreground">
                                expires in 60s
                              </span>
                            </a>
                          ) : team.screenshot_path ? (
                            // A path exists but no URL came back: Storage is
                            // down or the object is gone. Said plainly, because
                            // "no screenshot" would send the reviewer looking
                            // for a student who did in fact upload one.
                            <span className="text-muted-foreground">Unavailable</span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                              presentation.className,
                            )}
                          >
                            {/* aria-hidden because the word beside it already
                                says everything: "check mark Approved" is noise
                                in a screen reader. The glyph exists for the
                                sighted reader who cannot separate the colours. */}
                            <span aria-hidden="true">{presentation.glyph}</span>
                            {presentation.word}
                          </span>
                          {/* Rendered only once a review has happened, so
                              pending rows do not carry an empty line that
                              throws the row heights out. */}
                          {team.reviewed_at ? (
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                              {formatTimestamp(team.reviewed_at)}
                            </span>
                          ) : null}
                          {team.review_note ? (
                            // Wrapped in a max width: a 500-character note
                            // would otherwise stretch this column across the
                            // screen and squash every other one.
                            <span className="mt-1 block max-w-[14rem] text-[11px] italic text-muted-foreground">
                              “{team.review_note}”
                            </span>
                          ) : null}
                        </TableCell>

                        <TableCell className="min-w-[14rem]">
                          {reviewable ? (
                            // One form per row. The action reads teamId from a
                            // hidden field rather than from a closure, so the
                            // form still works with JavaScript disabled — which
                            // matters on the venue wifi this is used over.
                            <form action={reviewTeam} className="space-y-2">
                              <input type="hidden" name="teamId" value={team.id} />
                              {/* Carried through so the redirect returns the
                                  reviewer to the tab they were on instead of
                                  the default view after every decision. */}
                              <input type="hidden" name="statusFilter" value={status} />
                              <label htmlFor={`note-${team.id}`} className="sr-only">
                                Review note for {team.team_name}
                              </label>
                              <Textarea
                                // Unique per row: a repeated id would make every
                                // label on the page focus the first textarea.
                                id={`note-${team.id}`}
                                name="note"
                                rows={2}
                                // Mirrors the CHECK constraint in §4.2 and the
                                // server-side check in the action. The browser
                                // attribute is a courtesy; the action is what
                                // actually enforces it, because maxLength is
                                // absent from a curl request.
                                maxLength={REVIEW_NOTE_MAX_LENGTH}
                                placeholder="Note (optional)"
                                className="min-h-[3.5rem] text-xs"
                              />
                              <div className="flex gap-2">
                                {/* Two submit buttons sharing one name: the
                                    clicked one's value is what the browser
                                    sends, so the decision arrives as data
                                    rather than as two near-identical forms. */}
                                {/* The button matching the row's CURRENT status is omitted,
                                    not disabled. Re-approving an approved team would
                                    overwrite reviewed_at and lose the time the real
                                    decision was made. */}
                                {team.status !== "approved" ? (
                                  <Button
                                    type="submit"
                                    name="decision"
                                    value="approved"
                                    size="sm"
                                  >
                                    Approve
                                  </Button>
                                ) : null}
                                {/* Same rule mirrored: a rejected team can still be
                                    approved (a reviewer correcting themselves) but not
                                    re-rejected into a fresh timestamp. */}
                                {team.status !== "rejected" ? (
                                  <Button
                                    type="submit"
                                    name="decision"
                                    value="rejected"
                                    size="sm"
                                    variant="outline"
                                  >
                                    Reject
                                  </Button>
                                ) : null}
                              </div>
                            </form>
                          ) : (
                            // Legacy rows get an explanation rather than a
                            // disabled button, because a disabled control
                            // invites the reviewer to work out why.
                            <span className="text-xs text-muted-foreground">
                              Imported from the old form — no payment to review.
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stated below the table rather than as a fifth tile: it is a property of
          the current view, not of the event, and putting it beside the totals
          would invite reading it as one. */}
      <p className="text-xs text-muted-foreground">
        Showing {rows.length.toLocaleString("en-IN")} of{" "}
        {all.length.toLocaleString("en-IN")} teams.
      </p>
    </div>
  );
}
