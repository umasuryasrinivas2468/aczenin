# Aczen AI Studio — architecture reference

*Written 2026-09-30 from a read of the code on `main` (`edd5b4d`). This is the
map of what exists. For what is live, blocked or pending, see
[ai-studio-status.md](ai-studio-status.md).*

**Not to be confused with:**
- **Nova API** (`/nova-api`) is a separate read-only finance-data sandbox with its own DB project. See [nova-api-architecture.md](nova-api-architecture.md).
- **`studio/`** at the repo root is the Sanity CMS Studio for the blog (`aczen-studio`). It has nothing to do with AI Studio.
- **Nova Tier 2 `010_gateway.sql`** is a *payments*-gateway dataset, not the AI gateway.

## 1. What it is

Aczen AI Studio is an OpenAI-compatible AI endpoint for allowlisted users (Finathon team leads). A console lets each user manage their own API keys. A separate admin portal holds the controls.

| URL | Who | What |
|---|---|---|
| `www.aczen.in/ai-studio/login` | allowlisted users | Sign in (email + password) |
| `/ai-studio` · `/keys` · `/usage` · `/quickstart` · `/account` | signed-in user, `full` stage | Dashboard, key manager (max 2 keys), usage charts, code samples, account |
| `/ai-studio/change-password` | user in `pwchange` stage | Forced before anything else works |
| `/ai-studio/axe` · `/users` · `/controls` · `/audit` | Aczen admin (shared password) | Users, limits, kill switch, budget, audit log |
| `POST /api/ai/v1/chat/completions` | API-key holders | The gateway. Server-side only: no CORS headers, by design |
| `GET /api/cron/ai-studio` | Vercel cron (`Bearer CRON_SECRET`) | Daily housekeeping and rule evaluation |

## 2. Routing

- **Pages:** `app/ai-studio/`.
  - `(console)/layout.tsx` redirects to login when there is no session, and to change-password when the session is in the `pwchange` stage.
  - `axe/layout.tsx` checks `hasAdminSession()` and `adminIpAllowed`, and returns `notFound()` when either fails.
  - Error screens: `errors/[code]`, `[...missing]`, `error.tsx`, `not-found.tsx`.
- **Console APIs:** `app/api/ai-studio/`.
  - `auth/{login,logout,password}`
  - `keys` (create), `keys/[id]/revoke`, `keys/[id]/rotate` (with a grace period, or immediate)
  - `axe/session` (admin login/logout), `axe/users` (bulk add 1–500), `axe/users/[id]` (suspend / activate / disable / reset_password / force_logout / revoke_keys / set_overrides), `axe/settings`, `axe/keys/[id]/revoke`
- **Gateway:** `app/api/ai/v1/[...path]/route.ts`. Node runtime, `maxDuration` 60 s, POST only.
- **[middleware.ts](../middleware.ts):** `/ai-studio/**` gets a per-request nonce CSP with `strict-dynamic`. API routes are outside the matcher.
- **[next.config.mjs](../next.config.mjs):** `STUDIO_SECURITY_HEADERS` apply to `/ai-studio`, `/api/ai-studio` and `/api/ai`: DENY framing, no-referrer, HSTS, noindex, no-store. There are no rewrites.
- **[vercel.json](../vercel.json):** the cron `30 21 * * *` UTC (03:00 IST).
- **Domain:** bare `aczen.in` answers with a **308** redirect to `www.aczen.in`. HTTP clients drop `Authorization` when the host changes, so API callers must use `https://www.aczen.in/api/ai/v1`. Nova learned the same lesson in `f4d1f29`.

## 3. Database

- **Where:** Supabase project `jgwvyyqagabtpnomdwgo` (the main site DB, on another account), in the same database as the Finathon and `/axe` analytics tables.
  - Nova is kept separate in `iwryjcsonuuhmegvihdg`.
  - `zpkvshwmbgomrycoeqqd` (repo-linked) is **not** the live DB.
