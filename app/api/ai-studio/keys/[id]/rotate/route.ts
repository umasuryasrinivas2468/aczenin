/*
  POST /api/ai-studio/keys/:id/rotate — replace a key.

  mode "immediate" (the leaked-key path): the old key stops working in the same
  transaction that creates the new one. mode "grace": the old key keeps working
  for up to 24 hours so a deploy can pick up the new one without downtime.
*/

import { audit } from "@/lib/ai-studio/audit";
import {
  BAD_REQUEST,
  FORBIDDEN_ORIGIN,
  ipHashOf,
  isSameOriginJson,
  jsonError,
  jsonOk,
  readJsonBody,
  UNAUTHENTICATED,
} from "@/lib/ai-studio/http";
import { createKey, KEY_ERRORS, KEY_NAME, UUID } from "@/lib/ai-studio/keys";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_HOURS = new Set([1, 6, 24]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  const session = await getUserSession();
  if (!session || session.stage !== "full") return UNAUTHENTICATED();

  const { id } = await context.params;
  if (!UUID.test(id)) return jsonError(404, "key_not_found", "That key doesn't exist.");

  const body = await readJsonBody<{ mode?: unknown; graceHours?: unknown; name?: unknown }>(request, 2048);
  if (!body) return BAD_REQUEST();
  const mode = body.mode === "grace" ? "grace" : body.mode === "immediate" ? "immediate" : null;
  if (!mode) return BAD_REQUEST();
  const graceHours = typeof body.graceHours === "number" ? body.graceHours : 0;
  if (mode === "grace" && !GRACE_HOURS.has(graceHours)) return BAD_REQUEST();
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Rotated key";
  if (!KEY_NAME.test(name)) return jsonError(422, "invalid_name", "Invalid key name.");

  try {
    const result = await createKey(session.user.id, name, id, mode === "grace" ? graceHours * 3600 : 0);
    if ("error" in result) {
      const [status, message] = KEY_ERRORS[result.error];
      return jsonError(status, result.error, message);
    }
    await audit({
      actor: "user", action: mode === "grace" ? "key_rotated_grace" : "key_rotated_immediate",
      targetType: "key", targetId: id,
      details: { user_id: session.user.id, new_key_id: result.id, grace_hours: graceHours },
      ipHash: ipHashOf(request),
    });
    return jsonOk({ id: result.id, key: result.key, hint: result.hint }, { status: 201 });
  } catch (error) {
    console.error("[ai-studio/keys] rotate failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not rotate the key right now. Try again shortly.");
  }
}
