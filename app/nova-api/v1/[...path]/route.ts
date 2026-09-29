/*
  GET /nova-api/v1/* — the Nova sandbox API. Read-only, bearer-key auth.
  Design: docs/nova-api-architecture.md §6. Contract mirrors
  dashboard.aczen.in/docs/api so integrations port by swapping base URL + key.

  ONE CATCH-ALL, NOT ONE ROUTE PER RESOURCE: every resource shares the same
  list/get/filter logic, driven by the registry in src/lib/nova/resources.ts.

  ORDER OF WORK PER REQUEST (the security-relevant part):
    1. /health short-circuits (no auth, no DB).
    2. Authenticate + meter in one RPC. DB down → 502 (fail closed).
    3. Rate limit, using the count the RPC just returned.
    4. Route + validate the query against the allowlist → 400/404 before any read.
    5. One read from a nova_*_v view.

  READ-ONLY BY CONSTRUCTION: this file imports novaRead only — never novaWrite
  (a grep for "novaWrite" under app/nova-api/v1 must stay empty) — and every
  write verb answers 405.
*/

// NextResponse for parity with the rest of app/api.
import { NextResponse } from "next/server";
// Node's randomUUID for request ids (Edge has it too, but we are on nodejs).
import { randomUUID } from "node:crypto";

// Read surface only; NovaDbError is how upstream failures are recognised.
import { novaRead, NovaDbError } from "@/lib/nova/db";
// Bearer parsing + authenticate-and-meter.
import { authenticateApiKey, type AuthenticatedKey } from "@/lib/nova/apiKeys";
// Registry and the untrusted-query translator.
import {
  buildGetQuery,
  buildListQuery,
  findResource,
  findSubResource,
  isValidId,
  tagRow,
  type QueryError,
  type Resource,
} from "@/lib/nova/resources";

// node:crypto (key hashing in apiKeys.ts) is unavailable on Edge.
export const runtime = "nodejs";
// Every response is per-key and per-request; a cached one would leak across keys.
export const dynamic = "force-dynamic";

// The verbs this API answers; sent as Allow on 405 and in CORS preflight.
const ALLOWED_METHODS = "GET, HEAD, OPTIONS";

// Headers on EVERY response, success or error.
const BASE_HEADERS: Record<string, string> = {
  // Bearer auth, never cookies, so a wildcard origin gains a hostile page
  // nothing (design §5) and lets developers test from a browser.
  "Access-Control-Allow-Origin": "*",
  // Without this a browser cannot READ the rate-limit/request-id headers.
  "Access-Control-Expose-Headers": "X-Request-Id, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After",
  // Belt-and-braces with force-dynamic: no proxy or browser may cache a
  // response that belongs to one key.
  "Cache-Control": "no-store",
};

// HTTP status → the error envelope's `type`, per the reference API.
function errorType(status: number): string {
  // Missing/bad key.
  if (status === 401) return "authentication_error";
  // Over the per-minute limit.
  if (status === 429) return "rate_limit_error";
  // Our fault or the database's.
  if (status >= 500) return "api_error";
  // Everything else (400, 404, 405) is the caller's request.
  return "invalid_request";
}

// Success body with the shared headers.
function jsonOk(body: unknown, requestId: string, headers: Record<string, string>): NextResponse {
  // Request id on every response so support can trace one call in the logs.
  return NextResponse.json(body, { status: 200, headers: { ...BASE_HEADERS, ...headers, "X-Request-Id": requestId } });
}

// The reference error envelope: { error: { type, code, message, details? }, request_id }.
function jsonError(
  // HTTP status.
  status: number,
  // Machine-readable code.
  code: string,
  // Human-readable message; never contains database text.
  message: string,
  // Correlates the response with the server log line.
  requestId: string,
  // Rate-limit headers, Allow, Retry-After as applicable.
  headers: Record<string, string> = {},
  // Optional structured detail (validation issues).
  details?: QueryError["details"],
): NextResponse {
  // details omitted entirely when absent, rather than sent as null.
  const error = details === undefined ? { type: errorType(status), code, message } : { type: errorType(status), code, message, details };
  // Same header set as success responses.
  return NextResponse.json(
    { error, request_id: requestId },
    { status, headers: { ...BASE_HEADERS, ...headers, "X-Request-Id": requestId } },
  );
}

// 404 used for unknown paths, bad ids and missing rows alike, so an id's
// existence cannot be probed by comparing error shapes.
function notFound(requestId: string, headers: Record<string, string>): NextResponse {
  // One message for every not-found case.
  return jsonError(404, "resource_not_found", "No such resource.", requestId, headers);
}

