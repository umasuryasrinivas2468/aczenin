/*
  POST /api/collect — the first-party pageview collector.

  Called by src/components/axe/AxeBeacon.tsx on every client-side navigation.
  Writes one row to page_view.

  THE ONE INVARIANT: this endpoint must never fail a visitor's page. It is
  fire-and-forget telemetry attached to a marketing site, so every error path
  below ends in a 204, and the only thing a caller can learn from the response
  is that the request was received. Nothing about the schema, the database, or
  why a write failed crosses back to the browser.
*/

import { NextResponse } from "next/server";

import {
  clientIp,
  deviceFrom,
  isBot,
  referrerHost,
  visitorHash,
} from "@/lib/axe/identity";
import { axeInsert } from "@/lib/axe/supabase";

// Node.js runtime, not Edge: identity.ts uses node:crypto for sha256, which the
// Edge runtime does not provide. Declared explicitly rather than relied on as a
// default so a future change to the project-wide default cannot break it
// silently.
export const runtime = "nodejs";

// Never statically analysed or cached. A collector that Next decided to
// prerender would record one pageview at build time and none afterwards.
export const dynamic = "force-dynamic";

// Upper bound on any string taken from the request body. The body is entirely
// attacker-controlled, and without a cap a single request could insert a
// multi-megabyte row — cheap for the sender, permanent for the database.
const MAX_FIELD_LENGTH = 512;

/*
  Trims an untrusted value to a storable string, or null.

  Centralised so no field can be forgotten: every value that reaches the insert
  passes through here, which is what makes "all input is bounded" a property of
  the file rather than a promise about each call site.
*/
function sanitise(value: unknown): string | null {
  // Anything that is not a string — numbers, objects, arrays smuggled in as
  // JSON — is rejected outright rather than coerced. Coercion is how "[object
  // Object]" ends up as a row in a production analytics table.
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().slice(0, MAX_FIELD_LENGTH);
  // Empty after trimming is the same as absent, and null keeps that meaning in
  // the column instead of storing a blank string that has to be filtered out of
  // every subsequent query.
  return trimmed.length > 0 ? trimmed : null;
}

/*
  Pulls the UTM parameters out of the page URL supplied by the beacon.

  Parsed server-side rather than trusting the client to split them, so the
  browser sends one field and the shape of what lands in the database is decided
  in exactly one place.
*/
function utmFrom(rawUrl: string | null): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  // No URL means no campaign data. Returning the full shape with nulls rather
  // than an empty object keeps the insert below free of conditional spreading.
  if (!rawUrl) {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
  try {
    // A base is required because the beacon may send a path-relative URL; the
    // origin is discarded immediately and only the query string is used.
    const params = new URL(rawUrl, "https://aczen.in").searchParams;
    return {
      utm_source: sanitise(params.get("utm_source")),
      utm_medium: sanitise(params.get("utm_medium")),
      utm_campaign: sanitise(params.get("utm_campaign")),
    };
  } catch {
    // Malformed URL from an untrusted client is expected, not exceptional.
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

/*
  Reads Vercel's edge geo headers.

  Geography comes free with the request, which is why the design doc chose it
  over a GeoIP service: nothing to pay for, nothing to keep up to date, and no
  third party sees the visitor's IP.
*/
function geoFrom(headers: Headers): { country: string | null; city: string | null } {
  // decodeURIComponent because Vercel percent-encodes the city header — without
  // it the dashboard shows "New%20Delhi" and, worse, treats it as a different
  // city from any correctly decoded row.
  const rawCity = headers.get("x-vercel-ip-city");
  let city: string | null = null;
  if (rawCity) {
    try {
      city = sanitise(decodeURIComponent(rawCity));
    } catch {
      // A malformed percent-escape would throw; the raw value is still better
      // than nothing and cannot be worse than dropping the row's geography.
      city = sanitise(rawCity);
    }
  }
  return {
    country: sanitise(headers.get("x-vercel-ip-country")),
    city,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  // Parsed in its own try, outside the logged one below. A JSON SyntaxError
  // embeds the first ~30 characters of the offending input in its message, so
  // logging it would put a fragment of an untrusted request body into the
  // runtime log. Nothing in a beacon body is sensitive today, but the same
  // shape on the login route would have logged part of a password — so both
  // routes handle it identically rather than relying on that staying true.
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // A scanner probing the endpoint with a non-JSON body. 204 like every other
    // path here, and nothing logged.
    return new NextResponse(null, { status: 204 });
  }

  try {
    const headers = request.headers;
    // The user agent drives three separate derivations below (bot flag, device
    // class, visitor hash), so it is read once and defaulted once.
    const userAgent = headers.get("user-agent") ?? "";
    // Read but NEVER stored: it goes straight into the hash on the next line
    // and is not referenced again anywhere in this function.
    const ip = clientIp(headers);

    // The path is the only genuinely required field — a pageview with no page
    // is not a pageview — so its absence is the one case that short-circuits.
    const path = sanitise(body.path);
    if (!path) {
      return new NextResponse(null, { status: 204 });
    }

    const { country, city } = geoFrom(headers);
    const utm = utmFrom(sanitise(body.url));

    await axeInsert("page_view", {
      path,
      // Computed from the client-reported referrer, with the site's own host
      // filtered out so internal navigation does not appear as a traffic source.
      referrer_host: referrerHost(sanitise(body.referrer), "aczen.in"),
      ...utm,
      country,
      city,
      // Derived server-side from the UA rather than taken from the body: a
      // client-supplied device string is unverifiable and trivially poisoned.
      device: deviceFrom(userAgent),
      is_bot: isBot(userAgent),
      // The privacy boundary. The raw ip local above dies with this call; only
      // this salted, daily-rotating digest is persisted.
      visitor_hash: visitorHash(ip, userAgent),
      // Client-generated and client-scoped: it only has to be consistent within
      // one browsing session to make the pageview-to-lead join work, so there is
      // nothing to verify and nothing gained by generating it server-side.
      session_id: sanitise(body.sessionId),
    });

    // 204 on success: there is no body worth sending, and sendBeacon ignores the
    // response entirely anyway.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Logged server-side so a broken collector is diagnosable, but deliberately
    // NOT surfaced: the error text can contain PostgREST detail about columns
    // and constraints, and this endpoint answers to the open internet.
    console.error("[axe/collect] insert failed:", error);
    // Still 204. A 500 here would show up as a failed request in the visitor's
    // devtools console on a marketing site, which is a worse outcome than a
    // silently missed row of analytics.
    return new NextResponse(null, { status: 204 });
  }
}
