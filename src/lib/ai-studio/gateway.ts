/*
  The Aczen AI gateway: every call from a team lead's application to
  /api/ai/v1/* passes through here on its way to the harness.

    1. cheap local checks  — env kill switch, endpoint allowlist, key format
                             and checksum, per-instance invalid-key limiter
    2. admission (1 RPC)   — key, account, kill switch, breaker, size, budget,
                             quotas, concurrency, RPM (ai_gateway_admit)
    3. forward             — output cap + model pin applied, master key attached
    4. meter (1 RPC)       — tokens, cost, status, latency, breaker
                             (ai_gateway_finalize), after the response is sent

  Fails CLOSED: if the database cannot be reached, nothing is forwarded. An
  unmetered request is an unbudgeted request.

  Never logged: the caller's key, the request body, the response body.
*/

import { after } from "next/server";

import { API_KEY_PREFIX, hashApiKey, hashIp, isWellFormedApiKey, randomId } from "@/lib/ai-studio/crypto";
import { aiRpc } from "@/lib/ai-studio/db";
import {
  applyRequestPolicy,
  estimateTokens,
  extractDeltaText,
  extractUsage,
  harnessConfig,
  resolveUpstream,
  stubResponse,
  type HarnessConfig,
  type Usage,
} from "@/lib/ai-studio/harness";
import { clientIp } from "@/lib/axe/identity";
import { evaluateRules } from "@/lib/ai-studio/rules";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/gateway.ts is server-only and must never reach the browser.");
}

const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_BUFFERED_RESPONSE_BYTES = 10 * 1024 * 1024;

const MESSAGES: Record<string, string> = {
  invalid_api_key: "The API key is missing or invalid. Create one at https://aczen.in/ai-studio/keys.",
  revoked_api_key: "This API key was revoked or has expired. Create or rotate a key at https://aczen.in/ai-studio/keys.",
  account_suspended: "This account is suspended. Contact the Aczen team to restore access.",
  service_paused: "Aczen AI is temporarily paused. Please retry later.",
  service_unavailable: "Aczen AI is temporarily unavailable. Please retry shortly.",
  upstream_unavailable: "The model service is temporarily unavailable. Please retry shortly.",
  input_too_large: "The request is larger than the per-request input limit.",
  payload_too_large: "The request body exceeds 1 MB.",
  budget_exhausted: "Aczen AI has reached its current capacity. Please retry later.",
  daily_budget_exhausted: "Aczen AI has reached today's capacity. Please retry tomorrow.",
  daily_request_quota_exceeded: "Your daily request quota is used up. It resets at midnight IST.",
  daily_token_quota_exceeded: "Your daily token quota is used up. It resets at midnight IST.",
  monthly_token_quota_exceeded: "Your monthly token quota is used up.",
  concurrency_limit_exceeded: "Too many requests are in flight for this account. Wait for one to finish.",
  rate_limit_exceeded: "Rate limit exceeded. Slow down and retry after the indicated time.",
  platform_busy: "Aczen AI is busy right now. Please retry shortly.",
  too_many_invalid_keys: "Too many requests with invalid keys from this address.",
  unknown_endpoint: "Unknown endpoint.",
  invalid_json: "The request body must be a JSON object.",
  upstream_error: "The model service returned an error. Please retry.",
  upstream_timeout: "The model service timed out.",
  upstream_rate_limited: "The model service is at capacity. Please retry shortly.",
};

const TYPES: Record<number, string> = {
  400: "invalid_request_error",
  401: "authentication_error",
  403: "permission_error",
  404: "not_found_error",
  413: "request_too_large",
  429: "rate_limit_error",
  502: "api_error",
  503: "overloaded_error",
  504: "timeout_error",
};

function baseHeaders(requestId: string): Record<string, string> {
  return {
    "x-request-id": requestId,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
}

function errorResponse(
  status: number,
  code: string,
  requestId: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: {
        type: TYPES[status] ?? "api_error",
        code,
        message: MESSAGES[code] ?? "Request failed.",
        request_id: requestId,
      },
    }),
    { status, headers: { "content-type": "application/json", ...baseHeaders(requestId), ...extra } },
  );
}

/*
  Per-instance limiter for invalid keys. Not a security boundary on its own —
  instances do not share it — but it keeps a scanner cycling random keys from
  costing a database round trip each, which is most of that traffic's harm.
*/
const invalidByIp = new Map<string, { count: number; windowStart: number }>();
const INVALID_MAX = 30;
const INVALID_WINDOW_MS = 60_000;

