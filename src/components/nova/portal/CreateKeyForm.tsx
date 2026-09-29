"use client";

/*
  "Create key" form plus the one-time reveal of the new secret.

  The plaintext key exists only in this component's state, for as long as the
  tab stays on the page. The server stores only its hash, so there is no way
  to show it again — the copy says so, loudly.
*/

// Local form and reveal state.
import { useState, type FormEvent } from "react";

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

export default function CreateKeyForm({ disabled }: { disabled: boolean }) {
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
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createKeyAction(name);
      // "in" narrowing, not result.ok: the repo compiles without
      // strictNullChecks, where boolean-discriminant narrowing does not apply.
      if ("key" in result) {
        // Reveal it and clear the name for the next one.
        setCreated(result.key);
        setName("");
      } else {
        // Name rule, key cap, signed out, or generic.
        setError(result.message);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Sample built from the real key so it can be pasted straight into a shell.
  const curl = created ? `curl ${BASE_URL}/invoices?limit=5 \\\n  -H "Authorization: Bearer ${created}"` : "";

  return (
    <div className="space-y-4">
      {/* One-time reveal. Shown above the form so it is the first thing seen. */}
      {created ? (
        <div
          role="status"
          className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm dark:bg-amber-950/30"
        >
          <p className="font-semibold">Copy your key now — you won&apos;t see it again.</p>
          <p className="text-muted-foreground">
            We only store a hash of it. If you lose it, revoke it and create a new one.
          </p>
          {/* break-all so the 51-char key wraps at 320px instead of overflowing. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-xs">{created}</code>
            <CopyButton value={created} label="Copy key" />
          </div>
          {/* The same key, already wired into a request. */}
          <div className="space-y-2">
            <p className="font-medium">Try it:</p>
            <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              <code>{curl}</code>
            </pre>
            <CopyButton value={curl.replace(" \\\n  ", " ")} label="Copy curl" />
          </div>
          {/* Explicit dismiss, so the secret can be taken off-screen deliberately. */}
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreated(null)}>
            I&apos;ve saved it — hide
          </Button>
        </div>
      ) : null}

      {/* Create form. Disabled (not hidden) at the cap, so the limit is visible. */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="nova-key-name">Key name</Label>
          <Input
            id="nova-key-name"
            // Mirrors the DB CHECK so the browser stops an over-long name first.
            maxLength={60}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy || disabled}
            placeholder="e.g. staging sync"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={busy || disabled || name.trim().length === 0}>
          {busy ? "Creating…" : "Create key"}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
