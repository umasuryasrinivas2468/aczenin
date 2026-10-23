/*
  Dark terminal-style code window for the Nova docs, modelled on the
  dashboard.aczen.in/docs/api quick-start panel (title bar, dots, copy).

  A Server Component on purpose: only the copy button needs the browser, so
  it is the one client island and the code itself ships as static HTML.
*/

// Existing portal copy button, reused rather than a second clipboard helper.
import CopyButton from "@/components/nova/portal/CopyButton";

// Props kept to the three things every call site actually varies.
type CodeBlockProps = {
  // The exact text shown AND copied, so the two can never differ.
  code: string;
  // Title-bar label, e.g. "cURL" or "Response 200"; also the accessible name.
  title: string;
  // Hides the copy button for non-runnable snippets (headers, envelopes).
  copyable?: boolean;
};

export function CodeBlock({ code, title, copyable = true }: CodeBlockProps) {
  return (
    // figure/figcaption gives the block an accessible name; min-w-0 lets it
    // shrink inside flex/grid parents instead of pushing the page wider.
    <figure className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
      {/* Title bar: the three dots are decoration, so screen readers skip them. */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-2">
        {/* Traffic-light dots, the reference's visual cue for "terminal". */}
        <span aria-hidden="true" className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </span>
        {/* truncate: a long title must never widen the block on a phone. */}
        <figcaption className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400">{title}</figcaption>
        {/* Copy only where pasting the snippet is the point. */}
        {copyable && <CopyButton value={code} />}
      </div>
      {/* overflow-x-auto scrolls long lines INSIDE the block; tabIndex lets
          keyboard users focus it and scroll with the arrow keys. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-[13px]"
      >
        {/* <code> for semantics; whitespace is preserved by <pre>. */}
        <code className="font-mono">{code}</code>
      </pre>
    </figure>
  );
}
