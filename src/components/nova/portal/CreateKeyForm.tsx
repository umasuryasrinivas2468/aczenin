"use client";

/*
  "Create key" form plus the one-time reveal of the new secret.

  The plaintext key exists only in this component's state, for as long as the
  tab stays on the page. The server stores only its hash, so there is no way
  to show it again — the copy says so, loudly.

  WHY canCreate HIDES ONLY THE FORM: the dashboard keeps this component
  mounted whether or not an active key exists. A successful create re-renders
  the page with that key now active (canCreate → false); if the whole
  component unmounted, the reveal would vanish with the secret in it.
*/

// Local form and reveal state.
import { useState, type FormEvent } from "react";
// Plus glyph on the submit button; alert glyph on the reveal.
import { KeyRound, Plus, TriangleAlert } from "lucide-react";

// House primitives.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Session-checked server action (identity comes from the cookie, not from here).
import { createKeyAction } from "../../../../app/nova-api/actions";
// For the key and the ready-to-run curl line.
import CopyButton from "./CopyButton";

// Where the sample request points; matches design §6.
// www, not the apex: aczen.in 308-redirects to www.aczen.in, and HTTP clients drop the
// Authorization header on a cross-host redirect, so an apex base URL 401s every call.
const BASE_URL = "https://www.aczen.in/nova-api/v1";

export default function CreateKeyForm({ canCreate }: { canCreate: boolean }) {
  // The label the user types.
  const [name, setName] = useState("");
  // In-flight guard.
  const [busy, setBusy] = useState(false);
  // Error text for the alert region.
  const [error, setError] = useState<string | null>(null);
  // The freshly created secret — the only copy that will ever exist client-side.
  const [created, setCreated] = useState<string | null>(null);

  // Submit: create, then reveal.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // The action is called directly; no full-page form post.
    event.preventDefault();
    // Lock the form and clear the last error before the round trip.
    setBusy(true);
    setError(null);
    try {
      // Name is validated server-side too; this is only the transport.
      const result = await createKeyAction(name);
      // "in" narrowing, not result.ok: the repo compiles without
      // strictNullChecks, where boolean-discriminant narrowing does not apply.
      if ("key" in result) {
        // Reveal it and clear the name for the next one.
        setCreated(result.key);
        setName("");
      } else {
        // Name rule, one-key cap (incl. the DB's 409), signed out, or generic.
        setError(result.message);
      }
    } catch {
      // Network failure before the action answered.
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      // Always unlock, success or not.
      setBusy(false);
    }
  }

  // Sample built from the real key so it can be pasted straight into a shell.
  const curl = created ? `curl "${BASE_URL}/invoices?limit=5" \\\n  -H "Authorization: Bearer ${created}"` : "";

  return (
    <div className="space-y-3">
      {/* One-time reveal. Shown first so it is the first thing seen. Amber is
          the house warning colour (same as the alert styles elsewhere). */}
      {created ? (
        <div
          role="status"
          className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm dark:bg-amber-950/30"
        >
          <div className="flex gap-2">
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold">Copy your key now — you won&apos;t see it again.</p>
              <p className="text-muted-foreground">
                We only store a hash of it. If you lose it, revoke it and create a new one.
              </p>
            </div>
          </div>
          {/* break-all so the 51-char key wraps at 320px instead of overflowing. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded border bg-background px-3 py-2 font-mono text-xs">{created}</code>
            <CopyButton value={created} label="Copy key" />
          </div>
          {/* The same key, already wired into a request. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Try it</p>
              <CopyButton value={curl.replace(" \\\n  ", " ")} label="Copy curl" />
            </div>
            {/* overflow-x-auto: the line scrolls inside the block, never the page. */}
            <pre className="overflow-x-auto rounded bg-slate-900 p-3 font-mono text-xs text-slate-100">
              <code>{curl}</code>
            </pre>
          </div>
          {/* Explicit dismiss, so the secret can be taken off-screen deliberately. */}
          <Button type="button" variant="outline" size="sm" onClick={() => setCreated(null)}>
            I&apos;ve saved it — hide
          </Button>
        </div>
      ) : null}

      {/* Create form: only when a create can succeed (no active key yet). */}
      {canCreate ? (
        <div className="rounded-lg border border-dashed bg-card p-4 sm:p-5">
          <div className="mb-4 flex gap-3">
            {/* Brand-tinted icon tile, so the empty state reads as an invitation. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-smeorange-800">
              <KeyRound aria-hidden className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium">No active key</p>
              <p className="text-sm text-muted-foreground">Name it after where it will live, e.g. the app or environment.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="nova-key-name">Key name</Label>
              <Input
                id="nova-key-name"
                // Mirrors the DB CHECK so the browser stops an over-long name first.
                maxLength={60}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
                placeholder="e.g. staging sync"
                autoComplete="off"
              />
            </div>
            {/* Disabled for empty names, which the server would only reject. */}
            <Button type="submit" disabled={busy || name.trim().length === 0} className="gap-1.5">
              <Plus aria-hidden className="h-4 w-4" />
              {busy ? "Creating…" : "Create key"}
            </Button>
          </form>
        </div>
      ) : null}

      {/* Errors stay visible even after the form hides (e.g. a lost race). */}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
