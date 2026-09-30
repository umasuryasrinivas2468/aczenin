/*
  GET /api/cron/ai-studio — daily housekeeping and a backstop rules pass.

  The rules also run from live traffic (at most once a minute), so this only
  matters on quiet days. Authenticated with CRON_SECRET, which Vercel Cron
  sends as a bearer token; compared in constant time.
*/

import { NextResponse } from "next/server";

import { safeEqual } from "@/lib/ai-studio/crypto";
import { aiRpc } from "@/lib/ai-studio/db";
import { evaluateRules } from "@/lib/ai-studio/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const cleaned = await aiRpc<Record<string, number>>("ai_housekeeping");
    await evaluateRules();
    return NextResponse.json({ ok: true, cleaned });
  } catch (error) {
    console.error("[cron/ai-studio] failed:", (error as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
