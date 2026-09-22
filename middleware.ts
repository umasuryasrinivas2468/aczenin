import { NextResponse, type NextRequest } from "next/server";

/*
  Canonicalises every other spelling of /Finathon, and of anything beneath it,
  onto the capitalised one.

  The event is promoted as aczen.in/Finathon, so that is the real route. Next.js
  routes are case-sensitive, which means /finathon typed in lowercase — the way
  most people type a URL — would otherwise 404.

  The subtree matters as much as the bare path now that there are pages under
  it: /Finathon/register is printed on posters and /Finathon/axe/26 is how the
  organisers reach the registrations list, and both are typed by hand far more
  often than they are clicked. A poster URL is copied by eye, so its typo
  distribution is not three neat spellings — it is /FinAthon, /FINATHON/Register
  and every other capitalisation a person might produce.

  This is deliberately middleware rather than a `redirects()` entry in
  next.config.mjs: `source` matching there is case-insensitive, so
  { source: "/Finathon", destination: "/finathon" } also matches "/finathon"
  and the route redirects to itself until the browser gives up with
  ERR_TOO_MANY_REDIRECTS. The function below cannot loop; see canonicalise().
*/

const CANONICAL = "/Finathon";

/*
  The canonical capitalisation of each known child segment, keyed by its
  lowercased form.

  Recasing only the first segment — what this file used to do — fixes /FINATHON
  but still 404s /FINATHON/REGISTER, because it would redirect that to
  /Finathon/REGISTER, which is a real miss on a case-sensitive route. Someone
  who types the parent in caps types the child in caps too; the two typos arrive
  together or not at all.

  An explicit map rather than a blanket .toLowerCase() on the rest of the path.
  Lowercasing everything below the first segment would silently break the first
  child route that legitimately carries a capital, and would do it at the moment
  that route ships rather than at the moment this rule was written.
*/
const CANONICAL_CHILDREN: Record<string, string> = {
  // The poster URL. This is the one that carries real typo traffic.
  register: "register",
  // The organisers' dashboard parent, /Finathon/axe/26. The "26" below it needs
  // no entry: digits have no case, so they survive the pass-through unchanged.
  axe: "axe",
};

/*
  Maps any spelling of a Finathon path to the one canonical spelling, or returns
  null for a path that is not a Finathon path at all.

  THE LOOP PROOF is that this function is idempotent — canonicalise(x) is always
  either null or a value that canonicalise() maps to itself. It lowercases
  before comparing, emits a fixed capitalisation, and strips trailing slashes,
  so feeding its own output back in reproduces that output exactly. The caller
  then redirects only when the result differs from the request path, which means
  the very first redirect lands on a path that produces no second redirect.

  That invariant lives in the function, not in the matcher — which is the point.
  The previous version guarded against loops with an early return on the
  canonical prefix, so widening the matcher for any other purpose (request
  logging, say) risked a site-wide redirect. Middleware is shared
  infrastructure; it has to stay correct for paths it was never scoped to.
*/
function canonicalise(pathname: string): string | null {
  // Trailing slashes are stripped before anything else, so "/finathon/" and
  // "/finathon" take the same path through the rest of this function rather
  // than differing by one character at every comparison below.
  const trimmed = pathname.replace(/\/+$/, "");
  // Split on "/" and drop the empty leading element that a leading slash
  // always produces, so segments[0] is the first real segment.
  const segments = trimmed.split("/").filter((segment) => segment.length > 0);

  // A bare "/" has no segments, so there is nothing here to canonicalise.
  if (segments.length === 0) {
    return null;
  }

  // Compared lowercased, which is the whole point: this is what lets
  // /FinAthon, /FINATHON and /finathon all be recognised as the same route.
  if (segments[0].toLowerCase() !== "finathon") {
    return null;
  }

  // Segment 0 always becomes the canonical capitalisation. CANONICAL carries
  // its own leading slash, so it is used without one being re-added.
  const rebuilt = [CANONICAL.slice(1)];

  // Segment 1 is recased only when it is a child this file knows about; an
  // unknown child is passed through exactly as typed, so a route added later
  // is never silently rewritten into something that does not exist.
  if (segments.length > 1) {
    const known = CANONICAL_CHILDREN[segments[1].toLowerCase()];
    rebuilt.push(known === undefined ? segments[1] : known);
  }

  // Everything below segment 1 is preserved verbatim. /Finathon/axe/26 keeps
  // its "26" rather than being flattened onto the dashboard root, and any
  // deeper route stays byte-identical to what was requested.
  for (let index = 2; index < segments.length; index += 1) {
    rebuilt.push(segments[index]);
  }

  // Rejoined with a leading slash and no trailing one, which is the exact shape
  // `trailingSlash: false` in next.config.mjs expects.
  return `/${rebuilt.join("/")}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const canonical = canonicalise(pathname);

  // Not a Finathon path. Decided from the path itself rather than from the
  // matcher, so this file stays safe no matter what the matcher is widened to.
  if (canonical === null) {
    return NextResponse.next();
  }

  // Already canonical — the single guard that makes a loop impossible. Written
  // as an equality against the computed target rather than as a prefix test,
  // because a prefix test also passes a hypothetical "/Finathonners" through on
  // a technicality, and because equality is the literal statement of "do not
  // redirect to where you already are".
  //
  // `=== pathname` rather than a truthiness check: tsconfig.json sets
  // strictNullChecks false, so a bare `if (canonical)` here would read as a
  // string-emptiness test and lose the null case it is meant to be about.
  if (canonical === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  // Only the pathname is replaced. Cloning and reassigning one field preserves
  // the query string and hash, so a UTM-tagged poster QR code keeps its tags
  // through the redirect.
  url.pathname = canonical;
  // 308 rather than 302 so search engines consolidate on the canonical URL and
  // the request method is preserved.
  return NextResponse.redirect(url, 308);
}

export const config = {
  /*
    Scoped to this route and its subtree, so no other request on aczen.in pays
    the cost of running middleware. The matcher decides what RUNS; canonicalise()
    decides what redirects.

    The character class is the case-insensitive matcher. Next compiles these
    strings with path-to-regexp at build time, and JavaScript regular
    expressions have no inline (?i) flag — an attempt to write one throws at
    build. Spelling each letter as a two-character class is the form that
    actually compiles, and it covers all 256 capitalisations of "finathon"
    where the previous list of three exact strings covered three.

    Verified against Next's own bundled path-to-regexp rather than assumed: it
    matches /Finathon, /finathon, /FINATHON, /FinAthon and their subtrees, and
    does not match /finathonners, /about or /api/finathon/register.

    Both the bare form and the :path* form are listed. The :path* form does
    match the bare path on its own, but stating both keeps the parent route from
    depending on that optional-segment behaviour staying true across a Next
    upgrade — and the bare /Finathon is the URL on every poster.
  */
  matcher: [
    "/:finathonSegment([Ff][Ii][Nn][Aa][Tt][Hh][Oo][Nn])",
    "/:finathonSegment([Ff][Ii][Nn][Aa][Tt][Hh][Oo][Nn])/:path*",
  ],
};
