/*
  Typography and layout primitives shared by every /nova-api/docs page.

  One file, not one per component: each is a few lines of markup, and keeping
  them side by side is what keeps the docs' type scale consistent. All are
  Server Components, so the docs ship no JavaScript beyond the copy buttons.
*/

// Next's Link, so docs-to-docs navigation stays client-side inside the shell.
import Link from "next/link";
// Icons for callout tones and the pager arrows; lucide is the repo's icon set.
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Lightbulb } from "lucide-react";

// Repo's class merger, so callers can extend a primitive's classes safely.
import { cn } from "@/lib/utils";

// --- Page header --------------------------------------------------------------

// The reference's hero shape: mono eyebrow, large title, muted lead.
export function DocsHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: React.ReactNode }) {
  return (
    // Bottom border separates the header from the body like a docs masthead.
    <header className="space-y-3 border-b pb-8">
      {/* orange-700 rather than the raw brand orange: #ff914d on white fails
          contrast at 12px, the darker shade of the same hue passes. */}
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-orange-700 dark:text-primary">
        {eyebrow}
      </p>
      {/* One h1 per page; text-balance keeps two-line titles even. */}
      <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {/* max-w-prose: long lines are the main readability cost at 1366px. */}
      <div className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">{lead}</div>
    </header>
  );
}

// --- Sections -----------------------------------------------------------------

// A titled section; id makes every heading deep-linkable from other pages.
export function DocsSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    // scroll-mt so an anchor jump does not hide the heading under a sticky bar.
    <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-24 space-y-4">
      {/* The anchor link on the heading is the "copy link to section" affordance. */}
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight sm:text-2xl">
        <a href={`#${id}`} className="hover:underline hover:decoration-primary hover:underline-offset-4">
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}

// Body paragraph: one class set so every page reads at the same measure.
export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  // Muted body text keeps code and headings as the visual anchors.
  return <p className={cn("max-w-prose leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

// Inline code: tinted chip so identifiers stand out in running text.
export function C({ children }: { children: React.ReactNode }) {
  // break-words: long identifiers must wrap rather than widen a phone layout.
  return <code className="break-words rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
}

// --- Callout ------------------------------------------------------------------

// Tone → icon and colours. Blue for info (the brand secondary), amber for
// warnings, orange (brand primary) for tips.
const CALLOUT_TONES = {
  info: { icon: Info, box: "border-secondary/40 bg-secondary/5", iconClass: "text-secondary" },
  warning: { icon: AlertTriangle, box: "border-amber-500/50 bg-amber-500/10", iconClass: "text-amber-600 dark:text-amber-400" },
  tip: { icon: Lightbulb, box: "border-primary/50 bg-primary/10", iconClass: "text-orange-700 dark:text-primary" },
} as const;

// Highlighted aside for the facts integrators most often get wrong.
export function Callout({
  // Picks icon and colour; defaults to the calm one.
  tone = "info",
  // Bold lead-in so the point is scannable without reading the body.
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  title: string;
  children: React.ReactNode;
}) {
  // Resolved once so the markup below stays tone-agnostic.
  const { icon: Icon, box, iconClass } = CALLOUT_TONES[tone];
  return (
    // role="note": an aside, not an alert — it must not interrupt screen readers.
    <div role="note" className={cn("flex gap-3 rounded-lg border p-4", box)}>
      {/* Icon is decorative; the title carries the meaning. */}
      <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} />
      {/* min-w-0 so long inline code inside wraps instead of overflowing. */}
      <div className="min-w-0 space-y-1 text-sm leading-relaxed">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

// --- Endpoint badge -----------------------------------------------------------

// "GET /invoices/{id}" pill. The API is read-only, so GET is the only verb.
export function EndpointBadge({ path, method = "GET" }: { path: string; method?: "GET" | "HEAD" }) {
  return (
    // inline-flex + max-w-full: fits on one line when it can, wraps when not.
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border bg-card px-2.5 py-1 font-mono text-sm">
      {/* Green verb chip, the convention every API reference uses for reads. */}
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        {method}
      </span>
      {/* break-all: paths have no spaces, so this is the only way they wrap. */}
      <span className="min-w-0 break-all">{path}</span>
    </span>
  );
}

// --- Table --------------------------------------------------------------------

// Generic docs table. Scrolls inside its own border so a wide table never
// makes the page scroll sideways at 390px.
export function ParamTable({ head, rows, minWidth = "36rem" }: { head: string[]; rows: React.ReactNode[][]; minWidth?: string }) {
  return (
    // tabIndex + label: a scrollable region must be keyboard reachable and named.
    <div tabIndex={0} role="region" aria-label={`${head.join(", ")} table`} className="min-w-0 overflow-x-auto rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {/* min-width keeps columns legible; the wrapper above absorbs the excess. */}
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {/* scope=col so each cell is announced with its column name. */}
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-4 py-2.5 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {/* Index keys are fine: rows are static and never reorder. */}
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5">
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

// --- Prev / next pager ----------------------------------------------------------

// A link target for the pager and the index cards.
export type DocsLink = { href: string; label: string };

// Bottom-of-page navigation so the docs read front to back without the sidebar.
export function DocsPager({ prev, next }: { prev?: DocsLink; next?: DocsLink }) {
  return (
    // nav landmark with a label, distinct from the shell's sidebar nav.
    <nav aria-label="Docs pages" className="grid gap-3 border-t pt-8 sm:grid-cols-2">
      {/* Empty div keeps "next" in the right column when there is no prev. */}
      {prev ? <PagerCard link={prev} direction="prev" /> : <div className="hidden sm:block" />}
      {next && <PagerCard link={next} direction="next" />}
    </nav>
  );
}

// One pager card; direction decides arrow side and alignment.
function PagerCard({ link, direction }: { link: DocsLink; direction: "prev" | "next" }) {
  // Computed once for the three places it matters.
  const isNext = direction === "next";
  return (
    <Link
      href={link.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-4 transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Next sits right-aligned so the reading direction is obvious.
        isNext && "justify-end text-right",
      )}
    >
      {/* Arrow before the label for prev. */}
      {!isNext && <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />}
      <span className="min-w-0">
        {/* Small caption tells the direction without relying on the arrow. */}
        <span className="block text-xs text-muted-foreground">{isNext ? "Next" : "Previous"}</span>
        <span className="block font-medium">{link.label}</span>
      </span>
      {/* Arrow after the label for next. */}
      {isNext && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />}
    </Link>
  );
}

// Page body wrapper: one vertical rhythm for every docs page.
export function DocsArticle({ children }: { children: React.ReactNode }) {
  // min-w-0 is the load-bearing class: without it a wide <pre> inside a flex
  // parent sets the column's width and the whole page scrolls sideways.
  return <article className="min-w-0 space-y-12 pb-12">{children}</article>;
}
