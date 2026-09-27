"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { studioApi } from "@/components/ai-studio/client";

export const inputClass =
  "block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[0.95rem] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-smebank-500 focus:ring-4 focus:ring-smebank-500/15 disabled:opacity-60";

export const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-smebank-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-smebank-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-smebank-500/30 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await studioApi<{ next: string }>("/api/ai-studio/auth/login", { email, password });
    if (result.ok) {
      setPassword("");
      router.replace(result.data.next === "/ai-studio/change-password" ? "/ai-studio/change-password" : "/ai-studio");
      router.refresh();
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  return (
    <div>
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-1.5 text-sm text-slate-500">Use the team-lead email your Aczen contact registered.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="ais-email" className="text-sm font-medium text-slate-700">Work email</label>
          <input
            id="ais-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="lead@company.com"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ais-password" className="text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <input
              id="ais-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-11`}
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smebank-500"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">First time here? Your password is your email address. You&apos;ll set a new one next.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" className={`${primaryButtonClass} w-full`} disabled={busy || !email || !password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-slate-400">
        Access is limited to registered team leads. Trouble signing in? Write to{" "}
        <a className="text-smebank-700 underline-offset-2 hover:underline" href="mailto:team@aczen.in">team@aczen.in</a>.
      </p>
    </div>
  );
}
