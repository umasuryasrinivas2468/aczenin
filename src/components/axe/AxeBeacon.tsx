"use client";

/*
  The client-side pageview beacon.

  Mounted in app/template.tsx — a template rather than the root layout, both
  because app/layout.tsx belongs to another session and because a template
  remounts on every navigation, which suits a pageview beacon. See that file.

  === WHAT THIS IS AND IS NOT, TODAY ======================================
  Section 4.2 of the design doc describes middleware as the AUTHORITATIVE
  server-side count, with this beacon adding only what the browser can see.

  THAT SERVER-SIDE COUNTER DOES NOT EXIST YET. middleware.ts is currently a
  /finathon case-canonicaliser and counts nothing, so this beacon is presently
  the ONLY source of pageviews, not a supplement to one.

  The consequence is worth stating plainly rather than leaving implied: a
  visitor running an ad blocker that blocks this request is invisible, not
  merely counted less precisely. Numbers from this pipeline are a floor until
  the middleware half lands.
  ==========================================================================
*/

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// The sessionStorage key holding the per-visit identifier. Prefixed so it is
// recognisable in a storage inspector and cannot collide with anything the rest
// of the site keeps there.
const SESSION_KEY = "axe.sid";

/*
  Returns this browsing session's identifier, creating one on first call.

  sessionStorage rather than localStorage or a cookie, and this is the whole
  point: sessionStorage is cleared when the tab closes, so the value is scoped
  to one visit by the browser itself rather than by an expiry we have to
  enforce. It is also not sent on every request the way a cookie would be, which
  keeps it out of the territory that needs a consent banner.
*/
function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    // Reused across the whole visit, which is what makes the pageview-to-lead
    // join in the schema possible at all.
    if (existing) {
      return existing;
    }
    // crypto.randomUUID is available in every browser this site supports and
    // needs no dependency. The value is opaque and carries nothing about the
    // person — it exists only to group one visit's rows together.
    const fresh = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage throws in Safari private mode and when storage is
    // disabled. A per-call random value degrades gracefully: the pageview is
    // still counted, it just cannot be grouped into a session. Losing the join
    // is much better than losing the pageview.
    return "no-session";
  }
}

export default function AxeBeacon() {
  // usePathname, not window.location: in the App Router a client-side
  // navigation does not reload the page, so reading location once on mount
  // would record only the first page of every visit.
  const pathname = usePathname();
  // Included so the effect re-runs when only the query string changes — that is
  // how a campaign link (?utm_source=...) differs from a plain visit, and the
  // UTM columns would otherwise never be populated.
  const searchParams = useSearchParams();

  /*
    The last URL actually reported.

    THIS IS THE DOUBLE-COUNT GUARD AND IT IS NOT OPTIONAL. Two separate things
    would otherwise inflate every number on the dashboard:

    1. React Strict Mode, which is on by default in Next 15 development, mounts
       every component twice and runs every effect twice. Without this ref,
       every pageview in development is recorded as two — so the collector would
       be verified against data it had itself doubled.
    2. `searchParams` is a new object on some re-renders even when the query
       string is unchanged. Since it is in the dependency array, the effect can
       re-run on a render that was not a navigation at all.

    A ref rather than state, deliberately: updating state here would trigger the
    re-render that the effect is trying not to react to.
  */
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    // Rebuilt per navigation so the URL sent matches the page actually being
    // viewed, rather than whatever was current when the component mounted.
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    /*
      The dashboard must not count itself.

      Every route on the site is wrapped by this template, /axe included — so
      without this, each time the founder opens the dashboard it inserts
      pageviews that the dashboard then reports. The numbers would climb
      whenever they were looked at, which is self-pollution that grows with how
      closely the site is being watched.

      Checked here rather than server-side so the request is never made at all.
    */
    if (pathname === "/axe" || pathname.startsWith("/axe/")) {
      return;
    }

    // The guard itself. Identical URL means this is a re-run, not a new
    // pageview, and a re-run must not produce a row.
    if (lastReported.current === url) {
      return;
    }
    // Set BEFORE the request, not after. Setting it in a .then() leaves a window
    // in which a second effect run fires a second request while the first is
    // still in flight — which is exactly the Strict Mode double-invoke case.
    lastReported.current = url;

    // Not awaited and not surfaced. A failed analytics call must never become
    // something the visitor can perceive, which is the same invariant the
    // /api/collect route holds from the other side.
    void fetch("/api/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        // Sent separately from `path` because the server parses UTM parameters
        // out of it, while the path column deliberately stores no query string.
        url,
        // document.referrer is empty on a direct visit, which the server
        // correctly stores as null rather than inventing a source.
        referrer: document.referrer || null,
        sessionId: sessionId(),
      }),
      // keepalive lets the request outlive the page. Without it, a visitor who
      // clicks a link immediately after landing has their pageview cancelled by
      // the navigation — which would systematically under-count exactly the
      // bounce traffic worth knowing about.
      keepalive: true,
    }).catch(() => {
      // Swallowed on purpose. An ad blocker refusing the request is the normal
      // case, not an error, and an unhandled rejection would put a red line in
      // the console of a marketing site for no benefit.
    });
  }, [pathname, searchParams]);

  // Renders nothing. This component is a side effect with a React shape; giving
  // it any markup would risk it affecting layout on every page of the site.
  return null;
}
