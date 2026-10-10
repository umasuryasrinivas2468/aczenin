"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CLAIMS_OPEN_AT,
  TRACKS,
  claimsAreOpen,
  findChallenge,
  findTrack,
  groupByCategory,
  type SeatCounts,
  type TrackId,
} from "@/lib/finathon/challenges";

/*
  The /Finathon/challenges board: every challenge grouped by track, live seats
  left per track, and the claim form.

  Seat counts are polled rather than pushed. At 100 teams a 10-second GET is
  trivial load, and the server re-checks the count under a lock on every claim
  anyway — the number on screen is guidance, never the authority.
*/

const POLL_MS = 10_000;

type Selection = { track: TrackId; challengeId: string };

type Claim = {
  teamName: string;
  track: TrackId;
  challengeId: string;
  seat: number;
  alreadyClaimed: boolean;
};

function MarkAlert() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 1.5 15 14.5H1L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.2v3.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default function ChallengeBoard() {
  const [counts, setCounts] = useState<SeatCounts | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [email, setEmail] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  // Re-evaluated on each poll so the form unlocks on its own at opening time.
  const [open, setOpen] = useState(claimsAreOpen());

  const refreshCounts = useCallback(async () => {
    setOpen(claimsAreOpen());
    try {
      const response = await fetch("/api/finathon/challenges", { cache: "no-store" });
      const data = (await response.json()) as { ok: boolean; counts?: SeatCounts };
      if (data.ok && data.counts) setCounts(data.counts);
    } catch {
      // Keep the last counts on screen; the next poll will try again.
    }
  }, []);

  useEffect(() => {
    refreshCounts();
    const timer = window.setInterval(refreshCounts, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshCounts]);

  function seatsLeft(track: TrackId): number | null {
    if (!counts) return null;
    const cap = findTrack(track)?.seats ?? 0;
    return Math.max(0, cap - counts[track]);
  }

  function choose(next: Selection) {
    setSelection(next);
    setError(null);
    // Move to the form so the choice and the button to lock it in are together.
    document.getElementById("fin-claim")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selection) {
      setError({ text: "Pick a challenge above first." });
      return;
    }
    if (!understood) {
      setError({ text: "Tick the box to confirm this pick is final for your team.", field: "understood" });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/finathon/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, track: selection.track, challengeId: selection.challengeId }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        claim?: Claim;
        error?: string;
        field?: string;
      };
      if (data.ok && data.claim) {
        setClaim(data.claim);
      } else {
        setError({ text: data.error ?? "Could not save your pick. Please try again.", field: data.field });
      }
    } catch {
      setError({ text: "Network problem. Check your connection and try again." });
    } finally {
      setSubmitting(false);
      refreshCounts();
    }
  }

  const selectedTrack = selection ? findTrack(selection.track) : undefined;
  const selectedChallenge = selection ? findChallenge(selection.track, selection.challengeId) : undefined;
  const selectedFull = selection ? seatsLeft(selection.track) === 0 : false;

  return (
    <div>
      {/* ---- Seat summary ------------------------------------------------ */}
      <div className="fin-statgrid mt-12" aria-live="polite">
        {TRACKS.map((track) => {
          const left = seatsLeft(track.id);
          return (
            <div key={track.id}>
              {/* A jump link: Finance alone is 45 cards long. */}
              <a className="fin-meta fin-jump" href={`#track-${track.id}`}>
                {track.name} &darr;
              </a>
              <p className="fin-serif mt-2" style={{ fontSize: "1.75rem", lineHeight: 1.1 }}>
                {left === null ? "—" : left}
                <span className="fin-body" style={{ fontSize: "0.9375rem" }}>
                  {" "}
                  / {track.seats} seats left
                </span>
              </p>
              <div className="fin-seatbar mt-3" aria-hidden="true">
                <span style={{ width: `${left === null ? 0 : ((track.seats - left) / track.seats) * 100}%` }} />
              </div>
            </div>
          );
        })}
        <div>
          <p className="fin-meta">Rule</p>
          <p className="fin-body mt-2" style={{ fontSize: "0.9375rem" }}>
            First come, first served. One pick per team, and it is final.
          </p>
        </div>
      </div>

      {/* ---- Tracks and challenges -------------------------------------- */}
      {TRACKS.map((track) => {
        const left = seatsLeft(track.id);
        const full = left === 0;
        return (
          <section key={track.id} className="fin-track" aria-labelledby={`track-${track.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id={`track-${track.id}`} className="fin-serif fin-h2">
                {track.name}
              </h2>
              <p className={`fin-meta ${full ? "fin-seat-full" : ""}`}>
                {left === null ? `${track.seats} seats` : full ? "Track full" : `${left} of ${track.seats} seats left`}
              </p>
            </div>
            <p className="fin-body mt-3">{track.blurb}</p>

            {groupByCategory(track).map((group) => (
            <div key={group.name ?? track.id} className="mt-8">
              {group.name ? <h3 className="fin-meta fin-category">{group.name}</h3> : null}
            <div className="fin-challenges mt-4">
              {group.challenges.map((challenge) => {
                const isSelected =
                  selection?.track === track.id && selection.challengeId === challenge.id;
                return (
                  <article
                    key={challenge.id}
                    className={`fin-challenge ${isSelected ? "is-selected" : ""}`}
                    aria-labelledby={`ch-${challenge.id}`}
                  >
                    <p className="fin-meta">{challenge.code}</p>
                    <h4 id={`ch-${challenge.id}`} className="fin-serif fin-h3 mt-2">
                      {challenge.title}
                    </h4>
                    <p className="fin-body mt-3">{challenge.challenge}</p>

                    {/* The full statement is long; folded so 45 Finance cards
                        stay scannable. Sheet line breaks kept via pre-line. */}
                    <details className="fin-statement mt-4">
                      <summary>Full problem statement</summary>
                      <p className="fin-meta mt-4">Problem</p>
                      <p className="fin-pre mt-1">{challenge.problem}</p>
                      {challenge.requirements ? (
                        <>
                          <p className="fin-meta mt-4">Requirements</p>
                          <p className="fin-pre mt-1">{challenge.requirements}</p>
                        </>
                      ) : null}
                      <p className="fin-meta mt-4">Key modules &amp; features</p>
                      <p className="fin-pre mt-1">{challenge.modules}</p>
                      {challenge.hardPart ? (
                        <>
                          <p className="fin-meta mt-4">Hard part</p>
                          <p className="fin-pre mt-1">{challenge.hardPart}</p>
                        </>
                      ) : null}
                    </details>

                    <div className="mt-6">
                      <button
                        type="button"
                        className={isSelected ? "fin-cta" : "fin-cta-ghost"}
                        aria-pressed={isSelected}
                        aria-disabled={full || claim !== null ? "true" : undefined}
                        disabled={full || claim !== null}
                        onClick={() => choose({ track: track.id, challengeId: challenge.id })}
                      >
                        {full ? "Track full" : isSelected ? "Selected" : "Choose this challenge"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            </div>
            ))}
          </section>
        );
      })}

      {/* ---- Claim ------------------------------------------------------- */}
      <section id="fin-claim" className="fin-track" aria-labelledby="fin-claim-heading">
        <h2 id="fin-claim-heading" className="fin-serif fin-h2">
          Lock in your challenge
        </h2>

        {claim ? (
          <div className="fin-card mt-8" role="status">
            <p className="fin-meta" style={{ color: "var(--ink-on-dark)" }}>
              {claim.alreadyClaimed ? "Your team has already picked" : "Locked in"}
            </p>
            <p className="fin-serif mt-3" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.15 }}>
              {findChallenge(claim.track, claim.challengeId)?.title ?? claim.challengeId}
            </p>
            <p className="mt-4" style={{ color: "var(--ink-on-dark)" }}>
              Team <strong style={{ color: "var(--paper)" }}>{claim.teamName}</strong> ·{" "}
              {findTrack(claim.track)?.name} track · seat {claim.seat} of {findTrack(claim.track)?.seats}
            </p>
            {claim.alreadyClaimed ? (
              <p className="mt-4" style={{ color: "var(--ink-on-dark)" }}>
                A pick cannot be changed. If this is wrong, email finathon@aczen.in.
              </p>
            ) : null}
          </div>
        ) : !open ? (
          <p className="fin-notice mt-8" role="note">
            Challenge selection opens{" "}
            <strong>
              {CLAIMS_OPEN_AT?.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </strong>
            . Read the challenges now and decide as a team.
          </p>
        ) : (
          <form className="mt-8 max-w-2xl" onSubmit={submit} noValidate>
            <div>
              <p className="fin-meta">Your pick</p>
              {selectedChallenge && selectedTrack ? (
                <p className="fin-serif mt-2" style={{ fontSize: "1.375rem" }}>
                  {selectedChallenge.code} · {selectedChallenge.title}{" "}
                  <span className="fin-body" style={{ fontSize: "0.9375rem" }}>
                    — {selectedTrack.name}
                    {selectedFull ? " (track full, pick another)" : ""}
                  </span>
                </p>
              ) : (
                <p className="fin-body mt-2">Nothing yet — choose a challenge above.</p>
              )}
            </div>

            <div className="mt-8">
              <label htmlFor="fin-claim-email" className="fin-meta">
                Registered email
              </label>
              <input
                id="fin-claim-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="fin-field-rule mt-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error?.field === "email" ? "true" : undefined}
                aria-describedby="fin-claim-email-hint"
                required
              />
              <p id="fin-claim-email-hint" className="fin-field-hint">
                The email of any member of your team, exactly as it was entered at registration.
              </p>
            </div>

            <label className="mt-6 flex items-start gap-3 fin-body" style={{ maxWidth: "none" }}>
              <input
                type="checkbox"
                className="mt-1"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
                aria-invalid={error?.field === "understood" ? "true" : undefined}
              />
              <span>I understand this pick is final for my whole team and cannot be changed.</span>
            </label>

            {error ? (
              <p className="fin-notice fin-notice-error" role="alert">
                <MarkAlert />
                <span>{error.text}</span>
              </p>
            ) : null}

            <div className="mt-8">
              <button
                type="submit"
                className="fin-cta"
                disabled={submitting || !selection || selectedFull}
                aria-disabled={submitting || !selection || selectedFull ? "true" : undefined}
              >
                {submitting ? "Locking in…" : "Lock in this challenge"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
