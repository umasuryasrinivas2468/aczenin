# Nova sandbox: Finathon data coverage plan

**For:** Teja (product owner) · **Date:** 2026-09-29 · **Status:** planning, nothing built yet
**Inputs:** `Finathon_Problem_Statements.xlsx` (54 statements), `supabase/nova/001_schema.sql`, `004_team_slices.sql`, `002_seed.sql` (the per-slice version in the working tree on 2026-09-29).

---

## 1. Verdict

Today's Nova has the right *shape* for simple AR/AP analytics and not much more. It is also **far too thin per team**: each slice holds 4 clients, 2 vendors, 5 items, 30 invoices, 8 quotations, about 22 payments, 15 bills, 20 expenses and 40 stock movements. That is roughly 146 rows per team.

| Status | Count | IDs |
|---|---|---|
| ✅ Covered (shape only; volume is still too thin) | **3** | FIN-36, FIN-38, FIN-40 |
| 🟡 Partial: the core data exists, some modules have nothing to run on | **19** | FIN-03, 04, 05, 07, 08, 09, 17, 20, 24, 27, 29, 30, 31, 32, 34, 37, 39, 41, 44 |
| ❌ Missing: the data the statement is *about* does not exist | **32** | CRM-01–04, HRM-01–05, FIN-01, 02, 06, 10, 11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 28, 33, 35, 42, 43, 45 |

Five gaps block the most statements:

1. **No planted anomalies anywhere.** 17 statements are detection problems (fraud, duplicates, fake leads, leakage). Clean data makes them unwinnable, and there is no ground truth to judge them against.
2. **No people.** There are no employees, departments or approvers, which blocks all of HRM and CRM plus 12 FIN statements (spend, approvals, segregation of duties, fraud).
3. **No bank.** There are no bank accounts or statement lines, which blocks all of treasury (FIN-16–20) and reconciliation (FIN-11, 14, 26, 28).
4. **No outgoing payments.** Bills carry a `paid_amount`, but no vendor-payment record exists (the seed says so itself), so AP fraud and payment-failure work has nothing to read.
5. **No procurement documents.** There are no POs, goods receipts, supplier quotes or contracts, so three-way match, sourcing and supplier-performance work is blocked.

Three data-quality traps to fix before planting anything:

- **GSTINs fail a strict validator.** The seed builds format-valid GSTINs without the real mod-36 check character, so an identifier validator (FIN-27, FIN-43) would flag *every* record. Compute the real checksum, then plant the invalid ones deliberately.
- **Vendors store only `bank_account_last4`.** You cannot detect shared bank accounts from four digits. Add a stable account fingerprint alongside it.
- **Dates are offsets from `current_date` and `overdue` is derived live.** Labels such as "this invoice is overdue" or "liquidity gap next week" drift while the hackathon runs. Freeze an `as_of_date` for the event (see open questions).

---

## 2. Coverage matrix

**Key:** *Needs* lists entities by the resource names used in §3. **Bold** means the entity is new. Plain means it already exists.

