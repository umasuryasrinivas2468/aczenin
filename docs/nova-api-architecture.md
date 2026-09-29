# Nova API — architecture and build plan

*Written 2026-09-29. Status: **design, not yet built.** Nothing below exists in
the repo or the database until the build log at the bottom says so.*

## 1. What we are building

A read-only sandbox API for Aczen's accounting data, plus two web portals.

| URL | Who | What |
|---|---|---|
| `aczen.in/nova-api` | anyone | Public API reference and the sign-in form (email + password set by an admin) |
| `aczen.in/nova-api/dashboard` | allowlisted emails | Create, list and revoke your own API keys; see your usage |
| `aczen.in/nova-api/axe` | Aczen team (password) | Manage the allowlist, see every key, revoke any key, see usage |
| `aczen.in/nova-api/v1/*` | API key holders | `GET` JSON: invoices, payments, quotations, purchase bills, clients, vendors, expenses, inventory |

**The data is one shared dummy dataset.** Every key reads the same rows, and
there is no tenant column. The API is **GET-only**: it has no route that
writes business data.

The contract follows `dashboard.aczen.in/docs/api` (the Aczen Bilz v1 API) on
purpose, so an integration built against the sandbox moves to the real API by
changing the base URL and the key. It copies the reference's:
- `Authorization: Bearer <key>` auth
- the `{ data, pagination: { limit, offset, total, has_more } }` list envelope
- the `{ error: { type, code, message, details? }, request_id }` error envelope and its error codes
- the filter grammar (`field=`, `field.in=`, `.gte=`, `.lte=`, `.gt=`, `.lt=`, `.ilike=`)
- `limit` (1–200, default 50), `offset`, `sort`, `order`
- the `RateLimit-*` and `Retry-After` headers, with a limit of 120 requests per minute per key

*Found while reading the reference: `dashboard.aczen.in/api/v1/openapi.json`
returns HTTP 500 `FUNCTION_INVOCATION_FAILED` (checked 2026-09-29). This is a
bug in the reference site, not in this repo. Report it to whoever owns it.*

## 2. The approach: options compared

| Option | Verdict | Why |
|---|---|---|
| **A. Expose Supabase PostgREST directly** with RLS | ❌ | Supabase has no per-user API keys. The only keys are anon and service, and both are shared. You could not revoke one user, rate-limit per key, or cut off someone removed from the allowlist. |
| **B. Supabase Edge Functions** for `/v1`, Next.js for the portals | ❌ for now | Splits one product across two deploy pipelines and two runtimes. It still needs a Vercel rewrite to live at `aczen.in/nova-api/v1`, and it cannot reuse the gate, rate-limit and mail code already in this repo. Its one advantage — Teja can deploy it without Vercel access — is real; see §9. |
| **C. Next.js route handlers in this repo** ✅ | **Recommended** | Same domain, one deploy, one runtime. It reuses `src/lib/axe/session.ts` (scrypt + HMAC cookie), `src/lib/axe/identity.ts` (IP hashing), the Zoho SMTP mailer and the hand-rolled PostgREST fetch pattern. Vercel Fluid Compute scales it horizontally with no work from us. |

**The pattern behind C is an API gateway in front of a private database.**
Postgres is never reachable with a user's credential. Every request goes
through code that (1) authenticates the key, (2) meters it, and (3) turns an
allowlisted filter set into a query. The database only ever sees the service
role, from our server.

## 3. The shape of the system

```
 browser / curl
      │
      ▼
 aczen.in (Vercel, Next.js 15, Node runtime)
 ├── middleware.ts ─── /Nova-api, /NOVA-API … → 308 → /nova-api
 ├── /nova-api                 page: docs + email sign-in
 ├── /nova-api/dashboard       page: my keys          ──┐ server actions
 ├── /nova-api/axe             page: admin            ──┤ (session-checked)
 └── /nova-api/v1/[...path]    route handler: the API ──┘
              │  1 RPC  nova_authenticate_key(hash)  → key + rate-window count
              │  1 GET  nova_*_v view with filters   → rows + exact count
              ▼
 Nova Supabase project (Postgres + PostgREST), service role only
   RLS on, zero policies, anon/authenticated revoked on every nova_ table
```

**Every API request makes two database round trips**: authenticate-and-meter,
then read. Both go over HTTPS to PostgREST, which keeps its own connection
pool. So serverless fan-out cannot exhaust Postgres connections — the classic
failure of serverless apps that talk to Postgres directly.

## 4. The database

