/*
  POST /api/ai-studio/axe/users/:id — one action on one team lead.

    suspend        per-user kill switch: gateway refuses; the lead can still
                   sign in to see why and revoke keys
    activate       lift a suspension (manual or automatic)
    disable        cannot sign in at all; keys revoked; sessions ended
    reset_password back to the email as initial password, forced change
    force_logout   end every session now
    revoke_keys    revoke every active key (leak response)
    set_overrides  per-user limits; null clears an override back to default

  Suspend/disable/revoke require a reason for the audit log.
*/

import { z } from "zod";

import { adminGuard } from "@/lib/ai-studio/admin-guard";
import { audit } from "@/lib/ai-studio/audit";
import { aiSelectOne, aiUpdate, eq } from "@/lib/ai-studio/db";
import { BAD_REQUEST, ipHashOf, jsonError, jsonOk, readJsonBody } from "@/lib/ai-studio/http";
import { UUID } from "@/lib/ai-studio/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const override = (max: number) => z.number().int().min(0).max(max).nullable();

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(3).max(500) }).strict(),
  z.object({ action: z.literal("activate"), reason: z.string().trim().max(500).optional() }).strict(),
  z.object({ action: z.literal("disable"), reason: z.string().trim().min(3).max(500) }).strict(),
  z.object({ action: z.literal("reset_password"), reason: z.string().trim().max(500).optional() }).strict(),
  z.object({ action: z.literal("force_logout"), reason: z.string().trim().max(500).optional() }).strict(),
  z.object({ action: z.literal("revoke_keys"), reason: z.string().trim().min(3).max(500) }).strict(),
  z.object({
    action: z.literal("set_overrides"),
    reason: z.string().trim().max(500).optional(),
    overrides: z.object({
      rpm_override: override(100000),
      burst_override: override(100000),
      concurrency_override: override(1000),
      rpd_override: override(10000000),
      tpd_override: override(100000000000),
      tpm_override: override(1000000000000),
      max_keys_override: override(50),
    }).partial().strict(),
    display_name: z.string().trim().max(120).nullable().optional(),
    team_name: z.string().trim().max(120).nullable().optional(),
  }).strict(),
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "not_found", "User not found.");

  const raw = await readJsonBody(request, 8192);
  if (!raw) return BAD_REQUEST();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(422, "invalid_action", `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  const body = parsed.data;

  try {
    const user = await aiSelectOne<{ id: string; email: string; session_version: number; status: string }>(
      "ai_user",
      `id=${eq(id)}&select=id,email,session_version,status`,
    );
    if (!user) return jsonError(404, "not_found", "User not found.");

    const now = new Date().toISOString();
    const bump = { session_version: user.session_version + 1 };
    let details: Record<string, unknown> = { email: user.email };

    switch (body.action) {
      case "suspend":
        await aiUpdate("ai_user", `id=${eq(id)}`, { status: "suspended", status_reason: body.reason, updated_at: now });
        break;
      case "activate":
        await aiUpdate("ai_user", `id=${eq(id)}`, { status: "active", status_reason: null, updated_at: now });
        break;
      case "disable":
        await aiUpdate("ai_user", `id=${eq(id)}`, { status: "disabled", status_reason: body.reason, ...bump, updated_at: now });
        await aiUpdate("ai_api_key", `user_id=${eq(id)}&status=eq.active`, {
          status: "revoked", revoked_at: now, revoked_reason: "account disabled", revoked_by: "admin",
        });
        break;
      case "reset_password":
        await aiUpdate("ai_user", `id=${eq(id)}`, {
          password_hash: null, must_change_password: true, ...bump, updated_at: now,
        });
        break;
      case "force_logout":
        await aiUpdate("ai_user", `id=${eq(id)}`, { ...bump, updated_at: now });
        break;
      case "revoke_keys": {
        const revoked = await aiUpdate("ai_api_key", `user_id=${eq(id)}&status=eq.active`, {
          status: "revoked", revoked_at: now, revoked_reason: body.reason.slice(0, 200), revoked_by: "admin",
        });
        details = { ...details, revoked: revoked.length };
        break;
      }
      case "set_overrides": {
        const patch: Record<string, unknown> = { ...body.overrides, updated_at: now };
        if (body.display_name !== undefined) patch.display_name = body.display_name || null;
        if (body.team_name !== undefined) patch.team_name = body.team_name || null;
        await aiUpdate("ai_user", `id=${eq(id)}`, patch);
        details = { ...details, overrides: body.overrides };
        break;
      }
    }

    await audit({
      action: `user_${body.action}`,
      targetType: "user",
      targetId: id,
      reason: "reason" in body ? body.reason ?? null : null,
      details,
      ipHash: ipHashOf(request),
    });
    return jsonOk();
  } catch (error) {
    console.error("[ai-studio/axe/users] action failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not apply the action.");
  }
}
