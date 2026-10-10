/*
  Server side of /Finathon/challenges: seat counts and the claim itself.

  The claim is ONE call to public.finathon_claim_challenge, which does the team
  lookup, the "already picked" check, the seat count and the insert under
  advisory locks in a single transaction. Doing any of that here, across
  several HTTP calls, would let two teams race for the last seat and both win.
*/

import { SupabaseWriteError, axeRpc, axeSelect } from "@/lib/axe/supabase";
import { TRACK_IDS, type SeatCounts, type TrackId } from "@/lib/finathon/challenges";

if (typeof window !== "undefined") {
  throw new Error("src/lib/finathon/challengeClaims.ts is server-only and must never reach the browser.");
}

/* Seats taken per track. Reads only the track column — no team is identified. */
export async function seatCounts(): Promise<SeatCounts> {
  const rows = await axeSelect<{ track: TrackId }>("finathon_challenge_claim", "select=track", 1000);
  const counts = Object.fromEntries(TRACK_IDS.map((id) => [id, 0])) as SeatCounts;
  for (const row of rows) {
    if (row.track in counts) counts[row.track] += 1;
  }
  return counts;
}

export type ClaimResult =
  | {
      ok: true;
      teamName: string;
      track: TrackId;
      challengeId: string;
      seat: number;
      alreadyClaimed: boolean;
    }
  | { ok: false; reason: "not-registered" | "track-full" | "ambiguous-email" | "error" };

type ClaimRow = {
  team_name: string;
  track: TrackId;
  challenge_id: string;
  seat: number;
  already_claimed: boolean;
};

export async function claimChallenge(
  email: string,
  track: TrackId,
  challengeId: string,
): Promise<ClaimResult> {
  try {
    const rows = await axeRpc<ClaimRow[]>("finathon_claim_challenge", {
      p_email: email,
      p_track: track,
      p_challenge_id: challengeId,
    });
    const row = rows[0];
    if (!row) return { ok: false, reason: "error" };
    return {
      ok: true,
      teamName: row.team_name,
      track: row.track,
      challengeId: row.challenge_id,
      seat: row.seat,
      alreadyClaimed: row.already_claimed,
    };
  } catch (error) {
    // Custom SQLSTATEs raised by the function. See the migration for each.
    if (error instanceof SupabaseWriteError) {
      if (error.code === "P0201") return { ok: false, reason: "not-registered" };
      if (error.code === "P0202") return { ok: false, reason: "track-full" };
      if (error.code === "P0203") return { ok: false, reason: "ambiguous-email" };
    }
    console.error("[finathon/challenges] claim failed:", error);
    return { ok: false, reason: "error" };
  }
}
