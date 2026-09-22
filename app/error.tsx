"use client";

/*
  The route-level error boundary for the whole app.

  Before this file existed, an exception thrown anywhere outside /axe reached
  Next's built-in error surface. In development that surface prints the message,
  the stack and the source frame; in production it is a bare "Application error"
  with nothing actionable. Neither is acceptable on the Finathon path, which is
  the one that talks to Supabase: a PostgREST failure carries the table name, the
  column name and sometimes the failing row's values in `error.message`, and
  Next serialises that message to the client for a client-side throw.

  An error.tsx must be a Client Component — React attaches it as an error
  boundary, and boundaries only exist on the client. That is a framework
  requirement, not a preference.
*/

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  // `digest` is the only field of this object that is safe to render. Next
  // computes it as a hash of the server-side error and logs the real error,
  // with that same hash, to the server console — so it is a correlation
  // handle, not a description.
  error: Error & { digest?: string };
  // Re-renders the segment without a full page load. Worth offering because a
  // large share of real failures here are transient: a cold Supabase
  // connection, a dropped fetch, a rate limiter that has since reset.
  reset: () => void;
}) {
  useEffect(() => {
    /*
      Logged to the browser console, never to the DOM.

      The distinction matters and is the whole reason this is a useEffect rather
      than a paragraph in the markup below: the console is inspected by the one
      person debugging, while rendered text is read by everyone, gets
      screenshotted into a WhatsApp group, and is what a scraper indexes. Same
      information, entirely different blast radius.
    */
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    // min-h-[60vh] rather than min-h-screen: this boundary replaces only the
    // segment that threw, so the site chrome around it is usually still there
    // and a full-viewport block would push it off the screen.
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>

      {/* Deliberately generic copy. It says what happened and what to do, and
          it does NOT say why — the "why" is the part that leaks. */}
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        This page could not be loaded. The problem has been logged. Trying again
        usually works; if it does not, please come back in a few minutes.
      </p>

      {/* The one piece of the error object that reaches the browser. Rendered
          only when Next actually produced one — it is undefined for errors
          thrown on the client, where there is no server log to correlate with.
          `!== undefined` rather than a truthiness test because tsconfig.json
          sets strictNullChecks false, which makes a bare `error.digest &&`
          read as "non-empty string" and quietly hide a legitimate value. */}
      {error.digest !== undefined ? (
        <p className="mt-6 font-mono text-xs text-muted-foreground">
          {/* Labelled so a visitor who reports it knows what they are quoting,
              and so support knows what to grep the server logs for. */}
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          // Calls reset() directly rather than reloading the window: a re-render
          // keeps whatever client state the rest of the page still holds, where
          // location.reload() would discard a part-filled form elsewhere on the
          // page along with the failure.
          onClick={() => reset()}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Try again
        </button>

        {/* A plain anchor, not next/link. The router is a plausible cause of
            whatever just threw, so the escape hatch should not depend on it. */}
        <a
          href="/"
          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Go to the homepage
        </a>
      </div>
    </div>
  );
}
