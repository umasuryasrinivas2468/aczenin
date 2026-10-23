/*
  The split-screen frame for the Nova sign-in page: a dark brand panel on the
  left (hidden below lg) and the form on the right.

  A Nova copy of src/components/ai-studio/AuthFrame.tsx rather than an import
  of it: that frame hard-codes AI Studio's name, copy and mobile wordmark, and
  parameterising all of them would mean editing an AI Studio file for a Nova
  change. The Tailwind classes are kept identical so the two screens match.
*/

// Self-hosted Inter: globals.css names 'Inter' but ships no file, so without
// this the page falls back to Arial and stops matching AI Studio.
import { Inter } from "next/font/google";
// Children type for the form slot.
import type { ReactNode } from "react";

// Instantiated here, not globally, so only this screen downloads it (AI Studio does the same in its layout).
const inter = Inter({ subsets: ["latin"], display: "swap" });

// The three left-panel selling points; data, so the list markup stays one loop.
const POINTS = [
  // What a team gets: its own company's books, read-only.
  {
    title: "One key, one company's books",
    body: "Each team gets its own complete set of invoices, payments, bills, bank lines and more through a read-only JSON API.",
  },
  // The usage dashboard, the reason to sign in at all.
  { title: "Usage you can see", body: "Every call's status, error reason and latency on your dashboard." },
  // The API's breadth and consistency.
  { title: "25 resources, one consistent API", body: "Filters, sorting and pagination work the same everywhere." },
];

// The logo mark plus product name; shared by the dark panel and the mobile header.
function NovaWordmark({ dark }: { dark: boolean }) {
  return (
    // Same size and gap as AI Studio's brand row.
    <span className="inline-flex items-center gap-2.5">
      {/* The same Aczen mark AI Studio uses; decorative next to the text. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/aczenimg.jpeg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
      {/* White on the dark panel; the blue-teal gradient on light, as AI Studio's Wordmark does. */}
      <span
        className={`text-[1.2rem] font-bold tracking-tight ${dark ? "" : "bg-gradient-to-r from-smebank-700 to-smeteal-600 bg-clip-text text-transparent"}`}
      >
        Aczen
      </span>
      {/* The product half of the name: softened on dark, solid slate on light (both as AI Studio). */}
      <span className={`text-[1.2rem] font-semibold tracking-tight ${dark ? "text-white/80" : "text-slate-900"}`}>Nova API</span>
    </span>
  );
}

export default function NovaAuthFrame({ children }: { children: ReactNode }) {
  return (
    // Two columns from lg up, slightly favouring the brand panel; one column below.
    // bg matches AI Studio's layout wash, which Nova's pass-through layout lacks.
    <div className={`${inter.className} grid min-h-screen bg-[#f7f8fb] text-slate-900 antialiased lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]`}>
      {/* Hidden on small screens: the form alone is the mobile page. */}
      <aside className="relative hidden overflow-hidden bg-[#0b1220] px-12 py-12 text-white lg:flex lg:flex-col">
        {/* Warm top-left glow: the aczen.in orange. */}
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-smeorange-500/25 blur-3xl" />
        {/* Cool bottom-right glow: the aczen.in blue. */}
        <div aria-hidden className="pointer-events-none absolute -bottom-40 right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-smebank-500/30 blur-3xl" />
        {/* Faint 44px grid over the glows, the same texture as AI Studio. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px]"
        />

        {/* relative: lifts the brand row above the absolutely positioned glows. */}
        <div className="relative">
          <NovaWordmark dark />
        </div>

        {/* mt-auto pushes the pitch to the lower half, as in AI Studio. */}
        <div className="relative mt-auto max-w-md">
          {/* Orange eyebrow naming the audience. */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeorange-300">For Finathon teams</p>
          {/* h2: the form's "Sign in" is the page's h1. */}
          <h2 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight">
            {/* The product name carries the orange-to-blue gradient. */}
            Build with <span className="bg-gradient-to-r from-smeorange-300 to-smebank-300 bg-clip-text text-transparent">Aczen Nova</span>
          </h2>
          {/* The selling points: orange dot, bold title, muted description. */}
          <ul className="mt-8 space-y-5">
            {POINTS.map((point) => (
              // Title is unique, so it doubles as the React key.
              <li key={point.title} className="flex gap-3">
                {/* mt-1.5 lines the dot up with the title's first line. */}
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-smeorange-400" />
                <div>
                  {/* Bold title. */}
                  <p className="text-[0.95rem] font-medium">{point.title}</p>
                  {/* Muted description. */}
                  <p className="mt-0.5 text-sm leading-relaxed text-white/60">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Legal line pinned under the pitch. */}
        <p className="relative mt-12 text-xs text-white/40">© Aczen Technologies Pvt Ltd</p>
      </aside>

      {/* The form column; full height so the form can centre vertically. */}
      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        {/* Mobile-only brand row, since the dark panel is hidden there. */}
        <div className="lg:hidden">
          <NovaWordmark dark={false} />
        </div>
        {/* 400px column centred in the remaining height. */}
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
