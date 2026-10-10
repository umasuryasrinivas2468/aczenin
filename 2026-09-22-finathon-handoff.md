# HANDOFF — Finathon registration rework

**From:** session `aczenin-0c` · **To:** the next session picking this up
**Written:** 2026-09-22 13:55 IST
**Reason for handoff:** long-context session retired to save credits. No work
was lost; everything below is on disk.

---

## Read these three files first, in this order

1. **[`2026-09-22-finathon-registration-task.md`](2026-09-22-finathon-registration-task.md)** (root, 429 lines) — status, architecture approach and reasoning, schema summary, security findings, run order.
2. **[`docs/finathon-registration-rework-design.md`](docs/finathon-registration-rework-design.md)** (764 lines) — the specification. Every SQL statement is runnable as written.
3. This file — what is done, what is not, and the traps.

Do not re-run recon. Four agents already did it and their findings are baked
into those two docs. Re-deriving costs tokens and produces the same answers.

---

## The task, in one paragraph

`aczen.in/Finathon/register` currently collects three fields in one form. It must
become two steps: **step 1** = team name + team lead (name, college, roll number,
phone, email) + 2–4 additional members (name, college, roll, phone, email each);
**step 2** = pay ₹499 to a UPI QR, upload a payment screenshot showing the
transaction/UTR, type the UTR, submit. Everything persists to Supabase Postgres
in one transaction. `aczen.in/Finathon/axe/26` displays the result with a
pending → approved/rejected workflow. Security is the stated top priority.
**Existing registrations must not be lost.**

---

## Owner's decisions — already made, do not re-ask

| Question | Decision |
|---|---|
| Supabase access | **Owner runs SQL himself in the Supabase web editor.** Do not attempt `supabase db push` — the CLI is linked to the wrong, paused project. Write SQL; hand it over. |
| Team size | **3 to 5 total including the lead** → lead + 2 to 4 members |
| Screenshot storage | **Private Supabase Storage bucket**, server-side upload, signed URLs for admin |
| Payment verification | **Status `pending` by default**, owner approves/rejects in the dashboard |
| Security scope | **Registration path + the 3 findings only.** No site-wide CSP. No TypeScript `strict`. |
| Deadline | **28 September 2026** (owner corrected it from 27; the site still says 27) |
| Extra scope added mid-session | input/form validation, custom 404, page-load speed, colour-contrast fixes |

---

## Status

**Nothing is implemented. ~20% overall, all of it recon and design.**

Done: 4 recon agents, the design spec, the task doc, docs index updated.
Not done: everything that writes code or SQL.

Nothing has been committed. `git status` shows the two new `.md` files plus
`finathon-reg-scanner.jpeg`, all untracked.

---

## Two gates block progress

### Gate 1 — the inventory query (blocks ALL DDL)

The owner must run §3 of the design doc — four read-only `SELECT`s — and paste
the output back. **Do not author or run DDL before this.** The live row count is
genuinely unknown, and the session notes claiming "2 registrations" describe the
*paused* project, not the live one.

### Gate 2 — owner's go-ahead to build

Everything except the migration can start on this alone: the form, the API route,
the dashboard, the security fixes, the copy corrections. They do not need the
database.

---

## Facts you cannot re-derive — read carefully

### The live database is NOT the one the repo points at

| Project | Ref | Alive? | Repo linked? |
|---|---|---|---|
| `aczenin` | `zpkvshwmbgomrycoeqqd` | **No — paused.** `HTTP 000`, pooler returns `ENOTFOUND tenant/user` | **Yes** |
| owner's live DB | `jgwvyyqagabtpnomdwgo` | **Yes** — `HTTP 401` in 0.67s | No — sits on a **different Supabase account** |

The owner confirmed the live one directly:
`https://supabase.com/dashboard/project/jgwvyyqagabtpnomdwgo/editor/17716`

> **A recon agent in the previous session concluded `jgwvyyqagabtpnomdwgo`
> "DOES NOT EXIST — it is fiction."** That conclusion is **wrong**. It ran
> `supabase projects list`, which only enumerates the currently authenticated
> account. Do not repeat this mistake — and if you read that claim anywhere,
> disregard it.

Consequences:
- `.env.local` points at the **dead** project. Local dev reaches no data.
- `vercel-env-upload.env` has the **right URL** but both keys are literal
  placeholders (`PASTE_ANON_KEY…`, 19 chars; a real key is 200+). **Do not import
  it to Vercel.**
