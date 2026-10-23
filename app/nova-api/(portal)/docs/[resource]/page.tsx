/*
  /nova-api/docs/{resource} — one page for EVERY registry resource.

  Endpoints, filter fields, operators, enum values, sort columns and child
  routes are read from the registry (src/lib/nova/resources.ts), the same
  object /v1 validates against, so the reference cannot describe a field the
  API rejects or miss one it accepts. A resource added by any domain file
  gets a page with no edit here.

  Example responses are LIVE: the signed-in team's first row, read through
  the API's own query builder and tagRow (teamData.ts). When that read fails
  or finds nothing, the page shows the field names instead of inventing data.
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
// Prose and snippet helpers.
import { DOCS_ROOT, curl, json, pagerFor, resourceDoc } from "@/components/nova/docs/content";
// Live per-team reads, all fail-soft.
import { firstRow, getTeamContext } from "@/components/nova/docs/teamData";
// The registry: the single source of truth for everything structural.
import { DEFAULT_LIMIT, RESOURCES, childRoutesOf, findResource, type Operator, type Resource } from "@/lib/nova/resources";

// Next 15: dynamic params arrive as a Promise.
type PageProps = { params: Promise<{ resource: string }> };

// Only registry keys exist; anything else 404s without rendering.
export const dynamicParams = false;

// One entry per registry key, so a new resource gets a page for free.
export function generateStaticParams(): { resource: string }[] {
  // Keys, not a hand list: the registry decides what exists.
  return Object.keys(RESOURCES).map((resource) => ({ resource }));
}

// "Invoices | Nova API", from the prose map or the generated fallback.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await per Next 15's async params.
  const { resource } = await params;
  // Unknown slugs get a neutral title; the page itself 404s.
  return { title: findResource(resource) ? resourceDoc(resource).title : "Not found" };
}

// How each operator is spelled in a query string.
const OP_SYNTAX: Record<Operator, string> = { eq: "=", in: ".in=", gte: ".gte=", lte: ".lte=", gt: ".gt=", lt: ".lt=", ilike: ".ilike=" };

// "vendor_bank_account" → "vendor bank account", for sentence text.
function humanObject(resource: Resource): string {
  // The object tag is the singular noun the API already uses.
  return resource.object.replace(/_/g, " ");
}

// "inv_8f2c91a4" → "inv_", so the page can state the prefix it actually saw.
function idPrefixOf(row: Record<string, unknown> | null): string | null {
  // Only a string id with an underscore has a prefix worth naming.
  const id = row?.id;
  return typeof id === "string" && id.includes("_") ? id.slice(0, id.indexOf("_") + 1) : null;
}

// Field-names-only stand-in for when no live row is available: honest about
// what is known (the filterable columns and their types), invents no values.
function fieldShape(resource: Resource): Record<string, string> {
  // object and id are on every row; the rest are the registry's filter columns.
  return {
    object: resource.object,
    id: "string",
    ...Object.fromEntries(Object.entries(resource.filters).map(([name, field]) => [name, field.type.kind])),
  };
}

// Filter-table rows, generated from a resource's allowlist.
function filterRows(resource: Resource): React.ReactNode[][] {
  // Declaration order from the registry.
  return Object.entries(resource.filters).map(([name, field]) => [
    // Field name as the reader types it.
    <code key="f" className="whitespace-nowrap font-mono text-xs font-semibold">{name}</code>,
    // Type, straight from the registry's FieldType union.
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
function QueryReference({ resource, idPrefix }: { resource: Resource; idPrefix: string | null }) {
  // A resource with no filters is valid registry config; say so instead of an empty table.
  const hasFilters = Object.keys(resource.filters).length > 0;
  return (
    <>
      {/* The allowlist table, or a plain sentence when there is nothing to filter on. */}
      {hasFilters ? (
        <ParamTable head={["Field", "Type", "Operators", "Values"]} minWidth="40rem" rows={filterRows(resource)} />
      ) : (
        <P className="text-sm">This list has no filterable fields; page and sort it instead.</P>
      )}
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
        . Default order <C>desc</C>, page size {DEFAULT_LIMIT}. Rows have <C>object: &quot;{resource.object}&quot;</C>
        {/* The prefix is only stated when a live row showed it, never guessed. */}
        {idPrefix && (
          <>
            {" "}and ids start with <C>{idPrefix}</C>
          </>
        )}
        .
      </p>
    </>
  );
}

// Response block: the live JSON when there is a row, the field names otherwise.
function ExampleResponse({ body, resource, live }: { body: unknown; resource: Resource; live: boolean }) {
  // Live: the exact JSON the API returns for this team.
  if (live) return <CodeBlock title="Response 200 · your team's data" code={json(body)} copyable={false} />;
  // Fallback: state plainly that values are not shown, then the shape.
  return (
    <>
      <P className="text-sm">Field names and types only; sign in with an allowlisted email to see your team&apos;s first row here.</P>
      <CodeBlock title="Fields" code={json(fieldShape(resource))} copyable={false} />
    </>
  );
}

