# `finathon_registration` — applied schema, verification, and what it still needs

Applied to the **`aczenin` Supabase project** (`zpkvshwmbgomrycoeqqd`, ap-southeast-1)
on 2026-09-18 as migration `20260918071243_finathon_registration`.

Local file: `supabase/migrations/20260918071243_finathon_registration.sql`.

> **Project naming.** This is the `aczenin` Supabase project, not `fintrack`,
> `applyy` or `magent_rag` — all four live in the same Supabase org. Name the
> project ref when writing about it; "the Supabase project" is ambiguous here.

---

## 1. Why the local filename carries the server's version number

The migration was applied through the Supabase MCP **first**, then the local file
was named with the exact version the server recorded (`20260918071243`).

Doing it the other way round — naming the file from local clock time, then
applying — produces two different version strings for one change, and the next
`supabase db push` tries to run it a second time against a table that already
exists. Reading the recorded version back and naming the file to match is the
cheap version of *discover-before-mutate*: let the system that owns the
identifier assign it, then adopt it.

---

## 2. Verification — what was actually checked, not assumed

`apply_migration` returning `{"success": true}` only says the DDL parsed and ran.
Every protective claim in the migration's comments was checked separately.

| Claim in the migration | How it was checked | Result |
|---|---|---|
| RLS enabled **and forced** | `pg_class.relrowsecurity` / `relforcerowsecurity` | both `true` |
| anon + authenticated hold no privileges | `information_schema.role_table_grants` | empty result |
| Unique indexes are functional, not plain column uniques | `pg_indexes.indexdef` | both on `upper(btrim(...))` |
| The anon key can read nothing | live `GET /rest/v1/finathon_registration` with the anon key | `HTTP 401`, SQLSTATE `42501` |
| The anon key can write nothing | live `POST` with the anon key | `HTTP 401` |

The last two matter most and are the ones people skip. Reading the grant table
proves the *configuration*; sending a real request with the key that ships to
every visitor proves the *outcome*. They can disagree — a privilege granted at
the schema level, or through a role the table grants don't mention, would not
show up in the first check.

Indexes as built:

```
finathon_registration_pkey              UNIQUE (id)
finathon_registration_roll_number_key   UNIQUE (upper(btrim(roll_number)))
finathon_registration_utr_key           UNIQUE (upper(btrim(utr)))
finathon_registration_submitted_at_idx  (submitted_at DESC)
finathon_registration_ip_hash_idx       (ip_hash, submitted_at DESC)
```

---

## 3. BLOCKER — the migration documents a safety net that does not exist

The migration's header comment says:

> *"Write errors from this table must never be logged verbatim … See the
> SupabaseWriteError path in `src/lib/axe/supabase.ts`, which extracts only
> SQLSTATE and hint."*

**There is no `SupabaseWriteError`, and the insert path does the opposite.**

- `src/lib/axe/supabase.ts:198` — `axeInsert` throws
  `` `Supabase insert into ${table} failed (${response.status}): ${body}` ``,
  interpolating the **entire raw PostgREST body**.
- The safe extractor (`describeFailure`, which whitelists only `code` and `hint`)
  is wired into `axeSelect` and `axeCount` — the **read** paths — not the write
  path.

Why this is worse here than anywhere else in the schema: a duplicate submission
is not an edge case on this table, it is the *expected* failure. Both unique
indexes exist precisely so resubmissions bounce. On a unique violation Postgres
puts the offending value in `message` / `details`:

```
Key (upper(btrim(roll_number)))=(23R21A66D4) already exists.
```

So the first student who double-submits writes their real roll number — and on
the other index, a real bank UTR — into a runtime log that outlives the request.
That is the exact failure `describeFailure` was written to prevent, on the one
table in this database that holds personal data.

The live 401 body captured during verification already shows the shape:
PostgREST forwarded a `hint` naming the table alongside a `message`. On a
constraint violation those fields carry row values instead.

**Also blocking:** `AxeTable` (`supabase.ts:45`) is
`"page_view" | "lead_event" | "cta_click" | "axe_auth_attempt"`. It does not
include `finathon_registration`, so no insert can be written against this table
until the union is widened.