| ID | Title | Needs | Today | Missing pieces |
|---|---|---|---|---|
| CRM-01 | Churn, revenue risk & CRM fraud | clients, invoices, payments, **leads, contacts, opportunities, deal-stage-changes, activities, engagement-events, support-tickets, employees** | ❌ | Whole CRM layer; planted fake leads, stage jumps, bulk activities, collusion; churn labels |
| CRM-02 | Lead-to-deal intelligence | **leads, activities, engagement-events, opportunities, deal-stage-changes, employees** | ❌ | Lead stream, event timeline, rep territory/skills, fake/duplicate leads |
| CRM-03 | Revenue forecasting under uncertainty | payments, invoices, **opportunities, deal-stage-changes, forecast-submissions, employees** | ❌ | Won/lost history, close-date changes, rep commit history |
| CRM-04 | Customer 360 digital twin | clients, invoices, payments, **contacts, activities, support-tickets, engagement-events, opportunities, source-records** | ❌ | Multi-system identity variants, event stream, sentiment text |
| HRM-01 | Workforce capacity & hiring | **employees, departments, skills, employee-skills, projects, project-assignments, timesheets, leave-records** | ❌ | All HR data; upcoming-project pipeline with skill demand |
| HRM-02 | Flight risk & retention | **employees, employee-events, timesheets, leave-records, survey-responses, training-records, project-assignments** | ❌ | Promotion/pay/manager history, surveys, past resignations as labels |
| HRM-03 | Skill graph & talent marketplace | **skills, employee-skills, projects, project-assignments, training-records, feedback** | ❌ | Skill taxonomy with synonyms, project descriptions, certifications |
| HRM-04 | Scheduling under constraints | **employees, skills, employee-skills, shift-requirements, schedule-preferences, leave-records, projects** | ❌ | Shift templates, staffing minimums, preferences, cost rates, a planted infeasible week |
| HRM-05 | Performance & promotion intelligence | **performance-reviews, feedback, training-records, project-assignments, leave-records, employees** | ❌ | Goals, ratings by manager, peer feedback; planted lenient/strict raters |
| FIN-01 | Procurement decision & sourcing | vendors, purchase-bills, **purchase-requisitions, supplier-quotes, purchase-orders, goods-receipts** | ❌ | Several quotes per requirement, logistics/MOQ/terms, delivery and rejection history |
| FIN-02 | Supplier allocation planning | stock-movements, **vendor-contracts, goods-receipts** | ❌ | Capacity, MOQ, lead time, volume tiers; only 2 vendors per slice today |
| FIN-03 | Supplier risk & dependency | vendors, purchase-bills, **purchase-orders, goods-receipts** | 🟡 | Delivery delays, rejections; enough vendors to show concentration |
| FIN-04 | Spend leakage detection | purchase-bills, inventory, **purchase-orders, vendor-contracts** | 🟡 | Negotiated prices, duplicate suppliers, off-contract and urgent buys (planted) |
| FIN-05 | Procurement-to-budget impact | purchase-bills, **budgets, departments, purchase-orders** | 🟡 | Department budgets, open commitments |
| FIN-06 | End-to-end AP control | purchase-bills, vendors, **purchase-orders, goods-receipts, vendor-contracts, approvals, employees** | ❌ | 3-way match data, duplicate bills, approval thresholds |
| FIN-07 | Vendor payment prioritisation | purchase-bills, vendors (+terms, criticality), **bank-accounts** | 🟡 | Cash position, discount and penalty terms, supplier criticality |
| FIN-08 | AP cash optimisation | purchase-bills, vendors (+terms), **bank-accounts, bank-transactions** | 🟡 | Available cash, early-pay discount and late-penalty terms |
| FIN-09 | Vendor invoice disputes | purchase-bills, **purchase-orders, goods-receipts** | 🟡 | PO and receipt evidence behind disputed bills; planted qty/price/tax mismatches |
| FIN-10 | AP fraud & duplicate obligations | vendors, purchase-bills, **purchase-orders, goods-receipts, vendor-payments, vendor-bank-accounts, master-data-changes, employees, approvals** | ❌ | Ghost vendors, duplicate bills, bank-detail changes, payment history |
| FIN-11 | Payment reconciliation & settlement | payments, **gateway-transactions, settlements, bank-accounts, bank-transactions** | ❌ | Gateway and bank records with different IDs, fees, refunds |
| FIN-12 | Payment failure recovery | **payment-attempts, vendor-payments** | ❌ | Failure codes, retries, reversals, planted duplicate successes |
| FIN-13 | Payment routing & cost optimisation | **payment-channels, payment-attempts** | ❌ | Channel fee models, limits, settlement times, failure history |
| FIN-14 | Merchant settlement leakage | **gateway-transactions, settlements, payment-channels** | ❌ | Contracted MDR vs charged fee, short/missing settlements, chargebacks |
| FIN-15 | Payment risk & transaction control | **vendor-payments, vendor-bank-accounts, employees, approvals** | ❌ | Outgoing payments with beneficiary history and timing |
| FIN-16 | Multi-bank cash position | invoices, purchase-bills, **bank-accounts, bank-transactions, payroll-runs, statutory-dues** | ❌ | Accounts with purposes, balances, internal transfers |
| FIN-17 | Cash-flow forecasting & stress test | invoices, payments, purchase-bills, expenses, **bank-transactions, payroll-runs, statutory-dues** | 🟡 | Actual cash history, payroll and tax calendar |
| FIN-18 | Inter-bank fund movement planner | **bank-accounts, bank-transactions, payroll-runs** | ❌ | Minimum balances, transfer limits, per-account obligations |
| FIN-19 | Bank transaction intelligence | **bank-accounts, bank-transactions** | ❌ | Raw narrations in several bank formats, planted duplicates |
| FIN-20 | Cash commitment & obligations | purchase-bills, invoices, **bank-accounts, payroll-runs, statutory-dues, loans, loan-schedules, purchase-orders, subscriptions** | 🟡 | Balances, payroll, tax, EMI and subscription calendars |
| FIN-21 | Expense verification & reimbursement | **employees, expense-claims, spend-policies, approvals, leave-records** | ❌ | Employee claims with receipt metadata; planted duplicate and over-limit claims |
| FIN-22 | Spend control & budget enforcement | expenses (+dept), **departments, budgets, purchase-orders, employees** | ❌ | Budgets, committed spend, department tags |
| FIN-23 | Corporate card controls | **employees, corporate-cards, card-transactions, spend-policies** | ❌ | Cards, limits, MCC and merchant data, declines |
| FIN-24 | Recurring expense & subscriptions | expenses, **subscriptions, card-transactions, departments** | 🟡 | Seat/usage data, renewal dates; planted duplicate subscriptions |
| FIN-25 | Employee & department spend | expenses (+employee, dept), **employees, departments, budgets** | ❌ | Who spent it, and in which department |
| FIN-26 | Multi-source reconciliation | payments, invoices, **bank-transactions, gateway-transactions, settlements, source-records** | ❌ | The same event recorded differently in several sources |
| FIN-27 | Financial master data management | clients, vendors, inventory, **vendor-bank-accounts, master-data-changes, source-records** | 🟡 | Planted duplicates and conflicts, bank master, change history, valid GSTIN checksums |
| FIN-28 | Period close & exceptions | **journal-entries, chart-of-accounts, bank-transactions, approvals** | ❌ | Ledger, bank recon state, adjustments |
| FIN-29 | Classification & ledger integrity | expenses, bills, invoices, **chart-of-accounts, journal-entries** | 🟡 | Chart of accounts, journals with planted imbalances and misclassifications |
| FIN-30 | Management reporting | invoices, bills, expenses, **bank-transactions, business-units, budgets** | 🟡 | Cash, business-unit tags, budget vs actual |
| FIN-31 | SME financial control tower | all books, **bank-accounts, bank-transactions, budgets** | 🟡 | Cash and budgets |
| FIN-32 | Scenario & decision simulator | all books, **bank-accounts, payroll-runs** | 🟡 | Opening cash, headcount cost baseline |
| FIN-33 | Business-unit performance | invoices, expenses (+BU), **business-units, departments** | ❌ | Unit tags; shared costs to allocate |
| FIN-34 | Product & customer profitability | invoices, inventory, expenses (+client tag), **credit-notes** | 🟡 | Discounts and returns, customer-specific and logistics costs |
| FIN-35 | Data integration & normalisation | **source-records** | ❌ | Heterogeneous exports of the same books |
| FIN-36 | Working capital optimisation | invoices, bills, inventory, stock-movements, payments | ✅ | (Cash from bank-accounts would help; volume too thin) |
| FIN-37 | Credit assessment & profile | books, **bank-transactions, loans, loan-schedules** | 🟡 | Banking behaviour, existing debt |
| FIN-38 | Invoice financing simulator | invoices, payments, clients | ✅ | (4 clients per slice makes concentration trivial) |
| FIN-39 | Loan repayment & cash planning | books, **loans, loan-schedules, bank-accounts, payroll-runs, statutory-dues** | 🟡 | Loan schedules, other obligations |
| FIN-40 | Dynamic B2B credit limits | clients (+credit_limit), invoices, payments | ✅ | (A credit_limit field and more clients are needed for this to be meaningful) |
| FIN-41 | Transaction anomaly investigation | all transactions, **vendor-payments, bank-transactions** | 🟡 | Planted anomalies plus explainable decoys |
| FIN-42 | Approval & segregation of duties | **employees, roles, user-role-assignments, approvals, master-data-changes** | ❌ | Users, roles, permissions, approval history; planted SoD conflicts |
| FIN-43 | Vendor master integrity | vendors, **vendor-bank-accounts, master-data-changes, vendor-payments, employees** | ❌ | Change history, bank-change-then-pay, related vendors |
| FIN-44 | Policy compliance engine | expenses, bills, **employees, departments, approvals, expense-claims, spend-policies** | 🟡 | Department, approver and policy context for each transaction |
| FIN-45 | Connected financial risk graph | clients, vendors, invoices, **employees, vendor-bank-accounts, vendor-payments, approvals, credit-notes** | ❌ | Shared bank accounts and addresses, circular flows, splitting, refund clusters |

