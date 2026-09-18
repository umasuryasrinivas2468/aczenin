"use client";

/*
  The password form shown at /Finathon/axe/26 when there is no valid session.

  Same shape and same reasoning as AxeGateForm, including what it deliberately
  omits: no table names, no counts, no mention of registrations or payments. It
  is rendered INSTEAD of the dashboard, never alongside it, so an
  unauthenticated visitor's HTML contains this form and nothing else. Hiding a
  table of people's names behind CSS while still sending it is the failure this
  avoids.
*/

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FinathonGateForm() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/finathon/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Cleared immediately so the value does not sit in React state, and
        // therefore in a memory snapshot, for the life of the tab.
        setPassword("");
        // refresh(), not push: the cookie is already set by the response, and
        // refresh re-runs the Server Component for the current route, which now
        // sees a valid cookie. A push to the same URL is a no-op and would
        // leave this form on screen.
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Incorrect password.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* Says nothing about what is behind it. Someone who reaches this URL
              by accident learns only that a password exists. */}
          <CardTitle className="text-2xl">26</CardTitle>
          <CardDescription>Enter the password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fin-password">Password</Label>
              <Input
                id="fin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                // "current-password", not "on": it stops the browser offering to
                // save a NEW credential on every attempt.
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              // Blocks an empty submit, which would spend one of the eight
              // attempts the limiter allows on a password that cannot be right.
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
