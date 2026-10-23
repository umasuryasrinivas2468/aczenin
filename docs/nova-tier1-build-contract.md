# Nova Tier 0 + Tier 1 — build contract

*2026-09-29. The single source every Tier 0/1 worker builds against. The entity
definitions and planted anomalies come from [nova-finathon-data-coverage.md](nova-finathon-data-coverage.md)
§3–§5; this file fixes the names, volumes, run order and ownership so parallel
workers produce parts that fit together. If this file and the coverage plan
disagree, **this file wins**.*

## 1. Decisions already made (do not revisit)

| Decision | Value |
|---|---|
| Supabase plan | **Free, 500 MB.** Volumes below are about half of the coverage plan. The target is ≤ 300 MB total. |
| Output format | **JSON only.** No CSV or file downloads, no receipt images. Receipts are metadata. |
| Salaries | **None per person.** Employees carry `grade`, `pay_band` and `hourly_cost_rate`; payroll is aggregated per department per month. |
| Free text | Short **templated** text (bank narrations, reasons, notes) drawn from phrase banks, deterministic. |
| Clock | A **frozen as-of date** in `nova_dataset_meta.as_of_date`. All "overdue" logic and relative dates use it, never `current_date`. |
| Wording | **Neutral.** No row, column name, enum value or note visible to teams may say dummy, fake, test, sample, synthetic, sandbox or demo. Nothing claims the data is real either. |
| Answer key | Every planted anomaly and decoy is recorded in **`nova_ground_truth`**, which is admin-only and never exposed by the team API. |
| Cash-limit rows | Planted deliberately as compliance violations, anomaly **A28** (§6). |
| Teams | 80 slices, `slice_no` 0–79. A team reads `slot % 80`. Every new table carries `slice_no` and inherits it from its parent. |

## 2. Conventions every table follows