- **Migration:** [supabase/migrations/20260927120000_ai_studio.sql](../supabase/migrations/20260927120000_ai_studio.sql).
- **Client:** [src/lib/ai-studio/db.ts](../src/lib/ai-studio/db.ts) makes raw `fetch` calls to PostgREST using `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - 8 s timeout.
  - Only table/RPC names on a typed allowlist can be called.
  - Errors carry only the SQLSTATE and hint.

| Table | Role |
|---|---|
| `ai_settings` | Singleton (id=1): kill switch, default limits, monthly budget, token prices, rule thresholds, breaker config |
| `ai_user` | Allowlist + account: email, `password_hash` (NULL = initial), status, `session_version`, `must_change_password`, limit overrides |
| `ai_api_key` | Keys stored as HMAC hashes, prefix, status, rotation grace |
| `ai_usage_event` / `ai_usage_daily` / `ai_spend_daily` | Per-request log (kept 90 days), daily rollups, spend |
| `ai_token_bucket` / `ai_inflight` / `ai_breaker_window` | Rate-limit bucket, concurrency slots, circuit breaker (RPC-only) |
| `ai_auth_attempt` | Login throttling (kept 30 days) |
| `ai_admin_audit` / `ai_alert` | Admin action log; alert de-duplication (unique kind+period) |

- **Functions:**
  - Time and spend helpers: `ai_ist_today`, `ai_ist_month_start`, `ai_month_spend`
  - Rate limiting and admission: `ai_take_token`, `ai_effective_limits`, `ai_log_denial`, `ai_gateway_admit`, `ai_gateway_finalize`
  - Keys and dashboards: `ai_create_key`, `ai_user_dashboard`, `ai_admin_dashboard`, `ai_admin_users`
  - Background jobs: `ai_anomaly_candidates`, `ai_housekeeping`

  Every function pins `search_path`.
- **Security:** RLS is enabled and **forced** on all 12 tables, with zero policies. Table grants are revoked from `anon` and `authenticated`, and EXECUTE is granted to `service_role` only. The browser never reaches these tables; only server code does.

## 4. Connections

### Upstream model: the "harness"

The gateway forwards to one configurable upstream: the `aczen_slm` harness (RAG + guardrails in front of Vertex AI). No provider or model name is hard-coded; everything comes from `AI_HARNESS_*` env vars ([harness.ts](../src/lib/ai-studio/harness.ts)):

| Setting | Env var / default |
|---|---|
| URL | `AI_HARNESS_URL` |
| Master key | `AI_HARNESS_API_KEY` |
| Auth | `AI_HARNESS_AUTH_HEADER`, `AI_HARNESS_AUTH_SCHEME` |
| Allowed paths | `AI_HARNESS_ALLOWED_PATHS` (default `chat/completions`) |
| Model | `AI_HARNESS_MODEL` (optional pinned model) |
| Output-token field | `AI_HARNESS_MAX_TOKENS_FIELD` (a cap of 4000 is injected if the caller sets none) |
| Timeout | `AI_HARNESS_TIMEOUT_MS` |

- **SSRF guard:** redirects are never followed.
- **Stub mode:** `AI_HARNESS_URL=stub` returns canned replies. It is refused in production.
- **Unset:** if the URL or key is missing, **every call returns 503 `service_unavailable`**.

### Gateway request flow

[gateway.ts](../src/lib/ai-studio/gateway.ts) handles each request in this order:

1. Env kill switch (`AI_STUDIO_KILL_SWITCH=1` returns 503 `service_paused`)
2. Harness configured?
3. Path allowlist
4. Per-instance invalid-key limiter (30 per IP per minute)
5. Key format + CRC32 check
6. `ai_gateway_admit`
7. Forward upstream (JSON, or streamed SSE with usage metering)
8. `ai_gateway_finalize` in `after()`

The gateway **fails closed** if the database is down. Upstream 3xx and 5xx responses are masked as 502.

### Admission checks

`ai_gateway_admit` checks, in order:

1. key → account → kill switch → breaker
2. input size
3. monthly budget hard stop
4. daily cap
5. requests/day → tokens/day → tokens/month
6. concurrency
7. per-user RPM → global RPM

**Defaults:**
- 20 rpm per user (burst 30), 300 rpm global
- 3 concurrent requests
- 1,000 requests/day
- 300k tokens/day, 5M tokens/month
- 2 keys per user
- ₹10,000 monthly budget

### Keys, sessions and passwords

- **Key format:** `aczen_sk_live_` + 43 base62 characters + a 6-character CRC. Keys are stored as HMAC-SHA256 under `AI_STUDIO_KEY_PEPPER`. IPs and emails are HMACed the same way.
- **Passwords:** scrypt, N=2^15. **A NULL `password_hash` means the password is the email address.** That login only reaches the `pwchange` stage (an explicit design choice in [login/route.ts](../app/api/ai-studio/auth/login/route.ts)).
- **Sessions:** HMAC-signed cookies.
  - `__Host-aczen_ais` — user, 12 h, `AI_STUDIO_SESSION_SECRET`
  - `__Host-aczen_aia` — admin, 30 min, `AI_STUDIO_ADMIN_SESSION_SECRET`
- **Login throttles:** users 5 failures per IP / 10 per account per 15 min. Admin 3 per IP / 20 global per hour.

### Rules, mail and cron

- **Rules** ([rules.ts](../src/lib/ai-studio/rules.ts)):
  - budget alert → throttle → hard stop (emails at each step)
  - a "prices unset" warning
  - breaker alerts
  - anomaly auto-suspend

  They run at most once a minute from finalize, plus daily from the cron.
- **Mail:** Zoho SMTP via nodemailer (`smtp.zoho.in:465`, sent as `team@aczen.in`).
- **Cron:** `ai_housekeeping` (retention) and `evaluateRules()`.

## 5. Admin portal (`/ai-studio/axe`)

- **Sign-in:** one shared password, checked against `AI_STUDIO_ADMIN_PASSWORD_HASH` (scrypt `salt:key`). There are no per-admin identities.
- **Access limits:** an optional `AI_STUDIO_ADMIN_IP_ALLOWLIST` (unlisted IPs get 404), a SameSite=Strict cookie, and an Origin + JSON check on every mutation.
- **What it can do:**
  - dashboards
  - bulk-add users
  - per-user actions and limit overrides
  - revoke any key
  - edit settings. Turning on the kill switch needs a reason, thresholds must satisfy alert ≤ throttle ≤ hard stop, and the breaker can be reset.
  - read the audit log
- **Secrets:** `node scripts/ai-studio-secrets.mjs --admin` prints fresh secrets and the admin hash to stdout. It writes nothing to disk.

## 6. Environment variables

All of these are listed in [.env.example](../.env.example). The secrets must be at least 32 characters.

| Group | Variables |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Studio | `AI_STUDIO_SESSION_SECRET`, `AI_STUDIO_ADMIN_SESSION_SECRET`, `AI_STUDIO_KEY_PEPPER`, `AI_STUDIO_ADMIN_PASSWORD_HASH`, `AI_STUDIO_ADMIN_IP_ALLOWLIST`, `AI_STUDIO_ALERT_EMAIL`, `AI_STUDIO_KILL_SWITCH` |
| Harness | `AI_HARNESS_URL`, `AI_HARNESS_API_KEY`, `AI_HARNESS_AUTH_HEADER`, `AI_HARNESS_AUTH_SCHEME`, `AI_HARNESS_ALLOWED_PATHS`, `AI_HARNESS_MAX_TOKENS_FIELD`, `AI_HARNESS_MODEL`, `AI_HARNESS_TIMEOUT_MS` |
| Mail / cron | `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASSWORD`, `CRON_SECRET` |
