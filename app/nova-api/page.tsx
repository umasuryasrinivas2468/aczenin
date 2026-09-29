/*
  /nova-api — the sign-in screen. Nothing else: no marketing hero, no site
  Navbar/Footer. The docs moved behind sign-in, into the (portal) shell.

  A Server Component so the session is read before any HTML is sent: a
  signed-in developer is redirected straight to the app with no flash of the
  form. It sits OUTSIDE the (portal) route group on purpose — inside it, the
  group's gate would redirect signed-out visitors here, i.e. to itself.
*/

// Page metadata type.
import type { Metadata } from "next";
// Server-side redirect for developers who are already signed in.
import { redirect } from "next/navigation";

// The email + password form, with the brand header built in.
import SignInCard from "@/components/nova/portal/SignInCard";
// Server-side session read (hashes the cookie, looks up the row).
import { getPortalUser } from "@/lib/nova/portalAuth";

// node:crypto is reached through portalAuth; Edge does not provide it.
export const runtime = "nodejs";

// Reads the session cookie, so it must render per request.
export const dynamic = "force-dynamic";

// Still indexable (the entry point people are sent to), with the canonical
// pinned to the lowercase URL middleware.ts normalises every casing to.
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Nova, Aczen's read-only accounting data API. Access is invite-only.",
  alternates: { canonical: "/nova-api" },
};

export default async function NovaSignInPage() {
  // Null when signed out, expired, or the DB is unreachable (never throws).
  const user = await getPortalUser();
  // Already signed in → straight into the app. redirect() throws, so the
  // form below is never rendered for them.
  if (user) redirect("/nova-api/dashboard");

  return (
    // min-h-dvh + grid centring: the card sits dead centre on a laptop and
    // still scrolls (instead of clipping) on a short landscape phone.
    // The faint top wash is the smebank tint the old hero used, kept for continuity.
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-smebank-50/60 to-background px-4 py-10">
      {/* 24rem wide max: a comfortable form width, full-width minus gutter on phones. */}
      <div className="w-full max-w-sm">
        <SignInCard />
      </div>
    </main>
  );
}
