-- ============================================================================
-- finathon_team.team_code — freeze every team's printed code
--
-- WHY: the dashboard used to DERIVE codes (ACZCGP-AIM-26001…) from submission
-- order, so deleting one team renumbered every team after it. Codes handed to
-- teams must never change. This stores each current code once; deleted codes
-- become permanent gaps and are never reused.
--
-- ORDER: run this BEFORE deploying the data.ts change that reads team_code
-- (PostgREST rejects a select naming a column that does not exist), and
-- BEFORE deleting any team (a delete first would shift the codes being frozen).
--
-- SAFE TO RE-RUN: every step is guarded; the backfill only fills NULLs.
-- Paste the whole file into the Supabase SQL editor. The last statement's
-- output is the report.
-- ============================================================================

begin;

-- Nullable at first: existing rows have no code until the backfill below fills them.
alter table public.finathon_team add column if not exists team_code text;

-- The backfill is an UPDATE, which would fire the touch trigger and stamp every
-- team's updated_at with "now", falsely marking all 36 as just edited.
alter table public.finathon_team disable trigger finathon_team_touch_updated_at;

-- Exactly the formula the dashboard used (submission time, id as the tie-break),
-- so every code on screen today is the code that gets stored.
with ordered as (
  select id,
         'ACZCGP-AIM-26' || lpad(row_number() over (order by submitted_at, id)::text, 3, '0') as code
  from public.finathon_team
)
update public.finathon_team t
set team_code = o.code
from ordered o
where o.id = t.id and t.team_code is null;

-- Back on in the same transaction, so no real edit can slip through untracked.
alter table public.finathon_team enable trigger finathon_team_touch_updated_at;

-- Hands out the serial for every future team. A sequence, not max()+1: two
-- teams registering at the same instant would both read the same max.
create sequence if not exists public.finathon_team_code_seq owned by public.finathon_team.team_code;

-- Continue from the highest serial stored, so the next team gets 037, not 001.
select setval('public.finathon_team_code_seq',
              greatest((select max(right(team_code, 3)::int) from public.finathon_team), 1));

-- New rows get a code automatically. finathon_register_team() inserts named
-- columns only, so it needs no change; it is SECURITY DEFINER, so it runs
-- nextval() as the owner. ponytail: lpad caps at 999 teams (1000 truncates to
-- "100" and the unique constraint rejects it); widen to 4 digits if that is ever near.
alter table public.finathon_team
  alter column team_code set default
    'ACZCGP-AIM-26' || lpad(nextval('public.finathon_team_code_seq')::text, 3, '0');

-- Every team must have a code from here on, and no two may share one.
alter table public.finathon_team alter column team_code set not null;

-- Guarded because ADD CONSTRAINT has no IF NOT EXISTS, and this file must re-run.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'finathon_team_team_code_key') then
    alter table public.finathon_team add constraint finathon_team_team_code_key unique (team_code);
  end if;
end $$;

-- Same lockdown as the tables: Supabase's default privileges would otherwise
-- grant the browser-facing roles use of this new sequence.
revoke all on sequence public.finathon_team_code_seq from anon, authenticated;

commit;

-- Report: one JSON cell. Team names only, no personal data.
select jsonb_pretty(jsonb_build_object(
  -- Must equal finathon_team's row count (36 on 2026-09-26).
  'teams_with_code', (select count(*) from public.finathon_team where team_code is not null),
  -- Must be 0.
  'teams_without_code', (select count(*) from public.finathon_team where team_code is null),
  -- The number the next registration will receive.
  'next_code', 'ACZCGP-AIM-26' || lpad(((select last_value from public.finathon_team_code_seq) + 1)::text, 3, '0'),
  -- The 5 teams about to be deleted, now with their stored code.
  'targets', (select jsonb_agg(jsonb_build_object('id', id, 'code', team_code, 'team_name', team_name)
                               order by team_code)
              from public.finathon_team
              where team_code in ('ACZCGP-AIM-26001','ACZCGP-AIM-26002','ACZCGP-AIM-26003',
                                  'ACZCGP-AIM-26006','ACZCGP-AIM-26032'))
)) as team_code_report;
