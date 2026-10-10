import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AuthFrame from "@/components/ai-studio/AuthFrame";
import LoginForm from "@/components/ai-studio/LoginForm";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getUserSession();
  if (session) redirect(session.stage === "pwchange" ? "/ai-studio/change-password" : "/ai-studio");

  return (
    <AuthFrame>
      <LoginForm />
    </AuthFrame>
  );
}
