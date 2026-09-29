"use client";

/*
  Every API key across every user, with revoke and per-key rate-limit edits.

  key_hash is never in the props (data.ts does not select it), so nothing in
  this component could leak a usable credential even if it tried.
*/

// State for the panel-level message after a revoke closes its dialog.
import { useState, type FormEvent } from "react";

// shadcn primitives.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Actions as RPC stubs; row type is type-only.
import { revokeApiKey, updateKeyRateLimit, type ActionResult } from "../../../../app/nova-api/axe/actions";
import type { KeyRow } from "../../../../app/nova-api/axe/data";
// Shared confirm dialog for the irreversible revoke.
import ConfirmActionButton from "./ConfirmActionButton";
// Pinned-locale formatting (hydration-safe).
import { formatCount, formatDateTime } from "./format";
// Pending / message handling for the rate-limit form.
import { useAdminAction } from "./useAdminAction";

/*
  The inline rate-limit editor for one key.

  Its own component so each row has independent pending/message state —
  saving one row must not disable or relabel every other row's button.
*/
function RateLimitForm({ row }: { row: KeyRow }) {
  // Per-row action state.
  const { run, pending, result } = useAdminAction(updateKeyRateLimit);
  // Unique per row, so each input's label and error link to the right element.
  const inputId = `nova-rl-${row.id}`;

  // Submits one row's new limit.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // No native POST.
    event.preventDefault();
    // Carries the hidden id and the number input.
    await run(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      {/* The id travels hidden; the action re-validates it as a uuid. */}
      <input type="hidden" name="id" value={row.id} />
      {/* A real <label>, visually hidden: the column header is the visual label,
          but a screen reader reaching the input needs to know which key. */}
      <label htmlFor={inputId} className="sr-only">
        Rate limit per minute for {row.name}
      </label>
      <Input
        id={inputId}
        name="rate_limit_per_min"
        type="number"
        // Native bounds mirror the schema CHECK; the server enforces them.
        min={1}
        max={6000}
        step={1}
        required
        // Uncontrolled with a default, so typing does not re-render the table.
        defaultValue={row.rate_limit_per_min}
        className="h-8 w-20 tabular-nums"
        disabled={pending}
        aria-describedby={result ? `${inputId}-msg` : undefined}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      {/* Row-local feedback; the ✓ / message is short to fit the cell. */}
      {result ? (
        <span
          id={`${inputId}-msg`}
          role={result.ok ? "status" : "alert"}
          className={result.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}
        >
          {result.ok ? "Saved" : result.message}
        </span>
      ) : null}
    </form>
  );
}

export default function KeysPanel({ rows }: { rows: KeyRow[] }) {
  // Last revoke outcome, shown above the table after its dialog closes.
  const [revoked, setRevoked] = useState<ActionResult | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">API keys</CardTitle>
        <CardDescription>
          Every key across all users. Revoking takes effect on the key&apos;s next request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Polite live region for the revoke confirmation. */}
        <div aria-live="polite" className="text-sm text-muted-foreground">
          {revoked ? <p>{revoked.message}</p> : null}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys have been created yet.</p>
        ) : (
          // Wide table; scrolls inside its wrapper on narrow screens.
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Requests (24h)</TableHead>
                <TableHead>Rate limit / min</TableHead>
                <TableHead>Status</TableHead>
                {/* Named for screen readers even though visually blank. */}
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                // Derived once per row; revoked_at null is the only "active".
                const active = !row.revoked_at;
                return (
                  // Keyed by id only: after a save the uncontrolled input already
                  // shows the typed (now stored) value, and not remounting keeps
                  // the row's "Saved" confirmation on screen.
                  <TableRow key={row.id}>
                    <TableCell className="break-all">{row.email}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    {/* Monospace + ellipsis signals "this is a truncated secret". */}
                    <TableCell className="whitespace-nowrap font-mono text-xs">{row.prefix}…</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(row.last_used_at)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(row.requests24h)}</TableCell>
                    <TableCell>
                      <RateLimitForm row={row} />
                    </TableCell>
                    <TableCell>
                      {/* Text label, never colour alone: "Active" / "Revoked". */}
                      <Badge variant={active ? "secondary" : "outline"}>{active ? "Active" : "Revoked"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Nothing to revoke on a revoked key; no dead button. */}
                      {active ? (
                        <ConfirmActionButton
                          action={revokeApiKey}
                          fields={{ id: row.id }}
                          triggerLabel="Revoke"
                          accessibleLabel={`Revoke key ${row.name} owned by ${row.email}`}
                          title={`Revoke “${row.name}”?`}
                          description={
                            <>
                              {row.email}&apos;s key <span className="font-mono">{row.prefix}…</span> stops
                              working on its next request. This cannot be undone; they can create a new key
                              from the portal.
                            </>
                          }
                          confirmLabel="Revoke key"
                          onDone={setRevoked}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
