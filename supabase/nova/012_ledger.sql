-- STATUS: VERIFIED 2026-09-30
-- =============================================================================
-- Nova Tier 2 pack 2c: the general ledger (docs/nova-tier2-build-contract.md
-- §4.5, §6 A19, §10 G1–G4). Owner: ledger builder. Runs LAST:
--   001 → 003 → 004 → 005 → 002 → 006 → 007 → 008 → 009 → 010 → 011 → 013 → 012
-- because a ledger is the sum of every financial event, so it reads every
-- other file and no file reads it.
--
-- Creates nova_chart_of_accounts, nova_accounting_periods and
-- nova_journal_entries. Writes nothing upstream (contract §2.2.4).
--
-- How the ledger is built:
--   1. BANK LINES FIRST. Every nova_bank_transactions line is matched back to
--      the event 008 made it from, by recomputing 008's own id rule
--      ('btx_' || md5('btx|' || key)). That gives each line its document
--      (receipt, vendor payment, payroll run, challan, EMI, transfer …) and
--      tells the A13 duplicate-import copies apart, which the ledger does not
--      post (the money moved once). Every bank leg of every journal is taken
--      from its real statement line, so no bank GL can disagree with the bank.
--   2. DOCUMENT JOURNALS. One set of signed lines (+ debit, − credit) per
--      document: invoices, credit notes, receipts, bills, vendor payments and
--      their returns, expenses, payroll, challans, bank-only lines, and the
--      Tier 2 sub-ledgers (gateway settlements, card statements, reimbursed
--      claims, EMI splits) when their tables exist.
--   3. MIGRATED HISTORY. Months before the detail window are collapsed into
--      monthly_summary entries per source type (a ledger migrated from an
--      older system), split into balanced chunks of at most 12 lines.
--   4. PLANTS. A19 (unbalanced, capex as opex, closed-period posting) and
--      their decoys, recorded in nova_ground_truth.
--
-- Flows the bank statement lacks (contract §10 G1–G3) sit in three clearing
-- accounts — gateway settlements in transit, corporate card payable, employee
-- reimbursements payable — never in a bank GL.
--
-- Determinism: every choice comes from pg_temp.h(key), an md5 of a stable
-- key; setseed() is pinned anyway. Re-runnable: truncates only its own three
-- tables (one statement, no CASCADE) and deletes only A19 ground truth.
-- =============================================================================

-- One transaction: a failure anywhere leaves the previous ledger intact.
begin;

-- Pins random() in case any statement reaches for it (none does on purpose).
select setseed(0.1212);

-- Parallel workers could make any order-dependent step timing-dependent.
set local max_parallel_workers_per_gather = 0;

-- Rerun "already exists, skipping" notices would bury real errors.
set local client_min_messages = warning;

-- -----------------------------------------------------------------------------
-- Tables. Conventions as every Nova table (contract §2.1): prefixed text ids,
-- slice_no on every row, numeric(14,2) money, text + CHECK statuses.
-- -----------------------------------------------------------------------------

-- The chart of accounts, generated per slice (contract §2.2.3: no global tables).
create table if not exists public.nova_chart_of_accounts (
  -- 12 hex characters after the prefix, as every Tier 2 id (contract §2.1).
  id text primary key check (id like 'coa\_%'),
  -- The team partition; the API pins it on every query.
  slice_no integer not null check (slice_no >= 0),
  -- Four digits: the numbering Indian SME ledgers (Tally, Zoho) use.
  account_code text not null check (account_code ~ '^[0-9]{4}$'),
  -- Display name, e.g. "Trade receivables".
  name text not null,
  -- The five statement classes a trial balance groups by.
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
  -- Finer grouping for reports; the list is the contract's §4.5 set.
  sub_type text not null check (sub_type in ('bank', 'cash', 'receivable', 'inventory', 'fixed_asset',
    'accumulated_depreciation', 'tax_asset', 'clearing', 'payable', 'tax_payable', 'loan', 'equity', 'revenue',
    'other_income', 'cogs', 'opex', 'payroll', 'finance_cost', 'depreciation')),
  -- Header account this one rolls up into; null at the top level.
  parent_code text,
  -- True for the two sub-ledger control accounts (AR, AP).
  is_control boolean not null default false,
  -- Soft reference to 005's bank account (contract §2.2.1: no cross-file FK);
  -- set on the one GL account per bank account.
  bank_account_id text,
  -- What is posted here and why; the fixed-asset rows state the threshold.
  description text not null,
  -- Load time only; excluded from the determinism md5 (contract §4 notation).
  created_at timestamptz not null default now(),
  -- A code means one account inside a company's book.
  constraint nova_chart_of_accounts_code_key unique (slice_no, account_code)
);

-- Monthly accounting periods with their close.
create table if not exists public.nova_accounting_periods (
  -- Prefixed deterministic id.
  id text primary key check (id like 'per\_%'),
  -- The team partition.
  slice_no integer not null check (slice_no >= 0),
  -- 'YYYY-MM', the label every close checklist uses.
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  -- First and last calendar day of the month.
  start_date date not null,
  end_date date not null,
  -- Closed months accept no ordinary postings; the as-of month is open.
  status text not null check (status in ('open', 'closed')),
  -- When the controller closed the month; null while open.
  closed_at timestamptz,
  -- Soft reference to 005's employees: the Finance head who closed it.
  closed_by text,
  -- Load time only.
  created_at timestamptz not null default now(),
  -- One row per month per company.
  constraint nova_accounting_periods_key unique (slice_no, period),
  -- A period never ends before it starts.
  constraint nova_accounting_periods_dates check (end_date >= start_date),
  -- A closed period records who and when; an open one records neither.
  constraint nova_accounting_periods_close check ((status = 'closed') = (closed_at is not null and closed_by is not null))
);

-- Journal entries, one row per entry, lines as compact jsonb (the size budget,
-- contract §3.3: lines are the ledger's biggest cost, a child table would
-- double it with row headers and a second primary key).
create table if not exists public.nova_journal_entries (
  -- Prefixed deterministic id.
  id text primary key check (id like 'jnl\_%'),
  -- The team partition.
  slice_no integer not null check (slice_no >= 0),
  -- Human-facing voucher number, e.g. JV-2608-0042; unique inside a book.
  entry_number text not null,
  -- The accounting date the entry belongs to.
  entry_date date not null,
  -- In-file FK: the period the entry date falls in.
  period_id text not null references public.nova_accounting_periods(id) on delete restrict,
  -- When the entry was keyed; normally 0–5 days after entry_date and before close.
  posted_at timestamptz not null,
  -- Soft reference to 005's employees: the accountant who keyed it.
  posted_by text not null,
  -- What produced the entry (contract §4.5 list).
  source_type text not null check (source_type in ('invoice', 'credit_note', 'customer_receipt', 'purchase_bill',
    'vendor_payment', 'expense', 'payroll', 'statutory', 'bank_charge', 'bank_interest', 'loan_emi', 'loan_drawdown',
    'internal_transfer', 'gateway_settlement', 'card_statement', 'expense_claim', 'depreciation', 'accrual',
    'opening_balance', 'monthly_summary', 'manual')),
  -- Soft reference to the source document; null for summary, opening,
  -- depreciation, accrual and manual entries.
  source_id text,
  -- [{account_code, debit, credit, department_id?}]: 2–12 lines, exactly one
  -- of debit/credit > 0 on each.
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 2 and 12),
  -- Sums of the lines. No equality CHECK: A19 plants unbalanced entries.
  total_debit numeric(14,2) not null check (total_debit >= 0),
  total_credit numeric(14,2) not null check (total_credit >= 0),
  -- Templated description of the entry.
  narration text not null,
  -- 'reversed' = a later entry (reversal_of) undoes this one; both still
  -- count in every balance, as in any ledger.
  status text not null check (status in ('posted', 'reversed')),
  -- In-file FK: the entry this one reverses.
  reversal_of text references public.nova_journal_entries(id) on delete restrict,
  -- Soft reference to 005's employees: set on controller-approved entries.
  approved_by text,
  -- Load time only.
  created_at timestamptz not null default now(),
  -- Voucher numbers never repeat inside one company's book.
  constraint nova_journal_entries_number_key unique (slice_no, entry_number)
);

-- Every API list pins slice_no, then sorts by the main date (contract §2.1).
create index if not exists nova_chart_of_accounts_slice_idx on public.nova_chart_of_accounts (slice_no, account_code);
-- The soft bank link is joined on by reconciliations.
create index if not exists nova_chart_of_accounts_bank_idx on public.nova_chart_of_accounts (bank_account_id);
create index if not exists nova_accounting_periods_slice_idx on public.nova_accounting_periods (slice_no, start_date desc);
create index if not exists nova_journal_entries_slice_idx on public.nova_journal_entries (slice_no, entry_date desc);
-- The child route /accounting-periods/{id}/journal-entries.
create index if not exists nova_journal_entries_period_idx on public.nova_journal_entries (period_id);
-- "Find the entry for this invoice": the drill-down every rebuild starts with.
create index if not exists nova_journal_entries_source_idx on public.nova_journal_entries (source_type, source_id);

-- -----------------------------------------------------------------------------
-- Reset. One truncate for all three tables: the in-file FKs (period_id,
-- reversal_of) are satisfied because every referencing table is in the same
-- statement, so no CASCADE is needed and nothing outside this file is touched.
-- -----------------------------------------------------------------------------
truncate table public.nova_journal_entries, public.nova_accounting_periods, public.nova_chart_of_accounts;
-- Only this file's anomaly code (contract §2.2.5: one owner per code).
delete from public.nova_ground_truth where anomaly_code in ('A19');

-- -----------------------------------------------------------------------------
-- Helpers (session-temporary).
-- -----------------------------------------------------------------------------

-- A stable roll in [0, 1) from any key: the first 32 bits of its md5, the same
-- helper 008 uses, so no value depends on plan shape or row order.
create function pg_temp.h(k text) returns numeric language sql immutable as $$
  -- Hex → 32-bit integer → fraction of 2^32; numeric keeps money maths exact.
  select ('x' || substr(md5(k), 1, 8))::bit(32)::bigint::numeric / 4294967296
$$;

-- 008's statement-line id rule, recomputed so each line can be traced to the
-- event that produced it (see the header).
create function pg_temp.btx(k text) returns text language sql immutable as $$
  -- Exactly the expression in 008_banking.sql (bk_out.id).
  select 'btx_' || left(md5('btx|' || k), 12)
$$;

