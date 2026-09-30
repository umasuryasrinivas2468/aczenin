# Nova Tier 2 — build contract

*2026-09-29. The single source every Tier 2 builder works from. The entity list
comes from [nova-finathon-data-coverage.md](nova-finathon-data-coverage.md) §5.2
(packs 2a–2e). The conventions, verify loop and ownership rules come from
[nova-tier1-build-contract.md](nova-tier1-build-contract.md), including its §9
deviations. This file fixes names, columns, volumes, run order, size budgets and
ownership, so five builders working in parallel produce parts that fit together.
If this file and the coverage plan disagree, **this file wins**. If this file and
the Tier 1 contract disagree on a Tier 2 matter, **this file wins**.*

## 1. Decisions already made (do not revisit)

| Decision | Value |
|---|---|
| Scope | **All of Tier 2**: 2a payments and gateway, 2b spend, 2c ledger, 2d debt, 2e sourcing, roles and integration. Tier 3 (CRM, HRM) is out of scope. `leave-records` comes forward from 3b because FIN-21 needs it. |
| Size | Supabase **Free plan, 500 MB hard cap**. Live is 211 MB. **Tier 2 total ≤ 170 MB**, so the database ends at ≤ ~390 MB with headroom for request logs. Each file has a budget (§3.3); volumes are cut from §5.2 where needed, and each cut is marked. |
| Output | **JSON only.** No images, files or CSV downloads. Receipts are metadata (number, merchant, date, hash). |
| Pay | **Pay bands only**, never a per-person salary. Tier 2 adds no pay column. |
| Wording | **Neutral.** No row, column name, enum value, note or phrase-bank entry that teams can see may say dummy, sample, sandbox, fake, synthetic, mock, demo or "test data". Nothing claims the data is real, or not real. |
| Anomalies | **A11, A15, A16, A17 and A19** are planted in Tier 2, each with decoys, and appear **only** in the answer key (`nova_ground_truth`), never in the API. A2 decoys belong to the Tier 1 fixes and are **not** in this contract. |
| Tier 0/1 files | **001–008 are closed to Tier 2.** A peer is editing `008_banking.sql` now (budget fix). No Tier 2 file alters, truncates, updates, inserts into, or adds constraints to any table created by 001–008. |
| Clock | `nova_dataset_meta.as_of_date` (live: **2026-09-29**). Every date a Tier 2 file generates is ≤ as_of, except rows that are future by nature (loan instalments, renewals, quote validity), which the column notes name. Never `current_date`. |
| Teams | 80 slices, `slice_no` 0–79, one fixed company per slice. The book window is **2025-09-30 → 2026-09-29** (live invoice dates span 2025-09-30 to 2026-09-28). |

## 2. Conventions

### 2.1 Carried over from Tier 1 unchanged

