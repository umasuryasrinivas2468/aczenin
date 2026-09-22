-- ============================================================================
-- Finathon 2026 — team registration schema
--
-- RUN THIS IN: the Supabase web SQL editor, on the LIVE project
--              jgwvyyqagabtpnomdwgo
--              NOT zpkvshwmbgomrycoeqqd, which is paused and holds no data.
--
-- SAFETY: this file is ADDITIVE ONLY. It creates new tables, indexes, one
--         function and one storage bucket. It does not drop, rename, alter or
--         delete anything. `finathon_registration` and every row in it is left
--         byte-for-byte untouched.
--
-- IDEMPOTENT: every statement is `if not exists` or `or replace`. Running this
--         file twice is safe and is the intended way to recover from a partial
--         run. Nothing here will error on a second pass.
--
-- SECTIONS 1-5 are safe to run now, in order, top to bottom.
-- SECTION 6 (copying your existing registrations) is NOT in this file on
--         purpose — see the note at the bottom. Do not improvise it.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — the team
-- ============================================================================

create table if not exists public.finathon_team (
  -- bigint identity rather than uuid as the primary key: it is the join target
  -- for participants, and a narrow sequential key keeps that index small and
  -- its inserts append-only rather than scattered across the btree.
  id              bigint generated always as identity primary key,

  -- The id that is allowed to leave the building. It appears in storage paths
  -- and admin URLs. A bigint there would let anyone who sees one path walk the
  -- rest by decrementing; a random uuid does not.
  public_id       uuid not null default gen_random_uuid(),

  -- timestamptz, never timestamp. A bare timestamp has no offset, so the same
  -- value means different instants depending on who reads it — and this event
  -- has a deadline that is enforced to the second.
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Bounds measured after btrim so "  A  " cannot pass as a 5-character name.
  team_name       text not null
    check (char_length(btrim(team_name)) between 2 and 80),

  -- Money as INTEGER PAISE. Never float, never numeric-with-implied-scale:
  -- 499.00 in binary floating point is not exactly 499.00, and a human
  -- reconciles this figure against a bank statement line by line.
  amount_paise    integer not null default 49900 check (amount_paise > 0),

  utr             text not null
    check (char_length(btrim(utr)) between 8 and 30),

  -- Object path inside the private bucket. Nullable ONLY so legacy rows, which
  -- have no screenshot, can be copied forward without inventing one.
  screenshot_path text,

  -- The review workflow. 'legacy' is its own state rather than an approved row
  -- with a flag, so "registrations that predate the new form" stays answerable
  -- with a single equality test forever.
  status          text not null default 'pending'
    check (status in ('pending','approved','rejected','legacy')),
  reviewed_at     timestamptz,
  review_note     text check (review_note is null or char_length(review_note) <= 500),

  -- NOT NULL, unlike finathon_registration.ip_hash. A null there silently
  -- defeats the per-source rate limit, which is the only reason the column
  -- exists. A constraint that can be satisfied by null is not a constraint.
  ip_hash         text not null
);

-- One UTR funds exactly one team. Functional index on upper(btrim(...)) so
-- "ABC123", " abc123 " and "abc123" collide — which is how a human actually
-- retypes a reference off a payment app screen.
create unique index if not exists finathon_team_utr_key
  on public.finathon_team (upper(btrim(utr)));

-- Same normalisation for team names, so two teams cannot register as
-- "Ledger Lions" and "ledger lions " and confuse the organisers at check-in.
create unique index if not exists finathon_team_name_key
  on public.finathon_team (upper(btrim(team_name)));

-- The dashboard's list view is ordered newest-first; without this it sorts the
-- whole table on every page load.
create index if not exists finathon_team_submitted_at_idx
  on public.finathon_team (submitted_at desc);

-- PARTIAL index: "what still needs review" is the dashboard's default view, and
-- pending rows are a shrinking minority as the event fills up. A partial index
-- stays small because approved and rejected rows are never stored in it at all.
create index if not exists finathon_team_pending_idx
  on public.finathon_team (submitted_at desc) where status = 'pending';


-- ============================================================================
-- SECTION 2 — the people
--
-- One table for everybody, lead included, rather than lead_* columns on the
-- team plus a separate members table. The reason is one specific rule: "a
-- student may only be on one team". Spread across two tables that rule cannot
-- be expressed by any single unique index and needs a trigger. In one table it
-- is one line, below, and the database enforces it without procedural code.
-- ============================================================================