function invalidKeyBlocked(ipHash: string): boolean {
  const entry = invalidByIp.get(ipHash);
  return !!entry && Date.now() - entry.windowStart < INVALID_WINDOW_MS && entry.count >= INVALID_MAX;
}

function noteInvalidKey(ipHash: string): void {
  const now = Date.now();
  const entry = invalidByIp.get(ipHash);
  if (!entry || now - entry.windowStart >= INVALID_WINDOW_MS) {
    if (invalidByIp.size > 5000) invalidByIp.clear();
    invalidByIp.set(ipHash, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function extractKey(request: Request): string {
  const auth = request.headers.get("authorization");
  if (auth && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  return (request.headers.get("x-api-key") ?? "").trim();
}

interface Admission {
  ok: boolean;
  status?: number;
  code?: string;
  retry_after?: number;
  user_id?: string;
  key_id?: string;
  lease_id?: string;
  max_output_tokens?: number;
  throttled?: boolean;
  limits?: {
    rpm: number; rpm_remaining: number;
    rpd: number; rpd_remaining: number;
    tpd: number; tpd_remaining: number;
    tpm: number; tpm_remaining: number;
  };
}

interface Outcome {
  status: number;
  outcome: string;
  usage: Usage;
  upstreamFailure: boolean;
  streamed: boolean;
}

function rateHeaders(admission: Admission): Record<string, string> {
  const l = admission.limits;
  if (!l) return {};
  const headers: Record<string, string> = {
    "x-ratelimit-limit-requests": String(l.rpm),
    "x-ratelimit-remaining-requests": String(l.rpm_remaining),
    "x-ratelimit-limit-requests-day": String(l.rpd),
    "x-ratelimit-remaining-requests-day": String(l.rpd_remaining),
    "x-ratelimit-limit-tokens-day": String(l.tpd),
    "x-ratelimit-remaining-tokens-day": String(l.tpd_remaining),
    "x-ratelimit-remaining-tokens-month": String(l.tpm_remaining),
  };
  if (admission.throttled) headers["x-aczen-throttled"] = "true";
  return headers;
}

function safeContentType(value: string | null, fallback: string): string {
  if (value && /^[\w.+-]+\/[\w.+-]+(\s*;\s*charset=[\w-]+)?$/i.test(value.trim())) return value.trim();
  return fallback;
}

async function readCapped(response: Response, maxBytes: number): Promise<string | null> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function handleGatewayRequest(request: Request, segments: string[]): Promise<Response> {
  const requestId = `req_${randomId(12)}`;
  const subPath = segments.join("/");

  // The env switch works even if the database is down or the settings row is
  // wrong — the break-glass lever of last resort.
  if (process.env.AI_STUDIO_KILL_SWITCH === "1") {
    return errorResponse(503, "service_paused", requestId, { "retry-after": "300" });
  }

  const config = harnessConfig();
  if (!config) {
    console.error("[ai-gateway] harness is not configured (AI_HARNESS_URL / AI_HARNESS_API_KEY).");
    return errorResponse(503, "service_unavailable", requestId, { "retry-after": "60" });
  }

  if (!config.allowedPaths.has(subPath)) {
    return errorResponse(404, "unknown_endpoint", requestId);
  }

  const ipHash = hashIp(clientIp(request.headers));
  if (invalidKeyBlocked(ipHash)) {
    return errorResponse(429, "too_many_invalid_keys", requestId, { "retry-after": "60" });
  }

  const key = extractKey(request);
  if (!key.startsWith(API_KEY_PREFIX) || !isWellFormedApiKey(key)) {
    noteInvalidKey(ipHash);
    return errorResponse(401, "invalid_api_key", requestId, { "www-authenticate": "Bearer" });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REQUEST_BYTES) return errorResponse(413, "payload_too_large", requestId);
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return errorResponse(400, "invalid_json", requestId);
  }
  if (bodyText.length > MAX_REQUEST_BYTES) return errorResponse(413, "payload_too_large", requestId);
  const body = parseJson(bodyText);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(400, "invalid_json", requestId);
  }

  let admission: Admission;
  try {
    admission = await aiRpc<Admission>("ai_gateway_admit", {
      p_key_hash: hashApiKey(key),
      p_endpoint: subPath,
      p_request_id: requestId,
      p_input_tokens: estimateTokens(bodyText),
    });
  } catch (error) {
    console.error("[ai-gateway] admission failed:", (error as Error).message);
    return errorResponse(503, "service_unavailable", requestId, { "retry-after": "30" });
  }

  if (!admission.ok) {
    if (admission.code === "invalid_api_key") noteInvalidKey(ipHash);
    const extra: Record<string, string> = {};
    if (admission.retry_after) extra["retry-after"] = String(admission.retry_after);
    if (admission.status === 401) extra["www-authenticate"] = "Bearer";
    return errorResponse(admission.status ?? 503, admission.code ?? "service_unavailable", requestId, extra);
  }

  return forward(request, config, subPath, body as Record<string, unknown>, bodyText, admission, requestId);
}

async function forward(
  request: Request,
  config: HarnessConfig,
  subPath: string,
  body: Record<string, unknown>,
  bodyText: string,
  admission: Admission,
  requestId: string,
): Promise<Response> {
  const started = Date.now();
  const inputEstimate = estimateTokens(bodyText);
  const clamped = applyRequestPolicy(body, config, admission.max_output_tokens ?? 4000);
  const headers: Record<string, string> = { ...baseHeaders(requestId), ...rateHeaders(admission) };
  if (clamped) headers["x-aczen-max-tokens-clamped"] = "true";

  let finalized = false;
  const finalize = async (result: Outcome) => {
    if (finalized) return;
    finalized = true;
    try {
      const metered = await aiRpc<{ evaluate_rules: boolean }>("ai_gateway_finalize", {
        p_lease_id: admission.lease_id,
        p_user_id: admission.user_id,
        p_key_id: admission.key_id,
        p_endpoint: subPath,
        p_status: result.status,
        p_outcome: result.outcome,
        p_latency_ms: Date.now() - started,
        p_input_tokens: result.usage.input,
        p_output_tokens: result.usage.output,
        p_streamed: result.streamed,
        p_request_id: requestId,
        p_upstream_failure: result.upstreamFailure,
      });
      if (metered?.evaluate_rules) await evaluateRules();
    } catch (error) {
      // The lease expires by itself; the usage row is what is lost.
      console.error("[ai-gateway] finalize failed:", (error as Error).message);
    }
  };
  const finalizeAfter = (result: Outcome) => after(() => finalize(result));

  // Client disconnects abort the upstream call too, so an abandoned request
  // stops consuming model tokens.
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(config.timeoutMs)]);

  let upstream: Response;
  try {
    if (config.stub) {
      upstream = stubResponse(body);
    } else {
      const target = resolveUpstream(config, subPath);
      if (!target) {
        finalizeAfter({ status: 404, outcome: "unknown_endpoint", usage: { input: 0, output: 0 }, upstreamFailure: false, streamed: false });
        return errorResponse(404, "unknown_endpoint", requestId, headers);
      }
      const upstreamHeaders: Record<string, string> = {
        "content-type": "application/json",
        accept: request.headers.get("accept") ?? "application/json",
        "x-request-id": requestId,
        // Pseudonymous, stable per team lead: lets the harness apply its own
        // per-caller guardrails and correlate logs without learning an email.
        "x-aczen-user": admission.user_id ?? "",
      };
      upstreamHeaders[config.authHeader] = config.authScheme ? `${config.authScheme} ${config.apiKey}` : config.apiKey;
      upstream = await fetch(target, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify(body),
        signal,
        redirect: "manual",
        cache: "no-store",
      });
    }
  } catch (error) {
    const name = (error as Error)?.name;
    if (request.signal.aborted) {
      finalizeAfter({ status: 499, outcome: "client_closed", usage: { input: inputEstimate, output: 0 }, upstreamFailure: false, streamed: false });
      return errorResponse(502, "upstream_error", requestId, headers);
    }
    const timedOut = name === "TimeoutError" || name === "AbortError";
    finalizeAfter({
      status: timedOut ? 504 : 502,
      outcome: timedOut ? "upstream_timeout" : "upstream_unreachable",
      usage: { input: inputEstimate, output: 0 },
      upstreamFailure: true,
      streamed: false,
    });
    return errorResponse(timedOut ? 504 : 502, timedOut ? "upstream_timeout" : "upstream_error", requestId, headers);
  }

  // Upstream faults are masked: their bodies may carry internal detail about
  // the harness, Vertex or GCP that is not the caller's business.
  if (upstream.status >= 500 || (upstream.status >= 300 && upstream.status < 400)) {
    await upstream.body?.cancel().catch(() => undefined);
    finalizeAfter({ status: 502, outcome: `upstream_${upstream.status}`, usage: { input: inputEstimate, output: 0 }, upstreamFailure: true, streamed: false });
    return errorResponse(502, "upstream_error", requestId, headers);
  }

  if (upstream.status === 429) {
    await upstream.body?.cancel().catch(() => undefined);
    finalizeAfter({ status: 429, outcome: "upstream_rate_limited", usage: { input: 0, output: 0 }, upstreamFailure: false, streamed: false });
    return errorResponse(429, "upstream_rate_limited", requestId, { ...headers, "retry-after": "5" });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (upstream.ok && contentType.includes("text/event-stream") && upstream.body) {
    return streamThrough(upstream, request.signal, headers, inputEstimate, finalize);
  }

  // Buffered path: 2xx JSON and 4xx pass-through (e.g. a guardrail refusal,
  // which the caller does need to see).
  let text: string | null;
  try {
    text = await readCapped(upstream, MAX_BUFFERED_RESPONSE_BYTES);
  } catch {
    finalizeAfter({ status: 502, outcome: "upstream_read_error", usage: { input: inputEstimate, output: 0 }, upstreamFailure: true, streamed: false });
    return errorResponse(502, "upstream_error", requestId, headers);
  }
  if (text === null) {
    finalizeAfter({ status: 502, outcome: "upstream_too_large", usage: { input: inputEstimate, output: 0 }, upstreamFailure: true, streamed: false });
    return errorResponse(502, "upstream_error", requestId, headers);
  }

  const parsed = parseJson(text);
  const usage = extractUsage(parsed) ?? {
    input: upstream.ok ? inputEstimate : 0,
    output: upstream.ok ? estimateTokens(extractDeltaText(parsed)) : 0,
  };
  finalizeAfter({
    status: upstream.status,
    outcome: upstream.ok ? "ok" : `upstream_${upstream.status}`,
    usage,
    upstreamFailure: false,
    streamed: false,
  });

  return new Response(text, {
    status: upstream.status,
    headers: { ...headers, "content-type": safeContentType(contentType, "application/json") },
  });
}

