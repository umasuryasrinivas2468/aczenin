/*
  First-run gate. An account still on its initial password (the email) lands
  here after sign-in and cannot reach any other page or API until it sets a
  real one: the console layout redirects "pwchange" sessions back here, and
  every key endpoint refuses them.
*/

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AuthFrame from "@/components/ai-studio/AuthFrame";
import ChangePasswordForm from "@/components/ai-studio/ChangePasswordForm";
import SignOutButton from "@/components/ai-studio/SignOutButton";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Set your password" };

export default async function ChangePasswordPage() {
  const session = await getUserSession();
  if (!session) redirect("/ai-studio/login");
  if (session.stage === "full") redirect("/ai-studio/account");

  return (
    <AuthFrame>
      <p className="mb-3 inline-flex w-fit items-center rounded-full bg-smeorange-50 px-2.5 py-1 text-xs font-semibold text-smeorange-700 ring-1 ring-inset ring-smeorange-200">
        One-time setup
      </p>
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Set your password</h1>
      <p className="mb-8 mt-1.5 text-sm text-slate-500">
        Signed in as <span className="font-medium text-slate-700">{session.user.email}</span>. Your temporary password
        was your email address. Choose a new one before you create API keys.
      </p>
      <ChangePasswordForm email={session.user.email} firstRun />
      <div className="mt-6 text-center">
        <SignOutButton className="text-sm text-slate-500 hover:text-slate-700" />
      </div>
    </AuthFrame>
  );
}
