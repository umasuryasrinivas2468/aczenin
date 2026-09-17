"use client";

import { useEffect, useState } from "react";

/*
  Persistent register bar, revealed once the hero has scrolled away.

  Its own component because it subscribes to scroll — same reasoning as the
  countdown. A scroll listener living inside the page component would re-render
  the whole document on every frame of scrolling.
*/

export default function StickyRegisterBar({
  registrationUrl,
  deadline,
}: {
  registrationUrl: string;
  deadline: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Roughly one viewport: the bar should appear only after the hero's own
      // CTA has left the screen, otherwise it is duplicate furniture.
      setVisible(window.scrollY > window.innerHeight * 0.9);
    };
    onScroll();
    // Passive: this listener never calls preventDefault, and saying so lets the
    // browser keep scrolling on the compositor instead of waiting on JS.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const open = Boolean(registrationUrl);

  return (
    <div
      // aria-hidden while off-screen so the bar's link does not sit in the tab
      // order of a page where it is not yet visible.
      aria-hidden={!visible}
      className="fixed inset-x-0 bottom-0 z-40 transition-transform duration-300"
      style={{
        transform: visible ? "translateY(0)" : "translateY(110%)",
        background: "var(--ink)",
        // Keeps the bar clear of the iOS home indicator on a phone.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="fin-shell flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--paper)" }}>
            Finathon 2026
          </p>
          <p className="truncate text-xs" style={{ color: "var(--ink-on-dark)" }}>
            {open ? `Registration closes ${deadline}` : "Registration opens shortly"}
          </p>
        </div>

        {open ? (
          <a
            href={registrationUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "#fff" }}
            tabIndex={visible ? 0 : -1}
          >
            Register
          </a>
        ) : (
          <span
            className="shrink-0 border border-dashed px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: "var(--ink-on-dark)", color: "var(--ink-on-dark)" }}
          >
            Opening soon
          </span>
        )}
      </div>
    </div>
  );
}
