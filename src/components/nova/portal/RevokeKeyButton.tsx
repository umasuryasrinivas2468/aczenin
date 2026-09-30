"use client";

/*
  Revoke button for one key row. Client-side only for the confirm step and the
  pending state; the action itself re-checks the session and filters by the
  session's email, so the id here is not trusted for ownership.
*/

// Pending + error state for this one row.
import { useState } from "react";

// House button; outline + red text signals the irreversible action without a
// solid red block dominating the key card.
import { Button } from "@/components/ui/button";
// Session-checked server action.
import { revokeKeyAction } from "../../../../app/nova-api/actions";

export default function RevokeKeyButton({ id, name }: { id: string; name: string }) {
  // Disables the button while the request runs.
  const [busy, setBusy] = useState(false);
  // Inline error under the button.
  const [error, setError] = useState<string | null>(null);

  // Confirm, then revoke; revalidatePath in the action re-renders the table.
  async function revoke() {
    // Native confirm: accessible, zero code, and revocation cannot be undone.
    if (!window.confirm(`Revoke "${name}"? Any app using it will start getting 401 immediately.`)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await revokeKeyAction(id);
      // On success the row re-renders as revoked, so only failures need text.
      if (!result.ok) setError(result.message);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      {/* aria-label names the key, so a screen reader list of buttons is not
          identical "Revoke"s. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={revoke}
        disabled={busy}
        aria-label={`Revoke key ${name}`}
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {busy ? "Revoking…" : "Revoke"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
