"use client";

/*
  Operator controls: kill switch, breaker, budget and prices, default limits,
  the "raise limits for everyone" multiplier with a budget-impact preview, and
  the automatic-rule thresholds. Every save is a PATCH to
  /api/ai-studio/axe/settings, validated server-side and audit-logged.
*/

import { AlertOctagon, Loader2, Power, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { studioApi } from "@/components/ai-studio/client";
import { inputClass, primaryButtonClass } from "@/components/ai-studio/LoginForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type Settings = Record<string, number | string | boolean | null>;

interface Field {
  key: string;
  label: string;
  help?: string;
  step?: number;
  suffix?: string;
  type?: "number" | "text" | "boolean";
}

const BUDGET_FIELDS: Field[] = [
  { key: "monthly_budget", label: "Monthly budget", step: 100, help: "0 disables every budget rule." },
  { key: "currency", label: "Currency", type: "text", help: "ISO code, e.g. INR or USD." },
  { key: "daily_cap_factor", label: "Daily cap factor", step: 0.1, suffix: "×", help: "Daily cap = budget ÷ days in month × this." },
  { key: "price_input_per_mtok", label: "Input price / 1M tokens", step: 0.01, help: "From the GCP Vertex AI rate card." },
  { key: "price_output_per_mtok", label: "Output price / 1M tokens", step: 0.01 },
];

const LIMIT_FIELDS: Field[] = [
  { key: "default_rpm", label: "Requests / minute", help: "Per user." },
  { key: "default_burst", label: "Burst", help: "Short bursts above the per-minute rate." },
  { key: "default_concurrency", label: "Concurrent requests" },
  { key: "default_rpd", label: "Requests / day" },
  { key: "default_tpd", label: "Tokens / day", step: 1000 },
  { key: "default_tpm", label: "Tokens / month", step: 100000 },
  { key: "max_keys_per_user", label: "Keys per user" },
  { key: "max_input_tokens", label: "Max input tokens / request", step: 1000 },
  { key: "max_output_tokens", label: "Max output tokens / request", step: 500 },
  { key: "global_rpm", label: "Platform requests / minute", help: "Across all users." },
];

const RULE_FIELDS: Field[] = [
  { key: "alert_pct", label: "Alert at", suffix: "% of budget", help: "Emails the operator." },
  { key: "throttle_pct", label: "Throttle at", suffix: "% of budget" },
  { key: "throttle_factor", label: "Throttle factor", step: 0.05, suffix: "×", help: "Limits are multiplied by this while throttled." },
  { key: "hard_stop_pct", label: "Hard stop at", suffix: "% of budget", help: "Gateway returns 503 budget_exhausted." },
  { key: "anomaly_enabled", label: "Anomaly auto-suspend", type: "boolean" },
  { key: "anomaly_multiplier", label: "Anomaly multiplier", step: 0.5, suffix: "×", help: "Last hour vs 7-day hourly average." },
  { key: "anomaly_min_requests", label: "Anomaly floor", suffix: "req / hour", help: "Never suspend below this volume." },
  { key: "breaker_error_pct", label: "Breaker error rate", suffix: "%" },
  { key: "breaker_min_requests", label: "Breaker minimum volume", suffix: "requests" },
  { key: "breaker_window_seconds", label: "Breaker window", suffix: "s" },
  { key: "breaker_cooldown_seconds", label: "Breaker cooldown", suffix: "s" },
];

async function save(body: Record<string, unknown>): Promise<boolean> {
  const result = await studioApi("/api/ai-studio/axe/settings", body, "PATCH");
  if (!result.ok) {
    toast.error(result.message);
    return false;
  }
  toast.success("Saved");
  return true;
}

function SettingsForm({ title, description, fields, settings }: { title: string; description?: string; fields: Field[]; settings: Settings }) {
  const router = useRouter();
  const initial = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, settings[field.key]])), [fields, settings]);
  const [values, setValues] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);

  const changed = fields.filter((field) => String(values[field.key]) !== String(initial[field.key]));

  async function submit() {
    const patch: Record<string, unknown> = {};
    for (const field of changed) {
      const value = values[field.key];
      if (field.type === "boolean") patch[field.key] = Boolean(value);
      else if (field.type === "text") patch[field.key] = String(value).trim().toUpperCase();
      else {
        const number = Number(value);
        if (!Number.isFinite(number)) return toast.error(`${field.label} must be a number.`);
        patch[field.key] = number;
      }
    }
    setBusy(true);
    const ok = await save({ patch });
    setBusy(false);
    if (ok) router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[0.95rem] font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-[0.8rem] text-slate-500">{description}</p>}
      </header>
      <div className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label htmlFor={`f-${field.key}`} className="text-sm font-medium text-slate-700">{field.label}</label>
            {field.type === "boolean" ? (
              <button
                id={`f-${field.key}`}
                type="button"
                role="switch"
                aria-checked={Boolean(values[field.key])}
                onClick={() => setValues((v) => ({ ...v, [field.key]: !v[field.key] }))}
                className={cn("relative h-7 w-12 rounded-full transition", values[field.key] ? "bg-smebank-600" : "bg-slate-300")}
              >
                <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", values[field.key] ? "left-6" : "left-1")} />
              </button>
            ) : (
              <div className="relative">
                <input
                  id={`f-${field.key}`}
                  type={field.type === "text" ? "text" : "number"}
                  step={field.step ?? 1}
                  min={0}
                  value={values[field.key] === null ? "" : String(values[field.key])}
                  onChange={(event) => setValues((v) => ({ ...v, [field.key]: event.target.value }))}
                  className={cn(inputClass, "h-10 tabular-nums", field.suffix && "pr-24")}
                />
                {field.suffix && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{field.suffix}</span>
                )}
              </div>
            )}
            {field.help && <p className="text-xs text-slate-400">{field.help}</p>}
          </div>
        ))}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-500">{changed.length ? `${changed.length} unsaved change${changed.length > 1 ? "s" : ""}` : "No changes"}</span>
        <div className="flex gap-2">
          {changed.length > 0 && (
            <button type="button" className="h-9 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100" onClick={() => setValues(initial)}>
              Discard
            </button>
          )}
          <button type="button" className={cn(primaryButtonClass, "h-9")} onClick={submit} disabled={busy || changed.length === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </footer>
    </section>
  );
}

