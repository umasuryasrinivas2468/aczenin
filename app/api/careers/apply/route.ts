/*
  POST /api/careers/apply — the careers page application form.

  Unauthenticated by necessity, so the same ordering as the Finathon route:
  size, origin and rate limit are checked before the body is read.
*/

import { NextResponse } from "next/server";

import { clientIp, rateLimitIpHash } from "@/lib/axe/identity";
import { axeCount, axeInsert } from "@/lib/axe/supabase";
import { careerApplicationSchema, firstIssue } from "@/lib/careers/applicationSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A full application is a few kilobytes; anything far beyond that is not one.
const MAX_REQUEST_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

// JSON is not CORS-simple, so a cross-site POST is already preflighted and
// refused; this check covers non-browser clients and same-site siblings.
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

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json({ ok: false, field, error }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ipHash = rateLimitIpHash(clientIp(request.headers));

  try {
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return fail(413, "Your application is too long. Please shorten it and try again.");
    }

    if (isSameOriginRequest(request) === false) {
      return fail(403, "This request did not come from the careers page.");
    }

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const recent = await axeCount(
      "career_application",
      `ip_hash=eq.${encodeURIComponent(ipHash)}&submitted_at=gte.${encodeURIComponent(since)}`,
    );
    if (recent >= RATE_LIMIT_MAX) {
      return fail(429, "Too many applications from this network in the last hour. Try again later.");
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      // Discarded: a JSON SyntaxError embeds part of the input, i.e. personal data.
      return fail(400, "Could not read your application. Please try again.");
    }

    // `=== false` rather than `!parsed.success`: strictNullChecks is off here,
    // and only the explicit comparison narrows the union.
    const parsed = careerApplicationSchema.safeParse(body);
    if (parsed.success === false) {
      const issue = firstIssue(parsed.error);
      return fail(400, issue.message, issue.field);
    }

    const application = parsed.data;
    await axeInsert("career_application", {
      full_name: application.fullName,
      email: application.email,
      phone: application.phone,
      skills: application.skills,
      projects: application.projects,
      resume_url: application.resumeUrl,
      ip_hash: ipHash,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    // Not logged with details: a write error on this table could carry the
    // applicant's details.
    console.error("careers/apply: submission failed");
    return fail(500, "Could not submit your application. Please try again, or email team@aczen.in.");
  }
}
