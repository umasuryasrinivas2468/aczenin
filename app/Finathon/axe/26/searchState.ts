/*
  Where the dashboard's search text lives between requests.

  === WHY A COOKIE AND NOT THE QUERY STRING ================================
  The page this replaces used `<form method="get">` over team-lead name, roll
  number and UTR. A GET puts whatever was typed into the URL, and a URL is the
  single leakiest place a string can be on the web:

    · browser history — survives the session, readable by anyone at the machine
    · the `Referer` header — sent to every third-party asset the page loads
    · Vercel's request log — paths are logged for every request, retained, and
      visible to anyone with project access
    · the address bar itself — read over a shoulder at a registration desk

  The values being typed here are students' real names and REAL BANK UTRs. None
  of those four places is an acceptable home for them.

  A cookie is not a perfect answer, and it is worth being precise about what it
  does and does not buy. It removes the query from the URL, which removes all
  four leaks above. It does NOT remove the value from the reviewer's own device:
  it sits in their cookie jar until it expires. That is a deliberate trade — the
  string stays with the one person already authorised to read the whole table,
  instead of being copied into logs and headers that outlive the session and are
  read by people who are not.

  The cookie is `httpOnly` so page scripts cannot read it, `sameSite: "lax"` so
  it does not ride along on cross-site requests, `secure` in production, scoped
  by `path` to this one dashboard so it is never sent to any other route, and
  given a short `maxAge` so an unattended browser stops replaying it.
  ==========================================================================
*/

import { cookies } from "next/headers";

// Prefixed with the gate's own namespace, matching `fin_session`, so the two
// cookies this dashboard sets are visibly one family in DevTools rather than
// two unrelated strings.
export const SEARCH_COOKIE_NAME = "fin_admin_q";

// The only path this cookie is ever sent to. Scoping it here rather than to "/"
// means the search text does not ride along on requests to the marketing site,
// the Sanity studio or any API route.
export const SEARCH_COOKIE_PATH = "/Finathon/axe/26";

// Thirty minutes. Long enough to survive a reviewer walking away mid-queue,
// short enough that a shared laptop does not keep a student's name on it for
// the rest of the day.
export const SEARCH_COOKIE_MAX_AGE_SECONDS = 30 * 60;

/*
  Upper bound on the stored query.

  Not a validation rule — it is a refusal to write an unbounded attacker-chosen
  string into a header that is replayed on every subsequent request. Cookies are
  sent up on each navigation, so an oversized one is a self-inflicted 431.
*/
export const SEARCH_MAX_LENGTH = 120;

/*
  The cookie attributes, in one place.

  Shared between the set and the delete paths because a delete only works if its
  `path` matches the one the cookie was written with — the single most common
  way a "clear" button appears to do nothing while the old cookie survives
  untouched at a different scope.
*/
export function searchCookieOptions() {
  return {
    // No script on the page has any reason to read the search text, and this is
    // what stops an XSS anywhere on the origin from lifting it.
    httpOnly: true,
    // Never sent over plain HTTP in production. Left off in development
    // because localhost is not HTTPS and a `secure` cookie would silently never
    // be set, making the search look broken only on the dev machine.
    secure: process.env.NODE_ENV === "production",
    // "lax" not "strict": the cookie must survive the reviewer following a link
    // back into the dashboard, but must not be attached to a cross-site POST.
    sameSite: "lax" as const,
    path: SEARCH_COOKIE_PATH,
    maxAge: SEARCH_COOKIE_MAX_AGE_SECONDS,
  };
}

/*
  Reads the active search text for this request.

  Returns "" rather than null for a missing cookie so every caller can treat the
  result as a string. With `strictNullChecks: false` in this repo, TypeScript
  would not have caught a `.toLowerCase()` on the null branch — the exact class
  of bug this rewrite exists to remove — so the null is collapsed here, once.
*/
export async function readSearchQuery(): Promise<string> {
  // Awaited: cookies() is async in Next 15, and destructuring it without the
  // await yields a Promise whose `.get` is undefined.
  const store = await cookies();
  const raw = store.get(SEARCH_COOKIE_NAME)?.value;
  // Typeof rather than truthiness so a non-string (which a tampered cookie jar
  // can produce) cannot reach the caller's string operations.
  if (typeof raw !== "string") {
    return "";
  }
  // Re-trimmed and re-capped on READ as well as on write. The cookie is
  // client-side state and therefore attacker-controlled: a reviewer's browser
  // extension, or the reviewer themselves, can put anything in it.
  return raw.trim().slice(0, SEARCH_MAX_LENGTH);
}
