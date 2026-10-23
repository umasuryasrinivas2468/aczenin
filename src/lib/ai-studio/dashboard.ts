/*
  Typed loaders for the dashboard RPCs. The aggregation happens in Postgres
  (ai_user_dashboard / ai_admin_dashboard / ai_admin_users); these only give
  the JSON a shape and coerce numeric strings.
*/

import { aiRpc } from "@/lib/ai-studio/db";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/dashboard.ts is server-only and must never reach the browser.");
}

export interface Limits {
  rpm: number;
  burst: number;
  concurrency: number;
  rpd: number;
  tpd: number;
  tpm: number;
  max_keys: number;
  throttled: boolean;
}

export interface HourlyPoint {
  hour: string;
  s2xx: number;
  s4xx: number;
  s429: number;
  s5xx: number;
}

export interface UserDashboard {
  limits: Limits;
  settings: { max_input_tokens: number; max_output_tokens: number; global_kill: boolean; breaker_open: boolean };
  today: { requests: number; denied: number; tokens: number };
  month: { requests: number; tokens: number };
  inflight: number;
  series: Array<{ day: string; requests: number; ok: number; errors: number; denied: number; input_tokens: number; output_tokens: number }>;
  status_codes: Array<{ status: number; count: number }>;
  outcomes: Array<{ outcome: string; count: number }>;
  latency: { p50: number; p95: number; count: number };
  hourly: HourlyPoint[];
  recent: Array<{
    occurred_at: string;
    endpoint: string;
    status_code: number;
    outcome: string;
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
    streamed: boolean;
    request_id: string | null;
    key_hint: string | null;
    key_name: string | null;
  }>;
}

export async function loadUserDashboard(userId: string, days = 14): Promise<UserDashboard> {
  return aiRpc<UserDashboard>("ai_user_dashboard", { p_user_id: userId, p_days: days });
}

export interface AdminDashboard {
  settings: Record<string, unknown> & {
    global_kill: boolean;
    global_kill_reason: string | null;
    monthly_budget: number;
    currency: string;
    alert_pct: number;
    throttle_pct: number;
    hard_stop_pct: number;
    daily_cap_factor: number;
    price_input_per_mtok: number;
    price_output_per_mtok: number;
    limit_multiplier: number;
    breaker_open_until: string | null;
  };
  month_spend: number;
  today_spend: number;
  month: { requests: number; input_tokens: number; output_tokens: number };
  ist_today: string;
  days_in_month: number;
  day_of_month: number;
  users: { total: number; active: number; suspended: number; disabled: number; pending_password: number };
  active_keys: number;
  inflight: number;
  spend_series: Array<{ day: string; cost: number; requests: number; tokens: number }>;
  status_codes: Array<{ status: number; count: number }>;
  outcomes: Array<{ outcome: string; count: number }>;
  latency: { p50: number; p95: number; count: number };
  hourly: HourlyPoint[];
}

export async function loadAdminDashboard(days = 30): Promise<AdminDashboard> {
  const data = await aiRpc<AdminDashboard>("ai_admin_dashboard", { p_days: days });
  data.month_spend = Number(data.month_spend);
  data.today_spend = Number(data.today_spend);
  data.spend_series = data.spend_series.map((point) => ({ ...point, cost: Number(point.cost) }));
  return data;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  team_name: string | null;
  status: "active" | "suspended" | "disabled";
  status_reason: string | null;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
  rpm_override: number | null;
  burst_override: number | null;
  concurrency_override: number | null;
  rpd_override: number | null;
  tpd_override: number | null;
  tpm_override: number | null;
  max_keys_override: number | null;
  rpm: number;
  burst: number;
  concurrency: number;
  rpd: number;
  tpd: number;
  tpm: number;
  max_keys: number;
  throttled: boolean;
  today_requests: number;
  today_tokens: number;
  month_requests: number;
  month_tokens: number;
  month_denied: number;
  month_errors: number;
  month_cost: number;
  active_keys: number;
  last_used_at: string | null;
}

export async function loadAdminUsers(): Promise<AdminUserRow[]> {
  const rows = await aiRpc<AdminUserRow[]>("ai_admin_users");
  return rows.map((row) => ({ ...row, month_cost: Number(row.month_cost) }));
}