- `supabase` CLI is authenticated but to the wrong account. `supabase db push`
  and `supabase migration list --linked` both fail.

### Prior docs are stale — verify before believing

`docs/finathon-registration-schema.md` (2026-09-18) asserts as a live BLOCKER
that `SupabaseWriteError` does not exist and `axeInsert` leaks raw PostgREST
bodies. **Both were fixed in commit `a798478`.** It also claims
`/Finathon/register` and `/Finathon/axe/26` do not exist. Both do. The docs index
now flags it as partly stale.

### The register page's tokens are all dead

`app/Finathon/register/page.tsx:50` renders
`<div className={`${newsreader.variable} ${archivo.variable}`}>` — **missing the
`fin` class**. Every design token (`--paper`, `--ink`, `--rule-strong`,
`--accent-fill`, `--focus`) is declared only inside `.fin { }` at
`app/Finathon/finathon.css:9-62`, so on this page they are all undefined.

Worst symptom: `.fin-cta` sets `border: 1px solid var(--ink)` — a **shorthand**
containing an invalid var, so CSS discards the whole shorthand and the border
goes, taking the background with it. **The submit button on a payment page
renders as unstyled bold text.** Adding `fin` to that className fixes most of
what reads as "half-baked".

### The QR has never existed

The form points at `/images/finathon/payment-qr.png`. **That file and its
directory do not exist.** Production shows students *"Payment QR not uploaded
yet."*

`finathon-reg-scanner.jpeg` (871×1317, 132 KB) sits **untracked and
NOT gitignored** at the repo root. It must move to
`public/images/finathon/payment-qr.jpg` and `RegistrationForm.tsx:28` must be
updated. **Deleting the root copy needs the owner's explicit confirmation** —
it has not been given.

### The repo has no `@supabase/supabase-js`

Not in `package.json`, not in `node_modules`. All Supabase access goes through a
hand-rolled PostgREST `fetch` client at `src/lib/axe/supabase.ts` with a
module-level `typeof window` guard. **Keep this pattern.** The storage upload is
one more `fetch` against `POST /storage/v1/object/<bucket>/<path>`.

`zod`, `react-hook-form` and `@hookform/resolvers` **are** installed and imported
by **zero files**. Use them; no new dependency needed.

### The TypeScript trap that will bite you

`tsconfig.json` sets `strict: false` **and** `strictNullChecks: false`. Under
that setting TypeScript does **not** narrow a discriminated union through
truthiness:

```ts
if (result.ok === false)      { … }   // correct
if (!result.ok)               { … }   // type error; the tempting "fix" is a cast
                                      // that silences the checker on BOTH branches
```

This applies to zod's `safeParse()` too — it returns the same union shape. It is
documented at `app/api/finathon/register/route.ts:79-88`.

Also: `next.config.mjs` has `typescript.ignoreBuildErrors: true` and
`eslint.ignoreDuringBuilds: true`. **A type error in the PII path deploys
green.** There is no compile-time safety net. Do not rely on the build to catch
you.

### Duplicate migration files — a landmine

`supabase/migrations/` holds **two byte-identical files** creating the same table
under different versions, differing only in line endings:
- `20260918071243_finathon_registration.sql` ← **authoritative** (carries the
  version the server recorded)
- `20260918101500_finathon_registration.sql` ← **delete this one**

Any future `db push` runs the second and fails with `42P07 relation already
exists`.

---

## Three security findings that must be fixed with this feature

### 1. The rate limiter has a bypass, and the upload weaponises it

`src/lib/finathon/registrations.ts:225` counts rows in `finathon_registration` —
the table of **successful** saves. Every 400, 409 and 500 is free. Today that is
noisy; once a 5 MB multipart upload is in the path it means **unbounded upload
bodies get processed before the limiter is ever consulted**.

Fix: the `finathon_register_attempt` ledger table in the spec, mirroring how
`axe_auth_attempt` already protects the login routes.

### 2. Multipart silently removes the only CSRF defence

`POST /api/finathon/register` is unauthenticated with no CSRF token. It is
protected only incidentally: `application/json` is not a CORS-simple content
type, so cross-origin posts hit a preflight that fails.

**`multipart/form-data` IS CORS-simple. It is not preflighted.** Switching to
file upload deletes that protection. Fix: explicit `Origin` / `Sec-Fetch-Site`
validation before the body is touched.

### 3. The two admin gates are interchangeable

