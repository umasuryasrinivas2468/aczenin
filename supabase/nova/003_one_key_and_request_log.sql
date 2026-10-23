-- =============================================================================
-- Nova API — one active key per email, and a per-request log for the user
-- dashboard's success/failure analytics. Requested by Teja 2026-09-29.
-- Run after 001_schema.sql. Re-runnable (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

-- One transaction so the index, table and function land together or not at all.
begin;

-- -----------------------------------------------------------------------------
-- One ACTIVE key per email, enforced by the database.
-- Partial (where revoked_at is null) so revoked keys stay as history and a user
-- can revoke and create a replacement. A unique index rather than an app-side
-- count: count-then-insert lets two simultaneous creates both pass, an index
-- cannot be raced — the second insert fails with 23505, which the portal maps
-- to "you already have a key".
-- -----------------------------------------------------------------------------
create unique index if not exists nova_api_key_one_active_per_email
  on public.nova_api_key (email) where revoked_at is null;

-- -----------------------------------------------------------------------------
-- Every authenticated API call: what was asked, what came back, why it failed.
-- Unauthenticated 401s (unknown key) are NOT logged: there is no key to
-- attribute them to, and logging them would let anyone fill this table.
-- -----------------------------------------------------------------------------
create table if not exists public.nova_api_request (
  -- bigint identity: high-volume append-only table, no need for uuid ordering cost.
  id bigint generated always as identity primary key,
  -- Set null (not cascade) so a user's history survives revoking the key.
  key_id uuid references public.nova_api_key(id) on delete set null,
  -- Denormalised owner, so "my calls" survives key rotation and needs no join.
  -- Cascade: removing someone from the allowlist removes their log too.
  email text not null references public.nova_allowlist(email) on delete cascade,
  occurred_at timestamptz not null default now(),
  -- Always GET/HEAD for data, but 405s for write verbs are worth showing too.
  method text not null,
  -- Path after /v1, e.g. "/invoices/inv_8f2c91a4"; capped to stop log bloat.
  path text not null check (length(path) <= 512),
  -- The raw query string, so a 400 can be shown next to what caused it.
  query text check (length(query) <= 2048),
  -- HTTP status returned to the caller.
  status integer not null check (status between 100 and 599),
  -- Our stable error code (unknown_filter, rate_limit_exceeded, …); null on 2xx.
  error_code text,
  -- The human message sent with the error, so the dashboard can say WHY.
  error_message text check (length(error_message) <= 500),
  -- Server-side handling time, for the latency chart.
  duration_ms integer not null check (duration_ms >= 0),
  -- Same id as the X-Request-Id header, so a user can quote it in support.
  request_id uuid not null
);
-- The dashboard's only access pattern: one user's calls, newest first.
create index if not exists nova_api_request_email_time_idx on public.nova_api_request (email, occurred_at desc);
-- Admin-wide charts scan by time across all users.
create index if not exists nova_api_request_time_idx on public.nova_api_request (occurred_at);
-- FK index, so revoking/deleting a key does not seq-scan the log.
create index if not exists nova_api_request_key_idx on public.nova_api_request (key_id);

-- Same lockdown as every nova_ table: RLS on, no policies, anon shut out.
alter table public.nova_api_request enable row level security;
revoke all on public.nova_api_request from anon, authenticated;
grant select, insert, delete on public.nova_api_request to service_role;

-- -----------------------------------------------------------------------------
-- The ONLY write the /v1 route performs. A narrow function instead of giving
-- /v1 the general novaWrite client keeps the design's rule intact: the public
-- API cannot write business data, only append to its own audit log.
-- -----------------------------------------------------------------------------
create or replace function public.nova_log_request(
  p_key_id uuid,
  p_email text,
  p_method text,
  p_path text,
  p_query text,
  p_status integer,
  p_error_code text,
  p_error_message text,
  p_duration_ms integer,
  p_request_id uuid
)
returns void
language sql
security definer
-- Empty search_path + qualified names: immune to search_path hijacking.
set search_path = ''
as $$
  -- left() truncates rather than failing the CHECKs: a log write must never error
  -- because a caller sent a very long URL.
  insert into public.nova_api_request
    (key_id, email, method, path, query, status, error_code, error_message, duration_ms, request_id)
  values
    (p_key_id, p_email, left(p_method, 10), left(p_path, 512), left(p_query, 2048),
     p_status, left(p_error_code, 64), left(p_error_message, 500), greatest(p_duration_ms, 0), p_request_id);
$$;

-- Default EXECUTE-to-PUBLIC removed; only the server may log.
revoke all on function public.nova_log_request(uuid, text, text, text, text, integer, text, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.nova_log_request(uuid, text, text, text, text, integer, text, text, integer, uuid) to service_role;

commit;
