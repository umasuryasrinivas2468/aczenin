/*
  /nova-api/docs — Introduction. Rendered inside the (portal) shell, which
  owns the sidebar, the session check and the max-w container; this page
  renders content only.
*/

// Metadata type for the tab title.
import type { Metadata } from "next";
// Client-side links between docs pages.
import Link from "next/link";
// Card icon for the resource grid; Bot and Download for the reference download card.
import { ArrowRight, Bot, Download } from "lucide-react";

// Shared docs typography and blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, P, ParamTable } from "@/components/nova/docs/primitives";
// Constants and prose that are not in the registry.
import { BASE_URL, DOCS_ROOT, GUIDE_PAGES, KEYS_PAGE, SAMPLE_KEY, curl, pagerFor, resourceDoc } from "@/components/nova/docs/content";
// Live per-team reads (slice, as-of date, counts), all fail-soft.
import { getTeamContext, sliceCounts } from "@/components/nova/docs/teamData";
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

export default async function NovaDocsIntroductionPage() {
  // Neighbours for the bottom pager, from the shared reading order.
  const pager = pagerFor(DOCS_ROOT);
  // The viewer's slice and the dataset's as-of date; null → generic copy.
  const team = await getTeamContext();
  // Live row counts for this team; empty when there is no team or every read failed.
  const counts = team ? await sliceCounts(team.slice) : [];
  return (
    <DocsArticle>
      {/* Hero: what Nova is in one breath. */}
      <DocsHeader
        eyebrow="Nova API · REST · v1 · read-only"
        title="Aczen books, one request away."
        lead={
          <>
            Nova is Aczen&apos;s read-only accounting data API: invoices, clients, bills, expenses and stock. Each team
            reads <strong className="text-foreground">its own set of books</strong>, delivered as JSON over a single
            authenticated endpoint.
          </>
        }
      />

      {/* Whole reference as one file, near the top so it is found before the reader starts clicking through. */}
      <DownloadReferenceCard />

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

      {/* What the API promises, so nobody builds against a wrong assumption. */}
      <DocsSection id="behaviour" title="How the API behaves">
        <ul className="max-w-prose list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          {/* Read-only is the headline guarantee. */}
          <li>
            <strong className="text-foreground">Read-only.</strong> Only <C>GET</C>, <C>HEAD</C> and <C>OPTIONS</C> are
            answered; any write returns <C>405 method_not_allowed</C>.
          </li>
          {/* Stability is what makes assertions against the data safe. */}
          <li>
            <strong className="text-foreground">Stable.</strong> Your team&apos;s data does not change between requests,
            so you can write assertions against it.
          </li>
          {/* A frozen clock explains why "overdue" never drifts between runs. */}
          <li>
            <strong className="text-foreground">Fixed as-of date.</strong> Overdue status and ageing are computed
            against the dataset&apos;s as-of date
            {/* The date itself only when migration 005 has added the column. */}
            {team?.asOfDate ? (
              <>
                , <C>{team.asOfDate}</C>
              </>
            ) : null}
            , not today&apos;s date, so the same query gives the same answer every day.
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
          clients and vendors with the invoices, payments, bills and stock that belong to them.
          {/* The slice count is live, so this sentence stays true after a reseed. */}
          {team && (
            <>
              {" "}The first {team.sliceCount} teams get distinct data; team {team.sliceCount + 1} onwards reuse an
              earlier slice. Your team reads slice <C>{String(team.slice)}</C>.
            </>
          )}
        </P>
        {/* Live counts for the viewer's slice; hidden entirely when none could be read. */}
        {counts.length > 0 && (
          <ParamTable
            head={["Resource", "Rows for your team"]}
            minWidth="18rem"
            rows={counts.map((row) => [
              // Resource path, so the table doubles as a sanity check for a first call.
              <code key="r" className="font-mono text-xs">{row.path}</code>,
              // Exact count(*) for this slice, the same total a list call reports.
              <span key="n" className="tabular-nums text-muted-foreground">{row.total.toLocaleString("en-IN")}</span>,
            ])}
          />
        )}
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
          automatically, titled by the prose map or its generated fallback. */}
      <DocsSection id="resources" title="Resources">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.keys(RESOURCES).map((slug) => (
            <DocsCard key={slug} href={`${DOCS_ROOT}/${slug}`} label={resourceDoc(slug).title} hint={`/${slug}`} />
          ))}
        </div>
      </DocsSection>

      {/* Front-to-back reading without the sidebar. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}

/*
  The full reference as one Markdown file (public/nova-api-docs.md, generated by
  scripts/nova-docs/build.mjs from the registry). Markdown, not PDF, because its
  second audience is AI coding assistants, which read .md natively.
*/
function DownloadReferenceCard() {
  return (
    // Brand-tinted panel so it reads as the page's one primary action, not another card in a grid.
    <section aria-labelledby="download-title" className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      {/* min-w-0 so the text wraps instead of pushing the button off a phone screen. */}
      <div className="min-w-0 space-y-1.5">
        {/* Mono eyebrow matches the DocsHeader eyebrow style. */}
        <p className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-orange-700 dark:text-primary">
          {/* Decorative: the text beside it says the same thing. */}
          <Bot aria-hidden="true" className="h-3.5 w-3.5" />
          Full reference · Markdown · v1
        </p>
        {/* The card's heading, labelled for the section. */}
        <h2 id="download-title" className="text-lg font-semibold tracking-tight">Every endpoint in one file</h2>
        {/* Who it is for, naming the tools so readers know it fits theirs. */}
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Guides, filters, errors and all resources, plus a rules section written for AI coding assistants. Drop it into
          Claude Code, Cursor, Antigravity or Copilot as context and they will code against Nova correctly.
        </p>
      </div>
      {/* Plain <a download>, not next/link: it is a static file to save, not a page to navigate to. */}
      <a
        href="/nova-api-docs.md"
        download="nova-api-docs.md"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Decorative: the label carries the meaning for screen readers. */}
        <Download aria-hidden="true" className="h-4 w-4" />
        Download .md
      </a>
    </section>
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
