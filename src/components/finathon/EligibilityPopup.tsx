"use client";

// useEffect so the dialog opens after hydration; useRef to reach the DOM <dialog>.
import { useEffect, useRef } from "react";

/*
  The eligibility popup on /Finathon/register. A native <dialog> opened with
  showModal() rather than a modal library: the browser supplies the backdrop,
  the focus trap and Esc-to-close for free, and nothing new gets installed.
*/
export default function EligibilityPopup() {
  // Handle on the <dialog> element, which is the only way to call showModal().
  const ref = useRef<HTMLDialogElement>(null);

  // Open on mount, i.e. once per visit — the point is to stop a team that
  // doesn't qualify before it pays, not to nag someone who already read it.
  useEffect(() => {
    // Guard: showModal throws if the dialog is somehow already open.
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  return (
    // aria-labelledby gives screen readers the heading as the dialog's name.
    <dialog
      ref={ref}
      aria-labelledby="fin-elig-title"
      className="fin-dialog"
    >
      {/* Same serif heading face as the page so the popup reads as part of it. */}
      <h2 id="fin-elig-title" className="fin-serif text-2xl">
        Before you register
      </h2>
      {/* The two rules, stated plainly — this is the whole reason the popup exists. */}
      <p className="fin-body mt-3">
        Finathon 2026 is open <strong>only to 3rd year students</strong> of{" "}
        <strong>MLR Institute of Technology (MLRIT)</strong>. Every member of your team must
        meet both conditions.
      </p>
      {/* method="dialog" closes the dialog on submit with no JS handler needed. */}
      <form method="dialog" className="mt-6">
        {/* Reuses the page's primary button style; autoFocus lands keyboard users on it. */}
        <button type="submit" className="fin-cta w-full" autoFocus>
          I understand
        </button>
      </form>
    </dialog>
  );
}
