# Nova sandbox: Finathon data coverage

**For:** Teja (product owner) · **Updated:** 2026-09-29 · **Status:** Tier 0 and Tier 1 are **live**; Tier 2 and Tier 3 are not built
**Inputs:** `Finathon_Problem_Statements.xlsx` (54 statements, not committed), the resource registry in `src/lib/nova/resources*.ts` (source of truth for what the API serves), and read-only queries against the Nova DB on 2026-09-29.

All Nova data is **generated seed data** for a fictional company per team. None of it is real.

---

## 1. Verdict

The Tier 0 + Tier 1 seed is live on the Nova DB: **80 team slices, 211 MB, `as_of_date` frozen at 2026-09-29**. The API serves **24 top-level resources and 6 child routes**, and **20 anomaly codes** are planted with ground truth.

| Status | Count | IDs |
|---|---|---|
| ✅ Covered: every entity the statement needs is live | **27** | FIN-02, 03, 04, 05, 06, 07, 08, 09, 10, 15, 16, 17, 18, 19, 25, 27, 30, 31, 32, 33, 34, 36, 38, 40, 41, 43, 45 |
| 🟡 Partial: the core data is live, some modules have nothing to run on | **12** | FIN-01, 11, 12, 20, 22, 24, 26, 29, 37, 39, 42, 44 |
| ❌ Missing: the data the statement is *about* does not exist | **15** | CRM-01–04, HRM-01–05, FIN-13, 14, 21, 23, 28, 35 |

Before Tier 0/1 the count was 3 / 19 / 32.

**Why 27 and not 29.** `Nova_Dataset_Overview.pdf` counts 29 supported, which is the old plan's Tier 1 target (Tier 0's 4 plus Tier 1's 25). Re-checking each statement's needs against the live registry drops two:

- **FIN-22** (spend control & budget enforcement): budgets have no `utilities`, `meals` or `other` lines, but about 95 of each team's 300 expenses fall in those categories. A third of spend cannot be checked against a budget. A cheap fix, listed in §5.1.
- **FIN-44** (policy compliance engine): its needs list names `expense-claims` and `spend-policies`, both Tier 2. Without a policy table, "compliance" means rules each team invents.

The other 27 match the PDF.

**What still blocks the most statements:**

1. **No HR or CRM layer** (9 statements). Only `employees` and `departments` exist; no skills, projects, timesheets, leads or opportunities.
2. **No payment-gateway layer** (FIN-11, 12, 13, 14, 26). No channels, attempts, gateway transactions or settlements.
3. **No ledger** (FIN-28, 29). No chart of accounts or journal entries.
4. **No employee spend records** (FIN-21, 23, 24, 44). No expense claims, cards, subscriptions or policies.
5. **No debt** (FIN-20, 37, 39). No loans or loan schedules; EMIs appear only as bank-statement lines.

**Known seed gaps in what is live:**

- **A2 (ghost vendor) has no decoys.** Every vendor that matches the pattern is guilty, so a team can score perfectly with a naive rule.
- **Budgets miss three expense categories** (`utilities`, `meals`, `other`), as above.
- **Volumes are about half the old proposal** (e.g. 300 invoices per team, not 600; 30 clients, not 60; 60 employees, not 120). Fine for every covered statement; FIN-38/40 concentration work has 30 clients, not 4.

---

## 2. Coverage matrix

**Key:** *Needs* lists entities by resource name. **Bold** means the entity is **not built** yet. Plain means it is live. *Still missing* is empty when the statement is covered.

