# 2026-09-22 — Finathon registration rework

Working document for the day. Operational status, architecture decisions and the
schema, in one place.

- **Repo:** `aczenin` (Next.js 15 App Router, aczen.in). Not `1on1`, not `1on1_sb`.
- **Branch:** `main`
- **Surfaces:** `aczen.in/Finathon/register` (public) · `aczen.in/Finathon/axe/26` (admin)
- **Companion doc:** [`docs/finathon-registration-rework-design.md`](docs/finathon-registration-rework-design.md) — the full design with runnable SQL.
  This file is the status and the reasoning; that file is the specification.

---

## 1. The ask

Turn the existing single-form registration into two steps:

**Step 1** — team name; team lead's name, college, roll number, phone, email;
then 2–4 additional members each with name, college, roll number, phone, email.
Press Next.

**Step 2** — pay ₹499 to a UPI QR, upload a screenshot of the payment that shows
the transaction/UTR reference, type the UTR, submit.

Everything persists to Supabase Postgres. `/Finathon/axe/26` displays it.
Security is the stated top priority. Existing registrations must not be lost.

Added mid-session: input and form validation, a custom 404, a page-load speed
pass, and colour-contrast fixes.

---

## 2. Status — nothing is implemented yet

**Overall ~20%.** All of it is recon and design. No feature code has been written,
no SQL has been run, nothing has been committed.

| Phase | State |
|---|---|
| Recon — register flow, admin page, Supabase, security posture | done (4 agents) |
| Recon — contrast, performance, 404 + validation | 3 agents in flight |
| Design spec | written |
| Owner approval to build | **pending** |
| Inventory SQL run against live DB | **pending — blocks all DDL** |
| Schema migration | written, not run |
| Form, API route, storage upload | not started |
| Dashboard rewire | not started |
| Security fixes | not started |
| Copy corrections | not started |

**The two gates:** the owner's go-ahead, and the output of the read-only
inventory query. Everything except the migration can start on the first alone.

---

## 3. What recon found that changes the job

### 3.1 The page is not half-built — it is invisible

`app/Finathon/register/page.tsx:50` renders:

```tsx
<div className={`${newsreader.variable} ${archivo.variable}`}>
```

Every design token — `--paper`, `--ink`, `--rule-strong`, `--accent-fill` — is
declared **only** inside the `.fin { }` block at `app/Finathon/finathon.css:9-62`.
That class is missing here, so on this page every one of those variables is
undefined.

The submit button is the worst casualty. `.fin-cta` sets
`border: 1px solid var(--ink)` — a **shorthand** containing an invalid variable,
so CSS throws away the entire shorthand. The border disappears along with the
background fill. The primary call to action on a payment page renders as
unstyled bold text.

One missing word in a className is most of what reads as "half-baked".

### 3.2 The QR was never added

The form points at `/images/finathon/payment-qr.png`. That file does not exist —
**neither does the directory**. Production is currently showing students the
fallback string *"Payment QR not uploaded yet."*

`finathon-reg-scanner.jpeg` (871×1317, 132 KB) is sitting untracked at the repo
root and is **not gitignored**, so it would be swept into the next `git add .`.

### 3.3 The live database is not the one the repo points at

| Project | Ref | Alive? | Repo linked to it? |
|---|---|---|---|
| `aczenin` | `zpkvshwmbgomrycoeqqd` | **No — paused.** `HTTP 000` | **Yes** |
| owner's live DB | `jgwvyyqagabtpnomdwgo` | **Yes** — `HTTP 401` in 0.67s | No — different Supabase account |

`.env.local` points at the dead one. `vercel-env-upload.env` points at the live
one but both its keys are literal placeholders (`PASTE_ANON_KEY…`, 19 chars —
a real key is 200+).

> **A recon agent concluded `jgwvyyqagabtpnomdwgo` "DOES NOT EXIST — it is
> fiction."** That is wrong. It ran `supabase projects list`, which only sees the
> currently authenticated account. The project is real, confirmed by the owner
> and by an unauthenticated probe that got a `401` — dead projects do not answer.
> Recorded because the claim is emphatic and would send whoever believes it to
> point production at the paused project.

### 3.4 Prior docs are stale in both directions

`docs/finathon-registration-schema.md` (2026-09-18) states as a live BLOCKER that
`SupabaseWriteError` does not exist and that `axeInsert` leaks raw PostgREST
bodies. **Both were fixed in commit `a798478`.** It also says `/Finathon/register`
and `/Finathon/axe/26` "do not exist" — both do.

The lesson worth keeping: a doc asserting a bug is a hypothesis with a timestamp,
not a finding. `git show <commit>:<file>` settles it in seconds.

