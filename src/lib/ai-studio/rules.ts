/*
  The automatic rules: budget alerts, anomaly suspensions and breaker alerts.

  WHAT IS NOT HERE, AND WHY: the throttle and the hard stop. Those are
  enforced inside ai_gateway_admit on every request, straight from the spend
  rollup, so they cannot lag behind or be skipped if this code never runs.
  This file only does the parts that need to send mail or take an action on a
  specific account.

  Runs (a) at most once a minute, claimed atomically by ai_gateway_finalize and
  executed after the response is sent, and (b) daily from the cron route as a
  backstop for quiet periods.
*/

import { audit } from "@/lib/ai-studio/audit";
import { aiInsert, aiRpc, aiSelectOne, aiUpdate, AiDbError, eq } from "@/lib/ai-studio/db";
import { adminAlertRecipients, sendStudioMail } from "@/lib/ai-studio/mail";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/rules.ts is server-only and must never reach the browser.");
}

interface RuleSettings {
  monthly_budget: number;
  currency: string;
  alert_pct: number;
  throttle_pct: number;
  hard_stop_pct: number;
  price_input_per_mtok: number;
  price_output_per_mtok: number;
  anomaly_enabled: boolean;
  anomaly_multiplier: number;
  anomaly_min_requests: number;
  breaker_open_until: string | null;
}

interface AnomalyCandidate {
  user_id: string;
  email: string;
  last_hour: number;
  avg_hourly: number;
}

/* Inserts the (kind, period) marker; true only for the first caller. */
async function claimAlert(kind: string, period: string): Promise<boolean> {
  try {
    await aiInsert("ai_alert", { kind, period });
    return true;
  } catch (error) {
    if (error instanceof AiDbError && error.code === "23505") return false;
    throw error;
  }
}

function istMonth(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 7);
}

function istHour(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 13);
}

export async function evaluateRules(): Promise<void> {
  try {
    const settings = await aiSelectOne<RuleSettings>("ai_settings", "id=eq.1&select=*");
    if (!settings) return;
    const spend = Number(await aiRpc<number>("ai_month_spend"));
    const budget = Number(settings.monthly_budget);
    const month = istMonth();
    const money = (value: number) => `${settings.currency} ${value.toFixed(2)}`;

    if (budget > 0) {
      const pct = (spend / budget) * 100;
      const steps: Array<[number, string, string]> = [
        [settings.alert_pct, "budget_alert", `Spend has reached ${settings.alert_pct}% of the monthly budget.`],
        [settings.throttle_pct, "budget_throttle", `Spend has reached ${settings.throttle_pct}% of budget. All users are now throttled.`],
        [settings.hard_stop_pct, "budget_hard_stop", `Spend has reached ${settings.hard_stop_pct}% of budget. The gateway is now refusing requests.`],
      ];
      for (const [threshold, kind, headline] of steps) {
        if (pct >= threshold && (await claimAlert(kind, month))) {
          await sendStudioMail(adminAlertRecipients(), headline, [
            headline,
            `Month to date: ${money(spend)} of ${money(budget)} (${pct.toFixed(1)}%).`,
            "Review or raise the budget at https://aczen.in/ai-studio/axe/controls.",
          ]);
          if (kind !== "budget_alert") {
            await audit({ actor: "system", action: kind, details: { spend, budget, pct } });
          }
        }
      }
    }

    // Prices left at zero make every request free on paper, so the budget can
    // never trip. That is a configuration fault worth one email a month.
    if (
      Number(settings.price_input_per_mtok) === 0 &&
      Number(settings.price_output_per_mtok) === 0 &&
      (await claimAlert("prices_unset", month))
    ) {
      await sendStudioMail(adminAlertRecipients(), "Token prices are not configured", [
        "AI Studio is serving traffic but the per-token prices are zero, so spend is recorded as zero and the budget rules cannot trigger.",
        "Set the input and output prices from the GCP Vertex AI rate card at https://aczen.in/ai-studio/axe/controls.",
      ]);
    }

    if (settings.breaker_open_until && new Date(settings.breaker_open_until) > new Date()) {
      if (await claimAlert("breaker_open", istHour())) {
        await sendStudioMail(adminAlertRecipients(), "Upstream circuit breaker opened", [
          "More than the configured share of requests to the AI harness failed, so the gateway is briefly refusing traffic.",
          `It re-opens automatically at ${new Date(settings.breaker_open_until).toISOString()}.`,
          "Check the harness service health and Vertex AI quota in GCP.",
        ]);
        await audit({ actor: "system", action: "breaker_opened", details: { until: settings.breaker_open_until } });
      }
    }

    if (settings.anomaly_enabled) {
      const candidates = await aiRpc<AnomalyCandidate[]>("ai_anomaly_candidates", {
        p_multiplier: Number(settings.anomaly_multiplier),
        p_min: settings.anomaly_min_requests,
      });
      for (const candidate of candidates) {
        const reason = `Automatically paused: ${candidate.last_hour} requests in the last hour vs a 7-day average of ${Number(candidate.avg_hourly).toFixed(1)}/hour.`;
        const updated = await aiUpdate(
          "ai_user",
          `id=${eq(candidate.user_id)}&status=eq.active`,
          { status: "suspended", status_reason: reason, updated_at: new Date().toISOString() },
        );
        if (updated.length === 0) continue;
        await audit({
          actor: "system",
          action: "user_auto_suspended",
          targetType: "user",
          targetId: candidate.user_id,
          reason,
        });
        await sendStudioMail([candidate.email], "Your Aczen AI access was paused", [
          "Your account's API traffic rose far above its usual level, so we paused it automatically to protect you in case a key has leaked.",
          "If this was you, reply to this email and we'll restore access. If it wasn't, rotate your keys at https://aczen.in/ai-studio/keys once access is restored.",
        ]);
        await sendStudioMail(adminAlertRecipients(), `User auto-suspended: ${candidate.email}`, [
          reason,
          "Review at https://aczen.in/ai-studio/axe/users.",
        ]);
      }
    }
  } catch (error) {
    console.error("[ai-studio/rules] evaluation failed:", (error as Error).message);
  }
}
