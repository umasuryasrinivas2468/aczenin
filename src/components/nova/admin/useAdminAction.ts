"use client";

/*
  Runs a Nova admin Server Action from a form and tracks its outcome.

  WHY NOT useFormState: this repo is on React 18.3, where useFormState only
  exists in the react-dom canary types, and nothing else in the codebase uses
  it. A plain async call plus two pieces of state does the same job with APIs
  that are stable in React 18. It is shared because four forms need the exact
  same pending / message / generic-failure handling, and four copies would
  drift on the one part that matters — never showing a raw error.
*/

// useState for the outcome; useCallback so `run` is stable across renders.
import { useCallback, useState } from "react";

// Type-only import: a type cannot pull actions.ts into the client bundle, and
// Next already exposes the action functions themselves as RPC stubs.
import type { ActionResult } from "../../../../app/nova-api/axe/actions";

// Shown when the action threw (session expired → "Not authorised", network
// down). Generic by design: the thrown message is never rendered.
const THROWN_MESSAGE = "That did not go through. Refresh the page and try again.";

export function useAdminAction(action: (formData: FormData) => Promise<ActionResult>) {
  // True while the request is in flight, to disable the submit button and
  // stop a double-click from sending two writes.
  const [pending, setPending] = useState(false);
  // The last outcome; null until the first submit so nothing shows initially.
  const [result, setResult] = useState<ActionResult | null>(null);

  // Returns the result too, so a caller can react (close a dialog, clear an input).
  const run = useCallback(
    async (formData: FormData): Promise<ActionResult> => {
      // Clears the previous message so a repeated error visibly re-appears.
      setPending(true);
      setResult(null);
      // A thrown action becomes a normal failed result; nothing escapes to the
      // error boundary for an expected condition like an expired session.
      let outcome: ActionResult;
      try {
        outcome = await action(formData);
      } catch (error) {
        // Browser console only; the thrown text is Next's sanitised message.
        console.error("[nova-admin] action failed:", error);
        outcome = { ok: false, message: THROWN_MESSAGE };
      }
      // Always reset pending, success or not.
      setResult(outcome);
      setPending(false);
      return outcome;
    },
    // Actions are module-level imports, so this is effectively constant.
    [action],
  );

  return { run, pending, result };
}
