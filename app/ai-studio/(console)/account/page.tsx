import type { Metadata } from "next";
import { redirect } from "next/navigation";

import ChangePasswordForm from "@/components/ai-studio/ChangePasswordForm";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { formatWhen, PageHeader, Panel, StatusPill } from "@/components/ai-studio/ui";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await getUserSession();
  if (!session || session.stage !== "full") redirect("/ai-studio/login");
  const { user } = session;

  return (
    <>
      <Reveal>
        <PageHeader eyebrow="Settings" title="Account" />
      </Reveal>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Reveal delay={0.04}>
          <Panel title="Profile">
            <dl className="space-y-4 text-sm">
              {[
                ["Email", user.email],
                ["Name", user.display_name ?? "—"],
                ["Team", user.team_name ?? "—"],
                ["Last sign-in", formatWhen(user.last_login_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="truncate text-right font-medium text-slate-900">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">API access</dt>
                <dd><StatusPill status={user.status}>{user.status === "active" ? "Active" : "Suspended"}</StatusPill></dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-slate-400">To change your name or team, contact the Aczen team.</p>
          </Panel>
        </Reveal>
        <Reveal delay={0.07}>
          <Panel title="Change password" description="Signs you out everywhere else.">
            <ChangePasswordForm email={user.email} firstRun={false} />
          </Panel>
        </Reveal>
      </div>
    </>
  );
}
