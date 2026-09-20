-- Finathon 2026 team registrations, captured at aczen.in/Finathon/register and
-- read back at aczen.in/Finathon/axe/26.
--
-- === HOW THIS TABLE DIFFERS FROM EVERY OTHER TABLE IN THIS SCHEMA ==========
-- The analytics tables are built so that nothing identifying is ever written
-- down: the visitor hash rotates with a daily salt precisely so the rows stay
-- anonymous and outside DPDP Act 2023 / GDPR scope.
--
-- THIS TABLE IS THE OPPOSITE AND MUST BE TREATED AS SUCH. A registration is a
-- named person: their name, their college roll number, and a bank transaction
-- reference for a payment they made. That is personal data by any reading, it
-- cannot be hashed away (the point of collecting it is to read it back and
-- contact them), and so the protections here are access controls rather than
-- anonymisation:
--
--   * RLS enabled AND forced, with zero policies, and all privileges revoked
--     from anon and authenticated — same as the analytics tables. The anon key
--     ships to every visitor, so it must be able to read and write nothing.
--   * Reachable only through the service-role key, server-side, behind the
--     password gate on /Finathon/axe/26.
--   * Write errors from this table must never be logged verbatim: Postgres puts
--     the offending row's values in a constraint violation message, which for
--     this table means a real name in a log line. See the SupabaseWriteError
--     path in src/lib/axe/supabase.ts, which extracts only SQLSTATE and hint.
--
-- Retention is a decision for the organisers, not a default: these rows should
-- be deleted once the hiring evaluation closes and the payments are reconciled.
-- ===========================================================================

create table public.finathon_registration (
  -- Identity rather than serial, matching the analytics tables: identity is the
  -- SQL-standard form and cannot be silently overridden by an explicit insert.
  id bigint generated always as identity primary key,

  -- timestamptz, never timestamp. The site serves India while the database runs
  -- in ap-southeast-1, so a naive timestamp would mix the two zones and every
  -- "registered today" figure would be wrong near midnight.
  submitted_at timestamptz not null default now(),

  -- The team lead only. One row per team by design — collecting every member's
  -- details would triple the form and the organisers chase the lead anyway.
  team_lead_name text not null
    check (char_length(btrim(team_lead_name)) between 2 and 80),

  -- College roll number, stored as submitted but compared case-insensitively
  -- through the unique index below. Bounds rather than a format check: roll
  -- number schemes differ per college and this event is open to every college
  -- in Telangana, so a regex tuned to one of them would reject valid entries.
  roll_number text not null
    check (char_length(btrim(roll_number)) between 4 and 24),

<<<<<<< HEAD
  -- How the organisers reach this team. Both are required: the shortlist and
  -- the offer letters go out by email, and the day-of logistics ("your team is
  -- called for judging in ten minutes") only work by phone.
  --
  -- Deliberately NOT unique, unlike roll_number and utr. A shared team inbox or
  -- one member's phone standing in for the team is normal and harmless, and the
  -- roll number already stops the same person registering twice. A unique
  -- constraint here would reject legitimate entries to catch a duplicate that
  -- is already caught.
  email text not null
    -- The loosest check that still rejects a typo'd address: something, an @,
    -- something, a dot, something. Anything stricter starts rejecting valid
    -- addresses — the full grammar permits far more than people expect — and a
    -- registration bounced for a "wrong" address that was right is worse than
    -- one that has to be chased.
    check (btrim(email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- Stored as the digits the person typed, normalised in the API to strip
  -- spaces, dashes and brackets. Bounded rather than pinned to ten digits so a
  -- +91 prefix or a landline still passes.
  phone text not null
    check (char_length(btrim(phone)) between 10 and 16),

=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  -- The UPI transaction reference the team pastes after paying. This is what
  -- makes the row reconcilable against the bank statement; without it a
  -- registration is an unverifiable claim to have paid.
  utr text not null
    check (char_length(btrim(utr)) between 8 and 30),

  -- sha256(ip + salt + date), same daily-rotating construction as the analytics
  -- tables. Present ONLY so the API route can rate-limit submissions per source
  -- without storing an IP. It rotates daily, so it is useless as a long-term
  -- identifier — which is the intent.
  ip_hash text
);

-- ---------------------------------------------------------------------------
-- Duplicate protection.
--
-- Both indexes are on upper(...) rather than the raw column. A team that
-- resubmits with "23R21A66D4" after "23r21a66d4" is the same team, and a plain
-- unique constraint would happily store both.
-- ---------------------------------------------------------------------------

-- One registration per team lead. The roll number is the stable identifier here
-- — names are not unique and are frequently retyped differently.
create unique index finathon_registration_roll_number_key
  on public.finathon_registration (upper(btrim(roll_number)));

-- One registration per payment. This is the constraint that actually matters:
-- without it, one payment could be pasted by several teams and the organisers
-- would not discover it until they reconciled the bank statement by hand.
create unique index finathon_registration_utr_key
  on public.finathon_registration (upper(btrim(utr)));

-- The dashboard reads newest-first and nothing else, so this is the only index
-- the read path needs.
create index finathon_registration_submitted_at_idx
  on public.finathon_registration (submitted_at desc);

-- Supports the per-source rate limit in the API route, which counts recent rows
-- for one hashed IP. Without it that count is a sequential scan on every
-- submission attempt.
create index finathon_registration_ip_hash_idx
  on public.finathon_registration (ip_hash, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Access control.
--
-- FORCE, not just ENABLE. Plain `enable row level security` is bypassed by the
-- table's owner, so a query running as the owning role would still read every
-- row; FORCE applies the policies to the owner too. With zero policies defined,
-- the effective permission for every role except service_role is nothing.
-- ---------------------------------------------------------------------------
alter table public.finathon_registration enable row level security;
alter table public.finathon_registration force row level security;

-- Belt and braces alongside RLS. RLS filters rows; this removes the table-level
-- privilege outright, so the anon key cannot so much as attempt a read.
revoke all on public.finathon_registration from anon, authenticated;
