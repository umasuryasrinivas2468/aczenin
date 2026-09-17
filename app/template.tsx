/*
  Root template — the mount point for the analytics beacon.

  === WHY A TEMPLATE AND NOT THE ROOT LAYOUT ===============================
  A template wraps every route exactly like a layout, with one difference that
  is the entire reason this file exists: A LAYOUT PERSISTS ACROSS NAVIGATIONS
  AND A TEMPLATE REMOUNTS ON EACH ONE.

  For a pageview beacon the remount is the desired behaviour rather than a
  workaround. Mounted in the root layout, AxeBeacon's component instance would
  survive every client-side navigation, and it would be relying entirely on its
  effect dependencies to notice that the URL changed. Here it is torn down and
  rebuilt per navigation, so a fresh mount is itself the signal.

  It is also, today, the only mount point available: app/layout.tsx has
  uncommitted changes owned by another session and is off limits to this one.

  === IF YOU ARE LATER MOVING THIS INTO app/layout.tsx =====================
  Understand what you are giving up. In a layout the beacon mounts ONCE for the
  whole session, and every subsequent pageview depends on the effect's
  dependency array firing correctly. That can be made to work — AxeBeacon
  already tracks the last URL it reported, precisely so it is correct either way
  — but it is strictly more fragile than a remount, and a beacon that silently
  stops counting looks identical to one that works until the dashboard is empty
  a week later. Do not move it casually.
  ==========================================================================
*/

import { Suspense } from "react";

import AxeBeacon from "@/components/axe/AxeBeacon";

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The page itself, first and unwrapped. The template must not introduce a
          DOM element around every route — a stray div here would sit between the
          body and every page's own layout and could break full-height styling
          site-wide. A fragment adds nothing to the tree. */}
      {children}
      {/*
        THE SUSPENSE BOUNDARY IS REQUIRED AND THE BUILD FAILS WITHOUT IT.

        AxeBeacon calls useSearchParams(), which during a prerender triggers
        Next's bail-out to client rendering. Uncaught, that becomes a hard build
        error: "useSearchParams() should be wrapped in a suspense boundary at
        page …". Almost every route on this site is statically prerendered, so
        this would break the production build of nearly the whole site — and
        neither typescript.ignoreBuildErrors nor eslint.ignoreDuringBuilds in
        next.config.mjs suppresses it, because it is a prerender-time throw
        rather than a type or lint complaint.

        The boundary costs nothing visually: the beacon renders null, so the
        fallback is null and the static HTML of every page is unchanged. Only
        this subtree defers to the client.
      */}
      <Suspense fallback={null}>
        <AxeBeacon />
      </Suspense>
    </>
  );
}
