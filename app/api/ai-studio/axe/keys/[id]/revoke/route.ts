/*
  POST /api/ai-studio/axe/keys/:id/revoke — per-key kill switch.
*/

import { z } from "zod";

import { adminGuard } from "@/lib/ai-studio/admin-guard";
import { audit } from "@/lib/ai-studio/audit";
import { BAD_REQUEST, ipHashOf, jsonError, jsonOk, readJsonBody } from "@/lib/ai-studio/http";
import { revokeKey, UUID } from "@/lib/ai-studio/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ reason: z.string().trim().min(3).max(200) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "not_found", "Key not found.");
  const raw = await readJsonBody(request, 2048);
  if (!raw) return BAD_REQUEST();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return jsonError(422, "reason_required", "Give a reason (3–200 characters).");

  try {
    const revoked = await revokeKey(id, null, "admin", parsed.data.reason);
    if (!revoked) return jsonError(404, "not_found", "Key not found or already revoked.");
    await audit({ action: "key_revoked", targetType: "key", targetId: id, reason: parsed.data.reason, ipHash: ipHashOf(request) });
    return jsonOk();
  } catch (error) {
    console.error("[ai-studio/axe/keys] revoke failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not revoke the key.");
  }
}
