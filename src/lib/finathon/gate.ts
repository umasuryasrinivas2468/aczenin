/*
  The password gate for /Finathon/axe/26, the registrations dashboard.

  A SEPARATE GATE FROM /axe, ON PURPOSE. The two dashboards protect different
  things and are read by different people: /axe holds anonymous traffic counts
  for the founder, this one holds registrants' names, roll numbers and payment
  references and is read by whoever is running the event. Sharing one password
  would mean handing an event volunteer the analytics dashboard too, and
  rotating either password would lock the other group out.

  What IS shared is the cryptography. Cookie minting, cookie verification and
  the scrypt password check are imported from the /axe session module rather
  than reimplemented here — the constant-time compares and the signed-expiry
  handling are exactly the details that go wrong when they exist in two copies
  and only one of them gets fixed.
*/

import { cookies } from "next/headers";

import { verifyPasswordAgainst, verifySessionCookie } from "@/lib/axe/session";

// Same runtime-only guard as the modules it imports from. Strictly weaker than
// the `server-only` package (this fires in the browser after the bundle has
// already shipped) but it turns a silent leak of FINATHON_GATE_HASH into a
// loud crash.
if (typeof window !== "undefined") {
  throw new Error("src/lib/finathon/gate.ts is server-only and must never reach the browser.");
}

/*
  A distinct cookie name, so the two gates hold independent sessions.

  If both used AXE_COOKIE_NAME, passing either password would open both
  dashboards — the cookie carries only an expiry and a signature, with nothing
  in it that says which gate issued it. Separate names are what keep the two
  sessions from being interchangeable.
*/
export const FINATHON_COOKIE_NAME = "fin_session";

/*
  Verifies a submitted password against FINATHON_GATE_HASH.

  Fails closed when the variable is missing, for the same reason the /axe gate
  does: the password is a short memorable word, and the thing that keeps that
  acceptable is the hash never entering git, so there is deliberately no
  hardcoded fallback to fall back to. A dashboard nobody can open is a visible
  outage; one that quietly accepts a committed hash is a silent hole.
*/
export function verifyFinathonPassword(submitted: string): boolean {
  return verifyPasswordAgainst(submitted, process.env.FINATHON_GATE_HASH);
}

/*
  True when the current request carries a valid, unexpired Finathon session.

  Called by the gating layout AND again by the page underneath before it
  queries, matching the /axe pattern: the layout's protection works by not
  rendering {children}, which is a property of how React renders rather than an
  access check, and a query that returns people's names should not rest on that.
*/
export async function hasFinathonSession(): Promise<boolean> {
  // Awaited: cookies() is async in Next 15.
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(FINATHON_COOKIE_NAME)?.value);
}