| ID | Title | Needs | Now | Still missing |
|---|---|---|---|---|
| CRM-01 | Churn, revenue risk & CRM fraud | clients, invoices, payments, employees, **leads, contacts, opportunities, deal-stage-changes, activities, engagement-events, support-tickets** | ❌ | Whole CRM layer (Tier 3a); A25, A26 plants |
| CRM-02 | Lead-to-deal intelligence | employees, **leads, activities, engagement-events, opportunities, deal-stage-changes** | ❌ | Lead stream, event timeline, fake/duplicate leads (Tier 3a) |
| CRM-03 | Revenue forecasting under uncertainty | invoices, payments, employees, **opportunities, deal-stage-changes, forecast-submissions** | ❌ | Won/lost history, close-date changes, rep commits (Tier 3a) |
| CRM-04 | Customer 360 digital twin | clients, invoices, payments, **contacts, activities, support-tickets, engagement-events, opportunities, source-records** | ❌ | CRM layer (3a) plus multi-system identity variants (2) |
| HRM-01 | Workforce capacity & hiring | employees, departments, **skills, employee-skills, projects, project-assignments, timesheets, leave-records** | ❌ | Skills, projects, time and leave (Tier 3b) |
| HRM-02 | Flight risk & retention | employees, **employee-events, timesheets, leave-records, survey-responses, training-records, project-assignments** | ❌ | Employee history, surveys, resignation labels (Tier 3b) |
| HRM-03 | Skill graph & talent marketplace | employees, **skills, employee-skills, projects, project-assignments, training-records, feedback** | ❌ | Skill taxonomy, project descriptions (Tier 3b) |
| HRM-04 | Scheduling under constraints | employees (+hourly_cost_rate), **skills, employee-skills, shift-requirements, schedule-preferences, leave-records, projects** | ❌ | Shifts, staffing minimums, preferences (Tier 3b) |
| HRM-05 | Performance & promotion intelligence | employees, **performance-reviews, feedback, training-records, project-assignments, leave-records** | ❌ | Reviews, goals, peer feedback (Tier 3b) |
| FIN-01 | Procurement decision & sourcing | vendors, purchase-bills, purchase-orders, goods-receipts, vendor-contracts, **purchase-requisitions, supplier-quotes** | 🟡 | Several quotes per requirement with logistics/MOQ/terms |
| FIN-02 | Supplier allocation planning | stock-movements, vendor-contracts (capacity, MOQ, tiers), goods-receipts | ✅ | |
| FIN-03 | Supplier risk & dependency | vendors, purchase-bills, purchase-orders, goods-receipts, inventory (+single_source) | ✅ | |
| FIN-04 | Spend leakage detection | purchase-bills, inventory, purchase-orders, vendor-contracts | ✅ | (Urgent-buy detection would use purchase-requisitions) |
| FIN-05 | Procurement-to-budget impact | purchase-bills, budgets (+committed), departments, purchase-orders | ✅ | |
| FIN-06 | End-to-end AP control | purchase-bills, vendors, purchase-orders, goods-receipts, vendor-contracts, approvals, employees | ✅ | |
| FIN-07 | Vendor payment prioritisation | purchase-bills, vendors (+terms, criticality), bank-accounts | ✅ | |
| FIN-08 | AP cash optimisation | purchase-bills, vendors (+discount, penalty), bank-accounts, bank-transactions | ✅ | |
| FIN-09 | Vendor invoice disputes | purchase-bills, purchase-orders, goods-receipts | ✅ | (No vendor-communication text) |
| FIN-10 | AP fraud & duplicate obligations | vendors, purchase-bills, purchase-orders, goods-receipts, vendor-payments, vendor-bank-accounts, master-data-changes, employees, approvals | ✅ | |
| FIN-11 | Payment reconciliation & settlement | payments, bank-accounts, bank-transactions, **gateway-transactions, settlements** | 🟡 | Gateway and settlement records; bank-to-receipt matching works today |
| FIN-12 | Payment failure recovery | vendor-payments (+status), **payment-attempts** | 🟡 | Failure codes and retry chains; only ~2 failed payouts per team today |
| FIN-13 | Payment routing & cost optimisation | **payment-channels, payment-attempts** | ❌ | Channel fee models, limits, settlement times |
| FIN-14 | Merchant settlement leakage | **gateway-transactions, settlements, payment-channels** | ❌ | Whole gateway layer; A11 plant |
| FIN-15 | Payment risk & transaction control | vendor-payments (+initiated_at), vendor-bank-accounts, employees, approvals | ✅ | |
| FIN-16 | Multi-bank cash position | invoices, purchase-bills, bank-accounts, bank-transactions, payroll-runs, statutory-dues | ✅ | |
| FIN-17 | Cash-flow forecasting & stress test | invoices, payments, purchase-bills, expenses, bank-transactions, payroll-runs, statutory-dues | ✅ | |
| FIN-18 | Inter-bank fund movement planner | bank-accounts (+min_balance, daily_transfer_limit), bank-transactions, payroll-runs | ✅ | |
| FIN-19 | Bank transaction intelligence | bank-accounts (4 statement formats), bank-transactions | ✅ | |
| FIN-20 | Cash commitment & obligations | purchase-bills, invoices, bank-accounts, payroll-runs, statutory-dues, purchase-orders, **loans, loan-schedules, subscriptions** | 🟡 | EMI and subscription calendars |
| FIN-21 | Expense verification & reimbursement | employees, approvals, **expense-claims, spend-policies, leave-records** | ❌ | Claims with receipt metadata; A15 plant |
| FIN-22 | Spend control & budget enforcement | expenses (+dept), departments, budgets, purchase-orders, employees | 🟡 | Budget lines for utilities, meals, other |
| FIN-23 | Corporate card controls | employees, **corporate-cards, card-transactions, spend-policies** | ❌ | Cards, limits, MCC data; A16 plant |
| FIN-24 | Recurring expense & subscriptions | expenses (+recurring), departments, **subscriptions, card-transactions** | 🟡 | Seats, renewal dates; A17 plant |
| FIN-25 | Employee & department spend | expenses (+employee, dept), employees, departments, budgets | ✅ | |
| FIN-26 | Multi-source reconciliation | payments, invoices, bank-transactions, **gateway-transactions, settlements, source-records** | 🟡 | The same event recorded in several sources |
| FIN-27 | Financial master data management | clients, vendors, inventory, vendor-bank-accounts, master-data-changes | ✅ | (source-records would add cross-system variants) |
| FIN-28 | Period close & exceptions | bank-transactions, approvals, **journal-entries, chart-of-accounts** | ❌ | Ledger and adjustments; A19 plant |
| FIN-29 | Classification & ledger integrity | expenses, purchase-bills, invoices, **chart-of-accounts, journal-entries** | 🟡 | Chart of accounts, journals with planted errors |
| FIN-30 | Management reporting | invoices, purchase-bills, expenses, bank-transactions, business-units, budgets | ✅ | (Budget-vs-actual has the same 3-category hole as FIN-22) |
| FIN-31 | SME financial control tower | all books, bank-accounts, bank-transactions, budgets | ✅ | |
| FIN-32 | Scenario & decision simulator | all books, bank-accounts, payroll-runs | ✅ | |
| FIN-33 | Business-unit performance | invoices, expenses (+BU), business-units, departments | ✅ | |
| FIN-34 | Product & customer profitability | invoices (+discount), inventory, expenses (+client), credit-notes | ✅ | |
| FIN-35 | Data integration & normalisation | **source-records** | ❌ | Heterogeneous exports of the same books |
| FIN-36 | Working capital optimisation | invoices, purchase-bills, inventory, stock-movements, payments, bank-accounts | ✅ | |
| FIN-37 | Credit assessment & profile | books, bank-transactions, **loans, loan-schedules** | 🟡 | Existing debt and repayment record |
| FIN-38 | Invoice financing simulator | invoices, payments, clients | ✅ | |
| FIN-39 | Loan repayment & cash planning | books, bank-accounts, payroll-runs, statutory-dues, **loans, loan-schedules** | 🟡 | Loan schedules |
| FIN-40 | Dynamic B2B credit limits | clients (+credit_limit), invoices, payments | ✅ | |
| FIN-41 | Transaction anomaly investigation | all transactions, vendor-payments, bank-transactions | ✅ | |
| FIN-42 | Approval & segregation of duties | employees, approvals, master-data-changes, **roles, user-role-assignments** | 🟡 | Roles and permissions; A20's creator-approves variants work today |
| FIN-43 | Vendor master integrity | vendors, vendor-bank-accounts, master-data-changes, vendor-payments, employees | ✅ | |
| FIN-44 | Policy compliance engine | expenses, purchase-bills, employees, departments, approvals, **expense-claims, spend-policies** | 🟡 | A reference policy table and claims; A28 (s.269ST) works today |
| FIN-45 | Connected financial risk graph | clients, vendors, invoices, employees, vendor-bank-accounts, vendor-payments, approvals, credit-notes | ✅ | |

