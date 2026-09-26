import { Newsreader, Archivo } from "next/font/google";

import "./finathon.css";

/*
  Segment layout for /Finathon and everything beneath it.

  It exists to do exactly two things, and deliberately not a third.

  WHAT IT DOES
  1. Imports finathon.css once for the whole subtree, so the design tokens are
     present on any route under /Finathon — including app/Finathon/not-found.tsx,
     which has no page of its own to hang a stylesheet import on.
  2. Establishes the typographic environment: the two webfaces are instantiated
     here and exposed as the CSS variables finathon.css reads. Scoping them to
     this layout rather than the root layout means the rest of aczen.in still
     does not download two families it never uses.

  WHAT IT DELIBERATELY DOES NOT DO
  It does NOT put the `fin` class on the wrapper, even though `fin` is what
  activates every token in finathon.css and putting it here would look like the
  tidier design.

  The reason is /Finathon/axe/26. That subtree is the organisers' admin
  dashboard; it has its own layout and is built from the site's shadcn/Tailwind
  vocabulary, not from the ledger vocabulary. `.fin` sets background, color and
  font-family on whatever carries it, so hoisting it to this layout would
  restyle the dashboard from a route that has nothing to do with it — a
  cross-route regression introduced by a file neither dashboard author would
  think to look at.

  So `fin` stays opt-in, applied by each surface that wants it:
  src/views/Finathon.tsx:320 for the event page, app/Finathon/register/page.tsx
  for the form, and app/Finathon/not-found.tsx for the 404.
*/

const newsreader = Newsreader({
  subsets: ["latin"],
  // Variable axis range: display sizes take the light end, body copy the
  // regular. One file covers both, so the extra weights cost no extra requests.
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  // swap keeps text visible in the fallback face while the webfont loads,
  // rather than blocking first paint on it.
  display: "swap",
  variable: "--font-newsreader",
  fallback: ["ui-serif", "Georgia", "serif"],
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-archivo",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export default function FinathonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    A plain div carrying nothing but the two font-variable classes.

    Checked before adding it, because an extra wrapper is not always inert:
    src/components/Navbar.tsx and src/components/finathon/StickyRegisterBar.tsx
    are both `position: fixed`, and a fixed element is positioned against the
    nearest ancestor that has a transform, filter, perspective, contain or
    will-change — any of which would have re-anchored both of them to this div
    instead of the viewport. next/font's generated classes declare custom
    properties only, so none of those triggers is present and both stay pinned
    to the viewport.
  */
  return <div className={`${newsreader.variable} ${archivo.variable}`}>{children}</div>;
}
