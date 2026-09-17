# `aczen.in/axe` — founder analytics dashboard (design)

**Status:** design approved in principle 2026-09-17; awaiting spec review before implementation.
**Owner:** Teja (founder). Not to be discoverable by staff.

---

## 1. Purpose

A private, password-gated dashboard at `aczen.in/axe` showing who visits
`aczen.in`, which of the 48 pages they land on, where they came from, and how
many of them turn into leads.

The dashboard is the visible half. The half that matters is the **first-party
collection pipeline** underneath it, because the site currently has no
trustworthy traffic data at all (see §2).

---

## 2. Why the existing analytics cannot be used

`src/lib/analytics.ts` loads Google Analytics 4, but only after the visitor
accepts the cookie banner in `src/components/CookieConsent.tsx`. Consent
acceptance on a B2B site typically runs 30–60%, and ad blockers remove more of
the remainder. **Every GA4 number on this site is therefore an undercount of
unknown size**, and no dashboard built on it can be trusted.

Server-side first-party collection is not ad-blockable and needs no consent for
non-identifying counts. That is the actual reason to build this rather than
buy it.

---

## 3. Datastore decision

**Chosen: Supabase (Postgres), via the Vercel Marketplace integration.**

Rejected, with reasons, so this is not re-litigated later:

| Option | Why not |
|---|---|
| **Vercel Blob** | Object storage. No query engine — no `WHERE`, no `GROUP BY`, no index. Answering "views of /pricing last week" means downloading and parsing every object ever written. It also has no atomic increment, so two simultaneous pageviews read-modify-write the same counter and one is silently lost (a lost-update race). Permanent, invisible undercounting. |
| **Vercel Web Analytics** | A reporting product, not a datastore. Arbitrary rows cannot be written to it and there is no general query API to build a custom dashboard on. Decisively, it cannot join a pageview to a lead, which removes the conversion-rate metric — the most valuable number here. |
| **GA4 Data API** | Possible, but inherits the consent undercount above; applies sampling and cardinality limits that distort per-page detail; takes up to 24–48h to settle so nothing is live; and keeps the data at a third party. Retained only as an optional cross-check. |

Supabase wins on: raw event rows queryable with arbitrary SQL (so new questions
can be asked of old data — the one thing that cannot be added retroactively),
Row Level Security so a leaked anon key still cannot read analytics, a native
Vercel integration that auto-wires env vars, and a SQL editor for ad-hoc work.

**Known caveat:** Supabase free-tier projects pause after 7 days of inactivity.
A site writing pageviews daily never idles, so this will not trigger in
practice — but it would if traffic ever stopped entirely.

**Design principle applied: store raw events, not pre-aggregated counters.**
Counters are cheaper but can only answer questions thought of in advance. Raw
rows can be re-aggregated into any question later. Aggregation is reversible;
discarding detail is not.

---

## 4. Architecture

```
request ──> middleware.ts ──(waitUntil, non-blocking)──> Supabase.page_view
                │
                └──> page renders ──> client beacon ──> /api/collect  (device, scroll depth)

contact forms ──> existing Google Sheet webhook (unchanged)
                └──> Supabase.lead_event  (new, parallel)

/axe ──> cookie check ──> password form ──> POST /api/axe/session
                                                 │ scrypt verify vs AXE_GATE_HASH
                                                 └──> signed httpOnly cookie
                                                          │
                                                          └──> server-side SQL ──> recharts
```

### 4.1 Collection — and the trap in the existing middleware

`middleware.ts` today is scoped to `/finathon` spellings and **redirects
everything it matches that is not exactly `/finathon`**. Its matcher is the
only thing preventing that from affecting other routes.

> **Widening that matcher to all routes without restructuring the function
> would redirect the entire site to `/finathon`.** This is the single most
> dangerous step in the build. The finathon branch must explicitly handle only
> its own paths and fall through for everything else.

The matcher must also exclude `/_next/static`, `/_next/image`, `favicon.ico`,
and asset file extensions, or every image request becomes a fake pageview.

The insert is dispatched through `waitUntil()` from `@vercel/functions` so the
response is never blocked on the database.

