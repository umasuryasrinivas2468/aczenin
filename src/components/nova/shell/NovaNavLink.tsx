"use client";

/*
  One sidebar link that highlights itself when it is the current page.

  A client island only because usePathname is a client hook. It receives its
  icon and label as already-rendered children, so no component function ever
  has to cross the server → client boundary (see NovaShell.tsx header).
*/

// Client-side navigation keeps the shell mounted between pages.
import Link from "next/link";
// The current route, for the active state.
import { usePathname } from "next/navigation";

// Shared class merger, so the active/idle variants compose cleanly.
import { cn } from "@/lib/utils";

type NovaNavLinkProps = {
  // Destination, also the key the active check compares against.
  href: string;
  // True for leaf links: stay active on nested pages (/docs/invoices/…).
  matchPrefix: boolean;
  // Icon + label, rendered by NovaShell.
  children: React.ReactNode;
};

export default function NovaNavLink({ href, matchPrefix, children }: NovaNavLinkProps) {
  // Null only during some static renders; treated as "nothing active".
  const pathname = usePathname() ?? "";
  // Exact match always counts; a nested path counts only for leaf links.
  const active = pathname === href || (matchPrefix && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      // Screen readers announce the current page, not just a colour change.
      aria-current={active ? "page" : undefined}
      className={cn(
        // 32px rows: the density of dashboard.aczen.in, and 14+ links still fit
        // a 768px laptop screen without the nav scrolling.
        "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
        // Visible focus ring for keyboard users, in the brand ring colour.
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Active: brand-orange tint with a darker orange label (smeorange-800
        // passes 4.5:1 on the tint; the raw #ff914d would not), idle: muted.
        active
          ? "bg-primary/10 font-medium text-smeorange-800"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {children}
    </Link>
  );
}
