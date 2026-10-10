/*
  POST /api/ai-studio/axe/users — add team leads in bulk.

  New accounts start on their initial password (the email) with
  must_change_password set, so the first sign-in forces a real password.
  Existing emails are skipped, not overwritten: re-importing a list must never
  reset someone's password.
*/

import { z } from "zod";

import { adminGuard } from "@/lib/ai-studio/admin-guard";
import { audit } from "@/lib/ai-studio/audit";
import { aiInsert } from "@/lib/ai-studio/db";
import { BAD_REQUEST, ipHashOf, jsonError, jsonOk, readJsonBody } from "@/lib/ai-studio/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const Body = z
  .object({
    emails: z.array(z.string()).min(1).max(500),
    team_name: z.string().trim().max(120).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const raw = await readJsonBody(request, 64 * 1024);
  if (!raw) return BAD_REQUEST();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return jsonError(422, "invalid_users", "Provide between 1 and 500 email addresses.");

  const normalised = [...new Set(parsed.data.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const invalid = normalised.filter((email) => !EMAIL.test(email) || email.length > 254);
  if (invalid.length > 0) {
    return jsonError(422, "invalid_email", `Not a valid email: ${invalid.slice(0, 3).join(", ")}`);
  }

  try {
    const inserted = await aiInsert<{ id: string; email: string }>(
      "ai_user",
      normalised.map((email) => ({ email, team_name: parsed.data.team_name || null })),
      { returning: true, ignoreDuplicates: true },
    );
    await audit({
      action: "users_added",
      targetType: "user",
      details: { count: inserted.length, skipped: normalised.length - inserted.length, emails: inserted.map((row) => row.email) },
      ipHash: ipHashOf(request),
    });
    return jsonOk({ added: inserted.length, skipped: normalised.length - inserted.length });
  } catch (error) {
    console.error("[ai-studio/axe/users] add failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not add users.");
  }
}
