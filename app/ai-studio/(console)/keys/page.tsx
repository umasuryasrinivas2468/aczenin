import type { Metadata } from "next";
import { redirect } from "next/navigation";

import KeysManager, { type KeyView } from "@/components/ai-studio/KeysManager";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { PageHeader } from "@/components/ai-studio/ui";
import { aiRpc } from "@/lib/ai-studio/db";
import { listKeys } from "@/lib/ai-studio/keys";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "API keys" };

export default async function KeysPage() {
  const session = await getUserSession();
  if (!session || session.stage !== "full") redirect("/ai-studio/login");

  const [rows, limits] = await Promise.all([
    listKeys(session.user.id),
    aiRpc<{ limits: { max_keys: number } }>("ai_user_dashboard", { p_user_id: session.user.id, p_days: 1 }),
  ]);

  const now = Date.now();
  // Only display-safe fields cross to the client: never the hash.
  const keys: KeyView[] = rows.map((row) => {
    const expired = row.expires_at !== null && new Date(row.expires_at).getTime() <= now;
    const state: KeyView["state"] = row.status === "revoked" || expired ? "revoked" : row.expires_at ? "expiring" : "active";
    return {
      id: row.id,
      name: row.name,
      hint: row.key_hint,
      state,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedReason: expired && row.status === "active" ? "expired after rotation" : row.revoked_reason,
    };
  });

  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Credentials"
          title="API keys"
          description="Keys authenticate your server-side code to Aczen AI. Each key is shown once when created; after that only its last four characters are visible."
        />
      </Reveal>
      <Reveal delay={0.05}>
        <KeysManager keys={keys} maxKeys={limits.limits.max_keys} canCreate={session.user.status === "active"} />
      </Reveal>
    </>
  );
}