Geography comes free from Vercel's edge request geo (country / city / region) —
no GeoIP service or lookup table needed.

### 4.2 Why both middleware and a client beacon

Middleware is the **authoritative count**: server-side, first-party, and
impossible for an ad blocker to suppress. The client beacon cannot be
authoritative for that reason, but it is the only place that can observe screen
size, device class and scroll depth. Counts come from the server; enrichment
comes from the client.

---

## 5. Schema (draft — to be finalised against `supabase-postgres-best-practices`)

```sql
create table page_view (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz not null default now(),
  path          text        not null,
  referrer_host text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  country       text,
  city          text,
  device        text,
  is_bot        boolean     not null default false,
  visitor_hash  text        not null,
  session_id    text
);

create index on page_view (occurred_at desc);
create index on page_view (path, occurred_at desc);
create index on page_view (visitor_hash, occurred_at desc);
```

Plus `lead_event` (form submissions, joinable to `page_view` on `session_id`)
and `cta_click` (v2, but created now so no migration is needed later).

`is_bot` exists because without it every other number on the dashboard is
inflated by crawler traffic.

RLS: enabled with **no policy granting the anon key any access**. All reads
happen server-side under the service role. The browser never receives a
Supabase key.

---

## 6. Access control for `/axe`

Per founder's decision on 2026-09-17, the password is **`chainsaw`**, kept
despite the concern recorded in §9.

- `/axe` is a Server Component. No valid cookie → it renders only a password
  form. No data, no schema, no table names reach the browser.
- `POST /api/axe/session` verifies with **Node's built-in `crypto.scrypt`**,
  compared using `timingSafeEqual`.
  - *Why scrypt over bcrypt:* it is in the Node standard library, so there is
    **no new dependency to audit or keep patched**, and it is memory-hard,
    which makes GPU cracking far more expensive than bcrypt. Requires the
    Node.js runtime (the Vercel default), not Edge.
- The hash is read from `AXE_GATE_HASH`, a **Vercel Sensitive Environment
  Variable** — write-only, so even team members with dashboard access cannot
  read the value back, and it never enters git.

  **Reversal, 2026-09-17:** an earlier version of this design kept a hardcoded
  hash constant in the source as a fallback, to satisfy the original
  "hardcoded" phrasing of the request. That fallback has been REMOVED. It
  contradicted its own mitigation: the only reason a dictionary-word password
  survives here is that the hash never enters git and so cannot be attacked
  offline, and a constant in the file puts it straight back into git. The gate
  now **fails closed** when `AXE_GATE_HASH` is absent. Raised by the
  implementing session, and it was right.
- Success sets an **httpOnly, secure, sameSite=lax** cookie carrying an
  HMAC-signed expiry. httpOnly means the token is invisible to JavaScript, so
  an employee with DevTools open sees nothing useful.
- `POST /api/axe/session` is **rate-limited** by hashed IP in Supabase. This is
  what actually defeats guessing `chainsaw`, since the word itself is weak.

**Discoverability:** `/axe` gets `robots: { index: false, follow: false }`.
It is deliberately **not** added to `robots.txt` — `robots.txt` is public, and
listing the path there would advertise the secret URL to exactly the people it
is hidden from.

Path obfuscation (serving the dashboard only behind a secret prefix, so a wrong
guess 404s instead of revealing a login form) was **offered and declined** by
the founder on 2026-09-17. `/axe` stays at `/axe`.

### 6.1 What the password gate does *not* protect

Recorded because the gate is easy to mistake for a security perimeter.

The scrypt hash in a Vercel Sensitive environment variable does achieve the
stated goal: **no one reading the codebase or the Vercel dashboard can recover
the password.** It is never in git, and a Sensitive variable is write-only even
to team administrators.

Three things it does not stop, all of which are more likely than a cracked
password:

1. **Deploy access defeats it outright.** Anyone who can merge and deploy can
   add a line logging the submitted password, or delete the check. No password
   scheme prevents this. The control is branch protection and required review.
