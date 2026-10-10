"use client";

/*
  The last-resort boundary: it catches errors thrown by the ROOT LAYOUT itself,
  which app/error.tsx cannot, because error.tsx renders inside the layout that
  just failed.

  Two consequences follow from that, and both shape everything below.

  1. This component REPLACES the root layout, so it has to render its own <html>
     and <body>. Without them the page has no document element and React has
     nothing to hydrate into. This is the one file in an App Router project
     where those tags are required outside app/layout.tsx.

  2. Nothing the root layout provides can be assumed to work. The root layout is
     where Tailwind's stylesheet is imported, where the theme Provider mounts and
     where the font variables are defined — so a Tailwind class name here would
     be a class name with no rules behind it. Every style below is therefore an
     inline style. It is not a stylistic choice; a stylesheet-dependent error
     page is a page that renders as unstyled text exactly when the stylesheet is
     the thing that broke.
*/

export default function GlobalError({
  error,
  reset,
}: {
  // Same contract as app/error.tsx: `digest` is a hash Next also writes to the
  // server log, and it is the only field of this object safe to display.
  error: Error & { digest?: string };
  reset: () => void;
}) {
  /*
    No useEffect console.error here, unlike app/error.tsx.

    A global error means the root layout threw, so React's client runtime may be
    in a state where effects do not flush. Next already logs the underlying
    error server-side with this same digest, so the effect would add nothing
    reliable and would add one more thing that can throw inside the boundary
    whose job is to not throw.
  */

  // lang is set explicitly because the root <html lang="en"> that normally
  // carries it is the element this component is standing in for.
  return (
    <html lang="en">
      <body
        style={{
          // A system font stack, not the app's webfonts: next/font injects its
          // variables through the root layout, which by definition did not run.
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          // Explicit colours rather than inherited ones. With no stylesheet
          // there is no --background token and no dark-mode rule, so a browser
          // default could otherwise put dark-on-dark text on this page.
          background: "#ffffff",
          color: "#0b1f33",
          // The user agent's default body margin would offset the centred
          // layout below by 8px and add a scrollbar at 100vh.
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Side padding so the text does not touch the edge on a phone, which
          // is where a failing page is most likely to be seen.
          padding: "2rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>

          {/* Same discipline as app/error.tsx: no error.message, no stack, no
              PostgREST detail. This boundary is the more dangerous of the two
              for leaks, because a root-layout failure is usually an
              infrastructure or environment failure and those messages tend to
              name hosts, keys and file paths. */}
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.875rem",
              // #51606e is --ink-soft from the Finathon palette, which measures
              // 6.07:1 against this white background — hardcoded because the
              // token itself lives in a stylesheet this page cannot rely on.
              color: "#51606e",
              lineHeight: 1.6,
            }}
          >
            The page could not be loaded. The problem has been logged. Please try
            again in a few minutes.
          </p>

          {/* `!== undefined` rather than a truthy test: strictNullChecks is off
              in tsconfig.json, so a bare check would silently also treat an
              empty-string digest as absent. */}
          {error.digest !== undefined ? (
            <p
              style={{
                marginTop: "1.5rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.75rem",
                color: "#51606e",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <div style={{ marginTop: "2rem" }}>
            <button
              type="button"
              // reset() re-mounts the whole tree including the root layout,
              // which is the only recovery available at this level — there is
              // no smaller segment left to re-render.
              onClick={() => reset()}
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                padding: "0.625rem 1.25rem",
                // #c9d1c9 on white is a hairline, matching --rule elsewhere on
                // the site. It is a decorative edge on a labelled button, not
                // the only thing identifying the control, so WCAG 1.4.11's 3:1
                // boundary requirement does not apply to it.
                border: "1px solid #c9d1c9",
                borderRadius: "6px",
                background: "#ffffff",
                color: "#0b1f33",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
