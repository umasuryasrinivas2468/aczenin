/*
  POST /api/ai-studio/auth/logout — clears the team-lead session cookie.
  "Sign out everywhere" is the password change; this ends only this browser.
*/

import { NextResponse } from "next/server";

import { FORBIDDEN_ORIGIN, isSameOriginJson } from "@/lib/ai-studio/http";
import { USER_COOKIE, USER_COOKIE_OPTIONS } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(USER_COOKIE, "", { ...USER_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
