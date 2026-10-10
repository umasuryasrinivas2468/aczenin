/*
  /nova-api/axe — Overview: usage totals and requests per day.

  Server Component: it loads with the service-role key (which must never reach
  the browser) and hands plain rows to the client panel. Allowlist and API keys
  live at ./allowlist and ./keys, each behind the same layout gate.
*/

// Thrown to the nearest not-found boundary when there is no session.
import { notFound } from "next/navigation";

// Shared page title block, so all three admin routes open the same way.
import AdminPageHeader from "@/components/nova/admin/AdminPageHeader";
// Tiles and the 7-day chart; a client component that only renders props.
import UsagePanel from "@/components/nova/admin/UsagePanel";
// Pinned-locale date, the same formatter the tables use.
import { formatDate } from "@/components/nova/admin/format";
// The session check, repeated here on purpose (see layout.tsx header).
import { hasNovaAdminSession } from "@/lib/nova/adminGate";

// All reads and the Node-side usage aggregation.
import { loadAdminData } from "./data";

// Same reasons as the layout: node:crypto, and no cached admin data.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaAdminOverviewPage() {
  // Checked BEFORE any query. The layout already hides this page, but a data
  // read must not rest on how React treats an unrendered element.
  if ((await hasNovaAdminSession()) !== true) {
    // 404 rather than a message: it confirms nothing about what lives here.
    notFound();
  }

  // A thrown DB error goes to ./error.tsx, which shows a generic card; the
  // detail stays in the server log via Next's own error logging.
  // ponytail: loads every table and uses a few; split loadAdminData if the tables grow.
  const data = await loadAdminData();

  return (
    <>
      {/* Overview answers "is anything wrong" before the admin goes anywhere else. */}
      <AdminPageHeader title="Overview" description="All keys combined. Days are India Standard Time." />
      {/* How many disjoint team slices the seed made: teams beyond this count
          repeat data, which the Allowlist page marks per team. Hidden when the
          meta row is missing rather than showing a guessed number. */}
      {data.dataset ? (
        <p className="-mt-3 mb-6 text-sm text-muted-foreground">
          Dataset: <span className="font-medium text-foreground tabular-nums">{data.dataset.sliceCount}</span>{" "}
          {data.dataset.sliceCount === 1 ? "slice" : "slices"}, seeded {formatDate(data.dataset.seededAt)}
        </p>
      ) : null}
      <UsagePanel daily={data.daily} totals={data.totals} />
    </>
  );
}
