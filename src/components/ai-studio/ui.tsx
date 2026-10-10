/*
  Presentational building blocks for Aczen AI Studio. No data access and no
  client state, so every piece renders on the server and ships no JS.

  Visual language: aczen.in's own — white surfaces, Inter, the brand blue
  (#2e77ff family) for actions and data, the brand orange (#ff914d family) as
  the accent that marks "AI Studio" and the active place in the console.
*/

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/aczenimg.jpeg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="bg-gradient-to-r from-smebank-700 to-smeteal-600 bg-clip-text text-[1.2rem] font-bold tracking-tight text-transparent">
          Aczen
        </span>
        {!compact && (
          <span className="text-[1.2rem] font-semibold tracking-tight text-slate-900">
            AI Studio
          </span>
        )}
      </span>
      <span className="sr-only">Aczen AI Studio</span>
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-smeorange-600">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[0.95rem] font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8rem] text-slate-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[0.78rem] font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-[1.75rem] font-semibold tabular-nums tracking-tight text-slate-900",
          tone === "warn" && "text-amber-700",
          tone === "bad" && "text-red-700",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* A quota meter: used vs limit, with the percentage stated in text. */
export function Meter({
  label,
  used,
  limit,
  format = (n: number) => n.toLocaleString("en-IN"),
  hint,
}: {
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
  hint?: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : used > 0 ? 100 : 0;
  const tone = pct >= 90 ? "bg-red-600" : pct >= 75 ? "bg-amber-500" : "bg-smebank-500";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          <span className="font-medium text-slate-900">{format(used)}</span> / {format(limit)}
          <span className="ml-1.5 text-xs">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  expiring: "bg-amber-50 text-amber-800 ring-amber-600/25",
  suspended: "bg-amber-50 text-amber-800 ring-amber-600/25",
  pending: "bg-smebank-50 text-smebank-700 ring-smebank-600/20",
  revoked: "bg-slate-100 text-slate-600 ring-slate-500/20",
  disabled: "bg-red-50 text-red-700 ring-red-600/20",
  on: "bg-red-50 text-red-700 ring-red-600/20",
  off: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function StatusPill({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status] ?? STATUS_STYLES.revoked,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {children ?? status}
    </span>
  );
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: "info" | "warn" | "bad";
  title: string;
  children?: ReactNode;
}) {
  const styles = {
    info: "border-smebank-200 bg-smebank-50 text-smebank-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    bad: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", styles)}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-0.5 opacity-90">{children}</div>}
    </div>
  );
}

/* HTTP status → class label + status-palette color (never color alone: the label ships with it). */
export const STATUS_CLASSES = [
  { key: "s2xx", label: "2xx success", color: "#0ca30c" },
  { key: "s4xx", label: "4xx client error", color: "#fab219" },
  { key: "s429", label: "429 rate limited", color: "#ec835a" },
  { key: "s5xx", label: "5xx server error", color: "#d03b3b" },
] as const;

export function statusClassOf(code: number): (typeof STATUS_CLASSES)[number] {
  if (code >= 500) return STATUS_CLASSES[3];
  if (code === 429) return STATUS_CLASSES[2];
  if (code >= 400) return STATUS_CLASSES[1];
  return STATUS_CLASSES[0];
}

export function formatCompact(value: number): string {
  if (value >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString("en-IN");
}

export function formatTokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
