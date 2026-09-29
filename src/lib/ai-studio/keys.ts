/*
  API key lifecycle shared by the key routes and the keys page.
*/

import { generateApiKey } from "@/lib/ai-studio/crypto";
import { aiRpc, aiSelect, aiUpdate, AiDbError, eq } from "@/lib/ai-studio/db";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/keys.ts is server-only and must never reach the browser.");
}

export interface KeyRow {
  id: string;
  name: string;
  key_hint: string;
  status: "active" | "revoked";
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
  last_used_at: string | null;
}

export async function listKeys(userId: string): Promise<KeyRow[]> {
  return aiSelect<KeyRow>(
    "ai_api_key",
    `user_id=${eq(userId)}&select=id,name,key_hint,status,expires_at,revoked_at,revoked_reason,created_at,last_used_at&order=created_at.desc`,
    100,
  );
}

export type CreateKeyError = "key_limit_reached" | "key_not_found" | "account_not_active";

export async function createKey(
  userId: string,
  name: string,
  rotateFrom: string | null = null,
  graceSeconds = 0,
): Promise<{ id: string; key: string; hint: string } | { error: CreateKeyError }> {
  const generated = generateApiKey();
  try {
    const result = await aiRpc<{ id: string }>("ai_create_key", {
      p_user_id: userId,
      p_name: name,
      p_key_hash: generated.hash,
      p_key_hint: generated.hint,
      p_rotated_from: rotateFrom,
      p_grace_seconds: graceSeconds,
    });
    return { id: result.id, key: generated.key, hint: generated.hint };
  } catch (error) {
    if (error instanceof AiDbError) {
      if (error.code === "AZK01") return { error: "key_limit_reached" };
      if (error.code === "AZK02") return { error: "key_not_found" };
      if (error.code === "AZU01") return { error: "account_not_active" };
    }
    throw error;
  }
}

/* Revokes one key. The owner filter is the authorization check. */
export async function revokeKey(
  keyId: string,
  ownerId: string | null,
  by: "user" | "admin",
  reason: string,
): Promise<boolean> {
  const owner = ownerId ? `&user_id=${eq(ownerId)}` : "";
  const rows = await aiUpdate(
    "ai_api_key",
    `id=${eq(keyId)}${owner}&status=eq.active`,
    { status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: reason.slice(0, 200), revoked_by: by },
  );
  return rows.length > 0;
}

export const KEY_NAME = /^[\p{L}\p{N} _.\-]{1,60}$/u;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const KEY_ERRORS: Record<CreateKeyError, readonly [number, string]> = {
  key_limit_reached: [409, "You've reached your key limit. Revoke or rotate an existing key first."],
  key_not_found: [404, "That key no longer exists or is already revoked."],
  account_not_active: [403, "Your account can't create keys right now."],
};
