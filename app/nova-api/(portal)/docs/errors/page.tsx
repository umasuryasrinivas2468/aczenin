/*
  /nova-api/docs/errors — the error envelope and every code /v1 can emit.

  The codes and messages below are copied from app/nova-api/v1/[...path]/route.ts
  (jsonError / errorType call sites) and src/lib/nova/resources.ts
  (QueryErrorCode), as of 2026-09-29. route.ts does not export them, so this
  table is the one hand-kept list in the docs: the QueryErrorCode import below
  at least makes a renamed 400 code a compile error here.
*/

// Metadata type for the tab title.
import type { Metadata } from "next";

// Shared docs blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, P, ParamTable } from "@/components/nova/docs/primitives";
// Shared constants and snippet helpers.
import { DOCS_ROOT, curl, json, pagerFor } from "@/components/nova/docs/content";
// The 400 codes' union, so these rows are checked against the translator.
import type { QueryErrorCode } from "@/lib/nova/resources";

// "Errors | Nova API".
export const metadata: Metadata = { title: "Errors" };

// One documented error code.
type ErrorRow = { status: number; type: string; code: string; message: string; when: string; retry: boolean };

// The three validation codes, typed so a rename in resources.ts breaks the build here.
const QUERY_ERRORS: (ErrorRow & { code: QueryErrorCode })[] = [
  { status: 400, type: "invalid_request", code: "unknown_filter", message: "Unknown filter 'colour'. Allowed: status, …", when: "A query parameter that is not a filter for this resource.", retry: false },
  { status: 400, type: "invalid_request", code: "unsupported_operator", message: "Operator 'ilike' is not supported on 'total_amount'. Allowed: eq, gte, …", when: "The field exists but does not allow that operator.", retry: false },
  { status: 400, type: "invalid_request", code: "validation_failed", message: "Invalid value for 'invoice_date.gte': must be a real date in YYYY-MM-DD format.", when: "A value fails its type, or limit, offset, sort or order is invalid.", retry: false },
];

// Everything else route.ts emits, with its exact message text.
const ROUTE_ERRORS: ErrorRow[] = [
  { status: 401, type: "authentication_error", code: "invalid_api_key", message: "Missing or invalid API key. Send 'Authorization: Bearer nova_sk_...'.", when: "Missing, malformed, unknown or revoked key.", retry: false },
  { status: 404, type: "invalid_request", code: "resource_not_found", message: "No such resource.", when: "Unknown path, malformed id, or no row with that id.", retry: false },
  { status: 405, type: "invalid_request", code: "method_not_allowed", message: "The Nova API is read-only. Allowed methods: GET, HEAD, OPTIONS.", when: "Any write verb (POST, PUT, PATCH, DELETE).", retry: false },
  { status: 429, type: "rate_limit_error", code: "rate_limit_exceeded", message: "Rate limit of 120 requests per minute exceeded.", when: "Over your key's per-minute limit.", retry: true },
  { status: 502, type: "api_error", code: "upstream_error", message: "The API is temporarily unavailable.", when: "The Nova database did not answer.", retry: true },
  // Permanent until the dataset ships that view, hence retry: false.
  { status: 503, type: "api_error", code: "resource_not_provisioned", message: "This resource is not available in the sandbox dataset yet.", when: "The route exists but its data has not been loaded into the sandbox yet.", retry: false },
];

// Status order, the way readers look codes up.
const ALL_ERRORS = [...QUERY_ERRORS, ...ROUTE_ERRORS];

// A validation error in full, showing the optional details.issues shape.
const EXAMPLE = json({
  error: {
    type: "invalid_request",
    code: "validation_failed",
    message: "Invalid value for 'status': must be one of: pending, partial, paid, overdue.",
    details: { issues: [{ field: "status", message: "must be one of: pending, partial, paid, overdue" }] },
  },
  request_id: "3f9a1c7e-52d4-4b8e-9c1a-6e0d2b7f8a45",
});

export default function NovaDocsErrorsPage() {
  // Bottom pager neighbours.
  const pager = pagerFor(`${DOCS_ROOT}/errors`);
  return (
    <DocsArticle>
      {/* Page header. */}
      <DocsHeader
        eyebrow="Guides"
        title="Errors"
        lead="Every error, from a bad filter to a database outage, comes back in one envelope with a stable machine-readable code."
      />

      {/* Envelope shape. */}
      <DocsSection id="envelope" title="The error envelope">
        <P>
          Branch on <C>error.code</C>, not on <C>message</C>: codes are stable, messages may be reworded.{" "}
          <C>error.type</C> groups codes by who has to act. <C>details</C> appears only on validation errors and is
          omitted, not null, otherwise.
        </P>
        <CodeBlock title="cURL" code={curl("invoices?status=late")} />
        <CodeBlock title="Response 400" code={EXAMPLE} copyable={false} />
        <Callout tone="tip" title="Quote the request_id">
          Every response, success or error, carries a <C>request_id</C> (also sent as the <C>X-Request-Id</C> header).
          Include it when you report a problem; it points at the exact server log line.
        </Callout>
      </DocsSection>

      {/* The full code table. */}
      <DocsSection id="codes" title="Error codes">
        <ParamTable
          head={["HTTP", "type", "code", "When", "Retry?"]}
          minWidth="44rem"
          rows={ALL_ERRORS.map((e) => [
            <span key="s" className="font-mono">{e.status}</span>,
            <code key="t" className="whitespace-nowrap font-mono text-xs">{e.type}</code>,
            <code key="c" className="whitespace-nowrap font-mono text-xs font-semibold">{e.code}</code>,
            // The message sits under the explanation so readers can match logs to rows.
            <span key="w" className="block text-muted-foreground">
              {e.when}
              <span className="mt-1 block font-mono text-xs text-muted-foreground/80">&ldquo;{e.message}&rdquo;</span>
            </span>,
            <span key="r" className={e.retry ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{e.retry ? "Yes, with backoff" : "No, fix the request"}</span>,
          ])}
        />
        <P className="text-sm">
          A 404 looks the same whether the path is unknown, the id is malformed or the row does not exist, so ids cannot
          be probed by comparing responses. A 502 never contains database text. The 429 message names your key&apos;s
          actual limit; 120 is the default.
        </P>
      </DocsSection>

      {/* Pager. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}
