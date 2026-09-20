/*
  POST /api/finathon/register — the Finathon registration form's submit target.

  Order of operations, which is the security-relevant part: rate-limit by hashed
  IP, then validate, then write. Limiting first means a flood cannot be used to
  probe the uniqueness of other teams' roll numbers through the difference
  between the "already registered" and "saved" responses.

  This endpoint is public and unauthenticated by necessity — it is how students
  register. What keeps that safe is that it can only ever INSERT: it never reads
  a row back, and the response says nothing about any registration but the one
  being submitted.
*/

import { NextResponse } from "next/server";

import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
import {
  recentSubmissionCount,
  saveRegistration,
  validateRegistration,
} from "@/lib/finathon/registrations";

// node:crypto, reached through the IP hashing. Not available on Edge.
export const runtime = "nodejs";

// A submission endpoint must never be served from cache.
export const dynamic = "force-dynamic";

// The trailing window the limiter counts over, and how many registrations one
// source may submit inside it. Five is chosen to accommodate the realistic
// legitimate case — several teams registering from one college's network or one
// shared hotspot during a class — while still stopping a script.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

export async function POST(request: Request): Promise<NextResponse> {
  // Hashed at the first opportunity. There is no point in this handler where a
  // raw IP is held in a named variable that outlives this line.
  const ipHash = rateLimitIpHash(clientIp(request.headers));

  try {
    // --- 1. Rate limit, before any parsing or writing ----------------------
    const recent = await recentSubmissionCount(ipHash, RATE_LIMIT_WINDOW_MS);
    if (recent >= RATE_LIMIT_MAX_SUBMISSIONS) {
      return NextResponse.json(
        {
          ok: false,
          // Specific here, unlike the /axe gate. There is no secret to protect
          // behind vagueness, and a team on a shared college network hitting
          // this needs to know it is a limit rather than a broken form.
          error:
            "Too many registrations from this network in the last hour. Try again later, or email finathon@aczen.in.",
        },
        { status: 429 },
      );
    }

    // --- 2. Parse ----------------------------------------------------------
    /*
      Parsed in its own try whose catch discards the error, matching the /axe
      session route. V8 embeds the first ~30 characters of the offending input
      in a JSON SyntaxError, so an outer catch that logged it would write part
      of a registrant's name into the runtime log on any malformed body.
    */
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Left empty, so validation below rejects it with a normal field message.
    }

    // --- 3. Validate -------------------------------------------------------
    const validated = validateRegistration({
      teamLeadName: body.teamLeadName,
      rollNumber: body.rollNumber,
      utr: body.utr,
    });
    /*
      `=== false`, not `!validated.ok`.

      This project compiles with strictNullChecks off, and under that setting
      TypeScript does not narrow a discriminated union through the TRUTHINESS of
      a boolean discriminant — only through an explicit comparison. Written the
      short way, `validated.field` below is a compile error, and the tempting
      fix is a cast that would silence the checker on both branches.
    */
    if (validated.ok === false) {
      return NextResponse.json(
        // The field travels with the message so the form can mark the right
        // input rather than putting one error above everything.
        { ok: false, field: validated.field, error: validated.message },
        { status: 400 },
      );
    }

    // --- 4. Write ----------------------------------------------------------
    const saved = await saveRegistration({ ...validated.value, ipHash });

    // Same explicit comparison as above, for the same strictNullChecks reason.
    if (saved.ok === false) {
      if (saved.reason === "duplicate-roll") {
        return NextResponse.json(
          {
            ok: false,
            field: "rollNumber",
            error: "This roll number is already registered. Check your email for confirmation.",
          },
          { status: 409 },
        );
      }
      if (saved.reason === "duplicate-utr") {
        return NextResponse.json(
          {
            ok: false,
            field: "utr",
            error:
              "This UTR has already been used for another registration. Check that you copied your own transaction reference.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: "Could not save your registration. Please try again, or email finathon@aczen.in.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Nothing from the error reaches the caller. It is already scrubbed of row
    // values by SupabaseWriteError, but the text still names the backend and
    // the table, which a public endpoint has no reason to disclose.
    console.error("[finathon/register] unexpected failure:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Could not save your registration. Please try again, or email finathon@aczen.in.",
      },
      { status: 500 },
    );
  }
}
