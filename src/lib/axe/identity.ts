/*
  Visitor identity, device classification and bot detection for /axe.

  The single rule this file exists to enforce: A RAW IP ADDRESS IS NEVER
  STORED, LOGGED, OR RETURNED. It enters a function and only a hash leaves.
  Every other module in the pipeline gets its identifiers from here so that
  rule has exactly one place to be got right.
*/

// Node's crypto, not the Web Crypto API: createHash is synchronous, so callers
// need no await in the hot path of a beacon. It does mean every consumer must
// declare `export const runtime = "nodejs"`, since this module cannot load on
// the Edge runtime.
import { createHash } from "node:crypto";

// Same tripwire as supabase.ts and session.ts, and it belongs here for a
// specific reason: this module also exports innocuous-looking helpers (isBot,
// deviceFrom, referrerHost) that a future client component would plausibly want
// to import — and doing so would drag the AXE_SALT reads below into the browser
// bundle. The caveat from those files applies unchanged: this fires at RUNTIME,
// whereas the `server-only` package would fail the BUILD. It is a loud crash,
// not prevention.
if (typeof window !== "undefined") {
  throw new Error("src/lib/axe/identity.ts is server-only and must never reach the browser.");
}

// India Standard Time as a fixed offset in minutes. Correct rather than
// approximate: India has never observed daylight saving.
const IST_OFFSET_MS = 330 * 60_000;

// The device buckets, mirrored from the CHECK constraint on page_view.device.
// Typed as a union so a typo here becomes a compile error rather than a silent
// extra slice on the device chart that makes the split stop adding up.
export type Device = "mobile" | "desktop" | "tablet" | "unknown";

