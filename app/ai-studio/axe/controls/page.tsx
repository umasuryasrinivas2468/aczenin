import { notFound } from "next/navigation";

import ControlsPanel, { type Settings } from "@/components/ai-studio/admin/ControlsPanel";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { PageHeader } from "@/components/ai-studio/ui";
import { loadAdminUsers } from "@/lib/ai-studio/dashboard";
import { aiSelectOne } from "@/lib/ai-studio/db";
import { hasAdminSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";

export default async function ControlsPage() {
  if (!(await hasAdminSession())) notFound();

  const [settings, users] = await Promise.all([
    aiSelectOne<Settings>("ai_settings", "id=eq.1&select=*"),
    loadAdminUsers(),
  ]);
  if (!settings) throw new Error("ai_settings row missing");

  const active = users.filter((user) => user.status === "active");
  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Operator"
          title="Controls"
          description="Kill switches, limits, budget and the automatic rules. Every change is recorded in the audit log."
        />
      </Reveal>
      <Reveal delay={0.04}>
        <ControlsPanel
          settings={settings}
          breakerOpenUntil={(settings.breaker_open_until as string | null) ?? null}
          envKill={process.env.AI_STUDIO_KILL_SWITCH === "1"}
          context={{
            activeUsers: active.length,
            overriddenTpm: active.filter((user) => user.tpm_override !== null).map((user) => Number(user.tpm_override)),
          }}
        />
      </Reveal>
    </>
  );
}