- **Text primary keys with a type prefix** (`emp_`, `po_`, `grn_`, …), deterministic, e.g. `'po_' || left(md5('po' || slice || '-' || n), 8)`, with a CHECK on the prefix.
- **`slice_no integer not null check (slice_no >= 0)`** on every business table, plus an index on `(slice_no, <main date> desc)`.
- A **child row's `slice_no` equals its parent's.** The seed guarantees it, and the verify loop checks it.
- Money is `numeric(14,2)`, timestamps are `timestamptz`, and status columns are `text` + CHECK (no Postgres enums).
- **Lockdown**, same as 001: RLS enabled with no policies, `revoke all from anon, authenticated`, `grant … to service_role`. Every new table and view.
- **One read view per table:** `nova_<table>_v with (security_invoker = true)`. The API reads views only.
- **Deterministic seed:** `setseed()` at the top, `random()` only in simple statements, and `set max_parallel_workers_per_gather = 0`. Two runs must give an identical md5.
- **Re-runnable:** each file creates with `if not exists`, then **truncates only its own tables** and deletes only its own anomaly codes from `nova_ground_truth`.
- **Neutral naming:** a planted row looks like any other row. There is no `is_fraud` column, no telling ids, and no top-of-order placement. Plant during generation, at a per-slice random offset. Include **decoys** (look anomalous, have a legitimate reason) and label them `is_decoy = true`.
- Emails use the `.example` domain. PAN, IFSC and account numbers are generated, not copied from anywhere.
- **Every line of SQL carries a WHY comment** (Teja's rule), at the density of `001_schema.sql`.

## 3. Run order and file ownership

Files run **in this order** on a fresh database, after the existing `001 → 003 → 004`:

| # | File | Owner | Tables it creates or changes |
|---|---|---|---|
| 1 | `supabase/nova/005_org_and_ground_truth.sql` | **org worker** | `nova_business_units`, `nova_departments`, `nova_employees`, `nova_bank_accounts`, `nova_ground_truth`; adds `as_of_date` to `nova_dataset_meta`; rebuilds `nova_invoices_v` / `nova_purchase_bills_v` to use the as-of date |
| 2 | `supabase/nova/002_seed.sql` | **org worker** (Tier 0) | Resizes the 9 existing tables, adds their new columns (§4), plants A1 A5 A6 A14 A24 A28 |
| 3 | `supabase/nova/006_procurement.sql` | **procurement worker** | `nova_vendor_contracts`, `nova_purchase_orders`, `nova_goods_receipts`; fills `nova_purchase_bills.po_id / grn_id` |
| 4 | `supabase/nova/007_payables_controls.sql` | **payables worker** | `nova_vendor_bank_accounts`, `nova_vendor_payments`, `nova_approvals`, `nova_master_data_changes`, `nova_credit_notes` |
| 5 | `supabase/nova/008_banking.sql` | **banking worker** | `nova_bank_transactions`, `nova_payroll_runs`, `nova_statutory_dues`, `nova_budgets`; fills `nova_payments.bank_transaction_id` and `nova_vendor_payments.bank_transaction_id` |

Banking runs **last** because the bank statement is the sum of every cash movement: receipts, vendor payments, payroll, statutory dues and loan EMIs.

**Registry files.** Each owner fills exactly one: `src/lib/nova/resources.org.ts`, `resources.procurement.ts`, `resources.payables.ts` or `resources.banking.ts`. Tier 0 column additions go into the **existing** entries in `src/lib/nova/resources.ts`, owned by the org worker. Import field shorthands from `./fields.ts`. `resources.ts` merges the maps and throws on a duplicate key.

**Readiness marker.** When a file passes its verify loop, its owner puts `-- STATUS: VERIFIED 2026-09-29` on line 1. Downstream workers write against this contract straight away, but run their full local chain only once every upstream file carries the marker.

## 4. Tier 0 — existing tables (org worker, `002_seed.sql`)

| Table | Rows per slice | Add columns |
|---|---|---|
| nova_clients | **30** | `segment` (enterprise, mid_market, smb), `industry`, `region`, `credit_limit`, `payment_terms_days`, `account_owner_id → employees`, `business_unit_id → business_units`, `pan` |
| nova_vendors | **20** | `category`, `criticality` (high, medium, low), `payment_terms_days`, `early_pay_discount_pct`, `late_penalty_pct_per_month`, `address`, `pan`, `state_code`, `created_by → employees`, `status` (active, blocked, pending_verification) |
| nova_invoices | **300** | `business_unit_id`, `sales_rep_id → employees`, `discount_amount` |
| nova_quotations | **75** | `sales_rep_id` |
| nova_payments | **~275** | `bank_transaction_id` (nullable; banking fills it), `tds_deducted`, `allocations jsonb` (`[{invoice_id, amount}]`, one receipt may cover several invoices) |
| nova_purchase_bills | **200** | `po_id`, `grn_id` (nullable; procurement fills them), `submitted_by → employees`, `approval_status` (pending, approved, rejected), `received_date` |
| nova_expenses | **300** | `employee_id`, `department_id`, `business_unit_id`, `client_id` (nullable, customer-specific cost), `recurring` |
| nova_inventory | **30** | `primary_vendor_id → vendors`, `lead_time_days`, `single_source` |
| nova_stock_movements | **750** | `warehouse`, `unit_cost` |

**Also fix the realism issues the PDF worker found:**
- Spread invoice dates evenly across the 12 months before the as-of date (not 40% in the last month).
- Sale movements must reference an invoice that contains the item and share its date.
- Randomise the reorder shortfall.
- Keep book size within about 3× across slices (not 24×).
- Most slices should be profitable, with a few loss-makers.
- Use real GSTIN check characters (mod-36 checksum) and PANs consistent with the GSTIN, apart from A6's deliberately invalid ones.
- Add `state_code` to vendors so the bill GST split follows the vendor's state.

## 5. Tier 1 — new tables

Columns follow the coverage plan §3; the names here are binding. Types: m = numeric(14,2), d = date, ts = timestamptz, t = text, i = integer, b = boolean, j = jsonb.

**Org (org worker, 005):**

| Table (prefix) | Rows per slice | Columns |
|---|---|---|
| nova_business_units (`bu_`) | 4 | name, type (branch, product_line), city |
| nova_departments (`dep_`) | 8 | name, cost_center, head_employee_id → employees, business_unit_id |
| nova_employees (`emp_`) | 60 | code, name, email (.example), department_id, business_unit_id, manager_id → employees, grade (G1–G8), role_title, location, join_date d, exit_date d null, employment_type (full_time, part_time, contract), pay_band (B1–B6), hourly_cost_rate m, work_hours_per_week i, bank_fingerprint t |
| nova_bank_accounts (`bac_`) | 5 | bank, ifsc, account_last4, purpose (collections, payroll, vendor, branch, od), business_unit_id, opening_balance m, min_balance m, daily_transfer_limit m, statement_format (hdfc, icici, sbi, axis) |

**Procurement (procurement worker, 006):**

| Table (prefix) | Rows per slice | Columns |
|---|---|---|
| nova_vendor_contracts (`vct_`) | 15 | vendor_id, item_id → inventory, contract_price m, volume_tiers j, monthly_capacity i, moq i, lead_time_days i, valid_from d, valid_to d |
| nova_purchase_orders (`po_`) | 175 | po_number, vendor_id, department_id, items j (`[{item_id, qty, unit_price, gst_rate}]`), total_amount m, order_date d, promised_date d, status (open, partially_received, received, closed, cancelled), raised_by → employees, channel (catalog, contract, off_contract) |
| nova_goods_receipts (`grn_`) | 190 | grn_number, po_id, received_date d, items j (`[{item_id, qty_received, qty_rejected, reject_reason}]`), received_by → employees |

**Payables and controls (payables worker, 007):**

| Table (prefix) | Rows per slice | Columns |
|---|---|---|
| nova_vendor_bank_accounts (`vba_`) | 28 | vendor_id, ifsc, account_last4, account_fingerprint, holder_name, valid_from d, valid_to d null, verified b |
| nova_vendor_payments (`vpy_`) | 225 | payment_number, vendor_id, bill_ids j (list), beneficiary_account_id → vendor_bank_accounts, from_account_id → bank_accounts, amount m, channel (neft, rtgs, imps, upi, cheque), initiated_by, approved_by → employees, initiated_at ts, status (success, failed, reversed), bank_transaction_id (nullable; banking fills it) |
| nova_approvals (`apr_`) | 1,000 | doc_type (purchase_order, purchase_bill, vendor_payment, expense, credit_note, vendor_master), doc_id, level i, action (approve, reject, escalate), actor_id → employees, acted_at ts, threshold_applied m |
| nova_master_data_changes (`mdc_`) | 125 | entity_type (vendor, client, employee, vendor_bank_account), entity_id, field, old_value, new_value, changed_by, changed_at ts, approved_by null |
| nova_credit_notes (`crn_`) | 20 | credit_note_number, invoice_id, client_id, note_date d, amount m, gst_amount m, reason (return, discount, refund, price_difference), approved_by |

**Banking (banking worker, 008):**

| Table (prefix) | Rows per slice | Columns |
|---|---|---|
| nova_bank_transactions (`btx_`) | 1,500 | account_id, value_date d, posted_date d, debit m, credit m, running_balance m, raw_narration t (in that bank's own format), counterparty_text, bank_ref, cheque_no null |
| nova_payroll_runs (`prl_`) | 96 | month d (first of month), department_id, gross m, net m, pf m, esi m, tds m, pay_date d, account_id |
| nova_statutory_dues (`sdu_`) | 60 | due_type (gstr3b, tds, pf, esi, advance_tax), period t, due_date d, amount m, paid_date d null, interest_paid m |
| nova_budgets (`bud_`) | 300 | department_id, category, month d, amount m, committed m |

**API resource names** (kebab-case URL segments), registered in the owner's registry file:
- **Org:** `business-units`, `departments`, `employees`, `bank-accounts`
- **Procurement:** `vendor-contracts`, `purchase-orders`, `goods-receipts`
- **Payables:** `vendor-bank-accounts`, `vendor-payments`, `approvals`, `master-data-changes`, `credit-notes`
- **Banking:** `bank-transactions`, `payroll-runs`, `statutory-dues`, `budgets`

**Child routes:**
- `purchase-orders/goods-receipts` (po_id)
- `vendors/vendor-bank-accounts` (vendor_id)
- `bank-accounts/bank-transactions` (account_id)
- `departments/employees` (department_id)

## 6. Planted anomalies — who plants what

The codes match coverage plan §4. Rates are per slice.

| Owner | Codes |
|---|---|
| org (Tier 0) | A1 duplicate bills (3 exact, 3 near), A5 duplicate masters (2 vendor + 2 client pairs), A6 invalid identifiers (4), A14 unmatched/partial receipts (5% of receipts), A24 credit deterioration (1), **A28 cash-limit breaches** (1–2 cash receipts ≥ ₹2,00,000 [s.269ST], 3–5 cash expenses > ₹10,000 [s.40A(3)]), decoys for each |
| procurement | A7 split POs (2 clusters), A8 price leakage (6), A9 three-way match failures (5% of bills), A10 supplier deterioration (2 vendors) |
| payables | A2 ghost vendor (1; it may add one vendor row with a matching bill), A3 bank change before payment (2), A4 shared account (2 clusters, one vendor↔employee using `nova_employees.bank_fingerprint`), A7 split payments (1 cluster), A12 double payment (2), A20 SoD conflicts (6), A21 circular flow (1 ring), A22 refund cluster (1) |
| banking | A13 statement noise (2% duplicate lines, unlabelled internal transfers, varied narrations), A14 bank side (receipts with no invoice), A18 budget overrun (2 departments), A23 liquidity squeeze (1 week) |

## 7. `nova_ground_truth` (created by org worker in 005)

```
id bigint identity pk, slice_no int not null, anomaly_code text not null,
resource text not null,        -- API resource name, e.g. 'purchase-bills'
record_ids text[] not null,    -- the ids involved
group_id text,                 -- ties multi-record patterns together
difficulty text check in ('easy','medium','hard'),
is_decoy boolean not null default false,
note text                      -- plain-language explanation for judges
```

RLS on, no policies, anon and authenticated revoked, service_role only. It must **never** be added to any registry file or view that the team API reads. Index on `(slice_no, anomaly_code)`.

## 8. Verify loop (every worker)

1. Use a local throwaway PostgreSQL 18 cluster in your own scratch dir, on **your own port**: org 55432, procurement 55433, payables 55434, banking 55435.
   - Create roles `anon`, `authenticated` and `service_role`.
   - Apply `001 → 003 → 004 → 005 → 002 → 006 → 007 → 008`, up to and including your file, with `-v ON_ERROR_STOP=1`.
   - The binaries are in `C:\Program Files\PostgreSQL\18\bin\`.
2. **Checks:**
   - row counts per slice (min > 0 in all 80 slices)
   - every FK resolves
   - every child's `slice_no` equals its parent's
   - money arithmetic holds
   - every planted anomaly has a `nova_ground_truth` row, and every ground-truth record id exists
   - no team-visible text contains the banned words in §1
   - determinism: identical md5 on two runs
3. `node --experimental-strip-types src/lib/nova/resources.check.ts` still passes, and `node node_modules/typescript/bin/tsc --noEmit -p .` shows no errors in your files.
4. Act → check → fix → re-check, max 6 iterations. **Never connect to the remote database**; the orchestrator applies everything live.
5. When done, put the STATUS marker on line 1 and report: counts, per-slice min/max, check results, md5s, the size of your tables (`pg_total_relation_size`), and any contract problems.

## 9. Deviations as built (2026-09-29, verified locally, pending live apply)

Where the built files differ from §1–§7. The SQL files are the source of truth for these points; the sections above are left as originally agreed.

| # | Contract said | As built | Why / consequence |
|---|---|---|---|
| D1 | Tier 0 columns added in `002` (§3, §4) | Added in **`005`**, all nullable | Views must be rebuilt after the columns exist, and view DDL is schema. `002` is now a pure data file. |
| D2 | `bill_number` unique | **Not unique.** Replaced by a non-unique index on `(vendor_id, bill_number)` | A1 needs genuine duplicate bill numbers. |
| D3 | Each file re-runnable in isolation (§2) | Rerunning **`005` truncates its org tables with CASCADE**, which empties every table that references employees | After any rerun of `005`, rerun `002 → 006 → 007 → 008`. |
| D4 | Frozen as-of date (§1) | `005` sets `as_of_date = current_date` when it runs (2026-09-29 locally); `002`–`008` only read it | The live value will be the live apply date. |
| D5 | Ids like `left(md5(…), 8)` (§2) | Business ids in `002` use **12 hex chars**; `emp_`, `bu_`, `dep_`, `bac_` stay at 8 | Ids in other files must not assume 8 chars. |
| D6 | Line items not specified | Line items carry `item_id` (null for service lines); invoice lines also carry `discount` | Needed to tie stock movements and POs to lines. |
| D7 | GST rates not specified | Rates used: **0, 5, 18** | — |
| D8 | Expense categories not specified | **No `salaries` expense category** | Payroll is covered by `nova_payroll_runs` (§1 Salaries); a category would double-count it. |
| D9 | `resource` = API resource name (§7) | A14 ground-truth rows use `resource = 'payments'` | A14 points at receipts. |
| D10 | Not in contract | **PO approval limit ₹1,00,000** (chosen in `006`); `007` uses the same limit | A7 splits sit just under it. |
| D11 | 190 GRNs, A9 at 5% of bills (§5, §6) | 157–204 GRNs per slice; 49–64 bills per slice are PO-backed (≈ 40% of bill lines are services); A9 = 10 + 2 decoys, ≈ 18% of PO-backed bills | Services have no PO/GRN, so fewer bills are PO-backed and A9 is a larger share of them. |
| D12 | Volumes in §4 | Payments 274–307, bills 190–209, stock movements 689–764 per slice | Derived from documents, so counts vary by slice. |
