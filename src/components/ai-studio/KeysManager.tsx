"use client";

/*
  API key management: create, reveal-once, rotate (immediate or with a grace
  window) and revoke.

  The newly minted key lives only in this component's state, only until the
  dialog closes. It is never written to storage, the URL or the console, and
  the reveal is marked for masking by session-replay tools in case one is ever
  added to the site despite the studio CSP.
*/

import { AlertTriangle, Check, Copy, KeyRound, Loader2, Plus, RotateCw, ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { studioApi } from "@/components/ai-studio/client";
import { inputClass, primaryButtonClass } from "@/components/ai-studio/LoginForm";
import { formatWhen, StatusPill } from "@/components/ai-studio/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface KeyView {
  id: string;
  name: string;
  hint: string;
  state: "active" | "expiring" | "revoked";
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedReason: string | null;
}

const secondaryButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smebank-500 disabled:opacity-50";

export default function KeysManager({
  keys,
  maxKeys,
  canCreate,
}: {
  keys: KeyView[];
  maxKeys: number;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ key: string; hint: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<KeyView | null>(null);
  const [rotateMode, setRotateMode] = useState<"immediate" | "grace">("immediate");
  const [graceHours, setGraceHours] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<KeyView | null>(null);

  const activeCount = keys.filter((key) => key.state === "active").length;
  const atLimit = activeCount >= maxKeys;
  const live = keys.filter((key) => key.state !== "revoked");
  const history = keys.filter((key) => key.state === "revoked");

  function reset() {
    setBusy(false);
    setError(null);
  }

  async function create() {
    setBusy(true);
    setError(null);
    const result = await studioApi<{ key: string; hint: string }>("/api/ai-studio/keys", { name: name.trim() });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setCreateOpen(false);
    setName("");
    setRevealed({ key: result.data.key, hint: result.data.hint });
    router.refresh();
  }

  async function rotate() {
    if (!rotateTarget) return;
    setBusy(true);
    setError(null);
    const result = await studioApi<{ key: string; hint: string }>(`/api/ai-studio/keys/${rotateTarget.id}/rotate`, {
      mode: rotateMode,
      graceHours: rotateMode === "grace" ? graceHours : 0,
      name: rotateTarget.name,
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setRotateTarget(null);
    setRevealed({ key: result.data.key, hint: result.data.hint });
    toast.success(rotateMode === "immediate" ? "Old key revoked. New key created." : `Old key keeps working for ${graceHours}h.`);
    router.refresh();
  }

  async function revoke() {
    if (!revokeTarget) return;
    setBusy(true);
    setError(null);
    const result = await studioApi(`/api/ai-studio/keys/${revokeTarget.id}/revoke`, {});
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setRevokeTarget(null);
    toast.success("Key revoked. It stops working immediately.");
    router.refresh();
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the key and copy it manually.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-slate-900">Active keys</h2>
            <p className="mt-0.5 text-[0.8rem] text-slate-500">
              {activeCount} of {maxKeys} in use. Keep a spare slot free so you can rotate without downtime.
            </p>
          </div>
          <button
            type="button"
            className={cn(primaryButtonClass, "h-10")}
            onClick={() => { reset(); setCreateOpen(true); }}
            disabled={!canCreate || atLimit}
            title={atLimit ? "Revoke or rotate a key first" : undefined}
          >
            <Plus className="h-4 w-4" aria-hidden /> Create key
          </button>
        </header>

        {live.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-smeorange-50 text-smeorange-600 ring-1 ring-inset ring-smeorange-200">
              <KeyRound className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-900">No active keys</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Create a key to start calling Aczen AI from your project&apos;s backend.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {live.map((key) => (
              <li key={key.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{key.name}</p>
                    {key.state === "expiring" ? (
                      <StatusPill status="expiring">Expires {formatWhen(key.expiresAt)}</StatusPill>
                    ) : (
                      <StatusPill status="active">Active</StatusPill>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[0.8rem] text-slate-500">{key.hint}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatWhen(key.createdAt)} · Last used {formatWhen(key.lastUsedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {key.state === "active" && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => { reset(); setRotateMode("grace"); setRotateTarget(key); }}
                      disabled={!canCreate}
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden /> Rotate
                    </button>
                  )}
                  <button
                    type="button"
                    className={cn(secondaryButton, "text-red-700 hover:bg-red-50")}
                    onClick={() => { reset(); setRevokeTarget(key); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/80 to-white p-5">
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[0.95rem] font-semibold text-slate-900">Did a key leak?</h2>
            <p className="mt-1 text-sm text-slate-600">
              If a key was committed to a public repo, pasted in a chat or shipped in front-end code, treat it as
              compromised. Rotate it <span className="font-medium">immediately</span>: the old key stops working the
              moment you confirm, and you get a new one to redeploy.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Click <span className="font-medium">Rotate</span> on the key and choose <span className="font-medium">Revoke now</span>.</li>
              <li>Put the new key in your server&apos;s secret store (never in the repo) and redeploy.</li>
              <li>Remove the old key from git history. Deleting the file in a new commit is not enough.</li>
            </ol>
            {live.some((key) => key.state === "active") && (
              <div className="mt-4 flex flex-wrap gap-2">
                {live.filter((key) => key.state === "active").map((key) => (
                  <button
                    key={key.id}
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                    onClick={() => { reset(); setRotateMode("immediate"); setRotateTarget(key); }}
                    disabled={!canCreate}
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden /> Emergency rotate &ldquo;{key.name}&rdquo;
                  </button>
                ))}
              </div>
            )}
            {!canCreate && live.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">Your access is suspended, so keys can&apos;t be rotated. Use Revoke to shut a leaked key off.</p>
            )}
          </div>
        </div>
      </section>

      {history.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white">
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[0.95rem] font-semibold text-slate-900">Revoked keys</h2>
          </header>
          <ul className="divide-y divide-slate-100">
            {history.slice(0, 20).map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-slate-700">{key.name}</span>{" "}
                  <span className="font-mono text-xs text-slate-400">{key.hint}</span>
                </span>
                <span className="text-xs text-slate-400">{key.revokedReason ?? "revoked"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) reset(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Name it after where it will run, so you know which one to rotate later.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => { event.preventDefault(); void create(); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="key-name" className="text-sm font-medium text-slate-700">Key name</label>
              <input
                id="key-name"
                className={inputClass}
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. production-backend"
                autoFocus
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <DialogFooter>
              <button type="submit" className={primaryButtonClass} disabled={busy || name.trim().length === 0}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create key
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reveal once */}
      <Dialog open={!!revealed} onOpenChange={(open) => { if (!open) { setRevealed(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Save your new key</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. We store only a one-way fingerprint, so it can&apos;t be
              recovered, only replaced.
            </DialogDescription>
          </DialogHeader>
          {revealed && (
            <div className="space-y-4">
              <div className="flex items-stretch gap-2">
                <code
                  data-clarity-mask="true"
                  className="block min-w-0 flex-1 select-all break-all rounded-xl border border-slate-200 bg-slate-950 px-3.5 py-3 font-mono text-[0.8rem] leading-relaxed text-emerald-300 [font-family:var(--font-studio-mono),monospace]"
                >
                  {revealed.key}
                </code>
                <button
                  type="button"
                  onClick={() => copy(revealed.key)}
                  className={cn(secondaryButton, "h-auto px-3")}
                  aria-label="Copy key"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[0.8rem] text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  Store it in your server&apos;s environment or secret manager. Never commit it or use it in browser or
                  mobile code, where anyone can read it.
                </p>
              </div>
              <DialogFooter>
                <button type="button" className={primaryButtonClass} onClick={() => { setRevealed(null); setCopied(false); }}>
                  I&apos;ve saved it
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rotate */}
      <Dialog open={!!rotateTarget} onOpenChange={(open) => { if (!open) { setRotateTarget(null); reset(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rotate &ldquo;{rotateTarget?.name}&rdquo;</DialogTitle>
            <DialogDescription>A new key is created now. Choose what happens to the old one.</DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Rotation mode</legend>
            {[
              { value: "immediate" as const, title: "Revoke now", body: "Use this if the key leaked. The old key stops working immediately; update your deployment right after." },
              { value: "grace" as const, title: "Keep old key working for a while", body: "Planned rotation. Both keys work until the grace window ends, so there is no downtime." },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition",
                  rotateMode === option.value ? "border-smebank-500 bg-smebank-50/60 ring-2 ring-smebank-500/15" : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  name="rotate-mode"
                  className="mt-1 accent-smebank-600"
                  checked={rotateMode === option.value}
                  onChange={() => setRotateMode(option.value)}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                  <span className="mt-0.5 block text-[0.8rem] text-slate-600">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {rotateMode === "grace" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">Grace window:</span>
              {[1, 6, 24].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setGraceHours(hours)}
                  aria-pressed={graceHours === hours}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    graceHours === hours ? "border-smebank-500 bg-smebank-50 text-smebank-800" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {hours}h
                </button>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              className={cn(primaryButtonClass, rotateMode === "immediate" && "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500/30")}
              onClick={() => void rotate()}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {rotateMode === "immediate" ? "Revoke old key and rotate" : `Rotate with ${graceHours}h grace`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) { setRevokeTarget(null); reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke &ldquo;{revokeTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              Any application using <span className="font-mono">{revokeTarget?.hint}</span> will start receiving 401
              errors immediately. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              className={cn(primaryButtonClass, "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500/30")}
              onClick={() => void revoke()}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Revoke key
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
