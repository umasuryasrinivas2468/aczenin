/*
  /nova-api/docs/rate-limits — per-key limits, fixed windows and the headers.
  Behaviour checked against route.ts (rateLimitHeaders, the 429 branch) and
  the nova_api_usage table in supabase/nova/001_schema.sql (default 120,
  windows truncated to the minute).
*/

// Metadata type for the tab title.
import type { Metadata } from "next";

// Shared docs blocks.
import { CodeBlock } from "@/components/nova/docs/CodeBlock";
import { C, Callout, DocsArticle, DocsHeader, DocsPager, DocsSection, P, ParamTable } from "@/components/nova/docs/primitives";
// Shared constants and snippet helpers.
import { DOCS_ROOT, curl, json, pagerFor } from "@/components/nova/docs/content";

// "Rate limits | Nova API".
export const metadata: Metadata = { title: "Rate limits" };

// Schema default for nova_api_key.rate_limit_per_min.
const DEFAULT_PER_MIN = 120;

// The headers route.ts sets, with what each tells a client.
const HEADERS: { name: string; meaning: string; when: string }[] = [
  { name: "RateLimit-Limit", meaning: "Requests allowed per window for this key.", when: "Every authenticated response" },
  { name: "RateLimit-Remaining", meaning: "Requests left in the current window. Never negative.", when: "Every authenticated response" },
  { name: "RateLimit-Reset", meaning: "Seconds until the window resets, 1 to 60.", when: "Every authenticated response" },
  { name: "Retry-After", meaning: "Seconds to wait before retrying. Same value as RateLimit-Reset.", when: "429 only" },
];

// A 429 as it arrives, headers first because they are what a client acts on.
const TOO_MANY = `HTTP/1.1 429 Too Many Requests
RateLimit-Limit: ${DEFAULT_PER_MIN}
RateLimit-Remaining: 0
RateLimit-Reset: 17
Retry-After: 17
Content-Type: application/json

${json({
  error: { type: "rate_limit_error", code: "rate_limit_exceeded", message: `Rate limit of ${DEFAULT_PER_MIN} requests per minute exceeded.` },
  request_id: "b42e8d10-6f3a-4c9e-a1d7-0c5e9f2b3a68",
})}`;

// Minimal client-side backoff, the pattern the headers are designed for.
const BACKOFF = `// Node 18+: fetch is global.
async function novaGet(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(\`https://www.aczen.in/nova-api/v1/\${path}\`, {
      headers: { Authorization: \`Bearer \${process.env.NOVA_API_KEY}\` },
    });
    if (res.status !== 429) return res;
    // Wait exactly as long as the API says, then try again.
    const wait = Number(res.headers.get("Retry-After") ?? 60);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  throw new Error("Nova rate limit: gave up after 3 attempts");
}`;

export default function NovaDocsRateLimitsPage() {
  // Bottom pager neighbours.
  const pager = pagerFor(`${DOCS_ROOT}/rate-limits`);
  return (
    <DocsArticle>
      {/* Page header. */}
      <DocsHeader
        eyebrow="Guides"
        title="Rate limits"
        lead={
          <>
            Each key gets <strong className="text-foreground">{DEFAULT_PER_MIN} requests per minute</strong> by default,
            counted in fixed one-minute windows.
          </>
        }
      />

      {/* Window semantics. */}
      <DocsSection id="windows" title="How requests are counted">
        <P>
          Windows start on the clock minute, not at your first request, and the count resets to zero when the minute
          rolls over. A burst late in one minute and another early in the next can therefore both succeed.
        </P>
        <ul className="max-w-prose list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          {/* What counts, so clients can budget accurately. */}
          <li>Every authenticated request counts, including ones that end in a 400, 404 or 429.</li>
          {/* What does not, so health probes are free. */}
          <li><C>/health</C> and requests rejected with a 401 do not count.</li>
          {/* Scope: per key, not per account or IP. */}
          <li>The limit belongs to the key. <C>/me</C> reports it as <C>rate_limit_per_min</C>.</li>
        </ul>
      </DocsSection>

      {/* Header reference. */}
      <DocsSection id="headers" title="Response headers">
        <ParamTable
          head={["Header", "Meaning", "Sent on"]}
          rows={HEADERS.map((h) => [
            <code key="n" className="whitespace-nowrap font-mono text-xs font-semibold">{h.name}</code>,
            <span key="m" className="text-muted-foreground">{h.meaning}</span>,
            <span key="w" className="whitespace-nowrap text-muted-foreground">{h.when}</span>,
          ])}
        />
        <Callout tone="info" title="Readable from a browser">
          CORS exposes these headers (and <C>X-Request-Id</C>), so front-end code can read them too.
        </Callout>
      </DocsSection>

      {/* The 429 itself. */}
      <DocsSection id="exceeded" title="When you exceed the limit">
        <P>
          The request is refused with a 429 and <C>Retry-After</C> says how many seconds remain in the window. Wait
          that long; retrying sooner only spends the next window&apos;s budget.
        </P>
        <CodeBlock title="cURL · show headers" code={curl("invoices").replace("curl ", "curl -i ")} />
        <CodeBlock title="Response 429" code={TOO_MANY} copyable={false} />
        <CodeBlock title="JavaScript · retry on 429" code={BACKOFF} />
      </DocsSection>

      {/* Pager. */}
      <DocsPager {...pager} />
    </DocsArticle>
  );
}