// IETF RateLimit-* headers from the metering RPC's result.
function rateLimitHeaders(key: AuthenticatedKey): { headers: Record<string, string>; resetSeconds: number } {
  // Fixed windows: the window ends 60 s after it started.
  const windowEnd = Date.parse(key.windowStart) + 60_000;
  // Clamped to 1..60: DB/server clock skew must not yield a negative or
  // multi-minute reset, and "0" would invite an immediate retry storm.
  const resetSeconds = Math.min(60, Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000)));
  // Remaining never goes negative, even on the requests we reject.
  const remaining = Math.max(0, key.rateLimitPerMin - key.requestCount);
  // Header values must be strings.
  return {
    headers: {
      "RateLimit-Limit": String(key.rateLimitPerMin),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(Number.isFinite(resetSeconds) ? resetSeconds : 60),
    },
    // Also used as Retry-After on a 429; NaN (unparseable timestamp) → 60.
    resetSeconds: Number.isFinite(resetSeconds) ? resetSeconds : 60,
  };
}

// Paged list of a resource (optionally pinned to a parent row).
async function listRows(
  // Resource whose allowlist and view apply.
  resource: Resource,
  // The caller's query string.
  params: URLSearchParams,
  // Correlation id for errors.
  requestId: string,
  // Rate-limit headers to carry on the response.
  headers: Record<string, string>,
  // Parent pin for child routes.
  fixed?: { field: string; value: string },
): Promise<NextResponse> {
  // Validate + translate before touching the database.
  const built = buildListQuery(resource, params, fixed);
  // 400 with the translator's code and issues.
  if (built.ok === false) return jsonError(400, built.error.code, built.error.message, requestId, headers, built.error.details);
  // One read; count=exact gives the total for pagination.
  const { rows, total } = await novaRead<Record<string, unknown>>(resource.view, built.query);
  // The reference list envelope.
  return jsonOk(
    {
      data: rows.map((row) => tagRow(resource, row)),
      pagination: { limit: built.limit, offset: built.offset, total, has_more: built.offset + rows.length < total },
    },
    requestId,
    headers,
  );
}

