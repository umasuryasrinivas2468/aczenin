# Finathon registration rework — design

**Status:** awaiting owner approval. No code written yet.
**Date:** 2026-09-22
**Scope:** `aczen.in/Finathon/register` (public, two-step) and `aczen.in/Finathon/axe/26` (admin view).
**Repo:** `aczenin` (Next.js 15 App Router). Not `1on1`, not `1on1_sb`.

---

## 1. What this changes, in one paragraph

`/Finathon/register` today collects three fields — team lead name, roll number,
UTR — in a single form, and writes one row to `finathon_registration`. It becomes
a two-step flow that collects a team name, five fields about the team lead, and
four fields about each of 2–4 additional members, then takes a ₹499 UPI payment
evidenced by an uploaded screenshot plus a typed UTR. All of it lands in Postgres
in one transaction. `/Finathon/axe/26` grows a view over the new shape, with a
pending → approved/rejected workflow and signed-URL access to the screenshots.

---

## 2. The environment problem — read this before running anything

There are **two** Supabase projects in play, and the repo is wired to the wrong one.

| Project | Ref | Live? | Holds the data? | CLI can see it? |
|---|---|---|---|---|
| `aczenin` | `zpkvshwmbgomrycoeqqd` | **No — paused.** Pooler returns `ENOTFOUND tenant/user` | No | Yes, and the repo is **linked to this one** |
| owner's live DB | `jgwvyyqagabtpnomdwgo` | **Yes** — answers `HTTP 401` | **Yes** | **No** — different Supabase account |

Evidence for "live": an unauthenticated `GET https://jgwvyyqagabtpnomdwgo.supabase.co/rest/v1/`
returns `401` in 0.67s. A deleted or paused project does not answer at all —
`zpkvshwmbgomrycoeqqd` returns connection-refused (`HTTP 000`).

> **A recon agent in this session concluded `jgwvyyqagabtpnomdwgo` "does not exist —
> it is fiction." That conclusion is wrong.** The agent queried
> `supabase projects list`, which only enumerates the *currently authenticated
> account*. The project is real and lives on the owner's other account. Recorded
> here because the claim is emphatic, plausible, and would cause whoever believes
> it to point production at the dead project.

Consequences:

- **`vercel-env-upload.env` must not be imported to Vercel as-is.** Its URL is
  correct (`jgwvyyqagabtpnomdwgo`) but both keys are literal placeholders —
  `PASTE_ANON_KEY…` (19 chars) and `PASTE_SERVICE_…` (27 chars). A real Supabase
  key is 200+ characters.
- **`.env.local` points at the dead project.** Local dev cannot reach any data
  until its `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
  repointed at `jgwvyyqagabtpnomdwgo`.
- Migrations are delivered as **SQL for the owner to paste into the Supabase web
  SQL editor**, by his decision. `supabase db push` is not available — it would
  target the paused project.

---

## 3. Data preservation — the rule for this whole change

**Nothing is dropped, renamed, or altered. Ever.**

`finathon_registration` is left byte-for-byte as it is. The new tables are
additive. Existing rows are *copied* forward, not moved, so after the migration
the same registration exists in two places. If the copy is wrong, the original is
still there to copy again.

The order is **discover, then mutate** — step 0 below is a read-only inventory,
and no DDL runs until its output is known. The row count is currently unknown:
session notes say 2, but those notes describe the paused project, not the live
one.

### Step 0 — inventory (read-only, run first, paste output back)

```sql
-- Nothing here writes. Safe to run on production.
select count(*) as total_rows from public.finathon_registration;

select id, submitted_at, team_lead_name, roll_number, utr,
       (ip_hash is null) as ip_hash_missing
from public.finathon_registration
order by submitted_at desc;

-- Confirms whether the storage bucket already exists
select id, name, public from storage.buckets;

-- Confirms the tables actually present, so the migration is written against reality
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

---

## 4. Schema

