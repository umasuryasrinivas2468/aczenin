/*
  /api/finathon/challenges

  GET  — seats taken per track, polled by the challenge page.
  POST — a team claims a challenge: { email, track, challengeId }.

  The rules (one pick per team, seat caps, registered emails only) are enforced
  by the Postgres function this calls, not here. This route validates shape,
  checks the request came from our own page, and turns the function's error
  codes into sentences.

  NO PER-IP RATE LIMIT, deliberately. Every team claims from the MLRIT campus
  network within the same few minutes, so they share a handful of public IPs;
  an IP budget sized to stop abuse would lock out the event itself.
*/

import { NextResponse } from "next/server";
import { z } from "zod";

import { claimChallenge, seatCounts } from "@/lib/finathon/challengeClaims";
import { TRACK_IDS, claimsAreOpen, findChallenge, type TrackId } from "@/lib/finathon/challenges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Same check as /api/finathon/register — see that file for the reasoning. */
function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin";

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const claimSchema = z.object({
  email: z
    .string({ required_error: "Enter your registered email." })
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .string()
        .max(160, "That email is too long.")
        .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address."),
    ),
  track: z.enum(TRACK_IDS as [TrackId, ...TrackId[]], {
    errorMap: () => ({ message: "Pick a challenge first." }),
  }),
  challengeId: z.string().min(1, "Pick a challenge first.").max(40),
});

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json({ ok: false, field, error }, { status });
}

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(
      { ok: true, counts: await seatCounts() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[finathon/challenges] seat count failed:", error);
    return fail(500, "Could not load seat counts.");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (isSameOriginRequest(request) === false) {
    return fail(403, "This request did not come from the challenges page.");
  }

  if (claimsAreOpen() === false) {
    return fail(403, "Challenge selection has not opened yet.");
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Could not read your request. Please try again.");
  }

  const parsed = claimSchema.safeParse(body);
  // `=== false` rather than `!`: strictNullChecks is off in this project, and
  // only the explicit comparison narrows the union (see register/route.ts).
  if (parsed.success === false) {
    const issue = parsed.error.issues[0];
    return fail(400, issue?.message ?? "Check the form and try again.", issue?.path.join("."));
  }

  const { email, track, challengeId } = parsed.data;
  if (!findChallenge(track, challengeId)) {
    return fail(400, "That challenge does not exist. Refresh the page and pick again.");
  }

  const result = await claimChallenge(email, track, challengeId);

  if (result.ok === false) {
    if (result.reason === "not-registered") {
      return fail(
        404,
        "That email is not on any registered team. Use the email you registered with, or email finathon@aczen.in.",
        "email",
      );
    }
    if (result.reason === "track-full") {
      return fail(409, "Every seat in that track has just been taken. Pick a challenge from another track.");
    }
    if (result.reason === "ambiguous-email") {
      return fail(409, "That email is on more than one team. Email finathon@aczen.in so we can sort it out.", "email");
    }
    return fail(500, "Could not save your pick. Please try again, or email finathon@aczen.in.");
  }

  return NextResponse.json({ ok: true, claim: result }, { status: result.alreadyClaimed ? 200 : 201 });
}
