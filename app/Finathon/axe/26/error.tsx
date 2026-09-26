"use client";

/*
  The error boundary for /Finathon/axe/26, the Finathon team review dashboard.

  === WHY THIS SEGMENT NEEDS ITS OWN, AND DOES NOT INHERIT ONE ==============
  Error boundaries in the App Router are per route SEGMENT and do not cascade
  sideways: app/axe/error.tsx covers /axe and everything beneath it, and covers
  nothing here. Without this file an error thrown while rendering the queue
  climbs to the framework's own surface, which in DEVELOPMENT prints the message
  in full. The messages on this path carry PostgREST detail about tables,
  columns and constraints, and the founder runs this dashboard locally — so
  "production hides it" is not the same as "nobody sees it".

  === WHY IT MATTERS MORE AFTER THE §4.2 RESHAPE ===========================
  The old single-table page had no nullable columns worth speaking of. The new
  shape has several — `screenshot_path`, `reviewed_at`, `review_note` — plus an
  embedded participant array that can arrive empty. Every one of those is a
  `.toLowerCase()` or a `.length` away from a TypeError that this repo's
  compiler cannot warn about, because tsconfig has `strictNullChecks: false`.
  The page guards each access; this boundary is what catches the one that was
  missed, and turns a stack trace over a table of students' names into a card.
  ==========================================================================

  Mirrors app/axe/error.tsx deliberately, down to the wording of the reference
  line. Two boundaries that behave differently are two things to reason about
  when something breaks at a registration desk.

  Must be a Client Component — a requirement of Next error boundaries, because
  the retry button runs in the browser.
*/

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinathonAdminError({
  // Received and DELIBERATELY NOT RENDERED. Next hands the boundary the error so
  // it CAN be displayed; displaying it is exactly what this file exists to
  // prevent. Only `digest` — an opaque hash Next generates for log correlation —
  // is safe, and it is the only thing shown below.
  error,
  // Re-runs the failed Server Component render. Worth offering because the
  // likeliest causes here are transient: a Supabase timeout, or a signed-URL
  // call that failed once.
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Could not load the registrations</CardTitle>
          <CardDescription>
            {/* Generic on purpose. Naming the datastore or the failing table
                would tell an unauthenticated reader — anyone who reached this
                after their session expired mid-request — how the system is
                built, and this page's readers are event volunteers rather than
                people who need that detail. */}
            The registration list did not load. The details are in the server
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
