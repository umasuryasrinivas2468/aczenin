/*
  Request helpers shared by every AI Studio route handler: CSRF origin checks,
  bounded body parsing and uniform JSON responses.
*/

import { NextResponse } from "next/server";

import { clientIp } from "@/lib/axe/identity";
import { hashIp } from "@/lib/ai-studio/crypto";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/http.ts is server-only and must never reach the browser.");
}

export { clientIp };

export function ipHashOf(request: Request): string {
  return hashIp(clientIp(request.headers));
}

/*
  CSRF defence for cookie-authenticated mutations.

  The session cookies are SameSite=Lax/Strict, which already stops cross-site
  POSTs in every current browser. This is the second layer: the Origin header
  must be present and name this host. Browsers always send Origin on a
  cross-origin or non-GET fetch and a page cannot forge it, so a request
  without a matching Origin did not come from our own UI.

  Also requires a JSON content type. A cross-site HTML form can only send
  form-encoded or text/plain bodies; application/json forces a CORS preflight
  that this site never answers, so a form-based CSRF cannot reach the handler
  even if a browser somehow omitted Origin.
*/
export function isSameOriginJson(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  let originProtocol: string;
  try {
    const url = new URL(origin);
    originHost = url.host;
    originProtocol = url.protocol;
  } catch {
    return false;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host || originHost !== host) return false;

  if (process.env.NODE_ENV === "production" && originProtocol !== "https:") return false;
  return true;
}

/*
  Reads and parses a JSON body with a hard byte ceiling. Parse errors are
  discarded without logging: V8 quotes the start of the offending input in a
  SyntaxError, and these bodies contain passwords.
*/
export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<T | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export function jsonOk(body: Record<string, unknown> = {}, init: { status?: number } = {}): NextResponse {
  return NextResponse.json({ ok: true, ...body }, { status: init.status ?? 200, headers: NO_STORE });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { ...NO_STORE, ...extraHeaders } },
  );
}

export const FORBIDDEN_ORIGIN = () => jsonError(403, "forbidden_origin", "Request rejected.");
export const BAD_REQUEST = () => jsonError(400, "bad_request", "The request body was invalid.");
export const UNAUTHENTICATED = () => jsonError(401, "unauthenticated", "Sign in to continue.");