-- One JSON journal line from a signed amount (+ debit, − credit), with the
-- optional department. jsonb_strip_nulls drops department_id when absent,
-- which keeps the stored lines compact (the size budget).
create function pg_temp.jl(code text, amt numeric, dep text) returns jsonb language sql immutable as $$
  -- Exactly one side is non-zero, as the column comment promises.
  select jsonb_strip_nulls(jsonb_build_object('account_code', code,
    'debit', greatest(amt, 0), 'credit', greatest(-amt, 0), 'department_id', dep))
$$;

-- -----------------------------------------------------------------------------
-- Context. The frozen as-of date (005) ends the book; the first period is the
-- month twelve months before the as-of month, so there are always 13.
-- DETAIL WINDOW: document-level entries for the last 4 periods (contract
-- §4.5 says 7, and allows cutting to no fewer than 3): at ~190 documents a
-- month, 7 detail months would put every slice far above the 850–1,100 entry
-- range of §4.5 and past the 55 MB budget. Earlier months are summaries.
-- -----------------------------------------------------------------------------
create temp table lg_ctx on commit drop as
select c.as_of,
  -- The stub month that opens the book (2025-09 on the live as-of date).
  (date_trunc('month', c.as_of) - interval '12 months')::date as p0,
  -- First day of the detail window.
  (date_trunc('month', c.as_of) - interval '3 months')::date as detail_from,
  -- First day of the as-of month: every earlier month is closed.
  date_trunc('month', c.as_of)::date as open_from
-- The frozen clock only, never current_date (contract §1), so every build dates identically.
from (select m.as_of_date as as_of from public.nova_dataset_meta m where m.id) c;

-- No as-of date means 005 has not run: fail loudly instead of building an empty ledger.
do $ctx$ begin
  -- Exactly one row with a date, or the whole file rolls back.
  if (select count(*) from lg_ctx where as_of is not null) <> 1 then
    raise exception '012: nova_dataset_meta.as_of_date is not set (run 005 first)';
  end if;
end $ctx$;

-- The slices that have a book: every slice with bank accounts (as 008 does).
create temp table lg_slice on commit drop as
select distinct a.slice_no from public.nova_bank_accounts a;

-- Finance staff per slice. The Finance head is the controller who closes
-- periods and approves adjustments; the other accountants key the entries.
create temp table lg_fin on commit drop as
select d.slice_no, d.head_employee_id as controller,
  -- Accountants in a stable order, for hashed picks.
  array_agg(e.id order by e.id) filter (where e.id <> d.head_employee_id) as staff
from public.nova_departments d
join public.nova_employees e on e.department_id = d.id
where d.name = 'Finance and Accounts'
group by d.slice_no, d.head_employee_id;

-- -----------------------------------------------------------------------------
-- Accounting periods: 13 months, the as-of month open, every earlier month
-- closed 5–12 days after month end by the Finance head.
-- -----------------------------------------------------------------------------
insert into public.nova_accounting_periods (id, slice_no, period, start_date, end_date, status, closed_at, closed_by)
select 'per_' || left(md5('per|' || s.slice_no || '|' || to_char(m.m, 'YYYY-MM')), 12),
  s.slice_no, to_char(m.m, 'YYYY-MM'), m.m, (m.m + interval '1 month')::date - 1,
  -- Before the as-of month: closed; the as-of month itself: open.
  case when m.m < c.open_from then 'closed' else 'open' end,
  -- 18:00 IST on day 5–12 after month end, never after the as-of evening.
  case when m.m < c.open_from then least(
    (((m.m + interval '1 month')::date - 1 + 5 + floor(pg_temp.h('close' || s.slice_no || m.m) * 8)::int) + time '18:00') at time zone 'Asia/Kolkata',
    (c.as_of + time '18:00') at time zone 'Asia/Kolkata') end,
  -- The controller signs every close.
  case when m.m < c.open_from then f.controller end
from lg_slice s
cross join lg_ctx c
join lg_fin f on f.slice_no = s.slice_no
-- Months p0 … as-of month.
cross join lateral (select (c.p0 + make_interval(months => k))::date as m from generate_series(0, 12) k) m;

-- -----------------------------------------------------------------------------
-- Chart of accounts: 78 accounts per slice — 69 fixed ones, one GL account per
-- bank account (5) and one sales account per business unit (4).
-- -----------------------------------------------------------------------------
create temp table lg_coa_def (code text, name text, account_type text, sub_type text, parent_code text,
  is_control boolean, description text) on commit drop;
-- Fixed accounts, the same codes in every company, so a team's mapping is reusable.
insert into lg_coa_def values
  -- Current assets.
  ('1000', 'Cash on hand', 'asset', 'cash', null, false, 'Office cash: cash receipts in, cash-paid expenses and card cash withdrawals out.'),
  ('1100', 'Trade receivables', 'asset', 'receivable', null, true, 'Control account for customer invoices, less receipts allocated and TDS withheld, less credit notes.'),
  ('1150', 'Advances to vendors', 'asset', 'receivable', null, false, 'Vendor payments released without a bill.'),
  ('1200', 'Inventory - stock in trade', 'asset', 'inventory', null, false, 'Stock items bought for resale, at bill cost.'),
  ('1300', 'GST electronic cash ledger', 'asset', 'tax_asset', null, false, 'GSTR-3B challans paid into the GST portal cash ledger.'),
  ('1310', 'Input CGST', 'asset', 'tax_asset', '1300', false, 'CGST credit on eligible bills and expenses.'),
  ('1311', 'Input SGST', 'asset', 'tax_asset', '1300', false, 'SGST credit on eligible bills and expenses.'),
  ('1312', 'Input IGST', 'asset', 'tax_asset', '1300', false, 'IGST credit on eligible inter-state bills.'),
  ('1320', 'TDS receivable', 'asset', 'tax_asset', null, false, 'TDS customers withheld from receipts, recovered against Form 16A.'),
  ('1330', 'Advance income tax', 'asset', 'tax_asset', null, false, 'Advance-tax instalments paid, less refunds received.'),
  ('1400', 'Gateway settlements in transit', 'asset', 'clearing', null, false, 'Net gateway settlement payouts not yet seen on a bank statement.'),
  -- Fixed assets, by class, with their accumulated depreciation.
  ('1500', 'Fixed assets - IT hardware', 'asset', 'fixed_asset', null, false, 'Computers, monitors and network gear. Capitalisation threshold: Rs 10,000 per unit; below it the item is expensed.'),
  ('1505', 'Accumulated depreciation - IT hardware', 'asset', 'accumulated_depreciation', '1500', false, 'Straight line over 36 months from the month after purchase.'),
  ('1510', 'Fixed assets - furniture', 'asset', 'fixed_asset', null, false, 'Office chairs, cabinets and fittings. Capitalisation threshold: Rs 10,000 per unit; below it the item is expensed.'),
  ('1515', 'Accumulated depreciation - furniture', 'asset', 'accumulated_depreciation', '1510', false, 'Straight line over 120 months from the month after purchase.'),
  ('1520', 'Fixed assets - plant and equipment', 'asset', 'fixed_asset', null, false, 'Machinery, fans and solar panels. Capitalisation threshold: Rs 10,000 per unit; below it the item is expensed.'),
  ('1525', 'Accumulated depreciation - plant and equipment', 'asset', 'accumulated_depreciation', '1520', false, 'Straight line over 96 months from the month after purchase.'),
  -- Liabilities.
  ('2000', 'Trade payables', 'liability', 'payable', null, true, 'Control account for vendor bills, less vendor payments against them.'),
  ('2050', 'Customer advances and unapplied receipts', 'liability', 'payable', null, false, 'Receipt amounts above the invoices they settle, and credits not yet matched to a customer.'),
  ('2100', 'Output CGST', 'liability', 'tax_payable', null, false, 'CGST on sales invoices, less credit-note reversals.'),
  ('2101', 'Output SGST', 'liability', 'tax_payable', null, false, 'SGST on sales invoices, less credit-note reversals.'),
  ('2102', 'Output IGST', 'liability', 'tax_payable', null, false, 'IGST on inter-state sales invoices, less credit-note reversals.'),
  ('2110', 'GST payable under reverse charge', 'liability', 'tax_payable', null, false, 'GST the company self-assesses on reverse-charge bills.'),
  ('2120', 'TDS payable', 'liability', 'tax_payable', null, false, 'TDS withheld from salaries and expenses, until the challan is paid.'),
  ('2130', 'PF payable', 'liability', 'tax_payable', null, false, 'Employee and employer provident fund, until the ECR challan is paid.'),
  ('2140', 'ESI payable', 'liability', 'tax_payable', null, false, 'Employee ESI withheld, until the ESIC challan is paid.'),
  ('2200', 'Corporate card payable', 'liability', 'clearing', null, false, 'Approved corporate card spend per monthly card statement, awaiting the card bill payment.'),
  ('2210', 'Employee reimbursements payable', 'liability', 'clearing', null, false, 'Reimbursed expense claims, settled with payroll outside the payroll net pay.'),
  ('2300', 'Accrued expenses', 'liability', 'payable', null, false, 'Month-end estimates of bills not yet received, reversed on the first of the next month.'),
  ('2400', 'Term loan', 'liability', 'loan', null, false, 'Term loan principal outstanding; EMIs reduce it by their principal part.'),
  ('2410', 'Cash credit facility', 'liability', 'loan', null, false, 'Working-capital drawdowns credited to the overdraft account.'),
  -- Equity.
  ('3000', 'Capital and reserves', 'equity', 'equity', null, false, 'Balancing figure of the opening balances migrated into this ledger.'),
  -- Income. 4000 is the header the per-business-unit sales accounts roll up into.
  ('4000', 'Sales - B2B', 'income', 'revenue', null, false, 'Header: invoiced sales, one account per business unit below it.'),
  ('4100', 'Sales - online', 'income', 'revenue', null, false, 'Gross captures of the online sales channel, per gateway settlement batch.'),
  ('4110', 'Sales returns - online', 'income', 'revenue', '4100', false, 'Online refunds and chargebacks deducted in settlements, net of settlement adjustments.'),
  -- Operating expenses: one account per nova_expenses category.
  ('6100', 'Rent', 'expense', 'opex', null, false, 'Office and godown rent.'),
  ('6110', 'Travel', 'expense', 'opex', null, false, 'Company-booked travel.'),
  ('6120', 'Software subscriptions', 'expense', 'opex', null, false, 'Software and SaaS, bank- or card-billed.'),
  ('6130', 'Utilities', 'expense', 'opex', null, false, 'Electricity, water and internet, including month-end estimates.'),
  ('6150', 'Office supplies', 'expense', 'opex', null, false, 'Stationery and office consumables.'),
  ('6160', 'Professional fees', 'expense', 'opex', null, false, 'Audit, legal and consulting fees.'),
  ('6170', 'Marketing', 'expense', 'opex', null, false, 'Advertising and promotion.'),
  ('6180', 'Meals - company paid', 'expense', 'opex', null, false, 'Company-paid meals; GST credit is blocked under s.17(5).'),
  ('6190', 'Other expenses', 'expense', 'opex', null, false, 'Spend with no more specific account.'),
  -- One account per expense-claim and card-spend group.
  ('6200', 'Travel - air and rail', 'expense', 'opex', null, false, 'Employee-claimed and card-paid air and rail travel.'),
  ('6210', 'Local conveyance', 'expense', 'opex', null, false, 'Employee-claimed local conveyance.'),
  ('6220', 'Lodging', 'expense', 'opex', null, false, 'Hotel stays, claimed or card-paid.'),
  ('6230', 'Meals and entertainment', 'expense', 'opex', null, false, 'Meals, client entertainment, restaurants and entertainment on claims and cards.'),
  ('6240', 'Telecom', 'expense', 'opex', null, false, 'Mobile and data charges, claimed or card-paid.'),
  ('6250', 'Fuel', 'expense', 'opex', null, false, 'Fuel, claimed or card-paid.'),
  ('6260', 'General purchases', 'expense', 'opex', null, false, 'Retail card purchases.'),
  -- Contracted services from bills, by SAC.
  ('6300', 'Freight and transport', 'expense', 'opex', null, false, 'SAC 9965 transport bills.'),
  ('6310', 'Warehousing', 'expense', 'opex', null, false, 'SAC 9967 warehouse space bills.'),
  ('6320', 'Facility management', 'expense', 'opex', null, false, 'SAC 9985 housekeeping and security bills.'),
  ('6330', 'Staff welfare - canteen', 'expense', 'opex', null, false, 'SAC 9963 canteen bills.'),
  ('6340', 'Repairs and maintenance', 'expense', 'opex', null, false, 'SAC 9987 machinery servicing bills.'),
  ('6350', 'IT services', 'expense', 'opex', null, false, 'SAC 9983 IT support and AMC bills.'),
  ('6390', 'Other contracted services', 'expense', 'opex', null, false, 'Service bills with any other SAC.'),
  ('6400', 'Minor equipment and furniture', 'expense', 'opex', null, false, 'Asset-type items under the Rs 10,000 per unit capitalisation threshold, expensed on purchase.'),
  -- Payroll.
  ('7000', 'Salaries and wages', 'expense', 'payroll', null, false, 'Gross monthly pay per department payroll run.'),
  ('7010', 'Employer PF contribution', 'expense', 'payroll', null, false, 'Employer PF, equal to the employee share.'),
  ('7020', 'Employer ESI contribution', 'expense', 'payroll', null, false, 'Employer ESI share, booked with the ESIC challan.'),
  -- Finance costs and other charges.
  ('8000', 'Payment processing fees', 'expense', 'opex', null, false, 'Card MDR on receipts and gateway fees with their GST.'),
  ('8010', 'Bank charges', 'expense', 'opex', null, false, 'Account maintenance, SMS, transfer and cheque-book charges.'),
  ('8100', 'Interest - term loan', 'expense', 'finance_cost', null, false, 'Interest part of term-loan EMIs.'),
  ('8110', 'Interest - cash credit', 'expense', 'finance_cost', null, false, 'Monthly interest debited on the overdraft account.'),
  ('8120', 'Interest on statutory dues', 'expense', 'finance_cost', null, false, 'Interest paid with late GST, TDS, PF, ESI and advance-tax challans.'),
  ('8200', 'Depreciation', 'expense', 'depreciation', null, false, 'Monthly straight-line depreciation of fixed assets.'),
  ('8900', 'Round-off', 'expense', 'opex', null, false, 'Paisa differences rounded off on documents, never above Rs 1.');