- **Text primary keys with a type prefix** and a CHECK on the prefix. Ids use **12 hex characters** (Tier 1 D5): `'<prefix>' || left(md5('<table>|' || slice_no || '|' || n), 12)`. Never assume a fixed id length when parsing upstream ids.
- **`slice_no integer not null check (slice_no >= 0)`** on every table, and an index on `(slice_no, <main date> desc)`.
- A **child row's `slice_no` equals its parent's**, for every reference, in-file or cross-file.
- Money is `numeric(14,2)`, rates are `numeric(6,4)` (fractions) or `numeric(5,2)` (percent), timestamps are `timestamptz`, and statuses are `text` + CHECK. No Postgres enums.
- **Lockdown**, as in 001: `enable row level security` with **no policies**, `revoke all … from anon, authenticated`, and `grant select, insert, update, delete … to service_role`. This applies to every table **and** every view.
- **One read view per table**: `nova_<table>_v with (security_invoker = true)`. The API reads views only. A view may add derived columns; they are listed in §4.
- **Deterministic generation.** Put `select setseed(<file-specific constant>)` at the top and `set local max_parallel_workers_per_gather = 0`. Draw every choice from an md5 hash of a stable text key, like `pg_temp.pc_roll(key)` in 007 and `pg_temp.h(key)` in 008. Use `random()` only where the plan order cannot matter. Two builds give an identical md5 (§8).
- **Re-runnable:** `begin; … commit;` around the whole file. Tables are created with `create table if not exists`. The file then **truncates only its own tables** and deletes only its own anomaly codes from `nova_ground_truth`.
- **Neutral naming.** A planted row looks like any other row. There is no `is_anomaly` column and no telling id, text or position. Plant at a per-slice hashed offset, and give every pattern **decoys** (`is_decoy = true` in the answer key).
- Emails use `.example`. Card numbers, UTRs, RRNs and account numbers are generated, and only the last 4 digits are shown.
- **Templated text** only: narrations, reasons, business purposes and notes are drawn from per-file phrase banks by hash.
- **Every SQL line carries a WHY comment** (Teja's standing rule), at the density of `007_payables_controls.sql`.
- **`-- STATUS: VERIFIED <date>` on line 1** only after the §8 loop passes.

### 2.2 New in Tier 2 (binding)

1. **Cross-file references are soft.** A Tier 2 column that points at a row made by *another* file (Tier 0/1, or another Tier 2 file) is a plain `text` column with an index and **no FK constraint**. Real FK constraints are allowed **only between tables of the same file**.
   *Why:* 006, 007 and 008 truncate their tables **without** CASCADE. An FK from a Tier 2 table into one of their tables makes that rerun fail with `cannot truncate a table referenced in a foreign key constraint`. 008 avoids this by dropping and re-adding the FKs it owns (lines 168–169, 1149–1152), but Tier 2 cannot edit 008. 005 and 002 truncate **with** CASCADE, so an FK there would silently empty Tier 2 tables instead. With soft references, every upstream rerun, including the 008 fix in flight, keeps working.
2. **Each file ends with a self-check.** The last statement before `commit` is a `do $$ … $$` block. It raises an exception, so the whole transaction rolls back, if any of the file's soft references fails to resolve to a row **in the same slice**. The check is inside the file, so a rerun after an upstream change fails loudly instead of leaving dangling ids.
3. **No "global" tables.** The §5.2 "global" entities (payment channels, spend policies, chart of accounts, roles) are generated **per slice**. The API pins `slice_no=eq.N` on every query, so a table without `slice_no` cannot be served. Each company also gets its own negotiated rates and policy limits, which is realistic. Rows are small, so the cost is negligible (§3.3).
4. **Tier 2 never writes upstream tables.** No `update` of Tier 0/1 rows, and no back-filled link columns (unlike 008's `bank_transaction_id` fills). A link always lives on the Tier 2 side.
5. **One owner per anomaly code.** Each code is planted and deleted by exactly one file (§6), so the delete filter is just `anomaly_code in (…)`, with no `resource` qualifier like 008's A14.
6. **Answer keys that are not anomalies** (the 2e source-record matches) live in an admin-only table owned by that file (`nova_source_record_links`, §4.3). It has **no view and no registry entry**, exactly like `nova_ground_truth`.

## 3. File plan, run order and ownership

### 3.1 Run order

On a fresh database: `001 → 003 → 004 → 005 → 002 → 006 → 007 → 008`, then

**`009_spend` → `010_gateway` → `011_sourcing_roles` → `013_debt` → `012_ledger`**

The file numbers follow the pack names in §5.2. The **run order differs at the end**, which has a precedent: Tier 1 runs `005` before `002`. The ledger runs **last**, for the same reason banking runs last in Tier 1. A general ledger is the sum of every financial event, so it must read every other file, and no file may read it.

| File | Pack | Reads (read-only) | Must NOT read | Why this position |
|---|---|---|---|---|
| `009_spend.sql` | 2b | 005 (`employees`, `departments`), 002 (`expenses`, `clients`), 008 (`payroll_runs`, for the reimbursement date) | any Tier 2 table | Depends on Tier 0/1 only, so it can be verified first. |
| `010_gateway.sql` | 2a | 005 (`bank_accounts`), 007 (`vendor_payments`) | **any 008 table**, any Tier 2 table | Depends on Tier 0/1 only. Keeping it free of 008 leaves open the fix in §10 G1, where 008 could consume 010 without creating a cycle. |
| `011_sourcing_roles.sql` | 2e | 002, 005, 006, 007, 008 (`bank_transactions`, for the bank export), **010** (`gateway_transactions`, `settlements`, for the gateway report) | 009, 012, 013 | Its source records re-export gateway rows, so it needs 010. |
| `013_debt.sql` | 2d | 005 (`bank_accounts`), 008 (`bank_transactions`: EMI and cash-credit lines) | any Tier 2 table | Loans are read off the bank statement 008 already wrote. It runs before 012 because the ledger's EMI journals need its principal/interest split. |
| `012_ledger.sql` | 2c | **everything**: Tier 0/1 documents plus 009 (card transactions, claims), 010 (gateway transactions, settlements) and 013 (loan schedules) | — | Runs last, and nothing reads it. |

On the coverage plan's example that "2d reads 2b": **it does not.** FIN-20 *combines* subscriptions (2b) and loan schedules (2d) at query time, but neither generator needs the other's rows. Keeping 013 independent lets it build in parallel with 009 and 010.

**Rerun rules** (these replace Tier 1's D3 for Tier 2):
- Any Tier 2 file can be rerun on its own once its "Reads" files are in place. It truncates its own tables, all in one `truncate` statement, with **no CASCADE**. Nothing references them by FK, so nothing else is touched.
- After an **upstream** rerun (for example the 008 budget fix), rerun the dependants **in run order**: 009, 010 and 013 each after 008; 011 after 010; 012 last. Upstream ids are deterministic, so an unchanged upstream reproduces the same ids and the §2.2.2 self-check passes. A changed upstream fails the self-check loudly.
- A rerun of 005 or 002 cascades through Tier 1 (Tier 1 D3), so it needs the full chain `002 → … → 008 → 009 → 010 → 011 → 013 → 012`.

### 3.2 Ownership

Each builder owns exactly three things. Nobody else writes them.

| Builder | SQL file | Registry file | Scratch dir | Local port |
|---|---|---|---|---|
| **spend** | `supabase/nova/009_spend.sql` | `src/lib/nova/resources.spend.ts` | `%TEMP%\claude\nova-t2-009\` | **55440** |
| **gateway** | `supabase/nova/010_gateway.sql` | `src/lib/nova/resources.gateway.ts` | `%TEMP%\claude\nova-t2-010\` | **55441** |
| **sourcing** | `supabase/nova/011_sourcing_roles.sql` | `src/lib/nova/resources.sourcing.ts` | `%TEMP%\claude\nova-t2-011\` | **55442** |
| **ledger** | `supabase/nova/012_ledger.sql` | `src/lib/nova/resources.ledger.ts` | `%TEMP%\claude\nova-t2-012\` | **55443** |
| **debt** | `supabase/nova/013_debt.sql` | `src/lib/nova/resources.debt.ts` | `%TEMP%\claude\nova-t2-013\` | **55444** |

Ports 55432–55437 are used elsewhere. **Never** use 55436 or 55437.

- The five registry files were **pre-wired empty** on 2026-09-29, and `resources.ts` already imports them and merges them with `mergeUnique`. A builder fills its own file and **never edits `resources.ts`, `fields.ts`, `resources.check.ts` or any 001–008 file**. If a builder needs a new field kind in `fields.ts`, it stops and reports.
- Shared reads are fine: every builder may read any file.
- **Readiness.** 009, 010 and 013 depend only on Tier 1, so they run their full chain straight away. 011 runs its full chain once 010 has the STATUS marker, and 012 once 009, 010, 011 and 013 all do. Until then, they write against this contract.
- **Git.** Each builder commits only its own two files (§8.4). The orchestrator applies files to the live database. **Builders never connect to the remote database.**

### 3.3 Size budget

Estimates come from live row widths (`pg_total_relation_size` ÷ rows, including indexes): about 330 B per row for narrow tables (approvals, bank transactions), and 850–1,050 B per row for tables with a jsonb column (payments, invoices). A builder measures its real size in §8 and scales volumes **within the per-slice ranges in §4** to fit.

| File | Rows per slice (mid) | Est. KB / slice | **Budget (80 slices)** | Cut from §5.2 |
|---|---|---|---|---|
| 009 spend | ~1,280 | ~475 | **38 MB** | claims 400→300, card transactions 1,000→620, leave 300→230 |
| 010 gateway | ~1,190 | ~470 | **38 MB** | attempts 600→290 (tied to the ~210 real vendor payments), gateway transactions 1,000→675; settlements 125→~220 (**up**, because batches are daily) |
| 011 sourcing | ~800 (+ ~340 link rows) | ~400 | **32 MB** | source records 750→340 |
| 013 debt | ~62 | ~25 | **3 MB** | loans 3→2 (§4.4) |
| 012 ledger | ~1,060 | ~610 | **55 MB** | journal entries 1,250→~975, with document-level detail for the last 7 months and monthly summaries before that |
| **Tier 2 total** | | | **166 MB** (≤ 170) | 4 MB unallocated contingency |

A budget covers the file's own tables with their indexes, plus the `nova_ground_truth` rows it adds. **If a builder is over budget**, it lowers the volumes toward each range's minimum, largest table first. It never goes below a minimum and never drops a column. If it is still over budget at the minimums, it stops and reports.

## 4. Tables

**Notation.** Types: m = `numeric(14,2)`, r = `numeric(6,4)` (a fraction), p = `numeric(5,2)` (a percent), d = `date`, ts = `timestamptz`, t = `text`, i = `integer`, b = `boolean`, j = `jsonb`, t[] = `text[]`. Every column is **not null** unless marked `null`. `→ x` is an **FK within the same file**. `~> x` is a **soft reference** (§2.2.1): indexed, checked by the file's self-check, with no constraint. Every table also has `id t pk` (the prefix is shown), `slice_no i`, and `created_at ts default now()`. `created_at` must **not** feed the md5 check (§8.2).

### 4.1 `009_spend.sql` (2b spend) — owner: spend builder

The company-paid expense register stays in `nova_expenses` (002). This pack adds the **employee-side sub-ledgers**: out-of-pocket claims, a corporate credit-card programme, recurring subscriptions, leave, and the policy those are checked against. 012 posts claims and card spend to the ledger (§4.5).

**`nova_spend_policies` (`spp_`) — 30–40 per slice.** View `nova_spend_policies_v`. Index `(slice_no, effective_from desc)`.
Columns: policy_code t (unique per slice, e.g. `TRV-HOTEL-G4`), applies_to t in (`expense_claim`, `card_transaction`, `subscription`), category t (the claim category or the card MCC group), grade_min t null and grade_max t null (G1–G8, inclusive), department_id ~> departments null (null = company-wide), limit_basis t in (`per_item`, `per_day`, `per_month`), limit_amount m null, receipt_required_above m null, blocked_mcc t[] null, allowed_hours t null (`HH:MM-HH:MM` IST), approval_levels i (1–3), effective_from d, effective_to d null, description t (templated).
Rules: one company-wide baseline per claim category, with tighter grade bands for travel, hotel and meals. Card policies carry `blocked_mcc` (e.g. 5813 bars, 7995 betting, 5944 jewellery, 6011 cash withdrawal) and `allowed_hours`. Limits vary by slice by ±15% (hash). Policies are effective from before the window starts, and a few are revised mid-year (the old row gets `effective_to`).

**`nova_leave_records` (`lvr_`) — 200–260 per slice.** View `nova_leave_records_v`. Indexes `(slice_no, start_date desc)`, `(employee_id)`.
Columns: employee_id ~> employees, leave_type t in (`earned`, `sick`, `casual`, `unpaid`, `comp_off`), start_date d, end_date d (≥ start_date), days numeric(4,1) (half days allowed), status t in (`approved`, `rejected`, `cancelled`, `pending`), applied_at ts (before start_date, except sick leave), approved_by ~> employees null (the manager; null unless approved or rejected).
Rules: about 4 records per employee per year, and none after an employee's `exit_date`. The approved leaves of one employee never overlap. Every date is ≤ as_of; pending leave starts within the last 7 days.

**`nova_expense_claims` (`ecl_`) — 280–320 per slice.** View `nova_expense_claims_v`. Indexes `(slice_no, expense_date desc)`, `(employee_id)`, `(receipt_hash)`.
Columns: claim_number t (unique per slice), employee_id ~> employees, department_id ~> departments (the employee's), category t in (`travel_air`, `travel_rail`, `local_conveyance`, `hotel`, `meals`, `client_entertainment`, `telecom`, `fuel`, `office_supplies`, `other`), expense_date d, submitted_at ts (0–30 days after expense_date), city t, trip_id t null (groups one trip's claims), client_id ~> clients null (client-specific cost), business_purpose t (templated), amount m (> 0), gst_amount m, receipt_number t null, receipt_merchant t null, receipt_date d null, receipt_total m null (the full bill; ≥ amount when a bill is split), receipt_hash t null (16 hex; equal hash = the same receipt document), policy_id → nova_spend_policies null (the policy that applies), policy_exception b default false, exception_approved_by ~> employees null, status t in (`submitted`, `queried`, `approved`, `rejected`, `reimbursed`), approved_by ~> employees null, approved_at ts null, approved_amount m null (≤ amount), reimbursed_on d null, payroll_run_id ~> payroll_runs null.
Rules: claims go to about 60% of employees, weighted toward Sales, Operations and Customer Service. Receipts are missing only below the policy's `receipt_required_above`. The approver is the employee's manager. Reimbursed claims ride the **next** payroll of the employee's department: `payroll_run_id` is that department's run, and `reimbursed_on` equals its `pay_date` (the amount is **not** part of `net`; see §10 G3). Claims submitted in the last 10 days stay `submitted` or `queried`.

**`nova_corporate_cards` (`ccd_`) — 15–20 per slice.** View `nova_corporate_cards_v`. Index `(slice_no, issued_on desc)`.
Columns: employee_id ~> employees (the holder), department_id ~> departments, card_last4 t (`^[0-9]{4}$`), network t in (`visa`, `mastercard`, `rupay`), issued_on d, status t in (`active`, `blocked`, `closed`), closed_on d null, per_txn_limit m, monthly_limit m, temp_limit m null, temp_limit_until d null, policy_id → nova_spend_policies (its card policy).
Rules: cards go to G4+ staff and to frequent travellers. A card closes on its holder's `exit_date`. One or two cards per slice carry a temporary limit.

**`nova_card_transactions` (`ctx_`) — 550–700 per slice.** View `nova_card_transactions_v`, which adds `txn_hour_ist i` = the local hour. Indexes `(slice_no, txn_at desc)`, `(card_id)`.
Columns: card_id → nova_corporate_cards, employee_id ~> employees (= the card holder), txn_at ts (stored in UTC; the company is in IST, +05:30), posted_date d (0–3 days later), merchant_name t (phrase bank per MCC), mcc t (`^[0-9]{4}$`), mcc_group t in (`travel`, `lodging`, `fuel`, `restaurants`, `software`, `office`, `telecom`, `retail`, `entertainment`, `cash`, `other`), city t, amount m (> 0, INR), original_currency t null and original_amount m null (foreign SaaS or travel), auth_status t in (`approved`, `declined`), decline_reason t null in (`over_txn_limit`, `over_monthly_limit`, `blocked_mcc`, `card_blocked`, `outside_hours`), subscription_id → nova_subscriptions null.
Rules: transactions fall between each card's issue and close dates. About 8% are declined, and a declined transaction's reason matches the card's policy or limits. Card-billed subscriptions produce one approved transaction per billing cycle. Hours cluster from 09:00 to 21:00 IST.

**`nova_subscriptions` (`sub_`) — 22–30 per slice.** View `nova_subscriptions_v`, which adds `annualised_cost m`. Index `(slice_no, renewal_date desc)`.
Columns: name t (product/plan), vendor_name t, vendor_id ~> vendors null, category t in (`saas`, `cloud`, `telecom`, `insurance`, `maintenance`, `rent`, `utilities`, `professional_services`, `media`), owner_employee_id ~> employees, department_id ~> departments, billing_cycle t in (`monthly`, `quarterly`, `annual`), billing_channel t in (`bank`, `card`), card_id → nova_corporate_cards null (set when channel = card), seats_purchased i null, seats_active i null (≤ purchased), unit_price m, current_amount m (per cycle), started_on d, renewal_date d (**may be after as_of**), auto_renew b, status t in (`active`, `paused`, `cancelled`), cancelled_on d null, last_used_on d null, price_history j (`[{effective_from, amount}]`, oldest first).
Rules: **Bank-billed subscriptions are the 8 recurring `nova_expenses` groups** per slice. Each copies that group's `vendor_name` exactly, with its category, amount and monthly cycle, so teams can join on `vendor_name`. The rest are card-billed and have matching card transactions. Price creep appears in `price_history` on 3–5 per slice.

**Plants in 009:** A15, A16, A17 (§6).

### 4.2 `010_gateway.sql` (2a payments and gateway) — owner: gateway builder

Two flows. **Payouts:** every live `nova_vendor_payments` row (007) gets its attempt history. **Collections:** the company's **online sales channel** (web orders paid through a payment gateway). This channel is separate from the B2B invoice book, so it never double-counts `nova_payments`.

**`nova_payment_channels` (`pch_`) — 8 per slice.** View `nova_payment_channels_v`. Index `(slice_no, effective_from desc)`.
Columns: channel_code t (unique per slice) in (`neft`, `rtgs`, `imps`, `upi_payout`, `gw_card`, `gw_upi`, `gw_netbanking`, `gw_wallet`), direction t in (`payout`, `collection`), provider t (the bank for payouts; one fictional gateway name per slice, from a phrase bank, for collections), fee_model t in (`flat`, `percent`, `percent_plus_flat`, `slab`), fee_pct r (domestic), fee_pct_international r null (cards only), fee_flat m, gst_on_fee_pct p (18.00), min_amount m, max_amount m null, settlement_days i (T+n; 0 for payouts), cutoff_time t null (`HH:MM` IST), operating_hours t (`24x7` or `HH:MM-HH:MM`), success_rate r (the channel's trailing rate), avg_latency_seconds i, effective_from d.
Rules: the rates are realistic for India (UPI collections at or near 0%, cards about 1.8–2.2%, netbanking a flat fee; RTGS minimum ₹2,00,000; IMPS capped at ₹5,00,000), varied per slice by hash. Payout success rates are 0.95–0.995. `success_rate` must agree with the attempts table to within ±3 points.

**`nova_payment_attempts` (`pat_`) — 260–320 per slice.** View `nova_payment_attempts_v`. Indexes `(slice_no, attempted_at desc)`, `(vendor_payment_id)`.
Columns: vendor_payment_id ~> vendor_payments, attempt_no i (1-based), channel_id → nova_payment_channels, attempted_at ts, amount m (= the payment's amount), outcome t in (`success`, `failed`, `timeout`, `reversed`), failure_code t null in (`insufficient_funds`, `beneficiary_ifsc_invalid`, `beneficiary_account_closed`, `name_mismatch`, `bank_timeout`, `limit_exceeded`, `cutoff_missed`, `duplicate_suspected`), failure_stage t null in (`initiation`, `remitter_bank`, `beneficiary_bank`), next_action t in (`none`, `retry_same_channel`, `retry_alternate_channel`, `manual_review`), bank_ref t null (the UTR, success only), fee m.
Rules: **the last attempt agrees with 007**. Its `outcome` equals the payment's `status` (`reversed` means a success followed by a return). Its channel equals the payment's `channel`, and its date is the date of `initiated_at` IST, so it lines up with 008's bank debit. About 25% of payments have 2–4 attempts. Earlier attempts fail with realistic codes and may use a different channel (alternate routing); the date never changes, and retries come 5 minutes to 4 hours apart. `limit_exceeded` happens only when the amount breaks that channel's `max_amount`. **No duplicate successful attempts** (§6: the A12 attempt variants are not in Tier 2).

**`nova_gateway_transactions` (`gtx_`) — 600–750 per slice.** View `nova_gateway_transactions_v`. Indexes `(slice_no, txn_at desc)`, `(settlement_id)`, `(parent_txn_id)`, unique `(slice_no, gateway_ref)`.
Columns: gateway_ref t, order_ref t (the company's own order id, in a per-slice format), customer_ref t (a hashed customer id; no names), channel_id → nova_payment_channels (a collection channel), card_scope t null in (`domestic`, `international`) (cards only), txn_type t in (`capture`, `refund`, `chargeback`, `chargeback_reversal`), parent_txn_id → nova_gateway_transactions null (set for everything except a capture), txn_at ts, amount m (> 0, gross), fee m, gst_on_fee m, net_amount m, status t in (`success`, `failed`, `pending`), failure_code t null, settlement_id → nova_settlements null, bank_rrn t null.
Rules: order values are ₹300–₹60,000, log-normal, with a weekday and payday seasonality. About 9% of captures fail (no fee, never settled). Refunds are 3–5% of captures, and chargebacks 0.3–0.8%. A chargeback is won (`chargeback_reversal`) in about 40% of cases. The fee is `amount × fee_pct` (international cards use `fee_pct_international`), plus `fee_flat`, rounded to paise, plus 18% GST. Refunds carry no new fee. A successful capture is settled in the batch dated `txn_at::date + settlement_days` (weekends roll forward).

**`nova_settlements` (`stl_`) — 180–260 per slice.** View `nova_settlements_v`. Index `(slice_no, settlement_date desc)`.
Columns: settlement_ref t (UTR, unique per slice), settlement_date d (≤ as_of), period_start d, period_end d (the capture dates covered), txn_count i, gross_amount m, refunds m, chargebacks m, fees m, gst_on_fees m, adjustments m (signed), adjustment_reason t null, adjustment_ref t null (a `gateway_ref`), net_amount m, payout_account_id ~> bank_accounts (the slice's `collections` account), status t in (`settled`, `on_hold`).
CHECK: `net_amount = gross_amount − refunds − chargebacks − fees − gst_on_fees + adjustments`. The reported components always add up; leakage shows only when they are recomputed from the transactions (A11).
Rules: one batch per settlement day that has captures. The components equal the sums of the batch's linked transactions, except for A11 plants. **The payout credit is not in `nova_bank_transactions`** (§10 G1).

**Plants in 010:** A11 (§6).

### 4.3 `011_sourcing_roles.sql` (2e sourcing, roles, integration) — owner: sourcing builder

**`nova_purchase_requisitions` (`prq_`) — 18–25 per slice.** View `nova_purchase_requisitions_v`. Index `(slice_no, created_date desc)`.
Columns: requisition_number t, department_id ~> departments, requested_by ~> employees, item_id ~> inventory null (null = a service), description t, quantity i, uom t, target_date d, budget_amount m, priority t in (`normal`, `urgent`), status t in (`open`, `quoted`, `ordered`, `cancelled`), created_date d, po_id ~> purchase_orders null.
Rules: **ordered requisitions are back-derived from real item POs.** The PO's first line fixes item, quantity and department, and `created_date` falls 5–20 days before `order_date`. Open and quoted ones are dated in the last 30 days and have no PO.

**`nova_supplier_quotes` (`sqt_`) — 60–90 per slice.** View `nova_supplier_quotes_v`. Indexes `(slice_no, quote_date desc)`, `(requisition_id)`.
Columns: requisition_id → nova_purchase_requisitions, vendor_id ~> vendors, quote_number t, quote_date d, valid_until d (may be after as_of), unit_price m, quantity_offered i, moq i, gst_rate p, freight_amount m, packing_amount m, payment_terms_days i, early_pay_discount_pct p, lead_time_days i, warranty_months i null, awarded b, notes t (templated).
Rules: 3–4 quotes per requisition, from vendors in the item's category. On an ordered requisition, the awarded quote's vendor and price equal the PO's. **Designed scenario (not an anomaly code):** in ≥ 60% of requisitions the lowest `unit_price` is *not* the lowest total landed cost once freight, MOQ excess, payment terms and the vendor's GRN rejection/delay history are counted. There is no ground-truth row; judges recompute it.

**`nova_roles` (`rol_`) — 12 per slice.** View `nova_roles_v`. Index `(slice_no, code)`.
Columns: code t in (`ap_clerk`, `ap_manager`, `vendor_master_admin`, `treasury_operator`, `treasury_approver`, `payroll_admin`, `procurement_buyer`, `procurement_manager`, `expense_approver`, `finance_controller`, `auditor_readonly`, `system_admin`), name t, permissions t[] (from: `vendor.create`, `vendor.edit_bank`, `po.create`, `po.approve`, `bill.enter`, `bill.approve`, `payment.initiate`, `payment.approve`, `journal.post`, `journal.approve`, `payroll.run`, `expense.approve`, `card.issue`, `user.admin`), is_privileged b.

**`nova_sod_rules` (`sod_`) — 8 per slice.** View `nova_sod_rules_v`. Index `(slice_no, rule_code)`.
Columns: rule_code t, permission_a t, permission_b t, severity t in (`high`, `medium`), description t. Examples: `vendor.create` + `payment.approve`; `vendor.edit_bank` + `payment.initiate`; `po.create` + `po.approve`; `journal.post` + `journal.approve`.

**`nova_user_role_assignments` (`ura_`) — 28–40 per slice.** View `nova_user_role_assignments_v`. Indexes `(slice_no, granted_at desc)`, `(employee_id)`, `(role_id)`.
Columns: employee_id ~> employees, role_id → nova_roles, granted_at ts, granted_by ~> employees, revoked_at ts null, justification t (templated).
Rules: roles follow department and grade (AP roles to Finance, buyers to Procurement). **Every employee who acts in a live A20 ground-truth row holds a role pair that breaks an SoD rule.** Add 2–3 more toxic holders who have not misused it, and 1–2 temporary grants that were revoked (decoys for FIN-42). There are no ground-truth rows (§6).

**`nova_source_records` (`src_`) — 300–380 per slice.** View `nova_source_records_v`. Indexes `(slice_no, exported_at desc)`, `(source_system, record_type)`.
Columns: source_system t in (`invoicing_app`, `bank_export`, `gateway_report`, `procurement_portal`, `crm_export`), record_type t in (`invoice`, `receipt`, `bank_line`, `gateway_txn`, `settlement`, `vendor`, `client`), external_id t (the id in that system), exported_at ts, payload j (that system's own field names and formats).
Rules: re-export the **last 60 days** of invoices (~50), receipts (~50) and collections-account bank lines (~60), gateway captures (~60) and settlements (~20), plus every vendor and client master (~50). Drift by source: date formats (`DD/MM/YYYY`, `YYYYMMDD`, epoch), amounts as strings with commas or in paise, names shortened or in capitals with M/s, Pvt Ltd or LLP variants, missing GSTINs, and category codes per system. Also plant duplicates (5%), conflicting amounts (3%), and canonical rows with no source record (5%).

**`nova_source_record_links` — admin-only answer key, about 1 per source record.** **No view, no registry entry**, locked down like `nova_ground_truth`.
Columns: `source_record_id → nova_source_records`, canonical_resource t (a registry key, e.g. `invoices`), canonical_id t null (null = no counterpart), match_kind t in (`exact`, `fuzzy`, `duplicate`, `conflict`, `orphan`), note t. The primary key is `(source_record_id)`.

### 4.4 `013_debt.sql` (2d debt) — owner: debt builder

The debt is **read off the bank statement 008 already wrote**, so the two can never disagree. Facts checked on live on 2026-09-29:
- Every slice has **one term loan**. It shows as 12–14 EMI debits of a fixed amount (₹1.8–4.6 lakh). The `bank_ref` is `LN` + 10 digits, the counterparty is one of 5 lenders, and the lines post on the 28th (or the next Monday) on the `vendor` account. 008's memo numbers the window's instalments 13–24 of 60, counted from a loan taken two years before as_of.
- Every slice has **21–59 working-capital drawdowns** into its `od` account (`bank_ref` `WC` + 10 digits). They total ₹1.25–4.15 crore per slice, and **none is ever repaid**. There is also a monthly `OD INT` interest debit.
- The statement contains A13 duplicate imports, so **link a schedule row to the original line, never to the copy** (the copies are in `nova_ground_truth` under A13).

**`nova_loans` (`lon_`) — 2 per slice** (§5.2 said 3). A third loan would need EMIs that the bank statement does not have. View `nova_loans_v`. Index `(slice_no, sanction_date desc)`.
Columns: loan_type t in (`term_loan`, `cash_credit`), lender t (term loan: the EMI counterparty; cash credit: the bank of the `od` account), loan_account_ref t (`LN…` from the EMI lines; cash credit: `CC` + the od account's last 4), sanctioned_amount m, sanction_date d (**before the window** for both), disbursed_amount m, interest_rate_pct p, rate_type t in (`fixed`, `floating`), tenure_months i null (60 for the term loan), emi_amount m null (= the EMI debit), repayment_account_id ~> bank_accounts, security t (templated), review_date d null (the cash-credit annual renewal; may be after as_of), outstanding_principal m (as of as_of), status t in (`active`, `closed`).
Rules: term loan principal = the EMI times the 60-month annuity factor at the chosen rate (10.5–13%), rounded to ₹1,000. The cash-credit limit is the peak cumulative drawdown rounded **up** to the next ₹25 lakh. Its outstanding is the sum of the drawdowns, because 008 records no repayments (§10 G4).

**`nova_loan_schedules` (`lsc_`) — 60 per slice** (the term loan's 60 instalments; cash credit is repayable on demand and has no schedule). View `nova_loan_schedules_v`. Indexes `(slice_no, due_date desc)`, `(loan_id)`.
Columns: loan_id → nova_loans, instalment_no i (1–60), due_date d (**may be after as_of**), opening_principal m, principal_due m, interest_due m, total_due m (= the EMI; the last instalment absorbs rounding), closing_principal m, status t in (`paid`, `due`, `scheduled`), paid_date d null, bank_transaction_id ~> bank_transactions null.
Rules: reducing-balance amortisation. An instalment that falls in the statement window is `paid`, with `paid_date` and `bank_transaction_id` taken from its EMI line. One that falls **before** the window is `paid`, with `paid_date` equal to `due_date` and `bank_transaction_id` null, because the statement starts on 2025-09-30. One after as_of is `scheduled`. `due` is used only if an instalment falls due between the last EMI line and as_of. **No missed EMI is planted:** every due EMI has a bank debit in 008 (§6).

**Plants in 013:** none.

### 4.5 `012_ledger.sql` (2c ledger) — owner: ledger builder

A double-entry general ledger generated **from the documents**, so a team can rebuild it and compare.

**`nova_chart_of_accounts` (`coa_`) — 60–80 per slice.** View `nova_chart_of_accounts_v`. Index `(slice_no, account_code)`.
Columns: account_code t (4 digits, unique per slice), name t, account_type t in (`asset`, `liability`, `equity`, `income`, `expense`), sub_type t in (`bank`, `cash`, `receivable`, `inventory`, `fixed_asset`, `accumulated_depreciation`, `tax_asset`, `clearing`, `payable`, `tax_payable`, `loan`, `equity`, `revenue`, `other_income`, `cogs`, `opex`, `payroll`, `finance_cost`, `depreciation`), parent_code t null, is_control b (AR, AP), bank_account_id ~> bank_accounts null (one GL account per bank account), description t.
Required accounts: one per bank account; Cash; AR; AP; Input and Output CGST, SGST and IGST; GST RCM payable; TDS receivable; TDS, PF and ESI payable; Inventory; Fixed assets by class (IT hardware, furniture, plant) with their accumulated depreciation; Term loan; Cash credit; clearing accounts **Gateway settlements in transit**, **Corporate card payable** and **Employee reimbursements payable**; Sales (B2B, per business unit), Online sales; an expense account per `nova_expenses` category and per claim/card group; Salaries; MDR fees; Bank charges; Interest; Depreciation; Round-off. The fixed-asset description states the **capitalisation threshold: ₹10,000 per unit**.

**`nova_accounting_periods` (`per_`) — 13 per slice.** View `nova_accounting_periods_v`. Index `(slice_no, start_date desc)`.
Columns: period t (`YYYY-MM`, unique per slice), start_date d, end_date d, status t in (`open`, `closed`), closed_at ts null, closed_by ~> employees null (the finance controller or Finance head).
Rules: 2025-09 (the one-day stub) through 2026-09. Every month before the as_of month is closed, 5–12 days after month end. The as_of month is open.

**`nova_journal_entries` (`jnl_`) — 850–1,100 per slice.** View `nova_journal_entries_v`. Indexes `(slice_no, entry_date desc)`, `(period_id)`, `(source_type, source_id)`.
Columns: entry_number t (unique per slice), entry_date d, period_id → nova_accounting_periods, posted_at ts, posted_by ~> employees, source_type t in (`invoice`, `credit_note`, `customer_receipt`, `purchase_bill`, `vendor_payment`, `expense`, `payroll`, `statutory`, `bank_charge`, `bank_interest`, `loan_emi`, `loan_drawdown`, `internal_transfer`, `gateway_settlement`, `card_statement`, `expense_claim`, `depreciation`, `accrual`, `opening_balance`, `monthly_summary`, `manual`), source_id t null (the document's id; null for summary, opening and manual entries), lines j (`[{account_code, debit, credit, department_id?, memo?}]`, 2–12 lines, exactly one of debit/credit > 0 per line), total_debit m and total_credit m (the sums of `lines`; **no equality CHECK**, because A19 plants unbalanced entries), narration t (templated), status t in (`posted`, `reversed`), reversal_of → nova_journal_entries null, approved_by ~> employees null.
Rules:
- **Document-level entries for the last 7 periods** (2026-03 → 2026-09, up to as_of). One entry per invoice, credit note, receipt, bill, vendor payment (success and reversal), expense, payroll run, statutory payment, bank-only line (charges, interest, internal-transfer pair, WC drawdown), EMI (split using 013), gateway settlement, card statement (one per card per month, from 009) and reimbursed claim batch (per department per payroll).
- **Periods before that** carry one `monthly_summary` entry per source type per month (about 10 per month), plus an `opening_balance` entry on 2025-09-30 from `nova_bank_accounts.opening_balance`, with equity as the balancing figure. This mirrors a ledger migrated from an older system. If the file is over budget, cut the detail window, but never below 3 periods.
- Plus monthly depreciation per asset class and 1–3 month-end accruals per period.
- Posting maps: capital-HSN bill lines (8471 computers, 9401/9403 furniture, 84xx machinery) at ≥ ₹10,000 per unit go to Fixed assets; stock items to Inventory; services to their opex account. Input GST is booked when `itc_eligible`; RCM bills also credit RCM payable. Receipts debit the bank GL of the account that received them and TDS receivable for `tds_deducted`.
- `posted_at` falls 0–5 days after `entry_date` and before the period's `closed_at`, except A19 plants and decoys.
- **Invariant (checked in §8):** outside A19, the balance of every bank GL account at as_of equals that account's `opening_balance` plus its credits minus its debits in `nova_bank_transactions`. The exception is the **A13 duplicate-import copies**, which the ledger does not post, because the money moved once. The gap between GL and statement is therefore exactly the A13 copies, which is the bank-reconciliation exception FIN-28 expects a team to find. The flows the statement lacks (§10 G1–G3) sit in the three clearing accounts, never in a bank GL.

**Plants in 012:** A19 (§6).

## 5. Registry keys

**21 new top-level resources and 10 child routes.** None collides with the 24 live keys (`invoices`, `clients`, `quotations`, `payments`, `vendors`, `purchase-bills`, `expenses`, `inventory`, `business-units`, `departments`, `employees`, `bank-accounts`, `vendor-contracts`, `purchase-orders`, `goods-receipts`, `vendor-bank-accounts`, `vendor-payments`, `approvals`, `master-data-changes`, `credit-notes`, `bank-transactions`, `payroll-runs`, `statutory-dues`, `budgets`) or the 6 live child routes. `mergeUnique` throws at load time if one does.

Each entry follows the pattern in `resources.banking.ts`. `object` is the singular snake_case of the key. `view` is the table's `_v`. `filters` are keyed by exact view column names, using the `fields.ts` shorthands: **text** (substring search on names), **code** (ids and exact codes), **date**, **timestamp** (every `ts` column, never `date`), **number**, **bool** and **oneOf([...])** (the exact CHECK list). `defaultSort` is the first sort field. `slice_no` is never listed.

| Key | File | Filters | Sort (first = default) |
|---|---|---|---|
| `spend-policies` | spend | applies_to oneOf, category code, department_id code, grade_min code, grade_max code, effective_from date, effective_to date, limit_amount number | effective_from, policy_code, limit_amount |
| `leave-records` | spend | employee_id code, leave_type oneOf, status oneOf, start_date date, end_date date, days number | start_date, end_date, days |
| `expense-claims` | spend | employee_id code, department_id code, category oneOf, status oneOf, expense_date date, submitted_at timestamp, amount number, trip_id code, client_id code, receipt_number code, receipt_hash code, receipt_merchant text, policy_exception bool, payroll_run_id code | expense_date, submitted_at, amount, claim_number |
| `corporate-cards` | spend | employee_id code, department_id code, status oneOf, network oneOf, issued_on date, per_txn_limit number, monthly_limit number | issued_on, monthly_limit |
| `card-transactions` | spend | card_id code, employee_id code, txn_at timestamp, posted_date date, mcc code, mcc_group oneOf, merchant_name text, amount number, auth_status oneOf, decline_reason oneOf, subscription_id code, txn_hour_ist number | txn_at, posted_date, amount |
| `subscriptions` | spend | vendor_name text, vendor_id code, category oneOf, department_id code, owner_employee_id code, billing_cycle oneOf, billing_channel oneOf, status oneOf, renewal_date date, started_on date, auto_renew bool, current_amount number | renewal_date, started_on, current_amount, annualised_cost |
| `payment-channels` | gateway | channel_code oneOf, direction oneOf, fee_model oneOf, settlement_days number | effective_from, channel_code, fee_pct |
| `payment-attempts` | gateway | vendor_payment_id code, channel_id code, outcome oneOf, failure_code oneOf, failure_stage oneOf, next_action oneOf, attempted_at timestamp, attempt_no number, amount number | attempted_at, attempt_no, amount |
| `gateway-transactions` | gateway | txn_type oneOf, status oneOf, channel_id code, card_scope oneOf, settlement_id code, parent_txn_id code, gateway_ref code, order_ref code, customer_ref code, bank_rrn code, txn_at timestamp, amount number, fee number | txn_at, amount, fee |
| `settlements` | gateway | settlement_ref code, settlement_date date, period_start date, period_end date, status oneOf, net_amount number, adjustments number, payout_account_id code | settlement_date, net_amount, gross_amount |
| `purchase-requisitions` | sourcing | department_id code, requested_by code, item_id code, status oneOf, priority oneOf, created_date date, target_date date, po_id code | created_date, target_date, budget_amount |
| `supplier-quotes` | sourcing | requisition_id code, vendor_id code, quote_date date, valid_until date, awarded bool, unit_price number, lead_time_days number | quote_date, unit_price, lead_time_days |
| `roles` | sourcing | code oneOf, is_privileged bool | code |
| `sod-rules` | sourcing | rule_code code, severity oneOf, permission_a code, permission_b code | rule_code |
| `user-role-assignments` | sourcing | employee_id code, role_id code, granted_by code, granted_at timestamp, revoked_at timestamp | granted_at, revoked_at |
| `source-records` | sourcing | source_system oneOf, record_type oneOf, external_id code, exported_at timestamp | exported_at, external_id |
| `loans` | debt | loan_type oneOf, lender text, status oneOf, sanction_date date, review_date date, outstanding_principal number | sanction_date, outstanding_principal |
| `loan-schedules` | debt | loan_id code, status oneOf, due_date date, paid_date date, instalment_no number, total_due number, bank_transaction_id code | due_date, instalment_no |
| `chart-of-accounts` | ledger | account_code code, account_type oneOf, sub_type oneOf, parent_code code, is_control bool, bank_account_id code, name text | account_code |
| `accounting-periods` | ledger | period code, status oneOf, start_date date, closed_at timestamp | start_date, period |
| `journal-entries` | ledger | period_id code, source_type oneOf, source_id code, status oneOf, entry_date date, posted_at timestamp, posted_by code, approved_by code, total_debit number, total_credit number, reversal_of code | entry_date, posted_at, entry_number, total_debit |

**Child routes** (`"<parent>/<child>"` → `parentField`), each in the child's file:

| Route | File | parentField |
|---|---|---|
| `employees/expense-claims` | spend | employee_id |
| `employees/leave-records` | spend | employee_id |
| `corporate-cards/card-transactions` | spend | card_id |
| `vendor-payments/payment-attempts` | gateway | vendor_payment_id |
| `settlements/gateway-transactions` | gateway | settlement_id |
| `purchase-requisitions/supplier-quotes` | sourcing | requisition_id |
| `roles/user-role-assignments` | sourcing | role_id |
| `employees/user-role-assignments` | sourcing | employee_id |
| `loans/loan-schedules` | debt | loan_id |
| `accounting-periods/journal-entries` | ledger | period_id |

**Never registered:** `nova_ground_truth`, `nova_source_record_links`. A builder may add a filter a view really has, **but never removes or renames one listed here**, because docs and teams depend on them. Any addition is reported in §9.

## 6. Anomaly catalogue (A11, A15, A16, A17, A19)

Each code has exactly **one owner file**, and that file's delete is `delete from public.nova_ground_truth where anomaly_code in (<its codes>)`. **Every slice gets every pattern.** Counts are per slice. Place plants at hashed positions inside the normal generation, never as a block at the end. A plant row must pass every CHECK and look like its neighbours on every column except the one signal.

| Code | Owner | Pattern (plant) | Planted | Decoys (legitimate look-alikes) | Serves |
|---|---|---|---|---|---|
| **A11** settlement leakage | 010 | (a) **Fee above contract:** a capture's `fee` is 0.3–0.6 points above its channel's `fee_pct` on a domestic card (3). (b) **Missing settlement:** a successful capture older than `settlement_days + 3` days whose `settlement_id` is null (2). (c) **Short batch:** a settlement with a negative `adjustments`, reason `refund recovery`, that deducts a refund the same or an earlier batch already deducted (1). (d) **Chargeback won but not credited:** a `chargeback_reversal` with status success and no `settlement_id`, more than 10 days old (1). | 7 | an international card at `fee_pct_international` (looks like a high fee); a capture within `settlement_days` of as_of that is not settled yet (looks missing); a negative adjustment whose `adjustment_ref` points to a refund that was **not** deducted anywhere else (looks like a short batch) | FIN-11, FIN-14, FIN-26 |
| **A15** expense-claim abuse | 009 | (a) **Duplicate receipt:** the same `receipt_hash`, `receipt_number` and amount claimed twice, once by the same employee 20–60 days apart and once by two colleagues (2). (b) **Claim on a leave day:** a `local_conveyance`, `meals` or `fuel` claim in the home city, dated inside the claimant's **approved** leave (2). (c) **Over limit:** amount above the applicable policy's `limit_amount` for the grade, approved, `policy_exception = false` (2). | 6 | a legitimately split bill: same `receipt_hash`, 2 claimants, same `trip_id`, parts summing to ≤ `receipt_total`; a `telecom` claim dated on a leave day (it is a billing date, not activity); an over-limit claim with `policy_exception = true` and `exception_approved_by` = the department head | FIN-21, FIN-44 |
| **A16** card misuse | 009 | (a) **Blocked MCC approved:** `auth_status = approved` on an MCC in the card policy's `blocked_mcc` (2). (b) **Night spend:** 01:00–04:00 IST at a `retail` or `entertainment` merchant, approved (2). (c) **Just-under-limit split:** 3 approved transactions at the same merchant within 24 h, each 92–99% of `per_txn_limit` (2 clusters). | 6 (a cluster = 1 row with 3 ids) | a 02:00 IST `travel` MCC charge (an airline) on a day the holder has a `travel_air` claim with the same `trip_id` city; a blocked-MCC attempt that was **declined** (`blocked_mcc`), which is the control working; a single subscription charge at 95% of the limit that recurs monthly | FIN-23, FIN-44 |
| **A17** duplicate or zombie subscription | 009 | (a) **Duplicate:** two `active` subscriptions with the same `name` and `vendor_name` in two departments, overlapping for ≥ 3 months, combined `seats_active` ≤ one's `seats_purchased` (1 pair). (b) **Zombie:** `active` with `auto_renew`, owner's `exit_date` ≥ 60 days before as_of, `last_used_on` ≤ exit_date, still billed after the exit (1). | 2 | the same product twice, but sequential: one `cancelled_on` ≤ the other's `started_on` (a migration); `seats_active = 0` on a subscription started ≤ 30 days before as_of (onboarding) | FIN-24, FIN-20 |
| **A19** ledger errors | 012 | (a) **Unbalanced:** `total_debit ≠ total_credit`, from a transposed digit on one line (2). (b) **Capex as opex:** a document-level bill entry that posts a capital-HSN line at ≥ ₹10,000 per unit to an opex account (2). (c) **Closed-period posting:** `entry_date` in a closed period and `posted_at` after that period's `closed_at`, no `approved_by`, posted by a non-controller (2). | 6 | a balanced entry with a Round-off line of ≤ ₹1 (looks unbalanced at first sight); a capital-HSN item under ₹10,000 per unit expensed (below the threshold); a post-close entry with `approved_by` = the period's `closed_by` and narration "audit adjustment" (an approved adjustment) | FIN-28, FIN-29 |

**Ground-truth rows** use the live DDL in `005_org_and_ground_truth.sql`: `slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note`.
- `resource` = the **registry key** of the first id in `record_ids`: `gateway-transactions`, `settlements`, `expense-claims`, `card-transactions`, `subscriptions` or `journal-entries`.
- `record_ids` lists every id involved. A15(b) is `[claim_id, leave_id]`. A15(a) is both claim ids. A16(c) is the 3 transaction ids. A17(a) is both subscription ids. A11(c) is `[settlement_id, refund_txn_id]`. A11(d) is `[reversal_id, chargeback_id]`. A19(b) is `[journal_id, bill_id]`.
- `group_id` = `'<code>-<pattern letter>-<first id>'`, e.g. `A16-c-ctx_1a2b3c4d5e6f`.
- `difficulty`: easy for A19(a) and A16(a); medium for A11(a), A11(b), A15(a), A15(c), A16(b) and A17(a); hard for A11(c), A11(d), A15(b), A16(c), A17(b), A19(b) and A19(c).
- `note` is one plain sentence of the reasoning, in neutral wording. Decoy notes say why the row is legitimate.
- **Every id in `record_ids` must exist, in the same slice, in the table behind `resource`**, or in the named second table for mixed rows (checked in §8).

**Not planted in Tier 2**, and why:
- **A2 decoys** belong to the Tier 1 fixes (decided).
- **A7 claim/card splits** and **A12 attempt variants** (failed-but-booked, both retries succeed) are not in the decided list. Also, A12's "both succeed" would need a second bank debit that 008 does not have.
- **A missed EMI:** every due EMI has a bank debit in 008, so a schedule marked missed would contradict the statement.
- The **2e scenarios** (lowest price is not the lowest landed cost; toxic role combinations) are designed features without ground-truth rows. The source-record matches have their own key (§4.3).

## 7. Coverage: what moves, and through which tables

Baseline (coverage plan §1): **27 covered, 12 partial, 15 missing**. Tier 2 touches every partial or missing FIN statement except FIN-22, which needs the Tier 1 budget fix now in flight in 008.

| Statement | Before | After Tier 2 | Through |
|---|---|---|---|
| FIN-01 Procurement decision | 🟡 | ✅ | purchase-requisitions, supplier-quotes (+ live GRN history) |
| FIN-11 Payment reconciliation | 🟡 | ✅* | gateway-transactions, settlements, payment-channels (+ live payments, bank) |
| FIN-12 Payment failure recovery | 🟡 | ✅ | payment-attempts (failure codes, retry chains, alternate routes) |
| FIN-13 Payment routing | ❌ | ✅ | payment-channels (fees, limits, cut-offs, success rates), payment-attempts |
| FIN-14 Settlement leakage | ❌ | ✅ | gateway-transactions, settlements; A11 |
| FIN-20 Cash commitments | 🟡 | ✅ | loan-schedules (future EMIs), subscriptions (renewals), corporate-cards (card payable via the ledger) |
| FIN-21 Expense verification | ❌ | ✅ | expense-claims, spend-policies, leave-records; A15 |
| FIN-23 Corporate cards | ❌ | ✅ | corporate-cards, card-transactions, spend-policies; A16 |
| FIN-24 Subscriptions | 🟡 | ✅ | subscriptions (seats, renewals, price history), card-transactions; A17 |
| FIN-26 Multi-source reconciliation | 🟡 | ✅ | source-records + gateway-transactions, settlements |
| FIN-28 Period close | ❌ | ✅ | accounting-periods, journal-entries, chart-of-accounts; A19; bank-rec gap = A13 copies |
| FIN-29 Ledger integrity | 🟡 | ✅ | chart-of-accounts, journal-entries; A19 |
| FIN-35 Data integration | ❌ | ✅ | source-records (5 systems, format and name drift) |
| FIN-37 Credit assessment | 🟡 | ✅ | loans, loan-schedules |
| FIN-39 Loan repayment planning | 🟡 | ✅* | loans, loan-schedules |
| FIN-42 Approval and SoD | 🟡 | ✅ | roles, sod-rules, user-role-assignments (+ live A20) |
| FIN-44 Policy compliance | 🟡 | ✅ | spend-policies, expense-claims, card-transactions |
| FIN-22 Spend control | 🟡 | 🟡 | **not Tier 2**: needs the utilities/meals/other budget lines (the 008 fix) |

**Result: 44 covered, 1 partial, 9 missing.** Tier 2 moves 17 statements: 11 partials (FIN-01, 11, 12, 20, 24, 26, 29, 37, 39, 42, 44) and 6 missing ones (FIN-13, 14, 21, 23, 28, 35). The 1 partial left is FIN-22, which becomes covered when the 008 budget fix lands; that makes **45 covered, 0 partial, 9 missing**, matching the coverage plan's Tier 2 target. The 9 missing are CRM-01–04 and HRM-01–05 (Tier 3, out of scope).

\* **With a caveat**, not a gap in shape:
- **FIN-11:** gateway payouts are not on the bank statement (§10 G1), so the bank leg of gateway reconciliation runs against `settlements` plus the `gateway_report` and `bank_export` source records, not against `bank-transactions`.
- **FIN-39:** the cash-credit line has no repayment schedule, and its drawdowns are never repaid in 008 (§10 G4).

## 8. Verify loop (every builder)

### 8.1 Build a fresh local cluster on your own port

Binaries are in `C:\Program Files\PostgreSQL\18\bin\`. Work only in your scratch dir. **Never connect to the remote database.**

1. `initdb -D <scratch>/pgdata -U postgres -A trust -E UTF8`, then `pg_ctl -D <scratch>/pgdata -o "-p <port>" -l <scratch>/pg.log start`.
2. Bootstrap (as in the orchestrator's `nova-integration/build.sh`):
   - create roles `anon`, `authenticated` and `service_role` (nologin, if missing), then `create database nova`;
   - `grant usage on schema public to anon, authenticated, service_role`;
   - `alter default privileges in schema public grant all on tables / sequences / functions to anon, authenticated, service_role`. This **emulates Supabase's defaults**, so the lockdown check proves your file revokes its own grants instead of passing vacuously.
3. Apply with `psql -X -q -v ON_ERROR_STOP=1 -f`: `001 → 003 → 004 → 005 → 002 → 006 → 007 → 008`, then your dependencies in §3.1 run order, then your file. Record the wall time of each step. Use the **working-tree** 008 as it stands, and note its `git log -1` hash in your report, since a peer is changing it.

### 8.2 Checks (all must pass; keep the queries in your scratch dir)

| # | Check | Pass condition |
|---|---|---|
| C1 | **Volumes** | Every table has rows per slice within its §4 range in **all 80 slices** (report min/max). |
| C2 | **Slice isolation, per reference** | For every FK *and* every soft reference: 0 rows where the child's `slice_no` ≠ the parent's, and 0 soft references with no parent. One query per reference, listed in the report. |
| C3 | **Determinism** | Build twice into two fresh databases. For each of your tables, compare `md5(string_agg(t::text, '|' order by id))` over every column **except `created_at`**, and the same over your ground-truth rows (excluding `id`). The two builds must match exactly. |
| C4 | **Re-run** | Run your file a second time on the same database. Row counts and C3 md5s are unchanged, the upstream tables' md5s are unchanged (prove you wrote nothing upstream), and no error occurs. |
| C5 | **Upstream re-run survives** | Rerun `008_banking.sql` (and for 011, `010`), then your file. Both succeed; there is no `cannot truncate` error. |
| C6 | **Banned words** | 0 matches, case-insensitive, for `dummy\|sample\|sandbox\|fake\|synthetic\|mock\|demo\|test data` over every text and jsonb column of your views, your view and column names, and your CHECK value lists. (`test` alone is allowed only inside a real word such as "latest"; report any hit you judge legitimate.) |
| C7 | **Lockdown** | For every table and view of yours: RLS on (tables), zero policies, `has_table_privilege('anon', …, 'select')` and the same for `authenticated` are false, `service_role` can select, and every view has `security_invoker=true` in `reloptions`. Admin-only tables (`nova_source_record_links`) also have no view. |
| C8 | **Ground truth** | Your codes exist in all 80 slices at the §6 planted and decoy counts. Every id in `record_ids` resolves, **by its prefix**, to a row in the same slice. `resource` is a registry key. No other code's rows changed (compare counts per code before and after). |
| C9 | **Registry ↔ views** | Every filter key and sort field in your `resources.<domain>.ts` is a column of its view (query `information_schema.columns`). Every `oneOf` list equals the column's CHECK list. Every `ts` column uses `timestamp`, never `date`. |
| C10 | **Money and logic** | File-specific arithmetic holds outside the plants: claims `approved_amount ≤ amount`; settlement CHECK and components = linked transactions; final attempt = 007 status; schedule `closing = opening − principal` and the balance reaches 0 at instalment 60; journal balance invariant (§4.5); every date ≤ as_of except the columns §4 marks. |
| C11 | **Size budget** | `sum(pg_total_relation_size(...))` over your tables, plus your ground-truth rows' share, is ≤ your §3.3 budget. Report MB and KB per slice. |
| C12 | **TypeScript** | `node --experimental-strip-types src/lib/nova/resources.check.ts` prints `resources.check: all assertions passed`, and `node node_modules/typescript/bin/tsc --noEmit -p . 2>&1 \| grep nova` prints nothing. **The repo is npm-managed: never run pnpm or `npm install`.** |

### 8.3 Loop

**Act → check → fix → re-check, at most 6 iterations.** Stop and report instead of continuing if:
- a fix would need an edit to any file outside your ownership (§3.2);
- a C1 volume cannot fit the C11 budget even at the §4 minimums;
- an upstream fact in §4 (for example the EMI shape in §4.4) is false on your build;
- you hit a destructive step you did not expect.

When all 12 checks pass, put `-- STATUS: VERIFIED <YYYY-MM-DD>` on **line 1** of your SQL file.

### 8.4 Git and report

- `git add` your **two** files by explicit path. `git diff --cached --name-status` must show only them.
- As a **separate step**, run the secret scan the orchestrator's brief gives you (the DB-password prefix, the admin key name, and the JWT prefix `eyJ`) over your two files. It must print nothing. The pattern is deliberately not written here, because this file is committed.
- Then `git commit -F - -- <your two paths>`, `git fetch`, and a `git pull --no-rebase --no-edit` only if you are behind and the tree is otherwise clean. Then `git push origin main`.
- **No `Co-Authored-By` trailer.** Never `git add -A` / `.` / `-a`, `git stash`, `--force` or `--no-verify`. If `tsconfig.tsbuildinfo` or a peer's file blocks a pull, **report; do not clean it**.
- **Report:** per table, rows per slice (min/max) and MB; C1–C12 results; both md5 sets; the build wall times; the 008 commit hash you built against; the commit hash; and any contract problem you found. The orchestrator records the problems in §9.

## 9. Deviations as built

*Filled as builders report.* Record here, in the Tier 1 §9 format (`# | Contract said | As built | Why / consequence`), every place a built file differs from §1–§8. The SQL files are the source of truth for these points.

| # | Contract said | As built | Why / consequence |
|---|---|---|---|
| 2b-1 | Cards go to "G4+ staff and frequent travellers" (§4.1). | Cards go to G5+ staff plus 1–3 G3–G4 Sales/Ops travellers per slice. | This keeps the programme within 15–20 cards per slice. The SQL comment says so. |
| 2b-2 | §6 gives no decoy count for A16. | Each slice has 5 decoys: 2 declined blocked-MCC attempts, 2 night-time airline charges, and 1 recurring charge at 95% of the limit. | The A16(c) decoy is one ground-truth row that lists all its monthly charges. |
| 2b-3 | `category` is "the claim category or the card MCC group". | The two card-programme rules use `category = 'all'`. | They cover the whole card, not one MCC group. |
| 2b-4 | `decline_reason` lists `over_monthly_limit`. | No row uses it. | `monthly_limit` is 1.25× the holder's heaviest month, so no approved month exceeds it. The value stays valid in the CHECK and the registry. |
| 2b-5 | "Hours cluster from 09:00 to 21:00 IST." | Everyday spend runs 07:00–22:59 IST, peaking mid-afternoon. Subscription charges post 06:00–10:00 IST. | 07:00–23:00 is also the window the retail and entertainment policies allow. |

Deviations for 2a, 2d and 2e are not yet recorded here: their builders' reports were lost when those sessions ended; the SQL files' comments are the source of truth until they are.

## 10. Known gaps and open questions

These follow from "Tier 2 must not touch 001–008". Each is a **coherence gap between a Tier 2 sub-ledger and the 008 bank statement**. The ledger keeps them honest by parking the flows in clearing accounts (§4.5), so no team is shown a bank GL that disagrees with the statement.

| # | Gap | Effect | Proposed fix (needs Teja; banking owner) |
|---|---|---|---|
| G1 | Gateway **payout credits** are not lines in `nova_bank_transactions`. | FIN-11's bank leg runs against `settlements` and source records. The "Gateway settlements in transit" balance grows all year. | After Tier 2: move 010 before 008 in the run order (010 reads no 008 table, by design, §3.1), and have 008 post one credit per settlement to the collections account. |
| G2 | **Corporate card bills** are never paid from a bank account. | "Corporate card payable" grows all year. FIN-20 can treat it as a real obligation. | Same pattern: 008 posts a monthly card-bill debit. This needs 009 before 008, which already holds, except that 009 reads `payroll_runs` from 008. Drop that read (derive the pay date from 008's rule) before making the swap. |
| G3 | Claim **reimbursements** ride payroll day but are not in `payroll_runs.net` or any bank line. | "Employee reimbursements payable" is cleared by a journal with no bank leg. | As G2, add the reimbursement batch to the payroll debit in 008. |
| G4 | 008's treasury pass **draws ₹1.25–4.15 crore of WC loans per slice and never repays any**. | The cash-credit outstanding looks alarming for FIN-37/39. That is realistic for a stressed SME, but it is uniform across all 80 slices. | Tier 1 fix in 008: sweep surplus collections back to the OD line. This is a **pre-existing Tier 1 finding**, surfaced here and not caused by Tier 2. |

**Open questions** (defaults apply until Teja answers):
1. **Toxic role combinations and the A20 key.** Should the 2–3 extra toxic holders in 011 get A20 ground-truth rows (a second owner for A20, with a `resource = 'user-role-assignments'` filter as in 008's A14)? *Default: no. The pattern is derivable from `sod-rules`.*
2. **G1–G3 order.** Fix them in one 008 change after Tier 2 is live? *Default: yes, as one change, because each needs the same run-order swap.*
3. **The coverage plan's framing text** (`nova-finathon-data-coverage.md` title and line 6) uses words the neutral-wording rule bans for team-visible data. The file is internal, but if it is ever shared with teams, reword it first.
