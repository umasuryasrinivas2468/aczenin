# Finathon 2026 — what still needs filling in

Everything on `aczen.in/Finathon` that is currently a placeholder, in the order
it matters. Every item is marked in the code as `TODO(finathon)`, so you can
always regenerate this list with:

```bash
grep -rn "TODO(finathon)" app src
```

Line numbers below were correct when this file was written and will drift as the
page is edited. The grep above is the source of truth.

---

## 1. Blocking — the page cannot go live without these

> **Done:** every call to action now points at our own form at `/Finathon/register`, which records the team lead, roll number and UPI payment reference before handing the team on to Devnovate.

| What | Where | Notes |
|---|---|---|
| **Payment QR image** | `public/images/finathon/payment-qr.png` | **The form cannot take a payment without this.** Until the file exists the QR panel renders "Payment QR not uploaded yet" — visible to students. Drop in a square PNG of the UPI QR; the path is fixed in `RegistrationForm.tsx` (`QR_IMAGE_SRC`). |
| **Prize pool** | `src/views/Finathon.tsx` (`PRIZES`) | Set: $500 cash pool, AI build credits, paid internship. Confirm how the $500 splits across winning teams before the results. |

### The registration flow

`/Finathon/register` → team lead name + roll number → UPI QR (₹499 per team) →
UTR → row written to `finathon_registration` → "Continue on Devnovate" link to
`https://devnovate.co/event/finthon-2o`.

Registrations are read at **`/Finathon/axe/26`**, behind its own password
(`FINATHON_GATE_HASH`, separate from the `/axe` gate so an event volunteer does
not also get the analytics dashboard). The table is searchable by name, roll
number or UTR, which is how a payment gets reconciled against the bank
statement.

> **Note the mismatch:** the eligibility table on `/Finathon` no longer mentions
> a registration fee, but the form charges ₹499 per team. Either put the fee
> back on the event page or drop the amount from the form — a fee that first
> appears at the payment step reads as a surprise charge.

Two things must exist before the flow works in production:

1. The migration `supabase/migrations/20260918101500_finathon_registration.sql`
   applied to the Supabase project.
2. `FINATHON_GATE_HASH` set in Vercel as a **Sensitive** variable. The amount
   (`AMOUNT_LABEL`) and the Devnovate URL (`DEVNOVATE_URL`) are constants at the
   top of `src/components/finathon/RegistrationForm.tsx`.

## 2. Contact details — students will look for these first

| What | Where | Notes |
|---|---|---|
| **Event mailbox** | `src/views/Finathon.tsx:621` | Page currently advertises `finathon@aczen.in`. **Confirm this mailbox actually exists and someone reads it** before launch — it is the only published contact for the event. |
| **Two student coordinators** | `src/views/Finathon.tsx:629` | Names and phone numbers. Currently two pairs of blank ruled lines. |
| **WhatsApp community link** | `src/views/Finathon.tsx:646` | The FAQ tells people to find teammates in this group, so the link needs to exist before registration opens. |

## 3. Programme

| What | Where | Notes |
|---|---|---|
| **Mentors, judges, speakers** | `src/views/Finathon.tsx:521` | Six empty slots. Replace each with `{ name, role, org, photo }`. Put photos in `public/images/finathon/`. |
| **AI tool credits** | `src/views/Finathon.tsx:110` | The page promises "credits on AI development tools". Confirm which tools and how much before launch — this is a public promise to participants. |
| **Swag and goodies** | `src/views/Finathon.tsx:119` | Deliberately vague ("details to be announced"). Replace once confirmed. |
| **Travel and accommodation** | `src/views/Finathon.tsx:187` | FAQ currently promises an answer before registration closes. Outstation teams will ask. |
| **Campus address** | `src/views/Finathon.tsx:44` | Currently "Laxman Reddy Avenue, Dundigal, Hyderabad, Telangana 500043". Verify the exact line. |

---

## Things that are decided and need no action

These are already correct in the code — listed so nobody "fixes" them by mistake.

- **Dates.** 30 Sep 09:45 → 1 Oct 14:30 IST. Registration closes 27 Sep.
- **The countdown advances by itself.** It counts to the registration deadline,
  then flips to the kickoff, then to a live state, then to a closing message —
  with no redeploy on the 27th. Targets live in
  `src/components/finathon/Countdown.tsx:23-25`.
- **Eligibility.** Third and fourth year students, any college in Telangana, teams of 3–4.
- **Tracks.** Finance (lead), CRM, HRM.
  Held in the `DOMAINS` array and rendered as ledger rows, so adding a fourth is one
  object, not a redesign. Three pieces of copy count the tracks and must be updated
  together: the hero lede, the "Three tracks. Pick one." heading, and
  `PAGE_DESCRIPTION` in `app/finathon/page.tsx`.
- **Hiring language.** Stipend and PPO are described, never quantified, and no
  intern headcount appears anywhere. Roles named: Full Stack Developer,
  AI / ML Engineer, Cybersecurity Engineer.
- **Judging criteria** are intentionally absent — the page says they are revealed
  at the inaugural session.

---

## Known issues outside this page

- The shared site `Footer` has three text colours that fail WCAG AA contrast
  (`Instagram` and the company name at 2.54:1, the `·` separators at 1.47:1).
  These are pre-existing and affect every page on aczen.in, not just Finathon.
  Fixing them means editing `src/components/Footer.tsx`, which was out of scope
  for this work.