### 4.1 Why participants are one table, not lead-columns plus a members table

The obvious shape is `finathon_team` carrying `lead_name`, `lead_roll_number`, …
alongside a `finathon_team_member` table. It is worse, for one specific reason:
the rule "a student may only be on one team" then has to hold *across* two
tables, which no single unique index can express — it needs a trigger, and
triggers are where correctness goes to hide.

Putting every human in one `finathon_participant` table with an `is_lead` flag
makes that rule a one-line unique index on `upper(btrim(roll_number))`. The lead
is a participant with `is_lead = true`, and "exactly one lead per team" is a
partial unique index. Two integrity rules, two indexes, no procedural code.

### 4.2 DDL

```sql
-- ============================================================================
-- Finathon 2026 — team registration
-- Additive. Touches nothing that already exists.
-- ============================================================================

create table public.finathon_team (
  id              bigint generated always as identity primary key,
  -- Surfaced in storage paths and admin URLs. A bigint id would let anyone who
  -- sees one path enumerate the others by decrementing; a uuid does not.
  public_id       uuid not null default gen_random_uuid(),
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  team_name       text not null
    check (char_length(btrim(team_name)) between 2 and 80),

  -- Money as integer paise. Never float, never numeric-with-implied-scale:
  -- 499.00 in a float is not 499.00, and this value gets reconciled against a
  -- bank statement by a human.
  amount_paise    integer not null default 49900 check (amount_paise > 0),
  utr             text not null
    check (char_length(btrim(utr)) between 8 and 30),

  -- Object path inside the private bucket. Nullable only so the column can be
  -- backfilled for legacy rows, which have no screenshot.
  screenshot_path text,

  status          text not null default 'pending'
    check (status in ('pending','approved','rejected','legacy')),
  reviewed_at     timestamptz,
  review_note     text check (review_note is null or char_length(review_note) <= 500),

  -- not null, unlike finathon_registration.ip_hash. A null there silently
  -- defeats the per-source rate limit, which is the whole point of the column.
  ip_hash         text not null
);

-- One UTR may fund exactly one team. Functional index so "ABC123" and " abc123 "
-- collide, matching how a human retypes a reference off a payment app.
create unique index finathon_team_utr_key
  on public.finathon_team (upper(btrim(utr)));

create unique index finathon_team_name_key
  on public.finathon_team (upper(btrim(team_name)));

create index finathon_team_submitted_at_idx
  on public.finathon_team (submitted_at desc);

-- Partial: the dashboard's default view is "what still needs review", and
-- pending rows are a shrinking minority of the table as the event fills up.
create index finathon_team_pending_idx
  on public.finathon_team (submitted_at desc) where status = 'pending';


create table public.finathon_participant (
  id           bigint generated always as identity primary key,
  team_id      bigint not null
    references public.finathon_team(id) on delete cascade,
  is_lead      boolean not null default false,
  -- 0 for the lead, 1..4 for members. Drives display order on the dashboard.
  position     smallint not null check (position between 0 and 4),

  full_name    text not null check (char_length(btrim(full_name)) between 2 and 80),
  college      text not null check (char_length(btrim(college))   between 2 and 120),
  roll_number  text not null check (char_length(btrim(roll_number)) between 4 and 24),

  -- Indian mobile: 10 digits, first digit 6-9. Normalised before insert, so any
  -- +91 / spaces / hyphens the student typed are already gone by here.
  phone        text not null check (phone ~ '^[6-9][0-9]{9}$'),

  -- Deliberately permissive. A strict RFC 5322 regex rejects real addresses;
  -- the only claim worth enforcing is "one @, a dot after it, no whitespace".
  email        text not null
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
           and char_length(email) <= 160)
);

-- One student, one team — the rule that made this a single table.
create unique index finathon_participant_roll_key
  on public.finathon_participant (upper(btrim(roll_number)));

-- Exactly one lead per team.
create unique index finathon_participant_one_lead_idx
  on public.finathon_participant (team_id) where is_lead;

create unique index finathon_participant_position_idx
  on public.finathon_participant (team_id, position);

-- Postgres does not auto-index foreign keys. Without this, the cascade on
-- delete does a sequential scan of every participant per team removed.
create index finathon_participant_team_id_idx
  on public.finathon_participant (team_id);


-- Rate-limit ledger. Separate from finathon_team ON PURPOSE — see §7.1.
create table public.finathon_register_attempt (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  ip_hash     text not null,
  outcome     text not null check (outcome in ('accepted','rejected','error'))
);

create index finathon_register_attempt_lookup_idx
  on public.finathon_register_attempt (ip_hash, occurred_at desc);


-- Same posture as every other table in this database: RLS on and forced, zero
-- policies, grants revoked. Deny-by-default. Only service_role, which bypasses
-- RLS, can reach these — and it is only ever used server-side.
alter table public.finathon_team               enable row level security;
alter table public.finathon_team               force  row level security;
alter table public.finathon_participant        enable row level security;
alter table public.finathon_participant        force  row level security;
alter table public.finathon_register_attempt   enable row level security;
alter table public.finathon_register_attempt   force  row level security;

revoke all on public.finathon_team             from anon, authenticated;
revoke all on public.finathon_participant      from anon, authenticated;
revoke all on public.finathon_register_attempt from anon, authenticated;
```

