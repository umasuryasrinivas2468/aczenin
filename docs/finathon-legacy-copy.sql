-- ============================================================================
-- Finathon — copy the 7 existing registrations into the new team tables
--
-- RUN IN: the Supabase web SQL editor, LIVE project jgwvyyqagabtpnomdwgo,
--         AFTER docs/finathon-team-registration-migration.sql has been run.
--
-- WRITTEN AGAINST THE REAL SCHEMA, confirmed 2026-09-22:
--   id             bigint                   not null
--   submitted_at   timestamptz              not null
--   team_lead_name text                     not null
--   roll_number    text                     not null
--   utr            text                     not null
--   ip_hash        text                     NULLABLE
--   email          text                     NULLABLE
--   phone          text                     NULLABLE
--
-- The draft in the design doc (§4.4) did NOT know email and phone existed. It
-- would have written 'legacy@aczen.in' and '6000000000' over seven teams' real
-- contact details — silent data loss inside the script meant to prevent it.
-- This version keeps every real value it can and substitutes a placeholder only
-- where the source is genuinely null or unusable.
--
-- SAFETY: reads finathon_registration, writes only to the new tables. The old
--         table is never modified, so if anything here is wrong nothing is lost
--         and the copy can be retried.
-- IDEMPOTENT: keyed on the UTR, so re-running will not duplicate.
-- ============================================================================


-- ============================================================================
-- STEP 1 — PRE-FLIGHT. Run this ALONE first and read the output.
--
-- The new tables have CHECK constraints the old one never had. A row that
-- violates one will abort the copy. This finds them BEFORE anything is written,
-- so a problem is a conversation rather than a half-finished migration.
--
-- EXPECTED OUTPUT: zero rows. Any row returned names a registration that needs
-- a decision before the copy runs.
-- ============================================================================

with normalised as (
  select
    r.id,
    r.team_lead_name,
    r.roll_number,
    r.utr,
    -- Digits only, so "+91 98765 43210" is judged on its number, not its format.
    nullif(regexp_replace(coalesce(r.phone, ''), '[^0-9]', '', 'g'), '') as phone_digits,
    lower(btrim(coalesce(r.email, ''))) as email_norm
  from public.finathon_registration r
),
resolved as (
  select
    n.*,
    -- Strip a +91 country code or a leading trunk 0 down to ten digits.
    case
      when length(n.phone_digits) = 12 and left(n.phone_digits, 2) = '91' then right(n.phone_digits, 10)
      when length(n.phone_digits) = 11 and left(n.phone_digits, 1) = '0'  then right(n.phone_digits, 10)
      else n.phone_digits
    end as phone_10
  from normalised n
)
select
  id,
  -- Each column below is the reason this row would fail. Null means that
  -- particular check is fine.
  case when char_length(btrim(team_lead_name)) not between 2 and 80
       then 'lead name length ' || char_length(btrim(team_lead_name)) end as bad_name,
  case when char_length(btrim(roll_number)) not between 4 and 24
       then 'roll length ' || char_length(btrim(roll_number)) end        as bad_roll,
  case when char_length(btrim(utr)) not between 8 and 30
       then 'utr length ' || char_length(btrim(utr)) end                 as bad_utr,
  -- Not a failure, just a notice: these are the rows that will receive a
  -- placeholder because the real value is missing or unusable.
  case when phone_10 is null or phone_10 !~ '^[6-9][0-9]{9}$'
       then 'phone will be placeheld' end                                as phone_note,
  case when email_norm = '' or email_norm !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
       then 'email will be placeheld' end                                as email_note
from resolved
where char_length(btrim(team_lead_name)) not between 2 and 80
   or char_length(btrim(roll_number))    not between 4 and 24
   or char_length(btrim(utr))            not between 8 and 30
   or phone_10 is null or phone_10 !~ '^[6-9][0-9]{9}$'
   or email_norm = '' or email_norm !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
order by id;

-- Duplicates WITHIN the old table. The new schema enforces one team per roll
-- number and one team per UTR; the old one enforced neither. If either query
-- returns a row, the copy will fail on that row and needs a decision first.
-- EXPECTED: zero rows from both.
select upper(btrim(roll_number)) as duplicate_roll, count(*) as rows
from public.finathon_registration
group by 1 having count(*) > 1;

select upper(btrim(utr)) as duplicate_utr, count(*) as rows
from public.finathon_registration
group by 1 having count(*) > 1;


