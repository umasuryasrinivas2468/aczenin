import type { Metadata } from "next";
import { redirect } from "next/navigation";

import CodeTabs from "@/components/ai-studio/CodeTabs";
import { Reveal } from "@/components/ai-studio/StudioMotion";
import { PageHeader, Panel } from "@/components/ai-studio/ui";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Quickstart" };

// www, not the bare domain: aczen.in 308-redirects to www and HTTP clients
// drop the Authorization header on a host change, so every call would 401.
const BASE = "https://www.aczen.in/api/ai/v1";

// The upstream harness serves one route, POST /v1/ask {question, mode}; the
// gateway only forwards AI_HARNESS_ALLOWED_PATHS (set to "ask"), so these
// samples must match it rather than the OpenAI chat-completions shape.
const SAMPLES = [
  {
    label: "cURL",
    code: `curl ${BASE}/ask \\
  -H "Authorization: Bearer $ACZEN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "question": "Summarise GST e-invoicing rules in 3 bullets.", "mode": "short" }'`,
  },
  {
    label: "JavaScript",
    code: `// Server-side only (Node 18+). Never ship your key to a browser.
const response = await fetch("${BASE}/ask", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.ACZEN_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    question: "Summarise GST e-invoicing rules in 3 bullets.",
    mode: "short", // or "detailed"
  }),
});

if (!response.ok) {
  const { error } = await response.json();
  // e.g. 429 rate_limit_exceeded -> wait Retry-After seconds
  throw new Error(\`\${response.status} \${error.code}: \${error.message}\`);
}
const data = await response.json();
console.log(data.answer); // data.status is "answered" when the model replied`,
  },
  {
    label: "Python",
    code: `import os, requests

resp = requests.post(
    "${BASE}/ask",
    headers={"Authorization": f"Bearer {os.environ['ACZEN_API_KEY']}"},
    json={"question": "Summarise GST e-invoicing rules in 3 bullets.", "mode": "short"},
    timeout=60,
)
if resp.status_code == 429:
    retry_after = int(resp.headers.get("Retry-After", "1"))
    # back off and retry after retry_after seconds
resp.raise_for_status()
print(resp.json()["answer"])`,
  },
];

const ERRORS: Array<[string, string, string]> = [
  ["401", "invalid_api_key / revoked_api_key", "Key missing, mistyped, revoked or past its rotation grace window."],
  ["403", "account_suspended", "Your access is paused. Contact the Aczen team."],
  ["413", "input_too_large / payload_too_large", "Request is over the per-request input limit or 1 MB."],
  ["429", "rate_limit_exceeded", "Over your per-minute limit. Wait for Retry-After seconds."],
  ["429", "concurrency_limit_exceeded", "Too many requests in flight at once."],
  ["429", "daily_* / monthly_*_quota_exceeded", "Quota used up. Daily quotas reset at midnight IST."],
  ["502", "upstream_error", "The model service failed. Safe to retry with backoff."],
  ["503", "service_paused / upstream_unavailable / budget_exhausted", "Temporarily unavailable. Retry after Retry-After."],
  ["504", "upstream_timeout", "The model took longer than 55 s."],
];

const HEADERS: Array<[string, string]> = [
  ["x-ratelimit-limit-requests", "Requests allowed per minute"],
  ["x-ratelimit-remaining-requests", "Requests left in the current minute bucket"],
  ["x-ratelimit-remaining-requests-day", "Requests left today"],
  ["x-ratelimit-remaining-tokens-day", "Tokens left today"],
  ["x-ratelimit-remaining-tokens-month", "Tokens left this month"],
  ["retry-after", "Seconds to wait before retrying (on 429 / 503)"],
  ["x-request-id", "Quote this when reporting a problem"],
];

export default async function QuickstartPage() {
  const session = await getUserSession();
  if (!session || session.stage !== "full") redirect("/ai-studio/login");

  return (
    <>
      <Reveal>
        <PageHeader
          eyebrow="Docs"
          title="Quickstart"
          description="Send a question, get a grounded answer. Retrieval, the system prompt, prompt-injection defence and input/output guardrails run on our side of every call."
        />
      </Reveal>

      <Reveal delay={0.04} className="grid gap-4 md:grid-cols-3">
        {[
          ["1", "Create a key", "On the API keys page. Copy it once, into your server's secret store."],
          ["2", "Set ACZEN_API_KEY", "Read it from the environment. Never hard-code or commit it."],
          ["3", "Call the API", `POST ${BASE}/ask with a Bearer token.`],
        ].map(([step, title, body]) => (
          <div key={step} className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-smeorange-50 text-sm font-semibold text-smeorange-700 ring-1 ring-inset ring-smeorange-200">
              {step}
            </span>
            <p className="mt-3 font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{body}</p>
          </div>
        ))}
      </Reveal>

      <Reveal delay={0.07} className="mt-6">
        <CodeTabs samples={SAMPLES} />
      </Reveal>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Reveal delay={0.09}>
          <Panel title="Error codes" description="Errors are JSON: { error: { type, code, message, request_id } }" bodyClassName="p-0">
            <ul className="divide-y divide-slate-100">
              {ERRORS.map(([status, code, meaning]) => (
                <li key={code} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 px-5 py-3">
                  <span className="font-mono text-sm font-semibold text-slate-900">{status}</span>
                  <span className="min-w-0">
                    <code className="break-words font-mono text-[0.78rem] text-smebank-700">{code}</code>
                    <span className="mt-0.5 block text-sm text-slate-500">{meaning}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
        <Reveal delay={0.11}>
          <Panel title="Response headers" bodyClassName="p-0">
            <ul className="divide-y divide-slate-100">
              {HEADERS.map(([name, meaning]) => (
                <li key={name} className="px-5 py-3">
                  <code className="font-mono text-[0.78rem] text-slate-900">{name}</code>
                  <span className="mt-0.5 block text-sm text-slate-500">{meaning}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">Keys are server-side only</p>
            <p className="mt-1">
              The API sends no CORS headers, so browsers will refuse to call it directly. That is deliberate: a key in
              front-end code is a leaked key. Call Aczen AI from your backend and proxy to your UI.
            </p>
          </div>
        </Reveal>
      </div>
    </>
  );
}