**Recommended fix — route to whoever owns `src/lib/axe/`:** point `axeInsert` at
`describeFailure` the way `axeSelect` already does, and add the table to
`AxeTable`. Not done in this session: `supabase.ts` is in the `axe` write
partition, and its own header comment records that neighbouring files are owned
by another session in this tree.

---

## 4. Schema drift — the live database is not what the repo describes

Three things exist in the live database and in **no migration file**:

1. **`public.rls_auto_enable()`** — a `SECURITY DEFINER` event-trigger function.
2. **`ensure_rls`** — a `ddl_command_end` event trigger that calls it, running
   `alter table … enable row level security` on every new `public` table.
3. **`FORCE` row level security on all four `axe` tables.** The repo migration
   `20260917141340` runs `enable` only, and `rls_auto_enable` also only runs
   `enable` — yet `page_view`, `lead_event`, `cta_click` and `axe_auth_attempt`
   all report `relforcerowsecurity = true`. Something applied `FORCE` out of
   band; whatever it was is not in this repo.

`grep -rn "rls_auto_enable" .` returns nothing outside `node_modules`.

Why it matters: `supabase db reset`, or standing this project up fresh from the
migrations, yields a **weaker** database than production — one with no auto-RLS
trigger and no `FORCE` on the analytics tables. Drift that makes the rebuilt
copy *safer* is survivable; drift in this direction means the protection only
exists where nobody wrote it down.

Supabase's security advisor also flags the function twice (`WARN`), because it is
callable by `anon` and `authenticated` via `/rest/v1/rpc/rls_auto_enable`:

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Practical exploitability is low — a function returning `event_trigger` errors when
invoked as an ordinary RPC — but it is `SECURITY DEFINER` and publicly callable,
which is worth closing with
`revoke execute on function public.rls_auto_enable() from anon, authenticated;`
in a migration that also captures the function and trigger definitions so the
repo stops lying about the database.

### Not a finding: `rls_enabled_no_policy`

The advisor reports `INFO: RLS Enabled No Policy` on all five tables. That is the
**intended** design, documented in both migrations: zero policies plus revoked
grants means every role except `service_role` gets nothing. Do not "fix" it by
adding a policy — a policy would widen access, not narrow it.

---

## 5. The routes in the comment do not exist yet

The header comment locates this table at two URLs:

| Referenced in comment | Actually in the repo |
|---|---|
| `aczen.in/Finathon/register` | does not exist — `app/Finathon/` holds only `page.tsx` and `finathon.css` |
| `aczen.in/Finathon/axe/26` | does not exist — the dashboard is `app/axe/page.tsx` and `app/axe/leads/page.tsx` |

Schema-first is fine; the table legitimately precedes the form. The problem is
that the comment states the routes in the present tense, so the next reader greps
for a register route and concludes the repo is broken.

Two names need settling before those routes are built, per the naming rule (never
let one name mean two things):

- The dashboard is `/axe`. The comment invents a second, nested location
  `/Finathon/axe/26`. Pick one and use it everywhere.
- Route casing is already inconsistent: `app/Finathon` is capitalised while every
  sibling (`app/axe`, `app/about`, `app/partners`) is lowercase.

---

## 6. This table changes `/axe`'s privacy posture

`src/lib/axe/leads.ts` opens with a deliberate, dated decision: the founder
dropped name and email from the Leads section on 2026-09-17, so that
**"`/axe` has no personal data in it at all"**.

That sentence stops being true the moment a registrations view is added to the
same dashboard. The two are not in conflict — `lead_event` is still anonymous,
and this table's protection is access control rather than anonymisation — but the
standing claim in `leads.ts` becomes surface-specific rather than global, and
should be amended when the registrations view lands. Otherwise the next person
reads that comment, believes the dashboard is PII-free, and reasons about logging
and error handling on that basis.

---

## 7. Open decisions for the organisers

- **Retention.** The migration says rows "should be deleted once the hiring
  evaluation closes and the payments are reconciled" but nothing enforces it.
  There is no scheduled deletion. Either add one (`pg_cron`) or record the date
  someone does it by hand.
- **Rate limiting.** `ip_hash` and its index exist for a per-source rate limit in
  the API route. That route is not written yet, so the column is currently unused.
- **`ip_hash` is nullable**, unlike `axe_auth_attempt.ip_hash` which is `not
  null`. If the rate limit is meant to be unconditional, a null defeats it. Worth
  deciding deliberately rather than inheriting it.