> `rls_enabled_no_policy` will appear as an `INFO` in Supabase's advisor for all
> three tables. That is the intended design, not a defect. Adding a policy would
> *widen* access. Do not "fix" it.

### 4.3 Atomic insert

PostgREST cannot span a transaction across two tables. Three sequential inserts
would leave an orphaned team with no participants whenever call two fails — and
"the network blipped mid-registration" is exactly the case that must not corrupt
a paid registration. One function, one transaction:

```sql
create or replace function public.finathon_register_team(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id   bigint;
  v_public_id uuid;
  v_members   jsonb := payload->'members';
  v_count     integer := jsonb_array_length(v_members);
  v_member    jsonb;
  v_index     integer := 0;
begin
  -- Team size, enforced here because no row-level CHECK can count sibling rows.
  -- +1 for the lead. 3..5 total.
  if v_count is null or v_count < 2 or v_count > 4 then
    raise exception 'team must have 3 to 5 members including the lead'
      using errcode = 'check_violation';
  end if;

  insert into public.finathon_team (team_name, utr, screenshot_path, ip_hash, amount_paise)
  values (
    payload->>'team_name',
    payload->>'utr',
    payload->>'screenshot_path',
    payload->>'ip_hash',
    coalesce((payload->>'amount_paise')::integer, 49900)
  )
  returning id, public_id into v_team_id, v_public_id;

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

  return v_public_id;
end;
$$;

-- SECURITY DEFINER runs as the owner, so it must not be publicly callable.
-- Without this it is reachable at /rest/v1/rpc/finathon_register_team by anyone
-- holding the anon key — which ships to every browser.
revoke all on function public.finathon_register_team(jsonb) from public, anon, authenticated;
```

> There is a precedent for getting this wrong in this database. `rls_auto_enable()`
> is an existing `SECURITY DEFINER` function that Supabase's advisor flags
> (lints 0028/0029) precisely because `anon` can execute it. The `revoke` above
> is why this function will not join it.

### 4.4 Legacy copy

Run **after** step 0 confirms the row count, and after the tables above exist.
Reads the old table; writes only to the new ones.

