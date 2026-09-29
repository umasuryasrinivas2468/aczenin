/*
  The Nova API reference rendered on /nova-api. A Server Component: pure
  static content, so it ships zero JavaScript.

  The error codes and headers below were checked against the /v1 handler
  (app/nova-api/v1/[...path]/route.ts) and the registry
  (src/lib/nova/resources.ts) as written on 2026-09-29. If either changes,
  this page is the thing that goes stale — update both together.
*/

// Base URL shown everywhere; one constant so a domain move is one edit.
const BASE_URL = "https://aczen.in/nova-api/v1";

// Section anchors, used by both the on-page nav and the headings.
export const REFERENCE_SECTIONS = [
  { id: "quick-start", label: "Quick start" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoints", label: "Endpoints" },
  { id: "querying", label: "Filtering & paging" },
  { id: "responses", label: "Responses" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate limits" },
] as const;

// Design §6, one row per resource. Filters listed exactly as the design states.
const ENDPOINTS: { routes: string[]; filters: string }[] = [
  { routes: ["/health"], filters: "No auth. Returns { \"status\": \"ok\" }." },
  { routes: ["/me"], filters: "Your key's email, name, prefix, rate limit and created_at." },
  {
    routes: ["/invoices", "/invoices/{id}", "/invoices/{id}/payments"],
    filters: "status, invoice_date, due_date, client_id, client_name, total_amount, invoice_number",
  },
  { routes: ["/clients", "/clients/{id}"], filters: "name, gst_number, state" },
  {
    routes: ["/quotations", "/quotations/{id}"],
    filters: "status, quotation_date, client_id, client_name, total_amount",
  },
  { routes: ["/payments", "/payments/{id}"], filters: "payment_date, method, invoice_id, client_id, amount" },
  { routes: ["/vendors", "/vendors/{id}"], filters: "name, gst_number, state" },
  {
    routes: ["/purchase-bills", "/purchase-bills/{id}"],
    filters: "status, bill_date, due_date, vendor_id, vendor_name, total_amount, reverse_charge, itc_eligible",
  },
  { routes: ["/expenses", "/expenses/{id}"], filters: "category, expense_date, payment_method, total_amount" },
  {
    routes: ["/inventory", "/inventory/{id}", "/inventory/{id}/movements"],
    filters: "sku, name, hsn_code, quantity_on_hand",
  },
];

// The filter operators, from the registry's Operator type.
const OPERATORS: { syntax: string; meaning: string }[] = [
  { syntax: "field=value", meaning: "Equals" },
  { syntax: "field.in=a,b,c", meaning: "Any of the listed values (up to 100)" },
  { syntax: "field.gte=value", meaning: "Greater than or equal (dates, numbers)" },
  { syntax: "field.lte=value", meaning: "Less than or equal" },
  { syntax: "field.gt=value", meaning: "Strictly greater" },
  { syntax: "field.lt=value", meaning: "Strictly less" },
  { syntax: "field.ilike=text", meaning: "Case-insensitive substring match (we add the wildcards)" },
];

// Paging/sort controls, per resources.ts (limit is clamped, not refused).
const PAGING: { param: string; meaning: string }[] = [
  { param: "limit", meaning: "1–200, default 50. Larger values are clamped to 200." },
  { param: "offset", meaning: "Rows to skip, default 0." },
  { param: "sort", meaning: "A sortable field for that resource (usually its date field). Default: the date field." },
  { param: "order", meaning: "asc or desc. Default desc (newest first)." },
];

// The error codes /v1 actually emits (route.ts + resources.ts).
const ERRORS: { status: string; type: string; code: string; when: string }[] = [
  { status: "400", type: "invalid_request", code: "unknown_filter", when: "A query parameter that is not a filter for this resource." },
  { status: "400", type: "invalid_request", code: "unsupported_operator", when: "The field exists but does not allow that operator." },
  { status: "400", type: "invalid_request", code: "validation_failed", when: "A value fails its type, e.g. invoice_date.gte=yesterday, or a bad order." },
  { status: "401", type: "authentication_error", code: "invalid_api_key", when: "Missing, malformed, revoked or unknown key." },
  { status: "404", type: "invalid_request", code: "resource_not_found", when: "No such route, or no row with that id." },
  { status: "405", type: "invalid_request", code: "method_not_allowed", when: "Anything other than GET, HEAD or OPTIONS. The API is read-only." },
  { status: "429", type: "rate_limit_error", code: "rate_limit_exceeded", when: "Over your per-minute limit. Wait Retry-After seconds." },
  { status: "502", type: "api_error", code: "upstream_error", when: "The sandbox database did not answer. Safe to retry." },
];

// Dark code block; overflow-x-auto keeps long lines from widening the page at 320px.
function Code({ children, label }: { children: string; label: string }) {
  return (
    // figure + figcaption so the block has an accessible name.
    <figure className="min-w-0">
      <figcaption className="sr-only">{label}</figcaption>
      {/* tabIndex lets keyboard users focus and scroll a wide block. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      >
        <code>{children}</code>
      </pre>
    </figure>
  );
}

// Section wrapper: consistent spacing, and scroll-mt so the fixed navbar does
// not cover the heading when jumping via an anchor.
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 space-y-4">
      <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Shared table styling; wrapped in a scroll container so it never forces
// horizontal page scroll on a phone.
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-4 py-3 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiReference() {
  return (
    <div className="min-w-0 space-y-14">
      {/* --- Quick start: the three calls that prove a key works. --------- */}
      <Section id="quick-start" title="Quick start">
        <p className="text-muted-foreground">
          Every request is a plain HTTPS <code className="font-mono">GET</code>. Check the API is up, confirm your
          key, then read some invoices.
        </p>
        <Code label="Health check">{`curl ${BASE_URL}/health`}</Code>
        <Code label="Who am I">{`curl ${BASE_URL}/me \\\n  -H "Authorization: Bearer nova_sk_your_key_here"`}</Code>
        <Code label="List overdue invoices">{`curl "${BASE_URL}/invoices?status=overdue&limit=5" \\\n  -H "Authorization: Bearer nova_sk_your_key_here"`}</Code>
      </Section>

      {/* --- Auth ----------------------------------------------------------- */}
      <Section id="authentication" title="Authentication">
        <p className="text-muted-foreground">
          Send your key as a bearer token on every request except <code className="font-mono">/health</code>. Keys
          start with <code className="font-mono">nova_sk_</code> and are shown once, when you create them. Keep
          them server-side: a key in browser code is a key anyone can copy.
        </p>
        <Code label="Authorization header">{`Authorization: Bearer nova_sk_...`}</Code>
        <p className="text-sm text-muted-foreground">
          The data is a shared, read-only sandbox: every key sees the same dummy books, and nothing you do can change
          them. The contract mirrors the Aczen Bilz v1 API, so moving to it means changing the base URL and the key.
        </p>
      </Section>

      {/* --- Endpoints ------------------------------------------------------ */}
      <Section id="endpoints" title="Endpoints">
        <p className="text-muted-foreground">
          Base URL: <code className="break-all font-mono text-foreground">{BASE_URL}</code>
        </p>
        <Table
          head={["Route", "Filters / notes"]}
          rows={ENDPOINTS.map((endpoint) => [
            // One route per line so {id} variants read as a group.
            <div key="r" className="space-y-1 font-mono text-xs">
              {endpoint.routes.map((route) => (
                <div key={route} className="whitespace-nowrap">
                  <span className="text-emerald-600 dark:text-emerald-400">GET</span> {route}
                </div>
              ))}
            </div>,
            <span key="f" className="text-muted-foreground">
              {endpoint.filters}
            </span>,
          ])}
        />
        <p className="text-sm text-muted-foreground">
          Ids carry a type prefix (<code className="font-mono">inv_</code>, <code className="font-mono">cli_</code>,{" "}
          <code className="font-mono">pay_</code>…), so a client id used where an invoice id belongs is a clean 404.
          Invoices and purchase bills report <code className="font-mono">status=overdue</code> once unpaid past their
          due date.
        </p>
      </Section>

      {/* --- Query grammar --------------------------------------------------- */}
      <Section id="querying" title="Filtering, sorting and paging">
        <p className="text-muted-foreground">
          Filters are query parameters. Combine as many as you like; they are ANDed together.
        </p>
        <Table
          head={["Syntax", "Meaning"]}
          rows={OPERATORS.map((op) => [
            <code key="s" className="whitespace-nowrap font-mono text-xs">
              {op.syntax}
            </code>,
            <span key="m" className="text-muted-foreground">
              {op.meaning}
            </span>,
          ])}
        />
        <Table
          head={["Parameter", "Meaning"]}
          rows={PAGING.map((p) => [
            <code key="p" className="font-mono text-xs">
              {p.param}
            </code>,
            <span key="m" className="text-muted-foreground">
              {p.meaning}
            </span>,
          ])}
        />
        <Code label="Filtered, sorted, paged request">{`curl "${BASE_URL}/invoices?status.in=pending,overdue&invoice_date.gte=2026-04-01&client_name.ilike=traders&sort=total_amount&order=desc&limit=20&offset=40" \\\n  -H "Authorization: Bearer nova_sk_..."`}</Code>
        <p className="text-sm text-muted-foreground">
          Dates are <code className="font-mono">YYYY-MM-DD</code>. Each field allows only the operators that make sense
          for it; anything else is rejected with a 400 before it reaches the database.
        </p>
      </Section>

      {/* --- Envelopes ------------------------------------------------------- */}
      <Section id="responses" title="Responses">
        <p className="text-muted-foreground">
          Lists come wrapped with pagination; single resources come bare. Every row carries an{" "}
          <code className="font-mono">object</code> field naming its type.
        </p>
        <Code label="List response">{`{
  "data": [
    {
      "object": "invoice",
      "id": "inv_8f2c91a4",
      "invoice_number": "INV-2026-0142",
      "client_name": "Sharma Traders",
      "total_amount": 11800.00,
      "status": "overdue",
      ...
    }
  ],
  "pagination": { "limit": 20, "offset": 40, "total": 412, "has_more": true }
}`}</Code>
        <Code label="Error response">{`{
  "error": {
    "type": "invalid_request",
    "code": "unsupported_operator",
    "message": "…",
    "details": { … }
  },
  "request_id": "5b0c6f1e-…"
}`}</Code>
        <p className="text-sm text-muted-foreground">
          Quote <code className="font-mono">request_id</code> (also sent as the{" "}
          <code className="font-mono">X-Request-Id</code> header) when you report a problem.
        </p>
      </Section>

      {/* --- Error table ----------------------------------------------------- */}
      <Section id="errors" title="Error codes">
        <Table
          head={["HTTP", "type", "code", "When"]}
          rows={ERRORS.map((e) => [
            <span key="s" className="font-mono">
              {e.status}
            </span>,
            <code key="t" className="whitespace-nowrap font-mono text-xs">
              {e.type}
            </code>,
            <code key="c" className="whitespace-nowrap font-mono text-xs">
              {e.code}
            </code>,
            <span key="w" className="text-muted-foreground">
              {e.when}
            </span>,
          ])}
        />
      </Section>

      {/* --- Rate limits ----------------------------------------------------- */}
      <Section id="rate-limits" title="Rate limits">
        <p className="text-muted-foreground">
          Each key gets <strong className="text-foreground">120 requests per minute</strong> by default, counted in
          fixed one-minute windows. Every authenticated response tells you where you stand:
        </p>
        <Code label="Rate limit headers">{`RateLimit-Limit: 120
RateLimit-Remaining: 117
RateLimit-Reset: 42        # seconds until the window resets
Retry-After: 42            # on 429 responses only`}</Code>
        <p className="text-sm text-muted-foreground">
          The API fails closed: if a key cannot be checked, the request is refused rather than served. CORS is open
          (<code className="font-mono">Access-Control-Allow-Origin: *</code>) for testing from a browser, but auth is
          header-only, so no cookie ever rides along.
        </p>
      </Section>
    </div>
  );
}
