"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { studioApi } from "@/components/ai-studio/client";

export default function SignOutButton({
  className,
  endpoint = "/api/ai-studio/auth/logout",
  method = "POST",
  redirectTo = "/ai-studio/login",
  withIcon = false,
}: {
  className?: string;
  endpoint?: string;
  method?: "POST" | "DELETE";
  redirectTo?: string;
  withIcon?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await studioApi(endpoint, {}, method);
        router.replace(redirectTo);
        router.refresh();
      }}
    >
      {withIcon && <LogOut className="h-4 w-4" aria-hidden />}
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