---

## 4. Architecture approach

### 4.1 One participant table, not lead-columns plus members

The obvious shape is `finathon_team` carrying `lead_name`, `lead_roll_number`, …
next to a `finathon_team_member` table. It is worse for one specific reason: the
rule *"a student may only be on one team"* then spans two tables, which no single
unique index can express — it needs a trigger.

Putting every human in one `finathon_participant` table with an `is_lead` flag
reduces that rule to a unique index on `upper(btrim(roll_number))`. "Exactly one
lead per team" becomes a partial unique index. Two integrity rules, two indexes,
zero procedural code.

**Technique:** push invariants into the schema where the database can enforce
them, rather than into application code where they hold only as long as every
caller remembers.

### 4.2 One Postgres function, not three PostgREST calls

PostgREST cannot span a transaction across tables. Three sequential inserts leave
an orphaned team with no participants whenever call two fails — and *"the network
blipped mid-registration"* is precisely the case that must not corrupt a paid
entry.

A single `SECURITY DEFINER` function takes one JSONB payload and inserts team +
participants atomically. It also enforces the 3–5 team size, which is a count
across sibling rows and therefore something no row-level `CHECK` can express.

The function is `revoke`d from `public, anon, authenticated`. A `SECURITY DEFINER`
function runs as its owner, so a publicly-executable one is a privilege
escalation waiting to happen — and this database already has that exact problem
with `rls_auto_enable()`, which Supabase's advisor flags under lints 0028/0029.

### 4.3 Uploads go through the server, never the browser

The browser never talks to Supabase. The API route receives the file, validates
it, and forwards it using the service-role key.

Direct browser upload would require granting `anon` INSERT on `storage.objects` —
making it **the only anonymous-writable surface in the entire system**, in a
database whose every table is deny-by-default with zero policies. Routing bytes
through the server also means size, MIME and magic-byte checks happen *before*
anything is persisted.

Validation sniffs **magic bytes**, not the `Content-Type` header — the client
sets that header, so it proves nothing. `FFD8FF` for JPEG, `89504E47` for PNG,
`RIFF….WEBP` for WebP. 5 MB cap enforced before the body is read.

Admin reads use 60-second signed URLs. Because those serve from `supabase.co`
rather than `aczen.in`, a crafted polyglot file cannot execute script in the
site's origin even if it slips past validation.

### 4.4 Two steps, one submission

Step 1 lives in React state and never touches the network. Step 2 posts
everything at once.

That is what makes the single transaction possible — no draft rows, no
half-registered teams, nothing to reconcile later. The cost is that closing the
tab at step 2 loses step 1, mitigated by mirroring the draft into
`sessionStorage`, which stays on the student's device and clears on success.

### 4.5 No new dependencies

`zod` (`^3.23.8`), `react-hook-form` and `@hookform/resolvers` are all already in
`package.json` and imported by **zero files**. The form uses them.

`@supabase/supabase-js` stays out. The repo talks to PostgREST through ~40 lines
of `fetch` in `src/lib/axe/supabase.ts` with a module-level `typeof window`
guard. The storage upload is one more `fetch`. Adding the client library would
buy `storage.from().upload()` at the cost of a dependency and a lockfile edit.

**Trap carried forward:** `tsconfig.json` sets `strict: false` *and*
`strictNullChecks: false`. Under that setting TypeScript does not narrow a
discriminated union through truthiness. zod's `safeParse()` returns exactly such
a union, so:

```ts
if (parsed.success === false) { … }   // correct
if (!parsed.success)          { … }   // type error, and the tempting "fix" is a
                                      // cast that silences BOTH branches
```

---

## 5. Schema

Additive. `finathon_registration` is not dropped, renamed or altered.

### 5.1 Tables

**`finathon_team`** — one row per team.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `public_id` | uuid default `gen_random_uuid()` | used in storage paths; a bigint would let anyone who sees one path enumerate the rest |
| `submitted_at` / `updated_at` | timestamptz not null | |
| `team_name` | text not null | 2–80 trimmed |
| `amount_paise` | integer not null default `49900` | **integer paise, never float** — a human reconciles this against a bank statement |
| `utr` | text not null | 8–30 trimmed |
| `screenshot_path` | text | object path in the private bucket; nullable for legacy rows |
| `status` | text not null default `'pending'` | `pending` / `approved` / `rejected` / `legacy` |
| `reviewed_at`, `review_note` | timestamptz, text ≤500 | |
| `ip_hash` | text **not null** | not null unlike `finathon_registration.ip_hash` — a null there silently defeats the rate limit |

