"use client";

/*
  The password form shown at /nova-api/axe when there is no valid admin session.

  Same shape and same omissions as FinathonGateForm: no mention of keys,
  allowlists or counts. It is rendered INSTEAD of the portal, never beside it,
  so an unauthenticated response contains this form and nothing else.

  Differs in one place: it calls a Server Action (signInNovaAdmin) rather than
  fetching a /api route, because everything Nova-admin lives under
  app/nova-api/axe and a route handler there would share the page's URL space.
*/

// refresh() re-runs the Server Components once the cookie is set.
import { useRouter } from "next/navigation";
// Controlled input state and the submit event type.
import { useState, type FormEvent } from "react";

// The shadcn primitives the other gates use, for a consistent look.
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The action itself; Next swaps this import for an RPC stub in the client bundle.
import { signInNovaAdmin } from "../../../../app/nova-api/axe/actions";
// Shared pending / message handling.
import { useAdminAction } from "./useAdminAction";

export default function NovaAdminGateForm() {
  // Controlled so it can be wiped from memory right after a successful sign-in.
  const [password, setPassword] = useState("");
  // Pending flag and last result come from the shared hook.
  const { run, pending, result } = useAdminAction(signInNovaAdmin);
  // Used to re-render the route once the cookie exists.
  const router = useRouter();

  // onSubmit, not a bare action prop, so the password can be cleared on success.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stops the browser's native full-page POST.
    event.preventDefault();
    // Built from the controlled value rather than the form element, so the
    // submitted value is exactly what the input shows.
    const formData = new FormData();
    formData.set("password", password);
    // The hook turns a throw into a generic failure.
    const outcome = await run(formData);
    // On success: drop the password from React state, then re-render the route.
    if (outcome.ok) {
      setPassword("");
      // refresh, not push: the URL is the same, only the cookie changed.
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* Says nothing about what is behind it, like the other gates. */}
          <CardTitle className="text-2xl">axe</CardTitle>
          <CardDescription>Enter the password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {/* htmlFor ties the label to the input for screen readers and
                  gives a bigger click target. */}
              <Label htmlFor="nova-admin-password">Password</Label>
              <Input
                id="nova-admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                // Stops the browser offering to save a NEW credential each try.
                autoComplete="current-password"
                disabled={pending}
                // Links the error text below, so it is announced with the field.
                aria-describedby={result && !result.ok ? "nova-admin-password-error" : undefined}
              />
            </div>

            {/* role=alert so the failure is announced without moving focus. */}
            {result && !result.ok ? (
              <p id="nova-admin-password-error" role="alert" className="text-sm text-destructive">
                {result.message}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              // An empty submit would spend one of the eight attempts on a
              // password that cannot be right.
              disabled={pending || password.length === 0}
            >
              {pending ? "Checking…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
