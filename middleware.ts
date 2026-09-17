import { NextResponse, type NextRequest } from "next/server";

/*
  Canonicalises every other spelling of /Finathon onto the capitalised one.

  The event is promoted as aczen.in/Finathon, so that is the real route. Next.js
  routes are case-sensitive, which means /finathon typed in lowercase — the way
  most people type a URL — would otherwise 404.

  This is deliberately middleware rather than a `redirects()` entry in
  next.config.mjs: `source` matching there is case-insensitive, so
  { source: "/Finathon", destination: "/finathon" } also matches "/finathon"
  and the route redirects to itself until the browser gives up with
  ERR_TOO_MANY_REDIRECTS. An exact string comparison here cannot loop.
*/

const CANONICAL = "/Finathon";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The guard that makes this loop-proof: the canonical path is passed
  // straight through and never rewritten.
  if (pathname === CANONICAL) {
    return NextResponse.next();
  }

  // Decide from the path itself, not from the matcher.
  //
  // An earlier version redirected anything the matcher let through, which made
  // the matcher list the only thing standing between this file and a site-wide
  // redirect to /finathon. Widening the matcher for any other purpose — request
  // logging, say — would have taken the whole site down. Middleware is shared
  // infrastructure, so it has to be correct for paths it was never scoped to.
  const normalised = pathname.toLowerCase().replace(/\/+$/, "");
  if (normalised !== CANONICAL.toLowerCase()) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = CANONICAL;
  // 308 rather than 302 so search engines consolidate on the lowercase URL
  // and the method is preserved.
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Scoped to this one route so no other request on aczen.in pays the cost of
  // running middleware. The alternation covers the spellings people actually
  // type; matching itself is case-insensitive, which is why the exact check
  // above still has to be there.
  matcher: ["/Finathon", "/finathon", "/FINATHON", "/Finathon/", "/finathon/"],
};
