"use client";

/*
  A destructive button that asks first, then runs a Nova admin action.

  Shared by "remove from allowlist" and "revoke key" — the two irreversible
  operations in the portal. Both need the same three things: a confirm step
  that explains the consequence, a button that stays disabled while the write
  is in flight, and the dialog staying OPEN on failure so the admin sees why.

  Radix's AlertDialogAction closes the dialog on click, before an async action
  could report back, so the confirm button here is a plain Button and the
  dialog's open state is controlled.
*/

// Controlled open state for the dialog.
import { useState, type ReactNode } from "react";

// shadcn's Radix alert dialog: focus-trapped, Escape to cancel, role=alertdialog.
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// The action's result shape; type-only, so nothing server-side is bundled.
import type { ActionResult } from "../../../../app/nova-api/axe/actions";
// Shared pending / message handling.
import { useAdminAction } from "./useAdminAction";

export default function ConfirmActionButton({
  action,
  fields,
  triggerLabel,
  accessibleLabel,
  title,
  description,
  confirmLabel,
  onDone,
}: {
  // The Server Action to run on confirm.
  action: (formData: FormData) => Promise<ActionResult>;
  // Hidden form values the action needs (the email or the key id).
  fields: Record<string, string>;
  // Short visible text on the table-row button ("Remove", "Revoke").
  triggerLabel: string;
  // Full label for screen readers, since "Remove" alone in a table row does
  // not say WHICH row.
  accessibleLabel: string;
  // Dialog heading.
  title: string;
  // The consequence, in plain words — the whole point of the dialog.
  description: ReactNode;
  // Text on the confirm button; names the action rather than "OK".
  confirmLabel: string;
  // Lets the parent show the success message outside the (now closed) dialog.
  onDone: (result: ActionResult) => void;
}) {
  // Controlled so the dialog stays open while pending and on failure.
  const [open, setOpen] = useState(false);
  // Pending and the last failure message.
  const { run, pending, result } = useAdminAction(action);

  // Runs on the confirm click.
  async function confirm() {
    // Builds the payload from the fields prop; FormData is what actions take.
    const formData = new FormData();
    for (const [name, value] of Object.entries(fields)) formData.set(name, value);
    // The hook converts a throw into a failed result.
    const outcome = await run(formData);
    // Close only on success; a failure message is shown inside the dialog.
    if (outcome.ok) {
      setOpen(false);
      onDone(outcome);
    }
  }

  return (
    // onOpenChange ignored while pending, so Escape cannot hide an in-flight write.
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={accessibleLabel} className="text-destructive">
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {/* Radix wires this to aria-describedby, so it is read on open. */}
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* Failure stays visible inside the dialog; role=alert announces it. */}
        {result && !result.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {result.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          {/* Cancel is first in DOM order and receives initial focus — the safe
              default for a destructive dialog. */}
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
