"use client";

/*
  Team-lead management for operators: bulk add, per-user kill switch
  (suspend), disable, password reset, force logout, key revocation and
  per-user limit overrides. Destructive actions require a reason.
*/

import { Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { studioApi } from "@/components/ai-studio/client";
import { inputClass, primaryButtonClass } from "@/components/ai-studio/LoginForm";
import { formatCompact, formatTokens, formatWhen, StatusPill } from "@/components/ai-studio/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface UserView {
  id: string;
  email: string;
  displayName: string | null;
  teamName: string | null;
  status: "active" | "suspended" | "disabled";
  statusReason: string | null;
  pendingPassword: boolean;
  lastLoginAt: string | null;
  lastUsedAt: string | null;
  activeKeys: number;
  limits: { rpm: number; burst: number; concurrency: number; rpd: number; tpd: number; tpm: number; max_keys: number };
  overrides: Record<string, number | null>;
  today: { requests: number; tokens: number };
  month: { requests: number; tokens: number; denied: number; errors: number; cost: number };
  keys: Array<{ id: string; name: string; hint: string; lastUsedAt: string | null }>;
}

type Action = "suspend" | "activate" | "disable" | "reset_password" | "force_logout" | "revoke_keys";

const ACTION_COPY: Record<Action, { title: string; body: string; needsReason: boolean; danger: boolean; cta: string }> = {
  suspend: { title: "Suspend API access", body: "The gateway refuses every request from this user's keys. They can still sign in to see why and revoke keys.", needsReason: true, danger: true, cta: "Suspend" },
  activate: { title: "Restore API access", body: "Requests from this user's active keys will be admitted again.", needsReason: false, danger: false, cta: "Restore" },
  disable: { title: "Disable account", body: "The user can no longer sign in, every session ends and every key is revoked.", needsReason: true, danger: true, cta: "Disable" },
  reset_password: { title: "Reset password", body: "The password goes back to the user's email address and must be changed at next sign-in. All sessions end.", needsReason: false, danger: false, cta: "Reset" },
  force_logout: { title: "Sign out everywhere", body: "Every active portal session for this user ends immediately.", needsReason: false, danger: false, cta: "Sign out" },
  revoke_keys: { title: "Revoke all keys", body: "Every active key stops working immediately. Use when a leak is suspected.", needsReason: true, danger: true, cta: "Revoke all" },
};

const OVERRIDE_FIELDS: Array<[string, string]> = [
  ["rpm_override", "Requests / minute"],
  ["burst_override", "Burst"],
  ["concurrency_override", "Concurrent"],
  ["rpd_override", "Requests / day"],
  ["tpd_override", "Tokens / day"],
  ["tpm_override", "Tokens / month"],
  ["max_keys_override", "Max keys"],
];

function pctClass(used: number, limit: number): string {
  const pct = limit > 0 ? used / limit : 0;
  return pct >= 0.9 ? "text-red-700 font-semibold" : pct >= 0.75 ? "text-amber-700 font-medium" : "text-slate-600";
}

