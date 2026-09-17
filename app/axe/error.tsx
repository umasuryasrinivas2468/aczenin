"use client";

/*
  The error boundary for every /axe section.

  === WHY THIS FILE EXISTS AT ALL ==========================================
  Without it, an error thrown by the dashboard queries propagates to the
  framework's own error surface. In production Next replaces the message with an
  opaque digest, so that is safe — but in development it renders the message in
  full, and the messages here can carry PostgREST detail about tables, columns
  and constraints. The founder runs this dashboard locally, so "dev only" is not
  the same as "nobody sees it".

  A boundary of our own means the visible text is one sentence we wrote, on
  every environment, and the real error stays in the server logs where it is
  useful and not on a screen where it is a disclosure.
  ==========================================================================

  Must be a Client Component — that is a requirement of Next error boundaries,
  because the retry action runs in the browser.
*/

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AxeError({
  // Received but DELIBERATELY NOT RENDERED. Next passes the error so a boundary
  // can display it; displaying it is exactly what this file exists to prevent.
  // Only `digest` — an opaque hash Next generates for log correlation — is safe
  // to show, and it is the only thing shown below.
  error,
  // Re-runs the failed Server Component render. Worth offering because the
  // likeliest cause here is a transient Supabase timeout rather than a bug.
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Could not load this section</CardTitle>
          <CardDescription>
            {/* Generic on purpose. Naming the datastore or the failing table
                would tell an unauthenticated reader — anyone who reached this
                after a session expired mid-request — how the system is built. */}
            The analytics query did not complete. The details are in the server
            logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* The digest is a hash, not a message: it carries no schema detail
              and is the only way to match what is on screen to a log line. */}
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
          <Button onClick={reset} variant="secondary">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