---

## 3. Proposed entity list

**Design rule:** one slice is one fictional company, with its own staff, banks, suppliers and customers. This matches 004's "coherent books" rule. Every new entity carries `slice_no`, except the four marked **global**, which are identical reference data for all teams.

**Types:** `text`, `int`, `money` (2-dp decimal), `date`, `datetime`, `bool`, `enum`, `json`, `list`.

### 3.0 Fields to add to the 9 existing resources, and new volumes

| Resource | Add fields | Rows per slice (now → proposed) |
|---|---|---|
| clients | segment enum, industry, region, credit_limit money, payment_terms_days int, account_owner_id → employees, business_unit_id | 4 → **60** |
| vendors | category, criticality enum, payment_terms_days, early_pay_discount_pct, late_penalty_pct_per_month, address, pan text, created_by → employees, status enum | 2 → **40** |
| invoices | business_unit_id, sales_rep_id → employees, discount_amount | 30 → **600** |
| quotations | sales_rep_id, opportunity_id → opportunities | 8 → **150** |
| payments | bank_transaction_id, tds_deducted money, allocations json (one receipt covering many invoices) | 22 → **550** |
| purchase-bills | po_id, grn_id, submitted_by, approval_status, received_date | 15 → **400** |
| expenses | employee_id, department_id, business_unit_id, client_id (customer-specific cost), recurring bool | 20 → **600** |
| inventory | primary_vendor_id, lead_time_days, single_source bool | 5 → **60** |
| stock-movements | warehouse, unit_cost | 40 → **1,500** |

