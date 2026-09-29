/*
  /nova-api/dashboard — a signed-in developer's own API keys.

  A Server Component. The key list is rendered on the server from a query
  filtered by the SESSION's email, so no other user's key can ever reach this
  HTML. Client JavaScript is limited to the create form and revoke buttons,
  and each of those server actions re-checks the session on its own.
*/

// Page metadata type.
import type { Metadata } from "next";
// Server-side redirect for visitors without a session.
import { redirect } from "next/navigation";
// Back-link to the docs.
import Link from "next/link";

// Site chrome, per page (see app/nova-api/layout.tsx).
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
// The copy button for the base URL, and the two interactive pieces.
import CopyButton from "@/components/nova/portal/CopyButton";
import CreateKeyForm from "@/components/nova/portal/CreateKeyForm";
import RevokeKeyButton from "@/components/nova/portal/RevokeKeyButton";
// House primitives.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Session lookup.
import { getPortalUser } from "@/lib/nova/portalAuth";
// Sign-out as a plain <form action>, so it works before hydration.
import { signOutAction } from "../actions";
// The caller's keys (filtered by email inside) and the cap.
import { listKeys, MAX_ACTIVE_KEYS, type DashboardKey } from "./keys";

// node:crypto via portalAuth.
export const runtime = "nodejs";

// Per-user, cookie-derived content must never be cached or shared.
export const dynamic = "force-dynamic";

// Private page: keep it out of search results.
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// Shown next to the base URL.
const BASE_URL = "https://aczen.in/nova-api/v1";

// Fixed locale and zone so the server renders the same text every time, in
// the timezone the team and its users work in.
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

// "—" for never-used keys, otherwise a readable IST timestamp.
function formatDate(iso: string | null): string {
  return iso ? DATE_FORMAT.format(new Date(iso)) : "—";
}

export default async function NovaDashboardPage() {
  // Checked first: no session, no query.
  const user = await getPortalUser();
  // redirect() throws, so nothing below runs for a signed-out visitor.
  if (!user) redirect("/nova-api");

  // Loaded separately from the session check so a DB failure here shows an
  // inline error instead of bouncing a signed-in user to the sign-in form.
  let keys: DashboardKey[] | null = null;
  try {
    keys = await listKeys(user.email);
  } catch (error) {
    // Detail for the operator; generic text for the user below.
    console.error("[nova/dashboard] listKeys failed:", error);
  }
  // Active count drives the cap message and disables the form at the limit.
  const activeCount = keys ? keys.filter((key) => !key.revoked_at).length : 0;

  return (
    <>
      <Navbar />
      {/* pt-24 clears the fixed navbar. */}
      <main className="bg-background pb-20 pt-24">
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
          {/* --- Header: who, and the way out --------------------------- */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1">
              <Link
                href="/nova-api"
                className="rounded text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ← API reference
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">Your API keys</h1>
              <p className="break-all text-sm text-muted-foreground">Signed in as {user.email}</p>
            </div>
            {/* A form, not a button with onClick: works without JS. */}
            <form action={signOutAction}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </header>

          {/* --- Base URL --------------------------------------------------- */}
          <section aria-labelledby="base-url-title" className="space-y-2 rounded-xl border bg-card p-5">
            <h2 id="base-url-title" className="text-sm font-medium text-muted-foreground">
              Base URL
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 break-all font-mono text-sm">{BASE_URL}</code>
              <CopyButton value={BASE_URL} label="Copy URL" />
            </div>
          </section>

          {/* --- Create ----------------------------------------------------- */}
          <section aria-labelledby="create-title" className="space-y-3 rounded-xl border bg-card p-5">
            <div className="space-y-1">
              <h2 id="create-title" className="text-lg font-semibold">
                Create a key
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeCount} of {MAX_ACTIVE_KEYS} active keys used.
                {activeCount >= MAX_ACTIVE_KEYS ? " Revoke one to create another." : ""}
              </p>
            </div>
            {/* Disabled at the cap (or when the list failed, since the count is unknown). */}
            <CreateKeyForm disabled={keys === null || activeCount >= MAX_ACTIVE_KEYS} />
          </section>

          {/* --- List ------------------------------------------------------- */}
          <section aria-labelledby="keys-title" className="space-y-3">
            <h2 id="keys-title" className="text-lg font-semibold">
              Keys
            </h2>
            {keys === null ? (
              // Generic on purpose; the detail is in the server log.
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                We couldn&apos;t load your keys right now. Please refresh in a minute.
              </p>
            ) : keys.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No keys yet. Create one above to make your first request.
              </p>
            ) : (
              // Scroll container so the table never widens the page at 320px.
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Name</th>
                      <th scope="col" className="px-4 py-3 font-medium">Key</th>
                      <th scope="col" className="px-4 py-3 font-medium">Created</th>
                      <th scope="col" className="px-4 py-3 font-medium">Last used</th>
                      <th scope="col" className="px-4 py-3 font-medium">24h requests</th>
                      <th scope="col" className="px-4 py-3 font-medium">Status</th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {keys.map((key) => (
                      // Revoked rows are dimmed but kept: their usage is history.
                      <tr key={key.id} className={key.revoked_at ? "opacity-60" : undefined}>
                        <td className="px-4 py-3 font-medium">{key.name}</td>
                        {/* Prefix + ellipsis: enough to match a key to a config file. */}
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{key.prefix}…</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(key.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(key.last_used_at)}</td>
                        <td className="px-4 py-3 tabular-nums">{key.requests_24h.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3">
                          {key.revoked_at ? <Badge variant="secondary">Revoked</Badge> : <Badge>Active</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          {/* Only live keys can be revoked; revoked ones have nothing to do. */}
                          {key.revoked_at ? null : <RevokeKeyButton id={key.id} name={key.name} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
