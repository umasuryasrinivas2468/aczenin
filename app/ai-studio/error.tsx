"use client";

/*
  Error boundary for the whole studio. Renders fixed copy only: the error's
  message and digest never reach the screen (they can carry database detail
  in development); the server log has the real error.
*/

import StudioErrorScreen from "@/components/ai-studio/StudioErrorScreen";

export default function StudioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StudioErrorScreen
      code="500"
      action={
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      }
    />
  );
}