export default async function NovaDocsResourcePage({ params }: PageProps) {
  // Await per Next 15.
  const { resource: slug } = await params;
  // Registry lookup with the same own-key guard the API uses.
  const resource = findResource(slug);
  // Unknown slug → 404 (dynamicParams already blocks it; this covers direct renders).
  if (resource === null) notFound();
  // Prose, always present thanks to the generated fallback.
  const doc = resourceDoc(slug);

  // Child routes the registry actually serves for this parent.
  // Read from the registry's own child table (childRoutesOf), not probed.
  const children = childRoutesOf(slug).map(({ child, sub }) => ({ segment: child, sub }));

  // The viewer's slice; null means no live data (signed out or DB unavailable).
  const team = await getTeamContext();
  // Parent read and each child's discovery read, in parallel.
  const [first, childFirsts] = await Promise.all([
    // The team's first row in the API's default order, plus the list total.
    team ? firstRow(resource, team.slice) : Promise.resolve(null),
    // Each child's first row anywhere in the slice: its parentField names a
    // parent that certainly HAS children, which the first parent may not.
    Promise.all(children.map(({ sub }) => (team ? firstRow(sub.resource, team.slice) : Promise.resolve(null)))),
  ]);
  // Re-read each child pinned to that parent, so the example is exactly what
  // the child route returns (row AND total), not a slice-wide count.
  const childExamples = await Promise.all(
    children.map(async ({ sub }, index) => {
      // The parent id the discovery row points at, if it is a usable string.
      const parentId = childFirsts[index]?.row[sub.parentField];
      // No live row or no parent id: nothing to pin, show field names.
      if (!team || typeof parentId !== "string") return null;
      // Same pinned read /v1 performs for /{parent}/{id}/{child}?limit=1.
      const pinned = await firstRow(sub.resource, team.slice, { field: sub.parentField, value: parentId });
      return pinned ? { ...pinned, parentId } : null;
    }),
  );

  // The live row, if any.
  const row = first?.row ?? null;
  // The id the get example uses: the live one, else the path placeholder.
  const exampleId = typeof row?.id === "string" ? row.id : "{id}";
  // Pager neighbours.
  const pager = pagerFor(`${DOCS_ROOT}/${slug}`);

  return (
    <DocsArticle>
      {/* Header: title and summary from prose (or the generated fallback). */}
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
          Every endpoint here returns only your team&apos;s slice of the data. The slice filter is applied server-side
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
        <QueryReference resource={resource} idPrefix={idPrefixOf(row)} />
        {/* limit=1 so the live response below is exactly what this command returns. */}
        <CodeBlock title="cURL" code={curl(`${slug}?limit=1`)} />
        <ExampleResponse
          resource={resource}
          live={first !== null}
          body={first && { data: [first.row], pagination: { limit: 1, offset: 0, total: first.total, has_more: first.total > 1 } }}
        />
      </DocsSection>

      {/* Get endpoint. */}
      <DocsSection id="get" title={`Get one ${humanObject(resource)}`}>
        <EndpointBadge path={`/${slug}/{id}`} />
        <P>
          Returns one row in <C>data</C>. An id that does not exist, is not shaped like one, or belongs to another
          team returns a 404 <C>resource_not_found</C>.
        </P>
        <CodeBlock title="cURL" code={curl(`${slug}/${exampleId}`)} />
        <ExampleResponse resource={resource} live={row !== null} body={{ data: row }} />
      </DocsSection>

      {/* Child list endpoints. */}
      {children.map((child, index) => {
        // This child's pinned live example, or null.
        const example = childExamples[index];
        return (
          <DocsSection key={child.segment} id={child.segment} title={`List ${child.segment.replace(/-/g, " ")} for one ${humanObject(resource)}`}>
            <EndpointBadge path={`/${slug}/{id}/${child.segment}`} />
            <P>
              The {child.segment.replace(/-/g, " ")} whose <C>{child.sub.parentField}</C> is the id in the path, with the
              same filters and sorting as the full list. Your filters apply on top of that pin and cannot widen it. An
              unknown parent id returns an empty list.
            </P>
            <QueryReference resource={child.sub.resource} idPrefix={idPrefixOf(example?.row ?? null)} />
            {/* The live parent id, so the command returns the response shown. */}
            <CodeBlock title="cURL" code={curl(`${slug}/${example?.parentId ?? "{id}"}/${child.segment}?limit=1`)} />
            <ExampleResponse
              resource={child.sub.resource}
              live={example !== null}
              body={example && { data: [example.row], pagination: { limit: 1, offset: 0, total: example.total, has_more: example.total > 1 } }}
            />
          </DocsSection>
        );
      })}

      {/* Pager. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}
