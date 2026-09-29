/*
  /nova-api/docs/{resource} — one page for all eight resources.

  Endpoints, filter fields, operators, enum values and sort columns are all
  read from the registry (src/lib/nova/resources.ts), the same object the /v1
  route validates against, so the reference cannot describe a field the API
  rejects or miss one it accepts. Only the prose and example rows come from
  content.ts.
*/

// Metadata type for per-resource titles.
import type { Metadata } from "next";
// Client-side link to the grammar page.
import Link from "next/link";
// Unknown slugs render the app's 404.
import { notFound } from "next/navigation";

// Shared docs blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, EndpointBadge, P, ParamTable } from "@/components/nova/docs/primitives";
// Prose, examples and snippet helpers.
import { CHILD_EXAMPLES, DOCS_ROOT, RESOURCE_DOCS, curl, json, pagerFor } from "@/components/nova/docs/content";
// The registry: the single source of truth for everything in the tables.
import { DEFAULT_LIMIT, RESOURCES, findResource, findSubResource, type Operator, type Resource } from "@/lib/nova/resources";

// Next 15: dynamic params arrive as a Promise.
type PageProps = { params: Promise<{ resource: string }> };

// Only the eight registry keys exist; anything else is a build-time 404.
export const dynamicParams = false;

// Prerender one page per registry key, so a new resource gets a page for free.
export function generateStaticParams(): { resource: string }[] {
  // Keys, not a hand list: the registry decides what exists.
  return Object.keys(RESOURCES).map((resource) => ({ resource }));
}

// "Invoices | Nova API", falling back to the slug if prose is missing.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await per Next 15's async params.
  const { resource } = await params;
  // Unknown slugs get no special title; the page itself 404s.
  return { title: RESOURCE_DOCS[resource]?.title ?? "Not found" };
}

// How each operator is spelled in a query string.
const OP_SYNTAX: Record<Operator, string> = { eq: "=", in: ".in=", gte: ".gte=", lte: ".lte=", gt: ".gt=", lt: ".lt=", ilike: ".ilike=" };

// Filter-table rows, generated from a resource's allowlist.
function filterRows(resource: Resource): React.ReactNode[][] {
  // Registry order is the declaration order, which is roughly importance order.
  return Object.entries(resource.filters).map(([name, field]) => [
    // Field name as the reader types it.
    <code key="f" className="whitespace-nowrap font-mono text-xs font-semibold">{name}</code>,
    // Type chip.
    <span key="t" className="whitespace-nowrap font-mono text-xs text-muted-foreground">{field.type.kind}</span>,
    // Each allowed operator as its literal query-string spelling.
    <span key="o" className="flex flex-wrap gap-1">
      {field.ops.map((op) => (
        <code key={op} className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{`${name}${OP_SYNTAX[op]}`}</code>
      ))}
    </span>,
    // Enum values, or a dash for open types.
    field.type.kind === "enum" ? (
      <span key="v" className="flex flex-wrap gap-1">
        {field.type.values.map((value) => (
          <code key={value} className="rounded border px-1.5 py-0.5 font-mono text-xs">{value}</code>
        ))}
      </span>
    ) : (
      <span key="v" className="text-muted-foreground">—</span>
    ),
  ]);
}

// Filter + sort block, shared by the main list and the child lists.
function QueryReference({ resource, idPrefix }: { resource: Resource; idPrefix: string }) {
  return (
    <>
      {/* The allowlist table. */}
      <ParamTable head={["Field", "Type", "Operators", "Values"]} minWidth="40rem" rows={filterRows(resource)} />
      {/* Sort columns, with the registry's default marked. */}
      <p className="text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Sortable:</span>{" "}
        {resource.sort.map((column, index) => (
          // Comma list; the default carries a label so it needs no footnote.
          <span key={column}>
            {index > 0 && ", "}
            <C>{column}</C>
            {column === resource.defaultSort && " (default)"}
          </span>
        ))}
        . Default order <C>desc</C>, page size {DEFAULT_LIMIT}. Rows have <C>object: &quot;{resource.object}&quot;</C> and
        ids start with <C>{idPrefix}</C>.
      </p>
    </>
  );
}

