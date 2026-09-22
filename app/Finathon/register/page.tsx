import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader, Archivo } from "next/font/google";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RegistrationForm from "@/components/finathon/RegistrationForm";
import "../finathon.css";

/*
  Route shell for /Finathon/register.

  The same thin-page pattern as /Finathon itself: metadata here, markup in the
  form component. finathon.css is imported from the parent directory so the
  ledger vocabulary — rules, gutters, the serif display face — carries over
  unchanged. A registration form that looked like a different site would be the
  single most suspicious thing to meet immediately after being asked to pay.
*/

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
  fallback: ["ui-serif", "Georgia", "serif"],
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-archivo",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Register — Finathon 2026 | Aczen",
  description:
    "Register your team for Finathon 2026 at MLR Institute of Technology. Pay by UPI, record your transaction reference, and complete your entry on Devnovate.",
  alternates: { canonical: "/Finathon/register" },
  // noindex: the page is worthless in search results — it is a step in a flow,
  // not a destination — and indexing it would send people who have not read the
  // event page straight to a payment screen.
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  // `fin` is load-bearing here, not cosmetic. Every design token (--paper,
  // --ink, --rule-strong, --accent-fill) is declared only inside `.fin {}` in
  // finathon.css, so without this class all of them are undefined on this page.
  // The worst casualty is .fin-cta: `border: 1px solid var(--ink)` is a CSS
  // shorthand, and a shorthand containing an invalid var is discarded whole —
  // taking the button fill with it, so the submit button on a payment page was
  // rendering as unstyled bold text. The event page escapes this only because
  // src/views/Finathon.tsx:320 puts `fin` on its own root; this page renders
  // RegistrationForm directly and so has no such ancestor to inherit from.
  return (
    <div className={`fin ${newsreader.variable} ${archivo.variable}`}>
      <Navbar />

      <main style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="fin-shell py-16 sm:py-24">
          {/* A way back to the event page. Someone who arrives here from the
              sticky bar and wants to re-read the schedule before paying should
              not have to use the browser's back button. */}
          <Link className="fin-meta" href="/Finathon">
            &larr; Finathon 2026
          </Link>

          <h1 className="fin-serif fin-h2 mt-6">Register your team</h1>
          <p className="fin-body mt-4 max-w-2xl">
            One registration per team, submitted by the team lead. You will need your roll
            number and a UPI app. It takes about two minutes.
          </p>

          <div className="mt-12 max-w-3xl">
            <RegistrationForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
