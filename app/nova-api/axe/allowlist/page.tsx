/*
  /nova-api/axe/allowlist — who may sign in to the Nova developer portal.

  Behind ../layout.tsx's gate, and re-checks the session itself before it
  queries, for the same reason as the Overview page.
*/

// Thrown to the nearest not-found boundary when there is no session.
import { notFound } from "next/navigation";

// Shared page title block.
import AdminPageHeader from "@/components/nova/admin/AdminPageHeader";
// Add form and rows; a client component that only renders props and calls actions.
import AllowlistPanel from "@/components/nova/admin/AllowlistPanel";
// The session check, repeated on purpose (see ../layout.tsx header).
import { hasNovaAdminSession } from "@/lib/nova/adminGate";

// Shared loader; the allowlist rows carry each user's active-key count.
import { loadAdminData } from "../data";

// node:crypto for the session check, and admin data is never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaAdminAllowlistPage() {
  // Checked BEFORE any query: the layout gate is rendering, not authorisation.
  if ((await hasNovaAdminSession()) !== true) {
    // 404 confirms nothing about what lives here.
    notFound();
  }

  // Errors go to ../error.tsx; the rows are plain data with no secrets.
  const data = await loadAdminData();

  return (
    <>
      {/* Users sign in with their email as the password, so an address is the whole credential setup. */}
      <AdminPageHeader
        title="Allowlist"
        description="Only these addresses can sign in to the developer portal."
      />
      <AllowlistPanel rows={data.allowlist} />
    </>
  );
}
