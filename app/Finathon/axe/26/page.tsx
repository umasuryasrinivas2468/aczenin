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

/* Case-insensitive match across the three fields a person would search by. */
function matches(row: Registration, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    row.team_lead_name.toLowerCase().includes(needle) ||
    row.roll_number.toLowerCase().includes(needle) ||
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
  const all = await listRegistrations();
  const rows = all.filter((row) => matches(row, q));

  // Counted from the unfiltered set, so the tile still reads as the event total
  // while a search is active rather than silently becoming a result count.
  const total = all.length;

  return (
    <div className="space-y-6">
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
            Search name, roll number or UTR
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
                <TableHead>UTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  {/* One spanning cell rather than an empty tbody: an empty
                      table renders as a stray header with no explanation. */}
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
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
