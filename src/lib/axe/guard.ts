/*
  The per-page access check for /axe sections.

  Separated from session.ts because that file is pure crypto with no framework
  coupling — it can be reasoned about, and tested, without Next.js. This file is
  the thin Next-aware layer on top of it, which is the only part that needs to
  know cookies live in next/headers.
*/

import { cookies } from "next/headers";

import { AXE_COOKIE_NAME, verifySessionCookie } from "@/lib/axe/session";

/*
  True when the current request carries a valid, unexpired session cookie.

  Every /axe page calls this BEFORE it queries the database, even though the
  layout already gates the whole segment. That is not redundancy for its own
  sake: the layout's protection works by not rendering {children}, which relies
  on React never invoking a component it does not render. That is true, but it
  is a framework behaviour rather than an access check, and a data fetch worth
  protecting should not depend on one.
*/
export async function hasAxeSession(): Promise<boolean> {
  // Awaited: cookies() is async in Next 15. The synchronous Next 14 form
  // returns a Promise here, which is truthy, so `.get()` on it would throw
  // rather than silently pass — but the await is what makes it correct.
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(AXE_COOKIE_NAME)?.value);
}
