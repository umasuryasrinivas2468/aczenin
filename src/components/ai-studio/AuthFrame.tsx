/*
  The split-screen frame for sign-in and first-run password pages: a brand
  panel on the left (hidden on small screens) and the form on the right.
*/

import type { ReactNode } from "react";

import { Wordmark } from "@/components/ai-studio/ui";

const POINTS = [
  { title: "One key, production-grade AI", body: "RAG, guardrails and prompt-injection defence are built in behind every call." },
  { title: "Usage you can see", body: "Requests, tokens, status codes and latency for every key, in real time." },
  { title: "Leaked a key? Rotate in seconds", body: "Revoke instantly, or rotate with a grace window so nothing goes down." },
];

export default function AuthFrame({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#0b1220] px-12 py-12 text-white lg:flex lg:flex-col">
        {/* Brand light: orange and blue glows, the two aczen.in colours. */}
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-smeorange-500/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-smebank-500/30 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px]"
        />

        <div className="relative flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aczenimg.jpeg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-[1.2rem] font-bold tracking-tight">Aczen</span>
          <span className="text-[1.2rem] font-semibold tracking-tight text-white/80">AI Studio</span>
        </div>

        <div className="relative mt-auto max-w-md">
          {admin ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeorange-300">Restricted</p>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight">Operator console</h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-white/65">
                Kill switches, budgets and quotas for every Aczen AI key. Every action here is recorded in the audit log.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeorange-300">For team leads</p>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight">
                Build with <span className="bg-gradient-to-r from-smeorange-300 to-smebank-300 bg-clip-text text-transparent">Aczen AI</span>
              </h2>
              <ul className="mt-8 space-y-5">
                {POINTS.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-smeorange-400" />
                    <div>
                      <p className="text-[0.95rem] font-medium">{point.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/60">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="relative mt-12 text-xs text-white/40">© Aczen Technologies Pvt Ltd</p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