---

## 3. Live resources (Tier 0 + Tier 1)

**Design rule:** one slice is one fictional company with its own staff, banks, suppliers and customers. Every row carries `slice_no`, which the API pins server-side and never returns. Rows per team are live counts from 2026-09-29 (total ÷ 80, rounded down).

| Resource | Rows per team | Tier | Notable fields (beyond the original shape) |
|---|---|---|---|
| clients | 30 | 0 | segment, industry, region, credit_limit, payment_terms_days, account_owner_id, business_unit_id, pan |
| vendors | 21 | 0 | category, criticality, payment_terms_days, early_pay_discount_pct, late_penalty_pct_per_month, pan, created_by, status |
| invoices | 300 | 0 | business_unit_id, sales_rep_id, discount_amount |
| quotations | 75 | 0 | sales_rep_id |
| payments | 292 | 0 | bank_transaction_id, tds_deducted, allocations |
| purchase-bills | 199 | 0 | po_id, grn_id, submitted_by, approval_status, received_date |
| expenses | 300 | 0 | employee_id, department_id, business_unit_id, client_id, recurring |
| inventory | 30 | 0 | primary_vendor_id, lead_time_days, single_source |
| stock-movements (child of inventory) | 729 | 0 | warehouse, unit_cost |
| business-units | 4 | 1 | type (branch, product_line), city |
| departments | 8 | 1 | cost_center, head_employee_id, business_unit_id |
| employees | 60 | 1 | manager_id, grade, pay_band, hourly_cost_rate, work_hours_per_week, bank_fingerprint |
| bank-accounts | 5 | 1 | purpose, min_balance, daily_transfer_limit, statement_format (hdfc, icici, sbi, axis) |
| bank-transactions | 1,361 | 1 | raw_narration, counterparty_text, bank_ref, running_balance |
| payroll-runs | 96 | 1 | per department per month; pf, esi, tds |
| statutory-dues | 55 | 1 | gstr3b, tds, pf, esi, advance_tax; paid_date, interest_paid |
| budgets | 300 | 1 | department × category × month; committed, remaining |
| vendor-contracts | 15 | 1 | contract_price, volume_tiers, monthly_capacity, moq, lead_time_days |
| purchase-orders | 175 | 1 | channel (catalog, off-contract), raised_by, promised_date |
| goods-receipts | 179 | 1 | items with qty received and rejected |
| vendor-bank-accounts | 32 | 1 | account_fingerprint, valid_from/to, verified |
| vendor-payments | 210 | 1 | bill_ids, beneficiary_account_id, channel, status (success, failed, reversed) |
| approvals | 1,028 | 1 | doc_type, level, action, threshold_applied |
| master-data-changes | 123 | 1 | field, old/new value, changed_by, approved_by |
| credit-notes | 20 | 1 | reason, approved_by |

