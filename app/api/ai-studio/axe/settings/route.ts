/*
  PATCH /api/ai-studio/axe/settings — kill switch, limits, budget, prices and
  rule thresholds.

  The accepted fields are an explicit schema with the same bounds as the
  table's CHECK constraints, so an admin typo is a 422 with a message rather
  than a raw constraint error. Flipping the kill switch requires a reason,
  which goes into the audit log with the before/after values.
*/

import { z } from "zod";

import { adminGuard } from "@/lib/ai-studio/admin-guard";
import { audit } from "@/lib/ai-studio/audit";
import { aiSelectOne, aiUpdate } from "@/lib/ai-studio/db";
import { BAD_REQUEST, ipHashOf, jsonError, jsonOk, readJsonBody } from "@/lib/ai-studio/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const num = (min: number, max: number) => z.number().finite().min(min).max(max);

const SettingsPatch = z
  .object({
    global_kill: z.boolean(),
    default_rpm: int(0, 100000),
    default_burst: int(0, 100000),
    default_concurrency: int(0, 1000),
    default_rpd: int(0, 10000000),
    default_tpd: int(0, 100000000000),
    default_tpm: int(0, 1000000000000),
    max_keys_per_user: int(0, 50),
    max_input_tokens: int(1, 2000000),
    max_output_tokens: int(1, 200000),
    global_rpm: int(0, 1000000),
    limit_multiplier: num(0.01, 100),
    currency: z.string().regex(/^[A-Z]{3}$/),
    monthly_budget: num(0, 1000000000),
    daily_cap_factor: num(0.01, 999),
    price_input_per_mtok: num(0, 100000000),
    price_output_per_mtok: num(0, 100000000),
    alert_pct: int(1, 1000),
    throttle_pct: int(1, 1000),
    hard_stop_pct: int(1, 1000),
    throttle_factor: num(0.01, 1),
    anomaly_enabled: z.boolean(),
    anomaly_multiplier: num(1, 9999),
    anomaly_min_requests: int(1, 10000000),
    breaker_error_pct: int(1, 100),
    breaker_min_requests: int(1, 1000000),
    breaker_window_seconds: int(10, 3600),
    breaker_cooldown_seconds: int(5, 3600),
  })
  .partial()
  .strict();

const Body = z
  .object({
    patch: SettingsPatch.optional(),
    reset_breaker: z.boolean().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const raw = await readJsonBody(request, 8192);
  if (!raw) return BAD_REQUEST();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(422, "invalid_settings", `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  const { patch = {}, reset_breaker, reason } = parsed.data;

  if ("global_kill" in patch && !reason) {
    return jsonError(422, "reason_required", "Give a reason for changing the kill switch.");
  }

  try {
    const before = await aiSelectOne<Record<string, unknown>>("ai_settings", "id=eq.1&select=*");
    if (!before) return jsonError(503, "unavailable", "Settings row is missing.");

    const merged = { ...before, ...patch } as Record<string, number>;
    if (!(merged.alert_pct <= merged.throttle_pct && merged.throttle_pct <= merged.hard_stop_pct)) {
      return jsonError(422, "invalid_thresholds", "Thresholds must satisfy alert ≤ throttle ≤ hard stop.");
    }

    const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    if ("global_kill" in patch) update.global_kill_reason = patch.global_kill ? reason : null;
    if (reset_breaker) update.breaker_open_until = null;

    const rows = await aiUpdate<Record<string, unknown>>("ai_settings", "id=eq.1", update);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(patch)) {
      if (before[key] !== (patch as Record<string, unknown>)[key]) {
        changes[key] = { from: before[key], to: (patch as Record<string, unknown>)[key] };
      }
    }
    const action = "global_kill" in patch
      ? (patch.global_kill ? "kill_switch_on" : "kill_switch_off")
      : reset_breaker ? "breaker_reset" : "settings_updated";
    await audit({ action, targetType: "settings", targetId: "1", reason: reason ?? null, details: { changes, reset_breaker: !!reset_breaker }, ipHash: ipHashOf(request) });

    return jsonOk({ settings: rows[0] ?? null });
  } catch (error) {
    console.error("[ai-studio/axe/settings] update failed:", (error as Error).message);
    return jsonError(503, "unavailable", "Could not save settings.");
  }
}