### 3.1 Books & AR/AP

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **credit-notes** | number text, date, amount money, gst money, reason enum (return, discount, refund, price_diff), approved_by | → invoices, clients, employees | 40 | FIN-34, 41, 45 | refund cluster to one customer approved by one employee |

### 3.2 Procurement

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **purchase-requisitions** | number, department_id, items json (item, qty, need_by date), budget money, urgency enum, status | → departments, inventory | 40 | FIN-01, 05 | urgent buys that could have been planned |
| **supplier-quotes** | requisition_id, vendor_id, unit_price, logistics_cost, discount_pct, moq int, lead_time_days, payment_terms_days, valid_until, gst_rate | → requisitions, vendors | 150 | FIN-01, 02 | lowest price that loses on total cost |
| **vendor-contracts** | vendor_id, item_id, contract_price, volume_tiers json, monthly_capacity, moq, lead_time_days, valid_from/to | → vendors, inventory | 30 | FIN-02, 04, 06, 07, 08 | purchases above contract price |
| **purchase-orders** | number, vendor_id, department_id, items json, total money, order_date, promised_date, status, raised_by, channel enum (catalog, off-contract) | → vendors, departments, employees, requisitions | 350 | FIN-03, 04, 05, 06, 09, 10, 20, 22 | split POs, off-contract buys, price variance |
| **goods-receipts** | number, po_id, received_date, items json (qty_received, qty_rejected, reason) | → purchase-orders | 380 | FIN-01, 03, 06, 09, 10 | short receipts, rejection spike, late-delivery trend |

### 3.3 Banking & Treasury

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **bank-accounts** | bank, ifsc, account_last4, purpose enum (collections, payroll, vendor, branch, od), opening_balance, min_balance, daily_transfer_limit, statement_format enum | → business-units | 5 | FIN-07, 08, 16–20, 30, 31, 32, 36, 37, 39, 45 | account breaching minimum balance |
| **bank-transactions** | account_id, value_date, posted_date, debit/credit money, running_balance, raw_narration text (bank-specific format), counterparty_text, bank_ref, cheque_no | → bank-accounts; soft link to payments / vendor-payments (not exposed as a clean key) | 3,000 | FIN-08, 11, 16–20, 26, 28, 30, 31, 37, 41 | duplicate import, unlabelled internal transfers, messy narrations, unknown receipts |
| **payroll-runs** | month, department_id, gross, net, pf, esi, tds, pay_date, account_id | → departments, bank-accounts | 96 | FIN-16, 17, 18, 20, 32, 39 | a payroll plus GST plus EMI collision week |
| **statutory-dues** | type enum (gstr3b, tds, pf, esi, advance_tax), period, due_date, amount, paid_date | → bank-accounts | 60 | FIN-16, 17, 20, 39 | late GST payment with interest |

### 3.4 Payments & Settlement

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **vendor-payments** | number, bill_ids list, vendor_id, beneficiary_account_id, amount, channel, initiated_by, approved_by, initiated_at datetime, status enum (success, failed, reversed) | → purchase-bills, vendors, vendor-bank-accounts, employees | 450 | FIN-10, 12, 15, 41, 43, 44, 45 | duplicate payment, pay-after-bank-change, off-hours payouts, just-under-threshold splits |
| **payment-channels** (global) | name, fee_model json (flat, pct, slab), per_txn_limit, daily_limit, settlement_hours, hours_available, historic_failure_rate | none | 6 | FIN-13, 14 | none |
| **payment-attempts** | payment_ref (invoice/bill), channel_id, amount, attempt_no, status, failure_code enum, attempted_at, retry_of | → payment-channels, vendor-payments, payments | 1,200 | FIN-11, 12, 13 | failed but booked as paid; retry where both attempts succeed |
| **gateway-transactions** | order_id, gateway_txn_id, invoice_id, method, amount, fee, gst_on_fee, status, refund_amount, chargeback bool, created_at | → invoices, payment-channels | 2,000 | FIN-11, 14, 26 | fee above contracted MDR, refund deducted twice |
| **settlements** | settlement_id, utr, date, gross, fees, refunds, chargebacks, net, txn_ids list | → gateway-transactions, bank-transactions | 250 | FIN-11, 14, 26 | missing settlement, short settlement, chargeback never reversed |

### 3.5 Spend & Cards

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **budgets** | department_id, category, month, amount, committed money | → departments | 300 | FIN-05, 22, 25, 30, 31 | a department trending to overrun |
| **expense-claims** | number, employee_id, lines json (category, date, amount, merchant, city, receipt_id, receipt_amount, purpose), status, approver_id, reimbursed_date | → employees, approvals | 800 | FIN-21, 22, 25, 44 | duplicate receipt, claim on a leave day, over limit, receipt ≠ claim, missing receipt |
| **corporate-cards** | employee_id, last4, monthly_limit, daily_limit, blocked_mcc list, temp_limit, temp_until | → employees | 40 | FIN-23, 25 | none |
| **card-transactions** | card_id, merchant, mcc, city, amount, auth_at datetime, status (approved, declined), decline_reason | → corporate-cards | 2,000 | FIN-22, 23, 24, 25, 41 | blocked MCC, 2am spend, repeated just-under-limit charges |
| **subscriptions** | vendor, product, department_id, billing_cycle, amount, seats, seats_used, start, renewal_date, payment_source | → departments | 45 | FIN-20, 24 | two departments paying for the same SaaS, unused seats, price creep |
| **spend-policies** (global) | rule_code, scope (grade, department, category), limit, approval_level, receipt_required_above | → departments | 40 | FIN-21, 23, 44 | none (this is the reference policy) |