About **5,650 rows per team, ~452k rows** in all. Tier 0 also delivered valid GSTIN checksums (so A6 is a real signal), the admin-only `nova_ground_truth` table, and the frozen `as_of_date`.

**Child routes (6):** `invoices/{id}/payments`, `inventory/{id}/movements`, `vendors/{id}/vendor-bank-accounts`, `departments/{id}/employees`, `bank-accounts/{id}/bank-transactions`, `purchase-orders/{id}/goods-receipts`.

---

## 4. Planted anomalies catalogue

**Rule:** every planted row, and every decoy, is recorded in the admin-only `nova_ground_truth` table (slice, anomaly code, resource, record IDs, group ID, difficulty, `is_decoy`, note). No team route reads it. A **decoy** looks anomalous but has a legitimate explanation, so detectors must tell the two apart.

Counts are ground-truth rows per team (every one of the 80 slices has every live code). A multi-record pattern can take several rows, so "planted" counts rows, not incidents.

### 4.1 Live (20 codes)

| # | Anomaly (as generated) | Resources | Planted / team | Decoys / team | Tests |
|---|---|---|---|---|---|
| A1 | Duplicate vendor bill (exact and near) | purchase-bills | 6 | 1 | FIN-06, 10, 26, 44 |
| A2 | Ghost vendor: created, billed and paid by one employee; no GSTIN, PO or GRN | vendors, purchase-bills, vendor-payments, vendor-bank-accounts, master-data-changes | 5 | **0** | FIN-10, 42, 43, 45 |
| A3 | Bank-detail change, paid within days by the changer, then reverted | vendor-bank-accounts, master-data-changes, vendor-payments | 6 | 3 | FIN-10, 43, 45 |
| A4 | Shared bank account (two vendors, or vendor and employee) | vendor-bank-accounts, vendors, employees, vendor-payments | 7 | 1 | FIN-10, 43, 45 |
| A5 | Duplicate client/vendor master (same PAN and GSTIN, name keyed differently) | clients, vendors | 4 | 1 | FIN-04, 27, 43 |
| A6 | Invalid identifiers (GSTIN checksum fails) | clients, vendors | 4 | 1 | FIN-27, 43 |
| A7 | Split POs just under the ₹1,00,000 approval limit within 48 h | purchase-orders, approvals, purchase-bills, vendor-payments | 5 | 1 | FIN-15, 22, 41, 44, 45 |
| A8 | Price leakage: above contract or off-contract vendor | purchase-orders | 6 | 2 | FIN-01, 04 |
| A9 | Three-way match failure (rate, GST, qty vs PO/GRN) | purchase-bills | 10 | 2 | FIN-06, 09 |
| A10 | Supplier deterioration: delay and rejection trend up over 4 months | goods-receipts | 2 | 1 | FIN-01, 02, 03 |
| A12 | Bill paid twice by two different employees | purchase-bills, vendor-payments | 4 | 1.8 | FIN-10, 12, 15 |
| A13 | Bank statement noise: duplicate import, unlabelled internal transfers, unexplained charges | bank-transactions | 75 | 1 | FIN-16, 19, 26 |
| A14 | Unmatched and partial receipts (non-customer credit, unapplied, TDS short-pay) | payments, bank-transactions | 15 | 2 | FIN-11, 26, 28 |
| A18 | Budget overrun trajectory (85% used by month 9) | budgets | 2 | 1 | FIN-05, 22, 30 |
| A20 | Approval control failures (below-limit approver, creator approves) | approvals, purchase-orders, vendor-payments | 12 | 1 | FIN-06, 42, 44, 45 |
| A21 | Circular money flow via a vendor account in a client's name | vendors, clients, vendor-payments, payments, purchase-orders, vendor-bank-accounts | 5 | 2 | FIN-41, 45 |
| A22 | Refund cluster approved by the customer's own account owner | credit-notes, clients | 2 | 2 | FIN-41, 45 |
| A23 | Liquidity squeeze: payroll, EMI and late GSTR-3B in one week | bank-transactions, statutory-dues | 2 | 1 | FIN-16, 17, 18, 20, 39 |
| A24 | Credit deterioration and concentration (25%+ of AR, over limit) | clients | 1 | 1 | FIN-36, 38, 40 |
| A28 | Cash receipt of ₹2 lakh+ from one person (s.269ST) — **new code, not in the original plan** | payments, expenses | 5.5 | 2 | FIN-41, 44 |

