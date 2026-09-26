import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
  One source pattern, reused by every security header below, so the headers
  cannot drift apart from each other by someone editing four copies of a path.

  Spelled as an explicit character class rather than relying on Next matching
  `source` case-insensitively. That case-insensitivity is real but is not a
  documented guarantee, and the failure mode of relying on it is silent: a
  visitor who reaches /finathon/register without passing through middleware
  would get the page with NO security headers, and nothing in the build output
  would say so. A character class is verifiable instead — path-to-regexp
  compiles it at build time, so a mistake here fails the build loudly.

  `:path*` makes the trailing segments optional, so this one entry covers the
  bare /Finathon as well as /Finathon/register and /Finathon/axe/26.
*/
const FINATHON_SOURCE = "/:finathonSegment([Ff][Ii][Nn][Aa][Tt][Hh][Oo][Nn])/:path*";

/*
  Scoped to the Finathon subtree, deliberately, and not applied site-wide.

  The rest of aczen.in loads Sanity, Microsoft Clarity and a Chatbase embed that
  nobody has audited against a header policy. Shipping these four everywhere in
  the same change would mean any breakage appearing afterwards has two candidate
  causes instead of one. The Finathon subtree is the part that takes a payment
  reference, so it is the part that earns the first pass.
*/
const FINATHON_SECURITY_HEADERS = [
  {
    // The clickjacking fix, stated the old way. /Finathon/register collects a
    // name, a roll number and a UPI transaction reference; framed invisibly
    // over an attacker's page, all of that is typed somewhere else.
    key: "X-Frame-Options",
    // DENY rather than SAMEORIGIN: nothing on aczen.in frames this page either,
    // so the stricter value costs nothing and closes the same-origin loophole.
    value: "DENY",
  },
  {
    // The same rule stated the modern way, and the one that actually binds:
    // X-Frame-Options was never standardised, and browsers honour
    // frame-ancestors in preference to it where both are present. Both are sent
    // because X-Frame-Options is still what older scanners look for.
    key: "Content-Security-Policy",
    /*
      This is NOT the site-wide CSP that was explicitly ruled out, and the
      distinction is worth writing down rather than trusting to memory.

      A CSP containing only frame-ancestors constrains exactly one thing: who
      may embed this page. It says nothing about script-src, style-src,
      connect-src or img-src, so it cannot block Sanity, Clarity, Google
      Analytics or any third-party embed — there is no directive present for
      them to violate. A default-src or script-src policy would be the risky
      one, and that is precisely the one deliberately absent here.
    */
    value: "frame-ancestors 'none'",
  },
  {
    // Stops the full URL leaking to third parties on cross-origin navigation.
    key: "Referrer-Policy",
    // strict-origin-when-cross-origin: same-origin requests keep the full path
    // so internal analytics still works, cross-origin gets the bare origin, and
    // an HTTPS-to-HTTP downgrade gets nothing at all.
    value: "strict-origin-when-cross-origin",
  },
  {
    // Forbids MIME sniffing, which is what turns an uploaded "image" that is
    // really HTML into stored XSS. Directly relevant here: payment screenshots
    // are user-uploaded and are served back into the admin dashboard.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Deny-by-default for the powerful browser APIs. Checked against the
    // subtree before being set: nothing under /Finathon calls getUserMedia,
    // navigator.geolocation or the Payment Request API, so denying all four
    // removes capability without removing behaviour.
    key: "Permissions-Policy",
    /*
      An empty allowlist () denies the feature to this document and to every
      frame it embeds, which is the strict reading of the spec.

      payment=() is the entry to re-check before anything changes here: if UPI
      collection ever moves from a typed transaction reference to a real Payment
      Request integration, this header is what will break it — and it will break
      in the browser at runtime, not at build time.
    */
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: __dirname,

  /*
    Previously absent from this file entirely, which had two consequences — and
    only one of them was cosmetic.
  */
  images: {
    // The cosmetic one: with no formats key, next/image negotiates WebP only.
    // Listing AVIF first lets the browser take the smaller encoding when it can,
    // which matters most on the phone connections this event's audience is on.
    formats: ["image/avif", "image/webp"],
    /*
      The load-bearing one: next/image REFUSES an un-allowlisted remote host by
      throwing at render time rather than by falling back to an unoptimised img.
      The admin dashboard renders payment screenshots straight out of Supabase
      storage, so without this entry the first screenshot to reach that page
      takes the whole route down with a server error.
    */
    remotePatterns: [
      {
        // https only. An http entry here would let a downgraded URL through.
        protocol: "https",
        // The project's Supabase storage host, named exactly rather than as a
        // wildcard subdomain: **.supabase.co would allowlist every Supabase
        // project on the internet as an image source for this site.
        hostname: "jgwvyyqagabtpnomdwgo.supabase.co",
        // Confined to the storage object API. The same host also answers
        // /auth/v1 and /rest/v1, and there is no reason the image optimiser
        // should be able to fetch either of those.
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // The subtree: /Finathon/register, /Finathon/axe/26 and anything added
        // under the path later, in any capitalisation.
        source: FINATHON_SOURCE,
        headers: FINATHON_SECURITY_HEADERS,
      },
      {
        // The bare path, listed separately for the same reason the middleware
        // matcher lists both forms: if the optional-segment form above ever
        // stops matching the parent, the event page itself would quietly lose
        // its headers while every child route kept them, which is the hardest
        // kind of gap to notice from the outside.
        source: "/:finathonSegment([Ff][Ii][Nn][Aa][Tt][Hh][Oo][Nn])",
        headers: FINATHON_SECURITY_HEADERS,
      },
      {
        /*
          The endpoints behind the pages, which is where the registration and
          the payment reference actually land. Included because nosniff is the
          header that matters most on a JSON response: a browser that sniffs an
          error body as HTML is how a JSON endpoint becomes an XSS sink.

          Spelled with exact casing, unlike the page sources above. These paths
          are only ever called by our own fetch() with a literal string, so
          there is no human typing them and no typo traffic to absorb — and a
          case-insensitive API surface is extra matching for no benefit.
        */
        source: "/api/finathon/:path*",
        headers: FINATHON_SECURITY_HEADERS,
      },
    ];
  },

  async redirects() {
    return [
      {
        /*
          The security case report shipped under a misspelled parent segment
          ("secuirty"). The directory was renamed to /security on 2026-09-17,
          which would 404 any link already handed out — and this is a public
          disclosure URL, the kind that gets emailed to a customer or regulator
          and lives in an inbox long after the repo moved on.

          Unlike the /finathon case in middleware.ts, source and destination
          differ here, so Next's case-insensitive `source` matching cannot make
          this rule redirect to itself. A plain redirects() entry is safe and
          costs nothing at runtime, so it does not need middleware.
        */
        source: "/secuirty/:path*",
        destination: "/security/:path*",
        // Permanent (308): the old spelling is never coming back, and 308
        // preserves the request method where a 302 would not.
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
