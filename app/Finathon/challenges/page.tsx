import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChallengeBoard from "@/components/finathon/ChallengeBoard";

/*
  Route shell for /Finathon/challenges — the first-come-first-served challenge
  picker. Fonts and finathon.css come from app/Finathon/layout.tsx; `fin` is
  applied here because the layout deliberately does not (see its header).
*/

export const metadata: Metadata = {
  title: "Challenges — Finathon 2026 | Aczen",
  description:
    "Pick your team's Finathon 2026 challenge. First come, first served: CRM 10 teams, HRM 10 teams, Finance 80 teams.",
  alternates: { canonical: "/Finathon/challenges" },
  // A step for registered teams, not a destination for search.
  robots: { index: false, follow: true },
};

export default function ChallengesPage() {
  return (
    <div className="fin">
      <Navbar />

      <main style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="fin-shell py-16 sm:py-24">
          <Link className="fin-meta" href="/Finathon">
            &larr; Finathon 2026
          </Link>

          <h1 className="fin-serif fin-h2 mt-6">Choose your challenge</h1>
          <p className="fin-body mt-4 max-w-2xl">
            Seats in each track are limited and go to the teams that lock in first:{" "}
            <strong>CRM 10 teams</strong>, <strong>HRM 10 teams</strong>,{" "}
            <strong>Finance 80 teams</strong>. Read the challenges, agree as a team, then have any
            one member lock it in with the email they registered with. One pick per team, and it
            cannot be changed.
          </p>

          <ChallengeBoard />
        </div>
      </main>

      <Footer />
    </div>
  );
}
