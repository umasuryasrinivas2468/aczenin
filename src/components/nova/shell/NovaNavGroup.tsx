"use client";

/*
  A collapsible sidebar section, for the long registry-driven resource groups.

  Native <details>/<summary> rather than a Radix Collapsible: the browser
  gives keyboard toggling, the disclosure role and the open/closed state for
  free. A client island only because it must open itself when the current
  page is one of its links — a collapsed group hiding the active page would
  leave the developer with no "you are here".
*/

// Open state, and the reaction to route changes.
import { useEffect, useState } from "react";
// The current route, to decide whether this group holds the active page.
import { usePathname } from "next/navigation";
// Disclosure caret; rotates with the open state.
import { ChevronRight } from "lucide-react";

type NovaNavGroupProps = {
  // Section heading, shown in the <summary>.
  title: string;
  // Every link href in the group, so it can tell whether the page is inside.
  hrefs: string[];
  // The rendered link list.
  children: React.ReactNode;
};

// Same rule as NovaNavLink's prefix match: exact, or a nested page below it.
function holds(hrefs: string[], pathname: string): boolean {
  return hrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export default function NovaNavGroup({ title, hrefs, children }: NovaNavGroupProps) {
  // Null only during some static renders; treated as "nothing active".
  const pathname = usePathname() ?? "";
  // Starts open only around the active page, so the first paint (server HTML
  // included) already shows the "you are here" link and nothing else expanded.
  const [open, setOpen] = useState(() => holds(hrefs, pathname));

  // Navigating INTO this group (e.g. from a link in the docs body) opens it;
  // navigating away never closes it, since the user may have opened it on purpose.
  useEffect(() => {
    // Only ever sets true, so a manual close elsewhere is respected.
    if (holds(hrefs, pathname)) setOpen(true);
    // hrefs is a fresh array each render; its contents only change on deploy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    // onToggle keeps React state in step with a click on the native summary.
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="group">
      {/* list-none + the webkit rule hide the default marker; our caret replaces it. */}
      <summary className="flex h-7 cursor-pointer list-none items-center gap-1 rounded-md px-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {/* Rotates 90° when open: the conventional disclosure affordance. */}
        <ChevronRight aria-hidden className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90" />
        {/* truncate: "Payables & controls" must never wrap a 256px sidebar row. */}
        <span className="min-w-0 truncate">{title}</span>
      </summary>
      {/* Small top gap so the first link does not touch the heading. */}
      <div className="mt-0.5">{children}</div>
    </details>
  );
}
