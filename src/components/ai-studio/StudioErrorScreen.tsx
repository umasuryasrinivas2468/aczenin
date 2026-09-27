/*
  The branded error screen for Aczen AI Studio. Used by the studio's
  not-found and error boundaries and by /ai-studio/errors/[code].

  Messages are fixed copy per status. No error detail, stack or digest is ever
  rendered: those stay in the server logs.
*/

import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/ai-studio/ui";

export const ERROR_COPY: Record<string, { title: string; body: string }> = {
  "400": { title: "That request didn't make sense", body: "Something in the request was malformed. Go back and try again." },
  "401": { title: "Sign in to continue", body: "Your session has ended or you haven't signed in yet." },
  "403": { title: "You don't have access to this", body: "Your account isn't allowed to open this page. If you think that's wrong, contact the Aczen team." },
  "404": { title: "This page doesn't exist", body: "The link may be broken, or the page may have moved." },
  "429": { title: "Slow down a little", body: "Too many requests in a short time. Wait a few minutes, then try again." },
  "500": { title: "Something went wrong on our side", body: "The error has been logged. Try again in a moment." },
  "503": { title: "Aczen AI is taking a short break", body: "The service is temporarily paused or under maintenance. Your keys and data are safe; please check back soon." },
};

export default function StudioErrorScreen({
  code,
  action,
}: {
  code: string;
  action?: ReactNode;
}) {
  const copy = ERROR_COPY[code] ?? ERROR_COPY["500"];
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f7f8fb] px-5 py-8 sm:px-10">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-smebank-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 h-[30rem] w-[30rem] rounded-full bg-smeorange-200/40 blur-3xl" />
      <Link href="/ai-studio" className="relative w-fit">
        <Wordmark />
      </Link>
      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center py-16">
        <p
          className="bg-gradient-to-br from-smeorange-500 to-smebank-600 bg-clip-text font-mono text-7xl font-bold tracking-tighter text-transparent sm:text-8xl"
          aria-hidden
        >
          {code}
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          <span className="sr-only">Error {code}: </span>
          {copy.title}
        </h1>
        <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-slate-600">{copy.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {action}
          <Link
            href="/ai-studio"
            className="inline-flex h-11 items-center rounded-xl bg-smebank-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-smebank-700"
          >
            Back to AI Studio
          </Link>
          <a
            href="mailto:team@aczen.in"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Contact support
          </a>
        </div>
      </main>
    </div>
  );
}
