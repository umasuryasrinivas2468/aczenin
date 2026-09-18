/*
  The gate for /Finathon/axe/26.

  THE GATE LIVES IN A LAYOUT, matching /axe, so anything added under this path
  later is behind the password by default rather than by the author remembering
  to add a check — the failure mode that leaves one route of a private dashboard
  open. The page underneath ALSO checks the session before it queries, because
  this layout not rendering {children} is a property of how React renders an
  unused element rather than an explicit access check, and a query that returns
  people's names and payment references should not rest on that.
*/

import type { Metadata } from "next";

import FinathonGateForm from "@/components/finathon/FinathonGateForm";
import { hasFinathonSession } from "@/lib/finathon/gate";

// node:crypto is used by the cookie verification, which Edge cannot provide.
export const runtime = "nodejs";

// Never prerendered: a statically generated gate would bake one visitor's
// authentication state into the HTML and serve it to everyone after.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // noindex AND nofollow. Deliberately NOT added to robots.txt — that file is
  // public, so listing the path there would advertise it to exactly the people
  // it is hidden from.
  robots: { index: false, follow: false },
  // A title that says nothing. "Finathon registrations" in a browser tab is
  // readable over a shoulder; a number is not.
  title: "26",
};

export default async function FinathonAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await hasFinathonSession();

  // {children} is deliberately not rendered on this branch, so the page's
  // database query never runs for an unauthenticated visitor and no
  // registration data exists anywhere in the response to be recovered.
  if (!authenticated) {
    return <FinathonGateForm />;
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Finathon registrations</h1>
        <p className="text-sm text-muted-foreground">
          Team leads, roll numbers and payment references for Finathon 2026
        </p>
      </header>

      <main>{children}</main>
    </div>
  );
}
