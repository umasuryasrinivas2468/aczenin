-- STATUS: VERIFIED 2026-09-29
-- =============================================================================
-- Nova API — Tier 1 org tables, the answer-key table, the frozen as-of date,
-- and the Tier 0 column additions. Contract: docs/nova-tier1-build-contract.md
-- §3 row 1, §4, §5 (Org), §7.
--
-- Run order: 001 → 003 → 004 → 005 (this) → 002 → 006 → 007 → 008.
--
-- What this file does, in order:
--   1. adds as_of_date to nova_dataset_meta and freezes it to today;
--   2. creates business units, departments, employees, bank accounts and the
--      admin-only nova_ground_truth;
--   3. clears ITS OWN org tables (see "rerun" below);
--   4. adds the Tier 0 columns to the nine existing tables (all nullable, so
--      this runs on a database still holding the old 002 data);
--   5. rebuilds the nine read views (a view's column list is frozen when it is
--      created, so new columns are invisible until it is rebuilt) and makes
--      'overdue' compare against as_of_date instead of current_date;
--   6. seeds the org tables, 80 slices, deterministically.
--
-- Why the Tier 0 columns live HERE and not in 002 (the contract puts them in
-- 002): the views must be rebuilt after the columns exist, and view DDL is
-- schema, not seed. Keeping all DDL in 005 leaves 002 a pure data file and
-- means the columns exist before 006–008 reference them.
--
-- Rerun: the org tables are truncated with CASCADE. On the first run nothing
-- references them yet, so old 002 data survives untouched. On a later run the
-- Tier 0 foreign keys added in step 4 exist, so the cascade also empties the
-- tables that point at employees (clients, vendors, invoices, ... and the
-- 006–008 tables). That is intended: regenerated employees invalidate every
-- row that named the old ones. Rerunning 005 therefore means rerunning
-- 002 → 006 → 007 → 008 after it.
-- =============================================================================

-- One transaction: schema, views and seed change together or not at all.
begin;

-- Reruns print dozens of "already exists, skipping" notices that bury real
-- errors in the SQL editor; warnings and errors still show.
set local client_min_messages = warning;

-- -----------------------------------------------------------------------------
-- 1. The frozen clock.
-- -----------------------------------------------------------------------------

-- Nullable so the ALTER succeeds on the existing meta row; set just below.
alter table public.nova_dataset_meta add column if not exists as_of_date date;

-- The whole dataset (this file, 002, 006–008) is dated relative to this one
-- day, and the views derive 'overdue' from it. Freezing it at seed time means
-- the event's answers do not drift while it runs. 005 is the root of the seed
-- chain, so it is the file that sets it; the later seeds only read it.
update public.nova_dataset_meta set as_of_date = current_date where id;

-- -----------------------------------------------------------------------------
-- 2. Org tables.
-- -----------------------------------------------------------------------------

-- Branches and product lines: what a P&L or AR report is cut by.
create table if not exists public.nova_business_units (
  -- Prefixed text id, same convention as 001, so an id reveals its type.
  id text primary key check (id like 'bu\_%'),
  -- Which team's books this row belongs to (004's slicing rule).
  slice_no integer not null check (slice_no >= 0),
  -- Display name, e.g. "Warangal Branch".
  name text not null,
  -- A unit is either a location or a product line; both are real ways firms cut P&L.
  type text not null check (type in ('branch', 'product_line')),
  -- Where the unit sits; drives employee location.
  city text not null,
  -- timestamptz for the same reason as 001: no silent 5h30 shift.
  created_at timestamptz not null default now()
);

