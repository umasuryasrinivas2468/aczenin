/*
  Signed-in frame for the Nova developer portal: API keys, usage and the docs.

  A ROUTE GROUP, so "(portal)" never appears in a URL — /nova-api/dashboard
  and /nova-api/docs/* keep their paths, while the sign-in page at /nova-api
  stays OUTSIDE this gate (it would otherwise redirect to itself forever).

  THE GATE LIVES IN THE LAYOUT, so every page added under the group is private
  by default. It is not the only check: layouts and pages render in parallel
  and Server Actions skip rendering entirely, so pages that read per-user data
  and every action re-check the session themselves.
*/

// Server-side redirect for visitors without a session.
import { redirect } from "next/navigation";
// Icons for the Workspace links; doc links stay text-only to keep the nav quiet.
import { Activity, KeyRound } from "lucide-react";

// The shared app frame (sidebar + mobile sheet).
import { NovaShell, type NovaNavSection } from "@/components/nova/shell/NovaShell";
// Session lookup (hashes the cookie, looks up the row; never throws).
import { getPortalUser } from "@/lib/nova/portalAuth";
// The resource registry. Pure data modules (no DB, no secrets), so reading
// them in this server layout ships nothing to the browser but the links.
import { RESOURCES } from "@/lib/nova/resources";
import { BANKING_RESOURCES } from "@/lib/nova/resources.banking";
import { ORG_RESOURCES } from "@/lib/nova/resources.org";
import { PAYABLES_RESOURCES } from "@/lib/nova/resources.payables";
import { PROCUREMENT_RESOURCES } from "@/lib/nova/resources.procurement";
// Sign-out, posted from the sidebar footer.
import { signOutAction } from "../actions";

// node:crypto is reached through portalAuth; Edge does not provide it.
export const runtime = "nodejs";

// Session-derived output must never be prerendered or cached across users.
export const dynamic = "force-dynamic";

// "purchase-orders" → "Purchase orders": the URL key is the single source of
// truth, so a new registry entry needs no label written anywhere else.
function labelFor(key: string): string {
  // Hyphens become spaces; only the first letter is capitalised (sentence case,
  // the house style for nav labels).
  const words = key.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// One nav section per registry domain, links in registry (insertion) order.
function resourceSection(title: string, keys: string[]): NovaNavSection {
  return {
    title,
    // Folded by default; NovaNavGroup opens whichever group holds the page.
    collapsible: true,
    items: keys.map((key) => ({ href: `/nova-api/docs/${key}`, label: labelFor(key) })),
  };
}

// Keys owned by a domain file. "Books" is everything else in RESOURCES — the
// core nine are not exported on their own, and deriving them this way means a
// core resource added later still lands in Books automatically.
const DOMAIN_KEYS = new Set(
  [ORG_RESOURCES, PROCUREMENT_RESOURCES, PAYABLES_RESOURCES, BANKING_RESOURCES].flatMap((map) => Object.keys(map)),
);
// RESOURCES is merged core-first, so filtering it keeps the core's own order.
const BOOKS_KEYS = Object.keys(RESOURCES).filter((key) => !DOMAIN_KEYS.has(key));

// The whole portal nav. Routes must match what the docs and usage agents build.
const PORTAL_NAV: NovaNavSection[] = [
  {
    // Things the developer manages, first — it is why they signed in.
    title: "Workspace",
    items: [
      { href: "/nova-api/dashboard", label: "API keys", icon: KeyRound },
      { href: "/nova-api/usage", label: "Usage & logs", icon: Activity },
    ],
  },
  {
    // Concepts, in the order a first integration needs them.
    title: "Documentation",
    items: [
      { href: "/nova-api/docs", label: "Introduction" },
      { href: "/nova-api/docs/authentication", label: "Authentication" },
      { href: "/nova-api/docs/filtering", label: "Filtering & pagination" },
      { href: "/nova-api/docs/errors", label: "Errors" },
      { href: "/nova-api/docs/rate-limits", label: "Rate limits" },
    ],
  },
  // Endpoint families, grouped as in the build contract. Empty domains are
  // dropped by NovaShell, so a stub domain file shows no heading.
  resourceSection("Books", BOOKS_KEYS),
  resourceSection("Organisation", Object.keys(ORG_RESOURCES)),
  resourceSection("Procurement", Object.keys(PROCUREMENT_RESOURCES)),
  resourceSection("Payables & controls", Object.keys(PAYABLES_RESOURCES)),
  resourceSection("Banking & treasury", Object.keys(BANKING_RESOURCES)),
];

export default async function NovaPortalLayout({ children }: { children: React.ReactNode }) {
  // Null when signed out, expired, or the DB is unreachable.
  const user = await getPortalUser();
  // redirect() throws, so no portal markup renders for a signed-out visitor.
  if (!user) redirect("/nova-api");

  return (
    <NovaShell product="Nova API" sections={PORTAL_NAV} userLabel={user.email} signOutAction={signOutAction}>
      {children}
    </NovaShell>
  );
}