-- The chart itself: fixed accounts, then one per bank account, then one per
-- business unit, for every slice.
insert into public.nova_chart_of_accounts (id, slice_no, account_code, name, account_type, sub_type, parent_code,
  is_control, bank_account_id, description)
select 'coa_' || left(md5('coa|' || x.slice_no || '|' || x.code), 12), x.slice_no, x.code, x.name, x.account_type,
  x.sub_type, x.parent_code, x.is_control, x.bank_account_id, x.description
from (
  -- The fixed accounts, the same in every company.
  select s.slice_no, d.code, d.name, d.account_type, d.sub_type, d.parent_code, d.is_control, null::text as bank_account_id, d.description
  from lg_slice s cross join lg_coa_def d
  union all
  -- One GL account per bank account, coded by purpose so 1010 is always collections.
  select a.slice_no, '101' || (array_position(array['collections', 'payroll', 'vendor', 'branch', 'od'], a.purpose) - 1),
    'Bank - ' || a.bank || ' ' || a.purpose || ' A/c XX' || a.account_last4, 'asset', 'bank', null, false, a.id,
    'Mirrors the statement of this bank account; A13 duplicate-import copies are not posted.'
  from public.nova_bank_accounts a
  union all
  -- One sales account per business unit, 4001 upwards in id order.
  select b.slice_no, (4000 + row_number() over (partition by b.slice_no order by b.id))::text,
    'Sales - ' || b.name, 'income', 'revenue', '4000', false, null, 'Invoiced sales of this business unit, net of credit notes.'
  from public.nova_business_units b
) x;

-- Bank GL code per bank account, for every bank leg below.
create temp table lg_bankgl on commit drop as
select c.bank_account_id as account_id, c.account_code as code, c.slice_no
from public.nova_chart_of_accounts c where c.bank_account_id is not null;

-- Sales account per business unit, for invoices and credit notes.
create temp table lg_bugl on commit drop as
select b.id as bu_id, (4000 + row_number() over (partition by b.slice_no order by b.id))::text as code
from public.nova_business_units b;

-- -----------------------------------------------------------------------------
-- Pass 1: trace every statement line to its event. Each candidate key is one
-- that 008 builds its line ids from; a line and its A13 copy ('|dup') share
-- the event. Months are the 13 the statement can span.
-- -----------------------------------------------------------------------------
create temp table lg_month on commit drop as
select (c.p0 + make_interval(months => k))::date as m from lg_ctx c cross join generate_series(0, 12) k;

-- Document-driven keys: one per receipt, vendor payment (payment, return,
-- transfer charge), payroll run, challan and expense, plus the fixed per-slice
-- events (EMIs, account charges, the A13/A14 lines).
create temp table lg_key (k text not null, kind text not null, doc text) on commit drop;
insert into lg_key
select 'pay|' || id, 'receipt', id from public.nova_payments
union all select 'vpy|' || id, 'vpay', id from public.nova_vendor_payments
union all select 'ret|' || id, 'vpay_return', id from public.nova_vendor_payments
-- 008 keys the RTGS/IMPS charge line on the payment line's own key.
union all select 'txc|vpy|' || id, 'txn_charge', id from public.nova_vendor_payments
union all select 'prl|' || id, 'payroll', id from public.nova_payroll_runs
union all select 'sdu|' || id, 'statutory', id from public.nova_statutory_dues
union all select 'exp|' || id, 'expense', id from public.nova_expenses
-- EMIs are keyed on slice and month (the date renders as YYYY-MM-DD, as in 008).
union all select 'emi|' || s.slice_no || '|' || m.m, 'emi', null from lg_slice s cross join lg_month m
-- Maintenance (n = 0) and SMS (n = 1) charges per account per month.
union all select 'chg|' || a.id || '|' || m.m || '|' || n, 'charge', a.id
  from public.nova_bank_accounts a cross join lg_month m cross join generate_series(0, 1) n
-- The A14 unexplained credits, the refund decoy, A13 charges and the cheque books.
union all select 'unk|' || s.slice_no || '|' || n, 'unknown_receipt', null from lg_slice s cross join generate_series(1, 2) n
union all select 'rfd|' || s.slice_no, 'refund', null from lg_slice s
union all select 'msc|' || s.slice_no || '|' || n, 'misc', null from lg_slice s cross join generate_series(1, 2) n
union all select 'cbk|' || s.slice_no || '|' || n, 'chqbook', null from lg_slice s cross join generate_series(1, 2) n;

-- Each key's two possible line ids: the real line and its duplicate-import copy.
create temp table lg_keyid on commit drop as
select pg_temp.btx(k) as id, kind, doc, false as dup, null::integer as tk from lg_key
union all select pg_temp.btx(k || '|dup'), kind, doc, true, null from lg_key;

-- Treasury lines are keyed on a per-slice counter k (transfer legs 'dr'/'cr',
-- OD interest and drawdowns bare). k never exceeds the slice's count of lines
-- no document key explains, so that bounds the search.
insert into lg_keyid
select pg_temp.btx(x.k), x.kind, x.slice_no || '|' || x.n, x.dup, x.n
from (select t.slice_no, count(*) as n from public.nova_bank_transactions t
      where not exists (select 1 from lg_keyid i where i.id = t.id) group by t.slice_no) u
cross join lateral generate_series(1, u.n::int) g(n)
cross join lateral (values ('', 'tr_single'), ('|dr', 'tr_dr'), ('|cr', 'tr_cr')) leg(sfx, kind)
cross join lateral (values (false), (true)) d(dup)
cross join lateral (select 'tr|' || u.slice_no || '|' || g.n || leg.sfx || case when d.dup then '|dup' else '' end as k,
  leg.kind, u.slice_no, g.n, d.dup) x;

-- Every statement line with its event. The inner join drops nothing: the
-- self-check at the end fails the file if any line stayed unexplained.
create temp table lg_btx on commit drop as
select t.id, t.slice_no, t.account_id, t.line_no, t.posted_date, t.debit, t.credit, t.running_balance, t.bank_ref,
  k.kind, k.doc, k.dup, k.tk, g.code as gl
from public.nova_bank_transactions t
join lg_keyid k on k.id = t.id
join lg_bankgl g on g.account_id = t.account_id;
-- The posting passes look lines up by document and by kind.
create index on lg_btx (doc);
create index on lg_btx (kind, slice_no);

-- -----------------------------------------------------------------------------
-- Pass 2: document journals, as signed lines (+ debit, − credit) keyed by an
-- entry key. lg_doc holds one row per entry; lg_line its lines.
-- -----------------------------------------------------------------------------
create temp table lg_doc (
  -- Stable entry key: source type + document; the journal id hashes it.
  ekey text primary key,
  -- The team partition, from the document.
  slice_no integer not null,
  -- The journal's source_type and source_id.
  source_type text not null,
  source_id text,
  -- The accounting date (a bank-legged entry takes its statement date).
  entry_date date not null,
  -- Narration, templated from the document's own number or reference.
  narration text not null,
  -- Set on a return/reversal entry: the entry key it reverses.
  reverses text
) on commit drop;

-- Lines. dep is the department on expense-type lines (optional in the contract).
create temp table lg_line (ekey text not null, code text not null, amt numeric(14,2) not null, dep text) on commit drop;

