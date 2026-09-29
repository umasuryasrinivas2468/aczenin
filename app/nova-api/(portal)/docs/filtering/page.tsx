/*
  /nova-api/docs/filtering — the query grammar every list endpoint shares.
  Limits come from the registry's exported constants; the operator table is
  typed Record<Operator, …> so adding an operator to the registry without
  documenting it is a compile error.
*/

// Metadata type for the tab title.
import type { Metadata } from "next";

// Shared docs blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, P, ParamTable } from "@/components/nova/docs/primitives";
// Shared constants and snippet helpers.
import { DOCS_ROOT, curl, json, pagerFor } from "@/components/nova/docs/content";
// Registry: the real paging bounds and the Operator union.
import { DEFAULT_LIMIT, MAX_LIMIT, type Operator } from "@/lib/nova/resources";

// "Filtering & pagination | Nova API".
export const metadata: Metadata = { title: "Filtering & pagination" };

// Every operator the grammar accepts. Record<Operator, …> makes TypeScript
// reject this object if resources.ts gains or loses an operator.
const OPERATORS: Record<Operator, { syntax: string; meaning: string; example: string }> = {
  eq: { syntax: "field=value", meaning: "Equals. A bare field name means eq.", example: "status=paid" },
  in: { syntax: "field.in=a,b,c", meaning: "Any of the listed values (up to 100).", example: "method.in=upi,neft" },
  gte: { syntax: "field.gte=value", meaning: "Greater than or equal.", example: "invoice_date.gte=2026-04-01" },
  lte: { syntax: "field.lte=value", meaning: "Less than or equal.", example: "total_amount.lte=50000" },
  gt: { syntax: "field.gt=value", meaning: "Strictly greater than.", example: "amount.gt=0" },
  lt: { syntax: "field.lt=value", meaning: "Strictly less than.", example: "due_date.lt=2026-10-01" },
  ilike: {
    syntax: "field.ilike=text",
    meaning: "Case-insensitive substring match. Nova adds the wildcards; * and % in your value are removed.",
    example: "client_name.ilike=traders",
  },
};

// A realistic list envelope sized to one team's slice (~30 invoices), with
// consistent numbers: offset + rows < total, so has_more is true.
const ENVELOPE = json({
  data: [{ object: "invoice", id: "inv_c4ca4238", invoice_number: "INV-00142", status: "overdue", total_amount: 47250 }],
  pagination: { limit: 20, offset: 0, total: 30, has_more: true },
});

export default function NovaDocsFilteringPage() {
  // Bottom pager neighbours.
  const pager = pagerFor(`${DOCS_ROOT}/filtering`);
  return (
    <DocsArticle>
      {/* Page header. */}
      <DocsHeader
        eyebrow="Guides"
        title="Filtering & pagination"
        lead="Every list endpoint takes the same query parameters: filters, then limit, offset, sort and order."
      />

      {/* Operator grammar. */}
      <DocsSection id="operators" title="Filter operators">
        <P>
          A filter is a query parameter named after a field, optionally with an operator suffix. Combine as many as you
          like; they are ANDed together, and with your team&apos;s slice filter, which always applies. Each resource page lists which fields you can filter on and which operators
          each one allows.
        </P>
        <ParamTable
          head={["Syntax", "Meaning", "Example"]}
          rows={Object.values(OPERATORS).map((op) => [
            // nowrap: the syntax is the thing readers scan for.
            <code key="s" className="whitespace-nowrap font-mono text-xs">{op.syntax}</code>,
            <span key="m" className="text-muted-foreground">{op.meaning}</span>,
            <code key="e" className="whitespace-nowrap font-mono text-xs">{op.example}</code>,
          ])}
        />
        {/* Value rules, which is where most 400s come from. */}
        <ul className="max-w-prose list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Dates are <C>YYYY-MM-DD</C> and must be valid calendar dates.</li>
          <li>Numbers are plain decimals: <C>1500</C> or <C>1500.50</C>, not <C>1.5e3</C>.</li>
          <li>Booleans are the literals <C>true</C> and <C>false</C>.</li>
          <li>Enum fields accept only their listed values; an error lists the valid ones.</li>
          <li>Values are at most 200 characters; an unknown field or operator is a 400, never silently ignored.</li>
        </ul>
      </DocsSection>

      {/* Paging and sorting controls. */}
      <DocsSection id="pagination" title="Pagination and sorting">
        <ParamTable
          head={["Parameter", "Values", "Default"]}
          minWidth="30rem"
          rows={[
            // Bounds interpolated from the registry constants.
            [<C key="p">limit</C>, <span key="v" className="text-muted-foreground">{`1–${MAX_LIMIT}. Values above ${MAX_LIMIT} are clamped to ${MAX_LIMIT}, not refused.`}</span>, <C key="d">{String(DEFAULT_LIMIT)}</C>],
            [<C key="p">offset</C>, <span key="v" className="text-muted-foreground">Rows to skip, 0 or more.</span>, <C key="d">0</C>],
            [<C key="p">sort</C>, <span key="v" className="text-muted-foreground">One of the resource&apos;s sortable fields.</span>, <span key="d" className="text-muted-foreground">Its date field, else <C>created_at</C></span>],
            [<C key="p">order</C>, <span key="v" className="text-muted-foreground"><C>asc</C> or <C>desc</C></span>, <C key="d">desc</C>],
          ]}
        />
        <Callout tone="info" title="Stable pages">
          Ties on the sort field are broken by <C>id</C>, so paging with <C>offset</C> never skips or repeats a row
          while the data is unchanged.
        </Callout>
      </DocsSection>

      {/* Envelope shape and how to page with it. */}
      <DocsSection id="envelope" title="The list envelope">
        <P>
          Lists return rows in <C>data</C> and paging state in <C>pagination</C>. Keep requesting with{" "}
          <C>offset</C> increased by <C>limit</C> until <C>has_more</C> is false. <C>pagination.limit</C> is the limit
          actually applied, so a clamped request shows <C>{String(MAX_LIMIT)}</C> there.
        </P>
        <CodeBlock title="Response 200" code={ENVELOPE} copyable={false} />
      </DocsSection>

      {/* One request using every feature at once. */}
      <DocsSection id="example" title="Putting it together">
        <CodeBlock
          title="cURL"
          code={curl("invoices?status.in=pending,overdue&invoice_date.gte=2026-04-01&client_name.ilike=traders&sort=total_amount&order=desc&limit=10&offset=10")}
        />
      </DocsSection>

      {/* Pager. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}
