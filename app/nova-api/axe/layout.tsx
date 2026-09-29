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

// The password form, rendered INSTEAD of the portal when there is no session.
import NovaAdminGateForm from "@/components/nova/admin/NovaAdminGateForm";
// Button styling for the sign-out form.
import { Button } from "@/components/ui/button";
// The session check.
import { hasNovaAdminSession } from "@/lib/nova/adminGate";

// Sign-out is a plain form post to a Server Action; no client JS needed.
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

export default async function NovaAdminLayout({ children }: { children: React.ReactNode }) {
  // One check per render; cheap (an HMAC), no database.
  const authenticated = await hasNovaAdminSession();

  // {children} is deliberately not rendered here, so the page's queries never
  // run for an unauthenticated visitor and no admin data is in the response.
  if (!authenticated) {
    return <NovaAdminGateForm />;
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Title and sign-out share a row from sm up and stack on phones. */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nova API admin</h1>
          <p className="text-sm text-muted-foreground">Allowlist, API keys and usage</p>
        </div>
        {/* A form, not a link: sign-out changes state, so it must be a POST
            that a prefetch or a crawler can never trigger. */}
        <form action={signOutNovaAdmin}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <main className="space-y-6">{children}</main>
    </div>
  );
}
