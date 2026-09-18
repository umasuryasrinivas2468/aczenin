/*
  /Finathon/axe/26 — every Finathon registration, newest first.

  A Server Component. The rows are fetched and rendered on the server, so the
  browser receives HTML and never a Supabase key, a query, or a row it is not
  shown. The search box is a plain <form method="get"> with no JavaScript:
  submitting navigates with the filter in the query string, the server
  re-renders, and the URL becomes shareable for free.

  Filtering happens in Node rather than in the query. That is the opposite of
  the rule /axe/leads follows, and the reason is the data volume: this table
  holds one row per team for one event — hundreds, not millions — so the whole
  set is already in memory for the count tiles, and a second round trip to
  filter it would be slower than a .filter() over an array that is already here.
*/

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasFinathonSession } from "@/lib/finathon/gate";
import { listRegistrations, type Registration } from "@/lib/finathon/registrations";

// node:crypto reaches this route through the session verification in the gate.
export const runtime = "nodejs";

// Never cached. A cached list would go stale the moment a team registers, and
// a registrations page that silently stops updating is worse than none.
export const dynamic = "force-dynamic";

/*
  Formats a timestamp for display.

  Asia/Kolkata explicitly, not the server's zone: the function runs in whatever
  region Vercel schedules it in, so without a fixed zone the same registration
  would show a different time depending on where it executed.
*/
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Case-insensitive match across every field a person would search by. */
function matches(row: Registration, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    row.team_lead_name.toLowerCase().includes(needle) ||
    row.roll_number.toLowerCase().includes(needle) ||
    row.email.toLowerCase().includes(needle) ||
    // Separators stripped from the NEEDLE as well as compared against a stored
    // value that already has none. Someone searching "98765 43210", copied from
    // a message, otherwise matches nothing at all.
    row.phone.includes(needle.replace(/[\s\-()]/g, "")) ||
    row.utr.toLowerCase().includes(needle)
  );
}

export default async function FinathonRegistrationsPage({
  // searchParams is a Promise in Next 15. Destructuring it directly would give
  // a Promise object and the filter would silently read as undefined.
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Checked before the query, not after. An early return here means an
  // unauthenticated request never reaches Supabase — so this page cannot be
  // used as an unauthenticated way to generate database load either.
  if (!(await hasFinathonSession())) {
    // Renders nothing; the layout is what shows the password form. This branch
    // exists purely so the fetch below cannot run without a session.
    return null;
  }

  const { q = "" } = await searchParams;

  /*
    The read is caught rather than allowed to throw.

    Without this the page 500s on any storage problem, and a blank error screen
    says nothing about WHICH problem — which is exactly the position the form
    leaves you in, because a public endpoint must stay vague about why a write
    failed. This page is behind the password, so it is the one place the real
    message can safely be shown, and it is the natural place to look when
    registrations are not arriving.

    The message is safe to render: SupabaseWriteError and the select path both
    go through describeFailure, which keeps only the SQLSTATE and the
    schema-generated hint and strips anything that could carry a row value.
  */
  let all: Registration[] = [];
  let readError: string | null = null;
  try {
    all = await listRegistrations();
  } catch (error) {
    readError = error instanceof Error ? error.message : String(error);
  }

  const rows = all.filter((row) => matches(row, q));

  // Counted from the unfiltered set, so the tile still reads as the event total
  // while a search is active rather than silently becoming a result count.
  const total = all.length;

  return (
    <div className="space-y-6">
      {/* --- Storage diagnostic -------------------------------------------
          Shown only when the read failed. This is what turns "registrations
          are not saving" from a guess into a named cause, without exposing
          anything to the public form. */}
      {readError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <p className="font-semibold">Cannot read registrations.</p>
          <p className="mt-1 font-mono text-xs break-all">{readError}</p>
          <p className="mt-2">
            {/* The two causes that actually happen, named. A 404 or PGRST205
                means PostgREST cannot find the table, which is what an
                unapplied migration looks like from here. */}
            {readError.includes("404") || readError.includes("PGRST205")
              ? "That is an unapplied migration: run supabase/migrations/20260918101500_finathon_registration.sql against this project. Writes from the registration form are failing for the same reason."
              : "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment. Writes from the registration form are failing for the same reason."}
          </p>
        </div>
      ) : null}

      {/* --- Totals ------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Teams registered</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {total.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Shown</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {rows.length.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- Search ------------------------------------------------------- */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="q" className="text-sm text-muted-foreground">
            Search name, roll number, email, phone or UTR
          </label>
          <Input id="q" name="q" defaultValue={q} className="mt-1.5" />
        </div>
        <Button type="submit">Search</Button>
        {/* Rendered only while a filter is active, so the row of controls does
            not carry a button that does nothing most of the time. */}
        {q ? (
          <Button type="submit" variant="outline" name="q" value="">
            Clear
          </Button>
        ) : null}
      </form>

      {/* --- The table ---------------------------------------------------- */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registered</TableHead>
                <TableHead>Team lead</TableHead>
                <TableHead>Roll number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>UTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  {/* One spanning cell rather than an empty tbody: an empty
                      table renders as a stray header with no explanation. */}
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {total === 0
                      ? "No registrations yet."
                      : "No registrations match that search."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatTimestamp(row.submitted_at)}
                    </TableCell>
                    <TableCell className="font-medium">{row.team_lead_name}</TableCell>
                    {/* Monospace and uppercase on both identifier columns: these
                        are read character by character against a bank statement,
                        which a proportional face makes needlessly hard. */}
                    <TableCell className="font-mono uppercase">{row.roll_number}</TableCell>
                    {/* Both contacts are links, so reaching a team from the
                        dashboard is one tap rather than a copy-paste — which is
                        what someone running the event on a phone actually
                        needs from this table. */}
                    <TableCell>
                      <a className="underline underline-offset-2" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono">
                      <a className="underline underline-offset-2" href={`tel:${row.phone}`}>
                        {row.phone}
                      </a>
                    </TableCell>
                    <TableCell className="font-mono">{row.utr}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
