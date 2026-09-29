import { notFound } from "next/navigation";

import UsersAdmin, { type UserView } from "@/components/ai-studio/admin/UsersAdmin";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { PageHeader } from "@/components/ai-studio/ui";
import { loadAdminUsers } from "@/lib/ai-studio/dashboard";
import { aiSelect, aiSelectOne } from "@/lib/ai-studio/db";
import { hasAdminSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";

export default async function AdminUsersPage() {
  if (!(await hasAdminSession())) notFound();

  const nowIso = encodeURIComponent(new Date().toISOString());
  const [rows, keys, settings] = await Promise.all([
    loadAdminUsers(),
    aiSelect<{ id: string; user_id: string; name: string; key_hint: string; last_used_at: string | null }>(
      "ai_api_key",
      `status=eq.active&or=(expires_at.is.null,expires_at.gt.${nowIso})&select=id,user_id,name,key_hint,last_used_at&order=created_at.desc`,
      5000,
    ),
    aiSelectOne<{ currency: string }>("ai_settings", "id=eq.1&select=currency"),
  ]);

  const keysByUser = new Map<string, UserView["keys"]>();
  for (const key of keys) {
    const list = keysByUser.get(key.user_id) ?? [];
    list.push({ id: key.id, name: key.name, hint: key.key_hint, lastUsedAt: key.last_used_at });
    keysByUser.set(key.user_id, list);
  }

  const users: UserView[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    teamName: row.team_name,
    status: row.status,
    statusReason: row.status_reason,
    pendingPassword: row.must_change_password,
    lastLoginAt: row.last_login_at,
    lastUsedAt: row.last_used_at,
    activeKeys: Number(row.active_keys),
    limits: { rpm: row.rpm, burst: row.burst, concurrency: row.concurrency, rpd: row.rpd, tpd: row.tpd, tpm: row.tpm, max_keys: row.max_keys },
    overrides: {
      rpm_override: row.rpm_override,
      burst_override: row.burst_override,
      concurrency_override: row.concurrency_override,
      rpd_override: row.rpd_override,
      tpd_override: row.tpd_override,
      tpm_override: row.tpm_override,
      max_keys_override: row.max_keys_override,
    },
    today: { requests: Number(row.today_requests), tokens: Number(row.today_tokens) },
    month: {
      requests: Number(row.month_requests),
      tokens: Number(row.month_tokens),
      denied: Number(row.month_denied),
      errors: Number(row.month_errors),
      cost: row.month_cost,
    },
    keys: keysByUser.get(row.id) ?? [],
  }));

  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Operator"
          title="Users & quotas"
          description={`${users.length} team leads. Sorted by spend this month. Colours flag anyone above 75% and 90% of a limit.`}
        />
      </Reveal>
      <Reveal delay={0.04}>
        <UsersAdmin users={users} currency={settings?.currency ?? "INR"} />
      </Reveal>
    </>
  );
}
