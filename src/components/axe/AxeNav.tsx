"use client";

/*
  The section nav for /axe.

  Client Component for exactly one reason: usePathname, which is what marks the
  active section. Everything else here is static markup — had the active state
  been derivable on the server, this would not need to be a client component at
  all.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/*
  The sections, as data rather than repeated JSX.

  Ordered deliberately: Overview first because it is the default landing view,
  and because the aggregate numbers are what the founder opens the dashboard
  for. Leads is the drill-down.
*/
const SECTIONS = [
  { href: "/axe", label: "Overview" },
  { href: "/axe/leads", label: "Leads" },
];

export default function AxeNav() {
  const pathname = usePathname();

  return (
    // A real <nav> with a label, so assistive tech announces it as navigation
    // and can jump to it — a bare div of links is invisible as a landmark.
    <nav aria-label="Dashboard sections" className="border-b">
      <div className="flex gap-1">
        {SECTIONS.map((section) => {
          // Exact equality, not startsWith. With startsWith, "/axe" would match
          // "/axe/leads" too and both tabs would light up at once — the standard
          // bug when the parent route is also a nav item.
          const active = pathname === section.href;

          return (
            <Link
              key={section.href}
              href={section.href}
              // aria-current is what conveys "you are here" to a screen reader.
              // The underline below conveys it visually; without this, only
              // sighted users get the information.
              aria-current={active ? "page" : undefined}
              className={cn(
                // A bottom border on every tab, transparent when inactive, so
                // the active tab does not shift its neighbours by 2px when it
                // gains a border.
                "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
