"use client";

/*
  Console chrome: a fixed left rail on desktop, a slide-over on mobile. The
  active item is marked with the brand orange and aria-current.
*/

import { motion } from "framer-motion";
import { BarChart3, BookOpen, KeyRound, LayoutDashboard, Menu, ScrollText, SlidersHorizontal, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import SignOutButton from "@/components/ai-studio/SignOutButton";
import { Wordmark } from "@/components/ai-studio/ui";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: "overview" | "keys" | "usage" | "docs" | "account" | "users" | "controls" | "audit";
}

const ICONS = {
  overview: LayoutDashboard,
  keys: KeyRound,
  usage: BarChart3,
  docs: BookOpen,
  account: UserRound,
  users: Users,
  controls: SlidersHorizontal,
  audit: ScrollText,
};

export const STUDIO_NAV: NavItem[] = [
  { href: "/ai-studio", label: "Overview", icon: "overview" },
  { href: "/ai-studio/keys", label: "API keys", icon: "keys" },
  { href: "/ai-studio/usage", label: "Usage & logs", icon: "usage" },
  { href: "/ai-studio/quickstart", label: "Quickstart", icon: "docs" },
  { href: "/ai-studio/account", label: "Account", icon: "account" },
];

function isActive(pathname: string, href: string, root: string): boolean {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

export default function StudioShell({
  nav,
  root,
  who,
  whoDetail,
  badge,
  banners,
  signOut,
  children,
}: {
  nav: NavItem[];
  root: string;
  who: string;
  whoDetail?: string | null;
  badge?: ReactNode;
  banners?: ReactNode;
  signOut: { endpoint: string; method: "POST" | "DELETE"; redirectTo: string };
  children: ReactNode;
}) {
  const pathname = usePathname() ?? root;
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const rail = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href={root} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smebank-500">
          <Wordmark />
        </Link>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {badge && <div className="px-5 pb-2">{badge}</div>}
      <nav aria-label="AI Studio" className="flex-1 space-y-0.5 px-3 py-3">
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href, root);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smebank-500",
                active ? "text-slate-900" : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`nav-${root}`}
                  className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-200"
                  aria-hidden
                />
              )}
              {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-smeorange-500" aria-hidden />}
              <Icon className={cn("relative h-[18px] w-[18px]", active ? "text-smeorange-600" : "text-slate-400")} aria-hidden />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200/80 p-4">
        <p className="truncate text-sm font-medium text-slate-800" title={who}>{who}</p>
        {whoDetail && <p className="truncate text-xs text-slate-500">{whoDetail}</p>}
        <SignOutButton
          withIcon
          endpoint={signOut.endpoint}
          method={signOut.method}
          redirectTo={signOut.redirectTo}
          className="mt-3 inline-flex items-center gap-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smebank-500"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-[#f3f5f9] lg:block">{rail}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="absolute inset-y-0 left-0 w-72 border-r border-slate-200 bg-[#f3f5f9]"
          >
            {rail}
          </motion.aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Wordmark />
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
          {banners && <div className="mb-6 space-y-3">{banners}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
