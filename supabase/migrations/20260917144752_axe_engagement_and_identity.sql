-- Adds engaged-time measurement to page_view, plus a reserved slot for a
-- future consent-gated visitor id.
--
-- Context for whoever reads this cold: the founder asked for "how much time
-- they stayed, in total and on each page". The obvious implementation — take
-- the gap between consecutive pageview timestamps — is the one to avoid. It is
-- what Google Analytics does and it is wrong twice over: the last page of a
-- visit has no following event to subtract from, so every exit page silently
-- reports zero, and it keeps counting while the tab sits in the background, so
-- someone who opens ten tabs and reads one produces ten long sessions.
--
-- So time is measured on the client as ENGAGED time (a timer that only runs
-- while the tab is actually visible) and reported on departure. That needs a
-- second write against a row that already exists, which is what view_id is for.


-- The address the departure beacon uses to find its own row.
--
-- Nullable because rows written before this migration have none, and because
-- the arrival insert must still succeed if the client fails to generate one.
-- It is a random uuid (crypto.randomUUID) rather than the existing bigint id
-- precisely BECAUSE it must be unguessable: /api/collect is a public endpoint,
-- so this value is the only thing authorising a write to this row. A
-- sequential id would let anyone enumerate rows and overwrite other visitors'
-- measurements, or replay a beacon to inflate the numbers.
alter table public.page_view add column view_id uuid;

-- Total milliseconds the tab was visible and focused on this page.
--
-- Nullable on purpose: a row starts life without it and is filled in only when
-- the visitor leaves. A null therefore means "still open, or left without the
-- beacon landing" — which is a real state worth being able to see, and is why
-- this is not defaulted to 0. Averaging must exclude nulls, not treat them as
-- zero-second visits.
alter table public.page_view add column engaged_ms integer;

-- Reserved. Not written by anything today.
--
-- Cross-day visitor identity is deliberately impossible in this design: the
-- salt behind visitor_hash rotates daily, which is the specific property that
-- makes the data anonymous rather than merely pseudonymous, and so keeps it
-- outside DPDP Act 2023 and GDPR scope. That is a legal decision, not a
-- technical one (see docs/axe-analytics-dashboard-design.md §8.0, §9.1).
--
-- The only lawful route to a true all-time unique-visitor count is a stable id
-- the visitor has CONSENTED to — the site already has a cookie banner, so the
-- consent exists to be asked for. This column is where such an id would live.
-- It stays null until that flow is built and consent is actually collected.
-- Writing to it without consent would recreate exactly the cross-day tracking
-- the daily rotation was chosen to prevent.
alter table public.page_view add column client_id text;

-- Enforced in the database as well as in the request handler.
--
-- The handler caps this too, and that is not redundancy to be tidied away: the
-- handler protects against honest bugs, the constraint protects against a
-- crafted request hitting the public endpoint directly. 1800000 ms is 30
-- minutes — beyond that the visitor has almost certainly walked away from a
-- visible tab, and a single such row would otherwise drag every average it
-- appears in somewhere no real visitor has ever been.
alter table public.page_view
  add constraint page_view_engaged_ms_sane
  check (engaged_ms is null or (engaged_ms >= 0 and engaged_ms <= 1800000));

-- Unique so a replayed departure beacon cannot create a second row claiming
-- the same view, and partial so the rows that legitimately have no view_id —
-- everything collected before this migration — do not all collide on null.
create unique index page_view_view_id_idx on public.page_view (view_id)
  where view_id is not null;

-- The engagement PATCH looks a row up by view_id and must not scan the table
-- to do it. Without this the write cost grows with the size of the table and
-- the beacon slows down for every visitor as the site succeeds.
create index page_view_engaged_lookup_idx on public.page_view (view_id, engaged_ms)
  where view_id is not null;