export interface MultiplierContext {
  activeUsers: number;
  overriddenTpm: number[]; // tpm_override of active users that have one
}

function MultiplierCard({ settings, context }: { settings: Settings; context: MultiplierContext }) {
  const router = useRouter();
  const current = Number(settings.limit_multiplier);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  const currency = String(settings.currency);
  const blended = 0.8 * Number(settings.price_input_per_mtok) + 0.2 * Number(settings.price_output_per_mtok);
  const defaultUsers = context.activeUsers - context.overriddenTpm.length;
  const worstCase = (mult: number) =>
    ((defaultUsers * Number(settings.default_tpm) * mult + context.overriddenTpm.reduce((a, b) => a + b, 0)) * blended) / 1e6;
  const fmt = (n: number) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
    catch { return n.toFixed(0); }
  };

  const rows: Array<[string, string]> = [
    ["Requests / minute", "default_rpm"],
    ["Requests / day", "default_rpd"],
    ["Tokens / day", "default_tpd"],
    ["Tokens / month", "default_tpm"],
  ];

  return (
    <section className="rounded-2xl border border-smebank-200 bg-gradient-to-br from-smebank-50/70 to-white">
      <header className="border-b border-smebank-100 px-5 py-4">
        <h2 className="text-[0.95rem] font-semibold text-slate-900">Raise limits for everyone</h2>
        <p className="mt-0.5 text-[0.8rem] text-slate-500">Multiplies every default limit. Users with a per-user override keep their override.</p>
      </header>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="mult" className="text-sm font-medium text-slate-700">Multiplier</label>
            <span className="text-2xl font-semibold tabular-nums text-slate-900">×{value.toFixed(2)}</span>
          </div>
          <input
            id="mult"
            type="range"
            min={0.25}
            max={10}
            step={0.25}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
            className="mt-3 w-full accent-smebank-600"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 1.5, 2, 3, 5].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue(preset)}
                className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium", value === preset ? "border-smebank-500 bg-white text-smebank-800" : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white")}
              >
                ×{preset}
              </button>
            ))}
          </div>
          <table className="mt-5 w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th scope="col" className="pb-2 font-medium">Default</th><th scope="col" className="pb-2 text-right font-medium">Now</th><th scope="col" className="pb-2 text-right font-medium">After</th></tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map(([label, key]) => (
                <tr key={key} className="border-t border-smebank-100/70">
                  <td className="py-1.5 text-slate-600">{label}</td>
                  <td className="py-1.5 text-right text-slate-500">{Math.floor(Number(settings[key]) * current).toLocaleString("en-IN")}</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">{Math.floor(Number(settings[key]) * value).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Budget impact</p>
          <p className="mt-1 text-xs text-slate-500">
            Worst case if all {context.activeUsers} active users use their full monthly token quota (blended 80% input / 20% output pricing).
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Now</dt><dd className="tabular-nums">{fmt(worstCase(current))}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">After</dt><dd className="font-semibold tabular-nums">{fmt(worstCase(value))}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="text-slate-500">Monthly budget</dt><dd className="tabular-nums">{fmt(Number(settings.monthly_budget))}</dd></div>
          </dl>
          {blended === 0 && <p className="mt-3 text-xs text-amber-700">Prices are unset, so the impact reads as zero.</p>}
          {blended > 0 && worstCase(value) > Number(settings.monthly_budget) && (
            <p className="mt-3 text-xs text-amber-700">Worst case exceeds the budget. The throttle and hard stop still apply.</p>
          )}
          <button
            type="button"
            className={cn(primaryButtonClass, "mt-5 h-10 w-full")}
            disabled={busy || value === current}
            onClick={async () => {
              setBusy(true);
              const ok = await save({ patch: { limit_multiplier: value } });
              setBusy(false);
              if (ok) router.refresh();
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Apply ×{value.toFixed(2)} to everyone
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ControlsPanel({
  settings,
  context,
  breakerOpenUntil,
  envKill,
}: {
  settings: Settings;
  context: MultiplierContext;
  breakerOpenUntil: string | null;
  envKill: boolean;
}) {
  const router = useRouter();
  const killed = Boolean(settings.global_kill);
  const [dialog, setDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const breakerOpen = !!breakerOpenUntil && new Date(breakerOpenUntil) > new Date();

  return (
    <div className="space-y-6">
      <section className={cn("rounded-2xl border p-5", killed ? "border-red-300 bg-red-50" : "border-slate-200/80 bg-white")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", killed ? "bg-red-600 text-white" : "bg-slate-900 text-white")}>
              <Power className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-[0.95rem] font-semibold text-slate-900">Global kill switch</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {killed
                  ? `ON. Every API request returns 503 service_paused. Reason: ${settings.global_kill_reason ?? "—"}`
                  : "Off. Turning it on refuses every API request instantly, for all users and keys."}
              </p>
              {envKill && <p className="mt-1 text-xs font-medium text-red-700">AI_STUDIO_KILL_SWITCH=1 is set in the environment and overrides this toggle.</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setReason(""); setDialog(true); }}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm",
              killed ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700",
            )}
          >
            <AlertOctagon className="h-4 w-4" aria-hidden /> {killed ? "Resume service" : "Pause all traffic"}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[0.95rem] font-semibold text-slate-900">Upstream circuit breaker</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {breakerOpen ? `Open until ${new Date(breakerOpenUntil as string).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST. Requests return 503 upstream_unavailable.` : "Closed. Traffic is flowing to the harness."}
          </p>
        </div>
        <button
          type="button"
          disabled={!breakerOpen || busy}
          onClick={async () => {
            setBusy(true);
            const ok = await save({ reset_breaker: true });
            setBusy(false);
            if (ok) router.refresh();
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Close breaker now
        </button>
      </section>

      <MultiplierCard settings={settings} context={context} />
      <SettingsForm title="Budget & pricing" description="Cost is computed from reported token usage at these prices." fields={BUDGET_FIELDS} settings={settings} />
      <SettingsForm title="Default limits" description="Apply to every user without an override, before the multiplier." fields={LIMIT_FIELDS} settings={settings} />
      <SettingsForm title="Automatic rules" description="Throttle and hard stop are enforced on every request; alerts and anomaly checks run at most once a minute." fields={RULE_FIELDS} settings={settings} />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{killed ? "Resume Aczen AI?" : "Pause all Aczen AI traffic?"}</DialogTitle>
            <DialogDescription>
              {killed ? "Requests will be admitted again, subject to limits and budget." : "Every request from every key will be refused with 503 until you resume."}
              {" "}The reason goes into the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="kill-reason" className="text-sm font-medium text-slate-700">Reason</label>
            <textarea
              id="kill-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={cn(inputClass, "h-auto py-2.5")}
              placeholder={killed ? "e.g. Incident resolved" : "e.g. Suspected key abuse, investigating"}
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              disabled={busy || reason.trim().length < 3}
              className={cn(primaryButtonClass, killed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}
              onClick={async () => {
                setBusy(true);
                const ok = await save({ patch: { global_kill: !killed }, reason: reason.trim() });
                setBusy(false);
                if (ok) { setDialog(false); router.refresh(); }
              }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {killed ? "Resume service" : "Pause traffic"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
