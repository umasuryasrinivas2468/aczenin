/*
  POST /api/finathon/register — the Finathon team registration submit target.

  ============================================================================
  THE ORDER OF OPERATIONS IS THE SECURITY. Read this before editing.

    1. Content-Length ceiling      — before the body is read
    2. Origin / Sec-Fetch-Site     — before the body is read
    3. Deadline                    — before the body is read
    4. Rate limit                  — before the body is read
    5. Parse multipart
    6. zod validation
    7. Magic-byte sniff on the file
    8. Upload to the private bucket
    9. One transactional RPC
   10. On RPC failure, delete the orphaned object

  Steps 1-4 all run before a single byte of the body is consumed, so a flood of
  5 MB uploads is rejected without ever being buffered. Moving any of them below
  step 5 turns "reject cheaply" into "process then reject", which is the whole
  attack.
  ============================================================================

  WHY THE ORIGIN CHECK IS NEW AND NOT OPTIONAL:

  This endpoint is unauthenticated by necessity — it is how students register —
  and it carries no CSRF token. Until now it was protected by accident:
  `application/json` is NOT a CORS-simple content type, so a cross-origin POST
  triggered a preflight that failed.

  `multipart/form-data` IS CORS-simple. It is not preflighted. Switching to file
  upload silently deleted the only thing standing there, which is why the
  explicit Origin / Sec-Fetch-Site check below replaces it.
*/

import { NextResponse } from "next/server";

import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
import {
  MAX_SCREENSHOT_BYTES,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  discardUploadedScreenshot,
  logRegisterAttempt,
  recentAttemptCount,
  registerTeam,
  sniffImageType,
  uploadPaymentScreenshot,
} from "@/lib/finathon/teamRegistrations";
import {
  firstIssue,
  registrationIsClosed,
  teamRegistrationSchema,
} from "@/lib/finathon/teamRegistrationSchema";

// node:crypto reaches this route through the IP hashing and the upload path, so
// it must run on the Node.js runtime rather than Edge.
export const runtime = "nodejs";

// A submission endpoint must never be served from a cache.
export const dynamic = "force-dynamic";

/*
  Headroom above the file ceiling for the rest of the multipart body.

  The JSON payload for a five-person team is a few kilobytes; 256 KB is far more
  than it can be and still small enough that the check is meaningful. Without
  headroom a legitimate 5 MB screenshot would be rejected for the overhead of
  its own MIME boundaries.
*/
const MAX_REQUEST_BYTES = MAX_SCREENSHOT_BYTES + 256 * 1024;

/*
  Is this request from our own page?

  Two independent signals, because neither is universal:

  - `Sec-Fetch-Site` is set by the BROWSER and cannot be spoofed by page
    JavaScript, which makes it the stronger of the two. Present in every current
    browser; absent in older ones and in non-browser clients.
  - `Origin` is the fallback. Also browser-set on cross-origin requests.

  A request with NEITHER header is not a browser form post. It is curl or a
  script, and it is refused — this endpoint exists to serve one page.
*/
function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  // The strong signal, when the browser provides it. "same-origin" is what a
  // fetch from our own page sends. Anything else — "cross-site", "same-site"
  // from a sibling subdomain — is refused.
  if (secFetchSite) {
    return secFetchSite === "same-origin";
  }

  const origin = request.headers.get("origin");
  // No Sec-Fetch-Site AND no Origin: not a browser form post. Refuse.
  if (!origin) {
    return false;
  }

  // Compare the Origin's host against the Host the request actually arrived on.
  // Using the Host header rather than a hardcoded domain keeps preview
  // deployments and localhost working without an allowlist to maintain.
  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  try {
    // Parsing rather than string-comparing: "https://aczen.in.evil.com" starts
    // with the right characters and a prefix check would accept it.
    return new URL(origin).host === host;
  } catch {
    // An unparseable Origin is not a value to reason about. Refuse.
    return false;
  }
}