// Core handler; HEAD reuses it and drops the body.
async function handle(request: Request, path: string[]): Promise<NextResponse> {
  // Generated first so even a failure before auth can be traced.
  const requestId = randomUUID();

  // --- 1. Health: no auth, no DB, so uptime checks need no key --------------
  if (path.length === 1 && path[0] === "health") return jsonOk({ status: "ok" }, requestId, {});

  // --- 2. Authenticate + meter ----------------------------------------------
  let key: AuthenticatedKey | null;
  try {
    // One RPC: key lookup, allowlist join and usage increment together.
    key = await authenticateApiKey(request.headers.get("authorization"));
  } catch (error) {
    // Fail closed: an unauthenticatable request is never served. The DB's
    // text goes to the log only.
    console.error(`[nova-api/v1] ${requestId} auth lookup failed:`, error);
    return jsonError(502, "upstream_error", "The API is temporarily unavailable.", requestId);
  }
  // Missing, malformed, unknown or revoked — one answer for all, so the
  // response does not reveal which.
  if (key === null) {
    // WWW-Authenticate is the RFC 6750 hint for bearer clients.
    return jsonError(401, "invalid_api_key", "Missing or invalid API key. Send 'Authorization: Bearer nova_sk_...'.", requestId, {
      "WWW-Authenticate": 'Bearer realm="nova-api"',
    });
  }

  // --- 3. Rate limit --------------------------------------------------------
  const { headers, resetSeconds } = rateLimitHeaders(key);
  // Strictly greater: the Nth request of an N/min limit is allowed.
  if (key.requestCount > key.rateLimitPerMin) {
    // Retry-After tells a well-behaved client exactly how long to back off.
    return jsonError(429, "rate_limit_exceeded", `Rate limit of ${key.rateLimitPerMin} requests per minute exceeded.`, requestId, {
      ...headers,
      "Retry-After": String(resetSeconds),
    });
  }

  // --- 4 + 5. Route, validate, read ------------------------------------------
  try {
    // /me: the caller's own key, no DB read beyond auth.
    if (path.length === 1 && path[0] === "me") {
      // Never includes the hash; the key itself was never stored.
      return jsonOk(
        {
          data: {
            object: "api_key",
            id: key.keyId,
            email: key.email,
            name: key.name,
            prefix: key.prefix,
            rate_limit_per_min: key.rateLimitPerMin,
            created_at: key.createdAt,
          },
        },
        requestId,
        headers,
      );
    }

    // First segment names the resource for every other route.
    const resource = path.length >= 1 ? findResource(path[0]) : null;
    // Unknown top-level segment (or bare /v1).
    if (resource === null) return notFound(requestId, headers);
    // Query params, already percent-decoded.
    const params = new URL(request.url).searchParams;

    // /{resource}
    if (path.length === 1) return await listRows(resource, params, requestId, headers);

    // /{resource}/{id}[/...]: malformed ids 404 without a DB call.
    const id = path[1];
    if (!isValidId(id)) return notFound(requestId, headers);

    // /{resource}/{id}
    if (path.length === 2) {
      // Primary-key lookup.
      const { rows } = await novaRead<Record<string, unknown>>(resource.view, buildGetQuery(id));
      // No row → 404, same shape as an unknown path.
      if (rows.length === 0) return notFound(requestId, headers);
      // Single-object envelope.
      return jsonOk({ data: tagRow(resource, rows[0]) }, requestId, headers);
    }

    // /{resource}/{id}/{child}
    if (path.length === 3) {
      // Only the registered child routes exist.
      const sub = findSubResource(path[0], path[2]);
      if (sub === null) return notFound(requestId, headers);
      // ponytail: a nonexistent parent returns an empty list, not 404 — a
      // 404 would cost a second read; add a parent lookup if clients need it.
      return await listRows(sub.resource, params, requestId, headers, { field: sub.parentField, value: id });
    }

    // Anything deeper.
    return notFound(requestId, headers);
  } catch (error) {
    // Upstream failure: log the real reason, tell the client nothing about the DB.
    if (error instanceof NovaDbError) {
      // Status kept in the log for diagnosis.
      console.error(`[nova-api/v1] ${requestId} read failed (${error.status}):`, error.message);
      return jsonError(502, "upstream_error", "The API is temporarily unavailable.", requestId, headers);
    }
    // A bug of ours: still no internals to the client, still logged.
    console.error(`[nova-api/v1] ${requestId} unexpected error:`, error);
    return jsonError(502, "upstream_error", "The API is temporarily unavailable.", requestId, headers);
  }
}

// Next 15: dynamic route params are a Promise.
type RouteContext = { params: Promise<{ path: string[] }> };

// GET: the whole API.
export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
  // Catch-all always has ≥1 segment, but default defensively.
  const { path } = await params;
  // Delegate to the shared handler.
  return handle(request, path ?? []);
}

// HEAD: same status and headers as GET, no body (RFC 9110 §9.3.2).
export async function HEAD(request: Request, context: RouteContext): Promise<NextResponse> {
  // Run the full GET so auth, metering and 404s behave identically.
  const response = await GET(request, context);
  // Rebuild without the body, keeping status and every header.
  return new NextResponse(null, { status: response.status, headers: response.headers });
}

// CORS preflight: browsers send it before an Authorization-bearing GET.
export async function OPTIONS(): Promise<NextResponse> {
  // 204: preflight has no body. No auth — preflights never carry credentials.
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...BASE_HEADERS,
      // What the actual request may use.
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      // Cache the preflight for a day so each browser GET is one request, not two.
      "Access-Control-Max-Age": "86400",
      // Plain OPTIONS callers get the verb list too.
      Allow: ALLOWED_METHODS,
    },
  });
}

// Every write verb: 405 before any auth or DB work (design §4.2 layer 1).
function methodNotAllowed(): NextResponse {
  // Fresh id: 405s are traceable like every other response.
  return jsonError(405, "method_not_allowed", "The Nova API is read-only. Allowed methods: GET, HEAD, OPTIONS.", randomUUID(), {
    Allow: ALLOWED_METHODS,
  });
}

// Exported explicitly: without them Next answers its own bare 405, which
// lacks our envelope and CORS headers.
export async function POST(): Promise<NextResponse> {
  // Read-only API.
  return methodNotAllowed();
}
// Read-only API.
export async function PUT(): Promise<NextResponse> {
  // Same 405.
  return methodNotAllowed();
}
// Read-only API.
export async function PATCH(): Promise<NextResponse> {
  // Same 405.
  return methodNotAllowed();
}
// Read-only API.
export async function DELETE(): Promise<NextResponse> {
  // Same 405.
  return methodNotAllowed();
}