Two live codes are narrower than originally planned: **A12** covers double payment only (the payment-attempt variants wait for Tier 2), and **A23** reads the EMI from bank lines because `loan-schedules` does not exist.

### 4.2 Not built (8 codes)

| # | Anomaly | Needs | Tier |
|---|---|---|---|
| A11 | Settlement leakage (fee above MDR, short or missing settlement, chargeback not reversed) | gateway-transactions, settlements | 2 |
| A15 | Expense-claim abuse (duplicate receipt, leave-day claim, over limit) | expense-claims, leave-records | 2 |
| A16 | Card misuse (blocked MCC, 1–4am spend, just-under-limit) | card-transactions | 2 |
| A17 | Duplicate or zombie subscriptions | subscriptions | 2 |
| A19 | Ledger errors (unbalanced, capex as opex, closed period) | journal-entries | 2 |
| A25 | CRM manipulation (fake leads, stage jumps, bulk calls, collusion) | CRM pack | 3a |
| A26 | Churn trajectories with temporary-dip decoys | CRM pack | 3a |
| A27 | HR patterns (multi-signal resigners, lenient/strict raters, skill gap, infeasible roster) | HRM pack | 3b |

---

## 5. Build tiers

### 5.1 Done

| Tier | What shipped | Statements it moved to ✅ |
|---|---|---|
| **0: Fix what exists** | Resized and extended the 9 original resources; valid GSTIN checksums; ground-truth table; A1, A5, A6, A14, A24, A28 with decoys; frozen `as_of_date` | FIN-36, 38, 40 (already shape-covered, now meaningful) and FIN-41 |
| **1: Finance spine** | 16 resources: business-units, departments, employees, bank-accounts, bank-transactions, payroll-runs, statutory-dues, budgets, vendor-contracts, purchase-orders, goods-receipts, vendor-bank-accounts, vendor-payments, approvals, master-data-changes, credit-notes; A2–A4, A7–A10, A12, A13, A18, A20–A23 | 23 more: FIN-02–10, 15–19, 25, 27, 30–34, 43, 45 |

