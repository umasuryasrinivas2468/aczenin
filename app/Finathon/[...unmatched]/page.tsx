/*
  Catches every unmatched URL under /Finathon/* and hands it to the segment's
  own not-found page.

  WHY THIS FILE HAS TO EXIST AT ALL — this is the non-obvious part:

  `app/Finathon/not-found.tsx` does NOT automatically catch unmatched URLs under
  its segment. In the App Router a nested not-found.tsx only renders when
  something in that segment explicitly calls notFound(). A URL that matches no
  route at all never enters the segment in the first place, so it falls straight
  through to the ROOT app/not-found.tsx — losing the Finathon design language
  entirely, which is the whole reason the segment not-found was written.

  Verified against Next 15.5.15, not assumed: before this file existed,
  GET /Finathon/nonsense rendered the root "Oops! Page not found", byte for byte
  the same as GET /nonsense.

  A catch-all route is what turns "no route matched" into "a route matched and
  chose to 404", which is the condition not-found.tsx actually responds to.

  WHY THE MISS RATE IS REAL AND NOT HYPOTHETICAL: /Finathon/register is printed
  on physical posters. A mistyped path is a student who paid attention and still
  landed nowhere, which is the most expensive kind of 404 this site can serve.

  Route priority makes this safe: Next matches concrete segments before dynamic
  ones, so /Finathon/register and /Finathon/axe/26 continue to win. This only
  ever fires on a genuine miss.
*/

import { notFound } from "next/navigation";

export default function FinathonCatchAll() {
  // Calling notFound() rather than rendering the 404 markup directly: it throws
  // the framework's NEXT_NOT_FOUND signal, which is what sets the HTTP status to
  // 404. Rendering the markup by hand would return a 200 carrying a page that
  // says "not found" — which looks right to a human and lies to every crawler.
  notFound();
}
