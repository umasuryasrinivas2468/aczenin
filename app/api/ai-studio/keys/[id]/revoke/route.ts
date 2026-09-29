/*
  POST /api/ai-studio/keys/:id/revoke — permanently disable one key.
  Works even for a suspended account: shutting a leaked key off must never be
  blocked by the state of the account that owns it.
*/

import { audit } from "@/lib/ai-studio/audit";
import { FORBIDDEN_ORIGIN, ipHashOf, isSameOriginJson, jsonError, jsonOk, UNAUTHENTICATED } from "@/lib/ai-studio/http";
import { revokeKey, UUID } from "@/lib/ai-studio/keys";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  const session = await getUserSession();
  if (!session || session.stage !== "full") return UNAUTHENTICATED();

  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "key_not_found", "That key doesn't exist.");

  try {
    const revoked = await revokeKey(id, session.user.id, "user", "revoked by owner");
    if (!revoked) return jsonError(404, "key_not_found", "That key doesn't exist or is already revoked.");
    await audit({
      actor: "user", action: "key_revoked", targetType: "key", targetId: id,
      details: { user_id: session.user.id }, ipHash: ipHashOf(request),
    });
    return jsonOk();
  } catch (error) {
    console.error("[ai-studio/keys] revoke failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not revoke the key right now. Try again shortly.");
  }
}