2. **Vercel project access bypasses the dashboard entirely.** The environment
   holds `SUPABASE_SERVICE_ROLE_KEY`. Anyone who can read it can query the
   analytics tables directly without ever visiting `/axe`. The gate protects
   the page, not the data.
3. The password is a dictionary word (§9.2), so any leak of the hash —
   a backup, a log line, a screenshot — is immediately fatal.

**Conclusion: the real perimeter is who has access to the Vercel project, not
the password.** Restricting project membership is the control that actually
works; the gate only keeps honest people out of a URL.

---

## 7. Dashboard contents

### Layout (decided 2026-09-17)

`/axe` is not a single page. It carries a nav bar with separate sections:

- **Overview** — counts and charts only. Ships **no lead PII at all**, not even
  a "latest lead" preview.
- **Leads** — its own route, holding individual lead records (name, email,
  form, source page, timestamp).

The split is deliberate. Keeping lead identities off the Overview means the
page the founder actually leaves open all day carries no personal data, so a
shoulder-surf or a screenshot leaks nothing. It also keeps the PII surface to
one route that can be reasoned about on its own.

**Consequence to be explicit about:** the Leads section makes `/axe` a system
that stores and displays personal data. Lead rows are rendered in Server
Components and never shipped wholesale to the client for client-side filtering,
and no lead name or email may appear in a log line, error message or event.

### v1 (ships first)
- Tiles, each with % change vs the previous period: unique visitors, pageviews,
  leads, **visitor → lead conversion rate**
- Traffic over time (30-day area) with **lead submissions overlaid as bars**, so
  a traffic spike can be judged on whether it actually paid
- Top pages — horizontal bar plus a sortable table covering all 48 routes
- Traffic sources / referrers
- Device split
- Geography, city-level (India-first market: city matters more than country)
- Bot vs human split

### v2 (schema supports it from day one, so UI-only work)
- **Per-page conversion rate** — a page with 5k views and 0 leads is a problem a
  traffic chart hides completely
- Entry and exit pages
- **404 log** — the `secuirty`/`security` typo fixed on 2026-09-17 is exactly
  the class of bug this catches
- Blog performance (blogs auto-publish daily via cron; their impact is currently
  unmeasured)
- CTA click tracking — the missing step between pageview and lead
- Day × hour heatmap
- Live feed of the last 50 hits — fastest way to spot a bot flood

Rendered with `recharts` (already a dependency, v2.12.7) and the existing
shadcn/ui components, so the dashboard matches the rest of the site.

---

## 8. Privacy

No raw IP is ever stored. Visitor identity is
`sha256(ip + user_agent + AXE_SALT + date)`.

This yields unique-visitor counts while storing no personal data, which keeps
the site consistent with the promises already published at `/privacy`, `/gdpr`
and `/cookies`, and means the collection needs no cookie banner. It is the same
approach Plausible and Fathom use.

Audited 2026-09-17: `src/views/PrivacyPolicy.tsx` does not currently mention IP
addresses at all. Nothing published is therefore contradicted by this design —
but equally, nothing published would cover raw IP collection if it were ever
added. Any change to store IPs requires a policy update first.

### 8.0 Legal basis (assessed 2026-09-17 — not formal legal advice)

The question asked was narrow and worth recording precisely: *can we use the IP
to tell unique visitors apart from repeat visits, without storing it?*

Yes, and it is the approach taken. The IP is read from the request, combined
with the user agent and the day's salt, hashed, and discarded. **No IP is ever
written to disk or to a log.** There is no IP in this database to leak or
disclose.

- **India, DPDP Act 2023 — the binding regime here.** The Act governs digital
  personal data, meaning data about an *identifiable* individual. A one-way
  salted hash with a salt that is rotated daily and discarded is not
  identifiable, by us or by anyone who obtains the database. India has no
  cookie-consent law. This design is compliant.
- **GDPR** applies only if EU users are targeted, which an India-first B2B
  fintech generally does not. Where it does apply: raw IP is settled personal
  data (*Breyer v Germany*, CJEU 2016), and a fixed-salt hash is merely
  pseudonymous and still in scope — which is exactly why §9.1 mandates daily
  rotation.