-- Invoices: receivable at total, sales per business unit, output GST by head.
insert into lg_doc select 'inv|' || i.id, i.slice_no, 'invoice', i.id, i.invoice_date,
  'Sales invoice ' || i.invoice_number || ' - ' || i.client_name, null
from public.nova_invoices i cross join lg_ctx c where i.invoice_date <= c.as_of;
-- Its lines, zero GST heads dropped.
insert into lg_line
select 'inv|' || i.id, x.code, x.amt, null
from public.nova_invoices i
join lg_bugl b on b.bu_id = i.business_unit_id
cross join lateral (values ('1100', i.total_amount), (b.code, -i.amount),
  ('2100', -i.cgst_amount), ('2101', -i.sgst_amount), ('2102', -i.igst_amount)) x(code, amt)
where 'inv|' || i.id in (select ekey from lg_doc) and x.amt <> 0;

-- Credit notes: sales and output GST reversed, receivable reduced. The GST
-- head follows the invoice (CGST + SGST split as 002 splits invoices).
insert into lg_doc select 'crn|' || n.id, n.slice_no, 'credit_note', n.id, n.note_date,
  'Credit note ' || n.credit_note_number || ' (' || n.reason || ') against ' || i.invoice_number, null
from public.nova_credit_notes n join public.nova_invoices i on i.id = n.invoice_id
cross join lg_ctx c where n.note_date <= c.as_of;
-- Its lines, the reverse of the invoice's.
insert into lg_line
select 'crn|' || n.id, x.code, x.amt, null
from public.nova_credit_notes n
join public.nova_invoices i on i.id = n.invoice_id
join lg_bugl b on b.bu_id = i.business_unit_id
cross join lateral (values ('1100', -(n.amount + n.gst_amount)), (b.code, n.amount),
  ('2100', case when i.intra_state then round(n.gst_amount / 2, 2) else 0 end),
  ('2101', case when i.intra_state then n.gst_amount - round(n.gst_amount / 2, 2) else 0 end),
  ('2102', case when i.intra_state then 0 else n.gst_amount end)) x(code, amt)
where 'crn|' || n.id in (select ekey from lg_doc) and x.amt <> 0;

-- Customer receipts. The bank leg is the receipt's own statement line (008
-- links it on nova_payments), dated when the bank credited it, so a cheque
-- that clears next month sits in next month's bank GL exactly as on the
-- statement. Card receipts arrive net of MDR; the difference is the fee.
-- Cash receipts go to Cash on hand (008: cash never reaches the bank).
create temp table lg_rcpt on commit drop as
select p.id, p.slice_no, p.payment_number, p.client_name, p.amount, p.tds_deducted, p.method, p.payment_date,
  -- What the receipt allocates to invoices; any excess is unapplied.
  (select coalesce(sum((a ->> 'amount')::numeric), 0) from jsonb_array_elements(p.allocations) a) as alloc,
  b.gl, b.credit as bank_amt, b.posted_date
from public.nova_payments p
cross join lg_ctx c
left join lg_btx b on b.doc = p.id and b.kind = 'receipt' and not b.dup
where p.payment_date <= c.as_of;
-- One entry per receipt.
insert into lg_doc select 'pay|' || r.id, r.slice_no, 'customer_receipt', r.id, coalesce(r.posted_date, r.payment_date),
  'Receipt ' || r.payment_number || ' from ' || r.client_name || ' by ' || r.method, null
from lg_rcpt r;
-- Its lines; zero lines are dropped (no line may be 0/0).
insert into lg_line
select 'pay|' || r.id, x.code, x.amt, null
from lg_rcpt r
cross join lateral (values
  -- Bank leg at the credited amount, or the whole receipt into cash.
  (coalesce(r.gl, '1000'), coalesce(r.bank_amt, r.amount)),
  -- Card MDR withheld by the acquirer.
  ('8000', r.amount - coalesce(r.bank_amt, r.amount)),
  -- TDS the customer withheld: a claim on the tax department.
  ('1320', r.tds_deducted),
  -- The invoices it settles, including the TDS portion they no longer owe in cash.
  ('1100', -(r.alloc + r.tds_deducted)),
  -- Anything paid above the allocations.
  ('2050', -(r.amount - r.alloc))) x(code, amt)
where x.amt <> 0;

-- Purchase bills, line by line. Posting map (contract §4.5): an asset-type
-- HSN at >= Rs 10,000 per unit is capitalised by class; below the threshold
-- it is expensed as minor equipment; other stock items go to Inventory;
-- services go to their SAC's expense account. GST: eligible credit to Input
-- GST; ineligible GST, and the GST a reverse-charge vendor charged, is cost.
create temp table lg_bline on commit drop as
select b.id as bill_id, b.slice_no, b.bill_date, e.ord,
  left(coalesce(e.v ->> 'hsn_code', ''), 4) as h4, (e.v ->> 'rate')::numeric as rate,
  (e.v ->> 'amount')::numeric as amount, (e.v ->> 'gst_amount')::numeric as gst,
  -- GST that is part of cost rather than a credit.
  case when b.reverse_charge or not b.itc_eligible then (e.v ->> 'gst_amount')::numeric else 0 end as gst_cost,
  (e.v ->> 'item_id') is not null as is_stock
from public.nova_purchase_bills b
cross join lg_ctx c
cross join lateral jsonb_array_elements(b.items) with ordinality e(v, ord)
where b.bill_date <= c.as_of;
-- The account per line. Asset-type HSNs: 8471/8517/8528 IT hardware,
-- 9401/9403 furniture, 8414/8541 plant and equipment.
-- Added after the fact so the mapping reads as one CASE below.
alter table lg_bline add column code text;
update lg_bline set code = case
  when h4 in ('8471', '8517', '8528') and rate >= 10000 then '1500'
  when h4 in ('9401', '9403') and rate >= 10000 then '1510'
  when h4 in ('8414', '8541') and rate >= 10000 then '1520'
  when h4 in ('8471', '8517', '8528', '9401', '9403', '8414', '8541') then '6400'
  when is_stock then '1200'
  else coalesce((array['6330', '6300', '6310', '6350', '6320', '6340'])[array_position(array['9963', '9965', '9967', '9983', '9985', '9987'], h4)], '6390') end;

-- One entry per bill, on its bill date.
insert into lg_doc select 'bil|' || b.id, b.slice_no, 'purchase_bill', b.id, b.bill_date,
  'Purchase bill ' || b.bill_number || ' - ' || b.vendor_name, null
from public.nova_purchase_bills b cross join lg_ctx c where b.bill_date <= c.as_of;
insert into lg_line
-- Cost lines, one per account per bill.
select 'bil|' || l.bill_id, l.code, sum(l.amount + l.gst_cost), null
from lg_bline l group by l.bill_id, l.code
union all
-- Bill-level GST and the payable.
select 'bil|' || b.id, x.code, x.amt, null
from public.nova_purchase_bills b
cross join lateral (values
  -- Input credit on eligible bills, and on reverse-charge tax self-assessed.
  ('1310', case when b.itc_eligible then b.cgst_amount else 0 end),
  ('1311', case when b.itc_eligible then b.sgst_amount else 0 end),
  ('1312', case when b.itc_eligible then b.igst_amount else 0 end),
  -- The reverse-charge liability the company pays in cash.
  ('2110', case when b.reverse_charge then -b.gst_amount else 0 end),
  -- The vendor is owed the bill total.
  ('2000', -b.total_amount)) x(code, amt)
where 'bil|' || b.id in (select ekey from lg_doc) and x.amt <> 0;

-- Vendor payments that moved money (success or reversed), at their bank line.
-- A payment with no bill is an advance; a failed one never left the bank.
insert into lg_doc select 'vpy|' || v.id, v.slice_no, 'vendor_payment', v.id, b.posted_date,
  'Vendor payment ' || v.payment_number || ' by ' || v.channel, null
from public.nova_vendor_payments v join lg_btx b on b.doc = v.id and b.kind = 'vpay' and not b.dup;
-- Payable (or advance) down, bank down.
insert into lg_line
select 'vpy|' || v.id, x.code, x.amt, null
from public.nova_vendor_payments v
join lg_btx b on b.doc = v.id and b.kind = 'vpay' and not b.dup
cross join lateral (values (case when jsonb_array_length(v.bill_ids) > 0 then '2000' else '1150' end, b.debit),
  (b.gl, -b.debit)) x(code, amt);
-- A returned payment: the money came back, so the payable (or advance) is owed again.
insert into lg_doc select 'vrt|' || v.id, v.slice_no, 'vendor_payment', v.id, b.posted_date,
  'Return of vendor payment ' || v.payment_number || ' by the beneficiary bank', 'vpy|' || v.id
from public.nova_vendor_payments v join lg_btx b on b.doc = v.id and b.kind = 'vpay_return' and not b.dup;
-- Bank back up, payable (or advance) owed again.
insert into lg_line
select 'vrt|' || v.id, x.code, x.amt, null
from public.nova_vendor_payments v
join lg_btx b on b.doc = v.id and b.kind = 'vpay_return' and not b.dup
cross join lateral (values (b.gl, b.credit),
  (case when jsonb_array_length(v.bill_ids) > 0 then '2000' else '1150' end, -b.credit)) x(code, amt);