-- ============================================================================
-- STEP 2 — THE COPY. Run only after Step 1 returns nothing unexpected.
--
-- One statement: the CTE inserts teams and returns their ids, and the outer
-- insert attaches one participant (the lead) to each. Doing it as a single
-- statement means it is one transaction — there is no window in which a team
-- exists with nobody on it.
-- ============================================================================

with source as (
  select
    r.id,
    r.submitted_at,
    btrim(r.team_lead_name)                                             as team_lead_name,
    btrim(r.roll_number)                                                as roll_number,
    r.utr,
    -- ip_hash is nullable on the old table but NOT NULL on the new one, because
    -- a null there silently defeats the rate limit. A marker string preserves
    -- "we never recorded this" without weakening the column.
    coalesce(r.ip_hash, 'legacy-unknown')                               as ip_hash,
    nullif(regexp_replace(coalesce(r.phone, ''), '[^0-9]', '', 'g'), '') as phone_digits,
    lower(btrim(coalesce(r.email, '')))                                 as email_norm
  from public.finathon_registration r
),
resolved as (
  select
    s.*,
    case
      when length(s.phone_digits) = 12 and left(s.phone_digits, 2) = '91' then right(s.phone_digits, 10)
      when length(s.phone_digits) = 11 and left(s.phone_digits, 1) = '0'  then right(s.phone_digits, 10)
      else s.phone_digits
    end as phone_10
  from source s
),
final as (
  select
    r.*,
    -- KEEP THE REAL PHONE when it survives normalisation. Placeholder only when
    -- there genuinely isn't a usable one — the new column is NOT NULL and
    -- pattern-checked, so a bad value cannot simply be carried across.
    case
      when r.phone_10 ~ '^[6-9][0-9]{9}$' then r.phone_10
      else '6000000000'
    end as phone_final,
    -- KEEP THE REAL EMAIL likewise. The placeholder is unique per row so an
    -- organiser can tell which registration it belongs to, and is obviously not
    -- a real address so nobody tries to mail it.
    case
      when r.email_norm <> ''
       and r.email_norm ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
       and char_length(r.email_norm) <= 160
      then r.email_norm
      else 'legacy-' || r.id || '@aczen.in'
    end as email_final
  from resolved r
),
inserted as (
  insert into public.finathon_team
    (team_name, utr, ip_hash, status, submitted_at, amount_paise)
  select
    -- Explicit and searchable rather than blank, so nobody mistakes a gap in
    -- history for a gap in the form. Unique by id, satisfying the unique index.
    'Legacy registration #' || f.id,
    f.utr,
    f.ip_hash,
    -- 'legacy' is its own status, not 'approved'. These predate the payment
    -- screenshot workflow and were never reviewed under it; calling them
    -- approved would assert a review that never happened.
    'legacy',
    f.submitted_at,
    49900
  from final f
  -- Idempotent: re-running skips anything already copied, matched the same way
  -- the unique index compares.
  where not exists (
    select 1 from public.finathon_team t
    where upper(btrim(t.utr)) = upper(btrim(f.utr))
  )
  returning id, utr
)
insert into public.finathon_participant
  (team_id, is_lead, position, full_name, college, roll_number, phone, email)
select
  i.id,
  true,
  0,
  f.team_lead_name,
  -- The one field the old form genuinely never collected.
  'Not collected (legacy)',
  f.roll_number,
  f.phone_final,
  f.email_final
from inserted i
join final f on upper(btrim(f.utr)) = upper(btrim(i.utr));


-- ============================================================================
-- STEP 3 — VERIFY. Run immediately after Step 2.
--
-- All three numbers MUST be equal, and must equal 7.
-- If they disagree, STOP and report — finathon_registration is untouched, so
-- nothing is lost and the copy can be corrected and retried.
-- ============================================================================

select
  (select count(*) from public.finathon_registration)                    as old_rows,
  (select count(*) from public.finathon_team where status = 'legacy')    as copied_teams,
  (select count(*) from public.finathon_participant p
     join public.finathon_team t on t.id = p.team_id
    where t.status = 'legacy')                                           as copied_people;

-- How much real contact data survived the copy. Confirms the point of writing
-- this against the real schema rather than the draft: every row counted in
-- real_phones / real_emails would have been overwritten with a placeholder.
select
  count(*)                                              as legacy_people,
  count(*) filter (where phone <> '6000000000')         as real_phones_kept,
  count(*) filter (where email not like 'legacy-%@aczen.in') as real_emails_kept
from public.finathon_participant p
join public.finathon_team t on t.id = p.team_id
where t.status = 'legacy';
