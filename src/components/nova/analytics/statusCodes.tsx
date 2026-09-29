/*
  What each Nova API status/error code means and how to fix it, plus the
  badge that shows a status in the recent-calls table.

  The meanings are taken from what app/nova-api/v1/[...path]/route.ts and
  src/lib/nova/resources.ts actually return, so this table must change when
  they do. One list feeds both the "Status codes explained" table and the
  error-reason hints, so the two can never disagree.

  Server component (no "use client"): pure markup, zero browser JS.
*/

// One row of the reference table.
type CodeInfo = {
  // HTTP status.
  status: number;
  // The `error.code` in the response body; "ok" for the success row.
  code: string;
  // What happened, in the caller's terms.
  meaning: string;
  // What to change so the next call succeeds.
  fix: string;
};

// Ordered by status so it reads 2xx → 4xx → 5xx, the same order as the chart.
export const STATUS_CODES: CodeInfo[] = [
  {
    status: 200,
    code: "ok",
    meaning: "The call succeeded and the body holds the data.",
    fix: "Nothing to fix.",
  },
  {
    status: 400,
    code: "validation_failed",
    meaning:
      "A value is invalid for its field: a wrong type (e.g. a date that is not YYYY-MM-DD), limit below 1, a bad offset, an unknown sort field, order other than asc/desc, or too many values in an .in list.",
    fix: "Read error.details.issues for the field and correct its value.",
  },
  {
    status: 400,
    code: "unknown_filter",
    meaning: "A query parameter is not a filterable field of that resource.",
    fix: "The error message lists the allowed filters; remove or rename the parameter.",
  },
  {
    status: 400,
    code: "unsupported_operator",
    meaning: "The field exists, but not with that operator (e.g. .gte on a text field).",
    fix: "Use an operator the field supports, as listed in the API reference.",
  },
  {
    status: 401,
    code: "invalid_api_key",
    meaning: "The key is missing, malformed, unknown or revoked.",
    fix: "Send 'Authorization: Bearer nova_sk_…' with an active key from your dashboard.",
  },
  {
    status: 404,
    code: "resource_not_found",
    meaning: "The path or the id does not exist. Unknown paths and missing ids get the same answer on purpose.",
    fix: "Check the spelling of the path and that the id came from a list call.",
  },
  {
    status: 405,
    code: "method_not_allowed",
    meaning: "The API is read-only; only GET, HEAD and OPTIONS are accepted.",
    fix: "Use GET. Writes are not available in the sandbox.",
  },
  {
    status: 429,
    code: "rate_limit_exceeded",
    meaning: "Your key sent more requests this minute than its per-minute limit.",
    fix: "Wait the seconds in the Retry-After header, then retry; spread calls out or cache results.",
  },
  {
    status: 502,
    code: "upstream_error",
    meaning: "Our database could not be reached or failed. Not caused by your request.",
    fix: "Retry after a short back-off. Quote the request id to support if it persists.",
  },
];

// Error code → fix, for the "top failure reasons" list.
export const FIX_BY_CODE = new Map(STATUS_CODES.map((c) => [c.code, c.fix]));

// Classes per status family. The code number is always the text, so colour is
// never the only cue; 4xx (your request) and 5xx (our side) differ on purpose.
function badgeClass(status: number): string {
  // Success: the same blue as the "Succeeded" series.
  if (status >= 200 && status < 300) return "bg-blue-500/10 text-blue-700 ring-blue-600/20 dark:text-blue-300";
  // Client errors: amber, "fix the request".
  if (status >= 400 && status < 500) return "bg-amber-500/10 text-amber-800 ring-amber-600/20 dark:text-amber-300";
  // Server errors (and anything unexpected): red.
  return "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300";
}

// A compact status pill for tables.
export function StatusBadge({ status }: { status: number }) {
  return (
    // ring-inset draws the border inside the box, so pills align in a column.
    <span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset ${badgeClass(status)}`}>
      {status}
    </span>
  );
}

// The "Status codes explained" table.
export function StatusCodeTable() {
  return (
    // Own scroll wrapper: three text columns can outgrow a phone.
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Code</th>
            <th scope="col" className="px-3 py-2 font-medium">Meaning</th>
            <th scope="col" className="px-3 py-2 font-medium">How to fix</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {STATUS_CODES.map((c) => (
            // code is unique across the list (three 400s differ by code).
            <tr key={c.code} className="align-top">
              <td className="px-3 py-2">
                <StatusBadge status={c.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{c.code}</td>
              <td className="px-3 py-2 text-muted-foreground">{c.meaning}</td>
              <td className="px-3 py-2 text-muted-foreground">{c.fix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
