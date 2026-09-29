/*
  /nova-api — the public Nova API reference plus the sign-in card.

  A Server Component. The only client JavaScript is the sign-in card; the
  reference itself is static HTML. The session is read on the server so a
  signed-in developer sees "Go to dashboard" instead of the form, with no
  flash of the wrong state.
*/

// Page metadata type.
import type { Metadata } from "next";
// Client-side navigation for the dashboard link.
import Link from "next/link";

// Site chrome, rendered per page in this repo (see app/nova-api/layout.tsx).
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
// Static reference content and its section list for the on-page nav.
import ApiReference, { REFERENCE_SECTIONS } from "@/components/nova/portal/ApiReference";
// The email → code form.
import SignInCard from "@/components/nova/portal/SignInCard";
// House button, used as a link for the signed-in state.
import { Button } from "@/components/ui/button";
// Server-side session read (hashes the cookie, looks up the row).
import { getPortalUser } from "@/lib/nova/portalAuth";

// node:crypto is reached through portalAuth; Edge does not provide it.
export const runtime = "nodejs";

// Indexable on purpose (public docs); canonical pins the lowercase URL that
// middleware.ts canonicalises every casing to.
export const metadata: Metadata = {
  title: "Nova API — sandbox accounting API",
  description:
    "Nova is Aczen's read-only sandbox API: invoices, payments, quotations, bills, clients, vendors, expenses and inventory as JSON, one request away.",
  alternates: { canonical: "/nova-api" },
  openGraph: {
    title: "Nova API — sandbox books, one request away",
    description: "Read-only sandbox of Aczen's accounting API. Bearer-key auth, filters, pagination.",
    url: "/nova-api",
  },
};

export default async function NovaApiPage() {
  // Null when signed out, expired, or the DB is unreachable (never throws).
  const user = await getPortalUser();

  return (
    <>
      <Navbar />
      {/* pt-24 clears the fixed navbar, matching the site's other pages. */}
      <main className="bg-background pb-20 pt-24">
        {/* --- Hero + access card ------------------------------------------
            Two columns on desktop, stacked on phones with the pitch first. */}
        <section className="border-b bg-gradient-to-b from-smebank-50/70 to-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_24rem] lg:items-center">
            <div className="min-w-0 space-y-5">
              <p className="font-mono text-xs uppercase tracking-widest text-smebank-600">Developer preview</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                Nova API — sandbox books, one request away
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                A read-only sandbox of Aczen&apos;s accounting data: GST invoices, payments, quotations, purchase bills,
                clients, vendors, expenses and inventory. Same contract as the production API, so your integration
                moves over by swapping a URL and a key.
              </p>
              {/* The one line a developer wants first. */}
              <code className="inline-block max-w-full break-all rounded-md border bg-card px-3 py-2 font-mono text-sm">
                GET https://aczen.in/nova-api/v1/invoices
              </code>
            </div>

            {/* Signed in → a way onward; signed out → the form. Never both. */}
            <div className="w-full">
              {user ? (
                <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="break-all font-medium text-foreground">{user.email}</span>
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/nova-api/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              ) : (
                <SignInCard />
              )}
            </div>
          </div>
        </section>

        {/* --- Reference ---------------------------------------------------
            Sticky section nav on desktop; hidden on phones where the page is
            a single readable column anyway. */}
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[12rem_1fr]">
          <nav aria-label="API reference sections" className="hidden lg:block">
            <ul className="sticky top-28 space-y-2 text-sm">
              {REFERENCE_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ApiReference />
        </div>
      </main>
      <Footer />
    </>
  );
}
