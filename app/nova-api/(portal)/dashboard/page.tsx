/*
  /nova-api/dashboard — "API keys": the signed-in developer's one active key,
  the base URL and a ready-to-copy first request.

  A Server Component inside the (portal) shell. The key list is rendered on
  the server from a query filtered by the SESSION's email, so no other user's
  key can ever reach this HTML. Client JavaScript is limited to the create
  form, the revoke button and the copy buttons, and each server action
  re-checks the session on its own.
*/

// Page metadata type.
import type { Metadata } from "next";
// Server-side redirect for visitors without a session.
import { redirect } from "next/navigation";

// The copy button for the base URL / curl, and the two interactive pieces.
import CopyButton from "@/components/nova/portal/CopyButton";
import CreateKeyForm from "@/components/nova/portal/CreateKeyForm";
import RevokeKeyButton from "@/components/nova/portal/RevokeKeyButton";
// House primitive for the status pills.
import { Badge } from "@/components/ui/badge";
// Session lookup.
import { getPortalUser } from "@/lib/nova/portalAuth";
// The caller's keys (filtered by email inside) and the cap.
import { getDatasetSlice, listKeys, MAX_ACTIVE_KEYS, type DashboardKey } from "./keys";

// node:crypto via portalAuth.
export const runtime = "nodejs";

// Per-user, cookie-derived content must never be cached or shared.
export const dynamic = "force-dynamic";

// Private page: keep it out of search results. Title reads "API keys | Nova API".
export const metadata: Metadata = {
  title: "API keys",
  robots: { index: false, follow: false },
};

// www, not the apex: aczen.in 308-redirects to www.aczen.in, and HTTP clients drop the
// Authorization header on a cross-host redirect, so an apex base URL 401s every call.
const BASE_URL = "https://www.aczen.in/nova-api/v1";

