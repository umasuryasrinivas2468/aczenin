"use client";

/*
  The password form shown at /axe when there is no valid session cookie.

  What this component deliberately does NOT contain is the point of it: no table
  names, no metric names, no counts, no hint of what is behind the gate. It is
  rendered INSTEAD of the dashboard, never alongside it, so an unauthenticated
  visitor's HTML payload contains nothing but this form. Hiding a dashboard with
  CSS while still sending its data is the failure mode this avoids.
*/

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AxeGateForm() {
  const [password, setPassword] = useState("");
  // Held separately from a generic loading flag so the button can be disabled
  // and labelled from one piece of state rather than two that can disagree.
  const [submitting, setSubmitting] = useState(false);
  // The server's message, shown verbatim. The route is written to return only
  // deliberately vague text, so there is nothing here to sanitise or soften.
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // The whole exchange is a fetch, so the browser's native form navigation
    // would otherwise reload the page and discard the response.
    event.preventDefault();
    setSubmitting(true);
    // Cleared on each attempt so a stale message from the previous try is not
    // still on screen while the new one is in flight.
    setError(null);

    try {
      const response = await fetch("/api/axe/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Cleared immediately on success so the value does not sit in React
        // state, and therefore in a memory snapshot, for the life of the tab.
        setPassword("");
        // router.refresh(), not a redirect: the cookie is already set by the
        // response, and refresh re-runs the Server Component for the CURRENT
        // route, which now sees a valid cookie and renders the dashboard. A
        // push to the same URL would be a no-op and leave the form on screen.
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      // A fallback string because a failed JSON parse must still produce a
      // visible message rather than an empty red box.
      setError(body?.error ?? "Incorrect password.");
    } catch {
      // Network-level failure, distinct from a rejected password. Worth
      // distinguishing for the person typing: retrying helps here and does not
      // help a wrong password.
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      // In `finally` so the button re-enables on every path, including the
      // early return above — otherwise a successful login that somehow did not
      // refresh would leave a permanently disabled form.
      setSubmitting(false);
    }
  }

  return (
    // Centred in the viewport with no site chrome. The gate is not a page of the
    // marketing site and should not look like one.
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* Single letter, no product name. Someone who reaches this URL by
              accident learns nothing about what it protects. */}
          <CardTitle className="text-2xl">axe</CardTitle>
          <CardDescription>Enter the password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {/* A real Label bound by htmlFor rather than a placeholder acting
                  as one: placeholders vanish on focus and are skipped by some
                  screen readers. */}
              <Label htmlFor="axe-password">Password</Label>
              <Input
                id="axe-password"
                // type="password" both masks the field and tells password
                // managers what it is, which is how the founder will actually
                // fill it.
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                // Focused on mount: there is exactly one thing to do on this
                // page, so making the person click first is pure friction.
                autoFocus
                // "current-password" specifically, not "on" — it stops the
                // browser offering to save a NEW credential on every attempt.
                autoComplete="current-password"
                // Disabled in flight so a double-submit cannot spend two of the
                // eight attempts the rate limiter allows.
                disabled={submitting}
              />
            </div>

            {/* Rendered only when set, so the layout does not reserve a gap for
                a message that is usually absent. */}
            {error ? (
              // role="alert" makes a screen reader announce the failure; without
              // it the text appears silently and a non-sighted user is left
              // waiting for a response that already arrived.
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              // Also blocks submitting an empty field, which would spend a
              // rate-limit attempt on a password that cannot possibly be right.
              disabled={submitting || password.length === 0}
            >
              {submitting ? "Checking…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