### 4.1 Which project

**Recommended: a dedicated Supabase project for Nova**, separate from
`jgwvyyqagabtpnomdwgo` (the live aczen.in project that holds Finathon
registrants' names, roll numbers and payment references).

The reason is blast-radius isolation. The Nova API's job is to turn untrusted
query strings into database reads. If the filter allowlist ever has a bug, the
worst it can reach should be dummy invoices, not real PII. Separate projects
make that a property of the infrastructure rather than of our code. This is
also why the code uses its own environment variables (`NOVA_SUPABASE_URL`,
`NOVA_SUPABASE_SERVICE_ROLE_KEY`) and never the site's `SUPABASE_*` variables.

### 4.2 Access control on every `nova_` table

- `enable row level security`, with **no policies** — not `force`, because
  `nova_authenticate_key` runs as the table owner under `security definer`
  and a forced table would hide every key from it
- `revoke all … from anon, authenticated`

Only the service role, which bypasses RLS, can touch these tables. The anon
key ships in every page's JavaScript and must be treated as public; with no
grants, it reads nothing.

**How "read-only for users" is enforced, in layers:**
1. The `/v1` handler answers only `GET`, `HEAD` and `OPTIONS`. Anything else
   gets `405 method_not_allowed` with an `Allow` header.
2. The module `/v1` imports for data (`src/lib/nova/db.ts` → `novaRead`)
   exposes only `GET`. Write helpers live in a separate export used by the
   portals, never by `/v1`.
3. Data is read from `nova_*_v` **views**, not base tables.
4. *Upgrade path, not built:* a dedicated `nova_reader` Postgres role with only
   `SELECT` on the views, reached through a PostgREST JWT carrying
   `role: nova_reader`. It would make read-only a database guarantee rather
   than a code guarantee. Build it when real customer data is involved.

### 4.3 Business tables (dummy data)

Text primary keys carry a type prefix, as in the reference API (`inv_8f2c91a4`).
A reader can tell what an id points to, and pasting a client id where an
invoice id belongs fails as a clean 404.

| Table | Prefix | Key columns |
|---|---|---|
| `nova_clients` | `cli_` | name, gst_number, email, phone, billing_address, state, state_code |
| `nova_vendors` | `ven_` | name, gst_number, email, phone, address, state, bank_ifsc, bank_account_last4 |
| `nova_invoices` | `inv_` | invoice_number, client_id→clients, client_name, client_gst_number, items jsonb, amount, gst_amount, cgst/sgst/igst_amount, intra_state, total_amount, paid_amount, status, invoice_date, due_date, currency |
| `nova_quotations` | `quo_` | quotation_number, client_id, client_name, items, amount, gst_amount, total_amount, status, quotation_date, valid_until, converted_invoice_id |
| `nova_payments` | `pay_` | payment_number, invoice_id→invoices, client_id, client_name, amount, payment_date, method, reference |
| `nova_purchase_bills` | `bil_` | bill_number, vendor_id→vendors, vendor_name, vendor_gst_number, items, amount, gst/cgst/sgst/igst, total_amount, paid_amount, status, bill_date, due_date, reverse_charge, itc_eligible |
| `nova_expenses` | `exp_` | expense_number, category, vendor_name, description, amount, gst_amount, total_amount, tds_rate, tds_amount, payment_method, expense_date |
| `nova_inventory` | `itm_` | sku, name, hsn_code, unit, sale_price, purchase_price, gst_rate, quantity_on_hand, reorder_level |
| `nova_stock_movements` | `mov_` | item_id→inventory, movement_type, quantity (signed), reference, movement_date |

Line items are stored as `jsonb` on the document, not in a child table. The
data is read-only and always returned whole with its document, so a child
table would add a join and nothing else.

**`overdue` is computed in a view, not stored.** `nova_invoices_v` and
`nova_purchase_bills_v` return `status = 'overdue'` when a document is
`pending`/`partial` and `due_date < current_date`. Filtering on
`status=overdue` works with no background job, which is how the reference API
describes its own behaviour, and the dummy data ages realistically as the
calendar moves.

**The seed is deterministic** (`setseed()` plus `generate_series`), so
re-running it reproduces the same rows and every user sees identical data.
Seed sizes: 40 clients, 20 vendors, 300 invoices, 80 quotations, ~220
payments, 150 bills, 200 expenses, 50 items, 400 movements. Dates span the
last 12 months relative to the seed date. Totals obey GST arithmetic: CGST+SGST
for an intra-state document, IGST for an inter-state one.

### 4.4 Platform tables

| Table | Purpose |
|---|---|
| `nova_allowlist` | `email` (PK, lowercase-checked), `note`, `password_hash` (scrypt `salt:hash`, set by an admin), `created_at`. **Deleting a row cuts access immediately**: the auth RPC joins it, so keys stop working and portal sessions die on the next request. |
| `nova_portal_session` | `token_hash` (sha256 of a random 32-byte cookie), `email`, `expires_at` (7 days) |
| `nova_api_key` | `id` uuid, `email`, `name`, `prefix` (first 16 chars, for display), `key_hash` (sha256, unique), `rate_limit_per_min` (default 120), `created_at`, `last_used_at`, `revoked_at` |
| `nova_api_usage` | `(key_id, window_start)` PK, `request_count` — one row per key per active minute. It is both the rate-limit counter and the usage history. |
| `nova_auth_attempt` | `ip_hash`, `kind` (`admin` / `portal_login`), `email`, `succeeded`, `occurred_at` — brute-force throttling |

**`nova_authenticate_key(p_key_hash text)`** — a `security definer` function
that only `service_role` may execute. In one statement it:
1. finds a non-revoked key whose email is still in the allowlist,
2. upserts `nova_api_usage` for the current minute with `request_count + 1`,
3. updates `last_used_at` at most once a minute, to avoid write amplification,
4. returns `key_id, email, key_name, key_prefix, rate_limit_per_min, request_count, window_start, key_created_at`.

One round trip does authentication and metering together, and the upsert is
atomic. Two concurrent requests cannot both read `119` and both pass.

## 5. Security model

| Secret | How it is stored | Why |
|---|---|---|
| API key `nova_sk_<43 chars base64url>` (32 random bytes) | sha256 hash only; shown **once** at creation | 256 bits of entropy cannot be brute-forced, so a fast hash is correct. A slow hash like scrypt would add ~50 ms to every API call for no gain. |
| Portal session cookie | sha256 hash in `nova_portal_session`; cookie is `httpOnly`, `secure`, `sameSite=lax` | Stored server-side rather than self-contained, so removing someone from the allowlist or signing them out takes effect instantly. |
| Portal user password | scrypt `salt:hash` in `nova_allowlist.password_hash`, set or reset by an admin in `/nova-api/axe`; a reset also deletes that user's sessions | Same verifier as the admin gate (`verifyPasswordAgainst`). Admin-set rather than self-chosen at first login, because first-login self-registration lets anyone who knows an allowlisted email claim that account first. |
| Admin password | scrypt `salt:hash` in `NOVA_ADMIN_GATE_HASH`; cookie minted by the existing `mintSessionCookie("nova-admin")` | Reuses the audited `/axe` gate code. The gate name is inside the HMAC, so an `axe_session` or `fin_session` cookie renamed into `nova_admin` fails. |

**The admin password is never written into the repo** — not in code, not in
this doc. Only its scrypt hash goes into a Vercel environment variable.
Password strength: two dictionary words, lowercase, 12 characters, which is
weak against an offline attack. The defence is that the only online path is
rate-limited: 8 attempts per 15 minutes per IP, the same as the Finathon
gate. Rotate it to a random passphrase before the portal is announced widely.

**Throttles:**
- Portal sign-in: 10 attempts per IP per 15 minutes, and 5 failures per email
  per 15 minutes. Both are checked **before** scrypt runs.
- An unknown email still runs scrypt, against a dummy hash, and gets the same
  "Incorrect email or password." So neither timing nor wording reveals who is
  on the allowlist.
- Keys: at most 5 active keys per email.
- API: the per-key limit from `nova_api_key.rate_limit_per_min`. It fails
  *closed* if the database is down, because a request that cannot be
  authenticated cannot be served anyway. This differs from the reference, which
  fails open.

**CORS on `/v1`:** `Access-Control-Allow-Origin: *`, with no credentials. Auth
is a bearer header, never a cookie, so a hostile origin gains nothing and
browser-based testing works.

## 6. API reference (what `/v1` serves)

Base URL: `https://www.aczen.in/nova-api/v1`. It must be `www`: the apex `aczen.in` 308-redirects to `www`, and clients drop `Authorization` on a cross-host redirect, so the apex returns 401 (found in the production check, 2026-09-29).

| Route | Notes |
|---|---|
| `GET /health` | No auth. `{ "status": "ok" }` |
| `GET /me` | Key's email, name, prefix, rate limit, created_at |
| `GET /invoices`, `/invoices/{id}`, `/invoices/{id}/payments` | Filters: status, invoice_date, due_date, client_id, client_name, total_amount, invoice_number |
| `GET /clients`, `/clients/{id}` | Filters: name, gst_number, state |
| `GET /quotations`, `/quotations/{id}` | Filters: status, quotation_date, client_id, client_name, total_amount |
| `GET /payments`, `/payments/{id}` | Filters: payment_date, method, invoice_id, client_id, amount |
| `GET /vendors`, `/vendors/{id}` | Filters: name, gst_number, state |
| `GET /purchase-bills`, `/purchase-bills/{id}` | Filters: status, bill_date, due_date, vendor_id, vendor_name, total_amount, reverse_charge, itc_eligible |
| `GET /expenses`, `/expenses/{id}` | Filters: category, expense_date, payment_method, total_amount |
| `GET /inventory`, `/inventory/{id}`, `/inventory/{id}/movements` | Filters: sku, name, hsn_code, quantity_on_hand |

Every list route supports `limit`, `offset`, `sort` (from a per-resource
allowlist) and `order`. Every row carries `"object": "<type>"`. Responses carry
`X-Request-Id`, `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`.

**Resources are defined in one registry** (`src/lib/nova/resources.ts`) and
served by one catch-all handler. Eight resources share identical list, get and
filter logic, so one table of config beats eight near-copies of a route file.
Adding a resource means adding a registry entry and a view.

**The filter grammar is validated before it reaches PostgREST.** Each field
declares a type (`string` / `enum` / `date` / `number` / `boolean`) and its
allowed operators. An unknown field returns `400 unknown_filter`. A disallowed
operator returns `400 unsupported_operator`. A value that fails its type
(`invoice_date.gte=yesterday`) returns `400 validation_failed`. Values are
URL-encoded. `in` lists are double-quoted per PostgREST rules, and `ilike`
wildcards are added by us, never taken from the user. Untrusted input only
ever reaches the database as a validated value, never as syntax.

## 7. Files and ownership

| File | Owns |
|---|---|
| `supabase/nova/001_schema.sql` | Tables, views, RLS, grants, `nova_authenticate_key` |
| `supabase/nova/002_seed.sql` | Deterministic dummy data (re-runnable: truncates business tables first) |
| `src/lib/nova/db.ts` | PostgREST fetch client for the Nova project: `novaRead`, `novaRpc`, `novaWrite` |
| `src/lib/nova/resources.ts` | The resource registry and the filter → PostgREST translator |
| `src/lib/nova/apiKeys.ts` | Key generation, hashing, authenticate-and-meter |
| `src/lib/nova/portalAuth.ts` | Allowlist check, code send/verify, portal sessions |
| `src/lib/nova/adminGate.ts` | `nova_admin` cookie and password check (wraps `@/lib/axe/session`) |
| `app/nova-api/v1/[...path]/route.ts` | The API |
| `app/nova-api/page.tsx` + `components/nova/*` | Docs and sign-in |
| `app/nova-api/dashboard/*` | Key management (server actions) |
| `app/nova-api/axe/*` | Admin portal (server actions) |
| `src/lib/axe/session.ts` | **One-line edit:** add `"nova-admin"` to `SessionGate` |
| `middleware.ts` | Case-canonicalise `/nova-api` like `/Finathon` |

## 8. Environment variables (new)

| Name | Value |
|---|---|
| `NOVA_SUPABASE_URL` | `https://<nova-ref>.supabase.co` |
| `NOVA_SUPABASE_SERVICE_ROLE_KEY` | Nova project's service-role key (server-only; never `NEXT_PUBLIC_`) |
| `NOVA_ADMIN_GATE_HASH` | `saltHex:keyHex`, from `node -e "const c=require('crypto');const s=c.randomBytes(16);console.log(s.toString('hex')+':'+c.scryptSync(process.argv[1],s,64).toString('hex'))" '<password>'` |

Reused from the existing deploy: `AXE_COOKIE_SECRET`, `AXE_SALT`.

## 9. Blockers and risks — read before building

1. **Production env vars.** The three vars in §8 must be added to the
   aczen.in Vercel project. Teja has a Vercel login for it (stated
   2026-09-29; the 2026-09-17 CLI audit found only `mallamteja-projects`, so it
   is a different login). Until the vars are added, `/nova-api` renders but
   every data call fails. Pushing to `main` deploys to production.
2. **Whoever owns the Vercel project can read `NOVA_SUPABASE_SERVICE_ROLE_KEY`.**
   That is acceptable only because the Nova project holds dummy data. It is
   another reason not to put Nova in the live PII project.
4. `nova_api_usage` grows by one row per active key-minute. At 100 keys all
   busy around the clock, that is ~52 M rows a year. Prune rows older than 90
   days (`pg_cron`) once it exceeds ~1 M rows.

## 10. Scaling path (not built — build when measured)

| When | Do |
|---|---|
| API traffic exceeds ~200 req/s sustained | Move the rate-limit counter to Upstash Redis (Vercel Marketplace), and cache key lookups in memory for 30 s |
| Deep pagination gets slow | Add keyset (`starting_after=`) pagination alongside offset |
| Real per-customer data | Add `org_id` to the business tables, bind each key to an org, and have the registry apply a mandatory `org_id=eq.` filter; add the `nova_reader` role from §4.2 |
| Write endpoints | A separate handler with its own idempotency table. Do not widen `/v1`'s read client. |

## 11. Build log

- 2026-09-29 — design written.
- 2026-09-29 — Nova project is `iwryjcsonuuhmegvihdg` (ap-northeast-1). Reach it
  with psql via `aws-0-ap-northeast-1.pooler.supabase.com:5432`, user
  `postgres.iwryjcsonuuhmegvihdg`. The direct `db.` host is IPv6-only, and the
  project is not visible to the local CLI login. `001_schema.sql` **applied**
  and verified: 15 tables with RLS on, 9 views, and anon denied (`42501`) on
  views, key tables and `nova_authenticate_key`.
- 2026-09-29 — pushed `0bab0e9`. On production, pages and `/health` return 200. Keyed calls return 502 until the `NOVA_*` env vars are added in Vercel. Base URL corrected to `www`.
- 2026-09-29 — sign-in changed from an emailed code to email + admin-set
  password (Teja). Applied live: `nova_allowlist.password_hash` was added and
  `nova_auth_attempt.kind` became `admin`/`portal_login`. The empty table
  `nova_login_code` **still exists live** (a drop was blocked pending Teja's
  OK). The schema file no longer creates it.
- 2026-09-29 — `ee83490`: login throttles are now log-then-count (a parallel
  burst can't bypass them), and the per-email lockout was dropped.
- 2026-09-29 — **One active key per email** (Teja). Enforced by the partial
  unique index `nova_api_key_one_active_per_email`, which can't be raced like
  an app-side count.
- 2026-09-29 — **Per-request log** `nova_api_request` (`003_one_key_and_request_log.sql`,
  applied live). `/v1` appends one row per authenticated call via
  `nova_log_request()` inside Next's `after()`, so it adds no response
  latency. It records status, error code and message, duration and request
  id. It is the only write `/v1` makes, and it touches the audit log, never
  business data. Unauthenticated 401s are not logged: there is no key to
  attribute them to. It feeds the user's `/nova-api/usage` analytics page.
- 2026-09-29 — Portal redesign in progress: no landing page, `/nova-api` is
  sign-in only, then a left-sidebar app shell (`src/components/nova/shell/`)
  with API keys, Usage & logs, and Documentation sections. The admin uses the
  same shell.
- 2026-09-29 — **Per-team slices** (Teja: fixed slice per team, coherent books,
  70+ teams). `004_team_slices.sql` is applied live. It adds `slice_no` on
  every business table, `nova_dataset_meta.slice_count`, and
  `nova_allowlist.slot`, taken from a sequence in the order teams are added.
  Auth now returns `team_slot` and `slice_no = slot % slice_count`, and the
  API pins `slice_no` on every list, get and child read. It can't be
  overridden: `?slice_no=` returns 400, and another team's id returns 404.
  The reseed produced **80 slices**: 4 clients, 30 invoices, ~22 payments,
  8 quotations, 2 vendors, 15 bills, 20 expenses, 5 items and 40 movements
  per team. Totals are 320 / 2400 / 1786 / 640 / 160 / 1200 / 1600 / 400 /
  3200. Teams 81+ wrap around. Live isolation test passed: two teams saw
  different books, and a cross-team get returned 404. Invoice md5
  `ceced81e91969d052ea929d77fcff79c`.
- 2026-09-29 — Finathon has 54 problem statements
  (`Finathon_Problem_Statements.xlsx`). The coverage analysis is in
  `docs/nova-finathon-data-coverage.md`, still in progress. Today's data
  covers only a small subset.
