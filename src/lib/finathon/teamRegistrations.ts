/*
  Finathon team registration: the rate-limit ledger, the file checks, the upload
  and the atomic write.

  Separate from registrations.ts, which serves the LEGACY single-row form and
  the old finathon_registration table. Both still exist — the old table is never
  dropped — so the two modules are kept apart rather than merged, because a
  shared helper that half-fits both is how the wrong bounds get applied to the
  wrong table.
*/

import { randomUUID } from "node:crypto";

import {
  SupabaseWriteError,
  axeCount,
  axeInsert,
  axeRpc,
  storageDelete,
  storageUpload,
} from "@/lib/axe/supabase";
import { AMOUNT_PAISE, type TeamRegistration } from "@/lib/finathon/teamRegistrationSchema";

// Same server-only guard as every module in this chain. Strictly weaker than
// the `server-only` package — it fires at runtime in the browser, after the
// bundle carrying the service-role key has already shipped — but it converts a
// silent key leak into a loud crash.
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/finathon/teamRegistrations.ts is server-only and must never reach the browser.",
  );
}

/* The private bucket. Named once so a typo cannot send an upload and a signed
   URL to two different places. */
export const PAYMENTS_BUCKET = "finathon-payments";

/*
  The hard ceiling on an upload, in bytes.

  Checked against Content-Length BEFORE the body is read, so a 50 MB request is
  rejected without ever being buffered into memory. Matches the bucket's own
  file_size_limit exactly — two independent checks, because our code being wrong
  and storage being wrong are different failures.
*/
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

/*
  The rate-limit window and ceiling.

  Counted over ALL attempts, not just successful ones — that is the fix. Ten
  rather than the old five because a rejected attempt now counts too, and a
  student fixing three validation errors in a row must not lock themselves out
  of their own registration.
*/
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX_ATTEMPTS = 10;

/*
  What a submission attempt is recorded as.

  'rejected' is the student's fault (validation, duplicate, too late), 'error'
  is ours. Kept distinct so a spike in 'error' is visible as an outage rather
  than hidden inside a count of abusive traffic.
*/
export type AttemptOutcome = "accepted" | "rejected" | "error";

/*
  Records one attempt, whatever its outcome.

  WHY THIS TABLE EXISTS AT ALL: the previous limiter counted rows in the table
  of SUCCESSFUL saves, so every 400, 409 and 500 was free — unlimited malformed
  requests cost an attacker nothing and never incremented the counter. That was
  merely noisy when the body was a small JSON object. With a 5 MB file upload in
  the path it means unbounded bodies get processed before the limiter is ever
  consulted.

  Never throws. A ledger write failing must not turn a successful registration
  into an error the student sees — the limit degrades, the registration stands.
*/
export async function logRegisterAttempt(
  ipHash: string,
  outcome: AttemptOutcome,
): Promise<void> {
  try {
    await axeInsert("finathon_register_attempt", { ip_hash: ipHash, outcome });
  } catch (error) {
    // Logged, not rethrown. The message is already scrubbed of row values by
    // describeFailure, and this table holds nothing identifying anyway.
    console.error("[finathon/register] could not record attempt:", error);
  }
}

/*
  How many attempts this hashed source has made inside the window.

  Reads the table rather than an in-process counter for the same reason the /axe
  limiter does: serverless instances share no memory, so a Map resets on every
  cold start and an attacker spreading requests across instances would never
  trip it.
*/
export async function recentAttemptCount(
  ipHash: string,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  return axeCount(
    "finathon_register_attempt",
    `ip_hash=eq.${ipHash}&occurred_at=gte.${since}`,
  );
}

/*
  Identifies an image by its MAGIC BYTES, never by its Content-Type header.

  The client sets that header, so it proves nothing: `curl -F
  "file=@shell.php;type=image/jpeg"` sends whatever it likes. The first bytes of
  the actual file are the only claim the client does not control for free.

  Returns the REAL media type, which is then what gets sent to storage — so a
  file that lies about being a PNG is stored as what it actually is, or not at
  all.

  Returns null for anything unrecognised, which the caller treats as a rejection
  rather than a default.
*/
export function sniffImageType(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF. Every JPEG variant shares this three-byte SOI marker.
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A — the full eight-byte signature, not just the
  // first four. The trailing bytes are there specifically to catch transfers
  // that mangled line endings, so checking them is free detection of a corrupt
  // upload.
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP is a RIFF container: "RIFF" at 0, then a 4-byte length, then "WEBP" at
  // 8. Checking only "RIFF" would also accept .wav and .avi files, which are
  // RIFF too — the payload tag at offset 8 is what makes this specific.
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // Unrecognised. Deliberately not defaulting to octet-stream or to jpeg: an
  // unknown file is a rejection, not a guess.
  return null;
}

