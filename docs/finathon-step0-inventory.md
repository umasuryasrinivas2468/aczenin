# Finathon — Step 0: live database inventory

**Status:** waiting on Teja to run this and paste the output back.
**Blocks:** all DDL, and the legacy-copy SQL in
[`finathon-registration-rework-design.md`](finathon-registration-rework-design.md) §4.4.
**Run against:** the **live** project `jgwvyyqagabtpnomdwgo` — *not* the paused
`zpkvshwmbgomrycoeqqd` that `.env.local` and the Supabase CLI point at.

Everything on this page is read-only. No `insert`, no `update`, no `alter`,
no `drop`. It is safe to run on production.

---

## Why this replaces §3 of the design doc

The original §3 asked for this:

```sql
select id, submitted_at, team_lead_name, roll_number, utr,
       (ip_hash is null) as ip_hash_missing
from public.finathon_registration ...
```

**That query names six columns nobody has ever seen.** It was written from
`supabase/migrations/20260918071243_finathon_registration.sql`, and that
migration was only ever verified against the **paused** project. Nobody has
connected to the live database at any point — confirmed directly by the session
that wrote the design doc.

So if the live table's shape differs by even one column name, that query fails
with `42703 column does not exist`, and — worse — the legacy-copy SQL in §4.4
built on the same assumption would fail *after* the new tables already exist.

**Technique: discover before mutate.** Ask the database what it has before
writing anything that depends on the answer. Query 1 below assumes nothing but
the table's name.

---

## Run these five queries and paste all five outputs back

### 1. What columns actually exist

The one query that assumes nothing. Everything else is shaped from its output.

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'finathon_registration'
order by ordinal_position;
```

### 2. How many rows are at stake

The number that matters most. Session notes claim 2, but those notes describe
the paused project, so treat them as unverified.

```sql
select count(*) as total_rows from public.finathon_registration;
```

### 3. The rows themselves

`select *` deliberately, rather than a column list — this cannot fail on a
column-name mismatch, and the row count is small enough that the full dump is
readable.

> **This output contains real student PII** — names, roll numbers and bank UTRs.
> Paste it back here if you are comfortable with that. If you would rather not,
> run query 1 and query 2 only, tell me the row count, and I will shape the copy
> SQL from the column list alone. It costs one extra round trip and nothing else.

```sql
select * from public.finathon_registration order by submitted_at desc;
```

### 4. What else is in the database

Confirms which tables the migration actually created on *this* project, and
whether the storage bucket already exists.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select id, name, public from storage.buckets;
```

### 5. Does the undocumented RLS trigger exist here

`rls_auto_enable()` appears in no migration file and `grep` finds it nowhere in
the repo, yet a previous session recorded Supabase's advisor flagging it. If it
is present on the live project it auto-enables RLS on newly created tables —
harmless, because the new DDL does that explicitly, but it means a local
`supabase db reset` would produce a *weaker* database than production, which is
the kind of difference that surfaces at the worst moment.

```sql
select p.proname, p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

select tgname, tgrelid::regclass as on_table
from pg_trigger
where not tgisinternal
order by tgname;
```

---

## What happens with the output

1. The `finathon_team` / `finathon_participant` / `finathon_register_attempt`
   DDL (§4.2 of the design doc) is **not** affected — it creates new tables and
   depends on nothing existing.
2. The **legacy copy** (§4.4) gets rewritten against the real column names
   before it is handed over. Until then it is a draft, not a migration.
3. The row count from query 2 becomes the assertion the post-copy verification
   query checks against. `old_rows = copied_teams = copied_people`, or stop.

---

## Getting the credentials question out of the way

Teja offered: *"whatever you want supabase ask me or use env vars."*

Two ways to run the above, and they are not equally safe:

| Route | What it costs | Recommendation |
|---|---|---|
| **Supabase web SQL editor**, paste output back | one round trip | **Do this.** No secret ever leaves the dashboard. |
| Hand over the `service_role` key so a session runs it directly | the key lands in a chat transcript, session logs and possibly a scrollback buffer — and `service_role` bypasses RLS on every table in the project | Avoid for a read-only query. Not worth it. |

A `service_role` key is the highest-privilege credential the project has. There
is no reason to expose one to run five `select`s that the dashboard already runs
authenticated. If keys do need to move later — for `.env.local`, or for Vercel
production — put them in the file or the Vercel dashboard directly rather than
pasting them into a conversation.
