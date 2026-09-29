/*
  Gate for every /api/ai-studio/axe/* handler. Returns a response to send
  back when the caller may not proceed, or null when they may.

  IP allowlist first (answered as 404 so the endpoint's existence is not
  confirmed), then the admin cookie, then — for mutations — the same-origin
  JSON check that stops CSRF.
*/

import { NextResponse } from "next/server";

import { clientIp, FORBIDDEN_ORIGIN, isSameOriginJson, jsonError } from "@/lib/ai-studio/http";
import { adminIpAllowed, hasAdminSession } from "@/lib/ai-studio/session";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/admin-guard.ts is server-only and must never reach the browser.");
}

export async function adminGuard(request: Request, { mutation = true } = {}): Promise<NextResponse | null> {
  if (!adminIpAllowed(clientIp(request.headers))) {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (mutation && !isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  if (!(await hasAdminSession())) {
    return jsonError(401, "unauthenticated", "Your admin session has expired. Sign in again.");
  }
  return null;
}