```sql
-- Legacy rows predate team names, member lists, colleges, phones and emails.
-- Placeholders are explicit and searchable rather than blank, so nobody mistakes
-- a gap in history for a gap in the form.
with inserted as (
  insert into public.finathon_team
    (team_name, utr, ip_hash, status, submitted_at, amount_paise)
  select
    'Legacy registration #' || r.id,
    r.utr,
    coalesce(r.ip_hash, 'legacy-unknown'),
    'legacy',
    r.submitted_at,
    49900
  from public.finathon_registration r
  -- Idempotent: safe to re-run, will not duplicate.
  where not exists (
    select 1 from public.finathon_team t
    where upper(btrim(t.utr)) = upper(btrim(r.utr))
  )
  returning id, utr
)
insert into public.finathon_participant
  (team_id, is_lead, position, full_name, college, roll_number, phone, email)
select
  i.id, true, 0,
  r.team_lead_name,
  'Not collected (legacy)',
  r.roll_number,
  '6000000000',            -- schema-valid placeholder; no real number was collected
  'legacy@aczen.in'
from inserted i
join public.finathon_registration r
  on upper(btrim(r.utr)) = upper(btrim(i.utr));
```

Verification query to run immediately after:

```sql
select
  (select count(*) from public.finathon_registration)              as old_rows,
  (select count(*) from public.finathon_team where status='legacy') as copied_teams,
  (select count(*) from public.finathon_participant p
     join public.finathon_team t on t.id = p.team_id
    where t.status = 'legacy')                                     as copied_people;
```

`old_rows`, `copied_teams` and `copied_people` must all be equal. If they are
not, **stop** — the original table is untouched, so nothing is lost and the copy
can be retried.

---

## 5. Storage

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finathon-payments', 'finathon-payments', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
```

No `storage.objects` policies are created. That is deliberate: with none, only
`service_role` can read or write, matching every table in this database.

**Uploads go through the API route, never from the browser.** A direct browser
upload would need `anon` to hold INSERT on `storage.objects` — which would make
it the single anonymous-writable surface in the entire system. Routing bytes
through the server also means size, MIME and magic-byte checks happen *before*
anything is persisted.

Object path: `teams/<public_id>/payment.<ext>`. The uuid is unguessable, so one
leaked path does not imply the others.

**Admin reads use 60-second signed URLs** generated server-side per page render.
Because those URLs are served from `supabase.co` and not `aczen.in`, a crafted
polyglot file — valid JPEG header, HTML payload — cannot execute script in the
site's origin even if it slips past validation.

---

## 6. Request flow

```
Step 1 (client state only)          Step 2                     Server
─────────────────────────           ──────                     ──────
team name                           QR: /images/finathon/       POST /api/finathon/register
lead: name, college, roll,            payment-qr.jpg            multipart/form-data
      phone, email                   amount ₹499                  │
members[2..4]:                       screenshot file             ├─ size cap (pre-parse)
  name, college, roll,               UTR text                    ├─ Origin / Sec-Fetch-Site
  phone, email                          │                        ├─ deadline check
      │                                 │                        ├─ rate limit (all outcomes)
      └── Next ──────────────────────────┘                       ├─ zod validation
          nothing sent yet                                       ├─ magic-byte sniff
          mirrored to sessionStorage                             ├─ upload to bucket
                                                                 ├─ rpc finathon_register_team
                                                                 └─ 201 { public_id }
