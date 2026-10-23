"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { studioApi } from "@/components/ai-studio/client";
import { inputClass, primaryButtonClass } from "@/components/ai-studio/LoginForm";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await studioApi("/api/ai-studio/axe/session", { password });
    setPassword("");
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  return (
    <div>
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Operator sign-in</h1>
      <p className="mt-1.5 text-sm text-slate-500">Sessions last 30 minutes. Three wrong attempts lock this device out for an hour.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="aia-password" className="text-sm font-medium text-slate-700">Password</label>
          <input
            id="aia-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            disabled={busy}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button type="submit" className={`${primaryButtonClass} w-full`} disabled={busy || !password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue
        </button>
      </form>
    </div>
  );
}