/*
  Today's date as YYYY-MM-DD, in IST.

  === WHY IST AND NOT UTC ==================================================
  The obvious choice is UTC, on the reasoning that the stamp only needs to be
  CONSISTENT between two hashes computed seconds apart and never has to be read
  by a human. That reasoning is right in isolation and wrong in context.

  The dashboard buckets every chart and every unique-visitor count by IST day,
  because that is the founder's working day. If the salt rotated on the UTC date
  instead, the two would disagree for the 05:30 window between UTC midnight and
  IST midnight: a visitor active at 04:00 IST and again at 07:00 IST on the same
  IST day would carry two different hashes inside a single chart bucket, and be
  counted as two people.

  The fix is for both to use the same calendar. A fixed offset is safe to
  compute this way precisely because India has no daylight saving, so the
  boundary does not move and cannot depend on which region the function ran in.
  ==========================================================================
*/
function istDateStamp(now: Date = new Date()): string {
  // Shift the instant into IST, then read its UTC date — the standard way to
  // ask "what local day was this" without a timezone library, and exact here
  // because the offset is constant.
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/*
  The pseudonymous visitor identifier.

  sha256(ip + user_agent + AXE_SALT + date), per section 8 of the design doc.

  WHY THE SALT: without it the hash is one rainbow-table lookup away from the
  IP, because the IPv4 space is small enough to enumerate exhaustively. The salt
  is the only thing making this one-way in practice rather than just in theory.

  WHY THE DATE — DO NOT REMOVE IT AS REDUNDANT:
  it rotates the hash daily, so the same person is a new, unlinkable identifier
  tomorrow. This is the LEGAL BASIS of the whole pipeline, not a refinement of
  it. A fixed-salt hash is only PSEUDONYMISATION: it is still personal data and
  stays fully within the scope of the DPDP Act 2023 and the GDPR, with every
  obligation that brings. Rotating the salt daily and keeping nothing that can
  relink the days is what makes the data ANONYMOUS, which is what puts it
  outside that scope and is why this collection needs no cookie banner.

  Deleting the date component would look like a harmless simplification — the
  function would still work, the dashboard would still render — while silently
  converting this system into one that processes personal data. That decision
  was locked by the founder on 2026-09-17 and is not a preference.

  THE PRICE, AND IT IS PERMANENT: a hash is comparable only within one day, so
  new-vs-returning visitors, multi-day journey stitching, and any true count of
  distinct people over a range are impossible here by construction. See the
  long note on sumOfDailyUniqueVisitors in queries.ts for how the dashboard
  counts visitors honestly given that constraint.
*/
export function visitorHash(ip: string, userAgent: string, now?: Date): string {
  // Without AXE_SALT the hash would be unsalted and therefore reversible, which
  // defeats the one privacy promise this function exists to keep. Refusing to
  // produce a value is the only safe failure: a hardcoded fallback salt would
  // look like it worked while quietly storing recoverable IPs.
  const salt = process.env.AXE_SALT;
  if (!salt) {
    throw new Error("AXE_SALT is not set; refusing to compute an unsalted visitor hash.");
  }

  return createHash("sha256")
    // Joined with a delimiter rather than concatenated bare: without one,
    // ip "1.2.3" + ua "4x" and ip "1.2" + ua "34x" hash identically, collapsing
    // two distinct visitors into one. A character that cannot appear in an IP
    // removes the ambiguity for free.
    .update(`${ip}|${userAgent}|${salt}|${istDateStamp(now)}`)
    .digest("hex");
}

/*
  A hash of the client IP for RATE LIMITING, not for visitor counting.

  Deliberately has NO date component, unlike visitorHash above. The rate limiter
  counts failed logins in a trailing 15-minute window, and a hash that rotated
  at midnight would reset that counter mid-window — a narrow but real bypass, on
  the one endpoint whose entire job is to resist guessing. Stability inside the
  window is the requirement here; unlinkability across days is not.
*/
export function rateLimitIpHash(ip: string): string {
  const salt = process.env.AXE_SALT;
  if (!salt) {
    throw new Error("AXE_SALT is not set; refusing to compute an unsalted IP hash.");
  }
  // Prefixed so this value can never collide with a visitorHash of the same IP,
  // which would let rows in one table be looked up against the other's.
  return createHash("sha256").update(`ratelimit|${ip}|${salt}`).digest("hex");
}

/*
  Extracts the client IP from request headers.

  Behind Vercel the socket address belongs to a load balancer, so the real
  client sits in a forwarded header. x-forwarded-for may be a chain
  ("client, proxy1, proxy2") and the LEFTMOST entry is the original client.
*/
export function clientIp(headers: Headers): string {
  // Vercel's own header is preferred where present: the platform sets it and
  // a caller cannot spoof it, unlike x-forwarded-for which is only ever
  // whatever the incoming request claimed.
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // A named sentinel rather than an empty string: empty would be easy to
  // mistake for a legitimate value downstream, whereas this makes the "could
  // not determine" bucket visible for what it is.
  return "unknown-ip";
}

/*
  Bot signatures, matched as lowercase substrings of the user agent.

  This is a substring list, not a maintained bot database, and the honest
  framing is that it catches the crawlers that ANNOUNCE themselves. That is the
  overwhelming majority of unattended traffic and costs nothing. It does not
  catch a headless browser impersonating Chrome, and it is not meant to — that
  is an arms race, and the cost of a miss is one row with is_bot left false,
  not lost data.
*/
const BOT_SIGNATURES = [
  // Generic self-declarations. These alone cover the long tail of small
  // crawlers that would otherwise each need their own entry here.
  "bot", "crawler", "spider", "crawling",
  // Search and social engines: the bulk of automated traffic to a marketing
  // site, and the traffic that would most inflate every tile if left unflagged.
  "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "facebookexternalhit", "twitterbot", "linkedinbot", "whatsapp", "telegrambot",
  "slackbot", "discordbot", "embedly", "pinterest",
  // Uptime and audit tooling, which hits on a fixed schedule and would
  // otherwise read as a small, suspiciously regular stream of real visitors.
  "pingdom", "uptimerobot", "statuscake", "gtmetrix", "lighthouse",
  // Command-line and library HTTP clients. Never a human browsing, always a
  // script, so these are unambiguous.
  "curl", "wget", "python-requests", "axios", "node-fetch", "go-http-client",
  "java/", "okhttp", "postman", "headlesschrome", "phantomjs",
  // AI crawlers, now a material share of traffic and not covered by any of the
  // classic search-engine names above.
  "gptbot", "chatgpt-user", "claudebot", "anthropic-ai", "perplexitybot",
  "ccbot", "applebot", "amazonbot", "bytespider",
];

export function isBot(userAgent: string): boolean {
  // An absent user agent is itself the signal: every real browser sends one,
  // and the clients that omit it are scripts that did not bother.
  if (!userAgent) {
    return true;
  }
  // Lowercased once before matching, because UA casing is not standardised
  // ("Googlebot" vs "googlebot") and a case-sensitive test would miss half the
  // list above.
  const ua = userAgent.toLowerCase();
  return BOT_SIGNATURES.some((signature) => ua.includes(signature));
}

// Tablet patterns, tested FIRST — see deviceFrom below for why the order is the
// whole trick. The negative lookahead is the important part: Android tablets
// and Android phones differ only in that phones also say "mobile".
const TABLET_PATTERN = /ipad|tablet|playbook|silk|android(?!.*mobile)/;

// Phone patterns, tested second. "mobi" is the broad catch that covers the
// long tail of devices none of the named entries would match.
const MOBILE_PATTERN = /mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/;

// Desktop platform tokens. Matched positively rather than used as a fallback,
// for the reason given at the end of deviceFrom.
const DESKTOP_PATTERN = /windows nt|macintosh|mac os x|linux|cros|x11/;

/*
  Device class from the user agent.

  Order matters and is the entire subtlety here: tablet is tested BEFORE mobile,
  because an iPad's user agent contains "Mobile" and an Android tablet's
  contains "Android". Testing mobile first would classify every tablet as a
  phone, the tablet slice would permanently read zero, and the chart would still
  look completely plausible — which is what makes it worth a comment.
*/
export function deviceFrom(userAgent: string): Device {
  // No UA means no basis for a guess. 'unknown' is a real bucket in the schema
  // precisely so this case need not be forced into 'desktop', which would
  // inflate the largest slice with rows that are mostly automated.
  if (!userAgent) {
    return "unknown";
  }
  const ua = userAgent.toLowerCase();

  // First, per the ordering argument above.
  if (TABLET_PATTERN.test(ua)) {
    return "tablet";
  }

  // Second: anything left that announces itself as a handheld.
  if (MOBILE_PATTERN.test(ua)) {
    return "mobile";
  }

  // Positive identification rather than a bare else. Falling through to
  // 'desktop' for anything unrecognised would sweep every exotic crawler into
  // the desktop bucket and quietly bias the split that this column exists for.
  if (DESKTOP_PATTERN.test(ua)) {
    return "desktop";
  }

  return "unknown";
}

/*
  Reduces a referrer URL to its host.

  Section 5 of the design doc stores the host and never the full URL: the host
  answers the question actually being asked ("is LinkedIn sending traffic?")
  while a full referring URL can itself carry someone's identifiers in its query
  string, which is precisely what this pipeline promises not to keep.
*/
export function referrerHost(referrer: string | null, ownHost?: string): string | null {
  // No referrer means direct traffic — typed, bookmarked, or stripped by a
  // privacy setting. Returning null rather than a "direct" string keeps that
  // distinction in the database instead of inventing a hostname that does not
  // exist and cannot be told apart from a real one later.
  if (!referrer) {
    return null;
  }
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    // Internal navigation is not a traffic source. Left in, aczen.in would top
    // its own referrers chart and bury every genuine source beneath itself.
    if (ownHost && host === ownHost.replace(/^www\./, "")) {
      return null;
    }
    return host;
  } catch {
    // A malformed Referer header is attacker-controlled input, not an
    // exceptional condition. Dropping it is correct; throwing here would let
    // one junk header break collection for an otherwise valid pageview.
    return null;
  }
}