```

Step 1 never reaches the network. That is what makes the single transaction
possible: no draft rows, no half-registered teams, nothing to reconcile. The
cost is that closing the tab at step 2 loses step 1, mitigated by mirroring the
draft into `sessionStorage` — which stays on the student's device and is cleared
on success.

**Ordering is load-bearing.** Rate limit and deadline are checked *before* the
body is parsed, so a flood of 5 MB uploads is rejected without ever being read.
The bucket write happens before the RPC, and on RPC failure the orphaned object
is deleted in the same request.

---

## 7. Security work

Three findings sit directly on this feature's path. They are fixed as part of
the build, not filed for later. The owner scoped this pass to the registration
path plus these three; site-wide CSP and TypeScript `strict` are explicitly out.

### 7.1 The rate limiter has a bypass, and the upload weaponises it

`recentSubmissionCount` (`src/lib/finathon/registrations.ts:225`) counts rows in
`finathon_registration` — the table of *successful* saves:

```ts
return axeCount("finathon_registration", `ip_hash=eq.${ipHash}&submitted_at=gte.${since}`);
```

Every 400, 409 and 500 is therefore free. Unlimited malformed requests cost an
attacker nothing and never increment the counter. Today that is merely noisy.
Once a 5 MB multipart upload is in the request path, it means **unbounded upload
bodies get processed before the limiter is ever consulted**.

Fix: `finathon_register_attempt` logs every outcome, and the limiter counts that
table. This mirrors how `axe_auth_attempt` already protects the login routes —
the pattern was right there; the registration route just didn't use it.

### 7.2 Multipart removes the only CSRF defence

`POST /api/finathon/register` is unauthenticated and has no CSRF token. It is
currently protected only incidentally: `application/json` is not a CORS-simple
content type, so cross-origin posts trigger a preflight that fails.

`multipart/form-data` **is** CORS-simple. It is not preflighted. Switching to
file upload silently deletes the one thing standing there.

Fix: explicit `Origin` and `Sec-Fetch-Site` validation, rejecting anything not
same-origin, before the body is touched.

### 7.3 The two admin gates are interchangeable

`src/lib/finathon/gate.ts:33` is candid about it: the cookie carries only an
expiry and a signature, "with nothing in it that says which gate issued it.
Separate names are what keep the two sessions from being interchangeable."

Both gates sign with the same `AXE_COOKIE_SECRET` and mint an identical payload.
`httpOnly` stops JavaScript, not DevTools → Application → Cookies. **A Finathon
volunteer can rename their `fin_session` cookie to `axe_session` and obtain the
founder analytics dashboard.** The reverse also holds.

Fix: bind the gate name into the signed payload — `${gate}.${expiresAt}.${nonce}`
— and verify it on read. Existing sessions are invalidated, which is correct
behaviour for a privilege-separation fix.

### 7.4 Smaller items on the path

| Item | Where | Fix |
|---|---|---|
| No error boundary on the admin segment | `app/Finathon/axe/26/` has no `error.tsx` | Add one mirroring `app/axe/error.tsx`, which already avoids leaking PostgREST detail. Matters more once columns are nullable. |
| Search puts PII in the URL | `app/Finathon/axe/26/page.tsx:115` is `<form method="get">` over name, roll, UTR | Switch to POST + Server Action. A `GET` writes student names and bank UTRs into browser history, `Referer` headers and Vercel request logs. |
| `next/image` will reject Supabase | `next.config.mjs` has no `images` key at all | Add `remotePatterns` for `jgwvyyqagabtpnomdwgo.supabase.co`, path `/storage/v1/object/**`. Without it, rendering a screenshot throws at runtime. |
| `ilike` wildcard not escaped | `quoteFilterValue` escapes `"` and `\`, not `*` | Escape `*` too. Low severity, but the new form multiplies these lookups. |
| `.env` is tracked by git | `.gitignore` lists it, but ignore rules are inert on already-tracked paths | `git rm --cached .env`. Contents today are only public Sanity ids — this is about the next person who appends a service key to the wrong file. |

---

## 8. UI

Follows the existing statement-of-account language exactly. No new dependencies:
`zod` and `react-hook-form` are already in `package.json` and currently unused by
any file in the repo.

### 8.1 The bug that makes the page look broken

`app/Finathon/register/page.tsx:50` renders:

```tsx
<div className={`${newsreader.variable} ${archivo.variable}`}>
```

Every design token — `--paper`, `--ink`, `--rule-strong`, `--accent-fill` — is
declared **only** inside `.fin { … }` at `app/Finathon/finathon.css:9-62`. The
class is absent here, so on this page every one of those variables is undefined.

The worst symptom is the submit button. `.fin-cta` sets
`border: 1px solid var(--ink)` — a *shorthand* containing an invalid variable, so
CSS discards the entire shorthand and the border vanishes along with the fill.
The primary call to action on a payment page renders as unstyled bold text.

Fix: add `fin` to that wrapper's class list. One word, and most of what reads as
"half-baked" resolves.

### 8.2 The QR

The form points at `/images/finathon/payment-qr.png`. **That directory does not
exist**, so production currently shows students the fallback string *"Payment QR
not uploaded yet."*

`finathon-reg-scanner.jpeg` (871×1317, 132 KB) sits untracked at the repo root
and is not gitignored — it would be swept into the next `git add .`. It moves to
`public/images/finathon/payment-qr.jpg`, and the constant at
`RegistrationForm.tsx:28` updates to match. **Deleting the root copy needs the
owner's confirmation** and will be asked for separately.

### 8.3 Step structure

The current form labels three steps but renders them simultaneously inside one
`<fieldset>`. The real two-step version keeps that fieldset discipline — only the
first child of a fieldset may be a `<legend>`, which is why steps two and three
currently use `<p className="fin-meta">`. Preserve that.

Progress is communicated by a ruled two-cell header, not a progress bar — the
page's visual language is a printed statement, and statements do not have
progress bars. `aria-current="step"` carries the same information to screen
readers.

The disabled CTA state is already designed (`.fin-cta[aria-disabled="true"]`:
dashed border, muted text) but never fires, because the button uses the native
`disabled` attribute instead. Switch to `aria-disabled` plus a guarded handler,
which also keeps the button focusable — a natively disabled button is invisible
to screen reader users trying to find out why they cannot proceed.

**No entrance motion.** `finathon.css:255` records this as an explicit decision:
"The page now has no non-user-triggered motion at all — only hover and focus."
`framer-motion` is installed but imported by no Finathon file. Keep it that way.

---

## 9. Copy corrections

Both of these are wrong on the live site today and ripple beyond the form. Per
the naming rule, every occurrence changes together — a half-applied correction is
worse than none.

### 9.1 Deadline: 27 → 28 September

**28 September 2026 is a Monday.** Changing only the digit would ship "Sun 28 Sep".

| File | Line | Now | Becomes |
|---|---|---|---|
| `src/components/finathon/Countdown.tsx` | 23 | `new Date("2026-09-27T23:59:59+05:30")` | `2026-09-28T23:59:59+05:30` |
| `src/views/Finathon.tsx` | 51 | `deadlineLabel: "Sun 27 Sep"` | `"Mon 28 Sep"` |
| `src/views/Finathon.tsx` | 54 | `deadlineFull: "Sunday 27 September, 11.59 pm IST"` | `"Monday 28 September, 11.59 pm IST"` |
| `docs/finathon-blanks.md` | 74 | "Registration closes 27 Sep." | "28 Sep." |

Server-side enforcement is new: the API rejects submissions after the deadline
instant with `403`, and the page renders a closed state instead of the form.
Today nothing enforces it — the countdown flips phase while the API keeps
accepting.

### 9.2 Team size: 3–4 → 3–5

| File | Line | Now |
|---|---|---|
| `src/views/Finathon.tsx` | 56 | `teamSize: "3 to 4 members"` |
| `src/views/Finathon.tsx` | 224 | "Bring a team of three or four." |
| `src/views/Finathon.tsx` | 228 | "register as a team of three or four" |
| `docs/finathon-blanks.md` | 79 | "teams of 3–4" |

Lines 399, 412 and 622 derive from `EVENT.teamSize` and need no edit.

---

## 9A. Validation, 404, performance and contrast

Added to scope by the owner on 2026-09-22, after the sections above were drafted.
Three read-only audits are running to fill in the specifics; the decisions that
do not depend on their output are recorded here now.

### 9A.1 Validation — zod, and the trap it walks into

The form goes from 3 fields to **23** (team name + 5 lead fields + up to 4
members × 4 fields + UTR + file). Hand-rolling 23 validators in the existing
`validateRegistration` style is where mistakes get made, so this switches to
`zod` — already in `package.json` at `^3.23.8` and currently imported by **zero
files in the repo**. No new dependency.

**But zod does not dodge the `strictNullChecks: false` trap.** `safeParse()`
returns `{ success: true, data } | { success: false, error }` — the same
discriminated union shape that `app/api/finathon/register/route.ts:79-88`
documents as un-narrowable through truthiness under this tsconfig. So the rule
carries over verbatim:

```ts
const parsed = schema.safeParse(body);
if (parsed.success === false) { … }   // correct
if (!parsed.success)          { … }   // compiles to a type error, and the
                                      // tempting "fix" is a cast that silences
                                      // the checker on BOTH branches
```

One schema module, imported by both the client form and the API route, so the
two can never drift. The client copy gives instant feedback; **the server copy
is the only one that is authoritative** — a client-side check is a convenience
for honest users and no obstacle at all to `curl`.

Field rules mirror the CHECK constraints in §4.2 exactly. When a bound changes it
changes in both places in the same commit, or the form starts accepting what the
database rejects — which surfaces to a student as a generic 500 after they have
already paid ₹499.

Specific rules: phone normalised (strip `+91`, spaces, hyphens) *before*
validation, then `^[6-9][0-9]{9}$`. Email permissive — one `@`, a dot after it,
no whitespace; strict RFC 5322 rejects real addresses. Roll numbers get no
pattern at all, deliberately: colleges invent formats, and the existing code
already made that call with a comment explaining it. Duplicate roll numbers
*within* the submitted team are rejected client- and server-side before the
database's unique index has to.

### 9A.2 404

`app/not-found.tsx` exists. Whether it is any good, and what a 404 under
`/Finathon/*` currently renders, is what the audit is establishing — `app/Finathon/`
has **no `layout.tsx`**, which means a not-found under that path almost certainly
falls back to the root layout and loses the Finathon design language entirely.

What is already decided: `/Finathon/register` is printed on posters, so typos in
that path are a real traffic source, not a hypothetical. `middleware.ts` only
canonicalises three exact spellings — `/Finathon`, `/finathon`, `/FINATHON`.
Anything else, such as `/FinAthon/register`, misses the matcher and hard-404s.
The matcher becomes case-insensitive so poster typos land on the real page
instead of an error.

Also adding `app/Finathon/axe/26/error.tsx` (§7.4) and a root `app/error.tsx` —
the site currently has neither, so any thrown exception outside `/axe` shows the
framework's default error surface.

### 9A.3 Performance

Measured, not guessed. The one number already known: the QR asset is
**871×1317 px rendered at roughly 176×176**, which is about **37× more pixels
than the layout uses**. That alone is worth fixing before anything subtler.

The audit is quantifying image waste, client-bundle composition, font weights
loaded versus used, and whether `framer-motion` (installed, ~50 KB gzipped) or
`recharts` reaches the Finathon bundle at all. Changes will be ranked by
impact ÷ effort with real numbers attached, and anything that cannot be
substantiated with a measurement does not go in.

Note `next.config.mjs` has **no `images` key whatsoever**, so nothing is being
served as AVIF or WebP today, and the Supabase `remotePatterns` entry needed for
screenshots (§7.4) has to be added there regardless.

### 9A.4 Colour contrast

The audit computes every foreground/background pair in the Finathon subtree
against WCAG 2.2 AA and **verifies the ratios the CSS comments assert**, rather
than trusting them — `finathon.css` annotates `--ink-faint: #5a6874` as
"4.95:1 on band, 5.34:1 on paper — do not lighten", and a claim in a comment is
a hypothesis until someone recomputes it.

Two specific suspects are already identified:

- **`#b3261e`, the error red.** Hardcoded twice in `RegistrationForm.tsx` (lines
  ~251 and ~337), not a token. It is used both as error *text* (needs 4.5:1) and
  as an input *border* (needs 3:1 as a non-text UI boundary). With 23 fields the
  error state stops being an edge case.
- **Everything on `/Finathon/register`, right now.** Because the `fin` class is
  missing (§8.1), every token is undefined and colours fall back to inherited
  values. The page's real contrast today is not what the CSS describes. It gets
  audited both as-is and as-fixed.

Contrast is not the whole of it: colour must never be the *only* signal. Errors
get an icon and text, not just red; the pending/approved/rejected status on the
dashboard gets a word, not just a colour. The existing `/axe` `StatTile` already
does this correctly (glyph + colour) and is the pattern to copy.

---

## 10. Order of operations

| # | Step | Who | Blocking? |
|---|---|---|---|
| 0 | Run the inventory SQL (§3), paste output back | owner | **yes** — nothing proceeds without it |
| 1 | Repoint `.env.local` at `jgwvyyqagabtpnomdwgo`, real keys | owner | yes, for local dev |
| 2 | Run schema DDL (§4.2) in the web SQL editor | owner | yes |
| 3 | Run the RPC function (§4.3) | owner | yes |
| 4 | Create the storage bucket (§5) | owner | yes |
| 5 | Run the legacy copy (§4.4) + verification | owner | no — additive |
| 6 | Delete `supabase/migrations/20260918101500_finathon_registration.sql` | me, on approval | no |
| 7 | Build form, API route, storage upload | me | no |
| 8 | Rebuild the `/axe/26` view | me | no |
| 9 | Security fixes §7.1–7.4 | me | no |
| 10 | Copy corrections §9 | me | no |
| 11 | Set the same env vars in Vercel production | owner | yes, before deploy |

Step 6 matters: `supabase/migrations/` contains **two byte-identical files**
creating the same table under different version numbers
(`20260918071243` and `20260918101500`, differing only in line endings). Any
future `db push` runs the second and fails with `42P07 relation already exists`.
`20260918071243` is authoritative — it carries the version the server recorded.

---

## 11. Open questions

1. **Is `finathon_registration` on the live project the same shape as the repo
   migration describes?** The migration was verified against the *paused* project.
   Step 0 answers this.
2. **Are there registrations beyond the 2 recorded in session notes?** Unknown
   until step 0. Those notes describe the paused project.
3. **Does the live project have the undocumented `rls_auto_enable()` event
   trigger?** It exists in no migration file and `grep` finds it nowhere in the
   repo. If present, new tables get RLS enabled automatically — harmless here
   since §4.2 does it explicitly, but it means `supabase db reset` would produce
   a *weaker* database than production.
4. **Deleting the root `finathon-reg-scanner.jpeg` after copying it to `public/`**
   — needs explicit confirmation before removal.

---

## 12. What this design deliberately does not do

- **No `@supabase/supabase-js`.** The repo talks to PostgREST through ~40 lines
  of `fetch` in `src/lib/axe/supabase.ts`, with a module-level `typeof window`
  guard. Adding the client library buys `storage.from().upload()` and costs a
  dependency plus a lockfile edit — and the storage call is one `fetch`. Extend
  the existing client instead.
- **No captcha.** It adds a third-party script to a payment page, and the
  attempt-table rate limit plus origin checking covers the realistic threat for
  a 5-day college event. Revisit if abuse actually appears.
- **No email confirmation to students.** Out of scope; no mail provider is
  configured in this repo.
- **No payment gateway.** UPI-to-QR with manual reconciliation is what was asked
  for. A real gateway would remove the screenshot entirely, and is a much larger
  change.

---

## 13. A note on package manager

`package-lock.json` (355 KB) is tracked and there is **no `pnpm-lock.yaml`**,
despite pnpm being the declared-only package manager for this machine. Nothing in
this design adds a dependency, so it is not blocking here — but the next change
that does will create a second, divergent lockfile, and Vercel may resolve from
either. Worth settling separately.
