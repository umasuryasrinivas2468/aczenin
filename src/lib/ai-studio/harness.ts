/*
  Adapter for the upstream AI harness (RAG + guardrails around Vertex AI).

  The harness contract is configured by environment variables rather than
  hard-coded, so wiring the real service is a config change:

    AI_HARNESS_URL            Base URL, e.g. https://harness.internal.example/v1
                              ("stub" in development returns canned replies)
    AI_HARNESS_API_KEY        The ONE master key. Server-side only; users never see it.
    AI_HARNESS_AUTH_HEADER    Header carrying the key (default "authorization")
    AI_HARNESS_AUTH_SCHEME    Prefix for that header (default "Bearer"; "" for none)
    AI_HARNESS_ALLOWED_PATHS  Comma-separated sub-paths users may call
                              (default "chat/completions")
    AI_HARNESS_MAX_TOKENS_FIELD  Body field that caps output (default "max_tokens")
    AI_HARNESS_MODEL          If set, forced into body.model so callers cannot
                              pick a different (pricier) model
    AI_HARNESS_TIMEOUT_MS     Upstream timeout (default 55000)

  SSRF: the path a caller requests must be on the allowlist, and the final URL
  is checked to still be under the configured base after resolution, so no
  input can make this server fetch anything else. Redirects are not followed.
*/

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/harness.ts is server-only and must never reach the browser.");
}

export interface HarnessConfig {
  stub: boolean;
  baseUrl: URL | null;
  apiKey: string;
  authHeader: string;
  authScheme: string;
  allowedPaths: Set<string>;
  maxTokensField: string;
  model: string | null;
  timeoutMs: number;
}

export function harnessConfig(): HarnessConfig | null {
  const rawUrl = process.env.AI_HARNESS_URL?.trim();
  if (!rawUrl) return null;

  const allowedPaths = new Set(
    (process.env.AI_HARNESS_ALLOWED_PATHS || "chat/completions")
      .split(",")
      .map((path) => path.trim().replace(/^\/+|\/+$/g, ""))
      .filter((path) => /^[a-z0-9][a-z0-9/_-]*$/i.test(path) && !path.includes("..")),
  );

  const common = {
    authHeader: (process.env.AI_HARNESS_AUTH_HEADER || "authorization").toLowerCase(),
    // "none" means send the bare key (the harness wants `x-api-key: <key>`) —
    // Vercel refuses empty values, so an empty string alone can't express it.
    authScheme: process.env.AI_HARNESS_AUTH_SCHEME?.trim().toLowerCase() === "none" ? "" : (process.env.AI_HARNESS_AUTH_SCHEME ?? "Bearer"),
    allowedPaths,
    maxTokensField: process.env.AI_HARNESS_MAX_TOKENS_FIELD || "max_tokens",
    model: process.env.AI_HARNESS_MODEL?.trim() || null,
    timeoutMs: Math.min(Math.max(Number(process.env.AI_HARNESS_TIMEOUT_MS) || 55_000, 5_000), 58_000),
  };

  // The stub never runs in production, whatever the env says.
  if (rawUrl === "stub") {
    if (process.env.NODE_ENV === "production") return null;
    return { stub: true, baseUrl: null, apiKey: "", ...common };
  }

  const apiKey = process.env.AI_HARNESS_API_KEY;
  if (!apiKey) return null;
  let baseUrl: URL;
  try {
    baseUrl = new URL(rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`);
  } catch {
    return null;
  }
  if (baseUrl.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
  return { stub: false, baseUrl, apiKey, ...common };
}

/* Resolves a caller-supplied sub-path to an upstream URL, or null if not allowed. */
export function resolveUpstream(config: HarnessConfig, subPath: string): URL | null {
  if (!config.allowedPaths.has(subPath) || !config.baseUrl) return null;
  const target = new URL(subPath, config.baseUrl);
  if (target.origin !== config.baseUrl.origin || !target.pathname.startsWith(config.baseUrl.pathname)) {
    return null;
  }
  return target;
}

export interface Usage {
  input: number;
  output: number;
}

/* Reads token usage from OpenAI-style or Gemini-style response objects. */
export function extractUsage(value: unknown): Usage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : null);

  const usage = record.usage as Record<string, unknown> | undefined;
  if (usage && typeof usage === "object") {
    const input = num(usage.prompt_tokens) ?? num(usage.input_tokens);
    const output = num(usage.completion_tokens) ?? num(usage.output_tokens);
    if (input !== null || output !== null) return { input: input ?? 0, output: output ?? 0 };
  }

  const meta = record.usageMetadata as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object") {
    const input = num(meta.promptTokenCount);
    const output = num(meta.candidatesTokenCount);
    if (input !== null || output !== null) return { input: input ?? 0, output: output ?? 0 };
  }
  return null;
}

/* Visible text in a streamed delta, for estimating output when usage is absent. */
export function extractDeltaText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  let text = "";
  const choices = record.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      const delta = (choice as Record<string, unknown>)?.delta as Record<string, unknown> | undefined;
      const message = (choice as Record<string, unknown>)?.message as Record<string, unknown> | undefined;
      const content = delta?.content ?? message?.content;
      if (typeof content === "string") text += content;
    }
  }
  const candidates = record.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = ((candidate as Record<string, unknown>)?.content as Record<string, unknown>)?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          const partText = (part as Record<string, unknown>)?.text;
          if (typeof partText === "string") text += partText;
        }
      }
    }
  }
  return text;
}

// ~4 characters per token for English text. Only used when the harness does
// not report usage; the admin panel labels such rows as estimated.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/*
  Applies the output ceiling and model pin to a request body, in place.
  Returns true when a caller-supplied limit had to be lowered.
*/
export function applyRequestPolicy(
  body: Record<string, unknown>,
  config: HarnessConfig,
  maxOutputTokens: number,
): boolean {
  let clamped = false;
  let found = false;

  for (const field of ["max_tokens", "max_completion_tokens", "max_output_tokens"]) {
    if (field in body) {
      found = true;
      const value = body[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > maxOutputTokens) {
        body[field] = maxOutputTokens;
        clamped = clamped || typeof value === "number";
      }
    }
  }

  const generationConfig = body.generationConfig as Record<string, unknown> | undefined;
  if (generationConfig && typeof generationConfig === "object" && "maxOutputTokens" in generationConfig) {
    found = true;
    const value = generationConfig.maxOutputTokens;
    if (typeof value !== "number" || value <= 0 || value > maxOutputTokens) {
      generationConfig.maxOutputTokens = maxOutputTokens;
      clamped = clamped || typeof value === "number";
    }
  }

  // No limit supplied at all: set one, so an unbounded completion can never
  // be billed against the budget.
  if (!found) body[config.maxTokensField] = maxOutputTokens;

  if (config.model) body.model = config.model;
  return clamped;
}

/* Canned OpenAI-shaped replies for local development without the harness. */
export function stubResponse(body: Record<string, unknown>): Response {
  const reply = "This is a stubbed reply from Aczen AI Studio (AI_HARNESS_URL=stub).";
  const usage = { prompt_tokens: estimateTokens(JSON.stringify(body)), completion_tokens: estimateTokens(reply) };
  if (body.stream === true) {
    const encoder = new TextEncoder();
    const chunks = reply.split(" ").map((word, index) => `data: ${JSON.stringify({
      choices: [{ index: 0, delta: { content: (index ? " " : "") + word } }],
    })}\n\n`);
    chunks.push(`data: ${JSON.stringify({ choices: [], usage })}\n\n`, "data: [DONE]\n\n");
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
  }
  return Response.json({
    id: "stub",
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
    usage,
  });
}
