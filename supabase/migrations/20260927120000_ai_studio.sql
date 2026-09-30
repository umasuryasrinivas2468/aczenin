-- =============================================================================
-- Aczen AI Studio — schema, metering and admission control.
--
-- Everything the /ai-studio portal, the /ai-studio/axe admin panel and the
-- /api/ai/v1 gateway need, in one migration so the pieces cannot be deployed
-- out of step with each other.
--
-- SECURITY MODEL (same as the /axe analytics schema):
--   * RLS is ENABLED and FORCED on every table with ZERO policies.
--   * All table privileges are revoked from anon and authenticated.
--   * EXECUTE on every function is revoked from PUBLIC, anon and authenticated
--     and granted to service_role only. Supabase's default privileges grant
--     EXECUTE on new public-schema functions to anon, which would otherwise
--     expose them at /rest/v1/rpc/* to anyone holding the public anon key.
--   * Every function pins search_path, so a hostile object on an earlier
--     schema in the path cannot shadow a table or operator used inside it.
--
-- WHAT IS NEVER STORED: raw API keys (only an HMAC-SHA256 under a server-side
-- pepper), raw IPs (only salted hashes), plain-text passwords (only scrypt),
-- and prompt or completion text (only counts, status codes and timings).
--
-- TIME: quotas and budgets roll over on the IST calendar (Asia/Kolkata), which
-- is the working day and billing month of the people reading the dashboards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings: a single row holding kill switches, default limits, budget, prices
-- and the thresholds of the automatic rules. Editable from /ai-studio/axe.
-- -----------------------------------------------------------------------------
create table public.ai_settings (
  id smallint primary key default 1 check (id = 1),

  -- Kill switch. The env var AI_STUDIO_KILL_SWITCH=1 overrides this at the
  -- gateway even when the database is unreachable.
  global_kill boolean not null default false,
  global_kill_reason text check (char_length(global_kill_reason) <= 500),

  -- Default per-user limits. A per-user override on ai_user wins over these.
  default_rpm int not null default 20 check (default_rpm between 0 and 100000),
  default_burst int not null default 30 check (default_burst between 0 and 100000),
  default_concurrency int not null default 3 check (default_concurrency between 0 and 1000),
  default_rpd int not null default 1000 check (default_rpd between 0 and 10000000),
  default_tpd bigint not null default 300000 check (default_tpd between 0 and 100000000000),
  default_tpm bigint not null default 5000000 check (default_tpm between 0 and 1000000000000),
  max_keys_per_user int not null default 2 check (max_keys_per_user between 0 and 50),

  -- Per-request ceilings.
  max_input_tokens int not null default 16000 check (max_input_tokens between 1 and 2000000),
  max_output_tokens int not null default 4000 check (max_output_tokens between 1 and 200000),

  -- Whole-platform request rate across every user.
  global_rpm int not null default 300 check (global_rpm between 0 and 1000000),

  -- "Raise limits for everyone": multiplies every DEFAULT limit. Per-user
  -- overrides are explicit numbers and are deliberately not multiplied.
  limit_multiplier numeric(6,2) not null default 1.00
    check (limit_multiplier > 0 and limit_multiplier <= 100),

  -- Budget, in `currency` units.
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  monthly_budget numeric(14,2) not null default 10000 check (monthly_budget >= 0),
  daily_cap_factor numeric(5,2) not null default 1.50 check (daily_cap_factor > 0),

  -- Prices per 1M tokens, in `currency`. ZERO MEANS UNSET: cost is then
  -- computed as zero and the budget can never trip, so the admin panel shows a
  -- warning until these are filled in from the GCP Vertex rate card.
  price_input_per_mtok numeric(12,4) not null default 0 check (price_input_per_mtok >= 0),
  price_output_per_mtok numeric(12,4) not null default 0 check (price_output_per_mtok >= 0),

  -- Automatic budget rules, as percentages of monthly_budget.
  alert_pct int not null default 80 check (alert_pct between 1 and 1000),
  throttle_pct int not null default 95 check (throttle_pct between 1 and 1000),
  hard_stop_pct int not null default 100 check (hard_stop_pct between 1 and 1000),
  throttle_factor numeric(4,2) not null default 0.50 check (throttle_factor > 0 and throttle_factor <= 1),

  -- Anomaly rule: suspend a user whose last-hour requests exceed
  -- anomaly_multiplier x their 7-day hourly average, once they pass a floor.
  anomaly_enabled boolean not null default true,
  anomaly_multiplier numeric(6,2) not null default 5.00 check (anomaly_multiplier >= 1),
  anomaly_min_requests int not null default 100 check (anomaly_min_requests >= 1),

  -- Circuit breaker on the upstream harness.
  breaker_error_pct int not null default 50 check (breaker_error_pct between 1 and 100),
  breaker_min_requests int not null default 20 check (breaker_min_requests >= 1),
  breaker_window_seconds int not null default 300 check (breaker_window_seconds between 10 and 3600),
  breaker_cooldown_seconds int not null default 60 check (breaker_cooldown_seconds between 5 and 3600),
  breaker_open_until timestamptz,

  -- Claimed by the gateway at most once a minute to run the rules in TS.
  rules_evaluated_at timestamptz,

  updated_at timestamptz not null default now()
);

insert into public.ai_settings (id) values (1);

-- -----------------------------------------------------------------------------
-- Team leads.
-- -----------------------------------------------------------------------------
create table public.ai_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (email = lower(btrim(email))
           and char_length(email) between 3 and 254
           and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  display_name text check (char_length(display_name) <= 120),
  team_name text check (char_length(team_name) <= 120),

  -- NULL means the account is still on its initial password (the email
  -- address). must_change_password then blocks everything except the change
  -- form. Format when set: scrypt$N$r$p$saltB64$hashB64.
  password_hash text check (password_hash is null or password_hash like 'scrypt$%'),
  must_change_password boolean not null default true,
  password_changed_at timestamptz,

  status text not null default 'active' check (status in ('active', 'suspended', 'disabled')),
  status_reason text check (char_length(status_reason) <= 500),

  -- Signed into every session cookie. Bumping it signs out every session of
  -- this user at once (password change, admin force-logout, suspension).
  session_version int not null default 1,

  -- Per-user overrides. NULL = use the default in ai_settings.
  rpm_override int check (rpm_override >= 0),
  burst_override int check (burst_override >= 0),
  concurrency_override int check (concurrency_override >= 0),
  rpd_override int check (rpd_override >= 0),
  tpd_override bigint check (tpd_override >= 0),
  tpm_override bigint check (tpm_override >= 0),
  max_keys_override int check (max_keys_override between 0 and 50),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- -----------------------------------------------------------------------------
-- API keys. Only the HMAC is stored; the full key is shown to the user once.
-- -----------------------------------------------------------------------------
create table public.ai_api_key (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_user (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  -- Display form, e.g. "aczen_sk_live_…a1B2". Never enough to use the key.
  key_hint text not null check (char_length(key_hint) <= 40),
  status text not null default 'active' check (status in ('active', 'revoked')),
  -- Set when the key is rotated with a grace period: it keeps working until
  -- then and stops counting towards the user's key limit immediately.
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text check (char_length(revoked_reason) <= 200),
  revoked_by text check (revoked_by in ('user', 'admin', 'system')),
  rotated_from uuid references public.ai_api_key (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index ai_api_key_user_idx on public.ai_api_key (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- One row per gateway request (admitted or denied for a known key).
-- -----------------------------------------------------------------------------
create table public.ai_usage_event (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id uuid references public.ai_user (id) on delete cascade,
  key_id uuid references public.ai_api_key (id) on delete set null,
  endpoint text not null check (char_length(endpoint) <= 100),
  status_code smallint not null,
  outcome text not null check (char_length(outcome) <= 60),
  latency_ms int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost numeric(18,6) not null default 0,
  streamed boolean not null default false,
  request_id text check (char_length(request_id) <= 64)
);

create index ai_usage_event_time_idx on public.ai_usage_event (occurred_at desc);
create index ai_usage_event_user_time_idx on public.ai_usage_event (user_id, occurred_at desc);

-- -----------------------------------------------------------------------------
-- Daily rollups. Quota and budget checks read these, never the event table,
-- so admission stays O(1) no matter how much history accumulates.
-- -----------------------------------------------------------------------------
create table public.ai_usage_daily (
  user_id uuid not null references public.ai_user (id) on delete cascade,
  day date not null,
  requests int not null default 0,          -- admitted requests
  ok_requests int not null default 0,
  error_requests int not null default 0,
  denied_requests int not null default 0,   -- rejected by limits/switches
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost numeric(18,6) not null default 0,
  primary key (user_id, day)
);

create index ai_usage_daily_day_idx on public.ai_usage_daily (day);

create table public.ai_spend_daily (
  day date primary key,
  requests int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost numeric(18,6) not null default 0
);

-- -----------------------------------------------------------------------------
-- Rate limiting primitives.
-- -----------------------------------------------------------------------------

-- Token buckets: per-user RPM, global RPM, and denial-log throttles.
create table public.ai_token_bucket (
  subject text primary key check (char_length(subject) <= 120),
  tokens double precision not null,
  updated_at timestamptz not null
);

-- In-flight request leases for the concurrency limit. A lease that is never
-- released (function crash) expires on its own.
create table public.ai_inflight (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_user (id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index ai_inflight_user_idx on public.ai_inflight (user_id, expires_at);

-- Fixed windows feeding the upstream circuit breaker.
create table public.ai_breaker_window (
  window_start timestamptz primary key,
  total int not null default 0,
  failures int not null default 0
);

-- -----------------------------------------------------------------------------
-- Security ledgers.
-- -----------------------------------------------------------------------------
create table public.ai_auth_attempt (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  scope text not null check (scope in ('user', 'admin')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  -- HMAC of the submitted email for per-account throttling; null for admin.
  subject_hash text check (subject_hash ~ '^[0-9a-f]{64}$'),
  succeeded boolean not null
);

create index ai_auth_attempt_ip_idx on public.ai_auth_attempt (scope, ip_hash, occurred_at desc);
create index ai_auth_attempt_subject_idx on public.ai_auth_attempt (subject_hash, occurred_at desc)
  where subject_hash is not null;
create index ai_auth_attempt_time_idx on public.ai_auth_attempt (scope, occurred_at desc);

create table public.ai_admin_audit (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor text not null default 'admin' check (actor in ('admin', 'system', 'user')),
  action text not null check (char_length(action) <= 80),
  target_type text check (char_length(target_type) <= 40),
  target_id text check (char_length(target_id) <= 80),
  reason text check (char_length(reason) <= 500),
  details jsonb not null default '{}'::jsonb,
  ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$')
);

create index ai_admin_audit_time_idx on public.ai_admin_audit (occurred_at desc);

-- Alert de-duplication: one email per (kind, period).
create table public.ai_alert (
  id bigint generated always as identity primary key,
  kind text not null check (char_length(kind) <= 60),
  period text not null check (char_length(period) <= 60),
  sent_at timestamptz not null default now(),
  unique (kind, period)
);

-- -----------------------------------------------------------------------------
-- Lock everything down.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'ai_settings', 'ai_user', 'ai_api_key', 'ai_usage_event', 'ai_usage_daily',
    'ai_spend_daily', 'ai_token_bucket', 'ai_inflight', 'ai_breaker_window',
    'ai_auth_attempt', 'ai_admin_audit', 'ai_alert'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- =============================================================================
-- Functions
-- =============================================================================

-- IST calendar helpers.
create or replace function public.ai_ist_today()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

create or replace function public.ai_ist_month_start()
returns date language sql stable set search_path = public as $$
  select date_trunc('month', now() at time zone 'Asia/Kolkata')::date
$$;

create or replace function public.ai_month_spend()
returns numeric language sql stable set search_path = public as $$
  select coalesce(sum(cost), 0) from public.ai_spend_daily where day >= public.ai_ist_month_start()
$$;

-- -----------------------------------------------------------------------------
-- Token bucket. Atomic: the row is locked for the read-modify-write, so two
-- concurrent requests can never both spend the last token.
-- Returns allowed, the tokens left after this call, and seconds until the
-- next token when refused.
-- -----------------------------------------------------------------------------
create or replace function public.ai_take_token(
  p_subject text,
  p_rate_per_min numeric,
  p_capacity numeric,
  out allowed boolean,
  out remaining int,
  out retry_after int
)
language plpgsql set search_path = public as $$
declare
  v_now timestamptz := clock_timestamp();
  v_tokens double precision;
  v_updated timestamptz;
begin
  if p_rate_per_min <= 0 or p_capacity < 1 then
    allowed := false; remaining := 0; retry_after := 60;
    return;
  end if;

  insert into public.ai_token_bucket (subject, tokens, updated_at)
  values (p_subject, p_capacity, v_now)
  on conflict (subject) do nothing;

  select tokens, updated_at into v_tokens, v_updated
  from public.ai_token_bucket where subject = p_subject for update;

  v_tokens := least(
    p_capacity::double precision,
    v_tokens + greatest(0, extract(epoch from (v_now - v_updated))) * p_rate_per_min / 60.0
  );

  if v_tokens >= 1 then
    v_tokens := v_tokens - 1;
    allowed := true;
    retry_after := 0;
  else
    allowed := false;
    retry_after := greatest(1, ceil((1 - v_tokens) * 60.0 / p_rate_per_min))::int;
  end if;

  update public.ai_token_bucket set tokens = v_tokens, updated_at = v_now where subject = p_subject;
  remaining := floor(v_tokens)::int;
end $$;

-- -----------------------------------------------------------------------------
-- Effective limits for one user: override, else default x multiplier, then
-- scaled by the throttle factor once spend passes throttle_pct of budget.
-- The single source of truth used by admission AND both dashboards.
-- -----------------------------------------------------------------------------
create or replace function public.ai_effective_limits(p_user_id uuid)
returns table (
  rpm int, burst int, concurrency int, rpd int, tpd bigint, tpm bigint,
  max_keys int, throttled boolean, month_spend numeric
)
language plpgsql stable set search_path = public as $$
declare
  s public.ai_settings;
  u public.ai_user;
  v_scale numeric := 1;
  v_mult numeric;
begin
  select * into s from public.ai_settings where id = 1;
  select * into u from public.ai_user where id = p_user_id;

  month_spend := public.ai_month_spend();
  throttled := s.monthly_budget > 0 and month_spend >= s.monthly_budget * s.throttle_pct / 100.0;
  if throttled then v_scale := s.throttle_factor; end if;
  v_mult := s.limit_multiplier;

  rpm         := floor(coalesce(u.rpm_override::numeric, s.default_rpm * v_mult) * v_scale)::int;
  burst       := floor(coalesce(u.burst_override::numeric, s.default_burst * v_mult) * v_scale)::int;
  concurrency := greatest(case when rpm > 0 then 1 else 0 end,
                   floor(coalesce(u.concurrency_override::numeric, s.default_concurrency * v_mult) * v_scale))::int;
  rpd         := floor(coalesce(u.rpd_override::numeric, s.default_rpd * v_mult) * v_scale)::int;
  tpd         := floor(coalesce(u.tpd_override::numeric, s.default_tpd * v_mult) * v_scale)::bigint;
  tpm         := floor(coalesce(u.tpm_override::numeric, s.default_tpm * v_mult) * v_scale)::bigint;
  max_keys    := coalesce(u.max_keys_override, s.max_keys_per_user);

  -- A bucket needs room for at least one request, and a capacity below the
  -- per-minute rate would only ever make limits stricter than advertised.
  if rpm > 0 then burst := greatest(burst, 1); end if;

  return next;
end $$;

-- -----------------------------------------------------------------------------
-- Records a denied request against a known key. Throttled per key so a leaked
-- revoked key being hammered cannot turn into unbounded database writes.
-- -----------------------------------------------------------------------------
create or replace function public.ai_log_denial(
  p_user_id uuid, p_key_id uuid, p_endpoint text, p_status int, p_outcome text, p_request_id text
)
returns void language plpgsql set search_path = public as $$
declare t record;
begin
  select * into t from public.ai_take_token('denylog:' || coalesce(p_key_id::text, p_user_id::text), 30, 30);
  if not t.allowed then return; end if;

  insert into public.ai_usage_event (user_id, key_id, endpoint, status_code, outcome, request_id)
  values (p_user_id, p_key_id, left(p_endpoint, 100), p_status, p_outcome, left(p_request_id, 64));

  insert into public.ai_usage_daily (user_id, day, denied_requests)
  values (p_user_id, public.ai_ist_today(), 1)
  on conflict (user_id, day) do update set denied_requests = public.ai_usage_daily.denied_requests + 1;
end $$;

-- -----------------------------------------------------------------------------
-- ADMISSION. One round trip that decides whether a gateway request may reach
-- the harness, in this order:
--   key -> account -> kill switch -> breaker -> request size -> budget
--   -> daily/monthly quotas -> concurrency -> per-user RPM -> global RPM
-- and, if admitted, takes a concurrency lease and counts the request.
-- Serialised per user with an advisory lock so quota checks and the lease
-- cannot race between two concurrent requests from the same account.
-- -----------------------------------------------------------------------------
create or replace function public.ai_gateway_admit(
  p_key_hash text, p_endpoint text, p_request_id text, p_input_tokens int
)
returns jsonb language plpgsql set search_path = public as $$
declare
  s public.ai_settings;
  k public.ai_api_key;
  u public.ai_user;
  l record;
  b record;
  g record;
  v_now timestamptz := clock_timestamp();
  v_today date := public.ai_ist_today();
  v_month_start date := public.ai_ist_month_start();
  v_days_in_month int;
  v_today_spend numeric;
  v_today_requests int;
  v_today_tokens bigint;
  v_month_tokens bigint;
  v_inflight int;
  v_lease uuid;
  v_until_midnight int;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'status', 401, 'code', 'invalid_api_key');
  end if;

  select * into k from public.ai_api_key where key_hash = p_key_hash;
  if not found then
    return jsonb_build_object('ok', false, 'status', 401, 'code', 'invalid_api_key');
  end if;

  if k.status <> 'active' or (k.expires_at is not null and k.expires_at <= v_now) then
    perform public.ai_log_denial(k.user_id, k.id, p_endpoint, 401, 'revoked_api_key', p_request_id);
    return jsonb_build_object('ok', false, 'status', 401, 'code', 'revoked_api_key');
  end if;

  select * into u from public.ai_user where id = k.user_id;
  if u.status <> 'active' then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 403, 'account_suspended', p_request_id);
    return jsonb_build_object('ok', false, 'status', 403, 'code', 'account_suspended');
  end if;

  select * into s from public.ai_settings where id = 1;

  if s.global_kill then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 503, 'service_paused', p_request_id);
    return jsonb_build_object('ok', false, 'status', 503, 'code', 'service_paused', 'retry_after', 300);
  end if;

  if s.breaker_open_until is not null and s.breaker_open_until > v_now then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 503, 'upstream_unavailable', p_request_id);
    return jsonb_build_object('ok', false, 'status', 503, 'code', 'upstream_unavailable',
      'retry_after', greatest(1, ceil(extract(epoch from (s.breaker_open_until - v_now))))::int);
  end if;

  if p_input_tokens > s.max_input_tokens then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 413, 'input_too_large', p_request_id);
    return jsonb_build_object('ok', false, 'status', 413, 'code', 'input_too_large',
      'limit', s.max_input_tokens);
  end if;

  select * into l from public.ai_effective_limits(u.id);

  -- Budget: hard stop on the month, then the daily cap.
  if s.monthly_budget > 0 and l.month_spend >= s.monthly_budget * s.hard_stop_pct / 100.0 then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 503, 'budget_exhausted', p_request_id);
    return jsonb_build_object('ok', false, 'status', 503, 'code', 'budget_exhausted', 'retry_after', 3600);
  end if;

  v_days_in_month := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::int;
  select coalesce(max(cost), 0) into v_today_spend from public.ai_spend_daily where day = v_today;
  v_until_midnight := greatest(1, extract(epoch from (
    ((v_today + 1)::timestamp at time zone 'Asia/Kolkata') - v_now))::int);

  if s.monthly_budget > 0
     and v_today_spend >= s.monthly_budget / v_days_in_month * s.daily_cap_factor then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 503, 'daily_budget_exhausted', p_request_id);
    return jsonb_build_object('ok', false, 'status', 503, 'code', 'daily_budget_exhausted',
      'retry_after', v_until_midnight);
  end if;

  -- From here on, checks and the lease are serialised per user.
  perform pg_advisory_xact_lock(hashtextextended('ai_user:' || u.id::text, 0));

  select coalesce(max(requests), 0), coalesce(max(input_tokens + output_tokens), 0)
    into v_today_requests, v_today_tokens
  from public.ai_usage_daily where user_id = u.id and day = v_today;

  if v_today_requests >= l.rpd then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 429, 'daily_request_quota_exceeded', p_request_id);
    return jsonb_build_object('ok', false, 'status', 429, 'code', 'daily_request_quota_exceeded',
      'limit', l.rpd, 'retry_after', v_until_midnight);
  end if;

  if v_today_tokens >= l.tpd then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 429, 'daily_token_quota_exceeded', p_request_id);
    return jsonb_build_object('ok', false, 'status', 429, 'code', 'daily_token_quota_exceeded',
      'limit', l.tpd, 'retry_after', v_until_midnight);
  end if;

  select coalesce(sum(input_tokens + output_tokens), 0) into v_month_tokens
  from public.ai_usage_daily where user_id = u.id and day >= v_month_start;

  if v_month_tokens >= l.tpm then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 429, 'monthly_token_quota_exceeded', p_request_id);
    return jsonb_build_object('ok', false, 'status', 429, 'code', 'monthly_token_quota_exceeded',
      'limit', l.tpm, 'retry_after', 86400);
  end if;

  delete from public.ai_inflight where user_id = u.id and expires_at <= v_now;
  select count(*) into v_inflight from public.ai_inflight where user_id = u.id;

  if v_inflight >= l.concurrency then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 429, 'concurrency_limit_exceeded', p_request_id);
    return jsonb_build_object('ok', false, 'status', 429, 'code', 'concurrency_limit_exceeded',
      'limit', l.concurrency, 'retry_after', 2);
  end if;

  select * into b from public.ai_take_token('user:' || u.id::text, l.rpm, l.burst);
  if not b.allowed then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 429, 'rate_limit_exceeded', p_request_id);
    return jsonb_build_object('ok', false, 'status', 429, 'code', 'rate_limit_exceeded',
      'limit', l.rpm, 'retry_after', b.retry_after);
  end if;

  select * into g from public.ai_take_token('global', s.global_rpm, s.global_rpm);
  if not g.allowed then
    perform public.ai_log_denial(u.id, k.id, p_endpoint, 429, 'platform_busy', p_request_id);
    return jsonb_build_object('ok', false, 'status', 429, 'code', 'platform_busy',
      'retry_after', g.retry_after);
  end if;

  insert into public.ai_inflight (user_id, expires_at)
  values (u.id, v_now + interval '120 seconds')
  returning id into v_lease;

  insert into public.ai_usage_daily (user_id, day, requests)
  values (u.id, v_today, 1)
  on conflict (user_id, day) do update set requests = public.ai_usage_daily.requests + 1;

  return jsonb_build_object(
    'ok', true,
    'user_id', u.id,
    'key_id', k.id,
    'lease_id', v_lease,
    'max_output_tokens', s.max_output_tokens,
    'throttled', l.throttled,
    'limits', jsonb_build_object(
      'rpm', l.rpm, 'rpm_remaining', b.remaining,
      'rpd', l.rpd, 'rpd_remaining', greatest(0, l.rpd - v_today_requests - 1),
      'tpd', l.tpd, 'tpd_remaining', greatest(0, l.tpd - v_today_tokens),
      'tpm', l.tpm, 'tpm_remaining', greatest(0, l.tpm - v_month_tokens)
    )
  );
end $$;

-- -----------------------------------------------------------------------------
-- FINALIZE. Releases the lease, meters tokens and cost, feeds the breaker and
-- claims the once-a-minute rules evaluation. Called exactly once per admitted
-- request (the lease expiry covers the case where it never is).
-- -----------------------------------------------------------------------------
create or replace function public.ai_gateway_finalize(
  p_lease_id uuid,
  p_user_id uuid,
  p_key_id uuid,
  p_endpoint text,
  p_status int,
  p_outcome text,
  p_latency_ms int,
  p_input_tokens int,
  p_output_tokens int,
  p_streamed boolean,
  p_request_id text,
  p_upstream_failure boolean
)
returns jsonb language plpgsql set search_path = public as $$
declare
  s public.ai_settings;
  v_now timestamptz := clock_timestamp();
  v_today date := public.ai_ist_today();
  v_in int := greatest(0, coalesce(p_input_tokens, 0));
  v_out int := greatest(0, coalesce(p_output_tokens, 0));
  v_cost numeric(18,6);
  v_ok boolean := p_status between 200 and 399;
  v_window timestamptz;
  v_total int;
  v_failures int;
  v_claim boolean := false;
  v_breaker_opened boolean := false;
begin
  delete from public.ai_inflight where id = p_lease_id;

  select * into s from public.ai_settings where id = 1;
  v_cost := (v_in * s.price_input_per_mtok + v_out * s.price_output_per_mtok) / 1000000.0;

  insert into public.ai_usage_event (
    user_id, key_id, endpoint, status_code, outcome, latency_ms,
    input_tokens, output_tokens, cost, streamed, request_id
  ) values (
    p_user_id, p_key_id, left(p_endpoint, 100), p_status, left(p_outcome, 60), greatest(0, p_latency_ms),
    v_in, v_out, v_cost, coalesce(p_streamed, false), left(p_request_id, 64)
  );

  insert into public.ai_usage_daily (user_id, day, ok_requests, error_requests, input_tokens, output_tokens, cost)
  values (p_user_id, v_today, case when v_ok then 1 else 0 end, case when v_ok then 0 else 1 end, v_in, v_out, v_cost)
  on conflict (user_id, day) do update set
    ok_requests = public.ai_usage_daily.ok_requests + excluded.ok_requests,
    error_requests = public.ai_usage_daily.error_requests + excluded.error_requests,
    input_tokens = public.ai_usage_daily.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_usage_daily.output_tokens + excluded.output_tokens,
    cost = public.ai_usage_daily.cost + excluded.cost;

  insert into public.ai_spend_daily (day, requests, input_tokens, output_tokens, cost)
  values (v_today, 1, v_in, v_out, v_cost)
  on conflict (day) do update set
    requests = public.ai_spend_daily.requests + 1,
    input_tokens = public.ai_spend_daily.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_spend_daily.output_tokens + excluded.output_tokens,
    cost = public.ai_spend_daily.cost + excluded.cost;

  -- Throttled to one write a minute per key so a busy key does not turn every
  -- request into an extra row update.
  update public.ai_api_key set last_used_at = v_now
  where id = p_key_id and (last_used_at is null or last_used_at < v_now - interval '1 minute');

  -- Circuit breaker: fixed windows of breaker_window_seconds. It only opens on
  -- a failure, so a success arriving after the cooldown cannot re-open it.
  v_window := to_timestamp(floor(extract(epoch from v_now) / s.breaker_window_seconds) * s.breaker_window_seconds);
  insert into public.ai_breaker_window (window_start, total, failures)
  values (v_window, 1, case when p_upstream_failure then 1 else 0 end)
  on conflict (window_start) do update set
    total = public.ai_breaker_window.total + 1,
    failures = public.ai_breaker_window.failures + excluded.failures
  returning total, failures into v_total, v_failures;

  if p_upstream_failure
     and v_total >= s.breaker_min_requests
     and v_failures * 100 >= s.breaker_error_pct * v_total
     and (s.breaker_open_until is null or s.breaker_open_until <= v_now) then
    update public.ai_settings
      set breaker_open_until = v_now + make_interval(secs => s.breaker_cooldown_seconds)
      where id = 1;
    v_breaker_opened := true;
  end if;

  update public.ai_settings set rules_evaluated_at = v_now
  where id = 1 and (rules_evaluated_at is null or rules_evaluated_at < v_now - interval '60 seconds')
  returning true into v_claim;

  return jsonb_build_object(
    'cost', v_cost,
    'evaluate_rules', coalesce(v_claim, false),
    'breaker_opened', v_breaker_opened
  );
end $$;

-- -----------------------------------------------------------------------------
-- Key creation and rotation, atomically enforcing the per-user key limit.
-- Custom SQLSTATEs so the API can branch without reading error text:
--   AZK01 key limit reached, AZK02 key to rotate not found, AZU01 account not active.
-- -----------------------------------------------------------------------------
create or replace function public.ai_create_key(
  p_user_id uuid,
  p_name text,
  p_key_hash text,
  p_key_hint text,
  p_rotated_from uuid,
  p_grace_seconds int
)
returns jsonb language plpgsql set search_path = public as $$
declare
  u public.ai_user;
  v_max int;
  v_count int;
  v_id uuid;
  v_old public.ai_api_key;
begin
  select * into u from public.ai_user where id = p_user_id for update;
  if not found or u.status <> 'active' or u.must_change_password then
    raise exception 'account not active' using errcode = 'AZU01';
  end if;

  if p_rotated_from is not null then
    select * into v_old from public.ai_api_key
    where id = p_rotated_from and user_id = p_user_id and status = 'active'
      and (expires_at is null or expires_at > now())
    for update;
    if not found then
      raise exception 'key not found' using errcode = 'AZK02';
    end if;

    if coalesce(p_grace_seconds, 0) > 0 then
      update public.ai_api_key
        set expires_at = now() + make_interval(secs => least(p_grace_seconds, 86400))
        where id = v_old.id;
    else
      update public.ai_api_key
        set status = 'revoked', revoked_at = now(), revoked_reason = 'rotated', revoked_by = 'user'
        where id = v_old.id;
    end if;
  end if;

  select max_keys into v_max from public.ai_effective_limits(p_user_id);
  select count(*) into v_count from public.ai_api_key
  where user_id = p_user_id and status = 'active' and expires_at is null;

  if v_count >= v_max then
    raise exception 'key limit reached' using errcode = 'AZK01';
  end if;

  insert into public.ai_api_key (user_id, name, key_hash, key_hint, rotated_from)
  values (p_user_id, p_name, p_key_hash, p_key_hint, p_rotated_from)
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end $$;

-- -----------------------------------------------------------------------------
-- Dashboard for one team lead. No cost figures: those are for the admin only.
-- -----------------------------------------------------------------------------
create or replace function public.ai_user_dashboard(p_user_id uuid, p_days int)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 14), 1), 90);
  v_today date := public.ai_ist_today();
  v_month_start date := public.ai_ist_month_start();
  v_since timestamptz := now() - make_interval(days => v_days);
  result jsonb;
begin
  select jsonb_build_object(
    'limits', (select to_jsonb(l) - 'month_spend' from public.ai_effective_limits(p_user_id) l),
    'settings', (select jsonb_build_object(
        'max_input_tokens', max_input_tokens, 'max_output_tokens', max_output_tokens,
        'global_kill', global_kill,
        'breaker_open', breaker_open_until is not null and breaker_open_until > now())
      from public.ai_settings where id = 1),
    'today', (select jsonb_build_object(
        'requests', coalesce(max(requests), 0),
        'denied', coalesce(max(denied_requests), 0),
        'tokens', coalesce(max(input_tokens + output_tokens), 0))
      from public.ai_usage_daily where user_id = p_user_id and day = v_today),
    'month', (select jsonb_build_object(
        'requests', coalesce(sum(requests), 0),
        'tokens', coalesce(sum(input_tokens + output_tokens), 0))
      from public.ai_usage_daily where user_id = p_user_id and day >= v_month_start),
    'inflight', (select count(*) from public.ai_inflight where user_id = p_user_id and expires_at > now()),
    'series', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', g.day::date,
        'requests', coalesce(d.requests, 0),
        'ok', coalesce(d.ok_requests, 0),
        'errors', coalesce(d.error_requests, 0),
        'denied', coalesce(d.denied_requests, 0),
        'input_tokens', coalesce(d.input_tokens, 0),
        'output_tokens', coalesce(d.output_tokens, 0)) order by g.day), '[]'::jsonb)
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as g(day)
      left join public.ai_usage_daily d on d.user_id = p_user_id and d.day = g.day::date),
    'status_codes', (select coalesce(jsonb_agg(jsonb_build_object('status', status_code, 'count', c) order by status_code), '[]'::jsonb)
      from (select status_code, count(*) as c from public.ai_usage_event
            where user_id = p_user_id and occurred_at >= v_since group by status_code) x),
    'outcomes', (select coalesce(jsonb_agg(jsonb_build_object('outcome', outcome, 'count', c) order by c desc), '[]'::jsonb)
      from (select outcome, count(*) as c from public.ai_usage_event
            where user_id = p_user_id and occurred_at >= v_since group by outcome) x),
    'latency', (select jsonb_build_object(
        'p50', coalesce(percentile_cont(0.5) within group (order by latency_ms), 0),
        'p95', coalesce(percentile_cont(0.95) within group (order by latency_ms), 0),
        'count', count(*))
      from public.ai_usage_event
      where user_id = p_user_id and occurred_at >= v_since and outcome = 'ok'),
    'hourly', (select coalesce(jsonb_agg(jsonb_build_object(
        'hour', h.hour, 's2xx', coalesce(x.s2, 0), 's4xx', coalesce(x.s4, 0),
        's429', coalesce(x.s429, 0), 's5xx', coalesce(x.s5, 0)) order by h.hour), '[]'::jsonb)
      from generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') as h(hour)
      left join (
        select date_trunc('hour', occurred_at) as hour,
          count(*) filter (where status_code between 200 and 399) as s2,
          count(*) filter (where status_code between 400 and 499 and status_code <> 429) as s4,
          count(*) filter (where status_code = 429) as s429,
          count(*) filter (where status_code >= 500) as s5
        from public.ai_usage_event
        where user_id = p_user_id and occurred_at >= date_trunc('hour', now()) - interval '23 hours'
        group by 1
      ) x on x.hour = h.hour),
    'recent', (select coalesce(jsonb_agg(to_jsonb(r) order by r.occurred_at desc), '[]'::jsonb)
      from (select e.occurred_at, e.endpoint, e.status_code, e.outcome, e.latency_ms,
                   e.input_tokens, e.output_tokens, e.streamed, e.request_id, k.key_hint, k.name as key_name
            from public.ai_usage_event e
            left join public.ai_api_key k on k.id = e.key_id
            where e.user_id = p_user_id
            order by e.occurred_at desc limit 50) r)
  ) into result;
  return result;
end $$;

-- -----------------------------------------------------------------------------
-- Admin overview.
-- -----------------------------------------------------------------------------
create or replace function public.ai_admin_dashboard(p_days int)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 90);
  v_today date := public.ai_ist_today();
  v_month_start date := public.ai_ist_month_start();
  v_since timestamptz := now() - make_interval(days => v_days);
  result jsonb;
begin
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from public.ai_settings s where id = 1),
    'month_spend', public.ai_month_spend(),
    'today_spend', (select coalesce(max(cost), 0) from public.ai_spend_daily where day = v_today),
    'month', (select jsonb_build_object(
        'requests', coalesce(sum(requests), 0),
        'input_tokens', coalesce(sum(input_tokens), 0),
        'output_tokens', coalesce(sum(output_tokens), 0))
      from public.ai_spend_daily where day >= v_month_start),
    'ist_today', v_today,
    'days_in_month', extract(day from (v_month_start + interval '1 month' - interval '1 day'))::int,
    'day_of_month', extract(day from v_today)::int,
    'users', (select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status = 'active'),
        'suspended', count(*) filter (where status = 'suspended'),
        'disabled', count(*) filter (where status = 'disabled'),
        'pending_password', count(*) filter (where must_change_password))
      from public.ai_user),
    'active_keys', (select count(*) from public.ai_api_key
      where status = 'active' and (expires_at is null or expires_at > now())),
    'inflight', (select count(*) from public.ai_inflight where expires_at > now()),
    'spend_series', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', g.day::date,
        'cost', coalesce(d.cost, 0),
        'requests', coalesce(d.requests, 0),
        'tokens', coalesce(d.input_tokens + d.output_tokens, 0)) order by g.day), '[]'::jsonb)
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as g(day)
      left join public.ai_spend_daily d on d.day = g.day::date),
    'status_codes', (select coalesce(jsonb_agg(jsonb_build_object('status', status_code, 'count', c) order by status_code), '[]'::jsonb)
      from (select status_code, count(*) as c from public.ai_usage_event
            where occurred_at >= v_since group by status_code) x),
    'outcomes', (select coalesce(jsonb_agg(jsonb_build_object('outcome', outcome, 'count', c) order by c desc), '[]'::jsonb)
      from (select outcome, count(*) as c from public.ai_usage_event
            where occurred_at >= v_since group by outcome) x),
    'latency', (select jsonb_build_object(
        'p50', coalesce(percentile_cont(0.5) within group (order by latency_ms), 0),
        'p95', coalesce(percentile_cont(0.95) within group (order by latency_ms), 0),
        'count', count(*))
      from public.ai_usage_event where occurred_at >= now() - interval '24 hours' and outcome = 'ok'),
    'hourly', (select coalesce(jsonb_agg(jsonb_build_object(
        'hour', h.hour, 's2xx', coalesce(x.s2, 0), 's4xx', coalesce(x.s4, 0),
        's429', coalesce(x.s429, 0), 's5xx', coalesce(x.s5, 0)) order by h.hour), '[]'::jsonb)
      from generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') as h(hour)
      left join (
        select date_trunc('hour', occurred_at) as hour,
          count(*) filter (where status_code between 200 and 399) as s2,
          count(*) filter (where status_code between 400 and 499 and status_code <> 429) as s4,
          count(*) filter (where status_code = 429) as s429,
          count(*) filter (where status_code >= 500) as s5
        from public.ai_usage_event
        where occurred_at >= date_trunc('hour', now()) - interval '23 hours'
        group by 1
      ) x on x.hour = h.hour)
  ) into result;
  return result;
end $$;

-- Per-user table for the admin panel, with effective limits and usage.
create or replace function public.ai_admin_users()
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_today date := public.ai_ist_today();
  v_month_start date := public.ai_ist_month_start();
  result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x) order by x.month_cost desc, x.email), '[]'::jsonb) into result
  from (
    select u.id, u.email, u.display_name, u.team_name, u.status, u.status_reason,
           u.must_change_password, u.created_at, u.last_login_at,
           u.rpm_override, u.burst_override, u.concurrency_override, u.rpd_override,
           u.tpd_override, u.tpm_override, u.max_keys_override,
           l.rpm, l.burst, l.concurrency, l.rpd, l.tpd, l.tpm, l.max_keys, l.throttled,
           coalesce(t.requests, 0) as today_requests,
           coalesce(t.input_tokens + t.output_tokens, 0) as today_tokens,
           coalesce(m.requests, 0) as month_requests,
           coalesce(m.tokens, 0) as month_tokens,
           coalesce(m.denied, 0) as month_denied,
           coalesce(m.errors, 0) as month_errors,
           coalesce(m.cost, 0) as month_cost,
           (select count(*) from public.ai_api_key k
             where k.user_id = u.id and k.status = 'active' and (k.expires_at is null or k.expires_at > now())) as active_keys,
           (select max(k.last_used_at) from public.ai_api_key k where k.user_id = u.id) as last_used_at
    from public.ai_user u
    cross join lateral public.ai_effective_limits(u.id) l
    left join public.ai_usage_daily t on t.user_id = u.id and t.day = v_today
    left join lateral (
      select sum(requests) as requests, sum(input_tokens + output_tokens) as tokens,
             sum(denied_requests) as denied, sum(error_requests) as errors, sum(cost) as cost
      from public.ai_usage_daily d where d.user_id = u.id and d.day >= v_month_start
    ) m on true
  ) x;
  return result;
end $$;

-- -----------------------------------------------------------------------------
-- Anomaly candidates: active users whose last-hour request count is above the
-- floor AND above multiplier x their hourly average over the previous 7 days.
-- -----------------------------------------------------------------------------
create or replace function public.ai_anomaly_candidates(p_multiplier numeric, p_min int)
returns table (user_id uuid, email text, last_hour bigint, avg_hourly numeric)
language sql stable set search_path = public as $$
  with lh as (
    select e.user_id, count(*) as c
    from public.ai_usage_event e
    where e.occurred_at > now() - interval '1 hour' and e.user_id is not null
    group by e.user_id
    having count(*) >= p_min
  ),
  hist as (
    select d.user_id, sum(d.requests) / 168.0 as avg_hourly
    from public.ai_usage_daily d
    where d.day >= public.ai_ist_today() - 7 and d.day < public.ai_ist_today()
    group by d.user_id
  )
  select lh.user_id, u.email, lh.c, coalesce(hist.avg_hourly, 0)
  from lh
  join public.ai_user u on u.id = lh.user_id and u.status = 'active'
  left join hist on hist.user_id = lh.user_id
  where lh.c > p_multiplier * coalesce(hist.avg_hourly, 0)
$$;

-- -----------------------------------------------------------------------------
-- Retention. Run daily by the cron route.
-- -----------------------------------------------------------------------------
create or replace function public.ai_housekeeping()
returns jsonb language plpgsql set search_path = public as $$
declare v_events int; v_attempts int; v_windows int; v_leases int;
begin
  delete from public.ai_usage_event where occurred_at < now() - interval '90 days';
  get diagnostics v_events = row_count;
  delete from public.ai_auth_attempt where occurred_at < now() - interval '30 days';
  get diagnostics v_attempts = row_count;
  delete from public.ai_breaker_window where window_start < now() - interval '1 day';
  get diagnostics v_windows = row_count;
  delete from public.ai_inflight where expires_at < now();
  get diagnostics v_leases = row_count;
  delete from public.ai_token_bucket where updated_at < now() - interval '2 days';
  return jsonb_build_object('events', v_events, 'attempts', v_attempts, 'windows', v_windows, 'leases', v_leases);
end $$;

-- -----------------------------------------------------------------------------
-- Function privileges: service_role only.
-- -----------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'ai_ist_today()',
    'ai_ist_month_start()',
    'ai_month_spend()',
    'ai_take_token(text, numeric, numeric)',
    'ai_effective_limits(uuid)',
    'ai_log_denial(uuid, uuid, text, int, text, text)',
    'ai_gateway_admit(text, text, text, int)',
    'ai_gateway_finalize(uuid, uuid, uuid, text, int, text, int, int, int, boolean, text, boolean)',
    'ai_create_key(uuid, text, text, text, uuid, int)',
    'ai_user_dashboard(uuid, int)',
    'ai_admin_dashboard(int)',
    'ai_admin_users()',
    'ai_anomaly_candidates(numeric, int)',
    'ai_housekeeping()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