Unique on `upper(btrim(utr))` and `upper(btrim(team_name))`. Functional indexes
so `"ABC123"` and `" abc123 "` collide, which is how a human retypes a reference
off a payment app. Partial index on `status = 'pending'` because "what still
needs review" is the dashboard's default view and a shrinking minority of rows.

**`finathon_participant`** — one row per human, lead included.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `team_id` | bigint not null → `finathon_team(id)` on delete cascade | |
| `is_lead` | boolean not null default false | |
| `position` | smallint 0–4 | 0 = lead |
| `full_name` | text not null | 2–80 |
| `college` | text not null | 2–120 |
| `roll_number` | text not null | 4–24, **no pattern** — colleges invent formats |
| `phone` | text not null | `^[6-9][0-9]{9}$`, normalised before insert |
| `email` | text not null | one `@`, a dot after it, no whitespace, ≤160. Strict RFC 5322 rejects real addresses |

Unique on `upper(btrim(roll_number))` — **one student, one team**. Partial unique
on `(team_id) where is_lead` — one lead per team. Plain index on `team_id`,
because Postgres does not auto-index foreign keys and the delete cascade would
otherwise sequential-scan every participant per team removed.

**`finathon_register_attempt`** — rate-limit ledger. `occurred_at`, `ip_hash`,
`outcome` (`accepted`/`rejected`/`error`). Index on `(ip_hash, occurred_at desc)`.

### 5.2 RLS posture

RLS **enabled and forced**, **zero policies**, grants revoked from `anon` and
`authenticated` — identical to every other table in this database. Deny by
default: RLS with no policy denies, `FORCE` applies it to the table owner too,
and the `revoke` removes the privilege underneath as defence in depth. Only
`service_role` reaches these, server-side only.

Supabase's advisor will report `rls_enabled_no_policy` as `INFO` on all three.
**That is the design, not a defect.** Adding a policy would widen access.

### 5.3 Storage

Bucket `finathon-payments`: `public = false`, 5 MB limit, MIME allowlist
`image/jpeg, image/png, image/webp`. **No `storage.objects` policies** — with
none, only `service_role` can read or write.

Path: `teams/<public_id>/payment.<ext>`.

### 5.4 Legacy data

Existing rows are **copied, not moved**. After migration the same registration
exists in both the old and new tables. The copy is idempotent (`where not exists`
on the UTR) and followed by a verification query asserting
`old_rows = copied_teams = copied_people`. If they disagree, stop — the original
table is untouched, so nothing is lost and the copy can be retried.

**Technique: discover before mutate.** A read-only inventory runs first. No DDL
is authored against a database nobody has looked inside — especially one whose
row count is currently unknown, because the session notes describing it describe
the *paused* project.

---

## 6. Security findings

Three sit directly on this feature's path and are fixed as part of the build.

### 6.1 The rate limiter has a bypass, and the upload weaponises it

`src/lib/finathon/registrations.ts:225` counts rows in `finathon_registration` —
the table of *successful* saves. Every 400, 409 and 500 is therefore free.

Today that is merely noisy. Once a 5 MB multipart upload is in the request path,
it means **unbounded upload bodies get processed before the limiter is ever
consulted**. Fix: the separate attempt table, mirroring how `axe_auth_attempt`
already protects the login routes.

### 6.2 Multipart silently removes the only CSRF defence

`POST /api/finathon/register` is unauthenticated with no CSRF token. It is
protected only incidentally: `application/json` is not a CORS-simple content
type, so cross-origin posts trigger a preflight that fails.

**`multipart/form-data` *is* CORS-simple. It is not preflighted.** Switching to
file upload deletes the one thing standing there. Fix: explicit `Origin` and
`Sec-Fetch-Site` validation before the body is touched.

### 6.3 The two admin gates are interchangeable

`src/lib/finathon/gate.ts:33` says it outright — the cookie carries only an
expiry and a signature, "with nothing in it that says which gate issued it.
Separate names are what keep the two sessions from being interchangeable."

Both gates sign with the same `AXE_COOKIE_SECRET` and mint an identical payload.
`httpOnly` stops JavaScript, not DevTools → Application → Cookies. **A Finathon
volunteer can rename their `fin_session` cookie to `axe_session` and obtain the
founder analytics dashboard.** The reverse holds too.

Fix: bind the gate name into the signed payload. **This logs out every current
admin session** — correct for a privilege-separation fix, but worth knowing
before it happens.

### 6.4 Smaller, on-path

- No `error.tsx` under `app/Finathon/axe/26/` — a throw shows the framework's raw
  error surface. Matters more once columns are nullable.
