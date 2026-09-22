import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/*
  The 404 surface for the Finathon subtree.

  Without it, a miss under /Finathon rendered app/not-found.tsx — a grey
  `bg-gray-100` card with "Oops! Page not found" — inside the root layout. That
  is a different site from the one the visitor was two seconds ago, and it
  arrives at the worst moment: the URL on the posters is /Finathon/register, so
  the people most likely to land on a miss here are people trying to pay.

  It also does a second job the generic page cannot. The generic 404 offers only
  "Return to Home", which sends someone who mistyped the register URL to the
  aczen.in marketing homepage and makes them find the event again. This one
  offers the two Finathon destinations that actually exist.
*/

export default function FinathonNotFound() {
  /*
    `fin` is load-bearing here, exactly as it is on the register page.

    Every token used below — --paper, --ink, --rule-strong — is declared only
    inside the `.fin {}` block of finathon.css. Without this class they are all
    undefined, and an undefined var inside a shorthand like
    `border: 1px solid var(--ink)` invalidates the WHOLE declaration rather than
    just the colour. That is how the register page lost its submit button: the
    .fin-cta background went with the border. A 404 with an invisible "back to
    Finathon" link would fail the same way, silently.

    The parent layout supplies the font variables; this element supplies `fin`,
    which is the division that keeps /Finathon/axe/26 out of the ledger styling.
  */
  return (
    <div className="fin min-h-screen">
      <Navbar />

      {/* The background is restated inline as well as by `.fin` because the
          root <body> has its own background, and `.fin` sits on a div that does
          not necessarily fill the viewport on a short page like this one. */}
      <main style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="fin-shell py-24 sm:py-32">
          {/* The status, set in the page's own meta style rather than as a huge
              "404" numeral. The ledger design language has a slot for a small
              uppercase marker and no slot for display-size numerals that are
              not the wordmark. */}
          <p className="fin-meta">Error 404</p>

          {/* The rule under the heading is the page's one structural idea —
              every section of /Finathon is separated by one of these, so the
              404 reads as a page of the same document rather than a stray. */}
          <h1
            className="fin-serif fin-h2 mt-4 border-b pb-6"
            style={{ borderColor: "var(--rule-strong)" }}
          >
            That page is not part of Finathon.
          </h1>

          <p className="fin-body mt-6">
            The address you followed does not exist. If you typed it from a
            poster, check the spelling — the two live pages are linked below.
            Registration and the event details are both still open.
          </p>

          {/* next/link rather than a plain anchor: unlike the root error
              boundary, nothing is known to be broken here — a 404 is a normal
              routing outcome — so client-side navigation is safe and keeps the
              already-loaded Finathon fonts and stylesheet warm. */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
            {/* The primary action, styled as the page's filled CTA. Registering
                is what most people reaching this URL were trying to do. */}
            <Link className="fin-cta" href="/Finathon/register">
              Register your team
            </Link>

            {/* The secondary route back, as the underlined ghost variant so the
                two actions are distinguishable by shape and not only by
                colour. */}
            <Link className="fin-cta-ghost" href="/Finathon">
              Finathon 2026 &mdash; event details
            </Link>
          </div>

          {/* The way out of the subtree entirely, kept small and last. Someone
              who wanted aczen.in rather than the hackathon should have an exit,
              but it is not what this page is for. */}
          <p className="fin-meta mt-16">
            <Link href="/">&larr; aczen.in</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
