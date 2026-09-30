/*
  Append-only audit trail for admin and system actions. A failed audit write
  is logged, not thrown: the action it describes has already happened, and
  failing the response would only hide that from the operator.
*/

import { aiInsert } from "@/lib/ai-studio/db";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/audit.ts is server-only and must never reach the browser.");
}

export interface AuditEntry {
  actor?: "admin" | "system" | "user";
  action: string;
  targetType?: string;
  targetId?: string;
  reason?: string | null;
  details?: Record<string, unknown>;
  ipHash?: string | null;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await aiInsert("ai_admin_audit", {
      actor: entry.actor ?? "admin",
      action: entry.action.slice(0, 80),
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      reason: entry.reason ? entry.reason.slice(0, 500) : null,
      details: entry.details ?? {},
      ip_hash: entry.ipHash ?? null,
    });
  } catch (error) {
    console.error("[ai-studio/audit] write failed:", (error as Error).message);
  }
}