create table if not exists public.finathon_participant (
  id           bigint generated always as identity primary key,

  -- on delete cascade: removing a fraudulent team must not leave its members
  -- behind as orphan rows still occupying the "one student, one team" index.
  team_id      bigint not null
    references public.finathon_team(id) on delete cascade,

  is_lead      boolean not null default false,

  -- 0 for the lead, 1..4 for members. Drives display order on the dashboard so
  -- the roster reads in the order it was typed rather than by insertion id.
  position     smallint not null check (position between 0 and 4),

  full_name    text not null check (char_length(btrim(full_name)) between 2 and 80),
  college      text not null check (char_length(btrim(college))   between 2 and 120),

  -- No pattern, deliberately. Colleges invent roll-number formats and any regex
  -- here would reject a real student on a page where they have already paid.
  -- Length is the only honest claim this column can make.
  roll_number  text not null check (char_length(btrim(roll_number)) between 4 and 24),

  -- Indian mobile: ten digits, first 6-9. Normalised by the API before it gets
  -- here, so any +91, spaces or hyphens the student typed are already gone.
  phone        text not null check (phone ~ '^[6-9][0-9]{9}$'),

  -- Deliberately permissive: one @, a dot after it, no whitespace. A strict
  -- RFC 5322 regex rejects addresses that real universities really issue.
  email        text not null
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
           and char_length(email) <= 160)
);

-- THE rule: one student, one team. This single line is why participants are one
-- table. Normalised the same way as the UTR so case and padding cannot dodge it.
create unique index if not exists finathon_participant_roll_key
  on public.finathon_participant (upper(btrim(roll_number)));

-- Exactly one lead per team. Partial unique index — it constrains only the rows
-- where is_lead is true, leaving members unconstrained on that column.
create unique index if not exists finathon_participant_one_lead_idx
  on public.finathon_participant (team_id) where is_lead;

-- No two people on the same team may hold the same slot. Catches a retry that
-- half-inserted before the transaction rolled back.
create unique index if not exists finathon_participant_position_idx
  on public.finathon_participant (team_id, position);

-- Postgres does NOT automatically index foreign keys. Without this, the delete
-- cascade sequentially scans every participant row for each team removed, and
-- the dashboard's per-team roster lookup does the same on every page render.
create index if not exists finathon_participant_team_id_idx
  on public.finathon_participant (team_id);


-- ============================================================================
-- SECTION 3 — the rate-limit ledger
--
-- Separate from finathon_team ON PURPOSE. The existing limiter counts rows in
-- the table of SUCCESSFUL saves, which means every 400, 409 and 500 is free —
-- an attacker pays nothing for malformed requests and never increments the
-- counter. Harmless while the body is a small JSON object; the moment a 5 MB
-- file upload is in the path it means unbounded bodies get processed before the
-- limiter is ever consulted.
--
-- This mirrors how axe_auth_attempt already protects the login routes. The
-- pattern was already in this database; the registration route just never
-- used it.
-- ============================================================================

create table if not exists public.finathon_register_attempt (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  ip_hash     text not null,
  -- Every outcome is recorded, which is the entire point. 'rejected' covers
  -- validation failures and duplicates; 'error' covers our own faults.
  outcome     text not null check (outcome in ('accepted','rejected','error'))
);

-- The limiter's only query is "attempts from this ip_hash since <time>".
-- Composite, ip_hash first because it is the equality test, occurred_at second
-- and descending because it is the range scan. Column order here IS the
-- difference between an index scan and a sequential one.
create index if not exists finathon_register_attempt_lookup_idx
  on public.finathon_register_attempt (ip_hash, occurred_at desc);


-- ============================================================================
-- SECTION 4 — lock the tables down
--
-- Same posture as every other table in this database: RLS enabled AND forced,
-- ZERO policies, grants revoked from anon and authenticated.
--
-- Three independent layers, deliberately:
--   1. RLS with no policy DENIES. There is nothing to satisfy.
--   2. FORCE applies RLS to the table owner too, so owning the table is not a
--      way around it.
--   3. The revoke removes the privilege underneath, so even if a policy were
--      added by accident the grant would still be missing.
--
-- Only service_role reaches these, and service_role is only ever used
-- server-side. The browser never holds a key that can read this data.
-- ============================================================================

alter table public.finathon_team               enable row level security;
alter table public.finathon_team               force  row level security;
alter table public.finathon_participant        enable row level security;
alter table public.finathon_participant        force  row level security;
alter table public.finathon_register_attempt   enable row level security;
alter table public.finathon_register_attempt   force  row level security;

revoke all on public.finathon_team             from anon, authenticated;
revoke all on public.finathon_participant      from anon, authenticated;
revoke all on public.finathon_register_attempt from anon, authenticated;

-- EXPECTED ADVISOR OUTPUT — read this before "fixing" it.
-- Supabase's linter will report `rls_enabled_no_policy` as INFO on all three
-- tables. That is the design, not a defect. Adding a policy would WIDEN access.
-- Leave it.


