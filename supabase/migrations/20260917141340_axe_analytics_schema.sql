-- Schema for the private founder analytics dashboard at aczen.in/axe.
-- Design rationale lives in docs/axe-analytics-dashboard-design.md; this file
-- only records the reasoning that a reader of the SQL alone would otherwise
-- have to guess at.
--
-- Guiding decision: these tables store RAW EVENTS, one row per occurrence,
-- rather than pre-aggregated counters. Counters are cheaper but can only ever
-- answer questions thought of in advance. Raw rows can be re-aggregated into
-- any future question, and detail discarded at write time is gone forever.


-- ---------------------------------------------------------------------------
-- page_view — one row per request served to a human or bot.
-- ---------------------------------------------------------------------------
create table public.page_view (
  -- Identity rather than serial: identity is the SQL-standard form and, unlike
  -- serial, cannot be silently overridden by an explicit insert of id.
  id bigint generated always as identity primary key,

  -- timestamptz, never timestamp. The site serves India while the database
  -- runs in ap-southeast-1; a naive timestamp would silently mix the two zones
  -- and every "today" figure on the dashboard would be wrong near midnight.
  occurred_at timestamptz not null default now(),

  -- The request path only (no query string, no host). Query strings carry
  -- campaign junk and occasionally personal data from mis-built links; the
  -- parts worth keeping are extracted into the utm_ columns below.
  path text not null,

  -- Host of the referrer, not the full referring URL. The host answers the
  -- question actually being asked ("is LinkedIn sending traffic?") without
  -- storing a full URL that may itself contain someone's identifiers.
  referrer_host text,

  -- Campaign attribution, split into columns rather than left in the query
  -- string so the dashboard can GROUP BY them without parsing text at read
  -- time on every query.
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- Supplied free by Vercel's edge geo on the incoming request, so there is no
  -- GeoIP lookup, no third-party call, and nothing to keep up to date.
  country text,
  city text,

  -- Constrained rather than free text: without the check, a typo in the
  -- collector ("Mobile") silently becomes a separate slice on the device chart
  -- and the split quietly stops adding up.
  device text not null default 'unknown'
    check (device in ('mobile', 'desktop', 'tablet', 'unknown')),

  -- Bots are recorded, never dropped. Discarding them at write time would make
  -- a crawler flood indistinguishable from real growth after the fact; keeping
  -- the flag lets every dashboard query filter them out while the raw record
  -- survives for when a number looks wrong and needs explaining.
  is_bot boolean not null default false,

  -- sha256(ip + user_agent + salt + date). The raw IP is NEVER stored: this
  -- yields unique-visitor counts while holding no personal data, which is what
  -- keeps the site consistent with the promises already published at /privacy,
  -- /gdpr and /cookies, and is why the collection needs no cookie banner.
  visitor_hash text not null,

  -- Ties a burst of pageviews to one browsing session, and is the join key
  -- that lets a lead be attributed back to the pages read before the form was
  -- submitted. Without it, conversion rate can only ever be a site-wide
  -- average and per-page conversion is impossible.
  session_id text
);

-- Serves the dashboard's default view (everything over a trailing window) and,
-- critically, the live-feed tile's `order by occurred_at desc limit 50`.
-- A BRIN index here would be far smaller and is the usual advice for
-- append-only time-series, but BRIN cannot satisfy ORDER BY, so it would force
-- a sort of the whole table for that tile. Revisit past a few million rows.
create index page_view_occurred_at_idx on public.page_view (occurred_at desc);

-- Composite, column order deliberate: equality predicate (path) first, range
-- (occurred_at) second. The reverse order cannot use the index for a
-- single-page lookup, which is the "top pages" table's whole query shape.
create index page_view_path_occurred_at_idx on public.page_view (path, occurred_at desc);

-- Counting distinct visitors is the single most expensive query the dashboard
-- runs, because it touches every row in the window rather than a filtered few.
create index page_view_visitor_hash_idx on public.page_view (visitor_hash, occurred_at desc);

-- Partial index: sessions are only ever looked up when joining a lead back to
-- its pageviews, and most rows never take part in that join. Indexing only the
-- non-null rows keeps the index small and the write cost of the common
-- (session-less) insert close to zero.
create index page_view_session_idx on public.page_view (session_id)
  where session_id is not null;