**Tier 1 follow-ups** (small, no new resources, worth doing before Tier 2):

| Fix | Effort | Effect |
|---|---|---|
| Add `utilities`, `meals`, `other` budget lines per department | ~70 budget rows per team | FIN-22 🟡 → ✅; closes the FIN-30 caveat |
| Add A2 decoys (e.g. a new vendor created and paid by one employee, but with a GSTIN, a PO and a second approver) | 1–2 decoys per team | A2 can no longer be solved by a naive rule |

### 5.2 Remaining

Per-team volumes below are scaled to match the live seed (roughly half the original proposal). **Global** tables are shared reference data, stored once.

**Tier 2: Finance completion** — 18 resources plus `leave-records` pulled forward from 3b (FIN-21 needs it for leave-day claims). Grouped into packs so each can be started on its own:

| Pack | Entities (rows per team) | Plants | Statements → ✅ |
|---|---|---|---|
| **2a Payments & settlement** | payment-channels (6, global), payment-attempts (600), gateway-transactions (1,000), settlements (125) | A11; A12 attempt variants (failed-but-booked, both retries succeed) | FIN-11, 12 (🟡), 13, 14 (❌); FIN-26 once 2e lands |
| **2b Spend & cards** | expense-claims (400), spend-policies (40, global), corporate-cards (20), card-transactions (1,000), subscriptions (25), leave-records (300) | A15, A16, A17; A7 claim/card splits | FIN-21, 23 (❌); FIN-24, 44 (🟡) |
| **2c Ledger** | chart-of-accounts (80, global), journal-entries (1,250) | A19 | FIN-28 (❌); FIN-29 (🟡) |
| **2d Debt** | loans (3), loan-schedules (60) | one missed EMI; A23 reads EMI from schedules | FIN-37, 39 (🟡); FIN-20 with 2b's subscriptions |
| **2e Sourcing, roles, integration** | purchase-requisitions (20), supplier-quotes (75), roles (10), user-role-assignments (30), source-records (750) | lowest-price-loses-on-total-cost; toxic role combos; name/format drift across systems | FIN-01, 42 (🟡); FIN-35 (❌); FIN-26 with 2a |