-- ============================================================================
-- SECTION 5 — the atomic insert
--
-- PostgREST cannot span a transaction across two tables. Three sequential
-- inserts from the API would leave an orphaned team with no participants
-- whenever call two fails — and "the network blipped mid-registration" is
-- precisely the case that must not corrupt a registration somebody has paid
-- ₹499 for. One function, one transaction, all of it or none of it.
--
-- It also enforces team size, which no row-level CHECK can express: counting
-- sibling rows is not something a per-row constraint can see.
-- ============================================================================

create or replace function public.finathon_register_team(payload jsonb)
returns uuid
language plpgsql
security definer
-- search_path is set to EMPTY and every object below is schema-qualified.
-- A SECURITY DEFINER function runs with its owner's rights, so a mutable
-- search_path lets anyone who can create objects shadow a table name and have
-- the function operate on theirs instead. Empty plus full qualification closes
-- that off entirely. (The spec drafted `public, pg_temp`; this is stricter.)
set search_path = ''
as $$
declare
  v_team_id   bigint;
  v_public_id uuid;
  v_members   jsonb := payload->'members';
  v_count     integer := jsonb_array_length(v_members);
  v_member    jsonb;
  v_index     integer := 0;
  -- Holds which unique index a duplicate violated, so the exception block at
  -- the bottom can translate it into a code the API is allowed to see.
  v_constraint text;
begin
  -- Team size: lead + 2..4 members = 3..5 people. Raised as check_violation so
  -- the API can map it to a 400 and show the student a sentence, rather than
  -- surfacing a generic 500 after they have already paid.
  if v_count is null or v_count < 2 or v_count > 4 then
    raise exception 'team must have 3 to 5 members including the lead'
      using errcode = 'check_violation';
  end if;

  -- The team row first: participants need its id, and its unique indexes on
  -- utr and team_name are the cheapest place for a duplicate to fail.
  insert into public.finathon_team
    (team_name, utr, screenshot_path, ip_hash, amount_paise)
  values (
    payload->>'team_name',
    payload->>'utr',
    payload->>'screenshot_path',
    payload->>'ip_hash',
    -- coalesce so a caller that omits the amount still records the real price
    -- rather than writing a null into a not-null column.
    coalesce((payload->>'amount_paise')::integer, 49900)
  )
  returning id, public_id into v_team_id, v_public_id;

  -- The lead is a participant like any other, distinguished by is_lead and
  -- position 0 rather than by living in different columns.
  insert into public.finathon_participant
    (team_id, is_lead, position, full_name, college, roll_number, phone, email)
  values (
    v_team_id, true, 0,
    payload->'lead'->>'full_name',
    payload->'lead'->>'college',
    payload->'lead'->>'roll_number',
    payload->'lead'->>'phone',
    payload->'lead'->>'email'
  );

  -- Members in the order the student typed them, so position reflects the form.
  for v_member in select * from jsonb_array_elements(v_members) loop
    v_index := v_index + 1;
    insert into public.finathon_participant
      (team_id, is_lead, position, full_name, college, roll_number, phone, email)
    values (
      v_team_id, false, v_index,
      v_member->>'full_name',
      v_member->>'college',
      v_member->>'roll_number',
      v_member->>'phone',
      v_member->>'email'
    );
  end loop;

  -- The unguessable id, for the storage path and the confirmation screen. The
  -- bigint id never leaves the server.
  return v_public_id;

-- ---------------------------------------------------------------------------
-- WHY THIS EXCEPTION BLOCK EXISTS
--
-- Three different unique indexes can reject this insert, and the student needs
-- a different sentence for each: "that team name is taken", "that UTR is
-- already used", "that roll number is already on another team".
--
-- Postgres reports all three as SQLSTATE 23505. The constraint name is in the
-- error MESSAGE — but the API's error handler deliberately strips the message,
-- because on a unique violation Postgres also writes the offending row into it
-- ("Key (utr)=(123456789012) already exists"), and that would put a real bank
-- reference into a log line.
--
-- So the translation has to happen HERE, where the constraint name is available
-- as structured data and nothing leaks. Each case re-raises with its own
-- SQLSTATE and a message containing no row values, and the API branches on the
-- code alone.
-- ---------------------------------------------------------------------------
exception
  when unique_violation then
    -- get stacked diagnostics reads the constraint name as a FIELD rather than
    -- scraping it out of the message text with a regex, which would break the
    -- first time Postgres rewords anything.
    get stacked diagnostics v_constraint = constraint_name;

    if v_constraint = 'finathon_team_name_key' then
      raise exception 'team name already registered' using errcode = 'P0101';
    elsif v_constraint = 'finathon_team_utr_key' then
      raise exception 'utr already used' using errcode = 'P0102';
    elsif v_constraint = 'finathon_participant_roll_key' then
      raise exception 'roll number already registered' using errcode = 'P0103';
    end if;

    -- An unrecognised unique violation is a bug, not a user error. Re-raise it
    -- unchanged rather than mislabelling it as one of the three above.
    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- THIS REVOKE IS THE MOST IMPORTANT LINE IN THE FILE.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default. A