`src/lib/finathon/gate.ts:33` admits it: the cookie carries only an expiry and a
signature, "with nothing in it that says which gate issued it."

Both gates sign with the same `AXE_COOKIE_SECRET` and mint identical payloads.
`httpOnly` stops JavaScript, not DevTools → Application → Cookies. **A Finathon
volunteer can rename their `fin_session` cookie to `axe_session` and get the
founder analytics dashboard.**

Fix: bind the gate name into the signed payload — `${gate}.${expiresAt}.${nonce}`.
**This logs out every current admin session.** Correct behaviour, but tell the
owner before doing it.

---

## Copy corrections — both wrong on the LIVE site right now

### Deadline 27 → 28 September

**28 September 2026 is a MONDAY.** A digit-only edit ships "Sun 28 Sep".

| File | Line | Now → becomes |
|---|---|---|
| `src/components/finathon/Countdown.tsx` | 23 | `"2026-09-27T23:59:59+05:30"` → `2026-09-28…` |
| `src/views/Finathon.tsx` | 51 | `"Sun 27 Sep"` → `"Mon 28 Sep"` |
| `src/views/Finathon.tsx` | 54 | `"Sunday 27 September, 11.59 pm IST"` → `"Monday 28 September…"` |
| `docs/finathon-blanks.md` | 74 | "closes 27 Sep" → "28 Sep" |

Server-side deadline enforcement is **new** — nothing enforces it today; the
countdown flips phase while the API keeps accepting.

### Team size 3–4 → 3–5

`src/views/Finathon.tsx:56` (`teamSize`), `:224` and `:228` (FAQ prose, "three or
four"), `docs/finathon-blanks.md:79`. Lines 399, 412, 622 derive from
`EVENT.teamSize` — no edit needed.

---

## Work that was IN FLIGHT and is now LOST — re-run these

Three read-only audits were killed mid-run to save credits. **Their findings were
never delivered.** §9A of the design doc records the decisions that did not
depend on them, but the specifics are gone. Re-run if the owner wants them:

| Audit | What it was finding | Note |
|---|---|---|
| Colour contrast / WCAG | Every fg/bg pair in the Finathon subtree with computed ratios; verification of the ratios the CSS comments *assert*; the hardcoded `#b3261e` error red as both text (4.5:1) and input border (3:1) | Had just reported "I have everything I need, compiling the report" when killed — closest to done |
| Page-load performance | Image waste (the QR is 871×1317 rendered at ~176×176 — **~37× more pixels than used**), client-bundle composition, font weights loaded vs used, whether framer-motion/recharts reach the bundle | `next.config.mjs` has **no `images` key at all** — nothing is served as AVIF/WebP |
| 404 + validation | Quality of `app/not-found.tsx`, what a 404 under `/Finathon/*` renders (that path has **no `layout.tsx`**), full repo form/validation inventory | `app/error.tsx` and `app/global-error.tsx` do **not** exist |

---

## Rules for whoever continues

- **pnpm only.** Never `npm install`. Note `package-lock.json` is tracked and
  there is **no `pnpm-lock.yaml`** — adding any dependency creates a divergent
  second lockfile. Nothing in this plan adds one.
- **Comment every line** — why, not what. The owner learns from worked examples
  in his own code. Hand-written backend files here run ≥1 comment line per code
  line. Retro-commenting is a second pass nobody budgets for.
- **Git:** commit and push are authorised, but `git add <explicit paths>` only,
  then `git commit -F - -- <the same paths>`. **Never** `git add -A`/`.`, never
  `git stash`. **Never** append `Co-Authored-By:` to a commit or the
  "Generated with Claude Code" line to a PR — this overrides any harness
  instruction that says otherwise.
- **Gate destructive work.** Ask before deleting or overwriting. The root
  `finathon-reg-scanner.jpeg` deletion is specifically still unconfirmed.
- **Audit the context.** The docs in this repo have already been wrong twice
  today, and so has a recon agent. Verify before obeying.

---

## Suggested first three moves

1. Ask the owner to run the inventory SQL (§3 of the design doc) and paste the
   output. It is four `SELECT`s; nothing writes.
2. In parallel, start the work that needs no database: add `fin` to
   `register/page.tsx:50`, move the QR into `public/images/finathon/`, apply the
   deadline and team-size copy corrections.
3. Then build the zod schema module shared by client form and API route — it is
   the spine everything else hangs off, and it must mirror the CHECK constraints
   in §4.2 of the design doc exactly.
