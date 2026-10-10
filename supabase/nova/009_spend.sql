-- STATUS: VERIFIED 2026-09-30
-- =============================================================================
-- Nova Tier 2 pack 2b: employee spend (docs/nova-tier2-build-contract.md §4.1).
-- Owner: spend builder. Runs FIRST of the Tier 2 files, right after 008:
--   001 → 003 → 004 → 005 → 002 → 006 → 007 → 008 → 009 → 010 → 011 → 013 → 012
-- because it reads Tier 0/1 only (005 employees and departments, 002 expenses
-- and clients, 008 payroll runs for the reimbursement date) and no Tier 2 file.
--
-- Creates six tables, each with one security_invoker read view:
--   nova_spend_policies     the limits claims, cards and subscriptions are checked against
--   nova_leave_records      leave, so a claim on a leave day can be spotted
--   nova_expense_claims     out-of-pocket claims, reimbursed through payroll
--   nova_corporate_cards    the company card programme
--   nova_card_transactions  every card authorisation, approved or declined
--   nova_subscriptions      recurring services, bank-billed and card-billed
--
-- Plants (contract §6): A15 expense-claim abuse, A16 card misuse, A17
-- duplicate or zombie subscription, each with decoys, recorded ONLY in
-- nova_ground_truth. Every plant is made by mutating or adding rows inside the
-- normal generation, before claim numbers are assigned, so no id, number or
-- position gives it away.
--
-- Cross-file references (employees, departments, clients, vendors, payroll
-- runs) are SOFT: indexed text with no FK (contract §2.2.1), because 005/002
-- truncate with CASCADE and 008 truncates without it; an FK would either be
-- emptied or block their rerun. The do-block at the end proves every soft
-- reference resolves to a row in the same slice, or rolls the whole file back.
--
-- Deterministic: every choice is pg_temp.h(<stable key>), an md5 roll, so no
-- value depends on plan shape. Re-runnable: truncates only its own six tables
-- (no CASCADE) and deletes only A15/A16/A17 from nova_ground_truth.
-- =============================================================================

-- One transaction: a failure (including the final self-check) leaves the
-- previous build of these tables intact.
begin;

-- Pins random() for anything that reaches for it; the file itself uses h().
select setseed(0.909);

-- Parallel plans could reorder anything order-sensitive; keep one worker.
set local max_parallel_workers_per_gather = 0;

-- -----------------------------------------------------------------------------
-- Tables. Conventions (contract §2.1): text ids with a checked prefix,
-- slice_no on every row, money numeric(14,2), timestamptz, text + CHECK.
-- -----------------------------------------------------------------------------

-- The rulebook: one row per limit a claim, card or subscription is held to.
create table if not exists public.nova_spend_policies (
  -- 12-hex deterministic id keyed on slice and policy code.
  id text primary key check (id like 'spp\_%'),
  -- The team partition (contract §2.2.3: no global tables).
  slice_no integer not null check (slice_no >= 0),
  -- Human code, e.g. HTL-G4-G5; unique per company (constraint below).
  policy_code text not null,
  -- Which sub-ledger the rule governs.
  applies_to text not null check (applies_to in ('expense_claim', 'card_transaction', 'subscription')),
  -- The claim category, card MCC group ('all' = the whole card), or subscription category.
  category text not null,
  -- Inclusive grade band; both null = every grade.
  grade_min text check (grade_min ~ '^G[1-8]$'),
  grade_max text check (grade_max ~ '^G[1-8]$'),
  -- Soft ref to nova_departments (005); null = company-wide.
  department_id text,
  -- What the limit is measured over.
  limit_basis text not null check (limit_basis in ('per_item', 'per_day', 'per_month')),
  -- The cap itself; null where the rule is not a money cap (e.g. hours only).
  limit_amount numeric(14,2) check (limit_amount > 0),
  -- A bill must be attached above this amount; below it a claim may go without.
  receipt_required_above numeric(14,2) check (receipt_required_above >= 0),
  -- MCCs a card must never be approved on (bars, betting, jewellery, cash).
  blocked_mcc text[],
  -- 'HH:MM-HH:MM' IST window in which the category may be used.
  allowed_hours text check (allowed_hours ~ '^[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]$'),
  -- Approvals needed before payment.
  approval_levels integer not null check (approval_levels between 1 and 3),
  -- Validity window; a revision closes the old row and opens a new one.
  effective_from date not null,
  effective_to date,
  -- Templated plain-language summary.
  description text not null,
  -- Not part of the md5 check (contract §4 notation).
  created_at timestamptz not null default now(),
  -- A code names one rule per company.
  constraint nova_spend_policies_code_key unique (slice_no, policy_code),
  -- A band never runs backwards (G-codes compare correctly as text: one digit).
  constraint nova_spend_policies_band check (grade_min is null or grade_max is null or grade_min <= grade_max),
  -- A closed rule ends on or after it began.
  constraint nova_spend_policies_dates check (effective_to is null or effective_to >= effective_from)
);