-- ---------------------------------------------------------------------------
-- lead_event — one row per form submission.
-- ---------------------------------------------------------------------------
-- Written in PARALLEL with the existing Google Sheets webhook, not instead of
-- it. The Sheet is how the team already works day to day; breaking it to add a
-- dashboard would trade a working process for a reporting nicety.
create table public.lead_event (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),

  -- Which page the form was submitted from. This is what turns a site-wide
  -- conversion rate into a per-page one, and so tells the difference between a
  -- page that attracts traffic and a page that actually earns business.
  source_path text,

  -- Which form fired: contact, partner, demo. Distinguishes a partner enquiry
  -- from a sales lead, which are worth very different amounts.
  form_name text not null,

  -- Joins back to page_view to reconstruct the path taken before converting.
  session_id text,
  visitor_hash text
);

create index lead_event_occurred_at_idx on public.lead_event (occurred_at desc);

-- Supports the join to page_view. Partial for the same reason as above: rows
-- without a session can never participate in it.
create index lead_event_session_idx on public.lead_event (session_id)
  where session_id is not null;


-- ---------------------------------------------------------------------------
-- cta_click — one row per call-to-action click.
-- ---------------------------------------------------------------------------
-- Created now although the v1 dashboard does not read it yet. An unused empty
-- table costs nothing; adding it later would mean a second migration against a
-- live table, and until it exists the step between "viewed the page" and
-- "submitted the form" is entirely invisible.
create table public.cta_click (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  path text not null,

  -- The button's visible label, so the dashboard reads the way the site does
  -- and no lookup table has to be kept in sync with the UI copy.
  cta_label text not null,
  session_id text
);

create index cta_click_occurred_at_idx on public.cta_click (occurred_at desc);


-- ---------------------------------------------------------------------------
-- axe_auth_attempt — login attempts against the /axe password gate.
-- ---------------------------------------------------------------------------
-- This table is the mitigation for a known weak password. The gate's password
-- is a dictionary word by the founder's explicit decision (recorded in §9.2 of
-- the design doc), so the hash alone would not survive guessing. Rate limiting
-- reads from here, which is what actually makes online guessing useless.
--
-- It lives in the database rather than in function memory because serverless
-- instances do not share memory: an in-process counter would reset on every
-- cold start and an attacker would simply never hit the limit.
create table public.axe_auth_attempt (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),

  -- Hashed, not raw. A table of IPs that tried to reach the founder's private
  -- dashboard is itself sensitive, and the rate limiter only needs equality.
  ip_hash text not null,

  -- Kept so a burst of failures followed by a success is legible after the
  -- fact. That pattern is the signature of a successful guess.
  succeeded boolean not null
);

-- The rate-limit check is "how many attempts from this IP since T", so both
-- columns are needed together and in this order: equality first, range second.
create index axe_auth_attempt_ip_time_idx on public.axe_auth_attempt (ip_hash, occurred_at desc);


-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
-- RLS is enabled on every table and DELIBERATELY GIVEN NO POLICIES.
--
-- In Postgres, RLS with no matching policy denies by default, so the anon and
-- authenticated roles can read nothing at all. Supabase's service_role bypasses
-- RLS by design, so the dashboard's server-side queries still work. The result
-- is that the browser never holds a key capable of reading analytics, even if
-- the anon key leaks — which it must be assumed to, since it ships to every
-- visitor.
--
-- FORCE is the part usually skipped: without it, the table's owner is exempt
-- from its own RLS. With it, the policy-free denial applies to everyone.
alter table public.page_view        enable row level security;
alter table public.page_view        force  row level security;
alter table public.lead_event       enable row level security;
alter table public.lead_event       force  row level security;
alter table public.cta_click        enable row level security;
alter table public.cta_click        force  row level security;
alter table public.axe_auth_attempt enable row level security;
alter table public.axe_auth_attempt force  row level security;

-- Belt and braces beneath RLS. RLS filters rows; these revokes remove the
-- table privilege itself, so a future migration that accidentally adds a
-- permissive policy still does not expose the data. Defence in depth matters
-- here specifically because the anon key is public by construction.
revoke all on public.page_view        from anon, authenticated;
revoke all on public.lead_event       from anon, authenticated;
revoke all on public.cta_click        from anon, authenticated;
revoke all on public.axe_auth_attempt from anon, authenticated;
