/*
  The signed-in console. The session check lives in the layout so a page added
  under (console) is protected by default; each page ALSO re-reads the session
  before it queries anything, so data access never depends on the layout
  having rendered first.
*/

import { redirect } from "next/navigation";

import StudioShell, { STUDIO_NAV } from "@/components/ai-studio/StudioShell";
import { Banner } from "@/components/ai-studio/ui";
import { aiSelectOne } from "@/lib/ai-studio/db";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect("/ai-studio/login");
  if (session.stage === "pwchange") redirect("/ai-studio/change-password");

  const flags = await aiSelectOne<{ global_kill: boolean; breaker_open_until: string | null }>(
    "ai_settings",
    "id=eq.1&select=global_kill,breaker_open_until",
  ).catch(() => null);

  const { user } = session;
  const banners = (
    <>
      {process.env.AI_STUDIO_KILL_SWITCH === "1" || flags?.global_kill ? (
        <Banner tone="bad" title="Aczen AI is paused">
          API requests are temporarily refused with 503 service_paused. Your keys are unaffected and will work again
          when service resumes.
        </Banner>
      ) : flags?.breaker_open_until && new Date(flags.breaker_open_until) > new Date() ? (
        <Banner tone="warn" title="Degraded service">
          The model service is recovering from errors. Requests may briefly return 503 upstream_unavailable.
        </Banner>
      ) : null}
      {user.status === "suspended" && (
        <Banner tone="warn" title="Your API access is suspended">
          {user.status_reason ?? "Contact the Aczen team to restore access."} You can still revoke keys.
        </Banner>
      )}
    </>
  );

  return (
    <StudioShell
      nav={STUDIO_NAV}
      root="/ai-studio"
      who={user.display_name || user.email}
      whoDetail={user.team_name || (user.display_name ? user.email : null)}
      banners={banners}
      signOut={{ endpoint: "/api/ai-studio/auth/logout", method: "POST", redirectTo: "/ai-studio/login" }}
    >
      {children}
    </StudioShell>
  );
}