export default async function NovaDocsResourcePage({ params }: PageProps) {
  // Await per Next 15.
  const { resource: slug } = await params;
  // Registry lookup with the same own-key guard the API uses.
  const resource = findResource(slug);
  // Prose for this slug; both must exist or the page is not documented.
  const doc = RESOURCE_DOCS[slug];
  // Unknown slug (or registry entry without prose) → 404.
  if (resource === null || doc === undefined) notFound();

  // Child routes that the registry actually serves; a prose entry for a child
  // the API does not have is dropped rather than documented.
  const children = (doc.children ?? []).flatMap((child) => {
    // Same lookup the route uses for /{parent}/{id}/{child}.
    const sub = findSubResource(slug, child.segment);
    // Registered child: keep it with its resolved resource.
    return sub === null ? [] : [{ ...child, sub }];
  });

  // A list-shaped example, consistent with the envelope documented elsewhere.
  const listExample = json({ data: [doc.example], pagination: { limit: 5, offset: 0, total: 1, has_more: false } });
  // The id used in the get example is the example row's own id.
  const exampleId = String(doc.example.id);
  // Pager neighbours.
  const pager = pagerFor(`${DOCS_ROOT}/${slug}`);

  return (
    <DocsArticle>
      {/* Header: title from prose, endpoints badge-listed right under it. */}
      <DocsHeader eyebrow="Resources" title={doc.title} lead={doc.summary} />

      {/* Endpoint index for this resource. */}
      <DocsSection id="endpoints" title="Endpoints">
        <ul className="flex flex-col items-start gap-2">
          {/* List and get exist for every registry resource. */}
          <li><EndpointBadge path={`/${slug}`} /></li>
          <li><EndpointBadge path={`/${slug}/{id}`} /></li>
          {/* Children only where the registry registers them. */}
          {children.map((child) => (
            <li key={child.segment}><EndpointBadge path={`/${slug}/{id}/${child.segment}`} /></li>
          ))}
        </ul>
        {/* Team scoping applies to every resource, so it is stated on every page. */}
        <Callout tone="tip" title="Results are scoped to your team">
          Every endpoint here returns only your team&apos;s slice of the sandbox. The slice filter is applied server-side
          and cannot be changed; an id from another team&apos;s slice returns a 404. See{" "}
          <Link href={`${DOCS_ROOT}#team-data`} className="font-medium text-foreground underline underline-offset-4">
            Your team&apos;s data
          </Link>
          .
        </Callout>
        {/* Resource-specific gotchas, if any. */}
        {doc.notes && doc.notes.length > 0 && (
          <Callout tone="info" title="Good to know">
            <ul className="list-disc space-y-1 pl-4">
              {doc.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Callout>
        )}
      </DocsSection>

      {/* List endpoint. */}
      <DocsSection id="list" title={`List ${doc.title.toLowerCase()}`}>
        <EndpointBadge path={`/${slug}`} />
        <P>
          Returns a page of {doc.title.toLowerCase()} in the list envelope. Filter with the fields below; see{" "}
          <Link href={`${DOCS_ROOT}/filtering`} className="font-medium text-foreground underline underline-offset-4 hover:decoration-primary">
            Filtering &amp; pagination
          </Link>{" "}
          for the grammar.
        </P>
        <QueryReference resource={resource} idPrefix={doc.idPrefix} />
        <CodeBlock title="cURL" code={curl(doc.exampleQuery)} />
        <CodeBlock title="Response 200" code={listExample} copyable={false} />
      </DocsSection>

      {/* Get endpoint. */}
      <DocsSection id="get" title={`Get one ${resource.object.replace(/_/g, " ")}`}>
        <EndpointBadge path={`/${slug}/{id}`} />
        <P>
          Returns one row in <C>data</C>. An id that does not exist, or is not shaped like one, returns a 404{" "}
          <C>resource_not_found</C>.
        </P>
        <CodeBlock title="cURL" code={curl(`${slug}/${exampleId}`)} />
        <CodeBlock title="Response 200" code={json({ data: doc.example })} copyable={false} />
      </DocsSection>

      {/* Child list endpoints. */}
      {children.map((child) => (
        <DocsSection key={child.segment} id={child.segment} title={`List ${child.segment} for one ${resource.object.replace(/_/g, " ")}`}>
          <EndpointBadge path={`/${slug}/{id}/${child.segment}`} />
          <P>
            {child.summary} Scoped to the parent id in the path; your filters are applied on top and cannot widen it. An
            unknown parent id returns an empty list.
          </P>
          <QueryReference resource={child.sub.resource} idPrefix={child.idPrefix} />
          <CodeBlock title="cURL" code={curl(`${slug}/${exampleId}/${child.segment}?limit=10`)} />
          <CodeBlock
            title="Response 200"
            copyable={false}
            code={json({ data: [CHILD_EXAMPLES[`${slug}/${child.segment}`]], pagination: { limit: 10, offset: 0, total: 1, has_more: false } })}
          />
        </DocsSection>
      ))}

      {/* Pager. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}
