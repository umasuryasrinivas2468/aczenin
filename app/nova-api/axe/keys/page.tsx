/*
  /nova-api/axe/keys — every API key across every user.

  Behind ../layout.tsx's gate, and re-checks the session itself before it
  queries. key_hash is never selected by data.ts, so nothing here can leak a
  usable credential.
*/

// Thrown to the nearest not-found boundary when there is no session.
import { notFound } from "next/navigation";

// Shared page title block.
import AdminPageHeader from "@/components/nova/admin/AdminPageHeader";
// Revoke and rate-limit edits; a client component over server-loaded rows.
import KeysPanel from "@/components/nova/admin/KeysPanel";
// The session check, repeated on purpose (see ../layout.tsx header).
import { hasNovaAdminSession } from "@/lib/nova/adminGate";

// Shared loader; key rows arrive with their 24h request counts already joined.
import { loadAdminData } from "../data";

// node:crypto for the session check, and admin data is never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaAdminKeysPage() {
  // Checked BEFORE any query: the layout gate is rendering, not authorisation.
  if ((await hasNovaAdminSession()) !== true) {
    // 404 confirms nothing about what lives here.
    notFound();
  }

  // Errors go to ../error.tsx with only an opaque digest shown.
  const data = await loadAdminData();

  return (
    <>
      {/* Revocation timing stated up front, so an admin knows it is not instant mid-request. */}
      <AdminPageHeader
        title="API keys"
        description="Every key across all users. Revoking takes effect on the key's next request."
      />
      <KeysPanel rows={data.keys} />
    </>
  );
}
