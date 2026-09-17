import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: __dirname,

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