### 3.6 Ledger & Close

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **business-units** | name, type (branch, product line), city | none | 4 | FIN-30, 33, 34 | a unit that loses money despite strong revenue |
| **chart-of-accounts** (global) | code, name, type enum (asset, liability, equity, income, expense), parent_code | none | 80 | FIN-28, 29 | none |
| **journal-entries** | number, date, period, source_doc_type, source_doc_id, lines json (account_code, debit, credit, bu_id), posted_by | → chart-of-accounts, any source doc | 2,500 | FIN-28, 29 | unbalanced entry, capex booked as opex, wrong period, unreviewed adjustments |

### 3.7 Credit & Financing

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **loans** | lender, type enum (term, od, cc, equipment), principal, rate_pct, start, tenure_months, emi, sanctioned_limit | → bank-accounts | 3 | FIN-20, 37, 39 | none |
| **loan-schedules** | loan_id, due_date, principal, interest, paid_date, paid_amount | → loans | 100 | FIN-20, 37, 39 | one missed EMI |

### 3.8 Controls & Audit

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **employees** | code, name, email, department_id, business_unit_id, manager_id, grade, role_title, location, join_date, exit_date, employment_type, hourly_cost_rate, work_hours_per_week, bank_fingerprint | → departments, business-units, self (manager) | 120 | 30 statements (HRM, CRM reps, FIN spend, controls) | employee bank account matches a vendor's |
| **departments** | name, cost_center, head_id, business_unit_id | → employees, business-units | 8 | FIN-05, 22, 25, 33, 44, HRM-01, 04 | none |
| **vendor-bank-accounts** | vendor_id, ifsc, account_last4, account_fingerprint, holder_name, valid_from, valid_to, verified bool | → vendors | 55 | FIN-10, 15, 27, 43, 45 | shared account across vendors; change-then-revert |
| **master-data-changes** | entity_type, entity_id, field, old_value, new_value, changed_by, changed_at, approved_by | → employees, vendors, clients | 250 | FIN-10, 27, 42, 43 | bank change with no approver; change made by the payer |
| **approvals** | doc_type, doc_id, level int, action enum (approve, reject, escalate), actor_id, acted_at, threshold_applied | → employees, any document | 2,000 | FIN-06, 10, 15, 21, 28, 42, 44, 45 | self-approval, approver below required level, one approver on every payment to one vendor |
| **roles** | code, name, permissions list | none | 10 | FIN-42 | toxic role combinations |
| **user-role-assignments** | employee_id, role_id, granted_by, granted_at, revoked_at | → employees, roles | 60 | FIN-42 | the same user holds create-vendor and approve-payment |
| **source-records** | source_system enum (tally, zoho, razorpay, hdfc_csv, icici_stmt, crm, whatsapp), record_type, source_id, payload json (that system's own names and formats) | soft link only to canonical records; the true link is kept in ground truth | 1,500 | CRM-04, FIN-19, 26, 27, 35 | name variants, date/amount format drift, missing and duplicate records |

### 3.9 CRM

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **leads** | source enum, company, industry, size_band, city, contact_name, email, phone, created_at, owner_id, status, converted_client_id | → employees, clients | 800 | CRM-01, 02, 04 | fake leads (disposable email, invalid phone, bulk-created), duplicates |
| **contacts** | client_id, name, role, email, phone, is_primary, left_on date | → clients | 180 | CRM-01, 04 | a key contact who leaves an at-risk account |
| **opportunities** | client_id or lead_id, name, type (new, renewal, upsell), amount, stage, probability, expected_close, owner_id, outcome (open, won, lost), lost_reason, closed_on | → clients, leads, employees | 300 | CRM-01–04 | inflated amounts, zombie late-stage deals |
| **deal-stage-changes** | opportunity_id, from_stage, to_stage, old_close_date, new_close_date, amount_change, changed_by, changed_at | → opportunities, employees | 1,200 | CRM-01, 02, 03 | stage jumps, close date pushed 3+ times |
| **activities** | subject_type (lead, client, opportunity), subject_id, type enum (email, call, meeting, note, whatsapp), direction, duration_sec, occurred_at, logged_at, owner_id, body text (short templated), sentiment_hint | → leads, clients, opportunities, employees | 3,000 | CRM-01, 02, 04 | bulk-logged calls (20 in 5 minutes, 0 seconds long) |
| **engagement-events** | subject_type, subject_id, event enum (pricing_view, demo_request, download, login, feature_use), occurred_at, count int | → leads, clients | 3,000 | CRM-01, 02, 04 | usage decline before churn |
| **support-tickets** | client_id, opened_at, category, priority, status, resolved_at, csat int, text (short templated) | → clients | 500 | CRM-01, 04, FIN-34 | complaint surge; a temporary-dip decoy |
| **forecast-submissions** | employee_id, period, committed_amount, best_case, submitted_at | → employees | 120 | CRM-03 | a chronic sandbagger and a chronic over-committer |

### 3.10 HRM

| Resource | Key fields | Relationships | Rows per slice | Needed by | Plant |
|---|---|---|---|---|---|
| **skills** (global) | code, name, category, synonyms list, related list | self | 80 | HRM-01, 03, 04, 05 | none |
| **employee-skills** | employee_id, skill_id, declared_level, evidence_count, last_used | → employees, skills | 700 | HRM-01, 03, 04, 05 | declared "expert" with no evidence; near-qualified staff |
| **projects** | name, description text, client_id, status (pipeline, active, done), win_probability, start, end, required_skills json (skill, effort_hours), complexity | → clients, skills | 30 | HRM-01, 03, 04, 05 | three pipeline projects needing a skill nobody has |
| **project-assignments** | employee_id, project_id, role, allocation_pct, start, end, outcome_rating | → employees, projects | 250 | HRM-01, 02, 03, 05 | over-allocated staff (above 100%) |
| **timesheets** | employee_id, week_start, hours_by_project json, overtime_hours | → employees, projects | 3,000 | HRM-01, 02, 04, 05 | sustained overtime in one team |
| **leave-records** | employee_id (null for public holidays), type enum, start, end, status (approved, planned) | → employees | 600 | HRM-01, 02, 04, 05, FIN-21 | none |
| **employee-events** | employee_id, type enum (hire, promotion, pay_revision, manager_change, transfer, resignation), date, from/to json (band, manager, dept) | → employees | 500 | HRM-02, 05 | resignations preceded by multi-signal patterns |
| **survey-responses** | employee_id, quarter, engagement_score int, manager_score int | → employees | 480 | HRM-02 | score drop in the flight-risk group |
| **training-records** | employee_id, course, skill_id, type (course, certification), completed_on, score | → employees, skills | 450 | HRM-02, 03, 05 | training drop-off before exit |
| **performance-reviews** | employee_id, cycle, manager_id, rating int, goals json (goal, target, achieved), comments text | → employees | 240 | HRM-02, 05 | lenient and strict managers; ratings that contradict goals achieved |
| **feedback** | about_employee_id, from_employee_id, type (peer, manager), cycle, score int, text (short templated) | → employees | 800 | HRM-03, 05 | none |
| **shift-requirements** | department_id, date, shift enum (morning, evening, night), min_staff, required_skill_id | → departments, skills | 340 | HRM-04 | one week that cannot be staffed |
| **schedule-preferences** | employee_id, weekday, shift, preference (prefer, avoid, unavailable) | → employees | 240 | HRM-04 | none |

**Totals:** 55 new resources plus field additions to the existing 9. That comes to about **39,000 rows per slice**: 4k existing, 7k Tier 1, 11k Tier 2, 17k Tier 3. Across 80 slices that is **about 3.1 million rows**. The four global tables add a few hundred rows once. Most of the volume is in bank-transactions, activities, engagement-events, timesheets and journal-entries, so those are the first to cut if the Supabase plan pushes back.

---

## 4. Planted anomalies catalogue

**Rule:** every planted row is recorded in one **admin-only ground-truth table**: slice, anomaly code, the record IDs involved, a group ID for multi-record patterns, a difficulty level, and a note. This table must **never** be reachable through the team API. It is read by judges and the admin portal only, and it is not a column on any business table.

Planting must not leak through side channels:

- Planted rows must not get the highest IDs, the latest `created_at` or odd ordering. Plant during generation, not afterwards.
- Vary each slice's random offset, so teams cannot compare slices to find the planted rows.
- Include **decoys**: rows that look anomalous and have a legitimate explanation, such as a seasonal spike, a new large customer, or a one-off bulk buy. FIN-41, CRM-01 and HRM-02 all explicitly require telling the two apart.

| # | Anomaly | Entities | How it is generated | Per slice | Tests |
|---|---|---|---|---|---|
| A1 | Duplicate vendor bill (exact and near) | purchase-bills | Copy a bill; for near-duplicates vary the number format (INV-102 / INV102), shift the date ±3 days, or change the amount by ₹1 | 6 (3 exact, 3 near) | FIN-06, 10, 26, 44 |
| A2 | Ghost vendor | vendors, bills, vendor-payments | No PO or GRN, round amounts, created and paid by the same employee, missing or invalid GSTIN | 1 | FIN-10, 43, 45, 42 |
| A3 | Bank-detail change before payment | vendor-bank-accounts, master-data-changes, vendor-payments | Account changed, paid within 7 days, changed back | 2 | FIN-10, 43, 45 |
| A4 | Shared bank account | vendor-bank-accounts, employees | Two vendors, or a vendor and an employee, share one account fingerprint | 2 clusters | FIN-43, 45, 10 |
| A5 | Duplicate vendor or customer master records | vendors, clients, source-records | Name variants ("Sri Balaji Traders" / "Balaji Trdrs Pvt"), same PAN, different IDs | 3 vendor + 3 client pairs | FIN-04, 27, 35, 43, CRM-04 |
| A6 | Invalid identifiers | vendors, clients | Bad GSTIN checksum, PAN that does not match the GSTIN, state code ≠ state, malformed IFSC | 4 | FIN-27, 43 |
| A7 | Split transactions under a threshold | POs, vendor-payments, expense-claims, card-transactions | One need split into 3–4 items, each just under the approval limit, within 48 hours | 3 clusters | FIN-15, 22, 41, 44, 45, 25 |
| A8 | Price leakage | purchase-orders, vendor-contracts | Same item bought from other vendors at +15–30%; purchases above contract price; off-contract buys | 8 | FIN-04, 01 |
| A9 | Three-way match failure | bills, POs, goods-receipts | Billed qty > received, price > PO, wrong GST, bill with no GRN | 5% of bills | FIN-06, 09 |
| A10 | Supplier deterioration | goods-receipts | One vendor's delivery delay and rejection rate trend upward over the last 4 months; one critical item is single-sourced | 2 vendors | FIN-01, 02, 03 |
| A11 | Settlement leakage | gateway-transactions, settlements | Fee above contracted MDR, missing settlement, short net amount, refund deducted twice, chargeback not reversed | 1.5% of gateway transactions | FIN-11, 14, 26 |
| A12 | Payment failure mismatch and double pay | payment-attempts, vendor-payments | Failed but booked as paid; retry where both attempts succeed; reversal after success | 3% failures, 3 double pays | FIN-12, 11, 10 |
| A13 | Bank statement noise | bank-transactions | Statement imported twice (duplicate lines), unlabelled internal transfers, inconsistent narrations, unexplained bank charges | 2% duplicates | FIN-19, 26, 16 |
| A14 | Unmatched and partial receipts | payments, bank-transactions | One receipt covering 3 invoices, short-paid by TDS, a receipt with no invoice | 5% of receipts | FIN-11, 26, 28 |
| A15 | Expense claim abuse | expense-claims | Same receipt in two claims or by two employees, claim on a leave day, over the policy limit, receipt amount ≠ claim, missing receipt above the limit | 4% of claims | FIN-21, 25, 44 |
| A16 | Card misuse | card-transactions | Blocked MCC, 1–4am spend, repeated just-under-daily-limit charges, personal merchants | 2% | FIN-23, 25, 41 |
| A17 | Duplicate or zombie subscriptions | subscriptions | Two departments paying for the same SaaS, seats used below 30%, price creep of 8%+ at renewal | 3 | FIN-24 |
| A18 | Budget overrun trajectory | budgets, expenses, POs | One department at 85% of budget by month 9; one exceeding its budget via commitments | 2 | FIN-05, 22, 30 |
| A19 | Ledger errors | journal-entries | Unbalanced entry, capex booked as opex, entry posted to a closed period | 1% | FIN-28, 29 |
| A20 | Segregation-of-duties conflicts | approvals, user-role-assignments, master-data-changes | Creator approves their own document, approver below the required level, one user holding both vendor-create and payment-approve | 6 | FIN-42, 44, 45, 06 |
| A21 | Circular money flow | vendor-payments, payments, vendors, clients | A pays B, B pays C, C pays A among related parties (shared address or director), round amounts | 1 ring | FIN-45, 41 |
| A22 | Refund cluster | credit-notes | One customer gets 5+ refunds, all approved by one employee | 1 | FIN-45, 41 |
| A23 | Liquidity squeeze | bank-accounts, payroll-runs, statutory-dues, loan-schedules, invoices | A week where payroll, GST and an EMI coincide with delayed large collections, so one account goes below its minimum | 1 | FIN-16, 17, 18, 20, 39 |
| A24 | Credit deterioration and concentration | clients, invoices, payments | One large customer (25%+ of AR) whose days-to-pay rises every month while it exceeds its limit | 1 | FIN-38, 40, 36 |
| A25 | CRM manipulation | leads, deal-stage-changes, activities, opportunities | Fake leads, bulk-created leads, stage jumps (lead to negotiation in 1 day), close date pushed 3+ times, bulk fake calls, one rep repeatedly discounting one account (collusion) | ~5% of leads, 6 deals, 2 reps | CRM-01, 02, 03 |
| A26 | Churn trajectories | clients, engagement-events, support-tickets, payments, contacts | Declining usage, rising tickets, slowing payments, a key contact leaving; plus temporary-dip decoys that recover | 6 churners + 4 decoys | CRM-01, 04 |
| A27 | HR patterns | employee-events, surveys, timesheets, reviews, projects, shift-requirements | Resigners with multi-signal histories (and single-signal decoys), a lenient and a strict manager, a skill gap in pipeline projects, near-qualified staff, one infeasible roster week | ~10 labelled cases | HRM-01–05 |

---

## 5. Build priority

| Tier | Build | New resources | Statements that become fully buildable | Cumulative |
|---|---|---|---|---|
| **0: Fix what exists** | Resize the 9 existing resources to the proposed volumes; add their new fields; valid GSTIN checksums; the ground-truth table; plant A1, A5, A6, A14, A24 and decoys in existing data; freeze an as-of date | 0 | FIN-36, 38, 40, 41 | **4** |
| **1: Finance spine** | employees, departments, business-units, bank-accounts, bank-transactions, payroll-runs, statutory-dues, budgets, purchase-orders, goods-receipts, vendor-contracts, vendor-payments, vendor-bank-accounts, approvals, master-data-changes, credit-notes | 16 | FIN-02, 03, 04, 05, 06, 07, 08, 09, 10, 15, 16, 17, 18, 19, 22, 25, 27, 30, 31, 32, 33, 34, 43, 44, 45 | **29** |
| **2: Finance completion** | purchase-requisitions, supplier-quotes, payment-channels, payment-attempts, gateway-transactions, settlements, expense-claims, corporate-cards, card-transactions, subscriptions, spend-policies, chart-of-accounts, journal-entries, loans, loan-schedules, roles, user-role-assignments, source-records | 18 | FIN-01, 11, 12, 13, 14, 20, 21, 23, 24, 26, 28, 29, 35, 37, 39, 42 | **45** (all FIN) |
| **3a: CRM pack** | leads, contacts, opportunities, deal-stage-changes, activities, engagement-events, support-tickets, forecast-submissions | 8 | CRM-01, 02, 03, 04 | **49** |
| **3b: HRM pack** | skills, employee-skills, projects, project-assignments, timesheets, leave-records, employee-events, survey-responses, training-records, performance-reviews, feedback, shift-requirements, schedule-preferences | 13 | HRM-01, 02, 03, 04, 05 | **54** |

**Why this order:**

- **Tier 1 is the best return.** 16 resources unlock 25 statements, because `employees`, `bank-transactions`, `approvals` and `vendor-payments` each feed 8 to 30 statements.
- **Tier 3 is last.** 21 resources unlock only 9 statements, and it carries the open free-text and salary questions below.
- **One exception:** if registrations show CRM or HRM teams outnumbering a Tier 2 group, pull 3a or 3b forward. Tiers 3a and 3b both need `employees` from Tier 1 first.

---

## 6. Open questions for the product owner

1. **Free text.** CRM-01 and CRM-04 want sentiment in emails, calls and tickets; HRM-03 and HRM-05 want feedback and project descriptions; FIN-09 wants vendor communications. Should we generate short templated text from sentiment-tagged phrase banks (deterministic and cheap), or ship no text and let teams use scores? *Recommend: templated text, one or two sentences per row.*
2. **Salary data in HRM.** HRM-02 needs pay history against peers, HRM-04 needs cost rates, and FIN-16 needs payroll. Should we include individual salaries, or pay *bands* and hourly cost rates only, with payroll aggregated per department? *Recommend: bands plus cost rates; payroll per department.*
3. **"Real-time" on a read-only API.** CRM-02 ("score changes as events arrive"), CRM-04 and FIN-15 imply a live stream. Options: (a) teams replay history in time order; (b) events carry a `visible_after` time and appear gradually during the event; (c) add a `?since=` cursor. *Recommend: (a) plus (c); (b) only if judges want a live demo.*
4. **Protected attributes.** HRM-02 says "avoid protected attributes in risk scoring". Should the data include gender and age so teams can *prove* they avoid them, or omit them entirely?
5. **Multiple formats.** FIN-19, FIN-26 and FIN-35 want "statements in different formats". JSON-only means each `source-records` payload uses its own field names and date/amount conventions. Is that enough, or do judges expect CSV or bank-statement file downloads?
6. **Receipts and documents.** FIN-06 and FIN-21 mention uploads and receipt verification. Is metadata (receipt ID, amount, merchant, date) enough, or are receipt images or PDFs expected?
7. **Ground-truth access for teams.** Should teams get one labelled *practice* slice to train and validate on, while their own slice stays unlabelled? How will judges score detection, and in what submission format?
8. **Frozen clock.** Can the event freeze an as-of date, so "overdue" and "next week's liquidity gap" don't drift while teams build?
9. **One company per slice.** This plan assumes each slice is a complete company of about 120 staff. If a team only needs AP data, it still receives an HR and CRM dataset. That is fine, but it is the reason for the 3.1M-row total. Alternatively, the CRM and HRM packs could use fewer distinct slices (for example 20, repeated).
10. **Statement demand.** Which statements have teams actually picked? Tier order should follow registrations if the counts differ sharply from an even spread.