- The dashboard search is `<form method="get">` over name, roll number and UTR,
  so an organiser searching for a student writes **a real bank UTR into the query
  string** — browser history, `Referer` headers, Vercel request logs. Same class
  of leak as the one already fixed, in a different place. → POST + Server Action.
- `next.config.mjs` has no `images` key at all, so rendering a Supabase-hosted
  screenshot with `next/image` throws at runtime until `remotePatterns` is added.
- `quoteFilterValue` escapes `"` and `\` but not `*`, which PostgREST treats as a
  wildcard in `ilike`.
- `.env` is **tracked by git**. `.gitignore` lists it, but ignore rules are inert
  on already-tracked paths. Contents today are only public Sanity ids — this is
  about the next person who appends a service key to the wrong file.

---

## 7. Copy corrections — both wrong on the live site now

### 7.1 Deadline 27 → 28 September

**28 September 2026 is a Monday.** Changing only the digit ships "Sun 28 Sep".

| File | Line | Now → becomes |
|---|---|---|
| `src/components/finathon/Countdown.tsx` | 23 | `2026-09-27T23:59:59+05:30` → `2026-09-28…` |
| `src/views/Finathon.tsx` | 51 | `"Sun 27 Sep"` → `"Mon 28 Sep"` |
| `src/views/Finathon.tsx` | 54 | `"Sunday 27 September, 11.59 pm IST"` → `"Monday 28 September…"` |
| `docs/finathon-blanks.md` | 74 | "closes 27 Sep" → "28 Sep" |

Server-side enforcement is new — the API rejects late submissions with `403`.
Today nothing enforces it: the countdown flips phase while the API keeps
accepting.

### 7.2 Team size 3–4 → 3–5

`src/views/Finathon.tsx:56` (`teamSize`), `:224`, `:228` (FAQ prose, "three or
four"), and `docs/finathon-blanks.md:79`. Lines 399, 412 and 622 derive from
`EVENT.teamSize` and need no edit.

---

## 8. Run order

| # | Step | Who | Blocks? |
|---|---|---|---|
| 0 | Inventory SQL — 4 read-only `SELECT`s, paste output back | **owner** | **yes, everything** |
| 1 | Repoint `.env.local` at `jgwvyyqagabtpnomdwgo` with real keys | owner | local dev only |
| 2 | Schema DDL in the web SQL editor | owner | yes |
| 3 | RPC function + its `revoke` | owner | yes |
| 4 | Storage bucket | owner | yes |
| 5 | Legacy copy + verification query | owner | no — additive |
| 6 | Delete `supabase/migrations/20260918101500_finathon_registration.sql` | me | no |
| 7 | Two-step form | me | no |
| 8 | API route + upload + validation | me | no |
| 9 | `/Finathon/axe/26` rewire | me | no |
| 10 | Security fixes §6 | me | no |
| 11 | 404, contrast, performance | me | no |
| 12 | Copy fixes §7 | me | no |
| 13 | Same env vars in Vercel production | owner | before deploy |

Step 6 matters: `supabase/migrations/` holds **two byte-identical files** creating
the same table under different versions (`20260918071243` and `20260918101500`,
differing only in line endings). Any future `db push` runs the second and fails
with `42P07 relation already exists`. `20260918071243` is authoritative — it
carries the version the server recorded.

---

## 9. Open questions

1. Is `finathon_registration` on the **live** project the shape the repo migration
   describes? That migration was verified against the paused project. Step 0
   answers it.
2. How many registrations actually exist? Unknown. Session notes say 2, but they
   describe the paused project.
3. Does the live project carry the undocumented `rls_auto_enable()` event trigger?
   It exists in no migration file and `grep` finds it nowhere in the repo.
4. Deleting the root `finathon-reg-scanner.jpeg` after copying it into `public/`
   needs explicit confirmation.

---

## 10. Deliberately not doing

- **No payment gateway.** UPI-to-QR with manual reconciliation is what was asked
  for. A gateway removes the screenshot entirely and is a far larger change.
- **No captcha.** It puts a third-party script on a payment page; the attempt
  ledger plus origin checking covers the realistic threat for a 5-day college
  event. Revisit if abuse actually appears.
- **No email confirmation to students.** No mail provider is configured here.
- **No site-wide CSP or TypeScript `strict`.** Owner scoped this pass to the
  registration path plus the three findings. A CSP on a site with Sanity, GA and
  embeds risks breaking pages nobody has audited; `strict: true` would surface a
  long tail of unrelated errors before anything could deploy.

---

## 11. Loose end

`package-lock.json` (355 KB) is tracked and there is **no `pnpm-lock.yaml`**,
despite pnpm being the only sanctioned package manager on this machine. Nothing
in this plan adds a dependency, so it is not blocking — but the next change that
does will create a second, divergent lockfile and Vercel may resolve from either.

---

## 12. Corrections found by the takeover session (2026-09-22, 14:00 IST)

Recorded here because each one was wrong or missing in the handoff, and a doc
that is trusted but wrong costs more than no doc at all.

### 12.1 The missing `fin` class is not unique to the register page

`app/Finathon/page.tsx:100` carries the **byte-identical** className and is also
missing `fin`. It survives only because `src/views/Finathon.tsx:320` supplies
`fin min-h-screen` on its own root element.

This matters in one specific way: anyone who "fixes" line 100 by analogy with
line 50 double-applies the class. Only `app/Finathon/register/page.tsx` needed
the change, because it renders `RegistrationForm` directly with no `fin`
ancestor. **Fixed on the register page only.**

### 12.2 Three more "27th" occurrences than the handoff table listed

`src/components/finathon/Countdown.tsx:13`, `src/views/Finathon.tsx:388` and
`docs/finathon-blanks.md:77` — the first two are code comments, the third is a
doc line. All three said "the 27th". A comment that disagrees with the code it
describes is how the next person gets misled into "correcting" the right value
back to the wrong one. **All fixed; a repo-wide grep now returns nothing.**

### 12.3 The QR asset is not a QR — it is a portrait payment card

`finathon-reg-scanner.jpeg` was recorded as "871×1317 JPEG" because nobody
opened it. It is a **Google Pay collection card**: payee **Katta Jathin**, UPI ID
`jathinkatta@okaxis`, amount **₹499.00 baked into the code**, with "Scan to pay
with any UPI app" beneath.

`RegistrationForm.tsx:201-204` renders `QR_IMAGE_SRC` at `width={176}
height={176}` — **square**. Dropping the card in as-is squashes a 0.66 aspect
ratio to 1.0, which distorts the QR module grid and makes the UPI-ID text
illegible at that size. The spec's "move the file and update the constant" was
written against an asset nobody had looked at.

**Done:** the QR square is cropped out to
`public/images/finathon/payment-qr.jpg`, 640×640, 48 KB (was 132 KB), with a
white quiet zone. It now renders correctly at 176×176 with no distortion.
**Open:** whether to render the UPI ID and amount as real HTML text beside it
rather than as pixels — better contrast, selectable, and lets the QR be larger
in the same space. Awaiting Teja.

**Also open, and nobody has raised it:** the payee is a personal UPI handle. The
past session confirms Katta Jathin was never discussed. Flagged, not decided.

### 12.4 §3's inventory SQL named columns nobody had seen

The original query selected `team_lead_name, roll_number, utr, ip_hash` from the
live table. The past session has since confirmed it **never connected to
`jgwvyyqagabtpnomdwgo`** — that column list came from a migration file verified
only against the *paused* project.

If the live shape differs by one name the query fails with `42703`, and the §4.4
legacy copy built on the same assumption would fail *after* the new tables
already exist. Replaced by
[`docs/finathon-step0-inventory.md`](docs/finathon-step0-inventory.md), whose
first query is `information_schema.columns` and assumes nothing but the table
name. **Treat §4.4 as a draft against an assumed schema, not a runnable
migration.**

### 12.5 `pnpm exec` breaks this repo

This repo is npm-managed — `package-lock.json` tracked, no `pnpm-lock.yaml`,
`node_modules` installed by npm. A single `pnpm exec tsc --noEmit` relocated 35
top-level packages into `node_modules/.ignored`, after which `zod`, `react`,
`next` and `typescript` stopped resolving. Restored by moving all 64 packages
back (merging at package level — pnpm moves `@scope/pkg` but leaves the `@scope`
shell, so a scope-level `mv` collides). No network, no lockfile change.

**Use `node node_modules/typescript/bin/tsc --noEmit` in this repo.** The
machine-wide pnpm-only rule is written for `1on1` / `1on1_sb` and does not
describe this one.

### 12.6 Why there is no type-safety net, precisely

`tsc --noEmit` reports 31 errors repo-wide. **29 come from a vendored
`gsap-skills/` directory** that `tsconfig.json` does not exclude, and one more
from a Sanity type import. Zero come from app code.

That noise is almost certainly why `next.config.mjs` sets
`typescript.ignoreBuildErrors: true` — which is what lets a type error in the
PII path deploy green. Excluding `gsap-skills` from `tsconfig.json` would make
the checker usable again and is a two-line change.