-- Leave taken or applied for. A claim for local travel on an approved leave
-- day is one of the A15 signals, so leave must exist beside the claims.
create table if not exists public.nova_leave_records (
  id text primary key check (id like 'lvr\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Soft ref to nova_employees (005): who is away.
  employee_id text not null,
  -- The five Indian leave kinds an SME tracks.
  leave_type text not null check (leave_type in ('earned', 'sick', 'casual', 'unpaid', 'comp_off')),
  -- Inclusive range of calendar days away.
  start_date date not null,
  end_date date not null,
  -- Working days charged; halves allowed (0.5 = half day).
  days numeric(4,1) not null check (days > 0 and days * 2 = floor(days * 2)),
  -- Only 'approved' leave means the person was really away.
  status text not null check (status in ('approved', 'rejected', 'cancelled', 'pending')),
  -- When the request was raised; sick leave may be applied for afterwards.
  applied_at timestamptz not null,
  -- Soft ref to nova_employees: the manager who decided; null while undecided.
  approved_by text,
  created_at timestamptz not null default now(),
  -- A leave never ends before it starts.
  constraint nova_leave_records_dates check (end_date >= start_date),
  -- A decision has a decider; an undecided or withdrawn request has none.
  constraint nova_leave_records_approver check ((status in ('approved', 'rejected')) = (approved_by is not null))
);

-- Company credit cards, one per holder. Created after the rulebook because
-- a card holds a real FK to its programme rule (same file, §2.2.1 allows it).
create table if not exists public.nova_corporate_cards (
  id text primary key check (id like 'ccd\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Soft ref to nova_employees: the holder.
  employee_id text not null,
  -- Soft ref to nova_departments: the holder's cost centre.
  department_id text not null,
  -- Masked like every account number in Nova: last four only.
  card_last4 text not null check (card_last4 ~ '^[0-9]{4}$'),
  -- The three networks Indian corporate cards run on.
  network text not null check (network in ('visa', 'mastercard', 'rupay')),
  issued_on date not null,
  -- blocked = reported lost; closed = holder left.
  status text not null check (status in ('active', 'blocked', 'closed')),
  closed_on date,
  -- Per-authorisation and per-calendar-month caps.
  per_txn_limit numeric(14,2) not null check (per_txn_limit > 0),
  monthly_limit numeric(14,2) not null check (monthly_limit > 0),
  -- A raised per-transaction cap for a trip, and the day it lapses.
  temp_limit numeric(14,2) check (temp_limit > 0),
  temp_limit_until date,
  -- The card programme rule it is issued under (blocked MCCs live there).
  policy_id text not null references public.nova_spend_policies(id) on delete restrict,
  created_at timestamptz not null default now(),
  -- A closed card has a closing day and only a closed card has one.
  constraint nova_corporate_cards_closed check ((status = 'closed') = (closed_on is not null)),
  -- A temporary limit always has an end date.
  constraint nova_corporate_cards_temp check ((temp_limit is null) = (temp_limit_until is null))
);

-- Recurring services the company pays for: bank-billed contracts (the 002
-- recurring expenses) and card-billed SaaS and similar.
create table if not exists public.nova_subscriptions (
  id text primary key check (id like 'sub\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Product and plan as the invoice names it.
  name text not null,
  -- Payee as it appears on the bill; equals nova_expenses.vendor_name for bank-billed rows.
  vendor_name text not null,
  -- Soft ref to nova_vendors (002), set only when the payee is a vendor master.
  vendor_id text,
  category text not null check (category in ('saas', 'cloud', 'telecom', 'insurance', 'maintenance', 'rent',
    'utilities', 'professional_services', 'media')),
  -- Soft refs to nova_employees and nova_departments: who owns the service.
  owner_employee_id text not null,
  department_id text not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'quarterly', 'annual')),
  -- bank = paid by transfer (in nova_expenses); card = charged to a corporate card.
  billing_channel text not null check (billing_channel in ('bank', 'card')),
  -- The card it is charged to (FK: same file); only for card billing.
  card_id text references public.nova_corporate_cards(id) on delete restrict,
  -- Seat-based plans only; active seats never exceed purchased ones.
  seats_purchased integer check (seats_purchased >= 0),
  seats_active integer check (seats_active >= 0),
  -- Price per seat (or per cycle for flat plans) and the per-cycle bill.
  unit_price numeric(14,2) not null check (unit_price >= 0),
  current_amount numeric(14,2) not null check (current_amount >= 0),
  started_on date not null,
  -- The next renewal; future by nature, so it may fall after as_of.
  renewal_date date not null,
  auto_renew boolean not null,
  status text not null check (status in ('active', 'paused', 'cancelled')),
  cancelled_on date,
  -- Last login or usage seen; null where usage is not measurable (rent, power).
  last_used_on date,
  -- [{effective_from, amount}] oldest first: how the per-cycle price moved.
  price_history jsonb not null check (jsonb_typeof(price_history) = 'array'),
  created_at timestamptz not null default now(),
  -- Card billing needs a card; bank billing must not name one.
  constraint nova_subscriptions_card check ((billing_channel = 'card') = (card_id is not null)),
  -- Seats are both set or both absent, and active ≤ purchased.
  constraint nova_subscriptions_seats check ((seats_purchased is null) = (seats_active is null) and (seats_active is null or seats_active <= seats_purchased)),
  -- Only a cancelled service has a cancellation date.
  constraint nova_subscriptions_cancel check ((status = 'cancelled') = (cancelled_on is not null))
);

-- Every card authorisation, approved or declined, as the card issuer reports it.
create table if not exists public.nova_card_transactions (
  id text primary key check (id like 'ctx\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Same-file FK: the card that was swiped.
  card_id text not null references public.nova_corporate_cards(id) on delete restrict,
  -- Soft ref to nova_employees: always the card's holder (checked at the end).
  employee_id text not null,
  -- Stored in UTC like every timestamptz; the view adds the IST hour.
  txn_at timestamptz not null,
  -- The day the issuer booked it, 0–3 days after the swipe.
  posted_date date not null,
  -- Merchant as printed on the card statement.
  merchant_name text not null,
  -- ISO 18245 merchant category code: four digits.
  mcc text not null check (mcc ~ '^[0-9]{4}$'),
  -- The grouping the card policies are written against.
  mcc_group text not null check (mcc_group in ('travel', 'lodging', 'fuel', 'restaurants', 'software', 'office',
    'telecom', 'retail', 'entertainment', 'cash', 'other')),
  -- Where the merchant is; the holder's home city unless travelling.
  city text not null,
  -- Billed amount in INR.
  amount numeric(14,2) not null check (amount > 0),
  -- Foreign-currency charges keep what the merchant billed.
  original_currency text check (original_currency ~ '^[A-Z]{3}$'),
  original_amount numeric(14,2) check (original_amount > 0),
  auth_status text not null check (auth_status in ('approved', 'declined')),
  -- Why the issuer refused; only on declines.
  decline_reason text check (decline_reason in ('over_txn_limit', 'over_monthly_limit', 'blocked_mcc', 'card_blocked', 'outside_hours')),
  -- Same-file FK: the subscription this charge bills, if any.
  subscription_id text references public.nova_subscriptions(id) on delete restrict,
  created_at timestamptz not null default now(),
  -- A decline always carries its reason, an approval never does.
  constraint nova_card_transactions_decline check ((auth_status = 'declined') = (decline_reason is not null)),
  -- Currency and amount come as a pair.
  constraint nova_card_transactions_fx check ((original_currency is null) = (original_amount is null)),
  -- The issuer never books before the swipe, nor more than 3 days after.
  constraint nova_card_transactions_posted check (posted_date between (txn_at at time zone 'Asia/Kolkata')::date
    and (txn_at at time zone 'Asia/Kolkata')::date + 3)
);

-- Out-of-pocket expense claims, reimbursed with the next department payroll.
create table if not exists public.nova_expense_claims (
  id text primary key check (id like 'ecl\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Sequential in submission order per company, like a claims system.
  claim_number text not null,
  -- Soft refs to nova_employees / nova_departments (the claimant's own).
  employee_id text not null,
  department_id text not null,
  -- The ten claim heads Indian SME travel-and-expense policies use.
  category text not null check (category in ('travel_air', 'travel_rail', 'local_conveyance', 'hotel', 'meals',
    'client_entertainment', 'telecom', 'fuel', 'office_supplies', 'other')),
  -- The day the money was spent.
  expense_date date not null,
  -- 0–30 days after the spend.
  submitted_at timestamptz not null,
  -- Where it was spent: the home city, or the trip destination.
  city text not null,
  -- Groups one trip's claims; null for everyday spend.
  trip_id text,
  -- Soft ref to nova_clients (002) for client-specific cost.
  client_id text,
  -- Templated from a per-category phrase bank.
  business_purpose text not null,
  -- Claimed amount including GST, and the GST inside it.
  amount numeric(14,2) not null check (amount > 0),
  gst_amount numeric(14,2) not null check (gst_amount >= 0),
  -- Receipt metadata only (contract §1: JSON only, no images).
  receipt_number text,
  receipt_merchant text,
  receipt_date date,
  -- The full bill; larger than amount when one bill is split between claimants.
  receipt_total numeric(14,2) check (receipt_total > 0),
  -- 16 hex; equal hash = the same receipt document.
  receipt_hash text check (receipt_hash ~ '^[0-9a-f]{16}$'),
  -- Same-file FK: the policy that applied on expense_date.
  policy_id text references public.nova_spend_policies(id) on delete restrict,
  -- True when an over-limit claim was knowingly allowed.
  policy_exception boolean not null default false,
  -- Soft ref to nova_employees: who allowed the exception.
  exception_approved_by text,
  status text not null check (status in ('submitted', 'queried', 'approved', 'rejected', 'reimbursed')),
  -- Soft ref to nova_employees: the manager who decided, with when and how much.
  approved_by text,
  approved_at timestamptz,
  approved_amount numeric(14,2) check (approved_amount >= 0),
  -- Paid out with the department's payroll: its date, and a soft ref to nova_payroll_runs (008).
  reimbursed_on date,
  payroll_run_id text,
  created_at timestamptz not null default now(),
  -- A number identifies one claim per company.
  constraint nova_expense_claims_number_key unique (slice_no, claim_number),
  -- GST sits inside the claimed amount.
  constraint nova_expense_claims_gst check (gst_amount <= amount),
  -- Never approve more than was claimed.
  constraint nova_expense_claims_approved check (approved_amount is null or approved_amount <= amount),
  -- A decided claim has decider, time and amount; an undecided one has none.
  constraint nova_expense_claims_decided check ((status in ('approved', 'rejected', 'reimbursed')) = (approved_by is not null)
    and (approved_by is null) = (approved_at is null) and (approved_by is null) = (approved_amount is null)),
  -- Reimbursed claims, and only those, carry the payroll run and its date.
  constraint nova_expense_claims_paid check ((status = 'reimbursed') = (payroll_run_id is not null)
    and (payroll_run_id is null) = (reimbursed_on is null)),
  -- An exception approver only exists on an exception.
  constraint nova_expense_claims_exception check (policy_exception or exception_approved_by is null)
);

-- Every API list pins slice_no, then sorts by its date: one composite index each.
create index if not exists nova_spend_policies_slice_idx on public.nova_spend_policies (slice_no, effective_from desc);
create index if not exists nova_leave_records_slice_idx on public.nova_leave_records (slice_no, start_date desc);
-- The child route /employees/{id}/leave-records and the claim-on-leave join.
create index if not exists nova_leave_records_employee_idx on public.nova_leave_records (employee_id);
create index if not exists nova_expense_claims_slice_idx on public.nova_expense_claims (slice_no, expense_date desc);
-- The child route /employees/{id}/expense-claims.
create index if not exists nova_expense_claims_employee_idx on public.nova_expense_claims (employee_id);
-- Duplicate-receipt detection groups on it (A15).
create index if not exists nova_expense_claims_receipt_hash_idx on public.nova_expense_claims (receipt_hash);
create index if not exists nova_corporate_cards_slice_idx on public.nova_corporate_cards (slice_no, issued_on desc);
create index if not exists nova_card_transactions_slice_idx on public.nova_card_transactions (slice_no, txn_at desc);
-- The child route /corporate-cards/{id}/card-transactions.
create index if not exists nova_card_transactions_card_idx on public.nova_card_transactions (card_id);
create index if not exists nova_subscriptions_slice_idx on public.nova_subscriptions (slice_no, renewal_date desc);

-- -----------------------------------------------------------------------------
-- Reset: only this file's six tables, in ONE truncate so the in-file FKs never
-- block it, and with NO cascade (nothing outside this file references them).
-- -----------------------------------------------------------------------------
truncate table public.nova_card_transactions, public.nova_expense_claims, public.nova_subscriptions,
  public.nova_corporate_cards, public.nova_leave_records, public.nova_spend_policies;
-- Only this file's anomaly codes (contract §2.2.5: one owner per code).
delete from public.nova_ground_truth where anomaly_code in ('A15', 'A16', 'A17');

-- -----------------------------------------------------------------------------
-- Helpers (session-temporary; they vanish when the connection closes).
-- -----------------------------------------------------------------------------

-- A stable roll in [0, 1) from any key: the first 32 bits of its md5. Unlike
-- random(), it gives the same answer whatever order rows are visited in.
create function pg_temp.h(k text) returns numeric language sql immutable as $$
  -- Hex → 32-bit unsigned → fraction of 2^32; numeric keeps money maths exact.
  select ('x' || substr(md5(k), 1, 8))::bit(32)::bigint::numeric / 4294967296
$$;

-- n stable decimal digits from a key: card last-4s and receipt numbers.
create function pg_temp.dg(k text, n integer) returns text language sql immutable as $$
  -- Two md5s give 64 characters; hex letters fold onto digits.
  select substr(translate(md5(k) || md5(k || '#'), 'abcdef', '012345'), 1, n)
$$;

-- An IST wall-clock moment as timestamptz: generation thinks in Indian time,
-- storage is UTC (contract §4.1 card transactions).
create function pg_temp.ist(d date, minutes integer) returns timestamptz language sql immutable as $$
  -- Local time → the absolute instant it names in Asia/Kolkata.
  select (d + make_interval(mins => minutes)) at time zone 'Asia/Kolkata'
$$;

-- -----------------------------------------------------------------------------
-- Context: the clock, the book window, and the people.
-- -----------------------------------------------------------------------------

-- The frozen as-of date (contract §1 Clock); never current_date.
create temp table sp_asof on commit drop as
select as_of_date as a, as_of_date - 364 as w0 from public.nova_dataset_meta where id;

-- Employees with the window each one was on the payroll for; spend and leave
-- can only happen inside it (contract §4.1: nothing after exit_date).
create temp table sp_emp on commit drop as
select e.id, e.slice_no, e.department_id, d.name as dept, e.grade, e.location, e.manager_id,
  e.join_date, e.exit_date,
  -- Employed from the later of joining and the window start...
  greatest(e.join_date, x.w0) as a_from,
  -- ...to the earlier of leaving and the as-of date.
  least(coalesce(e.exit_date, x.a), x.a) as a_to,
  -- The department head: exception approver and approver for a head's own leave.
  d.head_employee_id as head_id
from public.nova_employees e
join public.nova_departments d on d.id = e.department_id
cross join sp_asof x;
-- Every later step joins employees by id; temp tables need their own key and stats.
alter table sp_emp add primary key (id);
analyze sp_emp;

-- -----------------------------------------------------------------------------
-- Spend policies: 20 claim rules, 5 card rules, 3 subscription rules, plus 3
-- mid-year revisions = 31 per slice (contract range 30–40).
-- -----------------------------------------------------------------------------

-- The rule templates. base = the ₹ cap before the per-slice ±15% variation.
create temp table sp_pol_tpl on commit drop as
select * from (values
  -- code, applies_to, category, grade_min, grade_max, department, basis, base, receipt_above, blocked, hours, levels, description
  ('TRV-AIR-BASE', 'expense_claim', 'travel_air', null, null, null, 'per_item', 12000, 0, null::text[], null, 2, 'Economy air fare per sector for all grades unless a grade band applies.'),
  ('TRV-AIR-G1-G3', 'expense_claim', 'travel_air', 'G1', 'G3', null, 'per_item', 8000, 0, null, null, 2, 'Economy air fare per sector for grades G1 to G3.'),
  ('TRV-AIR-G4-G5', 'expense_claim', 'travel_air', 'G4', 'G5', null, 'per_item', 15000, 0, null, null, 2, 'Economy air fare per sector for grades G4 and G5.'),
  ('TRV-AIR-G6-G8', 'expense_claim', 'travel_air', 'G6', 'G8', null, 'per_item', 30000, 0, null, null, 1, 'Air fare per sector for grades G6 to G8, flexible fares allowed.'),
  ('TRV-RAIL-BASE', 'expense_claim', 'travel_rail', null, null, null, 'per_item', 3500, 0, null, null, 1, 'Rail fare per journey, AC tier as per grade.'),
  ('LCV-BASE', 'expense_claim', 'local_conveyance', null, null, null, 'per_day', 800, 300, null, null, 1, 'Local cab, auto and metro fares per day.'),
  ('HTL-BASE', 'expense_claim', 'hotel', null, null, null, 'per_day', 4500, 0, null, null, 1, 'Hotel room per night for all grades unless a grade band applies.'),
  ('HTL-G1-G3', 'expense_claim', 'hotel', 'G1', 'G3', null, 'per_day', 3000, 0, null, null, 1, 'Hotel room per night for grades G1 to G3.'),
  ('HTL-G4-G5', 'expense_claim', 'hotel', 'G4', 'G5', null, 'per_day', 5500, 0, null, null, 1, 'Hotel room per night for grades G4 and G5.'),
  ('HTL-G6-G8', 'expense_claim', 'hotel', 'G6', 'G8', null, 'per_day', 9000, 0, null, null, 1, 'Hotel room per night for grades G6 to G8.'),
  ('MEAL-BASE', 'expense_claim', 'meals', null, null, null, 'per_day', 1200, 300, null, null, 1, 'Meals per day while working away or late.'),
  ('MEAL-G1-G3', 'expense_claim', 'meals', 'G1', 'G3', null, 'per_day', 800, 300, null, null, 1, 'Meals per day for grades G1 to G3.'),
  ('MEAL-G4-G5', 'expense_claim', 'meals', 'G4', 'G5', null, 'per_day', 1500, 300, null, null, 1, 'Meals per day for grades G4 and G5.'),
  ('MEAL-G6-G8', 'expense_claim', 'meals', 'G6', 'G8', null, 'per_day', 2500, 300, null, null, 1, 'Meals per day for grades G6 to G8.'),
  ('ENT-BASE', 'expense_claim', 'client_entertainment', null, null, null, 'per_item', 6000, 0, null, null, 2, 'Client lunch or dinner per occasion, client named on the claim.'),
  ('ENT-SAL', 'expense_claim', 'client_entertainment', null, null, 'Sales', 'per_item', 10000, 0, null, null, 2, 'Client entertainment per occasion for the Sales team.'),
  ('TEL-BASE', 'expense_claim', 'telecom', null, null, null, 'per_month', 1500, 0, null, null, 1, 'Mobile and data bill per month.'),
  ('FUEL-BASE', 'expense_claim', 'fuel', null, null, null, 'per_month', 5000, 500, null, null, 1, 'Fuel for official use of a personal vehicle per month.'),
  ('FUEL-SAL', 'expense_claim', 'fuel', null, null, 'Sales', 'per_month', 8000, 500, null, null, 1, 'Fuel per month for the Sales field team.'),
  ('OFF-BASE', 'expense_claim', 'office_supplies', null, null, null, 'per_item', 2500, 500, null, null, 1, 'Small office purchases per bill.'),
  ('OTH-BASE', 'expense_claim', 'other', null, null, null, 'per_item', 2000, 500, null, null, 1, 'Any other business expense per bill.'),
  -- Card programme rules: the cap here is the default monthly limit; blocked MCCs are bars, betting, jewellery and cash.
  ('CRD-STD-G1-G5', 'card_transaction', 'all', 'G1', 'G5', null, 'per_month', 150000, 0, array['5813', '7995', '5944', '6011'], null, 1, 'Corporate card for grades up to G5: no bars, betting, jewellery or cash withdrawals.'),
  ('CRD-SNR-G6-G8', 'card_transaction', 'all', 'G6', 'G8', null, 'per_month', 400000, 0, array['7995', '5944', '6011'], null, 1, 'Corporate card for grades G6 to G8: no betting, jewellery or cash withdrawals.'),
  ('CRD-RTL-HRS', 'card_transaction', 'retail', null, null, null, 'per_item', 20000, 0, null, '07:00-23:00', 1, 'Retail card spend only between 07:00 and 23:00 IST.'),
  ('CRD-ENT-HRS', 'card_transaction', 'entertainment', null, null, null, 'per_item', 8000, 0, null, '07:00-23:00', 1, 'Entertainment card spend only between 07:00 and 23:00 IST.'),
  ('CRD-FUEL', 'card_transaction', 'fuel', null, null, null, 'per_item', 6000, 0, null, null, 1, 'Fuel card spend per fill.'),
  -- Subscription rules: monthly spend caps per category before a second approval.
  ('SUB-SAAS', 'subscription', 'saas', null, null, null, 'per_month', 60000, 0, null, null, 2, 'Software subscriptions: owner and IT head approve new plans and seat additions.'),
  ('SUB-CLOUD', 'subscription', 'cloud', null, null, null, 'per_month', 100000, 0, null, null, 2, 'Cloud infrastructure: IT head and finance approve.'),
  ('SUB-MEDIA', 'subscription', 'media', null, null, null, 'per_month', 10000, 0, null, null, 1, 'News and industry media subscriptions.')
) as t(code, applies_to, category, grade_min, grade_max, dept, basis, base, receipt_above, blocked, hours, levels, description);

-- Three rules are revised mid-year: the old row closes the day before the new one opens.
create temp table sp_pol_rev on commit drop as
select code from (values ('MEAL-BASE'), ('LCV-BASE'), ('HTL-G4-G5')) as r(code);

-- Every policy row, originals and revisions, with its per-slice cap. One ±15%
-- factor per slice and CATEGORY keeps grade bands in order within a company.
create temp table sp_pol on commit drop as
with base as (
  select s.slice_no, t.*,
    -- Rule start: the first of a month 13–23 months before as_of, so every rule predates the window.
    date_trunc('month', x.a - 400 - floor(pg_temp.h('spp-from|' || s.slice_no) * 300)::int)::date as eff0,
    -- Revision day, 4–8 months before as_of, varied per rule.
    x.a - 120 - floor(pg_temp.h('spp-rev|' || s.slice_no || '|' || t.code) * 120)::int as rev_on,
    -- The ±15% company variation (contract §4.1).
    0.85 + 0.30 * pg_temp.h('spp-lim|' || s.slice_no || '|' || t.category) as f,
    t.code in (select code from sp_pol_rev) as revised
  from generate_series(0, 79) as s(slice_no)
  cross join sp_pol_tpl t
  cross join sp_asof x
)
-- The original rule; a revised one ends the day before its revision.
select slice_no, code as policy_code, applies_to, category, grade_min, grade_max, dept, basis,
  round(base * f / 50) * 50 as limit_amount, receipt_above, blocked, hours, levels, eff0 as effective_from,
  case when revised then rev_on - 1 end as effective_to, description
from base
union all
-- The revision: the same rule 10% higher, from the revision day on.
select slice_no, code || '-V2', applies_to, category, grade_min, grade_max, dept, basis,
  round(base * f * 1.10 / 50) * 50, receipt_above, blocked, hours, levels, rev_on, null,
  'Revised: ' || lower(left(description, 1)) || substr(description, 2)
from base where revised;

-- Store them; department rules resolve their name to that company's department id.
insert into public.nova_spend_policies (id, slice_no, policy_code, applies_to, category, grade_min, grade_max,
  department_id, limit_basis, limit_amount, receipt_required_above, blocked_mcc, allowed_hours, approval_levels,
  effective_from, effective_to, description)
select 'spp_' || left(md5('nova_spend_policies|' || p.slice_no || '|' || p.policy_code), 12),
  p.slice_no, p.policy_code, p.applies_to, p.category, p.grade_min, p.grade_max,
  -- Soft reference into 005, same slice by construction.
  d.id, p.basis, p.limit_amount, p.receipt_above, p.blocked, p.hours, p.levels,
  p.effective_from, p.effective_to, p.description
from sp_pol p
left join public.nova_departments d on d.slice_no = p.slice_no and d.name = p.dept;

-- -----------------------------------------------------------------------------
-- Leave: about four records per employee per year (contract §4.1). Each
-- employee's window is cut into n equal segments with one leave inside each,
-- so no two leaves of one person can ever overlap.
-- -----------------------------------------------------------------------------

-- Who approves leave when there is no manager (the managing director): the
-- Human Resources head, the one person whose sign-off an MD's leave needs.
create temp table sp_hr_head on commit drop as
select d.slice_no, d.head_employee_id as hr_head from public.nova_departments d where d.name = 'Human Resources';

-- How many leaves each person gets: 4 per year of service in the window,
-- ±0.5 by hash, skipping the first 10 days after joining (no one applies on day one).
create temp table sp_lv_n on commit drop as
select e.*, e.a_from + 10 as l_from,
  greatest(0, round(4 * (e.a_to - e.a_from - 10) / 365.0 + pg_temp.h('lvn|' || e.id) - 0.5))::int as n
from sp_emp e
where e.a_to - e.a_from > 40;

-- One leave per segment: type, length and position all from the hash.
create temp table sp_lv on commit drop as
with s as (
  select e.id as employee_id, e.slice_no, e.manager_id, e.join_date, e.l_from, e.a_to, e.n, j,
    -- Segment bounds in days from l_from.
    floor(j * (e.a_to - e.l_from) / e.n::numeric)::int as s0,
    floor((j + 1) * (e.a_to - e.l_from) / e.n::numeric)::int as s1,
    -- Type weights: earned 35, casual 30, sick 25, comp-off 7, unpaid 3.
    pg_temp.h('lvt|' || e.id || '|' || j) as tr,
    pg_temp.h('lvd|' || e.id || '|' || j) as dr,
    pg_temp.h('lvp|' || e.id || '|' || j) as pr,
    pg_temp.h('lvs|' || e.id || '|' || j) as sr
  from sp_lv_n e cross join generate_series(0, 19) as j
  where j < e.n
), t as (
  select s.*,
    case when tr < 0.35 then 'earned' when tr < 0.65 then 'casual' when tr < 0.90 then 'sick'
         when tr < 0.97 then 'comp_off' else 'unpaid' end as leave_type
  from s
), d as (
  select t.*,
    -- Days charged per type; casual and sick allow half days.
    case leave_type
      when 'earned' then 2 + floor(dr * 5)
      when 'casual' then case when dr < 0.3 then 0.5 else 1 + floor(dr * 2) end
      when 'sick' then case when dr < 0.1 then 0.5 else 1 + floor(dr * 3) end
      when 'comp_off' then 1
      else 1 + floor(dr * 5) end::numeric(4,1) as days
  from t
)
select d.*,
  -- Start somewhere in the segment that still leaves the whole leave inside it.
  d.l_from + d.s0 + floor(d.pr * greatest(0, d.s1 - d.s0 - ceil(d.days)::int))::int as start_date
from d;

-- Store leave with its status, application time and approver.
insert into public.nova_leave_records (id, slice_no, employee_id, leave_type, start_date, end_date, days, status,
  applied_at, approved_by)
select 'lvr_' || left(md5('nova_leave_records|' || l.slice_no || '|' || l.employee_id || '|' || l.j), 12),
  l.slice_no, l.employee_id, l.leave_type, l.start_date,
  -- Calendar end; a half day starts and ends on the same date.
  l.start_date + ceil(l.days)::int - 1, l.days, l.status,
  -- Planned leave is applied 1–30 days ahead in office hours; sick leave on
  -- the day or up to 2 days after, never after as_of.
  case when l.leave_type = 'sick'
    then pg_temp.ist(least(l.start_date + floor(pg_temp.h('lva|' || l.employee_id || l.j) * 3)::int, x.a),
      540 + floor(pg_temp.h('lvm|' || l.employee_id || l.j) * 540)::int)
    else pg_temp.ist(greatest(l.join_date, l.start_date - 1 - floor(pg_temp.h('lva|' || l.employee_id || l.j) * 30)::int),
      600 + floor(pg_temp.h('lvm|' || l.employee_id || l.j) * 480)::int) end,
  -- The manager decides; the MD's own leave goes to the HR head, and a
  -- manager who had left (or not joined) by then is replaced by the head.
  case when l.status in ('approved', 'rejected') then
    case when l.manager_id is null then hh.hr_head
         when m.exit_date < l.start_date or m.join_date > l.start_date then coalesce(nullif(me.head_id, l.employee_id), hh.hr_head)
         else l.manager_id end end
from (
  select l0.*,
    -- Only leave starting in the last 7 days can still be pending (contract §4.1).
    case when l0.start_date >= (select a from sp_asof) - 7 and l0.sr < 0.7 then 'pending'
         when l0.start_date >= (select a from sp_asof) - 7 then 'approved'
         when l0.sr < 0.84 then 'approved' when l0.sr < 0.92 then 'rejected' else 'cancelled' end as status
  from sp_lv l0
) l
cross join sp_asof x
join sp_hr_head hh on hh.slice_no = l.slice_no
-- The claimant's own row, for the department head.
join sp_emp me on me.id = l.employee_id
-- The manager's row, to know whether they were still employed.
left join sp_emp m on m.id = l.manager_id;

-- Days anyone is away or asked to be: claims avoid ALL of them (any status),
-- so the only claim on an approved leave day is a planted one or a decoy.
create temp table sp_away on commit drop as
select l.employee_id, g::date as d, l.status, l.id as leave_id
from public.nova_leave_records l
cross join generate_series(l.start_date, l.end_date, interval '1 day') as g;
-- The claim generator probes it per (employee, day).
create index on sp_away (employee_id, d);

-- -----------------------------------------------------------------------------
-- Expense claims, step 1: who claims, and the trips and everyday spend they
-- claim for. Amounts, receipts, status and numbers come in later steps, after
-- the A15 plants are woven in, so a plant is numbered like any other claim.
-- -----------------------------------------------------------------------------

-- Claimants: about 60% of staff (contract §4.1), weighted toward Sales,
-- Operations and Customer Service. Weighted sampling without replacement:
-- the largest ln(u)/w win (Efraimidis–Spirakis). The MD (no manager) never
-- claims, because a claim needs an approver above the claimant.
create temp table sp_clm_emp on commit drop as
select * from (
  select e.*,
    -- Rank inside the company by the weighted key.
    row_number() over (partition by e.slice_no order by ln(0.000001 + 0.999998 * pg_temp.h('clm|' || e.id))
      / case e.dept when 'Sales' then 3 when 'Operations' then 2.5 when 'Customer Service' then 2 else 1 end desc, e.id) as rk
  from sp_emp e
  where e.manager_id is not null and e.a_to - e.a_from >= 30
) x
where x.rk <= 36;

-- Travel frequency per claimant: trips per year by department, scaled by the
-- share of the year they were employed.
create temp table sp_trip_n on commit drop as
select c.*, floor(case c.dept when 'Sales' then 1.6 when 'Operations' then 1.1 when 'Procurement' then 1.0
    when 'Customer Service' then 0.7 else case when c.grade >= 'G5' then 0.6 else 0.2 end end
  * (c.a_to - c.a_from) / 365.0 + pg_temp.h('trn|' || c.id))::int as n
from sp_clm_emp c;

-- One trip per segment of the claimant's window, so one person's trips never
-- overlap. Eight candidate starts per trip; the first one clear of any leave wins.
create temp table sp_trip on commit drop as
with seg as (
  select t.id as employee_id, t.slice_no, t.dept, t.grade, t.location, t.n, j,
    -- 1–3 nights away.
    1 + floor(pg_temp.h('trl|' || t.id || '|' || j) * 3)::int as nights,
    t.a_from + 5 + floor(j * (t.a_to - 3 - t.a_from - 5) / t.n::numeric)::int as s0,
    floor((t.a_to - 3 - t.a_from - 5) / t.n::numeric)::int as seg_len
  from sp_trip_n t cross join generate_series(0, 9) as j
  where j < t.n
)
select distinct on (s.employee_id, s.j) s.*, c.start_date,
  'TRP-' || upper(left(md5('trip|' || s.employee_id || '|' || s.j), 8)) as trip_id
from seg s
cross join lateral (
  -- Candidate k: a start inside the segment that fits the whole trip.
  select k, s.s0 + floor(pg_temp.h('trs|' || s.employee_id || '|' || s.j || '|' || k) * greatest(1, s.seg_len - s.nights - 1))::int as start_date
  from generate_series(0, 7) as k
) c
where s.seg_len >= s.nights + 3
  -- Not a day of it on leave (any status, so a claim-on-leave is never accidental).
  and not exists (select 1 from sp_away a where a.employee_id = s.employee_id and a.d between c.start_date and c.start_date + s.nights)
order by s.employee_id, s.j, c.k;

-- Destination, mode, client and purpose per trip.
create temp table sp_trip2 on commit drop as
select t.*,
  -- A business city other than home (Hyderabad staff never "travel" to Hyderabad).
  (select c from unnest(array['Bengaluru', 'Mumbai', 'Chennai', 'Pune', 'New Delhi', 'Kolkata', 'Ahmedabad',
     'Visakhapatnam', 'Vijayawada', 'Kochi', 'Coimbatore', 'Nagpur']) as c
   where c <> t.location order by md5('trc|' || t.trip_id || c) limit 1) as city,
  -- Senior staff (G5+) fly; others fly on 60% of trips and take the train otherwise.
  case when t.grade >= 'G5' or pg_temp.h('trm|' || t.trip_id) < 0.6 then 'travel_air' else 'travel_rail' end as mode,
  -- Sales trips visit a client 60% of the time; the account owner's own client first.
  case when t.dept = 'Sales' and pg_temp.h('trk|' || t.trip_id) < 0.6 then
    (select cl.id from public.nova_clients cl where cl.slice_no = t.slice_no
     order by (cl.account_owner_id = t.employee_id) desc nulls last, md5('trk|' || t.trip_id || cl.id) limit 1) end as client_id,
  -- One purpose for the whole trip, from the phrase bank.
  (array['Customer meetings in ', 'Site visit at ', 'Vendor review in ', 'Regional sales review in ',
    'Client presentation in '])[1 + floor(pg_temp.h('trp|' || t.trip_id) * 5)::int] as purpose0
from sp_trip t;

-- Every trip and everyday day is off-limits for other everyday spend.
create temp table sp_trip_day on commit drop as
select t.employee_id, (t.start_date + g)::date as d from sp_trip2 t cross join generate_series(0, 3) as g where g <= t.nights;
-- Probed per (employee, day) below.
create index on sp_trip_day (employee_id, d);
-- Temp tables get no statistics on their own; without them the planner guesses badly.
analyze sp_trip_day;
analyze sp_away;

-- The claim skeleton. part is internal only (it never reaches a stored column).
create temp table sp_cl0 (
  ckey text primary key, slice_no int not null, employee_id text not null, category text not null,
  expense_date date not null, city text not null, trip_id text, client_id text, purpose text not null, part text not null
) on commit drop;
-- The one-per-day probes look claims up by person and date.
create index on sp_cl0 (employee_id, expense_date);

-- Trip claims: transport out and back, one hotel claim per night, one meals and one local-travel claim.
insert into sp_cl0
select t.trip_id || '|' || p.part, t.slice_no, t.employee_id, p.category, t.start_date + p.dd, t.city, t.trip_id,
  t.client_id, t.purpose0 || t.city, p.part
from sp_trip2 t
cross join lateral (
  select 'out' as part, t.mode as category, 0 as dd
  union all select 'back', t.mode, t.nights
  union all select 'hotel' || g, 'hotel', g from generate_series(0, 2) as g where g < t.nights
  union all select 'meals', 'meals', 1
  union all select 'local', 'local_conveyance', 1
) p;

-- Everyday claims avoid leave days and trip days of the claimant; this is the
-- test each candidate date must pass.
create function pg_temp.free_day(emp text, d date) returns boolean language sql stable as $$
  -- Free = not away (any leave status) and not travelling.
  select not exists (select 1 from sp_away a where a.employee_id = emp and a.d = free_day.d)
     and not exists (select 1 from sp_trip_day t where t.employee_id = emp and t.d = free_day.d)
$$;

-- Monthly bills: a third of claimants claim their mobile bill, and field
-- staff claim fuel. A per_month policy means one claim per month at most.
insert into sp_cl0
select distinct on (c.id, c.k, b.category)
  c.id || '|' || b.category || '|' || c.k, c.slice_no, c.id, b.category, c.m0 + v.dd, c.location, null, null,
  case b.category when 'telecom' then 'Mobile and data bill, ' else 'Fuel for field visits, ' end || to_char(c.m0, 'Mon YYYY'),
  'monthly'
from (
  -- The 12 months of the window, per claimant.
  select e.*, k, (date_trunc('month', x.a) - make_interval(months => k))::date as m0
  from sp_clm_emp e cross join sp_asof x cross join generate_series(1, 12) as k
) c
cross join (values ('telecom'), ('fuel')) as b(category)
cross join lateral (
  -- Four candidate days between the 3rd and the 26th of the month.
  select q, 2 + floor(pg_temp.h('mday|' || c.id || b.category || c.k || '|' || q) * 24)::int as dd from generate_series(0, 3) as q
) v
-- Who claims which bill: 30% of claimants the mobile bill (70% of months),
-- 40% of field staff fuel (50% of months).
where ((b.category = 'telecom' and pg_temp.h('tel|' || c.id) < 0.30 and pg_temp.h('telm|' || c.id || c.k) < 0.7)
   or (b.category = 'fuel' and c.dept in ('Sales', 'Operations', 'Warehouse and Logistics', 'Customer Service')
       and pg_temp.h('fuel|' || c.id) < 0.40 and pg_temp.h('fuelm|' || c.id || c.k) < 0.5))
  -- Inside the employed window and on a free day.
  and c.m0 + v.dd between c.a_from and c.a_to
  and pg_temp.free_day(c.id, c.m0 + v.dd)
order by c.id, c.k, b.category, v.q;

-- Everyday one-off claims: about 4 a year per claimant, category from a
-- department-flavoured bank (client entertainment only for Sales and seniors).
insert into sp_cl0
select distinct on (x.id, x.i)
  x.id || '|misc|' || x.i, x.slice_no, x.id, x.category, v.d, x.location, null,
  -- Entertainment always names the client it was for.
  case when x.category = 'client_entertainment' then
    (select cl.id from public.nova_clients cl where cl.slice_no = x.slice_no
     order by (cl.account_owner_id = x.id) desc nulls last, md5('ent|' || x.id || x.i || cl.id) limit 1) end,
  case x.category
    when 'local_conveyance' then (array['Local client visit', 'Bank and courier errands', 'Travel to branch office',
      'Late return after month-end close'])[1 + floor(pg_temp.h('pur|' || x.id || x.i) * 4)::int]
    when 'meals' then (array['Working lunch during audit', 'Team dinner after stock count', 'Late working meal'])[1 + floor(pg_temp.h('pur|' || x.id || x.i) * 3)::int]
    when 'client_entertainment' then (array['Lunch with client team', 'Dinner meeting with client'])[1 + floor(pg_temp.h('pur|' || x.id || x.i) * 2)::int]
    when 'office_supplies' then (array['Printer cartridges', 'Stationery for branch', 'Files and folders'])[1 + floor(pg_temp.h('pur|' || x.id || x.i) * 3)::int]
    else (array['Courier charges', 'Printing and binding', 'Small repairs'])[1 + floor(pg_temp.h('pur|' || x.id || x.i) * 3)::int] end,
  'misc'
from (
  select e.*, i,
    -- Category bank: repeats set the weights.
    (case when e.dept = 'Sales' or e.grade >= 'G5'
      then array['local_conveyance', 'local_conveyance', 'local_conveyance', 'meals', 'client_entertainment',
        'client_entertainment', 'office_supplies', 'other']
      else array['local_conveyance', 'local_conveyance', 'local_conveyance', 'meals', 'meals', 'office_supplies',
        'office_supplies', 'other'] end)[1 + floor(pg_temp.h('mcat|' || e.id || '|' || i) * 8)::int] as category
  from sp_clm_emp e cross join generate_series(0, 7) as i
  where i < floor(4 * (e.a_to - e.a_from) / 365.0 + pg_temp.h('mn|' || e.id))
) x
cross join lateral (
  -- Eight candidate days across the employed window.
  select q, x.a_from + 3 + floor(pg_temp.h('md|' || x.id || '|' || x.i || '|' || q) * greatest(1, x.a_to - x.a_from - 3))::int as d
  from generate_series(0, 7) as q
) v
where pg_temp.free_day(x.id, v.d)
  -- One claim per category per day per person: a per_day limit is per day.
  and not exists (select 1 from sp_cl0 o where o.employee_id = x.id and o.category = x.category and o.expense_date = v.d)
order by x.id, x.i, v.q;

-- Two one-off draws can land on the same person, category and day; keep the
-- first, so a per_day limit is never split across two claims by accident.
delete from sp_cl0 a using sp_cl0 b
where a.employee_id = b.employee_id and a.category = b.category and a.expense_date = b.expense_date and a.ckey > b.ckey;

-- Volume control: 280–320 claims per company (contract §4.1). The generators
-- above overshoot on purpose; everyday claims are trimmed at hashed positions
-- down to a per-slice target, less the 8 rows the plants and decoys add below.
create temp table sp_cl_target on commit drop as
select s as slice_no, 286 + floor(pg_temp.h('cltarget|' || s) * 26)::int - 8 as n from generate_series(0, 79) as s;

-- Keep every trip claim; keep everyday claims in hashed order until the target is met.
delete from sp_cl0 c using (
  select o.ckey, row_number() over (partition by o.slice_no order by md5('cltrim|' || o.ckey)) as rk, t.trips
  from sp_cl0 o
  -- Trip claims per company, counted once.
  join (select slice_no, count(*) filter (where trip_id is not null) as trips from sp_cl0 group by slice_no) t on t.slice_no = o.slice_no
  where o.trip_id is null
) r, sp_cl_target g
where c.ckey = r.ckey and g.slice_no = c.slice_no and r.rk > g.n - r.trips;

-- -----------------------------------------------------------------------------
-- Step 2: the policy that applies, the amount, GST and the receipt.
-- -----------------------------------------------------------------------------

-- The applicable rule on the day: a department rule beats a grade band, which
-- beats the company baseline; the version in force that day wins.
create function pg_temp.claim_policy(sl int, dep text, gr text, cat text, d date) returns text language sql stable as $$
  select p.id from public.nova_spend_policies p
  where p.slice_no = sl and p.applies_to = 'expense_claim' and p.category = cat
    and d >= p.effective_from and (p.effective_to is null or d <= p.effective_to)
    and (p.department_id is null or p.department_id = dep)
    and (p.grade_min is null or gr between p.grade_min and p.grade_max)
  order by (p.department_id is null), (p.grade_min is null), p.id
  limit 1
$$;

-- Claim rows with their rule and money. amount_f is the fraction of the cap
-- a normal claim uses: 30–90%, so no normal claim is ever over its limit.
create temp table sp_cl1 on commit drop as
select c.*, e.department_id, e.grade, e.manager_id, e.head_id, p.id as policy_id, p.limit_amount, p.receipt_required_above,
  greatest(50, round(p.limit_amount * (0.3 + 0.6 * pg_temp.h('amt|' || c.ckey))))::numeric(14,2) as amount,
  -- GST inside a bill, by the category's usual rate.
  case c.category when 'travel_air' then 0.05 when 'travel_rail' then 0.05 when 'hotel' then 0.12 when 'meals' then 0.05
    when 'client_entertainment' then 0.05 when 'telecom' then 0.18 when 'fuel' then 0 when 'local_conveyance' then 0.05
    else 0.18 end as gst_rate,
  -- Half the claims under the receipt threshold still carry one.
  pg_temp.h('rcp|' || c.ckey) < 0.5 as keeps_small_receipt,
  -- Plant bookkeeping; internal only.
  null::text as plant, null::text as plant_ref, false as force_ok, false as policy_exception, null::text as exception_by,
  null::numeric(14,2) as receipt_total_override, null::text as receipt_from
from sp_cl0 c
join sp_emp e on e.id = c.employee_id
join public.nova_spend_policies p on p.id = pg_temp.claim_policy(c.slice_no, e.department_id, e.grade, c.category, c.expense_date);
-- Plants below look claims up by key, and by person and day.
alter table sp_cl1 add primary key (ckey);
create index on sp_cl1 (employee_id, expense_date);
analyze sp_cl1;

-- -----------------------------------------------------------------------------
-- Step 3: A15 plants and decoys (contract §6), woven in BEFORE numbering.
-- Each pick is the hashed first of a candidate set, per slice. Every plant is
-- forced through approval (force_ok), because an abuse that was rejected
-- would not be an abuse that got paid.
-- -----------------------------------------------------------------------------

-- A15(a) duplicate receipt. Originals: everyday office or 'other' claims (no
-- grade bands, so a colleague's copy is never also over a limit) that carry a
-- receipt and are old enough for a copy 20–60 days later to be processed.
create temp table sp_a15a on commit drop as
select * from (
  select c.*, row_number() over (partition by c.slice_no order by md5('a15a|' || c.ckey)) as rk
  from sp_cl1 c cross join sp_asof x
  where c.part = 'misc' and c.category in ('office_supplies', 'other') and c.amount > c.receipt_required_above
    and c.expense_date <= x.a - 90
) r where r.rk <= 6;

-- (a1) the same employee claims the same bill again 20–60 days later: the
-- first candidate whose copy day is free and inside employment wins.
insert into sp_cl1 (ckey, slice_no, employee_id, category, expense_date, city, trip_id, client_id, purpose, part,
  department_id, grade, manager_id, head_id, policy_id, limit_amount, receipt_required_above, amount, gst_rate,
  keeps_small_receipt, plant, plant_ref, force_ok, policy_exception, exception_by, receipt_total_override, receipt_from)
select distinct on (o.slice_no) o.ckey || '|again', o.slice_no, o.employee_id, o.category, o.d2, o.city, null, null, o.purpose, 'misc',
  o.department_id, o.grade, o.manager_id, o.head_id, o.policy_id, o.limit_amount, o.receipt_required_above, o.amount, o.gst_rate,
  true, 'A15a1', o.ckey, true, false, null, null, o.ckey
from (select a.*, a.expense_date + 20 + floor(pg_temp.h('a15a1|' || a.ckey) * 41)::int as d2 from sp_a15a a) o
join sp_emp e on e.id = o.employee_id
where o.d2 between e.a_from and least(e.a_to, (select a from sp_asof) - 20) and pg_temp.free_day(o.employee_id, o.d2)
order by o.slice_no, o.rk;

-- (a2) a colleague in the same department claims the same bill within 3 days.
insert into sp_cl1 (ckey, slice_no, employee_id, category, expense_date, city, trip_id, client_id, purpose, part,
  department_id, grade, manager_id, head_id, policy_id, limit_amount, receipt_required_above, amount, gst_rate,
  keeps_small_receipt, plant, plant_ref, force_ok, policy_exception, exception_by, receipt_total_override, receipt_from)
select distinct on (o.slice_no) o.ckey || '|colleague', o.slice_no, m.id, o.category, o.d2, m.location, null, null, o.purpose, 'misc',
  m.department_id, m.grade, m.manager_id, m.head_id, o.policy_id, o.limit_amount, o.receipt_required_above, o.amount, o.gst_rate,
  true, 'A15a2', o.ckey, true, false, null, null, o.ckey
from (select a.*, a.expense_date + floor(pg_temp.h('a15a2|' || a.ckey) * 4)::int as d2 from sp_a15a a) o
cross join lateral (
  -- A colleague who has a manager, was employed that day and was not away or travelling.
  select e.* from sp_emp e
  where e.department_id = o.department_id and e.id <> o.employee_id and e.manager_id is not null
    and o.d2 between e.a_from and e.a_to and pg_temp.free_day(e.id, o.d2)
  order by md5('a15a2c|' || o.ckey || e.id) limit 1
) m
-- Never the original already copied by (a1).
where not exists (select 1 from sp_cl1 z where z.plant_ref = o.ckey)
order by o.slice_no, o.rk;

-- Originals of both duplicate pairs go through approval too.
update sp_cl1 c set force_ok = true where c.ckey in (select plant_ref from sp_cl1 where plant in ('A15a1', 'A15a2'));

-- Decoy for (a): a genuinely split bill. A colleague on the same trip pays
-- part of one meals bill; both claims carry the same receipt and trip, and
-- the parts add up to the bill.
insert into sp_cl1 (ckey, slice_no, employee_id, category, expense_date, city, trip_id, client_id, purpose, part,
  department_id, grade, manager_id, head_id, policy_id, limit_amount, receipt_required_above, amount, gst_rate,
  keeps_small_receipt, plant, plant_ref, force_ok, policy_exception, exception_by, receipt_total_override, receipt_from)
select q.ckey || '|share', q.slice_no, q.m_id, 'meals', q.expense_date, q.city, q.trip_id, q.client_id, q.purpose, 'trip',
  q.m_dep, q.m_grade, q.m_mgr, q.m_head, p.id, p.limit_amount, p.receipt_required_above,
  -- The colleague's share never exceeds 85% of their own meals limit.
  least(q.amount, floor(0.85 * p.limit_amount)), q.gst_rate,
  true, 'A15a-decoy', q.ckey, true, false, null, null, q.ckey
from (
  -- The first two meals bills (hashed order) that have a free colleague.
  select o.*, m.id as m_id, m.department_id as m_dep, m.grade as m_grade, m.manager_id as m_mgr, m.head_id as m_head,
    row_number() over (partition by o.slice_no order by md5('a15ad|' || o.ckey)) as rn
  from (
    -- Ten hashed meals bills per company are plenty to find two with a free colleague.
    select c.* from (select c0.*, row_number() over (partition by c0.slice_no order by md5('a15ad|' || c0.ckey)) as r0
      from sp_cl1 c0 where c0.part = 'meals' and c0.expense_date <= (select a from sp_asof) - 20) c where c.r0 <= 10
  ) o
  cross join lateral (
    select e.* from sp_emp e
    where e.department_id = o.department_id and e.id <> o.employee_id and e.manager_id is not null
      and o.expense_date between e.a_from and e.a_to and pg_temp.free_day(e.id, o.expense_date)
      and not exists (select 1 from sp_cl1 z where z.employee_id = e.id and z.category = 'meals' and z.expense_date = o.expense_date)
    order by md5('a15adc|' || o.ckey || e.id) limit 1
  ) m
) q
join public.nova_spend_policies p on p.id = pg_temp.claim_policy(q.slice_no, q.m_dep, q.m_grade, 'meals', q.expense_date)
where q.rn <= 2;

-- The split bill's total, on both halves: the first half plus the share.
update sp_cl1 c set receipt_total_override = c.amount + s.amount, force_ok = true
from sp_cl1 s where s.plant = 'A15a-decoy' and s.plant_ref = c.ckey;
update sp_cl1 s set receipt_total_override = c.receipt_total_override
from sp_cl1 c where s.plant = 'A15a-decoy' and s.plant_ref = c.ckey;

-- A15(b) claim on a leave day. Candidates: full days of APPROVED leave of a
-- claimant, old enough to be processed, with no trip and no claim that day.
create temp table sp_a15b on commit drop as
select l.id as leave_id, l.slice_no, l.employee_id, a.d,
  row_number() over (partition by l.slice_no order by md5('a15b|' || l.id)) as rk
from public.nova_leave_records l
cross join lateral (
  -- One hashed day inside the leave.
  select l.start_date + floor(pg_temp.h('a15bd|' || l.id) * (l.end_date - l.start_date + 1))::int as d
) a
join sp_clm_emp c on c.id = l.employee_id
where l.status = 'approved' and l.days >= 1 and l.start_date <= (select a from sp_asof) - 25
  and not exists (select 1 from sp_trip_day t where t.employee_id = l.employee_id and t.d = a.d)
  and not exists (select 1 from sp_cl1 z where z.employee_id = l.employee_id and z.expense_date = a.d);

-- Plants: ranks 1–2 get a home-city local-travel or meals claim that day.
-- Decoys: ranks 3–4 get a telecom claim that day (a bill date, not activity),
-- only where that month has no telecom claim yet (a per_month rule).
insert into sp_cl1 (ckey, slice_no, employee_id, category, expense_date, city, trip_id, client_id, purpose, part,
  department_id, grade, manager_id, head_id, policy_id, limit_amount, receipt_required_above, amount, gst_rate,
  keeps_small_receipt, plant, plant_ref, force_ok, policy_exception, exception_by, receipt_total_override, receipt_from)
select 'leave|' || b.leave_id, b.slice_no, b.employee_id, k.category, b.d, e.location, null, null,
  case k.category when 'telecom' then 'Mobile and data bill, ' || to_char(b.d, 'Mon YYYY')
    when 'meals' then 'Working lunch during audit' else 'Local client visit' end, 'misc',
  e.department_id, e.grade, e.manager_id, e.head_id, p.id, p.limit_amount, p.receipt_required_above,
  greatest(50, round(p.limit_amount * (0.3 + 0.6 * pg_temp.h('amt|leave|' || b.leave_id)))),
  case k.category when 'telecom' then 0.18 else 0.05 end,
  pg_temp.h('rcp|leave|' || b.leave_id) < 0.5, k.tag, b.leave_id, true, false, null, null, null
from (
  -- Decoy candidates must not already have a telecom claim in the month.
  select b0.*, row_number() over (partition by b0.slice_no order by b0.rk) as rn
  from sp_a15b b0
  where b0.rk <= 2 or not exists (select 1 from sp_cl1 z where z.employee_id = b0.employee_id and z.category = 'telecom'
    and date_trunc('month', z.expense_date) = date_trunc('month', b0.d))
) b
cross join lateral (
  select case when b.rn <= 2 then case when pg_temp.h('a15bk|' || b.leave_id) < 0.5 then 'local_conveyance' else 'meals' end
    else 'telecom' end as category,
    case when b.rn <= 2 then 'A15b' else 'A15b-decoy' end as tag
) k
join sp_emp e on e.id = b.employee_id
join public.nova_spend_policies p on p.id = pg_temp.claim_policy(b.slice_no, e.department_id, e.grade, k.category, b.d)
where b.rn <= 4;

-- A15(c) over limit. Plants: two hotel nights claimed at 115–160% of the
-- band's cap, approved in full with no exception. Decoys: two air fares over
-- the cap WITH an exception signed off by the department head (so the
-- claimant is never the head).
create temp table sp_a15c on commit drop as
select c.ckey, c.slice_no, c.category,
  row_number() over (partition by c.slice_no, c.category order by md5('a15c|' || c.ckey)) as rk
from sp_cl1 c
where c.plant is null and c.expense_date <= (select a from sp_asof) - 20
  and ((c.category = 'hotel') or (c.category = 'travel_air' and c.employee_id <> c.head_id))
  -- Not a claim another plant already uses.
  and c.ckey not in (select plant_ref from sp_cl1 where plant_ref is not null);

-- Raise the amount above the cap; the decoys also record the exception.
update sp_cl1 c set
  amount = round(c.limit_amount * (1.15 + 0.45 * pg_temp.h('a15ca|' || c.ckey))),
  force_ok = true,
  plant = case when c.category = 'hotel' then 'A15c' else 'A15c-decoy' end,
  policy_exception = c.category = 'travel_air',
  exception_by = case when c.category = 'travel_air' then c.head_id end
from sp_a15c a
where a.ckey = c.ckey and a.rk <= 2;

-- -----------------------------------------------------------------------------
-- Step 4: submission, decision, reimbursement, receipt and number.
-- -----------------------------------------------------------------------------
create temp table sp_cl2 on commit drop as
with s as (
  select c.*,
    -- Submission lag: mostly within a week, up to 30 days; plants go in promptly.
    least(c.expense_date + case when c.force_ok then floor(pg_temp.h('lag|' || c.ckey) * 5)::int
      else floor(pg_temp.h('lag|' || c.ckey) * pg_temp.h('lag2|' || c.ckey) * 31)::int end, x.a) as sub_d,
    pg_temp.h('st|' || c.ckey) as sr,
    x.a
  from sp_cl1 c cross join sp_asof x
), d as (
  select s.*,
    -- Claims submitted in the last 10 days are still in the queue (contract §4.1).
    case when s.sub_d >= s.a - 10 and not s.force_ok then case when s.sr < 0.7 then 'submitted' else 'queried' end
         when not s.force_ok and s.sr < 0.03 then 'rejected'
         when not s.force_ok and s.sr < 0.04 then 'queried'
         else 'approved' end as st0,
    -- The decision comes 1–6 days after submission.
    least(s.sub_d + 1 + floor(pg_temp.h('apd|' || s.ckey) * 6)::int, s.a) as dec_d
  from s
)
select d.*,
  -- The manager decides; if they had left (or not yet joined), the department head does.
  case when d.st0 in ('approved', 'rejected') then
    case when m.exit_date < d.dec_d or m.join_date > d.dec_d then coalesce(nullif(d.head_id, d.employee_id), d.manager_id)
         else d.manager_id end end as approver,
  -- Reimbursement: the department's first payroll paid on or after the decision day.
  r.id as run_id, r.pay_date
from d
left join sp_emp m on m.id = d.manager_id
left join lateral (
  select pr.id, pr.pay_date from public.nova_payroll_runs pr
  where pr.department_id = d.department_id and pr.pay_date >= d.dec_d and d.st0 = 'approved'
  order by pr.pay_date limit 1
) r on true;

-- Store the claims. Numbers follow submission order, so plants sit among their neighbours.
insert into public.nova_expense_claims (id, slice_no, claim_number, employee_id, department_id, category, expense_date,
  submitted_at, city, trip_id, client_id, business_purpose, amount, gst_amount, receipt_number, receipt_merchant,
  receipt_date, receipt_total, receipt_hash, policy_id, policy_exception, exception_approved_by, status, approved_by,
  approved_at, approved_amount, reimbursed_on, payroll_run_id)
select 'ecl_' || left(md5('nova_expense_claims|' || c.slice_no || '|' || c.ckey), 12), c.slice_no,
  'CLM-' || lpad(row_number() over (partition by c.slice_no order by c.sub_ts, c.ckey)::text, 5, '0'),
  c.employee_id, c.department_id, c.category, c.expense_date, c.sub_ts, c.city, c.trip_id, c.client_id, c.purpose,
  c.amount, round(c.amount * c.gst_rate / (1 + c.gst_rate), 2),
  -- Receipt fields come from the receipt's own claim (rk), so a copied bill is the same document.
  case when c.has_rcpt then case when c.category in ('travel_air', 'travel_rail') then 'PNR' || upper(left(md5('pnr|' || c.rkey), 6))
    when c.category = 'hotel' then 'FOL-' || pg_temp.dg('fol|' || c.rkey, 6)
    when c.category = 'telecom' then 'BILL-' || pg_temp.dg('bill|' || c.rkey, 8)
    else 'INV-' || pg_temp.dg('inv|' || c.rkey, 6) end end,
  case when c.has_rcpt then c.merchant end,
  case when c.has_rcpt then c.r_date end,
  case when c.has_rcpt then coalesce(c.receipt_total_override, c.amount) end,
  case when c.has_rcpt then left(md5('receipt|' || c.rkey), 16) end,
  c.policy_id, c.policy_exception, c.exception_by,
  case when c.st0 = 'approved' and c.run_id is not null then 'reimbursed' else c.st0 end,
  c.approver,
  case when c.approver is not null then pg_temp.ist(c.dec_d, 600 + floor(pg_temp.h('apm|' || c.ckey) * 480)::int) end,
  -- Rejections approve nothing; 6% of normal approvals trim the claim; plants are paid in full.
  case when c.st0 = 'rejected' then 0
       when c.st0 = 'approved' and not c.force_ok and pg_temp.h('trim|' || c.ckey) < 0.06
         then round(c.amount * (0.85 + 0.1 * pg_temp.h('trim2|' || c.ckey)), 2)
       when c.st0 = 'approved' then c.amount end,
  c.pay_date, c.run_id
from (
  select c2.*,
    pg_temp.ist(c2.sub_d, 540 + floor(pg_temp.h('sbm|' || c2.ckey) * 600)::int) as sub_ts,
    coalesce(c2.receipt_from, c2.ckey) as rkey,
    -- A bill is carried above the threshold, by copies and plants, and by half the small claims.
    c2.amount > c2.receipt_required_above or c2.keeps_small_receipt or c2.receipt_from is not null or c2.plant is not null as has_rcpt,
    o.expense_date as r_date,
    -- Merchant by category from a phrase bank; hotels carry the city in their name.
    case o.category
      when 'travel_air' then (array['SkyWing Airlines', 'IndiGlide Air', 'BlueJet Airways'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 3)::int]
      when 'travel_rail' then 'Rail Reservation e-Ticket'
      when 'hotel' then (array['Grand Residency ', 'Lakeview Suites ', 'Metro Inn ', 'Park Avenue Business Hotel '])[1 + floor(pg_temp.h('mer|' || o.ckey) * 4)::int] || o.city
      when 'local_conveyance' then (array['RideNow Mobility', 'Metro Cabs', 'City Auto Rides'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 3)::int]
      when 'meals' then (array['Spice Route Kitchen', 'Cafe Nirvana', 'Annapurna Tiffins', 'Coastal Curry House'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 4)::int]
      when 'client_entertainment' then (array['The Terrace Grill', 'Saffron Fine Dining', 'Royal Dine Banquets'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 3)::int]
      when 'telecom' then (array['VoiceLink Telecom', 'AirWave Mobile'])[1 + floor(pg_temp.h('mer|' || o.employee_id) * 2)::int]
      when 'fuel' then (array['Bharat Fuel Station', 'HighwayPoint Fuels', 'City Fuels'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 3)::int]
      when 'office_supplies' then (array['Office Mart', 'Supreme Stationers', 'Paper Point'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 3)::int]
      else (array['Speedpost Couriers', 'Quick Print Centre', 'Local hardware store'])[1 + floor(pg_temp.h('mer|' || o.ckey) * 3)::int] end as merchant
  from sp_cl2 c2
  join sp_cl1 o on o.ckey = coalesce(c2.receipt_from, c2.ckey)
) c;

-- Claim ids by internal key, for the answer key below.
create temp table sp_cl_id on commit drop as
select c.ckey, c.plant, c.plant_ref, 'ecl_' || left(md5('nova_expense_claims|' || c.slice_no || '|' || c.ckey), 12) as id, c.slice_no
from sp_cl1 c;

-- -----------------------------------------------------------------------------
-- Corporate cards: every G5+ employee plus 1–3 frequent travellers from
-- Sales and Operations (contract §4.1: G4+ staff and frequent travellers;
-- G5+ is used so the programme stays inside 15–20 cards per company).
-- Kept in a temp table first: the monthly limit is sized from real usage,
-- which is only known once the transactions exist.
-- -----------------------------------------------------------------------------

-- Frequent travellers: the G3–G4 Sales/Operations claimants with the most trips.
create temp table sp_traveller on commit drop as
select x.id from (
  select t.employee_id as id, t.slice_no,
    row_number() over (partition by t.slice_no order by count(*) desc, md5('trv|' || t.employee_id)) as rk
  from sp_trip2 t join sp_emp e on e.id = t.employee_id
  where e.dept in ('Sales', 'Operations') and e.grade in ('G3', 'G4')
  group by t.employee_id, t.slice_no
) x
where x.rk <= 1 + floor(pg_temp.h('trvn|' || x.slice_no) * 3);

-- Card rows. Issue date: a few weeks after joining, or 1–3 years before as_of.
create temp table sp_card on commit drop as
select c.*,
  -- The approved-spend range: from issue (or the window start) to close, block or as_of.
  greatest(c.issued_on, x.w0) as use_from,
  case when c.status = 'closed' then c.closed_on when c.status = 'blocked' then c.blocked_from - 1 else x.a end as use_to
from (
  select b.*,
    case when b.exit_date is not null then 'closed' when b.block_rk = 1 then 'blocked' else 'active' end as status,
    -- A card closes on its holder's exit date (contract §4.1).
    b.exit_date as closed_on,
    -- Reported lost 20–80 days before as_of; declines follow.
    (select a from sp_asof) - 20 - floor(pg_temp.h('blk|' || b.id) * 60)::int as blocked_from
  from (
    select e.id as employee_id, e.slice_no, e.department_id, e.dept, e.grade, e.location, e.exit_date,
      'ccd_' || left(md5('nova_corporate_cards|' || e.slice_no || '|' || e.id), 12) as id,
      greatest(e.join_date + 20 + floor(pg_temp.h('iss|' || e.id) * 40)::int,
        (select a from sp_asof) - 1100 + floor(pg_temp.h('iss2|' || e.id) * 700)::int) as issued_on,
      -- One lost card per company, among G5 holders still employed.
      case when e.grade = 'G5' and e.exit_date is null then
        row_number() over (partition by e.slice_no, (e.grade = 'G5' and e.exit_date is null) order by md5('blkr|' || e.id)) end as block_rk,
      -- Per-transaction cap by seniority, ±10% per company, in round ₹5,000.
      round(case when e.grade = 'G8' then 200000 when e.grade >= 'G6' then 100000 when e.grade = 'G5' then 50000 else 25000 end
        * (0.9 + 0.2 * pg_temp.h('ptl|' || e.slice_no)) / 5000) * 5000 as per_txn_limit,
      -- Network mix typical of Indian corporate programmes.
      case when pg_temp.h('net|' || e.id) < 0.45 then 'visa' when pg_temp.h('net|' || e.id) < 0.8 then 'mastercard' else 'rupay' end as network,
      pg_temp.dg('last4|' || e.id, 4) as card_last4,
      -- Programme rule by grade band.
      (select p.id from public.nova_spend_policies p where p.slice_no = e.slice_no
        and p.policy_code = case when e.grade >= 'G6' then 'CRD-SNR-G6-G8' else 'CRD-STD-G1-G5' end) as policy_id,
      (select p.blocked_mcc from public.nova_spend_policies p where p.slice_no = e.slice_no
        and p.policy_code = case when e.grade >= 'G6' then 'CRD-SNR-G6-G8' else 'CRD-STD-G1-G5' end) as blocked_mcc,
      (select p.limit_amount from public.nova_spend_policies p where p.slice_no = e.slice_no
        and p.policy_code = case when e.grade >= 'G6' then 'CRD-SNR-G6-G8' else 'CRD-STD-G1-G5' end) as base_monthly
    from sp_emp e
    where (e.grade >= 'G5' or e.id in (select id from sp_traveller)) and e.a_to - e.a_from >= 60
  ) b
  -- A card issued in the last 45 days of employment has no history yet; leave it out.
  where b.issued_on <= coalesce(b.exit_date, (select a from sp_asof)) - 45
) c
cross join sp_asof x;
alter table sp_card add primary key (id);
analyze sp_card;

-- One or two cards carry a temporary raised limit for a past trip.
create temp table sp_card_temp on commit drop as
select c.id, c.per_txn_limit * 2 as temp_limit,
  (select a from sp_asof) - 30 - floor(pg_temp.h('tmpu|' || c.id) * 200)::int as temp_until
from (
  select c0.*, row_number() over (partition by c0.slice_no order by md5('tmp|' || c0.id)) as rk
  from sp_card c0 where c0.status = 'active' and c0.grade <= 'G5'
) c
where c.rk <= 1 + floor(pg_temp.h('tmpn|' || c.slice_no) * 2);

-- -----------------------------------------------------------------------------
-- Subscriptions, card-billed: a catalog of 24 services; each company takes
-- 11–15 as normal subscriptions plus the rows the A17 plants and decoys need.
-- -----------------------------------------------------------------------------
create temp table sp_sub_cat on commit drop as
select * from (values
  -- name, vendor, category, cycle, seat-based, base price (per seat or per cycle), billed in USD, preferred owner departments
  ('TeamThread Chat Business', 'TeamThread Inc', 'saas', 'monthly', true, 650, true, array['Information Technology']),
  ('DocuVault Storage Plus', 'DocuVault Technologies', 'saas', 'monthly', true, 420, false, array['Information Technology', 'Finance and Accounts']),
  ('Nimbus Compute Credits', 'Nimbus Cloud Services', 'cloud', 'monthly', false, 18000, true, array['Information Technology']),
  ('Nimbus Object Storage', 'Nimbus Cloud Services', 'cloud', 'monthly', false, 4200, true, array['Information Technology']),
  ('SignSure eSign Business', 'SignSure Digital LLP', 'saas', 'quarterly', false, 7500, false, array['Finance and Accounts', 'Human Resources']),
  ('PixelPress Design Suite', 'PixelPress Software', 'saas', 'annual', true, 5200, true, array['Sales']),
  ('MeetSpace Video Pro', 'MeetSpace Communications', 'saas', 'monthly', true, 350, true, array['Information Technology', 'Sales']),
  ('LeadLens Analytics', 'LeadLens Labs', 'saas', 'monthly', false, 5500, false, array['Sales']),
  ('MailRelay Bulk Mailer', 'MailRelay Networks', 'saas', 'monthly', false, 2800, false, array['Sales', 'Customer Service']),
  ('HelpDesk One', 'Supportly Software', 'saas', 'monthly', true, 900, false, array['Customer Service']),
  ('VoiceLink Business SIM Pool', 'VoiceLink Telecom Ltd', 'telecom', 'monthly', true, 399, false, array['Operations', 'Sales']),
  ('SecureNet VPN Teams', 'SecureNet Systems', 'saas', 'annual', true, 2400, true, array['Information Technology']),
  ('Market Pulse Digital', 'Market Pulse Media', 'media', 'annual', false, 6000, false, array['Finance and Accounts', 'Sales']),
  ('Trade Journal Premium', 'Deccan Business Media', 'media', 'annual', false, 3600, false, array['Procurement', 'Sales']),
  ('CodeHarbor Repositories', 'CodeHarbor Inc', 'saas', 'monthly', true, 400, true, array['Information Technology']),
  ('FormFlow Surveys', 'FormFlow Apps', 'saas', 'monthly', false, 1900, false, array['Customer Service', 'Human Resources']),
  ('RouteWise Fleet Tracking', 'RouteWise Telematics', 'saas', 'monthly', true, 250, false, array['Warehouse and Logistics']),
  ('Nimbus Backup Vault', 'Nimbus Cloud Services', 'cloud', 'monthly', false, 3100, true, array['Information Technology']),
  ('AdReach Campaign Manager', 'AdReach Digital', 'saas', 'monthly', false, 7500, false, array['Sales']),
  ('StockSense Forecasting', 'StockSense Analytics', 'saas', 'quarterly', false, 12500, false, array['Procurement', 'Warehouse and Logistics']),
  ('PrintHub Managed Printers', 'PrintHub Services', 'maintenance', 'quarterly', false, 9000, false, array['Operations']),
  ('HireTrack Recruiting', 'HireTrack Software', 'saas', 'monthly', true, 1200, false, array['Human Resources']),
  ('TaskGrid Projects', 'TaskGrid Labs', 'saas', 'monthly', true, 550, true, array['Operations', 'Information Technology']),
  ('PayRoute Expense Cards Portal', 'PayRoute Fintech', 'saas', 'monthly', false, 2500, false, array['Finance and Accounts'])
) as t(name, vendor_name, category, cycle, seat, base, usd, owner_depts);

-- Per company: the catalog in hashed order, then the roles in a fixed
-- sequence, each taking the first unused eligible service. The roles decide
-- WHAT a row is; its position in the API is set by dates, not by this order.
create temp table sp_sub_role on commit drop as
with rk as (
  select s.slice_no, c.*, row_number() over (partition by s.slice_no order by md5('subcat|' || s.slice_no || c.name)) as rk
  from generate_series(0, 79) as s(slice_no) cross join sp_sub_cat c
), r1 as (
  -- A17(a) base: the first seat-based monthly SaaS.
  select distinct on (slice_no) slice_no, name as dup_base from rk where seat and cycle = 'monthly' and category = 'saas' order by slice_no, rk
), r2 as (
  -- A17(b) decoy: onboarding, any seat-based service.
  select distinct on (rk.slice_no) rk.slice_no, rk.name as onboarding from rk join r1 using (slice_no)
  where rk.seat and rk.name <> r1.dup_base order by rk.slice_no, rk.rk
), r3 as (
  -- A16(c) decoy: a flat monthly charge at 95% of a card's limit.
  select distinct on (rk.slice_no) rk.slice_no, rk.name as pct95 from rk join r1 using (slice_no) join r2 using (slice_no)
  where not rk.seat and rk.cycle = 'monthly' and rk.name not in (r1.dup_base, r2.onboarding) order by rk.slice_no, rk.rk
), r4 as (
  -- A17(b) plant: the zombie, monthly so it is visibly still charged after its owner left.
  select distinct on (rk.slice_no) rk.slice_no, rk.name as zombie from rk join r1 using (slice_no) join r2 using (slice_no) join r3 using (slice_no)
  where rk.cycle = 'monthly' and rk.name not in (r1.dup_base, r2.onboarding, r3.pct95) order by rk.slice_no, rk.rk
), r5 as (
  -- A17(a) decoy: the migration pair.
  select distinct on (rk.slice_no) rk.slice_no, rk.name as migration
  from rk join r1 using (slice_no) join r2 using (slice_no) join r3 using (slice_no) join r4 using (slice_no)
  where rk.name not in (r1.dup_base, r2.onboarding, r3.pct95, r4.zombie) order by rk.slice_no, rk.rk
)
select rk.slice_no, rk.name, rk.vendor_name, rk.category, rk.cycle, rk.seat, rk.base, rk.usd, rk.owner_depts, v.role
from rk
join r1 using (slice_no) join r2 using (slice_no) join r3 using (slice_no) join r4 using (slice_no) join r5 using (slice_no)
cross join lateral (
  select case rk.name when r1.dup_base then 'dup_base' when r2.onboarding then 'onboarding' when r3.pct95 then 'pct95'
    when r4.zombie then 'zombie' when r5.migration then 'migration' else 'normal' end as role
) v;

-- Normal services: 11–15 per company, the first unused ones in hashed order.
delete from sp_sub_role s using (
  select slice_no, name, row_number() over (partition by slice_no order by md5('subcat|' || slice_no || name)) as n
  from sp_sub_role where role = 'normal'
) r
where s.slice_no = r.slice_no and s.name = r.name and s.role = 'normal'
  and r.n > 11 + floor(pg_temp.h('subn|' || s.slice_no) * 5);

-- One row per subscription: the duplicate base gets its twin, the migration
-- its old and new row. part is internal only.
create temp table sp_sub0 on commit drop as
select r.*, p.part, r.name || case when p.part in ('twin', 'old', 'new') then '|' || p.part else '' end as skey,
  case r.cycle when 'monthly' then 1 when 'quarterly' then 3 else 12 end as cycle_m
from sp_sub_role r
cross join lateral (
  select 'main' as part where r.role not in ('migration')
  union all select 'twin' where r.role = 'dup_base'
  union all select 'old' where r.role = 'migration'
  union all select 'new' where r.role = 'migration'
) p;

-- Owner, dates and seats. Owners are staff still employed (so nothing is a
-- zombie by accident), from the service's natural department; the twin's
-- owner sits in another department; the zombie's owner left ≥ 60 days ago.
create temp table sp_sub1 on commit drop as
with o as (
  select s.*, own.id as owner_id, own.department_id as owner_dept, own.exit_date as owner_exit
  from sp_sub0 s
  cross join lateral (
    select e.* from sp_emp e
    -- Owners are G3+ staff still employed; the zombie's owner is anyone who left 60+ days ago.
    where e.slice_no = s.slice_no
      and case when s.role = 'zombie' then e.exit_date <= (select a from sp_asof) - 60 else e.exit_date is null and e.grade >= 'G3' end
    order by array_position(s.owner_depts, e.dept) nulls last, md5('subown|' || s.skey || e.id)
    limit 1
  ) own
  where s.part <> 'twin'
), t as (
  -- The twin: same service, an owner from a different department.
  select s.*, own.id, own.department_id, own.exit_date
  from sp_sub0 s
  join o b on b.slice_no = s.slice_no and b.name = s.name and b.part = 'main'
  cross join lateral (
    select e.* from sp_emp e
    where e.slice_no = s.slice_no and e.grade >= 'G3' and e.exit_date is null and e.department_id <> b.owner_dept
    order by array_position(s.owner_depts, e.dept) nulls last, md5('subown|' || s.skey || e.id) limit 1
  ) own
  where s.part = 'twin'
), a as (select * from o union all select * from t)
select a.*, x.a as asof, x.w0,
  -- Start dates by role (all before as_of; the twin overlaps its base by ≥ 100 days).
  case when a.role = 'dup_base' and a.part = 'main' then x.a - 250 - floor(pg_temp.h('st|' || a.slice_no || a.skey) * 500)::int
       when a.part = 'twin' then x.a - 100 - floor(pg_temp.h('st|' || a.slice_no || a.skey) * 120)::int
       when a.role = 'onboarding' then x.a - 3 - floor(pg_temp.h('st|' || a.slice_no || a.skey) * 25)::int
       when a.role = 'zombie' then a.owner_exit - 150 - floor(pg_temp.h('st|' || a.slice_no || a.skey) * 300)::int
       when a.part = 'old' then x.a - 900 + floor(pg_temp.h('st|' || a.slice_no || a.skey) * 200)::int
       when a.part = 'new' then x.a - 120 - floor(pg_temp.h('mig|' || a.slice_no || a.name) * 120)::int
         + floor(pg_temp.h('mig2|' || a.slice_no || a.name) * 3)::int
       else x.a - 60 - floor(pg_temp.h('st|' || a.slice_no || a.skey) * 900)::int end as started_on,
  -- The migration's old row ends on (or just before) the day the new one starts.
  case when a.part = 'old' then x.a - 120 - floor(pg_temp.h('mig|' || a.slice_no || a.name) * 120)::int end as cancel0,
  -- Price per seat or per cycle, ±10% per company, in round ₹10.
  round(a.base * (0.9 + 0.2 * pg_temp.h('px|' || a.slice_no || a.name)) / 10) * 10 as unit0,
  -- Seats: the duplicate base is under half used, the twin small; onboarding has no one on it yet.
  case when not a.seat then null
       when a.role = 'dup_base' and a.part = 'main' then 12 + floor(pg_temp.h('seat|' || a.slice_no || a.skey) * 14)::int
       when a.part = 'twin' then 3 + floor(pg_temp.h('seat|' || a.slice_no || a.skey) * 5)::int
       else 5 + floor(pg_temp.h('seat|' || a.slice_no || a.skey) * 21)::int end as seats_p,
  pg_temp.h('seat2|' || a.slice_no || a.skey) as seat_r
from a cross join sp_asof x;

-- Seats in use, with the A17(a) rule: base active + twin active ≤ base purchased.
create temp table sp_sub2 on commit drop as
select s.*,
  case when s.seats_p is null then null
       when s.role = 'onboarding' then 0
       when s.role = 'dup_base' and s.part = 'main' then floor(s.seats_p * (0.40 + 0.15 * s.seat_r))::int
       when s.part = 'twin' then greatest(1, floor(s.seats_p * 0.7))::int
       else greatest(1, floor(s.seats_p * (0.6 + 0.4 * s.seat_r)))::int end as seats_a,
  -- One normal service per company was cancelled during the year.
  s.role = 'normal' and s.started_on <= s.asof - 200
    and row_number() over (partition by s.slice_no, (s.role = 'normal' and s.started_on <= s.asof - 200)
      order by md5('subcan|' || s.slice_no || s.skey)) = 1 as cancels
from sp_sub1 s;

-- Price creep (contract §4.1: 3–5 per company): 3–5 normal, uncancelled
-- services per company whose price rose once or twice during the year. Each
-- is dated to start at least 340 days back, before its first price step.
alter table sp_sub2 add column creep boolean not null default false;
update sp_sub2 s set creep = true,
  started_on = least(s.started_on, s.asof - 340 - floor(pg_temp.h('crps|' || s.slice_no || s.skey) * 300)::int)
from (
  select slice_no, skey, row_number() over (partition by slice_no order by md5('crp|' || slice_no || skey)) as rk
  from sp_sub2 where role = 'normal' and not cancels
) r
where r.slice_no = s.slice_no and r.skey = s.skey and r.rk <= 3 + floor(pg_temp.h('crpn|' || s.slice_no) * 3);

create temp table sp_sub3 on commit drop as
select s.*,
  s.creep and pg_temp.h('crp2|' || s.slice_no || s.skey) < 0.4 as two_steps,
  -- Step sizes 5–15%; the step dates sit 200–300 and 50–150 days before as_of.
  0.05 + 0.10 * pg_temp.h('g1|' || s.slice_no || s.skey) as g1,
  0.05 + 0.10 * pg_temp.h('g2|' || s.slice_no || s.skey) as g2,
  s.asof - 300 + floor(pg_temp.h('d1|' || s.slice_no || s.skey) * 100)::int as d1,
  s.asof - 150 + floor(pg_temp.h('d2|' || s.slice_no || s.skey) * 100)::int as d2,
  -- The migration's old row ends where its successor starts; one normal service is cancelled 30–180 days ago.
  case when s.part = 'old' then s.cancel0
       when s.cancels then greatest(s.started_on + 60, s.asof - 30 - floor(pg_temp.h('can|' || s.slice_no || s.skey) * 150)::int) end as cancelled_on
from sp_sub2 s;

-- The price path: [start, first step, second step], per seat or per cycle.
create temp table sp_sub_px on commit drop as
select s.slice_no, s.skey, v.k, v.eff, v.unit, coalesce(s.seats_p, 1) * v.unit as amount
from sp_sub3 s
cross join lateral (
  select 0 as k, s.started_on as eff, s.unit0 as unit
  union all select 1, s.d1, round(s.unit0 * (1 + s.g1)) where s.creep
  union all select 2, s.d2, round(s.unit0 * (1 + s.g1) * (1 + s.g2)) where s.creep and s.two_steps
) v;

-- The billing card: an active card issued before the first bill in the
-- window, whose per-transaction limit covers the bill with 15% headroom,
-- preferring the owner's department. The 95% decoy takes the card with the
-- lowest limit and is priced off it.
create temp table sp_sub4 on commit drop as
select s.*, c.id as card_id, c.per_txn_limit, c.use_from, c.use_to,
  case when s.role = 'pct95' then round(0.95 * c.per_txn_limit) else px.amount end as current_amount,
  case when s.role = 'pct95' then round(0.95 * c.per_txn_limit) else px.unit end as unit_price
from sp_sub3 s
-- The latest price step is the current price.
join lateral (select p.amount, p.unit from sp_sub_px p where p.slice_no = s.slice_no and p.skey = s.skey order by p.k desc limit 1) px on true
cross join lateral (
  select c.* from sp_card c
  where c.slice_no = s.slice_no and c.status = 'active' and c.issued_on <= greatest(s.started_on, s.w0)
  order by (s.role = 'pct95' or c.per_txn_limit * 0.85 >= px.amount) desc,
    case when s.role = 'pct95' then c.per_txn_limit end asc nulls last,
    (c.department_id = s.owner_dept) desc, md5('subcard|' || s.slice_no || s.skey || c.id)
  limit 1
) c;

-- The 95% decoy's single price replaces its catalog price in the path.
update sp_sub_px p set unit = s.current_amount, amount = s.current_amount
from sp_sub4 s where s.role = 'pct95' and p.slice_no = s.slice_no and p.skey = s.skey;

-- Billing dates: every cycle from the start, inside the window, while the
-- card could be used and the service was not cancelled.
create temp table sp_sub_bill on commit drop as
select s.slice_no, s.skey, s.card_id, b.d,
  -- The price in force on the billing day.
  (select p.amount from sp_sub_px p where p.slice_no = s.slice_no and p.skey = s.skey and p.eff <= b.d order by p.k desc limit 1) as amount
from sp_sub4 s
cross join lateral (
  select (s.started_on + make_interval(months => i * s.cycle_m))::date as d from generate_series(0, 120) as i
) b
where b.d between greatest(s.w0, s.use_from) and least(s.asof, s.use_to, coalesce(s.cancelled_on - 1, s.asof));

-- -----------------------------------------------------------------------------
-- Subscriptions, bank-billed: the 8 recurring nova_expenses groups per
-- company (contract §4.1), copying vendor_name exactly so teams can join on it.
-- -----------------------------------------------------------------------------
create temp table sp_bsub on commit drop as
with r as (
  -- Every recurring bill in the window, with the previous one's amount.
  select x.*, lag(x.amount) over (partition by x.slice_no, x.vendor_name order by x.expense_date, x.id) as prev_amount,
    row_number() over (partition by x.slice_no, x.vendor_name order by x.expense_date desc, x.id desc) as rn_desc
  from public.nova_expenses x where x.recurring
)
select r.slice_no, 'bank|' || r.vendor_name as skey, r.description as name, r.vendor_name,
  case r.category when 'rent' then 'rent' when 'software' then 'saas' when 'utilities' then 'utilities'
    else 'professional_services' end as category,
  -- Contracts older than the window: 2–4 years before as_of.
  (select a from sp_asof) - 700 - floor(pg_temp.h('bst|' || r.slice_no || r.vendor_name) * 700)::int as started_on,
  r.amount as current_amount, r.expense_date as last_bill, r.category as exp_category,
  -- The owner is the head of the department the bill is booked to.
  d.head_employee_id as owner_id, d.id as owner_dept,
  -- The vendor master, where the payee is one (soft ref, same slice).
  (select v.id from public.nova_vendors v where v.slice_no = r.slice_no and v.name = r.vendor_name order by v.id limit 1) as vendor_id,
  -- Price steps: the first bill, then every bill whose amount changed.
  (select jsonb_agg(jsonb_build_object('effective_from', q.expense_date, 'amount', q.amount) order by q.expense_date, q.id)
   from r q where q.slice_no = r.slice_no and q.vendor_name = r.vendor_name
     and (q.prev_amount is null or q.prev_amount <> q.amount)) as steps
from r
join public.nova_departments d on d.id = r.department_id
where r.rn_desc = 1;

-- Every subscription, card and bank, in the stored shape.
create temp table sp_sub_all on commit drop as
select s.slice_no, s.skey, 'sub_' || left(md5('nova_subscriptions|' || s.slice_no || '|' || s.skey), 12) as id,
  s.name, s.vendor_name, null::text as vendor_id, s.category, s.owner_id, s.owner_dept, s.cycle as billing_cycle,
  'card' as billing_channel, s.card_id, s.seats_p as seats_purchased, s.seats_a as seats_active, s.unit_price,
  s.current_amount, s.started_on,
  -- The next cycle date after as_of, or for a cancelled service the renewal it stopped.
  (select (s.started_on + make_interval(months => i * s.cycle_m))::date from generate_series(1, 200) as i
   where (s.started_on + make_interval(months => i * s.cycle_m))::date > coalesce(s.cancelled_on, s.asof) order by i limit 1) as renewal_date,
  s.cancelled_on is null as auto_renew,
  case when s.cancelled_on is not null then 'cancelled' else 'active' end as status, s.cancelled_on,
  -- Usage: none measurable for maintenance, none yet while onboarding; the
  -- zombie's stops at its owner's exit; a cancelled one stops before cancelling.
  case when s.category = 'maintenance' or s.role = 'onboarding' then null
       when s.role = 'zombie' then greatest(s.started_on, s.owner_exit - floor(pg_temp.h('use|' || s.slice_no || s.skey) * 10)::int)
       when s.cancelled_on is not null then greatest(s.started_on, s.cancelled_on - floor(pg_temp.h('use|' || s.slice_no || s.skey) * 20)::int)
       else greatest(s.started_on, s.asof - floor(pg_temp.h('use|' || s.slice_no || s.skey) * 12)::int) end as last_used_on,
  (select jsonb_agg(jsonb_build_object('effective_from', p.eff, 'amount', p.amount) order by p.k)
   from sp_sub_px p where p.slice_no = s.slice_no and p.skey = s.skey) as price_history,
  s.role, s.part, s.usd
from sp_sub4 s
union all
select b.slice_no, b.skey, 'sub_' || left(md5('nova_subscriptions|' || b.slice_no || '|' || b.skey), 12),
  b.name, b.vendor_name, b.vendor_id, b.category, b.owner_id, b.owner_dept, 'monthly', 'bank', null, null, null,
  b.current_amount, b.current_amount, b.started_on,
  -- Monthly: the first bill date after as_of.
  (select (b.last_bill + make_interval(months => i))::date from generate_series(1, 3) as i
   where (b.last_bill + make_interval(months => i))::date > (select a from sp_asof) order by i limit 1),
  true, 'active', null,
  -- Software is used daily; rent, power, lines and retainers have no usage signal.
  case when b.exp_category = 'software' then (select a from sp_asof) - floor(pg_temp.h('buse|' || b.slice_no || b.skey) * 7)::int end,
  -- The contract start carries the first amount; later entries are real changes.
  jsonb_set(b.steps, '{0,effective_from}', to_jsonb(b.started_on)),
  'bank', 'main', false
from sp_bsub b;

-- -----------------------------------------------------------------------------
-- Card transactions, step 1: phrase banks and the normal flow of spend.
-- -----------------------------------------------------------------------------

-- Merchants per MCC group, with the usual ticket range in ₹. No MCC here is
-- on any blocked list, so normal spend can never trip A16(a) by accident.
create temp table sp_mcc on commit drop as
select grp, (row_number() over (partition by grp order by mcc, merchant) - 1)::int as i, mcc, merchant, lo, hi from (values
  ('travel', '4511', 'SkyWing Airlines', 3500, 15000), ('travel', '4511', 'IndiGlide Air', 3500, 15000),
  ('travel', '4121', 'RideNow Mobility', 150, 1500), ('travel', '4121', 'Metro Cabs', 150, 1500),
  ('travel', '4722', 'Skyline Travels', 2000, 12000),
  ('lodging', '7011', 'Grand Residency', 2500, 9000), ('lodging', '7011', 'Lakeview Suites', 2500, 9000),
  ('lodging', '7011', 'Metro Inn', 2000, 6000),
  ('fuel', '5541', 'Bharat Fuel Station', 800, 5000), ('fuel', '5542', 'HighwayPoint Fuels', 800, 5000),
  ('restaurants', '5812', 'Spice Route Kitchen', 300, 4500), ('restaurants', '5812', 'Coastal Curry House', 300, 4500),
  ('restaurants', '5814', 'QuickBite Express', 150, 1200), ('restaurants', '5812', 'The Terrace Grill', 800, 4500),
  ('software', '5734', 'CloudStack Software Store', 1000, 15000), ('software', '5817', 'AppBazaar Digital', 500, 8000),
  ('office', '5111', 'Office Mart', 300, 6000), ('office', '5943', 'Supreme Stationers', 300, 4000),
  ('office', '5045', 'Digital Hub Electronics', 2000, 8000),
  ('telecom', '4814', 'VoiceLink Telecom', 300, 2500), ('telecom', '4814', 'AirWave Mobile', 300, 2500),
  ('retail', '5311', 'CityMart Superstore', 500, 8000), ('retail', '5732', 'Digital Hub Electronics', 1500, 12000),
  ('retail', '5651', 'Trendz Apparel', 800, 6000),
  ('entertainment', '7832', 'Screen Nine Cinemas', 300, 3000), ('entertainment', '7996', 'FunZone Parks', 500, 5000),
  ('other', '4215', 'Speedpost Couriers', 200, 3000), ('other', '7299', 'Quick Print Centre', 200, 3000),
  ('other', '8999', 'Kamath Valuers', 1000, 5000)
) as t(grp, mcc, merchant, lo, hi);
-- Looked up by group and index for every slot.
create index on sp_mcc (grp, i);

-- The blocked MCCs (card programme rules) and what a statement shows for them.
create temp table sp_mcc_blk on commit drop as
select * from (values
  ('5813', 'entertainment', 'The Brew Yard'), ('7995', 'entertainment', 'LuckyStrike Gaming'),
  ('5944', 'retail', 'Swarna Jewellers'), ('6011', 'cash', 'ATM Cash Withdrawal')
) as t(mcc, grp, merchant);

-- Group mix of normal spend, as cumulative bands over [0, 1).
create temp table sp_grp on commit drop as
select grp, (sum(w) over (order by ord) - w) / 100.0 as lo, sum(w) over (order by ord) / 100.0 as hi from (values
  (1, 'travel', 19), (2, 'lodging', 8), (3, 'fuel', 12), (4, 'restaurants', 19), (5, 'software', 5), (6, 'office', 11),
  (7, 'telecom', 5), (8, 'retail', 8), (9, 'entertainment', 4), (10, 'other', 9)
) as t(ord, grp, w);

-- Each card's share of its company's spend: days usable in the window, and
-- half as much again for Sales staff and travellers.
create temp table sp_card_w on commit drop as
select c.id, c.slice_no,
  (sum(c.w) over (partition by c.slice_no order by c.id) - c.w) / sum(c.w) over (partition by c.slice_no) as lo,
  sum(c.w) over (partition by c.slice_no order by c.id) / sum(c.w) over (partition by c.slice_no) as hi
from (
  select c0.*, greatest(0, c0.use_to - c0.use_from + 1)
    * case when c0.dept = 'Sales' or c0.employee_id in (select id from sp_traveller) then 1.5 else 1 end as w
  from sp_card c0
) c
where c.w > 0;

-- Volume: 600–659 transactions per company (contract 550–700) = the bills,
-- the plant and decoy rows added below, and the free spend filling the rest.
create temp table sp_tx_n on commit drop as
select s as slice_no,
  600 + floor(pg_temp.h('txn|' || s) * 60)::int
    - (select count(*) from sp_sub_bill b where b.slice_no = s)::int - 11 as n
from generate_series(0, 79) as s;

-- The free spend. Every roll is keyed on the slot, so the plants below can
-- rewrite a slot without disturbing any other.
create temp table sp_tx0 on commit drop as
with slot as (
  select n.slice_no, g, 'free|' || g as tkey,
    pg_temp.h('txc|' || n.slice_no || '|' || g) as u_card, pg_temp.h('txg|' || n.slice_no || '|' || g) as u_grp
  from sp_tx_n n cross join generate_series(0, 699) as g
  where g < n.n
)
select s.slice_no, s.tkey, c.id as card_id, c.employee_id, c.per_txn_limit, c.blocked_mcc, c.location,
  c.use_from + floor(pg_temp.h('txd|' || s.slice_no || s.tkey) * (c.use_to - c.use_from + 1))::int as d,
  -- 07:00–22:59 IST, peaking mid-afternoon (mean of two rolls).
  420 + floor((pg_temp.h('txh|' || s.slice_no || s.tkey) + pg_temp.h('txh2|' || s.slice_no || s.tkey)) / 2 * 960)::int as minutes,
  m.grp, m.mcc, m.merchant,
  -- Skewed toward small tickets; never above 85% of the card's cap.
  least(floor(0.85 * c.per_txn_limit), round(m.lo + (m.hi - m.lo) * power(pg_temp.h('txa|' || s.slice_no || s.tkey), 2)))::numeric(14,2) as amount,
  pg_temp.h('txx|' || s.slice_no || s.tkey) as u_fx, pg_temp.h('txdec|' || s.slice_no || s.tkey) as u_dec,
  pg_temp.h('txr|' || s.slice_no || s.tkey) as u_reason, pg_temp.h('txcity|' || s.slice_no || s.tkey) as u_city,
  'approved'::text as auth_status, null::text as decline_reason, null::text as plant
from slot s
join sp_card_w w on w.slice_no = s.slice_no and s.u_card >= w.lo and s.u_card < w.hi
join sp_card c on c.id = w.id
join sp_grp gp on s.u_grp >= gp.lo and s.u_grp < gp.hi
join sp_mcc m on m.grp = gp.grp
  and m.i = floor(pg_temp.h('txm|' || s.slice_no || s.tkey) * (select count(*) from sp_mcc m2 where m2.grp = gp.grp))::int;
alter table sp_tx0 add primary key (tkey, slice_no);

-- About 8% of all charges are declined (10% of free spend; subscription bills
-- never are), each for a reason the card's own rules explain.
update sp_tx0 t set auth_status = 'declined',
  decline_reason = case when t.u_reason < 0.45 then 'over_txn_limit' when t.u_reason < 0.75 then 'blocked_mcc' else 'outside_hours' end
where t.u_dec < 0.10;
-- Over the cap: the attempt was 5–60% above the per-transaction limit.
update sp_tx0 t set amount = round(t.per_txn_limit * (1.05 + 0.55 * t.u_fx))
where t.decline_reason = 'over_txn_limit';
-- A blocked MCC from the card's own programme list.
update sp_tx0 t set mcc = b.mcc, grp = b.grp, merchant = b.merchant
from sp_mcc_blk b
where t.decline_reason = 'blocked_mcc'
  and b.mcc = t.blocked_mcc[1 + floor(t.u_fx * array_length(t.blocked_mcc, 1))::int];
-- Retail or entertainment between 23:00 and 07:00, outside the allowed hours.
update sp_tx0 t set grp = m.grp, mcc = m.mcc, merchant = m.merchant, amount = least(t.amount, 5000),
  minutes = case when t.u_fx < 0.2 then 1380 + floor(t.u_fx * 5 * 60)::int else floor(t.u_fx * 420)::int end
from sp_mcc m
where t.decline_reason = 'outside_hours'
  and m.grp = case when t.u_city < 0.6 then 'retail' else 'entertainment' end and m.i = 0;

-- -----------------------------------------------------------------------------
-- A16 plants and decoys on the free spend (contract §6). Each takes distinct
-- approved slots by its own hashed rank, so no slot carries two signals.
-- -----------------------------------------------------------------------------
create temp table sp_a16 on commit drop as
select t.slice_no, t.tkey,
  row_number() over (partition by t.slice_no order by md5('a16|' || t.slice_no || t.tkey)) as rk
from sp_tx0 t where t.auth_status = 'approved' and t.grp not in ('retail', 'entertainment');

-- (a) ranks 1–2: approved on a blocked MCC, in normal hours, at a normal ticket size.
update sp_tx0 t set plant = 'A16a', mcc = b.mcc, grp = b.grp, merchant = b.merchant,
  amount = case when b.mcc = '6011' then greatest(1000, round(least(t.amount, 20000) / 1000) * 1000) else least(t.amount, 6000) end
from sp_a16 a, sp_mcc_blk b
where a.slice_no = t.slice_no and a.tkey = t.tkey and a.rk <= 2
  and b.mcc = t.blocked_mcc[1 + floor(t.u_fx * array_length(t.blocked_mcc, 1))::int];
-- (a) decoy, ranks 3–4: the same kind of attempt, declined — the control working.
update sp_tx0 t set plant = 'A16a-decoy', auth_status = 'declined', decline_reason = 'blocked_mcc',
  mcc = b.mcc, grp = b.grp, merchant = b.merchant
from sp_a16 a, sp_mcc_blk b
where a.slice_no = t.slice_no and a.tkey = t.tkey and a.rk in (3, 4)
  and b.mcc = t.blocked_mcc[1 + floor(t.u_fx * array_length(t.blocked_mcc, 1))::int];
-- (b) ranks 5–6: approved retail or entertainment between 01:00 and 04:00 IST.
update sp_tx0 t set plant = 'A16b', grp = m.grp, mcc = m.mcc, merchant = m.merchant,
  amount = least(t.amount, 6000), minutes = 60 + floor(t.u_fx * 180)::int
from sp_a16 a, sp_mcc m
where a.slice_no = t.slice_no and a.tkey = t.tkey and a.rk in (5, 6)
  and m.grp = case when t.u_city < 0.6 then 'retail' else 'entertainment' end
  and m.i = floor(t.u_reason * 2)::int;

-- Extra rows: (b) decoys, (c) split clusters, lost-card declines.
create temp table sp_tx_extra (
  slice_no int, tkey text, card_id text, employee_id text, d date, minutes int, grp text, mcc text, merchant text,
  city text, amount numeric(14,2), auth_status text, decline_reason text, plant text, grp_key text
) on commit drop;

-- (b) decoy: a 02:00 IST airline charge (seat or baggage) on a day the
-- holder files a travel_air claim, in that claim's city.
insert into sp_tx_extra
select q.slice_no, 'nightair|' || q.ckey, q.card_id, q.employee_id, q.expense_date, 120 + floor(pg_temp.h('na|' || q.ckey) * 60)::int,
  'travel', '4511', (array['SkyWing Airlines', 'IndiGlide Air'])[1 + floor(pg_temp.h('nam|' || q.ckey) * 2)::int], q.city,
  500 + round(pg_temp.h('naa|' || q.ckey) * 2000), 'approved', null, 'A16b-decoy', q.ckey
from (
  select c.ckey, c.slice_no, c.employee_id, c.expense_date, c.city, k.id as card_id,
    row_number() over (partition by c.slice_no order by md5('a16bd|' || c.ckey)) as rk
  from sp_cl1 c join sp_card k on k.employee_id = c.employee_id and c.expense_date between k.use_from and k.use_to
  where c.category = 'travel_air' and c.plant is null
) q where q.rk <= 2;

-- (c) plant: 3 approved charges at one merchant within one day, each 92–99%
-- of the card's per-transaction cap (one purchase split to dodge the cap).
insert into sp_tx_extra
select k.slice_no, 'split|' || k.id || '|' || j, k.id, k.employee_id, k.d,
  k.t0 + case j when 0 then 0 when 1 then 60 + floor(pg_temp.h('sp1|' || k.id) * 120)::int else 300 + floor(pg_temp.h('sp2|' || k.id) * 240)::int end,
  'office', '5045', 'Compu World Systems', k.location,
  floor(k.per_txn_limit * (0.92 + 0.07 * pg_temp.h('spa|' || k.id || j))), 'approved', null, 'A16c', k.id
from (
  select c.*, c.use_from + floor(pg_temp.h('spd|' || c.id) * (c.use_to - c.use_from - 1))::int as d,
    600 + floor(pg_temp.h('spt|' || c.id) * 180)::int as t0,
    row_number() over (partition by c.slice_no order by md5('a16c|' || c.id)) as rk
  from sp_card c where c.use_to - c.use_from >= 10
) k cross join generate_series(0, 2) as j
where k.rk <= 2;

-- A lost card: 2–3 attempts after the block, declined.
insert into sp_tx_extra
select c.slice_no, 'blocked|' || c.id || '|' || j, c.id, c.employee_id,
  c.blocked_from + floor(pg_temp.h('bd|' || c.id || j) * ((select a from sp_asof) - c.blocked_from + 1))::int,
  600 + floor(pg_temp.h('bm|' || c.id || j) * 600)::int, 'retail', '5311', 'CityMart Superstore', c.location,
  800 + round(pg_temp.h('ba|' || c.id || j) * 4000), 'declined', 'card_blocked', null, null
from sp_card c cross join generate_series(0, 2) as j
where c.status = 'blocked' and j < 2 + floor(pg_temp.h('bn|' || c.id) * 2);

-- -----------------------------------------------------------------------------
-- Card transactions, step 2: every row in the stored shape.
-- -----------------------------------------------------------------------------
create temp table sp_tx on commit drop as
select t.slice_no, t.tkey, 'ctx_' || left(md5('nova_card_transactions|' || t.slice_no || '|' || t.tkey), 12) as id,
  t.card_id, t.employee_id, pg_temp.ist(t.d, t.minutes) as txn_at, t.merchant, t.mcc, t.grp, t.city, t.amount,
  t.fx, case when t.fx is not null then round(t.amount / (82.5 + 2 * pg_temp.h('fxr|' || t.tkey)), 2) end as fx_amount,
  t.auth_status, t.decline_reason, t.subscription_id, t.plant, t.grp_key
from (
  -- Free spend: travel and lodging are away from home 60% of the time; half of software is billed in USD.
  select f.slice_no, f.tkey, f.card_id, f.employee_id, f.d, f.minutes, f.merchant, f.mcc, f.grp,
    case when f.grp in ('travel', 'lodging') and f.u_city < 0.6 then
      (select c from unnest(array['Bengaluru', 'Mumbai', 'Chennai', 'Pune', 'New Delhi', 'Kolkata', 'Ahmedabad', 'Kochi']) as c
       where c <> f.location order by md5('txcity|' || f.tkey || c) limit 1) else f.location end as city,
    f.amount, case when f.grp = 'software' and f.u_fx < 0.5 and f.auth_status = 'approved' then 'USD' end as fx,
    f.auth_status, f.decline_reason, null::text as subscription_id, f.plant, null::text as grp_key
  from sp_tx0 f
  union all
  select e.slice_no, e.tkey, e.card_id, e.employee_id, e.d, e.minutes, e.merchant, e.mcc, e.grp, e.city, e.amount, null,
    e.auth_status, e.decline_reason, null, e.plant, e.grp_key
  from sp_tx_extra e
  union all
  -- One approved charge per billing cycle, early morning IST, merchant = the vendor as billed.
  select b.slice_no, 'sub|' || b.skey || '|' || b.d, b.card_id, c.employee_id, b.d,
    360 + floor(pg_temp.h('sbh|' || b.slice_no || b.skey || b.d) * 240)::int, s.vendor_name,
    case s.category when 'saas' then '5734' when 'cloud' then '4816' when 'telecom' then '4814' when 'media' then '5994' else '7699' end,
    case s.category when 'saas' then 'software' when 'cloud' then 'software' when 'telecom' then 'telecom' else 'other' end,
    case when s.usd then 'Singapore' else 'Bengaluru' end, b.amount, case when s.usd then 'USD' end,
    'approved', null, s.id, case when s.role = 'pct95' then 'A16c-decoy' end, s.skey
  from sp_sub_bill b
  join sp_sub_all s on s.slice_no = b.slice_no and s.skey = b.skey
  join sp_card c on c.id = b.card_id
) t;

-- Monthly limit: the programme default, raised where the holder's heaviest
-- month would come within 20% of it, so no approved month ever breaks it.
create temp table sp_card_ml on commit drop as
select c.id,
  greatest(c.base_monthly, coalesce(ceil(max(m.total) * 1.25 / 25000) * 25000, 0)) as monthly_limit
from sp_card c
left join (
  select t.card_id, date_trunc('month', t.txn_at at time zone 'Asia/Kolkata') as m, sum(t.amount) as total
  from sp_tx t where t.auth_status = 'approved' group by 1, 2
) m on m.card_id = c.id
group by c.id, c.base_monthly;

-- Store the cards.
insert into public.nova_corporate_cards (id, slice_no, employee_id, department_id, card_last4, network, issued_on, status,
  closed_on, per_txn_limit, monthly_limit, temp_limit, temp_limit_until, policy_id)
select c.id, c.slice_no, c.employee_id, c.department_id, c.card_last4, c.network, c.issued_on, c.status,
  c.closed_on, c.per_txn_limit, ml.monthly_limit, tl.temp_limit, tl.temp_until, c.policy_id
from sp_card c join sp_card_ml ml on ml.id = c.id left join sp_card_temp tl on tl.id = c.id;

-- Store the subscriptions.
insert into public.nova_subscriptions (id, slice_no, name, vendor_name, vendor_id, category, owner_employee_id, department_id,
  billing_cycle, billing_channel, card_id, seats_purchased, seats_active, unit_price, current_amount, started_on, renewal_date,
  auto_renew, status, cancelled_on, last_used_on, price_history)
select s.id, s.slice_no, s.name, s.vendor_name, s.vendor_id, s.category, s.owner_id, s.owner_dept, s.billing_cycle,
  s.billing_channel, s.card_id, s.seats_purchased, s.seats_active, s.unit_price, s.current_amount, s.started_on, s.renewal_date,
  s.auto_renew, s.status, s.cancelled_on, s.last_used_on, s.price_history
from sp_sub_all s;

-- Store the transactions; the issuer books them 0–3 days later, never after as_of.
insert into public.nova_card_transactions (id, slice_no, card_id, employee_id, txn_at, posted_date, merchant_name, mcc, mcc_group,
  city, amount, original_currency, original_amount, auth_status, decline_reason, subscription_id)
select t.id, t.slice_no, t.card_id, t.employee_id, t.txn_at,
  least((t.txn_at at time zone 'Asia/Kolkata')::date + floor(pg_temp.h('post|' || t.tkey) * 4)::int, (select a from sp_asof)),
  t.merchant, t.mcc, t.grp, t.city, t.amount, t.fx, t.fx_amount, t.auth_status, t.decline_reason, t.subscription_id
from sp_tx t;

-- -----------------------------------------------------------------------------
-- Ground truth (contract §6): every A15/A16/A17 plant and decoy of this file.
-- resource = the registry key of the FIRST id; mixed rows name their second
-- table by the id prefix (lvr_ = leave-records, ecl_ = expense-claims).
-- -----------------------------------------------------------------------------

-- A15(a) duplicate receipts: [original, copy], and the split-bill decoys.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select c.slice_no, 'A15', 'expense-claims', array[o.id, c.id], 'A15-a-' || o.id, 'medium', c.plant = 'A15a-decoy',
  case c.plant
    when 'A15a1' then 'The same receipt (hash, number and amount) was claimed again by the same employee weeks later.'
    when 'A15a2' then 'The same receipt (hash, number and amount) was claimed in full by two colleagues.'
    else 'One bill split between two colleagues on the same trip: the parts add up to the receipt total, so nothing is claimed twice.' end
from sp_cl_id c join sp_cl_id o on o.ckey = c.plant_ref
where c.plant in ('A15a1', 'A15a2', 'A15a-decoy');

-- A15(b) claim on an approved leave day: [claim, leave], and the telecom decoys.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select c.slice_no, 'A15', 'expense-claims', array[c.id, c.plant_ref], 'A15-b-' || c.id, 'hard', c.plant = 'A15b-decoy',
  case when c.plant = 'A15b' then 'A home-city local travel or meals claim dated inside the claimant''s own approved leave.'
    else 'A mobile bill dated inside approved leave: the date is the billing date, not a day of activity.' end
from sp_cl_id c where c.plant in ('A15b', 'A15b-decoy');

-- A15(c) over the policy limit: approved without an exception, and the signed-off decoys.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select c.slice_no, 'A15', 'expense-claims', array[c.id], 'A15-c-' || c.id, 'medium', c.plant = 'A15c-decoy',
  case when c.plant = 'A15c' then 'Hotel claim above the grade''s nightly limit, approved in full with no policy exception.'
    else 'Air fare above the grade''s limit, but recorded as a policy exception approved by the department head.' end
from sp_cl_id c where c.plant in ('A15c', 'A15c-decoy');

-- A16(a) blocked MCC approved, and (b) night retail or entertainment spend, with their decoys.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select t.slice_no, 'A16', 'card-transactions', array[t.id], 'A16-' || case when t.plant like 'A16a%' then 'a-' else 'b-' end || t.id,
  case when t.plant like 'A16a%' then 'easy' else 'medium' end, t.plant like '%decoy',
  case t.plant
    when 'A16a' then 'Approved on a merchant category the card''s programme rule blocks.'
    when 'A16a-decoy' then 'Attempt on a blocked merchant category that the issuer declined: the control worked.'
    else 'Approved retail or entertainment spend between 01:00 and 04:00 IST, outside the allowed hours.' end
from sp_tx t where t.plant in ('A16a', 'A16a-decoy', 'A16b');

-- A16(b) decoy: the 02:00 airline charge, with the air-fare claim that explains it.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select t.slice_no, 'A16', 'card-transactions', array[t.id, c.id], 'A16-b-' || t.id, 'medium', true,
  'Night-time airline charge on a day the holder travelled by air to that city (see the claim): travel, not misuse.'
from sp_tx t join sp_cl_id c on c.ckey = t.grp_key where t.plant = 'A16b-decoy';

-- A16(c) split just under the cap: one row per cluster of three.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select t.slice_no, 'A16', 'card-transactions', array_agg(t.id order by t.txn_at), 'A16-c-' || (array_agg(t.id order by t.txn_at))[1],
  'hard', false, 'Three charges at one merchant within a day, each just under the per-transaction limit: one purchase split to stay under it.'
from sp_tx t where t.plant = 'A16c' group by t.slice_no, t.grp_key;

-- A16(c) decoy: a flat subscription at 95% of the cap, billed once a month.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select t.slice_no, 'A16', 'card-transactions', array_agg(t.id order by t.txn_at), 'A16-c-' || (array_agg(t.id order by t.txn_at))[1],
  'hard', true, 'A monthly subscription charge close to the per-transaction limit: one charge per month, not a split purchase.'
from sp_tx t where t.plant = 'A16c-decoy' group by t.slice_no;

-- A17: the duplicate pair, the zombie, and their decoys.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select s.slice_no, 'A17', 'subscriptions', array_agg(s.id order by s.part <> 'main', s.part <> 'old', s.id),
  'A17-' || case when s.role in ('dup_base', 'migration') then 'a-' else 'b-' end || (array_agg(s.id order by s.part <> 'main', s.part <> 'old', s.id))[1],
  -- (a) and its decoy are medium, (b) and its decoy hard (contract §6).
  case when s.role in ('dup_base', 'migration') then 'medium' else 'hard' end,
  s.role in ('migration', 'onboarding'),
  case s.role
    when 'dup_base' then 'The same service is paid twice by two departments at once; the active seats of both fit in one plan.'
    when 'zombie' then 'Still active and auto-renewing, owned by an employee who left, unused since, and still being charged.'
    when 'migration' then 'The same service twice, one after the other: the old plan was cancelled before the new one started.'
    else 'No active seats yet because the service started within the last month: onboarding, not waste.' end
from sp_sub_all s where s.role in ('dup_base', 'zombie', 'migration', 'onboarding')
group by s.slice_no, s.role;

-- -----------------------------------------------------------------------------
-- Read views: the API reads views only. security_invoker so a view never
-- bypasses RLS for its caller. Dropped and recreated, because a view's
-- column list is frozen at creation.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_spend_policies_v, public.nova_leave_records_v, public.nova_expense_claims_v,
  public.nova_corporate_cards_v, public.nova_card_transactions_v, public.nova_subscriptions_v;
create view public.nova_spend_policies_v with (security_invoker = true) as select * from public.nova_spend_policies;
create view public.nova_leave_records_v with (security_invoker = true) as select * from public.nova_leave_records;
create view public.nova_expense_claims_v with (security_invoker = true) as select * from public.nova_expense_claims;
create view public.nova_corporate_cards_v with (security_invoker = true) as select * from public.nova_corporate_cards;
-- The IST hour, so "spend between 01:00 and 04:00" needs no time-zone maths.
create view public.nova_card_transactions_v with (security_invoker = true) as
select t.*, extract(hour from t.txn_at at time zone 'Asia/Kolkata')::integer as txn_hour_ist
from public.nova_card_transactions t;
-- The yearly cost of a live subscription; a cancelled one costs nothing going forward.
create view public.nova_subscriptions_v with (security_invoker = true) as
select s.*,
  (case when s.status = 'cancelled' then 0
        else s.current_amount * case s.billing_cycle when 'monthly' then 12 when 'quarterly' then 4 else 1 end end)::numeric(14,2) as annualised_cost
from public.nova_subscriptions s;

-- Lockdown, as in 001: RLS on with no policies, anon/authenticated revoked,
-- service_role only. The Supabase defaults grant anon everything on new
-- objects, so the revoke is what actually closes them.
alter table public.nova_spend_policies enable row level security;
alter table public.nova_leave_records enable row level security;
alter table public.nova_expense_claims enable row level security;
alter table public.nova_corporate_cards enable row level security;
alter table public.nova_card_transactions enable row level security;
alter table public.nova_subscriptions enable row level security;
revoke all on public.nova_spend_policies, public.nova_leave_records, public.nova_expense_claims, public.nova_corporate_cards,
  public.nova_card_transactions, public.nova_subscriptions,
  public.nova_spend_policies_v, public.nova_leave_records_v, public.nova_expense_claims_v, public.nova_corporate_cards_v,
  public.nova_card_transactions_v, public.nova_subscriptions_v
  from anon, authenticated;
grant select, insert, update, delete on public.nova_spend_policies, public.nova_leave_records, public.nova_expense_claims,
  public.nova_corporate_cards, public.nova_card_transactions, public.nova_subscriptions to service_role;
grant select on public.nova_spend_policies_v, public.nova_leave_records_v, public.nova_expense_claims_v,
  public.nova_corporate_cards_v, public.nova_card_transactions_v, public.nova_subscriptions_v to service_role;

-- -----------------------------------------------------------------------------
-- Self-check (contract §2.2.2): every soft reference must resolve to a row
-- of the SAME slice. Any miss raises, and the whole file rolls back, so an
-- upstream change fails loudly instead of leaving dangling ids.
-- -----------------------------------------------------------------------------
do $$
declare
  -- child table, child column, parent table
  r record;
  -- Misses for the reference being checked.
  n bigint;
begin
  for r in select * from (values
    ('nova_spend_policies', 'department_id', 'nova_departments'),
    ('nova_leave_records', 'employee_id', 'nova_employees'),
    ('nova_leave_records', 'approved_by', 'nova_employees'),
    ('nova_expense_claims', 'employee_id', 'nova_employees'),
    ('nova_expense_claims', 'department_id', 'nova_departments'),
    ('nova_expense_claims', 'client_id', 'nova_clients'),
    ('nova_expense_claims', 'exception_approved_by', 'nova_employees'),
    ('nova_expense_claims', 'approved_by', 'nova_employees'),
    ('nova_expense_claims', 'payroll_run_id', 'nova_payroll_runs'),
    ('nova_corporate_cards', 'employee_id', 'nova_employees'),
    ('nova_corporate_cards', 'department_id', 'nova_departments'),
    ('nova_card_transactions', 'employee_id', 'nova_employees'),
    ('nova_subscriptions', 'vendor_id', 'nova_vendors'),
    ('nova_subscriptions', 'owner_employee_id', 'nova_employees'),
    ('nova_subscriptions', 'department_id', 'nova_departments')
  ) as t(child, col, parent) loop
    -- A reference is good only if the parent id exists in the child's slice.
    execute format('select count(*) from public.%I c where c.%I is not null and not exists '
      '(select 1 from public.%I p where p.id = c.%I and p.slice_no = c.slice_no)', r.child, r.col, r.parent, r.col) into n;
    -- Name the broken reference so the fix is obvious.
    if n > 0 then
      raise exception '009 self-check: %.% has % reference(s) with no % row in the same slice', r.child, r.col, n, r.parent;
    end if;
  end loop;
end
$$;

-- Temp tables and pg_temp helpers vanish with the transaction and session.
commit;
