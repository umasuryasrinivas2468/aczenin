import { NextResponse, type NextRequest } from "next/server";

/*
  Canonicalises every other spelling of /Finathon, and of anything beneath it,
  onto the capitalised one.

  The event is promoted as aczen.in/Finathon, so that is the real route. Next.js
  routes are case-sensitive, which means /finathon typed in lowercase — the way
  most people type a URL — would otherwise 404.

  The subtree matters as much as the bare path now that there are pages under
  it: /finathon/register is on posters and /finathon/axe/26 is how the organisers
  reach the registrations list, and both are typed by hand in lowercase far more
  often than they are clicked.

  This is deliberately middleware rather than a `redirects()` entry in
  next.config.mjs: `source` matching there is case-insensitive, so
  { source: "/Finathon", destination: "/finathon" } also matches "/finathon"
  and the route redirects to itself until the browser gives up with
  ERR_TOO_MANY_REDIRECTS. An exact string comparison here cannot loop.
*/

const CANONICAL = "/Finathon";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
    The guard that makes this loop-proof: anything already spelled with the
    canonical prefix is passed straight through and never rewritten.

    Checked as prefix-plus-boundary rather than startsWith(CANONICAL) alone. A
    bare startsWith would also match a hypothetical "/Finathonners", passing it
    through on a technicality — harmless today, but the kind of near-miss that
    stops being harmless when someone adds a route.
  */
  if (pathname === CANONICAL || pathname.startsWith(`${CANONICAL}/`)) {
    return NextResponse.next();
  }

  // Decide from the path itself, not from the matcher.
  //
  // An earlier version redirected anything the matcher let through, which made
  // the matcher list the only thing standing between this file and a site-wide
  // redirect to /finathon. Widening the matcher for any other purpose — request
  // logging, say — would have taken the whole site down. Middleware is shared
  // infrastructure, so it has to be correct for paths it was never scoped to.
  //
  // Only the trailing slash is stripped; the rest of the path is preserved
  // verbatim below, so /finathon/axe/26 keeps its segments through the redirect
  // rather than being flattened onto the event page.
  const normalised = pathname.toLowerCase().replace(/\/+$/, "");
  const lowerCanonical = CANONICAL.toLowerCase();
  if (normalised !== lowerCanonical && !normalised.startsWith(`${lowerCanonical}/`)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  // Only the FIRST segment is recased. The rest is left exactly as typed,
  // because the segments below it are case-sensitive routes in their own right
  // and lowercasing them wholesale would break any that are not already lower.
  url.pathname = CANONICAL + pathname.slice(CANONICAL.length).replace(/\/+$/, "");
  // 308 rather than 302 so search engines consolidate on the canonical URL and
  // the method is preserved.
  return NextResponse.redirect(url, 308);
}

export const config = {
  /*
    Scoped to this route and its subtree, so no other request on aczen.in pays
    the cost of running middleware. The matcher decides what RUNS; the checks
    above decide what redirects.

    The spellings are enumerated rather than relying on the matcher being
    case-insensitive, which is the hedge the original version of this file made
    and worth keeping: if that assumption is wrong, a single "/Finathon/:path*"
    entry would silently stop matching the lowercase URLs, which are the entire
    reason this middleware exists. Listing both costs nothing and cannot fail
    that way.
  */
  matcher: [
    "/Finathon",
    "/finathon",
    "/FINATHON",
    "/Finathon/",
    "/finathon/",
    "/Finathon/:path*",
    "/finathon/:path*",
    "/FINATHON/:path*",
  ],
};
