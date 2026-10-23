/*
  Brute-force protection for both AI Studio logins, backed by ai_auth_attempt.

  Counted in the database rather than in memory because serverless instances
  share nothing: an in-process counter resets on every cold start, and an
  attacker spreading guesses across instances would never trip it.

  Team leads (scope "user"):
    - 5 failures per IP per 15 minutes
    - 10 failures per account (hashed email) per 15 minutes. Time-boxed, never
      a permanent lock, so a stranger cannot lock a real lead out indefinitely.
  Admin (scope "admin"):
    - 3 failures per IP per hour: the third wrong password locks that IP for
      an hour.
    - 20 failures across ALL IPs per hour closes admin login for everyone for
      the rest of the hour. This is what stops a distributed guess against a
      dictionary-word password; the cost is that the real admin is locked out
      too during an attack, which an alert email makes visible.
*/

import { aiCount, aiInsert, eq } from "@/lib/ai-studio/db";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/auth-guard.ts is server-only and must never reach the browser.");
}

const MINUTE = 60 * 1000;

export const USER_LIMITS = { ipMax: 5, accountMax: 10, windowMs: 15 * MINUTE };
export const ADMIN_LIMITS = { ipMax: 3, globalMax: 20, windowMs: 60 * MINUTE };

function since(windowMs: number): string {
  return encodeURIComponent(new Date(Date.now() - windowMs).toISOString());
}

export async function recordAttempt(
  scope: "user" | "admin",
  ipHash: string,
  succeeded: boolean,
  subjectHash: string | null = null,
): Promise<void> {
  try {
    await aiInsert("ai_auth_attempt", { scope, ip_hash: ipHash, subject_hash: subjectHash, succeeded });
  } catch (error) {
    console.error("[ai-studio/auth] could not record attempt:", (error as Error).message);
  }
}

export async function userLoginBlocked(ipHash: string, subjectHash: string): Promise<boolean> {
  const window = since(USER_LIMITS.windowMs);
  const [byIp, byAccount] = await Promise.all([
    aiCount("ai_auth_attempt", `scope=eq.user&ip_hash=${eq(ipHash)}&succeeded=eq.false&occurred_at=gte.${window}`),
    aiCount("ai_auth_attempt", `scope=eq.user&subject_hash=${eq(subjectHash)}&succeeded=eq.false&occurred_at=gte.${window}`),
  ]);
  return byIp >= USER_LIMITS.ipMax || byAccount >= USER_LIMITS.accountMax;
}

export async function adminLoginBlocked(ipHash: string): Promise<{ blocked: boolean; global: boolean }> {
  const window = since(ADMIN_LIMITS.windowMs);
  const [byIp, total] = await Promise.all([
    aiCount("ai_auth_attempt", `scope=eq.admin&ip_hash=${eq(ipHash)}&succeeded=eq.false&occurred_at=gte.${window}`),
    aiCount("ai_auth_attempt", `scope=eq.admin&succeeded=eq.false&occurred_at=gte.${window}`),
  ]);
  const global = total >= ADMIN_LIMITS.globalMax;
  return { blocked: global || byIp >= ADMIN_LIMITS.ipMax, global };
}
