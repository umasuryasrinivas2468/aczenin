/*
  /nova-api/axe — the Nova admin portal's single page.

  Server Component: it loads everything with the service-role key (which must
  never reach the browser) and hands plain rows to the client panels.
*/

// Thrown to the nearest not-found boundary when there is no session.
import { notFound } from "next/navigation";

// The three panels; client components that only render props and call actions.
import AllowlistPanel from "@/components/nova/admin/AllowlistPanel";
import KeysPanel from "@/components/nova/admin/KeysPanel";
import UsagePanel from "@/components/nova/admin/UsagePanel";
// The session check, repeated here on purpose (see layout.tsx header).
import { hasNovaAdminSession } from "@/lib/nova/adminGate";

// All reads and the Node-side usage aggregation.
import { loadAdminData } from "./data";

// Same reasons as the layout: node:crypto, and no cached admin data.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaAdminPage() {
  // Checked BEFORE any query. The layout already hides this page, but a data
  // read must not rest on how React treats an unrendered element.
  if ((await hasNovaAdminSession()) !== true) {
    // 404 rather than a message: it confirms nothing about what lives here.
    notFound();
  }

  // A thrown DB error goes to ./error.tsx, which shows a generic card; the
  // detail stays in the server log via Next's own error logging.
  const data = await loadAdminData();

  return (
    <>
      {/* Usage first: it answers "is anything wrong" before the admin scrolls. */}
      <UsagePanel daily={data.daily} totals={data.totals} />
      <AllowlistPanel rows={data.allowlist} />
      <KeysPanel rows={data.keys} />
    </>
  );
}
