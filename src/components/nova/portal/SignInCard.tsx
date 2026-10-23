"use client";

/*
  The sign-in form on /nova-api: allowlisted email + password → dashboard.
  Rendered inside NovaAuthFrame, which supplies the brand panel; this file is
  only the right-hand form, styled to match AI Studio's LoginForm.

  Calls the server action directly from the submit handler (no
  useActionState) because the repo is on React 18 types; a plain async call
  with local state is the same amount of code without the React 19 hook.
*/

// Eye toggle glyphs and the pending spinner, the same set AI Studio uses.
import { Eye, EyeOff, Loader2 } from "lucide-react";
// Navigation after a successful sign-in.
import { useRouter } from "next/navigation";
// Local form state; FormEvent types the submit handler.
import { useState, type FormEvent } from "react";

// AI Studio's input and button classes, imported so the two forms cannot drift.
import { inputClass, primaryButtonClass } from "@/components/ai-studio/LoginForm";
// Server action; importing it into a client component makes it an RPC stub.
// Relative path: the repo has no "@/app/…" import precedent to rely on.
import { signInAction } from "../../../../app/nova-api/actions";

export default function SignInCard() {
  // The two credentials.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Eye toggle: shows the password as plain text while true.
  const [show, setShow] = useState(false);
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
    <div>
      {/* The page's h1; the brand panel's headline is an h2. */}
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Sign in</h1>
      {/* Tells teams which email to use. */}
      <p className="mt-1.5 text-sm text-slate-500">Use the email your team registered for Finathon.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Email: autocomplete hints let password managers pair the fields. */}
        <div className="space-y-1.5">
          {/* Plain label: the AI Studio look, not the shadcn Label. */}
          <label htmlFor="nova-email" className="text-sm font-medium text-slate-700">
            Work email
          </label>
          <input
            id="nova-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="you@company.com"
          />
        </div>
        {/* Password: "current-password" so browsers offer the saved one
            rather than prompting to save a new one on every attempt. */}
        <div className="space-y-1.5">
          {/* Same label style as the email field. */}
          <label htmlFor="nova-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          {/* relative: anchors the eye button inside the input's right edge. */}
          <div className="relative">
            <input
              id="nova-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              // pr-11 keeps typed text clear of the eye button.
              className={`${inputClass} pr-11`}
            />
            {/* type="button" so toggling never submits the form. */}
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smebank-500"
              // The icon has no text, so the label names the action for screen readers.
              aria-label={show ? "Hide password" : "Show password"}
            >
              {/* The icon shows what a click will do next. */}
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* No "set a new one next": Nova has no password change or reset. */}
          <p className="text-xs text-slate-500">Your password is your registered email address.</p>
        </div>
        {/* Errors announced to screen readers the moment they appear. */}
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {/* Blocks empty submits, which would only burn throttle budget. */}
        <button
          type="submit"
          className={`${primaryButtonClass} w-full`}
          disabled={busy || email.trim().length === 0 || password.length === 0}
        >
          {/* Spinner only while pending, next to the pending label. */}
          {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>

      {/* Says up front that there is no self-serve sign-up, and where to get help. */}
      <p className="mt-8 text-xs leading-relaxed text-slate-400">
        Access is limited to registered teams. Trouble signing in? Write to{" "}
        {/* mailto so the address opens a mail client in one click. */}
        <a className="text-smebank-700 underline-offset-2 hover:underline" href="mailto:team@aczen.in">
          team@aczen.in
        </a>
        .
      </p>
    </div>
  );
}
