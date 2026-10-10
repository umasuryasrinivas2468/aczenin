/*
  The gate and shell for every /axe section.

  THE GATE LIVES HERE, IN A LAYOUT, SO IT CANNOT BE FORGOTTEN. A new section
  added under app/axe/ is behind the password by default rather than by the
  author remembering to add a check — which is the failure mode that leaves one
  route of a private dashboard open.

  The pages underneath ALSO check the cookie before they query. That duplication
  is intentional: this layout not rendering {children} is what stops the page
  component from ever executing, and that is a property of how React renders an
  unused element rather than an explicit access check. Defence in depth means
  the data fetch does not rely on a subtlety of the framework to stay private.
*/

import type { Metadata } from "next";
import { cookies } from "next/headers";

import AxeGateForm from "@/components/axe/AxeGateForm";
import AxeNav from "@/components/axe/AxeNav";
import AxeVizTheme from "@/components/axe/AxeVizTheme";
import { AXE_COOKIE_NAME, verifySessionCookie } from "@/lib/axe/session";

// node:crypto is used by the cookie verification below, which the Edge runtime
// cannot provide.
export const runtime = "nodejs";

// Never prerendered. A statically generated gate would bake in one visitor's
// authentication state and serve it to everyone who followed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // noindex AND nofollow. Per section 6 of the design doc this is deliberately
  // NOT added to robots.txt — robots.txt is a public file, so listing the path
  // there would advertise it to exactly the people it is hidden from. A meta
  // directive is read by crawlers without being published to humans.
  robots: { index: false, follow: false },
  // A title that says nothing. "Founder analytics" in a browser tab is readable
  // over a shoulder in a coffee shop; a single letter is not.
  title: "axe",
};

export default async function AxeLayout({ children }: { children: React.ReactNode }) {
  // Awaited because cookies() is async in Next 15 — the synchronous form is the
  // Next 14 API and silently yields a Promise object here rather than a store.
  const cookieStore = await cookies();
  const authenticated = verifySessionCookie("axe", cookieStore.get(AXE_COOKIE_NAME)?.value);

  // {children} is deliberately NOT rendered on this branch. The page element is
  // created by the framework and passed in, but React only invokes a component
  // when it is actually rendered — so leaving it out means the Overview's
  // database queries never run for an unauthenticated visitor, and no analytics
  // data exists anywhere in the response to be recovered.
  if (!authenticated) {
    return <AxeGateForm />;
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Mounted once at the shell so every chart in every section resolves the
          same palette variables. Putting it in each chart would duplicate the
          rules and let two sections drift apart. */}
      <AxeVizTheme />

      <header className="mb-4">
        {/* Still just "axe". The gate is passed, but the page title has no
            reason to become more descriptive than the URL already is. */}
        <h1 className="text-xl font-semibold tracking-tight">axe</h1>
        <p className="text-sm text-muted-foreground">First-party analytics for aczen.in</p>
      </header>

      <AxeNav />

      {/* The section itself. Rendered only on this branch, i.e. only after the
          cookie verified. */}
      <main className="pt-6">{children}</main>
    </div>
  );
}