- **ePrivacy ("the cookie law")** triggers on storing or accessing information
  on the user's *device*. Server-side hashing stores nothing on the device, so
  no consent banner is required for this collection.

**Counter-intuitive but important:** every common alternative is *more* legally
burdensome, not less. A first-party cookie ID (what Google Analytics uses)
writes to the device and so triggers consent, and a persistent cookie ID is
itself personal data. localStorage is the same, with heavier ad-blocking.
Browser fingerprinting is explicitly called out by regulators as requiring
consent. Counting sessions alone is clean but does not answer the question.
The hashed-IP approach is the most conservative option that actually
distinguishes people from page loads.

### 8.1 Can a visitor's name and email be captured from a plain visit?

Asked on 2026-09-17; recorded so it is not re-litigated.

**No.** No browser API exposes a visitor's identity. Name and email arrive only
when the visitor types them into a form, is logged in, or follows a link that
already carried their identifier (an email campaign). Any vendor claiming
otherwise is doing one of the two things below.

- **IP-to-company lookup** (Clearbit Reveal, Leadfeeder/Dealfront, RB2B, and
  similar) resolves an IP to an *organisation*, not a person — "someone at
  HDFC Bank read /pricing three times." This is legitimate, and for a B2B site
  it is frequently more actionable than a name. A candidate for a later phase.
- **Person-level de-anonymisation** from third-party cookie pools. Non-compliant
  with GDPR and with India's DPDP Act 2023. Not to be used.

Raw IP is available on every request but is deliberately not persisted, because
storing it converts this into a personal-data system with disclosure, retention,
breach-notification and subject-access obligations attached. If company-level
enrichment is wanted later, the derived company or city is stored — never the
address it was derived from.

---

## 9. Open decisions and accepted risks

1. **Salt rotation — DECIDED 2026-09-17: rotate DAILY.** The salt is never
   retained past its day.

   This was framed as a privacy-versus-features trade, but it is actually the
   legality question, and that is what settled it. A *fixed* salt produces only
   **pseudonymisation** — still personal data, still fully in regulatory scope.
   Rotating the salt and discarding it is what crosses into **anonymisation**:
   once a day's salt is gone, that day's hashes cannot be tied to anyone, by
   anybody, including us.

   Consequence, accepted: unique visitors are counted **per day**. The same
   person on two days is two visitors, so "returning visitors" and multi-day
   journey stitching are impossible by construction. The tile is permanently
   out of scope, not deferred.

2. **Accepted risk: the password is `chainsaw`.** A dictionary word. The
   founder was advised on 2026-09-17 that this defeats the point of a strong
   hash and chose to keep it; recorded here as a deliberate decision, not an
   oversight. Mitigated by keeping the hash out of git (Sensitive env var,
   removing offline cracking) and by rate-limiting the endpoint (removing
   online guessing). Residual risk: anyone with repo **write** access can
   replace the hash and deploy. No password scheme fixes that — only deploy
   protection does.

3. **`next.config.mjs` sets `typescript.ignoreBuildErrors` and
   `eslint.ignoreDuringBuilds`.** Type errors in this dashboard will therefore
   **not** fail the build. Worth revisiting separately; out of scope here.

4. Traffic volume is unmeasured today, so Supabase row growth is unforecast.
   A retention policy (aggregate-and-drop rows older than N months) is likely
   needed eventually, but is premature to design now.

---

## 10. Build sequence

1. Provision Supabase via `vercel integration add supabase`
2. Create schema + RLS (load `supabase-postgres-best-practices` first)
3. Restructure `middleware.ts` — **finathon-safety first**, then widen matcher
4. `/api/collect` beacon + `lead_event` hook into existing forms
5. `/axe` gate: `/api/axe/session`, scrypt verify, signed cookie, rate limit
6. Dashboard queries + `recharts` UI
7. Verify against real traffic before trusting any number

---

## 11. Changelog

- **2026-09-17** — Design drafted. Supabase chosen over Blob / Vercel Analytics
  / GA4. Password decision recorded. Related fix shipped the same day: the
  misspelled `app/secuirty/` route was renamed to `app/security/` with a 308
  redirect preserving already-shared links.