-- Expenses, at their bank line or from cash. TDS withheld is owed to the
-- government; GST is credit except on meals (s.17(5), as 008's GSTR-3B does),
-- split CGST/SGST because the spend is local.
create temp table lg_exp on commit drop as
select e.*, b.gl, b.debit as bank_amt, b.posted_date,
  (array['6100', '6110', '6120', '6130', '6150', '6160', '6170', '6180', '6190', '7000'])[array_position(
    array['rent', 'travel', 'software', 'utilities', 'office_supplies', 'professional_fees', 'marketing', 'meals', 'other', 'salaries'],
    e.category)] as code
from public.nova_expenses e
cross join lg_ctx c
left join lg_btx b on b.doc = e.id and b.kind = 'expense' and not b.dup
where e.expense_date <= c.as_of;
-- One entry per expense, on its bank date (or expense date if cash).
insert into lg_doc select 'exp|' || e.id, e.slice_no, 'expense', e.id, coalesce(e.posted_date, e.expense_date),
  'Expense ' || e.expense_number || ' - ' || coalesce(e.vendor_name, e.category), null
from lg_exp e;
-- Its lines.
insert into lg_line
select 'exp|' || e.id, x.code, x.amt, x.dep
from lg_exp e
cross join lateral (values
  -- The cost, carrying blocked meals GST.
  (e.code, e.amount + case when e.category = 'meals' then e.gst_amount else 0 end, e.department_id),
  -- Half the GST as CGST credit (none on meals).
  ('1310', case when e.category = 'meals' then 0 else round(e.gst_amount / 2, 2) end, null),
  -- The rest as SGST credit, so the two always sum to the GST.
  ('1311', case when e.category = 'meals' then 0 else e.gst_amount - round(e.gst_amount / 2, 2) end, null),
  -- TDS withheld from the vendor, owed to the government.
  ('2120', -e.tds_amount, null),
  -- Paid through the bank at the statement amount, else from cash.
  (coalesce(e.gl, '1000'), -coalesce(e.bank_amt, e.total_amount - e.tds_amount), null)) x(code, amt, dep)
where x.amt <> 0;

-- Payroll: one entry per department run at its bulk-upload line. Gross is the
-- cost; employer PF matches the employee share (008: challan = 2 × pf); net
-- leaves the payroll account; the withholdings are owed until their challans.
insert into lg_doc select 'prl|' || r.id, r.slice_no, 'payroll', r.id, r.pay_date,
  'Payroll ' || to_char(r.month, 'Mon YYYY') || ' - ' || d.name, null
from public.nova_payroll_runs r join public.nova_departments d on d.id = r.department_id
cross join lg_ctx c where r.pay_date <= c.as_of;
-- Its lines.
insert into lg_line
select 'prl|' || r.id, x.code, x.amt, x.dep
from public.nova_payroll_runs r
-- Left join: a run with zero net pay has no bank line and still books its cost.
left join lg_btx b on b.doc = r.id and b.kind = 'payroll' and not b.dup
cross join lateral (values ('7000', r.gross, r.department_id), ('7010', r.pf, r.department_id),
  (coalesce(b.gl, '1011'), -coalesce(b.debit, 0), null), ('2130', -2 * r.pf, null), ('2140', -r.esi, null),
  ('2120', -r.tds, null)) x(code, amt, dep)
where 'prl|' || r.id in (select ekey from lg_doc) and x.amt <> 0;

-- Statutory challans at their bank line. Each clears its liability; ESI's
-- employer share (not in payroll_runs) is booked here as the rest of the
-- challan over the employee ESI of that month's runs; late interest is a
-- finance cost; advance tax is a tax asset; GST goes to the portal cash ledger.
create temp table lg_stat on commit drop as
select s.*, b.gl, b.debit as bank_amt, b.posted_date,
  -- Employee ESI withheld in that month's payroll runs.
  coalesce((select sum(r.esi) from public.nova_payroll_runs r
    where r.slice_no = s.slice_no and to_char(r.month, 'YYYY-MM') = s.period), 0) as esi_emp
from public.nova_statutory_dues s
join lg_btx b on b.doc = s.id and b.kind = 'statutory' and not b.dup;
-- One entry per paid challan.
insert into lg_doc select 'sdu|' || s.id, s.slice_no, 'statutory', s.id, s.posted_date,
  upper(s.due_type) || ' challan for ' || s.period, null
from lg_stat s;
-- The liability (or asset) it settles, interest, and the bank leg.
insert into lg_line
select 'sdu|' || s.id, x.code, x.amt, null
from lg_stat s
cross join lateral (values
  (case s.due_type when 'gstr3b' then '1300' when 'tds' then '2120' when 'pf' then '2130' when 'esi' then '2140' else '1330' end,
   case when s.due_type = 'esi' then least(s.esi_emp, s.amount) else s.amount end),
  ('7020', case when s.due_type = 'esi' then s.amount - least(s.esi_emp, s.amount) else 0 end),
  ('8120', s.interest_paid),
  (s.gl, -s.bank_amt)) x(code, amt)
where x.amt <> 0;

-- Bank-only lines. Charges (maintenance, SMS, transfer charges, the A13
-- adjustment debits and cheque books) are bank charges.
insert into lg_doc select 'bch|' || b.id, b.slice_no, 'bank_charge', b.id, b.posted_date,
  case b.kind when 'charge' then 'Account maintenance or SMS charge' when 'txn_charge' then 'Outward transfer charge'
    when 'chqbook' then 'Cheque book issue charge' else 'Bank debit adjustment' end || ' - ref ' || coalesce(b.bank_ref, '-'), null
from lg_btx b where b.kind in ('charge', 'txn_charge', 'misc', 'chqbook') and not b.dup;
-- OD interest and working-capital drawdowns (the treasury's bare-key lines).
insert into lg_doc select case when b.debit > 0 then 'bin|' else 'wcd|' end || b.id, b.slice_no,
  case when b.debit > 0 then 'bank_interest' else 'loan_drawdown' end, b.id, b.posted_date,
  case when b.debit > 0 then 'Interest debited on the overdraft account' else 'Working-capital drawdown ' || coalesce(b.bank_ref, '') end, null
from lg_btx b where b.kind = 'tr_single' and not b.dup;
-- Unexplained credits (A14 bank side) are unapplied receipts until matched;
-- the tax refund reduces advance tax. Both are manual entries (no document).
insert into lg_doc select 'bmr|' || b.id, b.slice_no, 'manual', null, b.posted_date,
  case when b.kind = 'refund' then 'Income-tax refund credited' else 'Unidentified bank credit held as unapplied receipt' end
    || ' - ref ' || coalesce(b.bank_ref, '-'), null
from lg_btx b where b.kind in ('unknown_receipt', 'refund') and not b.dup;
-- One bank leg and one contra per single line.
insert into lg_line
select d.ekey, x.code, x.amt, null
from lg_doc d
join lg_btx b on b.id = substr(d.ekey, 5)
cross join lateral (values (b.gl, b.credit - b.debit),
  (case when d.source_type = 'bank_charge' then '8010' when d.source_type = 'bank_interest' then '8110'
        when d.source_type = 'loan_drawdown' then '2410' when b.kind = 'refund' then '1330' else '2050' end,
   b.debit - b.credit)) x(code, amt)
where substr(d.ekey, 1, 4) in ('bch|', 'bin|', 'wcd|', 'bmr|');

-- Internal transfers: the debit and credit legs of one treasury movement
-- (008 keys both on the same counter) are one entry between two bank GLs.
insert into lg_doc select 'itr|' || dr.id, dr.slice_no, 'internal_transfer', dr.id, dr.posted_date,
  'Transfer between own accounts - ref ' || coalesce(dr.bank_ref, '-'), null
from lg_btx dr join lg_btx cr on cr.doc = dr.doc and cr.kind = 'tr_cr' and not cr.dup
where dr.kind = 'tr_dr' and not dr.dup;
-- The receiving GL up, the sending GL down.
insert into lg_line
select 'itr|' || dr.id, x.code, x.amt, null
from lg_btx dr join lg_btx cr on cr.doc = dr.doc and cr.kind = 'tr_cr' and not cr.dup
cross join lateral (values (cr.gl, cr.credit), (dr.gl, -dr.debit)) x(code, amt)
where dr.kind = 'tr_dr' and not dr.dup;

-- Term-loan EMIs. The principal/interest split comes from 013's schedule,
-- which links every paid instalment to its original EMI line (the self-check
-- raises if any EMI line has no schedule row).
create temp table lg_emi (btx_id text primary key, lsc_id text, principal numeric(14,2), interest numeric(14,2)) on commit drop;
-- Term loan principal at the start of the book, from the same schedule.
create temp table lg_loan_open (slice_no integer primary key, amount numeric(14,2)) on commit drop;

-- Tier 2 sub-ledgers. 012 runs after 009, 010, 011 and 013 (contract §3.1),
-- so their tables always exist here; a missing one fails the file loudly.
-- Each paid instalment's EMI line, with its split (013 links the original line).
insert into lg_emi select s.bank_transaction_id, s.id, s.principal_due, s.interest_due
from public.nova_loan_schedules s where s.bank_transaction_id is not null;
-- Principal outstanding when the statement starts: the opening principal of
-- the first instalment whose EMI is on the statement (earlier ones were
-- paid before it began, so they are already inside this figure).
insert into lg_loan_open select distinct on (s.slice_no) s.slice_no, s.opening_principal
from public.nova_loan_schedules s
where s.bank_transaction_id is not null order by s.slice_no, s.due_date, s.id;

-- EMI entries at their NACH debit line.
insert into lg_doc select 'emi|' || b.id, b.slice_no, 'loan_emi', coalesce(e.lsc_id, b.id), b.posted_date,
  'Term loan EMI - ref ' || coalesce(b.bank_ref, '-'), null
from lg_btx b left join lg_emi e on e.btx_id = b.id
where b.kind = 'emi' and not b.dup;
-- Principal, interest and the bank leg.
insert into lg_line
select 'emi|' || b.id, x.code, x.amt, null
from lg_btx b left join lg_emi e on e.btx_id = b.id
cross join lateral (values ('2400', coalesce(e.principal, b.debit)), ('8100', coalesce(e.interest, 0)), (b.gl, -b.debit)) x(code, amt)
where b.kind = 'emi' and not b.dup and x.amt <> 0;

-- Gateway settlements (010): one entry per batch. Captures are online sales;
-- refunds and chargebacks (net of adjustments) are online returns; fees and
-- their GST are processing fees; the net payout waits in transit because
-- 008's statement has no payout credit (contract §10 G1).
-- Every batch dated inside the book.
insert into lg_doc select 'stl|' || s.id, s.slice_no, 'gateway_settlement', s.id, s.settlement_date,
  'Gateway settlement ' || s.settlement_ref || ' for ' || s.txn_count || ' transactions', null
from public.nova_settlements s cross join lg_ctx c where s.settlement_date <= c.as_of;
-- Its lines: the reported components, which always add up (010's CHECK).
insert into lg_line
select 'stl|' || s.id, x.code, x.amt, null
from public.nova_settlements s cross join lg_ctx c
cross join lateral (values ('1400', s.net_amount), ('8000', s.fees + s.gst_on_fees),
  ('4110', s.refunds + s.chargebacks - s.adjustments), ('4100', -s.gross_amount)) x(code, amt)
where s.settlement_date <= c.as_of and x.amt <> 0;

-- Corporate cards (009): one statement entry per card per month, approved
-- spend only, by merchant group. Card bills are never paid from a bank
-- account in 008 (contract §10 G2), so the payable carries the balance.
-- Approved spend with its account, per card and statement month.
create temp table lg_card on commit drop as
select t.slice_no, t.card_id, date_trunc('month', t.posted_date)::date as m, t.amount,
  -- Merchant group → account; a cash withdrawal is cash on hand, not spend.
  coalesce((array['6200', '6220', '6250', '6230', '6120', '6150', '6240', '6260', '6230', '1000'])[array_position(
    array['travel', 'lodging', 'fuel', 'restaurants', 'software', 'office', 'telecom', 'retail', 'entertainment', 'cash'],
    t.mcc_group)], '6190') as code
from public.nova_card_transactions t cross join lg_ctx c
where t.auth_status = 'approved' and t.posted_date <= c.as_of;
-- Statement entries, dated at month end (or the as-of date for the open month).
insert into lg_doc select distinct 'crd|' || x.card_id || '|' || x.m, x.slice_no, 'card_statement', x.card_id,
  least((x.m + interval '1 month')::date - 1, c.as_of), 'Corporate card statement ' || to_char(x.m, 'Mon YYYY'), null
from lg_card x cross join lg_ctx c;
-- Spend lines per account, and the payable for the statement total.
insert into lg_line
select 'crd|' || card_id || '|' || m, code, sum(amount), null from lg_card group by card_id, m, code
union all
select 'crd|' || card_id || '|' || m, '2200', -sum(amount), null from lg_card group by card_id, m;

-- Reimbursed expense claims (009): one entry per department per payroll run
-- that carried them, at the approved amount. The payout rides payroll day but
-- is in neither payroll net nor any bank line (contract §10 G3).
-- Reimbursed claims with their account per claim category.
create temp table lg_claim on commit drop as
select x.slice_no, x.department_id, x.payroll_run_id, x.reimbursed_on, x.approved_amount,
  coalesce((array['6200', '6200', '6210', '6220', '6230', '6230', '6240', '6250', '6150'])[array_position(
    array['travel_air', 'travel_rail', 'local_conveyance', 'hotel', 'meals', 'client_entertainment', 'telecom', 'fuel', 'office_supplies'],
    x.category)], '6190') as code
from public.nova_expense_claims x cross join lg_ctx c
where x.status = 'reimbursed' and x.reimbursed_on <= c.as_of and x.payroll_run_id is not null;
-- One batch entry per department and payroll run.
insert into lg_doc select 'ecl|' || payroll_run_id || '|' || department_id, min(slice_no), 'expense_claim', payroll_run_id,
  max(reimbursed_on), 'Reimbursed expense claims with payroll - ' || count(*) || ' claims', null
from lg_claim group by payroll_run_id, department_id;
-- Cost per account (with the department), and the payable.
insert into lg_line
select 'ecl|' || payroll_run_id || '|' || department_id, code, sum(approved_amount), department_id
from lg_claim group by payroll_run_id, department_id, code
union all
select 'ecl|' || payroll_run_id || '|' || department_id, '2210', -sum(approved_amount), null
from lg_claim group by payroll_run_id, department_id;

-- -----------------------------------------------------------------------------
-- Opening balances, dated the first day of the book. The bank statement's
-- opening balance is the balance on the morning of its first line (008), and
-- the statement starts inside the first period, so the migrated opening sits
-- before every line. Also migrated: a cash float big enough that cash on hand
-- never goes negative, and the term-loan principal then outstanding (013).
-- Equity is the balancing figure (contract §4.5).
-- -----------------------------------------------------------------------------
create temp table lg_cash on commit drop as
-- The float: the deepest the cash book would dip, rounded up, plus Rs 20,000.
select x.slice_no, ceil(greatest(0, -min(x.cum)) / 10000) * 10000 + 20000 as float_amt
-- Running cash balance at the end of each day that moves cash.
from (select d.slice_no, d.entry_date, sum(sum(l.amt)) over (partition by d.slice_no order by d.entry_date) as cum
      from lg_doc d join lg_line l on l.ekey = d.ekey where l.code = '1000' group by d.slice_no, d.entry_date) x
group by x.slice_no;

insert into lg_doc select 'opn|' || s.slice_no, s.slice_no, 'opening_balance', null, c.p0,
  'Opening balances migrated from the previous accounting system', null
from lg_slice s cross join lg_ctx c;
insert into lg_line
-- Each bank account at its statement opening balance (an OD opens in credit).
select 'opn|' || a.slice_no, g.code, a.opening_balance, null
from public.nova_bank_accounts a join lg_bankgl g on g.account_id = a.id where a.opening_balance <> 0
union all
-- The office cash float.
select 'opn|' || s.slice_no, '1000', coalesce(k.float_amt, 20000), null
from lg_slice s left join lg_cash k on k.slice_no = s.slice_no
union all
-- The term loan then outstanding.
select 'opn|' || o.slice_no, '2400', -o.amount, null from lg_loan_open o where o.amount <> 0;
-- Equity balances whatever the migrated lines add up to.
insert into lg_line
select l.ekey, '3000', -sum(l.amt), null from lg_line l where l.ekey like 'opn|%' group by l.ekey having sum(l.amt) <> 0;

-- -----------------------------------------------------------------------------
-- A19 plants and decoys (contract §6), chosen by a per-slice md5 rank among
-- the document entries of the detail window, so each company plants on
-- different documents at different positions. They are applied to the lines
-- here, before summaries and depreciation, so the rest of the book follows.
-- -----------------------------------------------------------------------------
create temp table lg_a19 (slice_no integer, pattern text, ekey text, bill_id text, is_decoy boolean, note text) on commit drop;

-- (a) Unbalanced: an expense entry whose cost line has two adjacent digits
-- transposed (a keying error), so debits no longer equal credits. Each
-- candidate cost line (>= Rs 1,000) gets its transposed amount: the digit
-- pair is a hashed pick among pairs that differ, never making a leading zero.
create temp table lg_swap on commit drop as
select d.slice_no, d.ekey, l.code, l.dep, l.amt,
  (left(q.s, pp.p - 1) || substr(q.s, pp.p + 1, 1) || substr(q.s, pp.p, 1) || substr(q.s, pp.p + 2))::numeric
    + (l.amt - trunc(l.amt)) as new_amt
from lg_doc d cross join lg_ctx c
join lg_line l on l.ekey = d.ekey and l.dep is not null and l.amt >= 1000
-- The integer rupees as digits.
cross join lateral (select trunc(l.amt)::text as s) q
-- The swap position; no row when no pair qualifies (e.g. 1000), which drops the candidate.
cross join lateral (select p from generate_series(1, length(q.s) - 1) p
  where substr(q.s, p, 1) <> substr(q.s, p + 1, 1) and not (p = 1 and substr(q.s, 2, 1) = '0')
  order by pg_temp.h(d.ekey || 'pos' || p) limit 1) pp
where d.source_type = 'expense' and d.entry_date >= c.detail_from;
-- Two per slice, by md5 rank.
insert into lg_a19
select x.slice_no, 'a', x.ekey, null, false,
  'Entry does not balance: one debit line has two adjacent digits transposed against its source expense.'
from (select w.slice_no, w.ekey, row_number() over (partition by w.slice_no order by pg_temp.h('a19a' || w.ekey)) as rk
      from lg_swap w) x
where x.rk <= 2;
-- Its decoy: an invoice whose paisa difference went to Round-off (<= Re 1):
-- it looks unbalanced until the Round-off line is read, and it balances.
insert into lg_a19
select x.slice_no, 'a', x.ekey, null, true,
  'Balanced: the sales line is short by under one rupee and a Round-off line carries the difference.'
from (select d.slice_no, d.ekey, row_number() over (partition by d.slice_no order by pg_temp.h('a19ad' || d.ekey)) as rk
      from lg_doc d cross join lg_ctx c where d.source_type = 'invoice' and d.entry_date >= c.detail_from) x
where x.rk = 1;

-- The transposition itself, on the chosen entries' cost lines.
update lg_line l set amt = w.new_amt
from lg_swap w join lg_a19 a on a.ekey = w.ekey and a.pattern = 'a' and not a.is_decoy
where l.ekey = w.ekey and l.code = w.code and l.dep = w.dep;
-- The decoy's round-off: 1–99 paise moved from Sales to Round-off.
insert into lg_line
select l.ekey, x.code, x.amt, null
from lg_line l join lg_a19 a on a.ekey = l.ekey and a.pattern = 'a' and a.is_decoy
cross join lateral (select round(0.01 + floor(pg_temp.h(l.ekey || 'ro') * 99) / 100, 2) as r) r
cross join lateral (values (l.code, r.r), ('8900', -r.r)) x(code, amt)
where l.code like '400_';

-- (b) Capex as opex: a bill whose capitalisable line (>= Rs 10,000 per unit)
-- was posted to an expense account instead of fixed assets.
insert into lg_a19
select x.slice_no, 'b', x.ekey, x.source_id, false,
  'An asset-type item at or above the Rs 10,000 per unit threshold was expensed instead of capitalised.'
from (select d.slice_no, d.ekey, d.source_id, row_number() over (partition by d.slice_no order by pg_temp.h('a19b' || d.ekey)) as rk
      from lg_doc d cross join lg_ctx c
      where d.source_type = 'purchase_bill' and d.entry_date >= c.detail_from
        and exists (select 1 from lg_line l where l.ekey = d.ekey and l.code in ('1500', '1510', '1520'))) x
where x.rk <= 2;
-- Its decoy: a bill that expensed an asset-type item below the threshold,
-- which is the posting rule working.
insert into lg_a19
select x.slice_no, 'b', x.ekey, x.source_id, true,
  'Asset-type item below the Rs 10,000 per unit capitalisation threshold: expensing it is the policy.'
from (select d.slice_no, d.ekey, d.source_id, row_number() over (partition by d.slice_no order by pg_temp.h('a19bd' || d.ekey)) as rk
      from lg_doc d cross join lg_ctx c
      where d.source_type = 'purchase_bill' and d.entry_date >= c.detail_from
        and exists (select 1 from lg_line l where l.ekey = d.ekey and l.code = '6400')
        -- Never one of the two plants themselves.
        and d.ekey not in (select a.ekey from lg_a19 a where a.pattern = 'b')) x
where x.rk = 1;
-- The misposting: the fixed-asset line becomes minor equipment.
update lg_line l set code = '6400'
from lg_a19 a where a.ekey = l.ekey and a.pattern = 'b' and not a.is_decoy and l.code in ('1500', '1510', '1520');

-- -----------------------------------------------------------------------------
-- Depreciation: one entry per month end inside the book, a line per class.
-- Straight line from the month after purchase: IT 36 months, furniture 120,
-- plant 96, on the cost capitalised before the month began.
-- -----------------------------------------------------------------------------
-- Cost capitalised per slice, class and month, aggregated once.
create temp table lg_fa on commit drop as
select d.slice_no, l.code, date_trunc('month', d.entry_date)::date as m, sum(l.amt) as cost
from lg_line l join lg_doc d on d.ekey = l.ekey where l.code in ('1500', '1510', '1520') group by 1, 2, 3;
-- Each month's charge on the cost capitalised in earlier months.
create temp table lg_dep on commit drop as
select s.slice_no, m.m, k.fa, k.ad,
  round(coalesce((select sum(f.cost) from lg_fa f where f.slice_no = s.slice_no and f.code = k.fa and f.m < m.m), 0) / k.life, 2) as dep
from lg_slice s cross join lg_month m cross join lg_ctx c
cross join (values ('1500', '1505', 36), ('1510', '1515', 120), ('1520', '1525', 96)) k(fa, ad, life)
where (m.m + interval '1 month')::date - 1 <= c.as_of;
insert into lg_doc select distinct 'dep|' || slice_no || '|' || m, slice_no, 'depreciation', null, (m + interval '1 month')::date - 1,
  'Depreciation for ' || to_char(m, 'Mon YYYY'), null
from lg_dep group by slice_no, m having sum(dep) > 0;
insert into lg_line
select 'dep|' || slice_no || '|' || m, ad, -dep, null from lg_dep where dep > 0
union all
select 'dep|' || slice_no || '|' || m, '8200', sum(dep), null from lg_dep group by slice_no, m having sum(dep) > 0;

-- -----------------------------------------------------------------------------
-- Month-end accruals: utilities not yet billed, estimated at 50–90% of the
-- slice's average monthly utilities spend, reversed on the 1st.
-- -----------------------------------------------------------------------------
-- Utilities spend per slice for the year, aggregated once.
create temp table lg_util on commit drop as
select d.slice_no, sum(l.amt) as amt from lg_line l join lg_doc d on d.ekey = l.ekey where l.code = '6130' group by 1;
-- One accrual per month end inside the book.
create temp table lg_acr on commit drop as
select s.slice_no, m.m,
  greatest(5000, round(coalesce(u.amt, 0) / 12 * (0.5 + 0.4 * pg_temp.h('acr' || s.slice_no || m.m)), -2)) as amt
from lg_slice s cross join lg_month m cross join lg_ctx c
left join lg_util u on u.slice_no = s.slice_no
where (m.m + interval '1 month')::date - 1 <= c.as_of;
insert into lg_doc select 'acr|' || slice_no || '|' || m, slice_no, 'accrual', null, (m + interval '1 month')::date - 1,
  'Accrual: utilities for ' || to_char(m, 'Mon YYYY') || ' not yet billed', null
from lg_acr;
-- The reversal, when the 1st of the next month is inside the book.
insert into lg_doc select 'acv|' || a.slice_no || '|' || a.m, a.slice_no, 'accrual', null, (a.m + interval '1 month')::date,
  'Reversal of the utilities accrual for ' || to_char(a.m, 'Mon YYYY'), 'acr|' || a.slice_no || '|' || a.m
from lg_acr a cross join lg_ctx c where (a.m + interval '1 month')::date <= c.as_of;
insert into lg_line
select 'acr|' || slice_no || '|' || m, x.code, x.amt, null from lg_acr cross join lateral (values ('6130', amt), ('2300', -amt)) x(code, amt)
union all
select d.ekey, x.code, x.amt, null from lg_doc d join lg_acr a on d.reverses = 'acr|' || a.slice_no || '|' || a.m
cross join lateral (values ('6130', -a.amt), ('2300', a.amt)) x(code, amt);

-- (c) decoy: an approved post-close audit adjustment. Dated the last day of
-- the first closed month of the detail window, it reclassifies servicing
-- booked under other services to repairs and maintenance.
insert into lg_doc select 'aud|' || s.slice_no, s.slice_no, 'manual', null, (c.detail_from + interval '1 month')::date - 1,
  'Audit adjustment: reclassify machinery servicing from other contracted services to repairs', null
from lg_slice s cross join lg_ctx c;
insert into lg_line
select 'aud|' || s.slice_no, x.code, x.amt, null
from lg_slice s cross join lateral (select round(5000 + 35000 * pg_temp.h('aud' || s.slice_no), -2) as a) a
cross join lateral (values ('6340', a.a), ('6390', -a.a)) x(code, amt);
insert into lg_a19 select slice_no, 'c', 'aud|' || slice_no, null, true,
  'Posted after the period closed, but approved by the controller who closed it: an audit adjustment.'
from lg_slice;

-- -----------------------------------------------------------------------------
-- Pass 3: migrated history. Every document entry dated before the detail
-- window becomes part of one monthly_summary entry per source type per
-- month, dated at month end: the lines are the per-account net of that
-- month's documents, so every balance, per month, is exactly what the
-- document entries would have given. Opening, depreciation and accrual
-- entries are ledger-native and stay as they are.
-- -----------------------------------------------------------------------------
create temp table lg_edoc (ekey text primary key, slice_no integer not null, source_type text not null, source_id text,
  entry_date date not null, narration text not null, reverses text, summary_of text) on commit drop;
create temp table lg_eline (ekey text not null, code text not null, dep text, amt numeric(14,2) not null) on commit drop;

-- Which document entries are summarised.
create temp table lg_old on commit drop as
select d.* from lg_doc d cross join lg_ctx c
where d.entry_date < c.detail_from and d.source_type not in ('opening_balance', 'depreciation', 'accrual');

-- Entries kept as they are, with their lines netted per account and department.
insert into lg_edoc select d.ekey, d.slice_no, d.source_type, d.source_id, d.entry_date, d.narration, d.reverses, null
from lg_doc d where d.ekey not in (select ekey from lg_old);
insert into lg_eline select l.ekey, l.code, l.dep, sum(l.amt) from lg_line l
where l.ekey in (select ekey from lg_edoc) group by l.ekey, l.code, l.dep having sum(l.amt) <> 0;

-- One summary per slice, month and source type; a reversal pair summarised
-- together nets out, so no summary needs a reversal link.
insert into lg_edoc select distinct on (x.k) x.k, x.slice_no, 'monthly_summary', null, x.me,
  'Monthly summary of ' || replace(x.source_type, '_', ' ') || ' entries for ' || to_char(x.m, 'Mon YYYY') || ', migrated', null, x.source_type
from (select 'sum|' || d.slice_no || '|' || date_trunc('month', d.entry_date)::date || '|' || d.source_type as k, d.slice_no,
        d.source_type, date_trunc('month', d.entry_date)::date as m,
        (date_trunc('month', d.entry_date) + interval '1 month')::date - 1 as me
      from lg_old d) x;
insert into lg_eline
select 'sum|' || d.slice_no || '|' || date_trunc('month', d.entry_date)::date || '|' || d.source_type, l.code, null, sum(l.amt)
from lg_old d join lg_line l on l.ekey = d.ekey
group by d.slice_no, date_trunc('month', d.entry_date), d.source_type, l.code having sum(l.amt) <> 0;
-- A summary whose lines all netted to zero has nothing to say.
delete from lg_edoc e where e.source_type = 'monthly_summary' and not exists (select 1 from lg_eline l where l.ekey = e.ekey);

-- -----------------------------------------------------------------------------
-- Entries of more than 12 lines (the contract's maximum) are split into
-- balanced parts: the largest line is the pivot; the other lines go 11 to a
-- part, and each part gets a pivot line that balances it. The parts' pivot
-- lines add up to the original pivot line, so balances do not change.
-- -----------------------------------------------------------------------------
create temp table lg_big on commit drop as
select ekey from lg_eline group by ekey having count(*) > 12;
create temp table lg_piv on commit drop as
select distinct on (l.ekey) l.ekey, l.code, l.dep from lg_eline l join lg_big b on b.ekey = l.ekey
order by l.ekey, abs(l.amt) desc, l.code, l.dep;
create temp table lg_part on commit drop as
select l.*, (row_number() over (partition by l.ekey order by l.code, l.dep) - 1) / 11 + 1 as part
from lg_eline l join lg_piv p on p.ekey = l.ekey
where not (l.code = p.code and l.dep is not distinct from p.dep);
-- The parts as entries, numbered "part i of n" in the narration.
insert into lg_edoc select e.ekey || '#' || p.part, e.slice_no, e.source_type, e.source_id, e.entry_date,
  e.narration || ' (part ' || p.part || ' of ' || max(p.part) over (partition by e.ekey) || ')', e.reverses, e.summary_of
from lg_edoc e join (select distinct ekey, part from lg_part) p on p.ekey = e.ekey;
insert into lg_eline
select ekey || '#' || part, code, dep, amt from lg_part
union all
select p.ekey || '#' || p.part, v.code, v.dep, -sum(p.amt) from lg_part p join lg_piv v on v.ekey = p.ekey
group by p.ekey, p.part, v.code, v.dep having sum(p.amt) <> 0;
-- The unsplit originals go.
delete from lg_eline where ekey in (select ekey from lg_big);
delete from lg_edoc where ekey in (select ekey from lg_big);

-- -----------------------------------------------------------------------------
-- Journal entries. Keyed 0–5 days after the entry date in office hours, before
-- the period's close and never after the as-of evening; keyed by an
-- accountant employed on that date; controller-approved when ledger-native.
-- -----------------------------------------------------------------------------
create temp table lg_staff on commit drop as
select e.slice_no, e.id, e.join_date, e.exit_date
from public.nova_employees e join lg_fin f on f.slice_no = e.slice_no and e.id = any(f.staff);

create temp table lg_je on commit drop as
select 'jnl_' || left(md5('jnl|' || e.ekey), 12) as id, e.*, p.id as period_id, p.closed_at, p.closed_by, f.controller,
  -- The keying time before any clamp: day offset and minutes after 10:00 IST.
  ((e.entry_date + floor(pg_temp.h(e.ekey || 'pd') * 6)::int) + time '10:00'
    + make_interval(mins => floor(pg_temp.h(e.ekey || 'pm') * 540)::int)) at time zone 'Asia/Kolkata' as raw_posted,
  -- An accountant on the rolls that day, else the controller.
  coalesce((select s.id from lg_staff s where s.slice_no = e.slice_no and s.join_date <= e.entry_date
    and (s.exit_date is null or s.exit_date >= e.entry_date) order by pg_temp.h(e.ekey || s.id) limit 1), f.controller) as posted_by
from lg_edoc e
join public.nova_accounting_periods p on p.slice_no = e.slice_no and e.entry_date between p.start_date and p.end_date
join lg_fin f on f.slice_no = e.slice_no;

-- Lookups by entry key and by the key an entry reverses.
create index on lg_je (ekey);
create index on lg_je (reverses);
analyze lg_je;

-- (c) Closed-period posting: two document entries of a closed month in the
-- detail window keyed after that month closed, with no approval. Only months
-- closed at least a day before the as-of evening qualify, so the late keying
-- time still falls inside the book.
insert into lg_a19
select x.slice_no, 'c', x.ekey, null, false,
  'Keyed after its period was closed, without the controller''s approval.'
from (select j.slice_no, j.ekey, row_number() over (partition by j.slice_no order by pg_temp.h('a19c' || j.ekey)) as rk
      from lg_je j cross join lg_ctx c
      where j.source_type in ('expense', 'purchase_bill', 'invoice') and j.entry_date >= c.detail_from and j.closed_at is not null
        and j.closed_at + interval '1 day 2 hours' < (c.as_of + time '19:00') at time zone 'Asia/Kolkata'
        and j.ekey not in (select ekey from lg_a19)) x
where x.rk <= 2;

-- The journal itself.
insert into public.nova_journal_entries (id, slice_no, entry_number, entry_date, period_id, posted_at, posted_by, source_type,
  source_id, lines, total_debit, total_credit, narration, status, reversal_of, approved_by)
select j.id, j.slice_no,
  -- JV-<YYMM>-<n>: numbered in date order inside each month.
  'JV-' || to_char(j.entry_date, 'YYMM') || '-' || lpad(row_number() over (partition by j.slice_no, date_trunc('month', j.entry_date)
    order by j.entry_date, j.id)::text, 4, '0'),
  j.entry_date, j.period_id,
  case
    -- A19(c) plants and the approved decoy: 1–8 days after the close.
    when a.pattern = 'c' then least(j.closed_at + make_interval(days => 1 + floor(pg_temp.h(j.ekey || 'late') * 8)::int, hours => 2),
      (c.as_of + time '19:00') at time zone 'Asia/Kolkata')
    -- Everything else: before the close and the as-of evening.
    else least(j.raw_posted, coalesce(j.closed_at - interval '1 hour', j.raw_posted), (c.as_of + time '19:00') at time zone 'Asia/Kolkata') end,
  j.posted_by, j.source_type, j.source_id, l.lines, l.dr, l.cr, j.narration,
  -- Reversed when a later entry undoes it.
  case when exists (select 1 from lg_je r where r.reverses = j.ekey) then 'reversed' else 'posted' end,
  (select r.id from lg_je r where r.ekey = j.reverses),
  -- Ledger-native entries and the audit adjustment carry the controller's approval.
  case when j.source_type in ('opening_balance', 'monthly_summary', 'depreciation', 'accrual') or j.ekey like 'aud|%'
    then j.controller end
from lg_je j
cross join lg_ctx c
left join lg_a19 a on a.ekey = j.ekey and a.pattern = 'c'
-- Lines as compact JSON: debits first, then credits, by account.
join (select ekey, jsonb_agg(pg_temp.jl(code, amt, dep) order by amt < 0, code, dep) as lines,
        sum(greatest(amt, 0)) as dr, sum(greatest(-amt, 0)) as cr
      from lg_eline group by ekey) l on l.ekey = j.ekey;

-- -----------------------------------------------------------------------------
-- Ground truth (contract §6): every A19 plant and decoy, resource =
-- journal-entries; A19(b) also names the bill.
-- -----------------------------------------------------------------------------
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select a.slice_no, 'A19', 'journal-entries',
  case when a.bill_id is not null then array[j.id, a.bill_id] else array[j.id] end,
  'A19-' || a.pattern || '-' || j.id,
  case a.pattern when 'a' then 'easy' else 'hard' end, a.is_decoy, a.note
from lg_a19 a join lg_je j on j.ekey = a.ekey;

-- -----------------------------------------------------------------------------
-- Read views. security_invoker so a view never bypasses RLS; dropped and
-- recreated because a view's column list freezes at creation.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_chart_of_accounts_v, public.nova_accounting_periods_v, public.nova_journal_entries_v;
create view public.nova_chart_of_accounts_v with (security_invoker = true) as select * from public.nova_chart_of_accounts;
create view public.nova_accounting_periods_v with (security_invoker = true) as select * from public.nova_accounting_periods;
create view public.nova_journal_entries_v with (security_invoker = true) as select * from public.nova_journal_entries;

-- Lockdown, as in 001: RLS on with no policies, anon/authenticated revoked,
-- service_role only — tables and views alike.
alter table public.nova_chart_of_accounts enable row level security;
alter table public.nova_accounting_periods enable row level security;
alter table public.nova_journal_entries enable row level security;
revoke all on public.nova_chart_of_accounts, public.nova_accounting_periods, public.nova_journal_entries,
  public.nova_chart_of_accounts_v, public.nova_accounting_periods_v, public.nova_journal_entries_v from anon, authenticated;
grant select, insert, update, delete on public.nova_chart_of_accounts, public.nova_accounting_periods, public.nova_journal_entries to service_role;
grant select on public.nova_chart_of_accounts_v, public.nova_accounting_periods_v, public.nova_journal_entries_v to service_role;

-- -----------------------------------------------------------------------------
-- Self-check (contract §2.2.2). Raises, rolling the whole file back, if any
-- soft reference fails to resolve in the same slice, or if the ledger breaks
-- one of its own invariants, so a rerun after an upstream change fails loudly.
-- -----------------------------------------------------------------------------
do $chk$
declare
  -- One failure count at a time, and the map of id prefixes to their tables.
  n bigint; r record;
begin
  -- Every statement line was traced to its event (pass 1).
  select count(*) into n from public.nova_bank_transactions t where not exists (select 1 from lg_btx b where b.id = t.id);
  if n > 0 then raise exception '012 self-check: % bank lines match no 008 event', n; end if;
  -- Every non-cash receipt and bank-paid expense found its bank line.
  select count(*) into n from lg_rcpt where method <> 'cash' and gl is null;
  if n > 0 then raise exception '012 self-check: % non-cash receipts have no bank line', n; end if;
  select count(*) into n from lg_exp where payment_method <> 'cash' and gl is null and total_amount - tds_amount > 0;
  if n > 0 then raise exception '012 self-check: % bank-paid expenses have no bank line', n; end if;
  -- The EMI split, where 013 gives one, adds up to the debit.
  select count(*) into n from lg_emi e join lg_btx b on b.id = e.btx_id where e.principal + e.interest <> b.debit;
  if n > 0 then raise exception '012 self-check: % EMI splits differ from their bank debit', n; end if;
  -- Every posted EMI line has its 013 schedule row, so no EMI falls back to all-principal.
  select count(*) into n from lg_btx b where b.kind = 'emi' and not b.dup and not exists (select 1 from lg_emi e where e.btx_id = b.id);
  if n > 0 then raise exception '012 self-check: % EMI lines have no 013 schedule row', n; end if;

  -- Soft references in the chart and the periods.
  select count(*) into n from public.nova_chart_of_accounts c where c.bank_account_id is not null
    and not exists (select 1 from public.nova_bank_accounts a where a.id = c.bank_account_id and a.slice_no = c.slice_no);
  if n > 0 then raise exception '012 self-check: % chart bank_account_id unresolved', n; end if;
  select count(*) into n from public.nova_accounting_periods p where p.closed_by is not null
    and not exists (select 1 from public.nova_employees e where e.id = p.closed_by and e.slice_no = p.slice_no);
  if n > 0 then raise exception '012 self-check: % period closed_by unresolved', n; end if;
  -- posted_by and approved_by.
  select count(*) into n from public.nova_journal_entries j
    where not exists (select 1 from public.nova_employees e where e.id = j.posted_by and e.slice_no = j.slice_no)
       or (j.approved_by is not null and not exists (select 1 from public.nova_employees e where e.id = j.approved_by and e.slice_no = j.slice_no));
  if n > 0 then raise exception '012 self-check: % journal posted_by/approved_by unresolved', n; end if;
  -- source_id, by its prefix, to the table that owns that prefix.
  for r in select * from (values ('inv_', 'nova_invoices'), ('crn_', 'nova_credit_notes'), ('pay_', 'nova_payments'),
      ('bil_', 'nova_purchase_bills'), ('vpy_', 'nova_vendor_payments'), ('exp_', 'nova_expenses'), ('prl_', 'nova_payroll_runs'),
      ('sdu_', 'nova_statutory_dues'), ('btx_', 'nova_bank_transactions'), ('lsc_', 'nova_loan_schedules'),
      ('stl_', 'nova_settlements'), ('ccd_', 'nova_corporate_cards')) m(prefix, tbl) loop
    -- Every upstream table exists in run order, so each prefix is resolved against it.
    execute format('select count(*) from public.nova_journal_entries j where left(j.source_id, 4) = %L
      and not exists (select 1 from public.%I t where t.id = j.source_id and t.slice_no = j.slice_no)', r.prefix, r.tbl) into n;
    if n > 0 then raise exception '012 self-check: % source_id % unresolved', n, r.prefix; end if;
  end loop;
  -- No source_id with a prefix outside that map.
  select count(*) into n from public.nova_journal_entries j where j.source_id is not null
    and left(j.source_id, 4) not in ('inv_', 'crn_', 'pay_', 'bil_', 'vpy_', 'exp_', 'prl_', 'sdu_', 'btx_', 'lsc_', 'stl_', 'ccd_');
  if n > 0 then raise exception '012 self-check: % source_id with an unknown prefix', n; end if;
  -- Line accounts exist in the slice's chart; line departments in the slice.
  select count(*) into n from public.nova_journal_entries j cross join lateral jsonb_array_elements(j.lines) x
    where not exists (select 1 from public.nova_chart_of_accounts c where c.slice_no = j.slice_no and c.account_code = x ->> 'account_code')
       or (x ? 'department_id' and not exists (select 1 from public.nova_departments d where d.id = x ->> 'department_id' and d.slice_no = j.slice_no));
  if n > 0 then raise exception '012 self-check: % journal lines with an unknown account or department', n; end if;

  -- Double entry: every entry balances except the A19(a) plants, which do not.
  select count(*) into n from lg_je j join public.nova_journal_entries e on e.id = j.id
    where (e.total_debit = e.total_credit) = exists (select 1 from lg_a19 a where a.ekey = j.ekey and a.pattern = 'a' and not a.is_decoy);
  if n > 0 then raise exception '012 self-check: % entries break the balance rule', n; end if;
  -- Every bank GL equals its statement at the as-of date, A13 copies excluded.
  select count(*) into n from lg_bankgl g
    join public.nova_bank_accounts a on a.id = g.account_id
    left join (select j.slice_no, x ->> 'account_code' as code, sum((x ->> 'debit')::numeric - (x ->> 'credit')::numeric) as bal
               from public.nova_journal_entries j cross join lateral jsonb_array_elements(j.lines) x group by 1, 2) gl
      on gl.slice_no = g.slice_no and gl.code = g.code
    where coalesce(gl.bal, 0) <> a.opening_balance + coalesce((select sum(b.credit - b.debit) from lg_btx b
      where b.account_id = g.account_id and not b.dup), 0);
  if n > 0 then raise exception '012 self-check: % bank GL accounts disagree with the statement', n; end if;
end
$chk$;

-- Temp tables and pg_temp helpers vanish with the transaction and session.
commit;