-- SECURITY DEFINER function runs as its owner. Left alone, this function is
-- callable at /rest/v1/rpc/finathon_register_team by anyone holding the anon
-- key — and the anon key ships to every browser that loads the site.
--
-- There is already a precedent for getting this exact thing wrong in this
-- database: rls_auto_enable() is an existing SECURITY DEFINER function that
-- Supabase's advisor flags under lints 0028/0029 for precisely this reason.
-- ---------------------------------------------------------------------------
revoke all on function public.finathon_register_team(jsonb) from public;
revoke all on function public.finathon_register_team(jsonb) from anon;
revoke all on function public.finathon_register_team(jsonb) from authenticated;


-- ============================================================================
-- SECTION 5b — keep updated_at honest
--
-- Set in a trigger rather than by the application. An application-set timestamp
-- is only correct as long as every future caller remembers to set it; a trigger
-- is correct because it cannot be forgotten.
-- ============================================================================

create or replace function public.finathon_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- drop-then-create because `create trigger if not exists` does not exist in
-- Postgres. Dropping a trigger that does not exist is a no-op with `if exists`,
-- so this block stays idempotent.
drop trigger if exists finathon_team_touch_updated_at on public.finathon_team;
create trigger finathon_team_touch_updated_at
  before update on public.finathon_team
  for each row execute function public.finathon_touch_updated_at();

revoke all on function public.finathon_touch_updated_at() from public;
revoke all on function public.finathon_touch_updated_at() from anon;
revoke all on function public.finathon_touch_updated_at() from authenticated;


-- ============================================================================
-- SECTION 5c — the private storage bucket
--
-- public = false, a hard 5 MB ceiling, and a MIME allowlist enforced by storage
-- itself rather than only by our code. Two independent checks: the API sniffs
-- magic bytes before uploading, and the bucket refuses anything outside the
-- list even if our code is wrong.
--
-- NO storage.objects policies are created, and that is deliberate. With none,
-- only service_role can read or write — matching every table above. Admin reads
-- happen through short-lived signed URLs generated server-side.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finathon-payments', 'finathon-payments', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
-- Idempotent: re-running this file must not error on an existing bucket.
on conflict (id) do nothing;


-- ============================================================================
-- VERIFY — run this after the above and check the output
-- ============================================================================

-- Expect exactly 3 rows, all with rls_enabled = true and rls_forced = true.
select c.relname            as table_name,
       c.relrowsecurity     as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('finathon_team','finathon_participant','finathon_register_attempt')
order by c.relname;

-- Expect ZERO rows. Any row here means something can execute the insert
-- function that should not be able to.
select p.proname, a.rolname as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral (values ('anon'),('authenticated'),('public')) as r(rolname)
join pg_roles a on a.rolname = r.rolname
where n.nspname = 'public'
  and p.proname = 'finathon_register_team'
  and has_function_privilege(a.oid, p.oid, 'execute');

-- Expect one row: finathon-payments, public = false.
select id, name, public, file_size_limit from storage.buckets
where id = 'finathon-payments';


-- ============================================================================
-- SECTION 6 — COPYING YOUR EXISTING REGISTRATIONS IS NOT IN THIS FILE
--
-- This is the one step that can lose data, so it is the one step not written
-- blind.
--
-- The draft in docs/finathon-registration-rework-design.md §4.4 selects
-- `team_lead_name, roll_number, utr, ip_hash, submitted_at` from
-- finathon_registration. **Nobody has ever connected to this database.** That
-- column list comes from a migration file that was only ever verified against
-- the PAUSED project. If the live table differs by one column name, the copy
-- fails with 42703 — after these new tables already exist.
--
-- Run docs/finathon-step0-inventory.md first and paste back the output. The
-- copy is then written against the real column names, is idempotent on the UTR,
-- and is followed by a verification query asserting
--     old_rows = copied_teams = copied_people
-- with the rule: if they disagree, STOP. Nothing is lost either way, because
-- finathon_registration is never modified — the copy can simply be retried.
--
-- Sections 1-5 above do not depend on any of this. They create new tables and
-- reference nothing that already exists, which is why they are safe to run now.
-- ============================================================================
