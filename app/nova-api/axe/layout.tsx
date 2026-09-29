/*
  The gate for /nova-api/axe, the Nova admin portal.

  THE GATE LIVES IN A LAYOUT, matching /axe and /Finathon/axe/26, so anything
  added under this path later is behind the password by default rather than by
  its author remembering to add a check. The page ALSO re-checks before it
  queries, and every Server Action re-checks before it reads or writes —
  because this layout not rendering {children} is a rendering property, not an
  access check, and actions bypass rendering entirely.

  Wrapped by app/nova-api/layout.tsx (owned elsewhere); nothing here assumes
  anything about that wrapper beyond it rendering its children.
*/

// Metadata type for the robots / title export.
import type { Metadata } from "next";
// Nav icons, so the sidebar scans by shape as well as by word. Passed straight
// through: NovaShell is a server component, so no client boundary is crossed.
import { BarChart3, BookOpen, KeyRound, ListChecks } from "lucide-react";

// The password form, rendered INSTEAD of the portal when there is no session.
import NovaAdminGateForm from "@/components/nova/admin/NovaAdminGateForm";
// The shared portal shell, built once for both Nova portals so they cannot drift.
import { NovaShell, type NovaNavSection } from "@/components/nova/shell/NovaShell";
// The session check.
import { hasNovaAdminSession } from "@/lib/nova/adminGate";

// Handed to the shell's sign-out button; a Server Action, so it is a POST that a
// prefetch or a crawler can never trigger.
import { signOutNovaAdmin } from "./actions";

// node:crypto (HMAC verify, scrypt) is unavailable on Edge.
export const runtime = "nodejs";

// Never prerendered: a static gate would bake one visitor's auth state into
// HTML served to everyone after.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // noindex AND nofollow. Not listed in robots.txt, which is public and would
  // advertise the path to exactly the people it is hidden from.
  robots: { index: false, follow: false },
  // Opaque tab title, readable over a shoulder without saying what this is.
  title: "axe",
};

// Module-level constant: the nav never changes per request, so it is not rebuilt.
const SECTIONS: NovaNavSection[] = [
  {
    // The three admin routes, in the order an admin checks them: health first.
    title: "Admin",
    items: [
      { href: "/nova-api/axe", label: "Overview", icon: BarChart3 },
      { href: "/nova-api/axe/allowlist", label: "Allowlist", icon: ListChecks },
      { href: "/nova-api/axe/keys", label: "API keys", icon: KeyRound },
    ],
  },
  {
    // Its own section so it reads as "leave the admin area", not a fourth admin page.
    title: "Nova",
    items: [{ href: "/nova-api/dashboard", label: "Developer portal", icon: BookOpen }],
  },
];

export default async function NovaAdminLayout({ children }: { children: React.ReactNode }) {
  // One check per render; cheap (an HMAC), no database.
  const authenticated = await hasNovaAdminSession();

  // {children} is deliberately not rendered here, so the page's queries never
  // run for an unauthenticated visitor and no admin data is in the response.
  if (!authenticated) {
    return <NovaAdminGateForm />;
  }

  // Every admin route (Overview, Allowlist, API keys) renders inside the shell,
  // so the sidebar is written once here rather than per page.
  // userLabel is a role, not an identity: the admin gate has one shared password.
  return (
    <NovaShell product="Nova admin" sections={SECTIONS} userLabel="Admin" signOutAction={signOutNovaAdmin}>
      {children}
    </NovaShell>
  );
}
