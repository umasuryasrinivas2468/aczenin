"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { studioApi } from "@/components/ai-studio/client";
import { inputClass, primaryButtonClass } from "@/components/ai-studio/LoginForm";
import { checkPassword, PASSWORD_MIN } from "@/lib/ai-studio/password-policy";

export default function ChangePasswordForm({ email, firstRun }: { email: string; firstRun: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const policy = useMemo(() => checkPassword(next, email), [next, email]);
  const matches = next.length > 0 && next === confirm;

  const rules = [
    { ok: next.length >= PASSWORD_MIN, label: `At least ${PASSWORD_MIN} characters` },
    { ok: next.length > 0 && !next.toLowerCase().includes(email.split("@")[0].toLowerCase()), label: "Doesn't contain your email" },
    { ok: next.length > 0 && policy.ok, label: "Not a common or repetitive password" },
    { ok: matches, label: "Both entries match" },
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy.ok || !matches) return;
    setBusy(true);
    setError(null);
    const result = await studioApi<{ next: string }>("/api/ai-studio/auth/password", {
      currentPassword: firstRun ? email : current,
      newPassword: next,
    });
    if (result.ok) {
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      router.replace("/ai-studio");
      router.refresh();
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {!firstRun && (
        <div className="space-y-1.5">
          <label htmlFor="ais-current" className="text-sm font-medium text-slate-700">Current password</label>
          <input
            id="ais-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className={inputClass}
            disabled={busy}
            required
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="ais-new" className="text-sm font-medium text-slate-700">New password</label>
        <input
          id="ais-new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className={inputClass}
          disabled={busy}
          autoFocus={firstRun}
          required
          aria-describedby="ais-rules"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ais-confirm" className="text-sm font-medium text-slate-700">Confirm new password</label>
        <input
          id="ais-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
          disabled={busy}
          required
        />
      </div>

      <ul id="ais-rules" className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-[0.8rem]">
        {rules.map((rule) => (
          <li key={rule.label} className={rule.ok ? "flex items-center gap-2 text-emerald-700" : "flex items-center gap-2 text-slate-500"}>
            {rule.ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
            <span>{rule.label}</span>
            <span className="sr-only">{rule.ok ? "(met)" : "(not met)"}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={busy || done || !policy.ok || !matches || (!firstRun && !current)}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Saving…" : firstRun ? "Set password and continue" : "Change password"}
      </button>
      {!firstRun && (
        <p className="text-xs text-slate-500">Changing your password signs you out on every other device.</p>
      )}
    </form>
  );
}
