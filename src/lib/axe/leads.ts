/*
  Lead record queries for the /axe Leads section.

  === THIS IS DELIBERATELY NOT A PII SURFACE ===============================
  An earlier version of the scope had this section showing each lead's name and
  email. The founder dropped both from scope on 2026-09-17, and that decision is
  worth recording here rather than in a changelog nobody opens, because it is
  the reason this file looks thinner than expected.

  lead_event stores WHICH FORM, FROM WHICH PAGE, WHEN — and nothing that
  identifies a person. That answers most of what the dashboard is for while
  leaving /axe with no personal data in it at all, so there is no PII to leak
  from a log line, an error message, or a page payload. It is a simplification
  that removes a whole category of risk rather than deferring it.

  Do not add name or email columns here. The contact details still reach the
  team through the existing Google Sheets webhook, which is unchanged.
  ==========================================================================

  Kept separate from queries.ts so the Overview and the Leads list cannot drift
  into each other's queries — the Overview is counts only and imports only
  queries.ts.
*/

import { axeSelect } from "@/lib/axe/supabase";

// Every column the Leads section reads. A path, a form name, a timestamp and
// one opaque session identifier — nothing here names a person.
const LEAD_COLUMNS = ["id", "occurred_at", "source_path", "form_name", "session_id"];

export type LeadRecord = {
  id: number;
  occurred_at: string;
  source_path: string | null;
  form_name: string;
  session_id: string | null;
};

export type LeadFilters = {
  // Free-text search over the source path. Applied SERVER-SIDE in the query
  // below rather than by shipping every row to the browser and filtering in a
  // client component — the habit matters even though these rows carry nothing
  // identifying, because it is the version that stays correct if the table ever
  // gains a sensitive column.
  q?: string;
  // Narrows to one form: contact, partner, demo. These are worth very different
  // amounts and mixing them makes the lead count misleading.
  form?: string;
};

export type LeadPage = {
  rows: LeadRecord[];
  // Whether a further page exists. Derived by fetching one row more than the
  // page size rather than by running a separate COUNT, which would be a second
  // round trip to answer a yes/no question.
  hasMore: boolean;
  // Echoed back so the UI can render "showing 1-50" without recomputing it and
  // getting it subtly wrong on the last page.
  page: number;
  pageSize: number;
};

// Fifty rows a page: enough that the founder rarely pages at this lead volume,
// small enough that the server component's payload stays modest.
const PAGE_SIZE = 50;

/*
  Escapes a user-supplied search term for a PostgREST filter.

  The term arrives from a URL query string, so it is untrusted input being
  interpolated into a filter expression. Commas and parentheses are PostgREST's
  own syntax for separating and grouping filters; left unescaped, a search for
  "a,b" would be parsed as two filters rather than one literal string. This is
  the PostgREST analogue of SQL injection — it cannot reach raw SQL through
  PostgREST, but it can still change which rows come back.
*/
function escapeFilterValue(term: string): string {
  return (
    term
      // TRUNCATED FIRST, THEN ESCAPED — the order matters. Escaping first and
      // slicing afterwards can cut an escape sequence in half and leave a
      // dangling trailing backslash in the filter expression, which changes how
      // PostgREST parses everything after it.
      .slice(0, 100)
      // Backslash first among the escapes, or it would escape the escapes added
      // on the following lines.
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      // Wildcards, which are not a syntax break but a semantic one: the caller
      // wraps this in `ilike.*term*`, so an unescaped * or % from the search box
      // silently widens the match to something the user did not ask for.
      .replace(/\*/g, "\\*")
      .replace(/%/g, "\\%")
  );
}

/*
  Fetches one page of lead records, newest first.

  Every argument that narrows the result is applied in the database query, not
  after the fact in JavaScript. That is what makes "the browser never receives a
  lead it is not shown" a property of the code rather than a convention.
*/
export async function getLeads(filters: LeadFilters = {}, page = 1): Promise<LeadPage> {
  // Guarded against a hand-edited ?page=-5 in the URL, which would produce a
  // negative offset and a PostgREST error.
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (safePage - 1) * PAGE_SIZE;

  // Joined from the single source of truth above, so the select list cannot
  // drift from the LeadRecord type it is deserialised into.
  const columns = LEAD_COLUMNS.join(",");

  // Assembled as parts and joined, rather than string-concatenated inline,
  // because the optional filters make the inline version a chain of ternaries
  // that is genuinely hard to read.
  const params = [
    `select=${columns}`,
    // Newest first: the only ordering a lead list is ever read in.
    "order=occurred_at.desc",
    `offset=${offset}`,
    // One more than the page size. That extra row is never rendered; its
    // existence is the answer to "is there a next page".
    `limit=${PAGE_SIZE + 1}`,
  ];

  if (filters.form) {
    // Exact match: form_name is a small closed set written by our own code, so
    // there is nothing to fuzzy-match and an exact filter uses the index.
    params.push(`form_name=eq.${escapeFilterValue(filters.form)}`);
  }

  if (filters.q) {
    const term = escapeFilterValue(filters.q);
    // ilike for case-insensitive contains — nobody recalls the exact casing or
    // the leading slash of a path from memory, so an exact match would make the
    // search box feel broken.
    params.push(`source_path=ilike.*${term}*`);
  }

  const rows = await axeSelect<LeadRecord>("lead_event", params.join("&"), PAGE_SIZE + 1);

  // Detected before the extra row is trimmed, since trimming is what destroys
  // the evidence.
  const hasMore = rows.length > PAGE_SIZE;

  return {
    // Sliced so the probe row never reaches the UI and cannot be rendered as a
    // real lead on the current page.
    rows: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    hasMore,
    page: safePage,
    pageSize: PAGE_SIZE,
  };
}

/*
  The distinct form names present in the data, for the filter dropdown.

  Derived from the rows rather than hardcoded, so a form added to the site
  appears in the filter without anyone remembering to update a list here — the
  kind of omission that makes a filter quietly hide real leads.
*/
export async function getLeadFormNames(): Promise<string[]> {
  // Only the one column is selected: this query exists to populate a dropdown
  // and has no business touching anything identifying.
  const rows = await axeSelect<{ form_name: string }>(
    "lead_event",
    "select=form_name&order=form_name.asc",
    // Capped low. Distinct form names number a handful; this is a safety valve
    // against scanning the whole table to build a three-item dropdown.
    5_000,
  );
  // De-duplicated in memory because PostgREST has no DISTINCT, for the same
  // reason documented at the top of queries.ts.
  return Array.from(new Set(rows.map((row) => row.form_name))).sort();
}