/* One JSON error shape, so every failure path looks the same to the form. */
function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json({ ok: false, field, error }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  // Hashed at the first opportunity. At no point below does a raw IP live in a
  // named variable that outlives this line.
  const ipHash = rateLimitIpHash(clientIp(request.headers));

  // Set once an upload has happened, so the catch-all at the bottom can clean
  // it up if anything after it throws.
  let uploadedPath: string | null = null;

  try {
    // --- 1. Size ceiling, before the body is touched ------------------------
    // Content-Length is client-supplied and therefore a hint, not a guarantee —
    // but a request that DECLARES more than the ceiling can be refused for free,
    // and one that lies about a smaller size still meets the real byte check
    // after parsing in step 7.
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(413, "That screenshot is too large. Please upload an image under 5 MB.", "screenshot");
    }

    // --- 2. Origin, before the body is touched ------------------------------
    // The replacement for the CSRF protection that multipart removed.
    if (isSameOriginRequest(request) === false) {
      await logRegisterAttempt(ipHash, "rejected");
      // Deliberately terse. A cross-origin caller gets no detail about why.
      return fail(403, "This request did not come from the registration page.");
    }

    // --- 3. Deadline, before the body is touched ----------------------------
    // NEW. Nothing enforced this before: the countdown flipped to a closed state
    // while the API happily kept accepting money for a closed event.
    if (registrationIsClosed() === true) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(403, "Registration for Finathon 2026 has closed. Email finathon@aczen.in if you have already paid.");
    }

    // --- 4. Rate limit, before the body is touched --------------------------
    // Counts the attempt LEDGER, not the table of successful saves. The old
    // limiter counted successes, so every 400 and 409 was free — which with a
    // 5 MB upload in the path means unbounded bodies processed for nothing.
    const attempts = await recentAttemptCount(ipHash, RATE_LIMIT_WINDOW_MS);
    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      // Not logged as an attempt: doing so would let a blocked caller extend
      // their own block indefinitely by continuing to hammer the endpoint.
      return fail(
        429,
        "Too many attempts from this network in the last hour. Try again later, or email finathon@aczen.in.",
      );
    }

    // --- 5. Parse ------------------------------------------------------------
    // Content type checked explicitly. This is no longer a CSRF defence — step 2
    // is — but a body that is not multipart cannot carry a file, and saying so
    // beats failing obscurely inside formData().
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data") === false) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(415, "Unexpected request format.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      // The error is discarded, not logged. A parser error can embed a fragment
      // of the malformed body, which here would be part of a student's details.
      await logRegisterAttempt(ipHash, "rejected");
      return fail(400, "Could not read your submission. Please try again.");
    }

    // The team data travels as ONE JSON field rather than 23 flat form fields.
    // Flat fields would need a bespoke parser to rebuild the members array, and
    // that parser would be a second place where the shape could drift from the
    // schema.
    const rawPayload = form.get("payload");
    if (typeof rawPayload !== "string") {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(400, "Your team details were missing from the submission.");
    }

    let parsedJson: unknown = null;
    try {
      parsedJson = JSON.parse(rawPayload);
    } catch {
      // Again discarded: V8 puts the first ~30 characters of the offending input
      // into a JSON SyntaxError, which would be a registrant's name.
      await logRegisterAttempt(ipHash, "rejected");
      return fail(400, "Could not read your team details. Please try again.");
    }

    // --- 6. Validate ---------------------------------------------------------
    const parsed = teamRegistrationSchema.safeParse(parsedJson);
    /*
      `=== false`, not `!parsed.success`.

      This project compiles with strictNullChecks off, and under that setting
      TypeScript does not narrow a discriminated union through the TRUTHINESS of
      its discriminant — only through an explicit comparison. Written the short
      way, `parsed.error` below is a compile error whose tempting "fix" is a cast
      that silences the checker on BOTH branches.
    */
    if (parsed.success === false) {
      await logRegisterAttempt(ipHash, "rejected");
      const issue = firstIssue(parsed.error);
      return fail(400, issue.message, issue.field);
    }

    // --- 7. The file ---------------------------------------------------------
    const screenshot = form.get("screenshot");
    // instanceof Blob rather than File: File is a subclass of Blob and the
    // narrower check has been inconsistent across runtimes.
    if (screenshot instanceof Blob === false) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(400, "Attach a screenshot of your payment.", "screenshot");
    }

    // The REAL byte length, now that the body is parsed. This is the check that
    // a lying Content-Length in step 1 does not get past.
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(413, "That screenshot is too large. Please upload an image under 5 MB.", "screenshot");
    }
    // A zero-byte file is a failed pick in the file dialog, not a payment.
    if (screenshot.size === 0) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(400, "That file appears to be empty. Attach your payment screenshot.", "screenshot");
    }

    const bytes = new Uint8Array(await screenshot.arrayBuffer());

    /*
      Identified by MAGIC BYTES, never by the Content-Type the client attached.

      The client sets that header, so it proves nothing: `curl -F
      "file=@shell.php;type=image/jpeg"` claims whatever it likes. The first
      bytes of the file are the only claim the client does not control for free,
      and the sniffed type — not the claimed one — is what gets sent to storage.
    */
    const realType = sniffImageType(bytes);
    if (realType === null) {
      await logRegisterAttempt(ipHash, "rejected");
      return fail(
        415,
        "That file is not a JPEG, PNG or WebP image. Upload a screenshot from your payment app.",
        "screenshot",
      );
    }

    // --- 8. Upload -----------------------------------------------------------
    // Before the database write, because a row pointing at a missing file breaks
    // the admin page, whereas a file with no row is merely invisible. The
    // compensating delete in step 10 handles the latter.
    uploadedPath = await uploadPaymentScreenshot(bytes, realType);

    // --- 9. The transactional write ------------------------------------------
    const saved = await registerTeam(parsed.data, ipHash, uploadedPath);

    // Same explicit comparison, same strictNullChecks reason as above.
    if (saved.ok === false) {
      // --- 10. Undo the upload ----------------------------------------------
      await discardUploadedScreenshot(uploadedPath);
      // Cleared so the catch block below does not try to delete it twice.
      uploadedPath = null;
      await logRegisterAttempt(ipHash, "rejected");

      // Each duplicate names the field the form should mark, so the student is
      // pointed at the input to change rather than shown one error above
      // everything. These arrive as the custom SQLSTATEs the Postgres function
      // raises — see the exception block in the migration for why.
      if (saved.reason === "duplicate-team-name") {
        return fail(409, "That team name is already registered. Pick another.", "teamName");
      }
      if (saved.reason === "duplicate-utr") {
        return fail(
          409,
          "This UTR has already been used for another registration. Check that you copied your own transaction reference.",
          "utr",
        );
      }
      if (saved.reason === "duplicate-roll") {
        return fail(
          409,
          "One of these roll numbers is already registered with another team. Each student may only join one team.",
          "members",
        );
      }
      if (saved.reason === "team-size") {
        return fail(400, "A team must have 3 to 5 members including the team lead.", "members");
      }

      // 'error' — our fault, so it is recorded as such rather than as a
      // rejection, keeping an outage visible instead of hidden in abuse counts.
      await logRegisterAttempt(ipHash, "error");
      return fail(500, "Could not save your registration. Please try again, or email finathon@aczen.in.");
    }

    await logRegisterAttempt(ipHash, "accepted");
    // The unguessable id only. No row is read back and nothing about any other
    // registration is disclosed.
    return NextResponse.json({ ok: true, publicId: saved.publicId }, { status: 201 });
  } catch (error) {
    // If an upload survived to here, the write never completed. Remove it.
    if (uploadedPath !== null) {
      await discardUploadedScreenshot(uploadedPath);
    }
    await logRegisterAttempt(ipHash, "error");
    // Nothing from the error reaches the caller. It is already scrubbed of row
    // values by SupabaseWriteError, but the text still names the backend and the
    // table, which a public endpoint has no reason to disclose.
    console.error("[finathon/register] unexpected failure:", error);
    return fail(500, "Could not save your registration. Please try again, or email finathon@aczen.in.");
  }
}