-- Cost centres. head_employee_id is added after nova_employees exists, because
-- the two tables reference each other.
create table if not exists public.nova_departments (
  id text primary key check (id like 'dep\_%'),
  slice_no integer not null check (slice_no >= 0),
  name text not null,
  -- The code budgets and payroll are booked against.
  cost_center text not null,
  -- Restrict: a unit with departments must not vanish under them.
  business_unit_id text not null references public.nova_business_units(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Staff. No salary per person (contract §1): cost comes from grade, band and
-- an hourly rate, and payroll is aggregated per department per month in 008.
create table if not exists public.nova_employees (
  id text primary key check (id like 'emp\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- HR code, e.g. EMP-0042; assigned in joining order, as HR systems do.
  code text not null,
  name text not null,
  -- Lowercase so lookups and joins on email are unambiguous; .example domain.
  email text not null check (email = lower(email) and position('@' in email) > 1),
  department_id text not null references public.nova_departments(id) on delete restrict,
  business_unit_id text not null references public.nova_business_units(id) on delete restrict,
  -- Null for the managing director only; self-reference builds the org chart.
  manager_id text references public.nova_employees(id) on delete restrict,
  -- G1 (entry) to G8 (MD): the seniority an approval matrix keys on.
  grade text not null check (grade ~ '^G[1-8]$'),
  role_title text not null,
  location text not null,
  join_date date not null,
  -- Null while employed; never before joining.
  exit_date date,
  employment_type text not null check (employment_type in ('full_time', 'part_time', 'contract')),
  -- Pay band instead of a salary figure: enough for cost analytics, no
  -- per-person pay disclosed.
  pay_band text not null check (pay_band ~ '^B[1-6]$'),
  -- Fully loaded cost per hour, what project costing and payroll roll up from.
  hourly_cost_rate numeric(14,2) not null check (hourly_cost_rate > 0),
  -- 48 is the Indian six-day week; the bound keeps a typo from reading as real.
  work_hours_per_week integer not null check (work_hours_per_week between 1 and 72),
  -- Opaque hash of the salary account. The payables worker matches it against
  -- vendor account fingerprints to plant a vendor-employee shared account (A4).
  bank_fingerprint text not null,
  created_at timestamptz not null default now(),
  -- An exit before joining is always a data error.
  constraint nova_employees_exit_after_join check (exit_date is null or exit_date >= join_date)
);

-- The circular reference, now that both tables exist. Guarded because
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS would skip re-adding the FK anyway,
-- but a plain ADD CONSTRAINT would fail on rerun.
alter table public.nova_departments
  add column if not exists head_employee_id text references public.nova_employees(id) on delete restrict;

-- The company's own bank accounts; 008 writes their statement lines.
create table if not exists public.nova_bank_accounts (
  id text primary key check (id like 'bac\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Bank display name, e.g. "HDFC Bank".
  bank text not null,
  -- 4 letters, a literal 0, 6 alphanumerics: the RBI IFSC shape.
  ifsc text not null check (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  -- Masked like vendor accounts in 001, so integrators build against the safe shape.
  account_last4 text not null check (account_last4 ~ '^[0-9]{4}$'),
  -- What the account is for; treasury questions are per purpose.
  purpose text not null check (purpose in ('collections', 'payroll', 'vendor', 'branch', 'od')),
  business_unit_id text not null references public.nova_business_units(id) on delete restrict,
  -- Signed: an overdraft account opens below zero.
  opening_balance numeric(14,2) not null,
  -- Floor the account must not cross; negative for an OD account (its limit).
  min_balance numeric(14,2) not null,
  -- Per-day outward cap, what a liquidity plan has to respect.
  daily_transfer_limit numeric(14,2) not null check (daily_transfer_limit > 0),
  -- Which bank's statement layout 008 renders narrations in.
  statement_format text not null check (statement_format in ('hdfc', 'icici', 'sbi', 'axis')),
  created_at timestamptz not null default now()
);

-- The answer key for planted anomalies and their decoys (contract §7). Admin
-- only: it gets no read view and no registry entry, so the team API has no
-- path to it.
create table if not exists public.nova_ground_truth (
  -- Identity, not a prefixed text id: rows are only ever read in bulk by judges.
  id bigint generated always as identity primary key,
  slice_no integer not null check (slice_no >= 0),
  -- Coverage plan §4 code, e.g. 'A1'.
  anomaly_code text not null,
  -- The API resource name the records live in, e.g. 'purchase-bills'.
  resource text not null,
  -- Every id involved, so a judge can match a team's answer set exactly.
  record_ids text[] not null,
  -- Ties the rows of one multi-record pattern together.
  group_id text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  -- True for rows that look anomalous but have a legitimate explanation.
  is_decoy boolean not null default false,
  -- Plain-language explanation for judges.
  note text
);

-- -----------------------------------------------------------------------------
-- Indexes: (slice_no, main date desc) serves every API list (slice pin, then
-- newest first); FK columns get their own because Postgres never indexes them.
-- -----------------------------------------------------------------------------
create index if not exists nova_business_units_slice_idx on public.nova_business_units (slice_no, created_at desc);
create index if not exists nova_departments_slice_idx on public.nova_departments (slice_no, created_at desc);
create index if not exists nova_departments_business_unit_id_idx on public.nova_departments (business_unit_id);
create index if not exists nova_departments_head_employee_id_idx on public.nova_departments (head_employee_id);
create index if not exists nova_employees_slice_idx on public.nova_employees (slice_no, join_date desc);
create index if not exists nova_employees_department_id_idx on public.nova_employees (department_id);
create index if not exists nova_employees_business_unit_id_idx on public.nova_employees (business_unit_id);
create index if not exists nova_employees_manager_id_idx on public.nova_employees (manager_id);
create index if not exists nova_bank_accounts_slice_idx on public.nova_bank_accounts (slice_no, created_at desc);
create index if not exists nova_bank_accounts_business_unit_id_idx on public.nova_bank_accounts (business_unit_id);
-- Judges read the key one slice and one code at a time.
create index if not exists nova_ground_truth_slice_code_idx on public.nova_ground_truth (slice_no, anomaly_code);

-- -----------------------------------------------------------------------------
-- 3. Clear this file's own tables. Ground truth is NOT truncated: 002 and
-- 006–008 each delete only their own codes, and 005 plants none.
-- -----------------------------------------------------------------------------
truncate table
  public.nova_bank_accounts,
  public.nova_employees,
  public.nova_departments,
  public.nova_business_units
restart identity cascade;

-- -----------------------------------------------------------------------------
-- 4. Tier 0 columns on the nine existing tables (contract §4). All nullable or
-- defaulted, because old 002 rows must stay valid until 002 reruns; 002 then
-- fills every one. CHECKs still apply (NULL passes a CHECK).
-- -----------------------------------------------------------------------------

-- Clients: who they are commercially and who owns the account.
alter table public.nova_clients
  -- Segment drives credit limits, terms and invoice size.
  add column if not exists segment text check (segment in ('enterprise', 'mid_market', 'smb')),
  add column if not exists industry text,
  -- South / West / North / East, derived from the state.
  add column if not exists region text,
  add column if not exists credit_limit numeric(14,2) check (credit_limit >= 0),
  add column if not exists payment_terms_days integer check (payment_terms_days between 0 and 365),
  -- The sales employee who owns the relationship.
  add column if not exists account_owner_id text references public.nova_employees(id) on delete restrict,
  add column if not exists business_unit_id text references public.nova_business_units(id) on delete restrict,
  -- No format CHECK: A6 plants PANs that disagree with the GSTIN on purpose.
  add column if not exists pan text;

-- Vendors: category, risk and terms, plus the state the bill split needs.
alter table public.nova_vendors
  add column if not exists category text,
  add column if not exists criticality text check (criticality in ('high', 'medium', 'low')),
  add column if not exists payment_terms_days integer check (payment_terms_days between 0 and 365),
  add column if not exists early_pay_discount_pct numeric(5,2) check (early_pay_discount_pct between 0 and 100),
  add column if not exists late_penalty_pct_per_month numeric(5,2) check (late_penalty_pct_per_month between 0 and 100),
  add column if not exists pan text,
  -- 001 left this out, so the CGST/SGST vs IGST split had nowhere to come from.
  add column if not exists state_code text,
  -- Who created the master record: the segregation-of-duties checks key on it.
  add column if not exists created_by text references public.nova_employees(id) on delete restrict,
  add column if not exists status text check (status in ('active', 'blocked', 'pending_verification'));
-- (address already exists on nova_vendors since 001, so it is not re-added.)

-- Invoices: which unit and rep sold it, and any trade discount.
alter table public.nova_invoices
  add column if not exists business_unit_id text references public.nova_business_units(id) on delete restrict,
  add column if not exists sales_rep_id text references public.nova_employees(id) on delete restrict,
  -- Sum of line discounts; amount is the taxable value AFTER discount.
  add column if not exists discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0);

-- Quotations: the rep who raised the quote.
alter table public.nova_quotations
  add column if not exists sales_rep_id text references public.nova_employees(id) on delete restrict;

-- Payments: the bank link (filled by 008), TDS withheld, and allocations.
alter table public.nova_payments
  -- No FK yet: nova_bank_transactions does not exist until 008, which adds it.
  add column if not exists bank_transaction_id text,
  -- TDS the customer withheld; the receipt amount is net of it.
  add column if not exists tds_deducted numeric(14,2) not null default 0 check (tds_deducted >= 0),
  -- [{invoice_id, amount}]: one receipt can settle several invoices.
  add column if not exists allocations jsonb not null default '[]'::jsonb check (jsonb_typeof(allocations) = 'array');

-- Purchase bills: procurement links (filled by 006), approval, receipt date.
alter table public.nova_purchase_bills
  -- No FKs yet: 006 creates purchase orders and goods receipts and adds them.
  add column if not exists po_id text,
  add column if not exists grn_id text,
  add column if not exists submitted_by text references public.nova_employees(id) on delete restrict,
  add column if not exists approval_status text check (approval_status in ('pending', 'approved', 'rejected')),
  -- When the goods or service arrived; the bill usually follows it.
  add column if not exists received_date date;

-- bill_number becomes the VENDOR's invoice number, which is what AP records
-- and what duplicate-bill detection (A1) compares. Two vendors can use the
-- same number, and an exact duplicate bill repeats it, so it cannot be unique.
alter table public.nova_purchase_bills drop constraint if exists nova_purchase_bills_bill_number_key;
-- Non-unique replacement so lookups by vendor + number stay indexed.
create index if not exists nova_purchase_bills_vendor_bill_number_idx on public.nova_purchase_bills (vendor_id, bill_number);

-- Expenses: who spent, for which cost centre, and whether it recurs.
alter table public.nova_expenses
  add column if not exists employee_id text references public.nova_employees(id) on delete restrict,
  add column if not exists department_id text references public.nova_departments(id) on delete restrict,
  add column if not exists business_unit_id text references public.nova_business_units(id) on delete restrict,
  -- Set only for customer-specific cost (client visit, client event).
  add column if not exists client_id text references public.nova_clients(id) on delete restrict,
  add column if not exists recurring boolean not null default false;

-- Inventory: sourcing facts supplier-risk questions need.
alter table public.nova_inventory
  add column if not exists primary_vendor_id text references public.nova_vendors(id) on delete restrict,
  add column if not exists lead_time_days integer check (lead_time_days >= 0),
  add column if not exists single_source boolean not null default false;

-- Stock movements: where, and at what cost.
alter table public.nova_stock_movements
  add column if not exists warehouse text,
  add column if not exists unit_cost numeric(14,2) check (unit_cost >= 0);

-- FK indexes for the new columns the API filters on or joins through.
create index if not exists nova_clients_account_owner_id_idx on public.nova_clients (account_owner_id);
create index if not exists nova_invoices_sales_rep_id_idx on public.nova_invoices (sales_rep_id);
create index if not exists nova_invoices_business_unit_id_idx on public.nova_invoices (business_unit_id);
create index if not exists nova_quotations_sales_rep_id_idx on public.nova_quotations (sales_rep_id);
create index if not exists nova_purchase_bills_submitted_by_idx on public.nova_purchase_bills (submitted_by);
create index if not exists nova_expenses_employee_id_idx on public.nova_expenses (employee_id);
create index if not exists nova_expenses_department_id_idx on public.nova_expenses (department_id);
create index if not exists nova_expenses_client_id_idx on public.nova_expenses (client_id);
create index if not exists nova_inventory_primary_vendor_id_idx on public.nova_inventory (primary_vendor_id);
create index if not exists nova_vendors_created_by_idx on public.nova_vendors (created_by);

-- -----------------------------------------------------------------------------
-- 5. Read views. Dropped and recreated, not replaced: CREATE OR REPLACE cannot
-- insert columns ahead of existing ones, and nova_inventory_v would need that.
-- Views hold no data, so dropping loses nothing.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_invoices_v, public.nova_purchase_bills_v, public.nova_clients_v,
  public.nova_vendors_v, public.nova_quotations_v, public.nova_payments_v, public.nova_expenses_v,
  public.nova_inventory_v, public.nova_stock_movements_v,
  public.nova_business_units_v, public.nova_departments_v, public.nova_employees_v, public.nova_bank_accounts_v;

-- Invoices: overdue now compares due_date with the frozen as-of date, so a
-- team's answer is the same on day 1 and day 3 of the event. coalesce keeps
-- the view working if the meta row were ever missing.
create view public.nova_invoices_v with (security_invoker = true) as
select
  i.id, i.invoice_number, i.client_id, i.client_name, i.client_gst_number, i.items,
  i.amount, i.gst_amount, i.cgst_amount, i.sgst_amount, i.igst_amount, i.intra_state,
  i.total_amount, i.paid_amount,
  case when i.status in ('pending', 'partial')
        and i.due_date < coalesce((select m.as_of_date from public.nova_dataset_meta m where m.id), current_date)
       then 'overdue' else i.status end as status,
  i.total_amount - i.paid_amount as balance_due,
  i.invoice_date, i.due_date, i.currency, i.created_at, i.slice_no,
  -- Tier 0 additions, appended.
  i.business_unit_id, i.sales_rep_id, i.discount_amount
from public.nova_invoices i;

-- Bills: same as-of rule, plus the Tier 0 columns.
create view public.nova_purchase_bills_v with (security_invoker = true) as
select
  b.id, b.bill_number, b.vendor_id, b.vendor_name, b.vendor_gst_number, b.items,
  b.amount, b.gst_amount, b.cgst_amount, b.sgst_amount, b.igst_amount,
  b.total_amount, b.paid_amount,
  case when b.status in ('pending', 'partial')
        and b.due_date < coalesce((select m.as_of_date from public.nova_dataset_meta m where m.id), current_date)
       then 'overdue' else b.status end as status,
  b.total_amount - b.paid_amount as balance_due,
  b.bill_date, b.due_date, b.reverse_charge, b.itc_eligible, b.currency, b.created_at, b.slice_no,
  b.po_id, b.grn_id, b.submitted_by, b.approval_status, b.received_date
from public.nova_purchase_bills b;

-- Thin views: select * now picks up the Tier 0 columns and slice_no.
create view public.nova_clients_v         with (security_invoker = true) as select * from public.nova_clients;
create view public.nova_vendors_v         with (security_invoker = true) as select * from public.nova_vendors;
create view public.nova_quotations_v      with (security_invoker = true) as select * from public.nova_quotations;
create view public.nova_payments_v        with (security_invoker = true) as select * from public.nova_payments;
create view public.nova_expenses_v        with (security_invoker = true) as select * from public.nova_expenses;
-- Low-stock flag kept, after every stored column.
create view public.nova_inventory_v       with (security_invoker = true) as
select v.*, v.quantity_on_hand <= v.reorder_level as below_reorder_level from public.nova_inventory v;
create view public.nova_stock_movements_v with (security_invoker = true) as select * from public.nova_stock_movements;
-- Org views, one per table (contract §2). nova_ground_truth deliberately has none.
create view public.nova_business_units_v  with (security_invoker = true) as select * from public.nova_business_units;
create view public.nova_departments_v     with (security_invoker = true) as select * from public.nova_departments;
create view public.nova_employees_v       with (security_invoker = true) as select * from public.nova_employees;
create view public.nova_bank_accounts_v   with (security_invoker = true) as select * from public.nova_bank_accounts;

-- -----------------------------------------------------------------------------
-- Lockdown, same as 001: every nova_ table and view, RLS on tables with no
-- policies (deny-all for everyone without BYPASSRLS), service_role only. The
-- loop re-covers the recreated views, which start with default grants.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Each nova_ relation in public.
  r record;
begin
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname like 'nova\_%' and c.relkind in ('r', 'v')
  loop
    -- anon ships in browser bundles; authenticated is any signed-up user.
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
    -- The server's only credential.
    execute format('grant select, insert, update, delete on public.%I to service_role', r.relname);
    -- RLS is a table property; views inherit it via security_invoker.
    if r.relkind = 'r' then
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
  end loop;
end;
$$;

-- Identity sequence of nova_ground_truth, for admin inserts via PostgREST.
grant usage on all sequences in schema public to service_role;

-- -----------------------------------------------------------------------------
-- 6. Org seed — 80 slices. Same "draw, then derive" discipline as 002:
-- random() only in statements that scan generate_series with no join, so
-- reruns are identical.
-- -----------------------------------------------------------------------------

-- Pins the random stream for this file.
select setseed(0.505);

-- Parallel workers would consume random() in timing-dependent order.
set local max_parallel_workers_per_gather = 0;

-- One-row handle on the as-of date so every statement uses the same day.
create temp table seed_asof on commit drop as
select as_of_date as d from public.nova_dataset_meta where id;

-- Per-slice money scale, 0.75–1.35. 002 uses the same formula, so a slice's
-- bank balances are sized to its own revenue.
create temp table seed_slice on commit drop as
select s as slice_no, round(0.75 + 0.6 * ((s * 37) % 80) / 79.0, 4) as scale
from generate_series(0, 79) as s;

-- Business units: head office and one branch (both in Telangana, where the
-- company's GSTIN is registered), plus two product-line divisions.
insert into public.nova_business_units (id, slice_no, name, type, city, created_at)
select
  -- Deterministic id per (slice, unit), the contract §2 pattern.
  'bu_' || left(md5('bu' || s.slice_no || '-' || k), 8),
  s.slice_no,
  case k
    when 0 then 'Hyderabad Head Office'
    -- Branch town rotates by slice so teams do not all share one.
    when 1 then (array['Secunderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'])[1 + s.slice_no % 5] || ' Branch'
    -- Two product-line names, rotating in pairs across slices.
    when 2 then (array['Industrial Supplies Division', 'Building Materials Division', 'Engineering Products Division'])[1 + s.slice_no % 3]
    else (array['Office and IT Products Division', 'Consumer Goods Division', 'Healthcare Supplies Division', 'Electricals Division'])[1 + s.slice_no % 4]
  end,
  -- Units 0-1 are locations, 2-3 product lines.
  case when k in (2, 3) then 'product_line' else 'branch' end,
  case when k = 1 then (array['Secunderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'])[1 + s.slice_no % 5] else 'Hyderabad' end,
  -- Units predate everything else in the books.
  ((select d from seed_asof) - 2000 + s.slice_no)::timestamptz
from seed_slice s
cross join generate_series(0, 3) as k
order by s.slice_no, k;

-- Departments: eight per slice. Sales sits in the first product line,
-- customer service in the second, the warehouse at the branch, the rest at
-- head office — so every unit has people and cost.
create temp table seed_dept on commit drop as
select
  s.slice_no, d.k, d.name, d.code, d.first_pos, d.size,
  'dep_' || left(md5('dep' || s.slice_no || '-' || d.k), 8) as id,
  'bu_' || left(md5('bu' || s.slice_no || '-' || d.bu_k), 8) as business_unit_id
from seed_slice s
cross join (values
  -- k, name, cost-centre code, first employee position, headcount, unit ordinal
  (0, 'Sales',                   'SAL', 0,  12, 2),
  (1, 'Finance and Accounts',    'FIN', 12, 6,  0),
  (2, 'Procurement',             'PRC', 18, 5,  0),
  (3, 'Warehouse and Logistics', 'WHL', 23, 12, 1),
  (4, 'Operations',              'OPS', 35, 9,  0),
  (5, 'Human Resources',         'HRM', 44, 4,  0),
  (6, 'Information Technology',  'ITS', 48, 5,  0),
  (7, 'Customer Service',        'CSV', 53, 7,  3)
) as d(k, name, code, first_pos, size, bu_k);

-- Departments first, head filled in once employees exist.
insert into public.nova_departments (id, slice_no, name, cost_center, business_unit_id, created_at)
select
  d.id, d.slice_no, d.name,
  -- e.g. CC-FIN-36: department code plus the company's state code.
  'CC-' || d.code || '-36',
  d.business_unit_id,
  ((select d2.d from seed_asof d2) - 1900)::timestamptz
from seed_dept d
order by d.slice_no, d.k;

-- Employee rolls: 60 per slice, one flat series so the draw order is fixed.
create temp table seed_emp_draw on commit drop as
select
  g,
  -- Rank key that picks which support staff left or joined this year.
  random() as churn_roll,
  -- Spreads joining dates.
  random() as join_roll,
  -- Spreads exit dates.
  random() as exit_roll,
  -- ±10% on the grade's hourly rate, so equal grades do not cost the same.
  random() as rate_roll,
  -- Picks contract / part-time among warehouse and service staff.
  random() as type_roll
from generate_series(0, 4799) as g;

-- 80 first names and 50 surnames. First name index (s*17 + i*7) % 80 is
-- distinct for the 60 positions of a slice (7 is coprime with 80), so no two
-- employees of one company share a full name.
create temp table seed_first_name on commit drop as
select (ord - 1)::int as i, w from unnest(array[
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Bhavana', 'Chaitanya', 'Deepa',
  'Divya', 'Farhan', 'Gayatri', 'Harish', 'Ishita', 'Jaideep', 'Kavya', 'Kiran',
  'Lakshman', 'Madhuri', 'Manoj', 'Meera', 'Naveen', 'Neha', 'Nikhil', 'Pallavi',
  'Pranav', 'Priya', 'Rahul', 'Ramya', 'Ravi', 'Rohit', 'Sahana', 'Sameer',
  'Sandeep', 'Shreya', 'Siddharth', 'Sneha', 'Srikanth', 'Swathi', 'Tanvi', 'Tarun',
  'Uday', 'Vaishnavi', 'Varun', 'Vidya', 'Vikram', 'Yamini', 'Abhishek', 'Anjali',
  'Bharath', 'Charitha', 'Dinesh', 'Esha', 'Gopal', 'Hema', 'Irfan', 'Jyothi',
  'Karthik', 'Lavanya', 'Mahesh', 'Nandini', 'Omkar', 'Pooja', 'Rajesh', 'Revathi',
  'Sai', 'Sowmya', 'Suresh', 'Tejaswini', 'Vamsi', 'Vasudha', 'Venkat', 'Zoya',
  'Ashwin', 'Keerthi', 'Mohan', 'Nisha', 'Prakash', 'Radhika', 'Satish', 'Usha'
]) with ordinality as t(w, ord);

create temp table seed_last_name on commit drop as
select (ord - 1)::int as i, w from unnest(array[
  'Reddy', 'Rao', 'Sharma', 'Naidu', 'Kumar', 'Varma', 'Iyer', 'Nair', 'Menon', 'Patel',
  'Gupta', 'Joshi', 'Kulkarni', 'Deshpande', 'Chowdary', 'Goud', 'Yadav', 'Singh', 'Khan', 'Das',
  'Mishra', 'Pillai', 'Shetty', 'Hegde', 'Bhat', 'Agarwal', 'Mehta', 'Shah', 'Jain', 'Kapoor',
  'Banerjee', 'Mukherjee', 'Ghosh', 'Sinha', 'Pandey', 'Tiwari', 'Srinivasan', 'Krishnan', 'Raju', 'Murthy',
  'Prasad', 'Chandra', 'Kamath', 'Saxena', 'Bose', 'Dutta', 'Rathore', 'Chauhan', 'Thakur', 'Ansari'
]) with ordinality as t(w, ord);

-- Derived employee rows. Positions map onto departments via seed_dept; the
-- first position of each department is its head.
create temp table seed_emp on commit drop as
select
  x.g, x.slice_no, x.i, d.k as dept_k, d.id as department_id, d.business_unit_id,
  'emp_' || left(md5('emp' || x.slice_no || '-' || x.i), 8) as id,
  x.i = d.first_pos as is_head,
  -- Sales, finance and procurement staff all predate the books and stay:
  -- they own clients, raise bills and approve spend, so a departed or
  -- not-yet-hired person must never appear on those documents.
  d.k in (0, 1, 2) as core,
  fn.w || ' ' || ln.w as name,
  lower(fn.w || '.' || ln.w) as local_part,
  x.churn_roll, x.join_roll, x.exit_roll, x.rate_roll, x.type_roll
from (
  select g, g / 60 as slice_no, g % 60 as i, churn_roll, join_roll, exit_roll, rate_roll, type_roll
  from seed_emp_draw
) x
join seed_dept d on d.slice_no = x.slice_no and x.i between d.first_pos and d.first_pos + d.size - 1
join seed_first_name fn on fn.i = (x.slice_no * 17 + x.i * 7) % 80
join seed_last_name ln on ln.i = (x.slice_no * 11 + x.i * 3) % 50;

-- Churn: among non-core, non-head staff, rank by churn_roll within the slice;
-- ranks 1–4 left during the year, ranks 5–8 joined during it. Ranking by a
-- random roll puts the movers at different positions in every slice.
create temp table seed_emp_churn on commit drop as
select id, rank() over (partition by slice_no order by churn_roll, i) as r
from seed_emp
where not core and not is_head;

-- Final employee attributes.
create temp table seed_emp_full on commit drop as
select
  e.*,
  gr.grade,
  -- Band follows grade in pairs at the ends, one-to-one in the middle.
  case gr.grade when 'G1' then 'B1' when 'G2' then 'B1' when 'G3' then 'B2' when 'G4' then 'B3'
                when 'G5' then 'B4' when 'G6' then 'B5' else 'B6' end as pay_band,
  -- Warehouse and service G1s are where contract and part-time staff sit.
  case when e.dept_k in (3, 7) and gr.grade = 'G1' and e.type_roll < 0.35 then 'contract'
       when e.dept_k in (3, 7) and gr.grade = 'G1' and e.type_roll < 0.55 then 'part_time'
       else 'full_time' end as employment_type,
  -- Joining: new joiners within the last 300 days; everyone else 400 days to
  -- ~10 years ago, heads at the long end.
  (select a.d from seed_asof a) - case
    when c.r between 5 and 8 then 20 + floor(e.join_roll * 280)::int
    when e.is_head then 1500 + floor(e.join_roll * 2200)::int
    else 400 + floor(e.join_roll * 3000)::int
  end as join_date,
  -- Leavers exit within the last 300 days (their join is always older).
  case when c.r between 1 and 4 then (select a.d from seed_asof a) - 5 - floor(e.exit_roll * 295)::int end as exit_date,
  -- Loaded ₹/hour by grade, ±10%: G1 ≈ ₹17.5k a month at 48 h/week.
  round((case gr.grade when 'G1' then 90 when 'G2' then 130 when 'G3' then 190 when 'G4' then 280
                       when 'G5' then 400 when 'G6' then 580 when 'G7' then 850 else 1300 end)
        * (0.9 + 0.2 * e.rate_roll)::numeric, 2) as hourly_cost_rate
from seed_emp e
left join seed_emp_churn c on c.id = e.id
-- Grade by position inside the department: head, then one G5, one G4, the
-- rest G1–G3. The MD is the operations head, one grade above other heads.
cross join lateral (select case
  when e.is_head and e.dept_k = 4 then 'G8'
  when e.is_head and e.dept_k in (0, 1, 3) then 'G7'
  when e.is_head then 'G6'
  when e.i - (select d.first_pos from seed_dept d where d.id = e.department_id) = 1 then 'G5'
  when e.i - (select d.first_pos from seed_dept d where d.id = e.department_id) = 2 then 'G4'
  else 'G' || (1 + (e.i % 3))
end as grade) gr;

-- Employees. Codes are assigned in joining order, as an HR system issues them.
insert into public.nova_employees (
  id, slice_no, code, name, email, department_id, business_unit_id, manager_id, grade, role_title,
  location, join_date, exit_date, employment_type, pay_band, hourly_cost_rate, work_hours_per_week,
  bank_fingerprint, created_at
)
select
  e.id, e.slice_no,
  'EMP-' || lpad(row_number() over (partition by e.slice_no order by e.join_date, e.i)::text, 4, '0'),
  e.name,
  -- Company domain per slice: 10 x 8 words give 80 distinct names.
  e.local_part || '@'
    || lower((array['surya', 'vasavi', 'kaveri', 'tulasi', 'indus', 'orion', 'sahyadri', 'nilgiri', 'godavari', 'amrutha'])[1 + e.slice_no % 10]
    || (array['trading', 'supplies', 'distributors', 'enterprises', 'industries', 'commerce', 'mercantile', 'traders'])[1 + e.slice_no / 10])
    || '.example',
  e.department_id, e.business_unit_id,
  -- Org chart: the MD reports to no one, heads report to the MD, staff to
  -- their head.
  case when e.is_head and e.dept_k = 4 then null
       when e.is_head then 'emp_' || left(md5('emp' || e.slice_no || '-35'), 8)
       else (select h.id from seed_emp h where h.department_id = e.department_id and h.is_head) end,
  e.grade,
  -- Title by department and seniority tier.
  (case e.dept_k
    when 0 then array['Head of Sales', 'Senior Sales Manager', 'Key Account Manager', 'Sales Executive']
    when 1 then array['Finance Controller', 'Senior Accountant', 'Accountant', 'Accounts Executive']
    when 2 then array['Procurement Head', 'Purchase Manager', 'Senior Buyer', 'Buyer']
    when 3 then array['Warehouse Manager', 'Logistics Supervisor', 'Inventory Controller', 'Warehouse Associate']
    when 4 then array['Managing Director', 'Operations Manager', 'Operations Executive', 'Operations Associate']
    when 5 then array['HR Manager', 'HR Executive', 'Recruiter', 'HR Associate']
    when 6 then array['IT Manager', 'Systems Administrator', 'Network Engineer', 'IT Support Engineer']
    else        array['Customer Service Manager', 'Service Team Lead', 'Senior Support Executive', 'Support Executive']
  end)[case when e.is_head then 1 when e.grade = 'G5' then 2 when e.grade = 'G4' then 3 else 4 end],
  -- Staff work where their unit is.
  bu.city,
  e.join_date, e.exit_date, e.employment_type, e.pay_band, e.hourly_cost_rate,
  -- Part-timers work half the six-day week.
  case when e.employment_type = 'part_time' then 24 else 48 end,
  -- Opaque 16-hex hash standing in for the salary account.
  left(md5('empacct' || e.id), 16),
  e.join_date::timestamptz
from seed_emp_full e
join public.nova_business_units bu on bu.id = e.business_unit_id
-- Stable physical order; the self-FK needs none, because Postgres checks
-- foreign keys at the end of the statement, not row by row.
order by e.slice_no, e.i;

-- Department heads, now that the employees exist.
update public.nova_departments d
set head_employee_id = e.id
from seed_emp e
where e.department_id = d.id and e.is_head;

-- Company bank accounts: one per purpose. Bank rotates by slice so the four
-- statement formats 008 renders are all in use.
insert into public.nova_bank_accounts (
  id, slice_no, bank, ifsc, account_last4, purpose, business_unit_id, opening_balance, min_balance,
  daily_transfer_limit, statement_format, created_at
)
select
  x.id, s.slice_no,
  (array['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'])[1 + x.b],
  -- IFSC: the bank's real 4-letter code, 0, and a generated 6-digit branch.
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB'])[1 + x.b] || '0' || substr(translate(md5('bacifsc' || x.id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('bacno' || x.id), 'abcdef', '012345'), 1, 4),
  p.purpose,
  -- The branch account belongs to the branch; the rest to head office.
  'bu_' || left(md5('bu' || s.slice_no || '-' || case when p.purpose = 'branch' then 1 else 0 end), 8),
  -- Balances scale with the slice so treasury ratios look alike across teams.
  round(p.opening * s.scale, -3),
  round(p.floor_amt * s.scale, -3),
  round(p.day_limit * s.scale, -3),
  (array['hdfc', 'icici', 'sbi', 'axis'])[1 + x.b],
  ((select a.d from seed_asof a) - 900)::timestamptz
from seed_slice s
cross join (values
  -- purpose, ordinal, opening balance, minimum balance, daily transfer limit (₹, before scale)
  ('collections', 0,  4500000,   500000, 5000000),
  ('payroll',     1,  1200000,   200000, 4000000),
  ('vendor',      2,  3000000,   500000, 6000000),
  ('branch',      3,   600000,   100000, 1000000),
  -- OD: opens drawn, and its floor is the sanctioned limit.
  ('od',          4, -1800000, -5000000, 2500000)
) as p(purpose, k, opening, floor_amt, day_limit)
cross join lateral (select 'bac_' || left(md5('bac' || s.slice_no || '-' || p.k), 8) as id, (p.k + s.slice_no) % 4 as b) x
order by s.slice_no, p.k;

-- Temp tables drop at commit; nothing of the scaffolding outlives the run.
commit;
