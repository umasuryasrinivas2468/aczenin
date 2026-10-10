/*
  POST /api/ai-studio/keys — create an API key.

  The full key appears in exactly one place ever: this response body. Only its
  HMAC is stored, so it can never be shown again — a lost key is replaced, not
  recovered. The response is no-store so no cache keeps a copy.
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
import { createKey, KEY_ERRORS, KEY_NAME } from "@/lib/ai-studio/keys";
import { getUserSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return FORBIDDEN_ORIGIN();
  const session = await getUserSession();
  if (!session || session.stage !== "full") return UNAUTHENTICATED();
  if (session.user.status !== "active") {
    return jsonError(403, "account_not_active", "Your account is suspended, so new keys can't be created.");
  }

  const body = await readJsonBody<{ name?: unknown }>(request, 2048);
  if (!body) return BAD_REQUEST();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!KEY_NAME.test(name)) {
    return jsonError(422, "invalid_name", "Name the key with 1–60 letters, numbers, spaces, dots, dashes or underscores.");
  }

  try {
    const result = await createKey(session.user.id, name);
    if ("error" in result) {
      const [status, message] = KEY_ERRORS[result.error];
      return jsonError(status, result.error, message);
    }
    await audit({
      actor: "user", action: "key_created", targetType: "key", targetId: result.id,
      details: { user_id: session.user.id, name }, ipHash: ipHashOf(request),
    });
    return jsonOk({ id: result.id, key: result.key, hint: result.hint }, { status: 201 });
  } catch (error) {
    console.error("[ai-studio/keys] create failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not create the key right now. Try again shortly.");
  }
}
