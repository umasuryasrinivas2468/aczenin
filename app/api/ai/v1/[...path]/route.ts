/*
  POST /api/ai/v1/<endpoint> — the public Aczen AI API.

  Everything happens in src/lib/ai-studio/gateway.ts; this file only pins the
  runtime and answers the methods the API does not support.

  No CORS headers are sent, on purpose. Browsers therefore refuse to call this
  from a web page, which is the point: an API key used from front-end code is
  a leaked key. Keys belong on servers.
*/

import { handleGatewayRequest } from "@/lib/ai-studio/gateway";

// node:crypto (key HMAC) and long-lived streaming responses.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Upper bound on one request, including a streamed completion.
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  return handleGatewayRequest(request, path ?? []);
}

function methodNotAllowed(): Response {
  return new Response(
    JSON.stringify({
      error: { type: "invalid_request_error", code: "method_not_allowed", message: "Use POST." },
    }),
    { status: 405, headers: { "content-type": "application/json", allow: "POST", "cache-control": "no-store" } },
  );
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