Tier 2 total: **~5,700 rows per team, ~450k rows**, about the size of today's seed, so expect roughly another 200 MB (journal lines and source payloads are JSON-heavy). Result: **all 45 FIN statements covered** (with the FIN-22 follow-up).

**Tier 3: CRM and HRM packs** — both depend on `employees`, which is live.

| Pack | Entities (rows per team) | Plants | Statements → ✅ |
|---|---|---|---|
| **3a CRM** | leads (400), contacts (90), opportunities (150), deal-stage-changes (600), activities (1,500), engagement-events (1,500), support-tickets (250), forecast-submissions (60) | A25, A26 | CRM-01, 02, 03 (❌); CRM-04 also needs 2e's source-records |
| **3b HRM** | skills (80, global), employee-skills (350), projects (15), project-assignments (125), timesheets (1,500), employee-events (250), survey-responses (240), training-records (225), performance-reviews (120), feedback (400), shift-requirements (170), schedule-preferences (120) | A27 | HRM-01–05 (❌) |

Tier 3 total: **~8,000 rows per team, ~650k rows**. 3a is ~4,550 per team; 3b is ~3,500.

**Cumulative outcome:**

| After | Covered | Partial | Missing |
|---|---|---|---|
| Today | 27 | 12 | 15 |
| Tier 1 follow-ups | 28 | 11 | 15 |
| Tier 2 (all packs) | 45 | 0 | 9 |
| Tier 3a | 49 | 0 | 5 |
| Tier 3b | 54 | 0 | 0 |

**Recommendation:** do the Tier 1 follow-ups first (hours, not days). Then Tier 2 in the order **2b, 2a, 2e, 2c, 2d**: 2b and 2a each unlock four statements, 2d only finishes three partials. Pull 3a or 3b ahead of the Tier 2 tail if registrations show more CRM or HRM teams than FIN-11–14 or FIN-28–29 teams. Before Tier 3, check the Supabase plan's database size limit: 211 MB today plus ~200 MB (Tier 2) and ~250 MB (Tier 3) is roughly 650–700 MB.

---

## 6. Open questions for the product owner

Resolved: **frozen clock** (`as_of_date` = 2026-09-29) and **salary data** (employees carry `pay_band` and `hourly_cost_rate`; payroll is per department).

1. **Free text** (blocks Tier 3 quality). CRM-01/04 want sentiment in emails, calls and tickets; HRM-03/05 want feedback and project descriptions. *Recommend: short templated text from sentiment-tagged phrase banks.*
2. **"Real-time" on a read-only API.** CRM-02, CRM-04 and FIN-15 imply a stream. *Recommend: teams replay history in time order, plus a `?since=` cursor.*
3. **Protected attributes.** HRM-02 says avoid them in risk scoring. Include gender and age so teams can prove they avoid them, or omit them?
4. **Multiple formats.** FIN-19, 26 and 35 want statements in different formats. Is a per-source JSON payload with its own field names enough, or are CSV/statement downloads expected?
5. **Receipts.** FIN-06 and FIN-21 mention uploads. Is receipt metadata enough, or are images/PDFs expected?
6. **Ground-truth access for teams.** One labelled practice slice for training? How will judges score detection, and in what submission format?
7. **Statement demand.** Which statements have teams picked? Tier 2 pack order should follow registrations.