// A first request with a placeholder, for developers who already saved their
// key; the one-time reveal in CreateKeyForm shows the same line with the real key.
const SAMPLE_CURL = `curl "${BASE_URL}/invoices?limit=5" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;

// Fixed locale and zone so the server renders the same text every time, in
// the timezone the team and its users work in.
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

// "Never" for unused keys, otherwise a readable IST timestamp.
function formatDate(iso: string | null): string {
  return iso ? DATE_FORMAT.format(new Date(iso)) : "Never";
}

// Small mono uppercase label, the eyebrow style of dashboard.aczen.in's docs.
// smeorange-800, not the #ff914d primary: 11px text needs 4.5:1 on white.
const EYEBROW = "font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-smeorange-800";

export default async function NovaDashboardPage() {
  // The layout gates too, but it renders in parallel with this page, and this
  // page needs the email anyway — so the check is repeated, not assumed.
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
  // Which sandbox slice this team sees. Best-effort: a failure here must not
  // take down the key page, so it degrades to "line not shown".
  const slice = await getDatasetSlice(user.email).catch((error) => {
    // Detail for the operator; the page just omits the line.
    console.error("[nova/dashboard] getDatasetSlice failed:", error);
    return null;
  });
  // At most one (DB unique index); null when there is none or the list failed.
  const activeKey = keys?.find((key) => !key.revoked_at) ?? null;
  // Revoked keys are kept as history: their usage still counts in the logs.
  const revokedKeys = keys ? keys.filter((key) => key.revoked_at) : [];
  // The form shows only when a create could succeed: list loaded, under the cap.
  const canCreate = keys !== null && (activeKey ? 1 : 0) < MAX_ACTIVE_KEYS;

  return (
    <div className="space-y-8">
      {/* --- Page header ---------------------------------------------------- */}
      <header className="space-y-1.5">
        <p className={EYEBROW}>Workspace</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API keys</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One active key per account. Send it as a Bearer token on every request to the Nova API.
        </p>
        {/* Only when known; typeof because slice 0 is a real value, not "missing". */}
        {typeof slice === "number" ? (
          <p className="text-sm text-muted-foreground">
            Your team&apos;s dataset: <span className="font-medium text-foreground">slice {slice}</span>
          </p>
        ) : null}
      </header>

      {/* --- Base URL -------------------------------------------------------
          The value a developer copies first, so it sits at the top. */}
      <section aria-labelledby="base-url-title" className="space-y-2">
        <h2 id="base-url-title" className={EYEBROW}>
          Base URL
        </h2>
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:pl-4">
          {/* break-all so the URL wraps on a 390px phone instead of overflowing. */}
          <code className="min-w-0 flex-1 break-all font-mono text-sm">{BASE_URL}</code>
          <CopyButton value={BASE_URL} label="Copy URL" />
        </div>
      </section>

      {/* --- Your key -------------------------------------------------------
          CreateKeyForm is ALWAYS rendered in this slot, even with an active
          key: after a create, revalidatePath re-renders this page with the new
          key active, and if the form unmounted here its one-time reveal of the
          secret would vanish before the user could copy it. It hides its own
          form via canCreate instead. */}
      <section aria-labelledby="key-title" className="space-y-3">
        <h2 id="key-title" className={EYEBROW}>
          Your key
        </h2>
        <CreateKeyForm canCreate={canCreate} />

        {keys === null ? (
          // Generic on purpose; the detail is in the server log.
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            We couldn&apos;t load your keys right now. Please refresh in a minute.
          </p>
        ) : activeKey ? (
          // The active key as a card, not a one-row table: easier to scan and
          // it reflows cleanly on a phone.
          <div className="rounded-lg border bg-card">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* break-words: a 60-char name without spaces must still wrap. */}
                  <p className="break-words font-medium">{activeKey.name}</p>
                  {/* House default badge: brand orange, no off-palette green. */}
                  <Badge>Active</Badge>
                </div>
                {/* Prefix + ellipsis: enough to match the key to a config file. */}
                <p className="font-mono text-xs text-muted-foreground">{activeKey.prefix}…</p>
              </div>
              <RevokeKeyButton id={activeKey.id} name={activeKey.name} />
            </div>
            {/* Three facts as a definition list: labelled pairs, not a table. */}
            <dl className="grid gap-4 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="mt-0.5">{formatDate(activeKey.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last used</dt>
                <dd className="mt-0.5">{formatDate(activeKey.last_used_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Requests, last 24h</dt>
                <dd className="mt-0.5 tabular-nums">{activeKey.requests_24h.toLocaleString("en-IN")}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>

      {/* --- Quick start ----------------------------------------------------
          Dark code block, matching the quick-start panel on dashboard.aczen.in. */}
      <section aria-labelledby="quickstart-title" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id="quickstart-title" className={EYEBROW}>
            First request
          </h2>
          {/* Copies one line: the backslash continuation is only for display. */}
          <CopyButton value={SAMPLE_CURL.replace(" \\\n  ", " ")} label="Copy curl" />
        </div>
        {/* overflow-x-auto: long lines scroll inside the block, never the page. */}
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
          <code>{SAMPLE_CURL}</code>
        </pre>
        <p className="text-xs text-muted-foreground">
          Replace <code className="font-mono">YOUR_API_KEY</code> with the key you saved when you created it.
        </p>
      </section>

      {/* --- History --------------------------------------------------------
          Only when there is some; a first-time user sees no empty table. */}
      {revokedKeys.length > 0 ? (
        <section aria-labelledby="history-title" className="space-y-2">
          <h2 id="history-title" className={EYEBROW}>
            Revoked keys
          </h2>
          {/* Scroll container so the table never widens the page on a phone. */}
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              {/* Sentence-case headers: the uppercase style is reserved for section labels. */}
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Key</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Created</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Revoked</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">24h requests</th>
                </tr>
              </thead>
              <tbody className="divide-y text-muted-foreground">
                {revokedKeys.map((key) => (
                  // Muted text for the whole row: history, not something to act on.
                  <tr key={key.id}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{key.name}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{key.prefix}…</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(key.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(key.revoked_at)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{key.requests_24h.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