/* Media type to the extension used in the object path. A map rather than a
   string split on "/", so an unexpected type cannot produce a path ending in a
   attacker-chosen suffix. */
const EXTENSION_FOR: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/*
  Uploads the payment screenshot and returns its object path.

  The folder is a uuid generated HERE rather than the row's public_id, because
  the path has to be known before the row exists: the upload happens first so
  that a row can never point at a file that is not there. The only property the
  path needs is unguessability, and a v4 uuid has that whether Postgres or Node
  produced it.
*/
export async function uploadPaymentScreenshot(
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const extension = EXTENSION_FOR[contentType];
  // Unreachable if the caller sniffed first, which it does. Guarded anyway,
  // because "unreachable" is a claim about today's callers only.
  if (!extension) {
    throw new Error(`Refusing to store an unsupported media type: ${contentType}`);
  }

  const objectPath = `teams/${randomUUID()}/payment.${extension}`;
  await storageUpload(PAYMENTS_BUCKET, objectPath, bytes, contentType);
  return objectPath;
}

/*
  The outcome of a registration write, as a value rather than an exception.

  Every duplicate case is a NORMAL event — a team resubmitting, someone mistyping
  another team's UTR, a student already registered with friends — and each needs
  a different sentence against a different field. Modelling them as thrown errors
  would mean one catch block trying to tell "already registered" apart from "the
  database is down".
*/
export type RegisterTeamResult =
  | { ok: true; publicId: string }
  | {
      ok: false;
      reason: "duplicate-team-name" | "duplicate-utr" | "duplicate-roll" | "team-size" | "error";
    };

/*
  Writes the whole registration in ONE transaction.

  Calls the finathon_register_team Postgres function rather than issuing three
  PostgREST inserts, because PostgREST cannot span a transaction across tables
  and a partial write here is a paid registration with no members attached.

  The duplicate cases arrive as the custom SQLSTATEs the function raises. The
  function has to do that translation because Postgres reports all three unique
  violations as 23505 and puts the offending value in the error MESSAGE — which
  this codebase strips before it reaches a log, precisely so a real bank UTR
  never lands in one.
*/
export async function registerTeam(
  submission: TeamRegistration,
  ipHash: string,
  screenshotPath: string,
): Promise<RegisterTeamResult> {
  try {
    const publicId = await axeRpc<string>("finathon_register_team", {
      payload: {
        team_name: submission.teamName,
        utr: submission.utr,
        screenshot_path: screenshotPath,
        ip_hash: ipHash,
        // Sent explicitly rather than left to the column default, so the price
        // recorded against a payment is the price the form actually displayed.
        amount_paise: AMOUNT_PAISE,
        lead: {
          full_name: submission.lead.fullName,
          college: submission.lead.college,
          roll_number: submission.lead.rollNumber,
          phone: submission.lead.phone,
          email: submission.lead.email,
        },
        members: submission.members.map((member) => ({
          full_name: member.fullName,
          college: member.college,
          roll_number: member.rollNumber,
          phone: member.phone,
          email: member.email,
        })),
      },
    });

    return { ok: true, publicId };
  } catch (error) {
    // Only SupabaseWriteError carries a SQLSTATE; anything else is a transport
    // or configuration fault with no code to branch on.
    if (error instanceof SupabaseWriteError) {
      // The three codes the function raises, each mapped to the field the form
      // should mark. See the exception block in the migration for why these are
      // custom codes rather than a shared 23505.
      if (error.code === "P0101") return { ok: false, reason: "duplicate-team-name" };
      if (error.code === "P0102") return { ok: false, reason: "duplicate-utr" };
      if (error.code === "P0103") return { ok: false, reason: "duplicate-roll" };
      // The team-size guard raises check_violation, which Postgres reports as
      // 23514. Reachable only by a caller that bypassed the zod schema.
      if (error.code === "23514") return { ok: false, reason: "team-size" };
    }

    console.error("[finathon/register] team write failed:", error);
    return { ok: false, reason: "error" };
  }
}

/*
  Removes an uploaded screenshot after the database write failed.

  The upload runs BEFORE the insert, because a row pointing at a missing file is
  worse than a file with no row — one breaks the admin page, the other is
  invisible. This is the compensating action that keeps the bucket from
  accumulating orphans when the insert then fails.

  Swallows its own failure on purpose: a cleanup that throws would replace a
  handled, explainable error with an unhandled one, and the student would see a
  500 instead of "that UTR is already used".
*/
export async function discardUploadedScreenshot(objectPath: string): Promise<void> {
  try {
    await storageDelete(PAYMENTS_BUCKET, objectPath);
  } catch (error) {
    console.error("[finathon/register] could not remove orphaned screenshot:", error);
  }
}
