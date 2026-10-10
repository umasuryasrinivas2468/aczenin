/*
  Root of Aczen AI Studio: /ai-studio, its console pages and the admin panel.

  Fonts are instantiated here rather than globally so only studio pages load
  them. next/font self-hosts the files, which is what lets the studio CSP keep
  font-src at 'self'.

  force-dynamic for the whole subtree: the CSP nonce is per request, and a
  statically rendered page would carry no nonce, so every script on it would
  be blocked. It also guarantees no signed-in page is ever cached and replayed.
*/

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import StudioMotion from "@/components/ai-studio/StudioMotion";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-studio-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-studio-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Aczen AI Studio", template: "%s · Aczen AI Studio" },
  description: "Build with Aczen AI: create API keys, track usage and manage limits.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: null,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function AiStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${mono.variable} min-h-screen bg-[#f7f8fb] text-slate-900 antialiased [font-family:var(--font-studio-sans),Inter,system-ui,sans-serif]`}
    >
      <StudioMotion>{children}</StudioMotion>
    </div>
  );
}
