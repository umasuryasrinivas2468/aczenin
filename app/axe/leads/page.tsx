/*
  /axe/leads — individual lead events.

  A Server Component, and the filtering happens in the database query rather
  than in the browser. Even though these rows carry nothing identifying (see the
  header of src/lib/axe/leads.ts — name and email were dropped from scope), the
  filter-on-the-server shape is the one that stays correct if that ever changes.

  The search form is a plain HTML <form method="get">. No client component, no
  useState, no JavaScript at all: submitting navigates with the filters in the
  query string, the server re-renders with them applied, and the URL becomes
  shareable and bookmarkable for free. A client-side filter box would have been
  more code for a worse result.
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
import { hasAxeSession } from "@/lib/axe/guard";
import { getLeadFormNames, getLeads } from "@/lib/axe/leads";

// node:crypto reaches this route through the session verification in the guard.
export const runtime = "nodejs";

// Never cached: a cached lead list would show one query's filters to the next
// visitor and, more importantly, would go stale the moment a lead arrives.
export const dynamic = "force-dynamic";

/*
  Formats a timestamp for display.

  Asia/Kolkata explicitly, not the server's zone. The server runs in whatever
  region Vercel schedules it in, so without a fixed zone the same lead would
  show a different time depending on where the function happened to execute.
*/
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    // Two-digit year: the full year costs width in a table column that is
    // already the widest thing on a phone.
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AxeLeadsPage({
  // searchParams is a Promise in Next 15, so it is awaited below rather than
  // destructured directly — the Next 14 shape would give a Promise object here
  // and every filter would silently read as undefined.
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Same defence-in-depth check as the Overview: the query below must not be
  // reachable without a session, independently of what the layout renders.
  if (!(await hasAxeSession())) {
    return null;
  }

  const params = await searchParams;

  /*
    Normalises a query parameter to a single string.

    Next gives an array when a key appears more than once ("?form=a&form=b"),
    which a hand-edited URL can trivially produce. Passing an array into the
    filter would interpolate "a,b" and break the PostgREST expression.
  */
  const single = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const q = single(params.q);
  const form = single(params.form);
  // Defaults to 1 for a missing or unparseable page, rather than NaN — which
  // would produce a NaN offset and a PostgREST error on a hand-edited URL.
  const page = Number(single(params.page)) || 1;

  // Issued in parallel: the dropdown options and the page of rows are
  // independent queries, so awaiting them in sequence would add one round trip
  // of latency for nothing.
  const [leadPage, formNames] = await Promise.all([
    getLeads({ q, form }, page),
    getLeadFormNames(),
  ]);

  // Built once and reused by both pager links, so the previous and next buttons
  // cannot drift out of sync with each other on which filters they preserve.
  const pageHref = (target: number): string => {
    const next = new URLSearchParams();
    // Only set when present, so the URL stays clean rather than accumulating
    // "?q=&form=" on every page change.
    if (q) next.set("q", q);
    if (form) next.set("form", form);
    next.set("page", String(target));
    return `/axe/leads?${next.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Says what this page does and does not hold, in the page itself. The
          reasoning is recorded in leads.ts, but the person reading the screen is
          the one who needs to know there are no contact details here. */}
      <p className="text-sm text-muted-foreground">
        Which form was submitted, from which page, and when. Contact details are
        not stored here — they continue to arrive in the existing Google Sheet.
      </p>

      {/* --- Filters ---------------------------------------------------------
          method="get" so the filters land in the URL and the server does the
          work. The filter row sits above the table, per the interaction spec. */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 basis-56">
          <label htmlFor="axe-lead-q" className="mb-1.5 block text-sm font-medium">
            Source page
          </label>
          <Input
            id="axe-lead-q"
            name="q"
            // defaultValue, not value: this is an uncontrolled input in a server
            // -rendered form, so React must not try to control it.
            defaultValue={q ?? ""}
            placeholder="/pricing"
          />
        </div>

        <div className="basis-44">
          <label htmlFor="axe-lead-form" className="mb-1.5 block text-sm font-medium">
            Form
          </label>
          {/* A native <select> rather than the shadcn Select: that component is
              a Radix client component, and using it here would turn this whole
              page into a client tree to render a dropdown with three options
              that submits a plain GET. */}
          <select
            id="axe-lead-form"
            name="form"
            defaultValue={form ?? ""}
            // Matched to the Input's classes so the two controls line up; the
            // shadcn input styling is not exported as a variant to reuse.
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {/* Empty value means "no filter", which is what an absent query
                parameter already means — so the two agree without special
                handling in getLeads. */}
            <option value="">All forms</option>
            {formNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="secondary">
          Filter
        </Button>

        {/* Shown only when a filter is active, because a "clear" control with
            nothing to clear is just another thing to read. */}
        {q || form ? (
          <Button type="button" variant="ghost" asChild>
            <a href="/axe/leads">Clear</a>
          </Button>
        ) : null}
      </form>

      {/* --- Rows ------------------------------------------------------------- */}
      <Card>
        <CardContent className="p-0">
          {/* Horizontal scroll confined to the table, so a narrow screen does
              not make the entire dashboard scroll sideways. */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Source page</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadPage.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      {/* Distinguishes "no leads at all" from "no leads matching
                          your filter" — otherwise a too-narrow filter looks
                          identical to a broken collector. */}
                      {q || form
                        ? "No leads match these filters."
                        : "No leads recorded yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  leadPage.rows.map((lead) => (
                    <TableRow key={lead.id}>
                      {/* whitespace-nowrap so the timestamp does not wrap into
                          two lines and double the row height. */}
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatTimestamp(lead.occurred_at)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{lead.form_name}</TableCell>
                      {/* Monospace for paths, which makes a leading slash and a
                          hyphen legible at small sizes. */}
                      <TableCell className="font-mono text-xs">
                        {/* An em dash for a missing path rather than an empty
                            cell, which reads as a rendering failure. */}
                        {lead.source_path ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {/* Truncated to eight characters: the session id exists
                            to join rows, not to be read, and the full UUID would
                            be the widest column on the page. */}
                        {lead.session_id ? lead.session_id.slice(0, 8) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- Pager -------------------------------------------------------------
          Rendered only when there is more than one page of results, so a single
          short list is not framed by controls that do nothing. */}
      {leadPage.page > 1 || leadPage.hasMore ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {leadPage.page}</p>
          <div className="flex gap-2">
            {/* Disabled as a non-link on the first page rather than hidden, so
                the pager does not change shape as it is used. */}
            {leadPage.page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <a href={pageHref(leadPage.page - 1)}>Previous</a>
              </Button>
            ) : null}
            {leadPage.hasMore ? (
              <Button variant="outline" size="sm" asChild>
                <a href={pageHref(leadPage.page + 1)}>Next</a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
