/*
  /nova-api/docs — Introduction. Rendered inside the (portal) shell, which
  owns the sidebar, the session check and the max-w container; this page
  renders content only.
*/

// Metadata type for the tab title.
import type { Metadata } from "next";
// Client-side links between docs pages.
import Link from "next/link";
// Card icon for the resource grid.
import { ArrowRight } from "lucide-react";

// Shared docs typography and blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, P, ParamTable } from "@/components/nova/docs/primitives";
// Constants and prose that are not in the registry.
import { BASE_URL, DOCS_ROOT, GUIDE_PAGES, KEYS_PAGE, RESOURCE_DOCS, SAMPLE_KEY, TEAM_SLICE_COUNT, TEAM_SLICE_ROWS, curl, pagerFor } from "@/components/nova/docs/content";
// The registry: the resource list shown below is its keys, not a hand copy.
import { RESOURCES } from "@/lib/nova/resources";

// "Introduction | Nova API" via the section's title template.
export const metadata: Metadata = { title: "Introduction" };

// The three calls that prove a setup works, as one pasteable script.
const QUICK_START = [
  // /health needs no key, so it isolates network problems from auth problems.
  "# 1. Confirm the API is reachable (no key needed)",
  `curl ${BASE_URL}/health`,
  "",
  // /me isolates auth: a 200 here means the key is right.
  "# 2. Confirm your key works",
  `curl ${BASE_URL}/me \\`,
  `  -H "Authorization: Bearer ${SAMPLE_KEY}"`,
  "",
  // A real read with a filter, the shape of every call after this one.
  "# 3. Read some invoices",
  curl("invoices?status=overdue&limit=5"),
].join("\n");

export default function NovaDocsIntroductionPage() {
  // Neighbours for the bottom pager, from the shared reading order.
  const pager = pagerFor(DOCS_ROOT);
  return (
    <DocsArticle>
      {/* Hero: what Nova is in one breath. */}
      <DocsHeader
        eyebrow="Nova API · REST · v1 · read-only"
        title="Aczen books, one request away."
        lead={
          <>
            Nova is a read-only sandbox of Aczen accounting data: invoices, clients, bills, expenses and stock. Each team
            reads <strong className="text-foreground">its own slice of dummy books</strong>, so you can build and test
            an integration without touching real ones.
          </>
        }
      />

      {/* Base URL, with the www caveat right next to it where it will be seen. */}
      <DocsSection id="base-url" title="Base URL">
        <CodeBlock title="Base URL" code={BASE_URL} />
        <Callout tone="warning" title="Use www.aczen.in, not aczen.in">
          The apex domain redirects to <C>www.aczen.in</C>, and HTTP clients drop the <C>Authorization</C> header when a
          redirect changes host. A base URL without <C>www</C> therefore answers every authenticated call with a 401.
        </Callout>
      </DocsSection>

      {/* Quick start: health → me → invoices. */}
      <DocsSection id="quick-start" title="Quick start">
        <P>
          Create a key on the <Link href={KEYS_PAGE} className="font-medium text-foreground underline underline-offset-4 hover:decoration-primary">API keys page</Link>,
          then run these three calls. Every request is a plain HTTPS <C>GET</C>; responses are JSON.
        </P>
        <CodeBlock title="quick start · cURL" code={QUICK_START} />
      </DocsSection>

      {/* What the sandbox promises, so nobody builds against a wrong assumption. */}
      <DocsSection id="sandbox" title="How the sandbox behaves">
        <ul className="max-w-prose list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          {/* Read-only is the headline guarantee. */}
          <li>
            <strong className="text-foreground">Read-only.</strong> Only <C>GET</C>, <C>HEAD</C> and <C>OPTIONS</C> are
            answered; any write returns <C>405 method_not_allowed</C>.
          </li>
          {/* Determinism is what makes assertions against the data safe. */}
          <li>
            <strong className="text-foreground">Deterministic.</strong> A reseed reproduces the same rows in the same
            slices, so you can write assertions against your team&apos;s data.
          </li>
          {/* Relative dates explain why "overdue" changes over time. */}
          <li>
            <strong className="text-foreground">Always current.</strong> Dates are relative to the day the data was
            loaded, so unpaid invoices age into <C>overdue</C> naturally.
          </li>
          {/* Indian GST context, so the tax fields make sense on first read. */}
          <li>
            <strong className="text-foreground">Indian GST.</strong> Amounts are INR with the CGST + SGST (intra-state)
            or IGST (inter-state) split on every document.
          </li>
        </ul>
      </DocsSection>

      {/* Per-team slice: the first thing that surprises a team comparing notes. */}
      <DocsSection id="team-data" title="Your team's data">
        <P>
          Every allowlisted email belongs to a team, and each team reads its own coherent set of books: a handful of
          clients and vendors with the invoices, payments, bills and stock that belong to them. The first{" "}
          {TEAM_SLICE_COUNT} teams get distinct data; team {TEAM_SLICE_COUNT + 1} onwards reuse an earlier slice.
        </P>
        <ParamTable
          head={["Resource", "Rows per team (about)"]}
          minWidth="18rem"
          rows={TEAM_SLICE_ROWS.map((row) => [
            // Resource path, so the table doubles as a sanity check for a first call.
            <code key="r" className="font-mono text-xs">{row.path}</code>,
            <span key="n" className="text-muted-foreground">{row.rows}</span>,
          ])}
        />
        <Callout tone="info" title="The slice is fixed server-side">
          The team filter is applied before your own filters and cannot be changed or widened by any query parameter.
          Requesting another team&apos;s row by id returns <C>404 resource_not_found</C>, exactly like an id that does
          not exist. <C>/me</C> reports your <C>team_slot</C> and <C>dataset_slice</C>, so two teams sharing a slice can
          tell.
        </Callout>
      </DocsSection>

      {/* Guide pages, skipping this one. */}
      <DocsSection id="guides" title="Guides">
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDE_PAGES.filter((page) => page.href !== DOCS_ROOT).map((page) => (
            <DocsCard key={page.href} href={page.href} label={page.label} />
          ))}
        </div>
      </DocsSection>

      {/* Resources: iterated from the REGISTRY so a new resource shows up here
          automatically (and fails loudly if it has no prose yet). */}
      <DocsSection id="resources" title="Resources">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.keys(RESOURCES).map((slug) => (
            <DocsCard key={slug} href={`${DOCS_ROOT}/${slug}`} label={RESOURCE_DOCS[slug]?.title ?? slug} hint={`/${slug}`} />
          ))}
        </div>
      </DocsSection>

      {/* Front-to-back reading without the sidebar. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}

// A link card for the guide and resource grids.
function DocsCard({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    // Whole card is the link: a bigger target on touch screens.
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* min-w-0 so a long path hint truncates instead of widening the grid. */}
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {/* The URL segment, so the card doubles as an endpoint index. */}
        {hint && <span className="block truncate font-mono text-xs text-muted-foreground">{hint}</span>}
      </span>
      {/* Arrow nudges right on hover as the "go" cue. */}
      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
