-- ============================================================================
-- Finathon 2026 — challenge selection (first come, first served)
--
-- RUN THIS IN: the Supabase web SQL editor, on the LIVE project
--              jgwvyyqagabtpnomdwgo — the same project that holds finathon_team.
--
-- SAFETY: ADDITIVE ONLY. One new table, two indexes, one function. Nothing that
--         exists is dropped, renamed or altered. IDEMPOTENT: safe to run twice.
--
-- THE RULES THIS FILE ENFORCES
--   * A team picks exactly one challenge, once. Unique index on team_id.
--   * Seats per track: CRM 10, HRM 10, Finance 80. Counted inside the function
--     under a per-track advisory lock, so two teams racing for the last seat
--     cannot both get it.
--   * Only an email that belongs to a registered participant can claim, and it
--     claims for THAT participant's team. Rejected teams cannot claim.
--
-- The seat caps are ALSO written in src/lib/finathon/challenges.ts for display.
-- This function is the authority; change both in the same commit.
-- ============================================================================


create table if not exists public.finathon_challenge_claim (
  id              bigint generated always as identity primary key,

  -- on delete cascade: removing a fraudulent team frees its seat.
  team_id         bigint not null
    references public.finathon_team(id) on delete cascade,

  track           text not null check (track in ('crm','hrm','finance')),

  -- The challenge id from src/lib/finathon/challenges.ts. The database does not
  -- know the challenge list; the API validates the id against the track.
  challenge_id    text not null check (char_length(challenge_id) between 1 and 40),

  -- Which member pressed the button, for the organisers' audit trail.
  claimed_by      bigint not null
    references public.finathon_participant(id) on delete cascade,

  claimed_at      timestamptz not null default now()
);

-- One claim per team. This is the "you cannot change your pick" rule.
create unique index if not exists finathon_challenge_claim_team_key
  on public.finathon_challenge_claim (team_id);

-- The seat count is "claims in this track", run on every claim.
create index if not exists finathon_challenge_claim_track_idx
  on public.finathon_challenge_claim (track);

-- The claim looks a participant up by email. Emails are stored lowercased by
-- the registration API; lower(btrim()) also covers legacy rows that were not.
create index if not exists finathon_participant_email_idx
  on public.finathon_participant (lower(btrim(email)));


-- Same lockdown as every other Finathon table: RLS forced, zero policies,
-- grants revoked. Only service_role (server-side) can touch it.
alter table public.finathon_challenge_claim enable row level security;
alter table public.finathon_challenge_claim force  row level security;
revoke all on public.finathon_challenge_claim from anon, authenticated;


-- ============================================================================
-- The claim. One transaction: find the team, check it has not already picked,
-- check the track has a seat, take it.
--
-- Error codes the API maps to sentences:
--   P0201  email is not a registered participant (or the team was rejected)
--   P0202  the track is full
--   P0203  the email is registered on more than one team — organisers resolve
--
-- A team that has ALREADY claimed gets its existing claim back with
-- already_claimed = true rather than an error, so re-entering your email is
-- also how you look up what your team picked.
-- ============================================================================

create or replace function public.finathon_claim_challenge(
  p_email        text,
  p_track        text,
  p_challenge_id text
)
returns table (
  team_name       text,
  track           text,
  challenge_id    text,
  seat            integer,
  already_claimed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
-- The OUT columns (track, challenge_id, team_name) share names with table
-- columns. Every reference below is alias-qualified anyway; this makes any
-- that is not resolve to the column rather than raise "ambiguous".
#variable_conflict use_column
declare
  v_email         text := lower(btrim(p_email));
  v_team_count     integer;
  v_team_id        bigint;
  v_team_name      text;
  v_participant_id bigint;
  v_cap            integer;
  v_taken          integer;
  v_existing       public.finathon_challenge_claim%rowtype;
begin
  v_cap := case p_track
    when 'crm'     then 10
    when 'hrm'     then 10
    when 'finance' then 80
  end;
  if v_cap is null then
    raise exception 'unknown track' using errcode = 'check_violation';
  end if;

  -- Which team does this email belong to? Counted by DISTINCT team first, so an
  -- email typed for two people on the same team is fine, while one that is on
  -- two different teams is refused rather than silently picking one.
  select count(distinct p.team_id)
    into v_team_count
    from public.finathon_participant p
    join public.finathon_team t on t.id = p.team_id
   where lower(btrim(p.email)) = v_email
     and t.status <> 'rejected';

  if v_team_count = 0 then
    raise exception 'email not registered' using errcode = 'P0201';
  elsif v_team_count > 1 then
    raise exception 'email on multiple teams' using errcode = 'P0203';
  end if;

  select p.id, p.team_id, t.team_name
    into v_participant_id, v_team_id, v_team_name
    from public.finathon_participant p
    join public.finathon_team t on t.id = p.team_id
   where lower(btrim(p.email)) = v_email
     and t.status <> 'rejected'
   order by p.position
   limit 1;

  -- LOCK ORDER: team, then track. Every caller takes them in this order, so
  -- there is no cycle and no deadlock.
  --   team lock  — two members of one team pressing at once: the second waits,
  --                then sees the first one's claim below.
  --   track lock — two teams racing for the last seat: the second waits, then
  --                counts the first one's row and finds the track full.
  -- Transaction-scoped, so both are released on commit or rollback.
  perform pg_advisory_xact_lock(hashtext('finathon_claim_team'), v_team_id::integer);
  perform pg_advisory_xact_lock(hashtext('finathon_claim_track'), hashtext(p_track));

  select * into v_existing
    from public.finathon_challenge_claim c
   where c.team_id = v_team_id;

  if found then
    return query
      select v_team_name,
             v_existing.track,
             v_existing.challenge_id,
             (select count(*)::integer
                from public.finathon_challenge_claim c2
               where c2.track = v_existing.track
                 and c2.id <= v_existing.id),
             true;
    return;
  end if;

  select count(*) into v_taken
    from public.finathon_challenge_claim c
   where c.track = p_track;

  if v_taken >= v_cap then
    raise exception 'track full' using errcode = 'P0202';
  end if;

  insert into public.finathon_challenge_claim (team_id, track, challenge_id, claimed_by)
  values (v_team_id, p_track, p_challenge_id, v_participant_id);

  return query select v_team_name, p_track, p_challenge_id, v_taken + 1, false;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and this is SECURITY DEFINER.
-- Without these revokes anyone holding the public anon key could call it.
revoke all on function public.finathon_claim_challenge(text, text, text) from public;
revoke all on function public.finathon_claim_challenge(text, text, text) from anon;
revoke all on function public.finathon_claim_challenge(text, text, text) from authenticated;


-- ============================================================================
-- VERIFY
-- ============================================================================

-- Expect one row, rls_enabled = true, rls_forced = true.
select c.relname, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'finathon_challenge_claim';

-- Expect ZERO rows.
select a.rolname as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral (values ('anon'),('authenticated'),('public')) as r(rolname)
join pg_roles a on a.rolname = r.rolname
where n.nspname = 'public'
  and p.proname = 'finathon_claim_challenge'
  and has_function_privilege(a.oid, p.oid, 'execute');

-- Seats taken so far, per track. Handy on the day.
-- select track, count(*) from public.finathon_challenge_claim group by track;
