"use client";

/*
  The error boundary for /nova-api/axe.

  Error boundaries are per route segment and do not cascade sideways, so none
  of the other dashboards' boundaries cover this path. Without this file, a
  PostgREST error thrown while loading (which names tables, columns and
  constraints) would reach Next's own error surface — shown in full in
  development. Mirrors app/Finathon/axe/26/error.tsx deliberately.

  Must be a Client Component: Next requires it, because reset() runs in the browser.
*/

// Same card and button as the sibling boundaries, for a consistent failure look.
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NovaAdminError({
  // Received and DELIBERATELY NOT RENDERED; only its opaque digest is shown.
  error,
  // Re-runs the failed render — useful because the likeliest cause is a
  // transient database timeout or a paused Supabase project.
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Could not load the admin portal</CardTitle>
          {/* Generic on purpose: naming the datastore tells a reader how the
              system is built. The operator has the server logs. */}
          <CardDescription>The data did not load. The details are in the server logs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* The digest carries no schema detail and matches a log line. */}
          {error.digest ? <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
          <Button onClick={reset} variant="secondary">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
