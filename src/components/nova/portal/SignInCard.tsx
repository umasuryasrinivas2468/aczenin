"use client";

/*
  The sign-in card on /nova-api: allowlisted email + password → dashboard.
  The whole screen is this card — the brand header lives inside it so the
  page itself stays a bare centring wrapper.

  Calls the server action directly from the submit handler (no
  useActionState) because the repo is on React 18 types; a plain async call
  with local state is the same amount of code without the React 19 hook.
*/

// Navigation after a successful sign-in.
import { useRouter } from "next/navigation";
// Local form state; FormEvent types the submit handler.
import { useState, type FormEvent } from "react";

// House shadcn primitives, same as the Finathon/axe gate forms.
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Padlock glyph for the invite-only note.
import { Lock } from "lucide-react";
// Server action; importing it into a client component makes it an RPC stub.
// Relative path: the repo has no "@/app/…" import precedent to rely on.
import { signInAction } from "../../../../app/nova-api/actions";

export default function SignInCard() {
  // The two credentials.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Disables the form while a request is in flight (no double submits, which
  // would each spend one of the throttle's attempts).
  const [busy, setBusy] = useState(false);
  // Error text, announced via role="alert".
  const [error, setError] = useState<string | null>(null);
  // For the redirect to the dashboard.
  const router = useRouter();

  // Submit: the action verifies and sets the session cookie on success.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stay on the page; the action is called directly.
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await signInAction(email, password);
      if (result.ok) {
        // Cleared so the password does not linger in React state.
        setPassword("");
        // push + refresh: the dashboard server component must see the new cookie.
        router.push("/nova-api/dashboard");
        router.refresh();
        return;
      }
      // "Incorrect email or password.", the throttle text, or the generic error.
      setError(result.message);
    } catch {
      // Network failure before the action answered.
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    // shadow-sm + border: the same flat card style as dashboard.aczen.in.
    <Card className="w-full shadow-sm">
      <CardHeader className="items-center space-y-3 pb-4 text-center">
        {/* The Aczen mark (public/icon.svg), decorative next to the title. */}
        <img src="/icon.svg" alt="" width={44} height={44} className="h-11 w-11 rounded-lg" />
        <div className="space-y-1">
          {/* The product name is the page's h1; the card is the whole screen. */}
          {/* A real <h1>, not CardTitle (an h3 with no asChild), with its styles. */}
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Nova API</h1>
          <CardDescription>Sign in to manage your API key and read the docs.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email: autocomplete hints let password managers pair the fields. */}
          <div className="space-y-2">
            <Label htmlFor="nova-email">Email</Label>
            <Input
              id="nova-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              placeholder="you@company.com"
            />
          </div>
          {/* Password: "current-password" so browsers offer the saved one
              rather than prompting to save a new one on every attempt. */}
          <div className="space-y-2">
            <Label htmlFor="nova-password">Password</Label>
            <Input
              id="nova-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
          </div>
          {/* Errors announced to screen readers the moment they appear. */}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {/* Blocks empty submits, which would only burn throttle budget. */}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || email.trim().length === 0 || password.length === 0}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
      {/* Says up front that there is no self-serve sign-up, so nobody hunts for one. */}
      <CardFooter className="justify-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
        <Lock aria-hidden className="h-3.5 w-3.5" />
        Invite-only access. Ask the Aczen team for credentials.
      </CardFooter>
    </Card>
  );
}
