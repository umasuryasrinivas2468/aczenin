"use client";

/*
  Copies a string to the clipboard and confirms it in place. Used for the
  one-time API key reveal and the curl sample on the dashboard.
*/

// Confirmation state, reset after a moment.
import { useState } from "react";

// House button, so focus rings and sizing match the rest of the portal.
import { Button } from "@/components/ui/button";

export default function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  // Flips to "Copied" briefly so the user knows it worked.
  const [copied, setCopied] = useState(false);

  // navigator.clipboard needs a secure context (https or localhost), which
  // both production and `next dev` are; the catch covers a denied permission.
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Two seconds is long enough to read, short enough to copy again.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Leaves the text selectable in the <code> block as the fallback.
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {/* aria-live so screen readers hear the confirmation, not just see it. */}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}