export default function UsersAdmin({ users, currency }: { users: UserView[]; currency: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "disabled" | "pending">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ user: UserView; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<UserView | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [keysOf, setKeysOf] = useState<UserView | null>(null);

  const money = (value: number) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
    catch { return value.toFixed(2); }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (filter === "pending" && !user.pendingPassword) return false;
      if (filter !== "all" && filter !== "pending" && user.status !== filter) return false;
      if (!q) return true;
      return [user.email, user.displayName, user.teamName].some((value) => value?.toLowerCase().includes(q));
    });
  }, [users, query, filter]);

  async function addUsers() {
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    const result = await studioApi<{ added: number; skipped: number }>("/api/ai-studio/axe/users", { emails: list, team_name: team.trim() || undefined });
    setBusy(false);
    if (!result.ok) return toast.error(result.message);
    toast.success(`Added ${result.data.added}${result.data.skipped ? `, skipped ${result.data.skipped} existing` : ""}. Initial password = their email.`);
    setAddOpen(false);
    setEmails("");
    setTeam("");
    router.refresh();
  }

  async function runAction() {
    if (!pending) return;
    setBusy(true);
    const body: Record<string, unknown> = { action: pending.action };
    if (reason.trim()) body.reason = reason.trim();
    const result = await studioApi(`/api/ai-studio/axe/users/${pending.user.id}`, body);
    setBusy(false);
    if (!result.ok) return toast.error(result.message);
    toast.success(`${ACTION_COPY[pending.action].title}: done`);
    setPending(null);
    setReason("");
    router.refresh();
  }

  async function saveOverrides() {
    if (!editing) return;
    const payload: Record<string, number | null> = {};
    for (const [key] of OVERRIDE_FIELDS) {
      const raw = (overrides[key] ?? "").trim();
      const before = editing.overrides[key];
      const next = raw === "" ? null : Number(raw);
      if (next !== null && (!Number.isInteger(next) || next < 0)) return toast.error("Overrides must be whole numbers ≥ 0, or empty for default.");
      if (next !== before) payload[key] = next;
    }
    setBusy(true);
    const result = await studioApi(`/api/ai-studio/axe/users/${editing.id}`, { action: "set_overrides", overrides: payload });
    setBusy(false);
    if (!result.ok) return toast.error(result.message);
    toast.success("Limits updated");
    setEditing(null);
    router.refresh();
  }

  async function revokeOne(keyId: string) {
    const reasonText = window.prompt("Reason for revoking this key (for the audit log):", "Revoked by operator");
    if (!reasonText || reasonText.trim().length < 3) return;
    const result = await studioApi(`/api/ai-studio/axe/keys/${keyId}/revoke`, { reason: reasonText.trim() });
    if (!result.ok) return toast.error(result.message);
    toast.success("Key revoked");
    setKeysOf(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              aria-label="Search users"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search email, name or team"
              className={cn(inputClass, "h-10 pl-9")}
            />
          </div>
          <div role="group" aria-label="Filter" className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
            {(["all", "active", "suspended", "disabled", "pending"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-medium capitalize", filter === value ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                {value === "pending" ? "Never signed in" : value}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className={cn(primaryButtonClass, "h-10")} onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Add team leads
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">User</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Today req / limit</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Month tokens / quota</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Refused · errors</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Cost (month)</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Keys</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shown.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No users match.</td></tr>
              )}
              {shown.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60">
                  <td className="max-w-[18rem] px-5 py-3">
                    <p className="truncate font-medium text-slate-900">{user.email}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[user.displayName, user.teamName].filter(Boolean).join(" · ") || "—"} · last used {formatWhen(user.lastUsedAt)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StatusPill status={user.status} />
                      {user.pendingPassword && <StatusPill status="pending">never signed in</StatusPill>}
                    </div>
                    {user.statusReason && <p className="mt-1 max-w-[14rem] truncate text-xs text-slate-500" title={user.statusReason}>{user.statusReason}</p>}
                  </td>
                  <td className={cn("px-3 py-3 text-right tabular-nums", pctClass(user.today.requests, user.limits.rpd))}>
                    {formatCompact(user.today.requests)} <span className="text-xs text-slate-400">/ {formatCompact(user.limits.rpd)}</span>
                  </td>
                  <td className={cn("px-3 py-3 text-right tabular-nums", pctClass(user.month.tokens, user.limits.tpm))}>
                    {formatTokens(user.month.tokens)} <span className="text-xs text-slate-400">/ {formatTokens(user.limits.tpm)}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                    {formatCompact(user.month.denied)} · {formatCompact(user.month.errors)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">{money(user.month.cost)}</td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" className="tabular-nums text-smebank-700 hover:underline" onClick={() => setKeysOf(user)}>
                      {user.activeKeys} / {user.limits.max_keys}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Actions for ${user.email}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => { setEditing(user); setOverrides(Object.fromEntries(OVERRIDE_FIELDS.map(([key]) => [key, user.overrides[key] === null ? "" : String(user.overrides[key])]))); }}>
                          Edit limits
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setKeysOf(user)}>View keys</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === "active" ? (
                          <DropdownMenuItem className="text-amber-700" onSelect={() => setPending({ user, action: "suspend" })}>Suspend access</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setPending({ user, action: "activate" })}>Restore access</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => setPending({ user, action: "revoke_keys" })} className="text-red-700">Revoke all keys</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPending({ user, action: "force_logout" })}>Sign out everywhere</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPending({ user, action: "reset_password" })}>Reset password</DropdownMenuItem>
                        {user.status !== "disabled" && (
                          <DropdownMenuItem className="text-red-700" onSelect={() => setPending({ user, action: "disable" })}>Disable account</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add users */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add team leads</DialogTitle>
            <DialogDescription>Paste emails separated by commas, spaces or new lines. Each starts with their email as the password and must change it at first sign-in. Existing emails are skipped.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              aria-label="Emails"
              rows={6}
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              className={cn(inputClass, "h-auto py-2.5 font-mono text-sm")}
              placeholder={"lead1@company.com\nlead2@company.com"}
            />
            <div className="space-y-1.5">
              <label htmlFor="team-name" className="text-sm font-medium text-slate-700">Team name (optional)</label>
              <input id="team-name" value={team} onChange={(event) => setTeam(event.target.value)} className={cn(inputClass, "h-10")} maxLength={120} />
            </div>
          </div>
          <DialogFooter>
            <button type="button" className={primaryButtonClass} disabled={busy || !emails.trim()} onClick={addUsers}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action */}
      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) { setPending(null); setReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle>{ACTION_COPY[pending.action].title}</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-slate-700">{pending.user.email}</span>. {ACTION_COPY[pending.action].body}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <label htmlFor="action-reason" className="text-sm font-medium text-slate-700">
                  Reason {ACTION_COPY[pending.action].needsReason ? "" : "(optional)"}
                </label>
                <textarea id="action-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className={cn(inputClass, "h-auto py-2.5")} />
              </div>
              <DialogFooter>
                <button
                  type="button"
                  className={cn(primaryButtonClass, ACTION_COPY[pending.action].danger && "bg-red-600 hover:bg-red-700")}
                  disabled={busy || (ACTION_COPY[pending.action].needsReason && reason.trim().length < 3)}
                  onClick={runAction}
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} {ACTION_COPY[pending.action].cta}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Overrides */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>Limits for {editing.email}</DialogTitle>
                <DialogDescription>Leave a field empty to use the platform default (× multiplier). Overrides are exact numbers and are not multiplied.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {OVERRIDE_FIELDS.map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label htmlFor={`o-${key}`} className="text-sm font-medium text-slate-700">{label}</label>
                    <input
                      id={`o-${key}`}
                      type="number"
                      min={0}
                      value={overrides[key] ?? ""}
                      placeholder={`default · now ${(editing.limits as Record<string, number>)[key.replace("_override", "")]?.toLocaleString("en-IN") ?? ""}`}
                      onChange={(event) => setOverrides((o) => ({ ...o, [key]: event.target.value }))}
                      className={cn(inputClass, "h-10 tabular-nums")}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <button type="button" className={primaryButtonClass} disabled={busy} onClick={saveOverrides}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save limits
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Keys */}
      <Dialog open={!!keysOf} onOpenChange={(open) => { if (!open) setKeysOf(null); }}>
        <DialogContent className="sm:max-w-lg">
          {keysOf && (
            <>
              <DialogHeader>
                <DialogTitle>Active keys · {keysOf.email}</DialogTitle>
                <DialogDescription>Revoking a key is the per-key kill switch. It takes effect on the next request.</DialogDescription>
              </DialogHeader>
              {keysOf.keys.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No active keys.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {keysOf.keys.map((key) => (
                    <li key={key.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{key.name}</span>
                        <span className="block font-mono text-xs text-slate-500">{key.hint} · used {formatWhen(key.lastUsedAt)}</span>
                      </span>
                      <button type="button" className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => revokeOne(key.id)}>
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
