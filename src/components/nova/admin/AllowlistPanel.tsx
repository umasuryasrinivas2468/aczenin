"use client";

/*
  The allowlist panel: who may sign in to the Nova developer portal.

  Client component because the add form clears itself and shows inline
  feedback, and each row's remove button opens a confirm dialog. The rows
  themselves arrive as props from the server page — this component never
  fetches.
*/

// Refs to reset the form after a successful add; state for the panel message.
import { useRef, useState, type FormEvent } from "react";

// shadcn primitives, for consistency with the other admin dashboards.
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Actions are RPC stubs in the browser; the row type is type-only.
import { addAllowlistEmail, removeAllowlistEmail, type ActionResult } from "../../../../app/nova-api/axe/actions";
import type { AllowlistRow } from "../../../../app/nova-api/axe/data";
// Confirm-then-run, shared with the keys panel.
import ConfirmActionButton from "./ConfirmActionButton";
// Pinned-locale formatting so server and client render the same string.
import { formatDate } from "./format";
// Pending / message handling for the add form.
import { useAdminAction } from "./useAdminAction";

export default function AllowlistPanel({ rows }: { rows: AllowlistRow[] }) {
  // The add form element, reset after success so the next email starts blank.
  const formRef = useRef<HTMLFormElement>(null);
  // The add action's pending flag and outcome.
  const add = useAdminAction(addAllowlistEmail);
  // Success message from a remove, shown here because its dialog has closed.
  const [removed, setRemoved] = useState<ActionResult | null>(null);

  // Submits the add form.
  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    // No native POST; the action is called directly.
    event.preventDefault();
    // Clears a stale "removed X" line so only the latest outcome shows.
    setRemoved(null);
    // Reads both inputs by their name attributes.
    const outcome = await add.run(new FormData(event.currentTarget));
    // Reset only on success, so a typo in a rejected email can be fixed in place.
    if (outcome.ok) formRef.current?.reset();
  }

  // Whichever message is most recent: the add outcome or the remove outcome.
  const message = removed ?? add.result;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Allowlist</CardTitle>
        <CardDescription>
          Only these addresses can request a sign-in code for the developer portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* --- Add form ------------------------------------------------------
            Stacks on phones, one row from sm up. */}
        <form ref={formRef} onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="nova-allow-email">Email</Label>
            <Input
              id="nova-allow-email"
              name="email"
              // type=email gives the mobile @ keyboard and a first-pass check;
              // the server action re-validates regardless.
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              // Lowercase is applied server-side; this just avoids iOS
              // capitalising the first letter and confusing the admin.
              autoCapitalize="none"
              spellCheck={false}
              disabled={add.pending}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="nova-allow-note">Note (optional)</Label>
            <Input id="nova-allow-note" name="note" maxLength={200} disabled={add.pending} />
          </div>
          <Button type="submit" disabled={add.pending}>
            {add.pending ? "Adding…" : "Add"}
          </Button>
        </form>

        {/* aria-live=polite: announced after the screen reader finishes its
            current sentence; role=alert only for failures, which are urgent. */}
        <div aria-live="polite" className="min-h-5 text-sm">
          {message ? (
            <p role={message.ok ? undefined : "alert"} className={message.ok ? "text-muted-foreground" : "text-destructive"}>
              {message.message}
            </p>
          ) : null}
        </div>

        {/* --- Rows ----------------------------------------------------------
            Table scrolls horizontally inside its own wrapper on narrow
            screens, so the page itself never scrolls sideways at 320px. */}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody is allowlisted yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Added</TableHead>
                {/* Right-aligned: it is a number column. */}
                <TableHead className="text-right">Active keys</TableHead>
                {/* Visually empty header still needs a name for screen readers. */}
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                // email is the primary key, so it is a stable React key.
                <TableRow key={row.email}>
                  {/* break-all: a long address wraps instead of widening the table. */}
                  <TableCell className="break-all font-medium">{row.email}</TableCell>
                  <TableCell className="text-muted-foreground">{row.note ?? "—"}</TableCell>
                  {/* nowrap keeps "29 Sept 2026" on one line. */}
                  <TableCell className="whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                  {/* tabular-nums so digits line up down the column. */}
                  <TableCell className="text-right tabular-nums">{row.activeKeys}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmActionButton
                      action={removeAllowlistEmail}
                      fields={{ email: row.email }}
                      triggerLabel="Remove"
                      accessibleLabel={`Remove ${row.email} from the allowlist`}
                      title={`Remove ${row.email}?`}
                      description={
                        <>
                          They lose access immediately. Removing an address also{" "}
                          <strong>permanently deletes</strong> their API keys (
                          {row.activeKeys} active), those keys&apos; usage history, and their
                          portal sessions. Re-adding them later will not restore the keys.
                        </>
                      }
                      confirmLabel="Remove and delete keys"
                      onDone={setRemoved}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