/*
  Streams SSE through while watching for a usage block. Built as a pull-based
  ReadableStream over the upstream reader rather than a TransformStream, so
  all three endings — clean finish, upstream error, client cancel — run our
  code and meter the request exactly once.
*/
function streamThrough(
  upstream: Response,
  clientSignal: AbortSignal,
  headers: Record<string, string>,
  inputEstimate: number,
  finalize: (result: Outcome) => Promise<void>,
): Response {
  const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: Usage | null = null;
  let outputChars = 0;

  let resolveDone: (result: Outcome) => void = () => undefined;
  const done = new Promise<Outcome>((resolve) => {
    resolveDone = resolve;
  });
  const finish = (status: number, outcome: string, upstreamFailure: boolean) =>
    resolveDone({
      status,
      outcome,
      upstreamFailure,
      streamed: true,
      usage: usage ?? { input: inputEstimate, output: Math.ceil(outputChars / 4) },
    });

  const scan = (text: string) => {
    buffer += text;
    // Bounded: a hostile or broken upstream that never sends a newline cannot
    // grow this without limit.
    if (buffer.length > 256 * 1024) buffer = buffer.slice(-64 * 1024);
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const event = parseJson(data);
      usage = extractUsage(event) ?? usage;
      outputChars += extractDeltaText(event).length;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done: finished, value } = await reader.read();
        if (finished) {
          finish(200, "ok", false);
          controller.close();
          return;
        }
        scan(decoder.decode(value, { stream: true }));
        controller.enqueue(value);
      } catch (error) {
        // A client disconnect aborts the upstream read too; that is not an
        // upstream fault and must not count towards the circuit breaker.
        if (clientSignal.aborted) finish(499, "client_closed", false);
        else finish(502, "upstream_stream_error", true);
        controller.error(error);
      }
    },
    async cancel() {
      finish(499, "client_closed", false);
      await reader.cancel().catch(() => undefined);
    },
  });

  after(async () => finalize(await done));

  return new Response(stream, {
    status: 200,
    headers: {
      ...headers,
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}
