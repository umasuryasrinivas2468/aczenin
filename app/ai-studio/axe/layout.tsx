/*
  Gate and shell for the AI Studio admin panel.

  1. IP allowlist (optional, AI_STUDIO_ADMIN_IP_ALLOWLIST): a caller not on it
     gets the ordinary studio 404, indistinguishable from a missing page.
  2. Admin session: without one, ONLY the sign-in form renders. {children} is
     not rendered, so no page component — and none of its queries — runs.
  Pages below also re-check the session before querying (defence in depth).
*/

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import AdminLoginForm from "@/components/ai-studio/admin/AdminLoginForm";
import AuthFrame from "@/components/ai-studio/AuthFrame";
import StudioShell, { type NavItem } from "@/components/ai-studio/StudioShell";
import { clientIp } from "@/lib/axe/identity";
import { adminIpAllowed, hasAdminSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // One fixed title for every admin page. Page-specific titles would be
  // resolved even for the sign-in gate and name the panel's sections to anyone.
  title: { absolute: "Operator · Aczen AI Studio" },
  robots: { index: false, follow: false },
};

const ADMIN_NAV: NavItem[] = [
  { href: "/ai-studio/axe", label: "Overview", icon: "overview" },
  { href: "/ai-studio/axe/users", label: "Users & quotas", icon: "users" },
  { href: "/ai-studio/axe/controls", label: "Controls", icon: "controls" },
  { href: "/ai-studio/axe/audit", label: "Audit log", icon: "audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!adminIpAllowed(clientIp(await headers()))) notFound();

  if (!(await hasAdminSession())) {
    return (
      <AuthFrame admin>
        <AdminLoginForm />
      </AuthFrame>
    );
  }

  return (
    <StudioShell
      nav={ADMIN_NAV}
      root="/ai-studio/axe"
      who="Operator"
      whoDetail="Session ends after 30 min"
      badge={
        <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white">
          Operator console
        </span>
      }
      signOut={{ endpoint: "/api/ai-studio/axe/session", method: "DELETE", redirectTo: "/ai-studio/axe" }}
    >
      {children}
    </StudioShell>
  );
}
