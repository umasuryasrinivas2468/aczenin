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
// Sign-out, posted from the sidebar footer.
import { signOutAction } from "../actions";

// node:crypto is reached through portalAuth; Edge does not provide it.
export const runtime = "nodejs";

// Session-derived output must never be prerendered or cached across users.
export const dynamic = "force-dynamic";

// Resource pages share one URL scheme; listed once so label and slug stay paired.
const RESOURCES: [label: string, slug: string][] = [
  ["Invoices", "invoices"],
  ["Clients", "clients"],
  ["Quotations", "quotations"],
  ["Payments", "payments"],
  ["Vendors", "vendors"],
  ["Purchase bills", "purchase-bills"],
  ["Expenses", "expenses"],
  ["Inventory", "inventory"],
];

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
  {
    // One page per endpoint family.
    title: "Resources",
    items: RESOURCES.map(([label, slug]) => ({ href: `/nova-api/docs/${slug}`, label })),
  },
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
