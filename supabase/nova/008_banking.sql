-- STATUS: VERIFIED 2026-09-29
-- =============================================================================
-- Nova Tier 1: banking and treasury (docs/nova-tier1-build-contract.md §5, §6).
-- Owner: banking worker. Runs LAST in the chain 001 → 003 → 004 → 005 → 002 →
-- 006 → 007 → 008, because the bank statement is the sum of every cash
-- movement the earlier files create.
--
-- Creates nova_bank_transactions, nova_payroll_runs, nova_statutory_dues and
-- nova_budgets; fills nova_payments.bank_transaction_id and
-- nova_vendor_payments.bank_transaction_id and adds their FKs.
--
-- The statement is built in three passes:
--   1. EVENTS: every movement whose date and amount are already fixed —
--      customer receipts (not cash), vendor payments (success, and reversed
--      with its return credit), payroll, statutory challans, loan EMIs,
--      expenses paid through the bank, and bank charges.
--   2. TREASURY: a day-by-day simulation per slice that tops up the paying
--      accounts from collections (then the OD line) before their scheduled
--      debits land, so no balance ever breaks its minimum by accident. Those
--      top-ups are the internal transfers.
--   3. LINES: events + transfers become statement lines with a running
--      balance, and narrations rendered in each account's own bank format.
--
-- Plants (contract §6, banking row): A13 statement noise, A14 bank side, A18
-- budget overrun, A23 liquidity squeeze, each with decoys, all recorded in
-- nova_ground_truth.
--
-- Deterministic: randomness comes from pg_temp.h(), an md5 of a stable key,
-- so no value depends on join order or plan shape; the treasury pass is one
-- sequential PL/pgSQL loop. setseed() is still pinned for anything that uses
-- random(). Re-runnable: this file truncates only its own four tables and
-- deletes only its own ground-truth rows.
-- =============================================================================

-- One transaction: a failure halfway leaves the previous statement intact.
begin;

-- Pins random() in case any later statement reaches for it.
select setseed(0.808);

-- Parallel workers would make any random() order timing-dependent.
set local max_parallel_workers_per_gather = 0;

-- -----------------------------------------------------------------------------
-- Tables. Money numeric(14,2), status text + CHECK, text ids with a type
-- prefix: the conventions every Nova table follows (contract §2).
-- -----------------------------------------------------------------------------

-- One row per line of a company bank statement.
create table if not exists public.nova_bank_transactions (
  -- 12 hex characters, not 8: ~120k lines would make an 8-character md5
  -- prefix collide about twice (birthday bound).
  id text primary key check (id like 'btx\_%'),
  -- The statement this line belongs to; restrict, because a line without its
  -- account is meaningless.
  account_id text not null references public.nova_bank_accounts(id) on delete restrict,
  -- Position in the account's statement. Several lines share a date, and a
  -- running balance only reads correctly in statement order.
  line_no integer not null check (line_no >= 1),
  -- The date the money counts from (interest and clearing use it).
  value_date date not null,
  -- The date the bank booked the line; statements are ordered by it.
  posted_date date not null,
  -- Exactly one of debit and credit is non-zero (CHECK below).
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  -- Balance after this line, as the bank prints it.
  running_balance numeric(14,2) not null,
  -- The narration exactly as that bank's statement shows it: messy on purpose.
  raw_narration text not null,
  -- The bank's own parse of the other party; often truncated, sometimes null.
  counterparty_text text,
  -- UTR / UPI ref / challan number, whatever the rail gives.
  bank_ref text,
  -- Cheque lines only; six digits, as printed on an Indian cheque leaf.
  cheque_no text check (cheque_no ~ '^[0-9]{6}$'),
  -- The team partition, copied from the account (contract §2).
  slice_no integer not null check (slice_no >= 0),
  -- A statement line moves money one way.
  constraint nova_bank_transactions_one_side check ((debit > 0) <> (credit > 0)),
  -- A value date never runs ahead of posting by more than clearing allows.
  constraint nova_bank_transactions_dates check (value_date <= posted_date + 5),
  -- line_no is a per-account sequence.
  constraint nova_bank_transactions_line_key unique (account_id, line_no)
);

-- Payroll, aggregated per department per month (contract §1: no salaries per person).
create table if not exists public.nova_payroll_runs (
  -- Prefixed deterministic id.
  id text primary key check (id like 'prl\_%'),
  -- Payroll month, always the first of the month.
  month date not null check (extract(day from month) = 1),
  -- Whose staff this run pays.
  department_id text not null references public.nova_departments(id) on delete restrict,
  -- Cost of the month's pay before deductions.
  gross numeric(14,2) not null check (gross >= 0),
  -- What actually leaves the bank.
  net numeric(14,2) not null check (net >= 0),
  -- Employee PF, employee ESI and salary TDS withheld from gross.
  pf numeric(14,2) not null check (pf >= 0),
  esi numeric(14,2) not null check (esi >= 0),
  tds numeric(14,2) not null check (tds >= 0),
  -- The day salaries were credited.
  pay_date date not null,
  -- The account the bulk upload was debited from.
  account_id text not null references public.nova_bank_accounts(id) on delete restrict,
  slice_no integer not null check (slice_no >= 0),
  -- Net pay is gross less every withholding, to the paisa.
  constraint nova_payroll_runs_net check (net = gross - pf - esi - tds),
  -- One run per department per month.
  constraint nova_payroll_runs_key unique (department_id, month)
);

-- Tax and social-security obligations with their due and paid dates.
create table if not exists public.nova_statutory_dues (
  id text primary key check (id like 'sdu\_%'),
  -- The five obligations an Indian SME pays every year.
  due_type text not null check (due_type in ('gstr3b', 'tds', 'pf', 'esi', 'advance_tax')),
  -- 'YYYY-MM' for monthly dues, 'FY2026-27 Q2' for advance tax.
  period text not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  -- Null while unpaid.
  paid_date date,
  -- Interest the challan carried for paying late.
  interest_paid numeric(14,2) not null default 0 check (interest_paid >= 0),
  slice_no integer not null check (slice_no >= 0),
  -- One obligation per type per period per team.
  constraint nova_statutory_dues_key unique (slice_no, due_type, period),
  -- Interest only exists on a paid-late challan.
  constraint nova_statutory_dues_interest check (interest_paid = 0 or paid_date > due_date)
);

-- Monthly budget per department and category.
create table if not exists public.nova_budgets (
  id text primary key check (id like 'bud\_%'),
  department_id text not null references public.nova_departments(id) on delete restrict,
  -- payroll, materials (purchase orders) and the expense categories.
  category text not null check (category in ('payroll', 'materials', 'rent', 'travel', 'software', 'utilities',
    'office_supplies', 'professional_fees', 'marketing', 'meals', 'other')),
  -- Budget month, first of the month.
  month date not null check (extract(day from month) = 1),
  -- The approved budget.
  amount numeric(14,2) not null check (amount >= 0),
  -- Spend committed against it that month: non-cancelled POs raised, expenses
  -- booked, payroll accrued.
  committed numeric(14,2) not null check (committed >= 0),
  slice_no integer not null check (slice_no >= 0),
  -- One line per department, category and month.
  constraint nova_budgets_key unique (department_id, category, month)
);

-- Every API list pins slice_no then sorts by date: one composite index serves both.
create index if not exists nova_bank_transactions_slice_idx on public.nova_bank_transactions (slice_no, value_date desc);
-- The child route /bank-accounts/{id}/bank-transactions; line_no is covered by the unique key.
create index if not exists nova_bank_transactions_account_idx on public.nova_bank_transactions (account_id, value_date desc);
create index if not exists nova_payroll_runs_slice_idx on public.nova_payroll_runs (slice_no, month desc);
-- Postgres never indexes FK columns on its own.
create index if not exists nova_payroll_runs_account_idx on public.nova_payroll_runs (account_id);
create index if not exists nova_statutory_dues_slice_idx on public.nova_statutory_dues (slice_no, due_date desc);
create index if not exists nova_budgets_slice_idx on public.nova_budgets (slice_no, month desc);

-- -----------------------------------------------------------------------------
-- Reset. The two back-links are dropped first: TRUNCATE refuses a table that
-- another table's FK points at (even with zero referencing rows), and CASCADE
-- would wipe nova_payments. They are re-added at the end.
-- -----------------------------------------------------------------------------
alter table public.nova_payments drop constraint if exists nova_payments_bank_transaction_fk;
alter table public.nova_vendor_payments drop constraint if exists nova_vendor_payments_bank_transaction_fk;
-- Clear the old links so they cannot point at ids this run will not recreate.
update public.nova_payments set bank_transaction_id = null where bank_transaction_id is not null;
update public.nova_vendor_payments set bank_transaction_id = null where bank_transaction_id is not null;
-- Only this file's four tables.
truncate table public.nova_bank_transactions, public.nova_payroll_runs, public.nova_statutory_dues, public.nova_budgets;
-- Only this file's anomaly rows. A14 is shared with the org worker, whose rows
-- live on 'payments', so only the bank-side A14 rows are removed here.
delete from public.nova_ground_truth
where anomaly_code in ('A13', 'A18', 'A23') or (anomaly_code = 'A14' and resource = 'bank-transactions');

-- -----------------------------------------------------------------------------
-- Helpers (session-temporary, gone when the connection closes).
-- -----------------------------------------------------------------------------

-- A stable roll in [0, 1) from any key: first 32 bits of its md5. Unlike
-- random(), it gives the same answer whatever order the rows are visited in.
create function pg_temp.h(k text) returns numeric language sql immutable as $$
  -- Hex → 32-bit unsigned integer → fraction of 2^32; numeric so money maths
  -- on it stays exact and round(x, n) applies.
  select ('x' || substr(md5(k), 1, 8))::bit(32)::bigint::numeric / 4294967296
$$;

-- n stable decimal digits from a key, for UTRs, cheque numbers and challans.
create function pg_temp.dg(k text, n integer) returns text language sql immutable as $$
  -- Two md5s give 64 characters; hex letters are mapped onto digits.
  select substr(translate(md5(k) || md5(k || '#'), 'abcdef', '012345'), 1, n)
$$;

-- Last working day of a month (Mon–Fri): when Indian SMEs credit salaries.
create function pg_temp.last_bday(m date) returns date language sql immutable as $$
  -- Step back from the month's last day over Saturday and Sunday.
  select e - case extract(isodow from e)::int when 6 then 1 when 7 then 2 else 0 end
  from (select (m + interval '1 month' - interval '1 day')::date as e) x
$$;

-- The loan EMI date: the 28th, or the Monday after when it falls on a weekend
-- (NACH debits roll forward). It lands in payroll week on purpose (A23).
create function pg_temp.emi_date(m date) returns date language sql immutable as $$
  -- m is the first of the month, so m + 27 is the 28th.
  select d + case extract(isodow from d)::int when 6 then 2 when 7 then 1 else 0 end
  from (select m + 27 as d) x
$$;

-- A counterparty name as a real statement mangles it: case, legal suffix,
-- spacing, an M/S prefix, and truncation to the field width.
create function pg_temp.mess(nm text, k text, width integer) returns text language sql immutable as $$
  -- Truncate last, after every other distortion, like the bank's field does.
  select rtrim(left(
    -- An occasional "M/S " prefix, the old way firms are addressed.
    case when pg_temp.h(k || 'm') < 0.07 then 'M/S ' else '' end ||
    -- Some payers type the name without spaces.
    case when pg_temp.h(k || 'n') < 0.08 then replace(c, ' ', '') else c end,
    -- Width varies per line: 60–100% of the bank's field.
    greatest(8, (width * (0.6 + 0.4 * pg_temp.h(k || 'w')))::int)))
  from (select
    -- Case: mostly upper (bank systems), sometimes as typed, lower or title.
    case when pg_temp.h(k || 'c') < 0.55 then upper(b) when pg_temp.h(k || 'c') < 0.8 then b
         when pg_temp.h(k || 'c') < 0.9 then lower(b) else initcap(b) end as c
    -- Half the time the legal suffix is dropped.
    from (select case when pg_temp.h(k || 's') < 0.5
      then regexp_replace(coalesce(nm, 'UNKNOWN'), '\s+(pvt\.? ?ltd|private limited|ltd|llp|& co)\.?$', '', 'i')
      else coalesce(nm, 'UNKNOWN') end as b) y) z
$$;

-- -----------------------------------------------------------------------------
-- Context: the frozen as-of date (005) is the end of every statement.
-- -----------------------------------------------------------------------------
create temp table bk_ctx on commit drop as
-- Falls back to today only if 005 has somehow not set it.
select coalesce((select m.as_of_date from public.nova_dataset_meta m where m.id), current_date) as as_of;

-- Accounts with a 1-based position inside their slice, for the treasury arrays.
create temp table bk_acct on commit drop as
select a.*, row_number() over (partition by a.slice_no order by a.id)::int as idx
from public.nova_bank_accounts a;

-- Which account plays which role in each slice. 005 creates one account per
-- purpose; the coalesce chain keeps the file working if a purpose is missing.
create temp table bk_role on commit drop as
select
  s.slice_no,
  -- Receives customer money; the treasury's first funding source.
  coalesce(max(a.id) filter (where a.purpose = 'collections'), min(a.id)) as coll,
  -- Pays salaries.
  coalesce(max(a.id) filter (where a.purpose = 'payroll'), max(a.id) filter (where a.purpose = 'vendor'), min(a.id)) as pay,
  -- The operating account: vendors, taxes, EMIs, most expenses.
  coalesce(max(a.id) filter (where a.purpose = 'vendor'), min(a.id)) as ven,
  -- The branch's own account, if there is one.
  max(a.id) filter (where a.purpose = 'branch') as br,
  -- The overdraft line: second funding source, may run negative to its floor.
  max(a.id) filter (where a.purpose = 'od') as od
from (select distinct slice_no from public.nova_bank_accounts) s
join public.nova_bank_accounts a on a.slice_no = s.slice_no
group by s.slice_no;

-- -----------------------------------------------------------------------------
-- Payroll. Worked per employee in a temp table (never stored), then summed per
-- department: the contract forbids individual salaries in any table.
-- -----------------------------------------------------------------------------

-- Months k = 0 (the as-of month, accrued, not yet paid) back to k = 12.
create temp table bk_month on commit drop as
select k, (date_trunc('month', c.as_of) - make_interval(months => k))::date as m
from bk_ctx c cross join generate_series(0, 12) as k;

-- One row per employee per month they were on the rolls.
create temp table bk_emp_month on commit drop as
select
  e.slice_no, e.department_id, m.k, m.m, e.employment_type,
  -- Loaded monthly pay: hourly cost × weekly hours × 52/12, prorated by the
  -- days employed that month, so joiners and leavers pay part-months.
  round(e.hourly_cost_rate * e.work_hours_per_week * 52 / 12 * f.frac, 2) as gross,
  -- The full-month figure decides ESI eligibility and the tax slab.
  e.hourly_cost_rate * e.work_hours_per_week * 52 / 12 as full_month
from public.nova_employees e
cross join bk_month m
-- Days on the rolls in the month ÷ days in the month.
cross join lateral (select
  greatest(0, least((m.m + interval '1 month')::date - 1, coalesce(e.exit_date, '9999-12-31'::date))
    - greatest(m.m, e.join_date) + 1)::numeric / ((m.m + interval '1 month')::date - m.m) as frac) f
where f.frac > 0;

-- Withholdings per employee-month.
create temp table bk_emp_pay on commit drop as
select
  x.*,
  -- PF: 12% of basic (half of gross), on the ₹15,000 statutory wage ceiling;
  -- contract staff are paid gross, outside PF and ESI.
  case when x.employment_type = 'contract' then 0 else round(0.12 * least(0.5 * x.gross, 15000), 0) end as pf,
  -- ESI employee share 0.75%, only for wages up to ₹21,000 a month.
  case when x.employment_type <> 'contract' and x.full_month <= 21000 then ceil(0.0075 * x.gross) else 0 end as esi_emp,
  -- ESI employer share 3.25%, paid with the challan, not withheld.
  case when x.employment_type <> 'contract' and x.full_month <= 21000 then ceil(0.0325 * x.gross) else 0 end as esi_er,
  -- TDS: effective rate by annual pay under the new regime (rebate to ₹12L);
  -- contract staff 10% under 194J.
  round(x.gross * case
    when x.employment_type = 'contract' then 0.10
    when x.full_month * 12 <= 1200000 then 0
    when x.full_month * 12 <= 1600000 then 0.04
    when x.full_month * 12 <= 2000000 then 0.07
    when x.full_month * 12 <= 2400000 then 0.10
    when x.full_month * 12 <= 3000000 then 0.14
    else 0.20 end, 0) as tds
from bk_emp_month x;

-- Payroll runs for the 12 closed months (k = 1..12); the as-of month is not paid yet.
insert into public.nova_payroll_runs (id, month, department_id, gross, net, pf, esi, tds, pay_date, account_id, slice_no)
select
  -- Keyed on department and month: stable across reruns.
  'prl_' || left(md5('prl|' || p.department_id || '|' || p.m), 12),
  p.m, p.department_id, sum(p.gross),
  -- Net is derived from the same sums, so the CHECK holds exactly.
  sum(p.gross) - sum(p.pf) - sum(p.esi_emp) - sum(p.tds),
  sum(p.pf), sum(p.esi_emp), sum(p.tds),
  -- Credited on the month's last working day.
  pg_temp.last_bday(p.m),
  -- Every department is paid from the slice's payroll account.
  r.pay,
  -- Inherited from the department (child slice = parent slice).
  d.slice_no
from bk_emp_pay p
join public.nova_departments d on d.id = p.department_id
join bk_role r on r.slice_no = d.slice_no
where p.k between 1 and 12
group by p.department_id, p.m, r.pay, d.slice_no;

-- -----------------------------------------------------------------------------
-- Statutory dues for the 13 periods k = 0..12. Amounts come from the books, so
-- a team can rebuild every challan from invoices, bills, expenses and payroll.
-- -----------------------------------------------------------------------------

-- GST per slice per month: output tax on sales and on reverse-charge bills,
-- less input credit on eligible bills and expenses, less credit-note reversals.
create temp table bk_gst on commit drop as
select s.slice_no, m.k, m.m,
  coalesce((select sum(i.gst_amount) from public.nova_invoices i
    where i.slice_no = s.slice_no and date_trunc('month', i.invoice_date) = m.m), 0)
  -- RCM: the buyer pays the vendor's GST in cash.
  + coalesce((select sum(b.gst_amount) from public.nova_purchase_bills b
    where b.slice_no = s.slice_no and b.reverse_charge and date_trunc('month', b.bill_date) = m.m), 0)
  - coalesce((select sum(b.gst_amount) from public.nova_purchase_bills b
    where b.slice_no = s.slice_no and b.itc_eligible and not b.reverse_charge and date_trunc('month', b.bill_date) = m.m), 0)
  -- Meals credit is blocked under s.17(5); everything else on expenses claims.
  - coalesce((select sum(e.gst_amount) from public.nova_expenses e
    where e.slice_no = s.slice_no and e.category <> 'meals' and date_trunc('month', e.expense_date) = m.m), 0)
  - coalesce((select sum(n.gst_amount) from public.nova_credit_notes n
    where n.slice_no = s.slice_no and date_trunc('month', n.note_date) = m.m), 0) as net_tax
from (select distinct slice_no from public.nova_bank_accounts) s cross join bk_month m;

-- Every due before payment status: one row per type per period.
create temp table bk_due on commit drop as
-- GSTR-3B, due the 20th. Excess credit carries forward, so the cash paid to
-- date is the running maximum of cumulative net tax (never below zero).
select slice_no, 'gstr3b'::text as due_type, to_char(m, 'YYYY-MM') as period,
  (m + interval '1 month')::date + 19 as due_date,
  greatest(0, max(cum) over w) - coalesce(greatest(0, max(cum) over (w rows between unbounded preceding and 1 preceding)), 0) as amount
from (select g.*, sum(g.net_tax) over (partition by g.slice_no order by g.m) as cum from bk_gst g) x
window w as (partition by slice_no order by m)
union all
-- TDS: salary TDS plus TDS withheld on expenses; due the 7th, March's on 30 April.
select s.slice_no, 'tds', to_char(m.m, 'YYYY-MM'),
  case when extract(month from m.m) = 3 then (m.m + interval '1 month')::date + 29 else (m.m + interval '1 month')::date + 6 end,
  coalesce((select sum(p.tds) from bk_emp_pay p where p.slice_no = s.slice_no and p.k = m.k), 0)
  + coalesce((select sum(e.tds_amount) from public.nova_expenses e where e.slice_no = s.slice_no and date_trunc('month', e.expense_date) = m.m), 0)
from (select distinct slice_no from public.nova_bank_accounts) s cross join bk_month m
union all
-- PF: employee share matched by the employer; due the 15th.
select p.slice_no, 'pf', to_char(p.m, 'YYYY-MM'), (p.m + interval '1 month')::date + 14, 2 * sum(p.pf)
from bk_emp_pay p group by p.slice_no, p.m
union all
-- ESI: both shares on one challan; due the 15th.
select p.slice_no, 'esi', to_char(p.m, 'YYYY-MM'), (p.m + interval '1 month')::date + 14, sum(p.esi_emp + p.esi_er)
from bk_emp_pay p group by p.slice_no, p.m
union all
-- Advance tax: 15/30/30/25% of the year's estimated tax on 15 Jun/Sep/Dec/Mar.
select t.slice_no, 'advance_tax',
  -- Indian financial year runs April to March.
  'FY' || fy || '-' || lpad(((fy + 1) % 100)::text, 2, '0') || ' Q' || q.qn,
  q.d, round(t.tax * q.pct, 0)
from (
  -- Trailing-year profit × 25.17% (s.115BAA with surcharge and cess).
  select s.slice_no, 0.2517 * (
    coalesce((select sum(i.amount) from public.nova_invoices i where i.slice_no = s.slice_no), 0)
    - coalesce((select sum(b.amount) from public.nova_purchase_bills b where b.slice_no = s.slice_no), 0)
    - coalesce((select sum(e.amount) from public.nova_expenses e where e.slice_no = s.slice_no and e.category <> 'salaries'), 0)
    - coalesce((select sum(r.gross) from public.nova_payroll_runs r where r.slice_no = s.slice_no), 0)) as tax
  from (select distinct slice_no from public.nova_bank_accounts) s
) t
cross join bk_ctx c
-- Instalment dates from a year before the window to 100 days past as-of.
cross join lateral (
  select d::date as d,
    case extract(month from d) when 6 then 1 when 9 then 2 when 12 then 3 else 4 end as qn,
    case extract(month from d) when 6 then 0.15 when 9 then 0.30 when 12 then 0.30 else 0.25 end as pct
  from generate_series(date_trunc('month', c.as_of) - interval '13 months', c.as_of + 100, interval '1 month') as gs(mm)
  cross join lateral (select (date_trunc('month', gs.mm) + interval '14 days')::date as d) dd
  where extract(month from gs.mm) in (3, 6, 9, 12) and dd.d between date_trunc('month', c.as_of)::date - 365 and c.as_of + 100
) q
cross join lateral (select case when extract(month from q.d) >= 4 then extract(year from q.d)::int else extract(year from q.d)::int - 1 end as fy) f
-- Loss-makers owe no advance tax.
where t.tax > 0;

-- -----------------------------------------------------------------------------
-- A23 choice, made before the dues are paid because it moves one GST payment.
-- Month M is 2–9 months back (never the window's edges), and among those a
-- month whose GSTR-3B for M−1 is non-zero, so there is a challan to pay late;
-- it is paid on M's EMI date, the same week as payroll.
-- -----------------------------------------------------------------------------
create temp table bk_a23 on commit drop as
select
  r.slice_no, r.ven as victim, r.coll, r.pay, x.m,
  -- The day the squeeze lands.
  pg_temp.emi_date(x.m) as g,
  -- How far below its floor the operating account closes: 20–45% of it.
  round(a.min_balance * (0.20 + 0.25 * pg_temp.h('a23d' || r.slice_no)), -3) as delta
from bk_role r
join public.nova_bank_accounts a on a.id = r.ven
cross join bk_ctx c
-- A stable pick among the eight candidate months, preferring a real GST challan.
cross join lateral (
  select cand.m from (
    select (date_trunc('month', c.as_of) - make_interval(months => n))::date as m, n
    from generate_series(2, 9) as n) cand
  left join bk_due d on d.slice_no = r.slice_no and d.due_type = 'gstr3b'
    and d.period = to_char(cand.m - interval '1 month', 'YYYY-MM')
  order by (coalesce(d.amount, 0) > 0) desc, pg_temp.h('a23m' || r.slice_no || '|' || cand.n)
  limit 1) x;

-- Dues with their payment. Most are paid 0–3 days early; ~6% late (with
-- interest); a late one whose date passes as-of stays unpaid, i.e. overdue.
insert into public.nova_statutory_dues (id, due_type, period, due_date, amount, paid_date, interest_paid, slice_no)
select
  'sdu_' || left(md5('sdu|' || x.slice_no || '|' || x.due_type || '|' || x.period), 12),
  x.due_type, x.period, x.due_date, x.amount, p.paid_date,
  -- Statutory interest per type: GST 18% p.a. (s.50), TDS 1.5% a month or
  -- part (s.201), PF/ESI 12% p.a., advance tax 1% a month (s.234C).
  case when p.paid_date > x.due_date then round(x.amount * case x.due_type
    when 'gstr3b' then 0.18 * (p.paid_date - x.due_date) / 365.0
    when 'tds' then 0.015 * ceil((p.paid_date - x.due_date) / 30.0)
    when 'advance_tax' then 0.01 * ceil((p.paid_date - x.due_date) / 30.0)
    else 0.12 * (p.paid_date - x.due_date) / 365.0 end, 0) else 0 end,
  x.slice_no
from bk_due x
cross join bk_ctx c
left join bk_a23 a on a.slice_no = x.slice_no
-- Two stable rolls per due: late or not, and by how much.
cross join lateral (select pg_temp.h('sdu' || x.slice_no || x.due_type || x.period) as r,
                           pg_temp.h('sdu2' || x.slice_no || x.due_type || x.period) as r2) h
cross join lateral (select case
  -- A23: last month's GSTR-3B slips to M's EMI day, in payroll week.
  when x.due_type = 'gstr3b' and x.period = to_char(a.m - interval '1 month', 'YYYY-MM') then a.g
  -- Not yet due: a quarter are paid a few days early, the rest are open.
  when x.due_date > c.as_of then case when h.r < 0.25 and x.due_date - 3 <= c.as_of
    then least(c.as_of, x.due_date - 1 - floor(h.r2 * 3)::int) end
  -- Late payers, left unpaid if the late date is still in the future.
  when h.r < 0.06 then nullif(least(x.due_date + 1 + floor(h.r2 * 25)::int, c.as_of + 1), c.as_of + 1)
  -- On time: on the due date or up to 3 days before.
  else x.due_date - floor(h.r2 * 4)::int end as paid_date) p
-- A zero amount is a nil return: filed, but no challan and no bank line.
where x.amount > 0;

-- -----------------------------------------------------------------------------
-- Pass 1: EVENTS — every movement whose date and amount are already fixed.
-- -----------------------------------------------------------------------------
create temp table bk_ev (
  slice_no integer not null,
  account_id text not null,
  posted_date date not null,
  value_date date not null,
  -- Order inside the day; transfers use 5–19 so they post before events.
  seq integer not null,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  -- What produced it: payment, vpay, vpay_return, payroll, statutory, emi,
  -- expense, charge, unknown_receipt, refund, misc, chqbook.
  kind text not null,
  -- Unique per line; hashed into the line id and used as the in-day tiebreak.
  src_key text not null unique,
  -- False only for the A23 GST challan, which the treasury did not see coming.
  planned boolean not null default true,
  -- Narration inputs.
  ch text not null, cp_name text, cp_ifsc text, cp_acct4 text, ref text, chq text, memo text,
  -- Back-links filled into nova_payments / nova_vendor_payments at the end.
  payment_id text, vpay_id text
) on commit drop;

-- Customer receipts. Cash never reaches the bank (the brief), so it is skipped.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, credit, kind, src_key, ch, cp_name, cp_ifsc, cp_acct4, ref, chq, memo, payment_id)
select
  p.slice_no,
  -- Branch customers pay into the branch account; everyone else into collections.
  case when ba.id is not null and ba.business_unit_id = i.business_unit_id then ba.id else r.coll end,
  d.posted, d.posted,
  20 + floor(pg_temp.h(p.id || 'q') * 70)::int,
  -- Card receipts settle net of ~1.8% MDR plus 18% GST on it; the rest arrive whole.
  case when p.method = 'card' then p.amount - round(p.amount * 0.018 * 1.18, 2) else p.amount end,
  'payment', 'pay|' || p.id,
  case when p.method = 'card' then 'card_settle' else p.method end,
  p.client_name,
  -- The payer's bank: a stable IFSC per client.
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK', 'PUNB', 'BARB', 'CNRB'])[1 + floor(pg_temp.h(p.client_id || 'b') * 8)::int]
    || '0' || pg_temp.dg(p.client_id || 'ifsc', 6),
  pg_temp.dg(p.client_id || 'acct', 4),
  -- The rail's own reference, as the receipt recorded it.
  coalesce(nullif(p.reference, ''), pg_temp.dg(p.id || 'ref', 12)),
  -- Cheque receipts carry the cheque number printed on the leaf.
  case when p.method = 'cheque' then lpad(right(regexp_replace(coalesce(p.reference, ''), '\D', '', 'g') || pg_temp.dg(p.id, 6), 6), 6, '0') end,
  -- Payers sometimes quote the invoice, sometimes only a word.
  case when pg_temp.h(p.id || 'memo') < 0.45 then i.invoice_number
       else (array['PAYMENT', 'INV PMT', 'BILL PAYMENT', 'ADVANCE', 'PMT AGST INV', ''])[1 + floor(pg_temp.h(p.id || 'mw') * 6)::int] end,
  p.id
from public.nova_payments p
cross join bk_ctx c
join bk_role r on r.slice_no = p.slice_no
left join public.nova_bank_accounts ba on ba.id = r.br
-- Left join: a receipt with no invoice (A14, org side) still reaches the bank.
left join public.nova_invoices i on i.id = p.invoice_id
-- Cheques clear the next working day (sometimes two); card batches settle T+1.
cross join lateral (select least(c.as_of, p.payment_date + case
  when p.method = 'cheque' then 1 + (pg_temp.h(p.id || 'clr') < 0.3)::int
  when p.method = 'card' then 1 else 0 end) as posted) d
where p.method <> 'cash' and p.payment_date <= c.as_of;

-- Vendor payments that actually moved money: success, and reversed (which
-- also gets its return credit below). Failed ones never left the bank.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, cp_name, cp_ifsc, cp_acct4, ref, chq, memo, vpay_id)
select
  v.slice_no, coalesce(v.from_account_id, r.ven), d.posted, d.posted,
  20 + floor(pg_temp.h(v.id || 'q') * 70)::int,
  v.amount, 'vpay', 'vpy|' || v.id, v.channel,
  -- The beneficiary as the bank knows it: the account holder name.
  coalesce(b.holder_name, vn.name), b.ifsc, b.account_last4,
  -- UTR shapes: NEFT/RTGS carry the sending bank code; IMPS/UPI a 12-digit RRN.
  case when v.channel in ('neft', 'rtgs') then left(fa.ifsc, 4) || case when v.channel = 'rtgs' then 'R' else 'N' end
         || to_char(d.posted, 'YYMMDD') || pg_temp.dg(v.id || 'utr', 8)
       when v.channel = 'cheque' then null else pg_temp.dg(v.id || 'rrn', 12) end,
  case when v.channel = 'cheque' then pg_temp.dg(v.id || 'chq', 6) end,
  -- Payers quote the bill number about half the time.
  case when pg_temp.h(v.id || 'memo') < 0.5 then pb.bill_number else (array['VENDOR PMT', 'BILL PMT', 'PAYMENT', ''])[1 + floor(pg_temp.h(v.id || 'mw') * 4)::int] end,
  v.id
from public.nova_vendor_payments v
cross join bk_ctx c
join bk_role r on r.slice_no = v.slice_no
left join public.nova_bank_accounts fa on fa.id = coalesce(v.from_account_id, r.ven)
left join public.nova_vendor_bank_accounts b on b.id = v.beneficiary_account_id
left join public.nova_vendors vn on vn.id = v.vendor_id
-- The first bill paid, for the narration memo.
left join public.nova_purchase_bills pb on pb.id = v.bill_ids ->> 0
-- A cheque is presented and cleared 2–4 days after it is issued.
cross join lateral (select least(c.as_of, (v.initiated_at at time zone 'Asia/Kolkata')::date
  + case when v.channel = 'cheque' then 2 + floor(pg_temp.h(v.id || 'clr') * 3)::int else 0 end) as posted) d
where v.status in ('success', 'reversed') and (v.initiated_at at time zone 'Asia/Kolkata')::date <= c.as_of;

-- A reversed payment comes back 1–3 days later with the beneficiary bank's reason.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, credit, kind, src_key, ch, cp_name, cp_ifsc, cp_acct4, ref, memo)
select e.slice_no, e.account_id, d.posted, d.posted, 20 + floor(pg_temp.h(e.src_key || 'rq') * 70)::int,
  e.debit, 'vpay_return', 'ret|' || e.vpay_id, 'return', e.cp_name, e.cp_ifsc, e.cp_acct4, e.ref,
  (array['ACCOUNT DOES NOT EXIST', 'BENEFICIARY A/C CLOSED', 'INVALID ACCOUNT NO', 'A/C FROZEN'])[1 + floor(pg_temp.h(e.src_key || 'why') * 4)::int]
from bk_ev e
join public.nova_vendor_payments v on v.id = e.vpay_id
cross join bk_ctx c
cross join lateral (select least(c.as_of, e.posted_date + 1 + floor(pg_temp.h(e.src_key || 'rd') * 3)::int) as posted) d
where e.kind = 'vpay' and v.status = 'reversed';

-- Outward RTGS costs ₹25 + GST and IMPS ₹5 + GST, each as its own line;
-- online NEFT and UPI are free for current accounts.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, ref, memo)
select e.slice_no, e.account_id, e.posted_date, e.posted_date, e.seq + 1,
  case e.ch when 'rtgs' then 29.50 else 5.90 end, 'charge', 'txc|' || e.src_key, 'charge_txn', e.ref, upper(e.ch)
from bk_ev e where e.kind = 'vpay' and e.ch in ('rtgs', 'imps');

-- Payroll: one bulk upload per department per month, debited at net.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, cp_name, ref, memo)
select p.slice_no, p.account_id, p.pay_date, p.pay_date, 30 + floor(pg_temp.h(p.id || 'q') * 20)::int,
  p.net, 'payroll', 'prl|' || p.id, 'salary', d.name, pg_temp.dg(p.id || 'blk', 10),
  -- Upload files are named by cost centre and month.
  coalesce(d.cost_center, left(upper(d.name), 6)) || ' ' || upper(to_char(p.month, 'MONYY'))
from public.nova_payroll_runs p
join public.nova_departments d on d.id = p.department_id
where p.net > 0;

-- Statutory challans, paid from the operating account with any interest on
-- the same challan. The A23 GST challan is "unplanned": the treasury's
-- lookahead does not see it, which is how the squeeze happens.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, planned, ch, ref, memo)
select s.slice_no, r.ven, s.paid_date, s.paid_date, 30 + floor(pg_temp.h(s.id || 'q') * 40)::int,
  s.amount + s.interest_paid, 'statutory', 'sdu|' || s.id,
  not (a.m is not null and s.due_type = 'gstr3b' and s.paid_date = a.g),
  s.due_type,
  -- Challan ids: GST CPIN (14), TDS/advance-tax CIN serial, EPFO TRRN (13), ESIC challan (12).
  case s.due_type when 'gstr3b' then to_char(s.due_date, 'YYMM') || '36' || pg_temp.dg(s.id, 8)
                  when 'pf' then pg_temp.dg(s.id, 13) when 'esi' then pg_temp.dg(s.id, 12)
                  else '0510308' || to_char(s.paid_date, 'DDMMYY') || pg_temp.dg(s.id, 5) end,
  s.period
from public.nova_statutory_dues s
join bk_role r on r.slice_no = s.slice_no
left join bk_a23 a on a.slice_no = s.slice_no
where s.paid_date is not null;

-- A term-loan EMI every month on the 28th: payroll week (A23 needs the collision).
-- Sized at 4–8% of the slice's average monthly receipts, in round hundreds.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, cp_name, ref, memo)
select r.slice_no, r.ven, pg_temp.emi_date(m.m), pg_temp.emi_date(m.m), 25, x.emi, 'emi',
  'emi|' || r.slice_no || '|' || m.m, 'emi',
  (array['HDFC BANK LTD', 'BAJAJ FINANCE LTD', 'TATA CAPITAL', 'SIDBI', 'ICICI BANK LTD'])[1 + floor(pg_temp.h('lender' || r.slice_no) * 5)::int],
  'LN' || pg_temp.dg('loan' || r.slice_no, 10),
  -- Instalment n of 60, counted from a loan taken two years before as-of.
  'EMI ' || (13 + 12 - m.k) || '/60'
from bk_role r
cross join bk_month m
cross join bk_ctx c
cross join lateral (select greatest(25000, round(coalesce((select sum(p.amount) from public.nova_payments p where p.slice_no = r.slice_no), 0) / 12
  * (0.04 + 0.04 * pg_temp.h('emi' || r.slice_no))::numeric, -2)) as emi) x
where pg_temp.emi_date(m.m) <= c.as_of and m.k <= 11;

-- Expenses paid through the bank, net of TDS withheld. Salaries are skipped:
-- payroll runs already move that money, and paying it twice would double it.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, cp_name, cp_ifsc, cp_acct4, ref, chq, memo)
select e.slice_no,
  -- Branch spend from the branch account, the rest from operating.
  case when ba.id is not null and ba.business_unit_id = e.business_unit_id then ba.id else r.ven end,
  d.posted, d.posted, 20 + floor(pg_temp.h(e.id || 'q') * 70)::int,
  e.total_amount - e.tds_amount, 'expense', 'exp|' || e.id,
  -- A card spend shows as a POS debit on the linked current account.
  case when e.payment_method = 'card' then 'pos' else e.payment_method end,
  e.vendor_name,
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK', 'YESB'])[1 + floor(pg_temp.h(coalesce(e.vendor_name, e.id) || 'b') * 6)::int]
    || '0' || pg_temp.dg(coalesce(e.vendor_name, e.id) || 'ifsc', 6),
  pg_temp.dg(coalesce(e.vendor_name, e.id) || 'acct', 4),
  case when e.payment_method in ('neft', 'rtgs') then left(fa.ifsc, 4) || 'N' || to_char(d.posted, 'YYMMDD') || pg_temp.dg(e.id || 'utr', 8)
       when e.payment_method = 'cheque' then null else pg_temp.dg(e.id || 'rrn', 12) end,
  case when e.payment_method = 'cheque' then pg_temp.dg(e.id || 'chq', 6) end,
  upper(left(coalesce(e.description, e.category), 18))
from public.nova_expenses e
cross join bk_ctx c
join bk_role r on r.slice_no = e.slice_no
left join public.nova_bank_accounts ba on ba.id = r.br
left join public.nova_bank_accounts fa on fa.id = r.ven
cross join lateral (select least(c.as_of, e.expense_date + case when e.payment_method = 'cheque' then 2 + floor(pg_temp.h(e.id || 'clr') * 3)::int else 0 end) as posted) d
where e.payment_method in ('upi', 'neft', 'rtgs', 'imps', 'cheque', 'card') and e.category <> 'salaries'
  and e.expense_date <= c.as_of and e.total_amount - e.tds_amount > 0;

-- Monthly account-maintenance charge on every account (₹100–250 + 18% GST),
-- and quarterly SMS-alert charges, both on the month's last day.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, memo)
select a.slice_no, a.id, e.d, e.d, 95 + t.n,
  case t.n when 0 then (array[118.00, 177.00, 236.00, 295.00])[1 + floor(pg_temp.h(a.id || 'amc') * 4)::int] else 17.70 end,
  'charge', 'chg|' || a.id || '|' || m.m || '|' || t.n,
  case t.n when 0 then 'charge_maint' else 'charge_sms' end,
  upper(to_char(m.m, 'MONYY'))
from bk_acct a
cross join bk_month m
cross join bk_ctx c
cross join lateral (select ((m.m + interval '1 month')::date - 1) as d) e
-- n = 0 maintenance every month; n = 1 SMS in quarter-end months only.
cross join lateral (select n from generate_series(0, 1) n where n = 0 or extract(month from m.m) in (3, 6, 9, 12)) t
where e.d <= c.as_of and m.k <= 11;

-- A14 (bank side): two credits per slice that no receipt explains. One names
-- a real customer of the slice (money arrived, never booked); the other names
-- a party that is not a customer at all.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, credit, kind, src_key, ch, cp_name, cp_ifsc, cp_acct4, ref, memo)
select r.slice_no, r.coll, d.d, d.d, 20 + floor(pg_temp.h(k.key || 'q') * 70)::int,
  -- Rupee amounts that match no invoice total.
  round((15000 + 235000 * pg_temp.h(k.key || 'amt'))::numeric, 0),
  'unknown_receipt', 'unk|' || k.key, case when k.n = 1 then 'neft' else 'imps' end,
  case when k.n = 1 then (select cl.name from public.nova_clients cl where cl.slice_no = r.slice_no order by md5(cl.id || k.key) limit 1)
       else (array['SRI SAI ENTERPRISES', 'NEW INDIA TRADING CO', 'KRISHNA AGENCIES', 'R K ASSOCIATES', 'VINAYAKA SALES CORPN'])[1 + floor(pg_temp.h(k.key || 'nm') * 5)::int] end,
  'SBIN0' || pg_temp.dg(k.key || 'ifsc', 6), pg_temp.dg(k.key || 'a4', 4),
  case when k.n = 1 then 'SBINN' || to_char(d.d, 'YYMMDD') || pg_temp.dg(k.key || 'utr', 8) else pg_temp.dg(k.key || 'rrn', 12) end,
  (array['PAYMENT', 'ADV', 'TRF', ''])[1 + floor(pg_temp.h(k.key || 'mw') * 4)::int]
from bk_role r
cross join bk_ctx c
cross join lateral (select n, r.slice_no || '|' || n as key from generate_series(1, 2) n) k
-- Anywhere in the last ~11 months.
cross join lateral (select c.as_of - 10 - floor(pg_temp.h(k.key || 'd') * 320)::int as d) d;

-- A14 decoy: an income-tax refund. It too has no invoice, but it is not
-- customer money and needs no follow-up.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, credit, kind, src_key, ch, ref, memo)
select r.slice_no, r.coll, d.d, d.d, 60,
  round((8000 + 90000 * pg_temp.h('rf' || r.slice_no))::numeric, 2), 'refund', 'rfd|' || r.slice_no, 'refund',
  pg_temp.dg('rfd' || r.slice_no, 12), 'AY' || extract(year from d.d)::int || '-' || lpad(((extract(year from d.d)::int + 1) % 100)::text, 2, '0')
from bk_role r cross join bk_ctx c
cross join lateral (select c.as_of - 15 - floor(pg_temp.h('rfd' || r.slice_no) * 300)::int as d) d;

-- A13 "unexplained charges": two debits per slice with a vague narration and
-- an amount no tariff lists.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, ref, memo)
select a.slice_no, a.id, d.d, d.d, 90,
  (array[1475.00, 2360.00, 885.00, 3540.00, 1770.00])[1 + floor(pg_temp.h(k.key || 'amt') * 5)::int],
  'misc', 'msc|' || k.key, 'misc', pg_temp.dg(k.key || 'ref', 9), ''
from bk_role r
cross join bk_ctx c
cross join lateral (select n, r.slice_no || '|' || n as key from generate_series(1, 2) n) k
-- A random account of the slice.
join bk_acct a on a.slice_no = r.slice_no and a.idx = 1 + floor(pg_temp.h(k.key || 'acc') * 5)::int
cross join lateral (select c.as_of - 5 - floor(pg_temp.h(k.key || 'd') * 330)::int as d) d;

-- A13 decoy: two cheque books issued the same day, two identical charges.
-- Looks like a duplicate import, but the refs differ and the balance moves twice.
insert into bk_ev (slice_no, account_id, posted_date, value_date, seq, debit, kind, src_key, ch, ref)
select r.slice_no, r.ven, d.d, d.d, 80 + n, 118.00, 'chqbook', 'cbk|' || r.slice_no || '|' || n, 'charge_chq',
  pg_temp.dg('cbk' || r.slice_no || n, 7)
from bk_role r cross join bk_ctx c cross join generate_series(1, 2) n
cross join lateral (select c.as_of - 20 - floor(pg_temp.h('cbk' || r.slice_no) * 300)::int as d) d;

-- -----------------------------------------------------------------------------
-- Pass 2: TREASURY. The statement starts on the earliest event (or a year
-- before as-of) and each account's opening_balance is its balance that morning.
-- -----------------------------------------------------------------------------
create temp table bk_span on commit drop as
select least((select min(posted_date) from bk_ev), c.as_of - 364) as start_date,
       c.as_of - least((select min(posted_date) from bk_ev), c.as_of - 364) + 1 as n_days
from bk_ctx c;

-- The loop reads one slice's events at a time.
create index on bk_ev (slice_no);

-- Movements the treasury decides: transfers between own accounts, OD
-- interest, and working-capital loan drawdowns when every source is short.
create temp table bk_tr (
  slice_no integer not null,
  posted_date date not null,
  -- In-day order: interest 5, drawdowns and transfers after it, all before events (20+).
  seq integer not null,
  -- Null on the side that is outside the company (interest to the bank, loan from it).
  from_id text, to_id text,
  amount numeric(14,2) not null check (amount > 0),
  kind text not null check (kind in ('transfer', 'od_interest', 'disbursal', 'a23')),
  -- Per-slice counter: with slice_no, a stable key for the line ids.
  k integer not null
) on commit drop;

-- One sequential pass per slice, day by day. Rules, in order, each morning:
--   * 1st of the month: OD interest (10.5% p.a.) on last month's drawn balance.
--   * A23 day: set the operating account's close to min - delta (see bk_a23).
--   * Each paying account whose balance, less the next 5 days' scheduled
--     debits, is under min + cushion is topped up to cover 10 days, in round
--     Rs 50,000, from collections (within its daily transfer limit), else from
--     the OD line, drawing a loan into OD if even that is short.
--   * Collections and OD are kept above their own floors the same way.
--   * Mondays: surplus in collections repays the OD back toward its opening.
-- Transfers post before the day's events and cover every scheduled debit, so
-- no account dips below its minimum unless A23 makes it.
do $$
declare
  -- The statement window, shared by every slice.
  v_start date := (select start_date from bk_span);
  v_n integer := (select n_days from bk_span);
  -- The slice being simulated, with its roles and A23 parameters.
  s record;
  -- Per-account state, indexed by bk_acct.idx.
  ids text[]; mins numeric[]; tgts numeric[]; lims numeric[]; opens numeric[]; bal numeric[];
  -- Per-account-day arrays, flattened: account a, day d at (a-1)*n + d + 1.
  net numeric[]; outp numeric[];
  -- Prefix sums of planned debits, so any window's sum is two lookups.
  cum numeric[];
  -- Account count and role positions (null when a role is absent).
  na integer; rc integer; rp integer; rv integer; rb integer; ro integer; dsts integer[];
  -- Loop counters, the per-slice key counter and the in-day sequence.
  d integer; j integer; a integer; kk integer; seqn integer; src integer; dst integer;
  -- Working amounts for one decision.
  day date; amt numeric; av numeric; x numeric; rest numeric; lim_left numeric; so numeric; so2 numeric;
  -- OD interest accrual, loan drawdowns and the A23 squeeze parameters.
  neg_acc numeric; intr numeric; disb numeric; g_idx integer; delta numeric; tgt_o numeric;
begin
  -- Slices are independent books, simulated one after another.
  for s in select r.*, q.g, q.delta from bk_role r left join bk_a23 q on q.slice_no = r.slice_no order by r.slice_no loop
    -- Account constants for this slice.
    select array_agg(id order by idx), array_agg(min_balance order by idx), array_agg(daily_transfer_limit order by idx),
           array_agg(opening_balance order by idx)
      into ids, mins, lims, opens from bk_acct where slice_no = s.slice_no;
    -- How many accounts this slice has (005 makes five).
    na := array_length(ids, 1);
    -- Every account starts the window at its opening balance.
    bal := opens;
    -- Cushion above the floor: 20% of it, at least Rs 25,000.
    tgts := mins;
    for a in 1..na loop tgts[a] := mins[a] + greatest(25000, 0.2 * abs(mins[a])); end loop;
    -- Roles as array positions.
    rc := array_position(ids, s.coll); rp := array_position(ids, s.pay); rv := array_position(ids, s.ven);
    rb := array_position(ids, s.br); ro := array_position(ids, s.od);
    -- The accounts that get topped up: payroll, operating, branch, once each.
    dsts := array[]::integer[];
    foreach j in array array[rp, rv, rb] loop
      if j is not null and j <> rc and j is distinct from ro and not j = any(dsts) then dsts := dsts || j; end if;
    end loop;
    -- Dense day arrays for every account of the slice.
    select array_agg(coalesce(e.net, 0) order by a2.idx, gd.d), array_agg(coalesce(e.outp, 0) order by a2.idx, gd.d)
      into net, outp
      from bk_acct a2 cross join generate_series(0, v_n - 1) gd(d)
      left join (select account_id, posted_date - v_start as d, sum(credit - debit) as net,
                        coalesce(sum(debit) filter (where planned), 0) as outp
                 from bk_ev where slice_no = s.slice_no group by 1, 2) e on e.account_id = a2.id and e.d = gd.d
      where a2.slice_no = s.slice_no;
    -- Prefix sums: cum[a, d] = planned debits of days 0..d-1.
    cum := array_fill(0::numeric, array[na * (v_n + 1)]);
    for a in 1..na loop for d in 0..v_n - 1 loop
      cum[(a - 1) * (v_n + 1) + d + 2] := cum[(a - 1) * (v_n + 1) + d + 1] + outp[(a - 1) * v_n + d + 1];
    end loop; end loop;
    -- The squeeze day as a day index; accruals start at zero.
    g_idx := s.g - v_start; delta := coalesce(s.delta, 0); neg_acc := 0; kk := 0;

    for d in 0..v_n - 1 loop
      -- Today, and the first in-day slot.
      day := v_start + d; seqn := 5;
      -- OD interest for the month just closed.
      if ro is not null and extract(day from day) = 1 and neg_acc > 0 then
        intr := round(neg_acc * 0.105 / 365, 2);
        if intr >= 1 then bal[ro] := bal[ro] - intr; kk := kk + 1;
          insert into bk_tr values (s.slice_no, day, seqn, ids[ro], null, intr, 'od_interest', kk); end if;
        neg_acc := 0;
      end if;
      -- Collections' daily transfer limit resets every morning.
      lim_left := lims[rc];
      -- A23: the operating account closes the day at min - delta.
      if d = g_idx and rv is not null and rv <> rc then
        x := (mins[rv] - delta) - (bal[rv] + net[(rv - 1) * v_n + d + 1]);
        -- Short of that level: a partial top-up. Above it: treasury pulls cash
        -- out to fund payroll, which is what leaves operating short.
        if x >= 1000 then src := rc; dst := rv; x := floor(x / 1000) * 1000;
        else src := rv; dst := coalesce(nullif(rp, rv), rc); x := ceil(-x / 1000) * 1000; end if;
        -- Only operating is meant to dip on A23 day: with the real upstream books a
        -- partial top-up from collections pushed collections itself under its floor
        -- in 21 slices (unlabelled below-min lines). So fund it the way a normal
        -- top-up is funded, and only when collections is the chosen source.
        if src = rc and x > 0 then
          -- What collections can spare after its next 3 days of planned debits.
          av := bal[rc] - (cum[(rc - 1) * (v_n + 1) + least(d + 3, v_n) + 1] - cum[(rc - 1) * (v_n + 1) + d + 1]) - tgts[rc];
          -- Not enough: switch to the OD line (never operating itself), or stay on collections when there is no OD.
          if av < x then src := coalesce(nullif(ro, rv), rc);
            -- The same spare-cash view, now for the switched source.
            av := bal[src] - (cum[(src - 1) * (v_n + 1) + least(d + 3, v_n) + 1] - cum[(src - 1) * (v_n + 1) + d + 1]) - tgts[src];
            -- Still short: draw a loan into the source first, in round Rs 1 lakh, as the top-up rule does.
            if av < x then disb := ceil((x - av) / 100000) * 100000; seqn := seqn + 1; kk := kk + 1; bal[src] := bal[src] + disb;
              -- Recorded as an ordinary loan disbursal line, before the A23 transfer it funds.
              insert into bk_tr values (s.slice_no, day, seqn, null, ids[src], disb, 'disbursal', kk); end if;
          end if;
        end if;
        if x > 0 then seqn := seqn + 1; kk := kk + 1; bal[src] := bal[src] - x; bal[dst] := bal[dst] + x;
          insert into bk_tr values (s.slice_no, day, seqn, ids[src], ids[dst], x, 'a23', kk); end if;
      end if;
      -- Top-ups.
      foreach j in array dsts loop
        amt := 0;
        if j = rv and d between g_idx and g_idx + 2 then
          -- Squeeze days: no top-up on day 0; after that only enough to hold min - delta/2.
          if d > g_idx then
            tgt_o := mins[rv] - delta / 2; so := outp[(j - 1) * v_n + d + 1];
            if bal[j] - so < tgt_o then amt := ceil((tgt_o + so - bal[j]) / 1000) * 1000; end if;
          end if;
        else
          -- Normal days: trigger on the 5-day view, fund the 10-day view.
          so := cum[(j - 1) * (v_n + 1) + least(d + 5, v_n) + 1] - cum[(j - 1) * (v_n + 1) + d + 1];
          if bal[j] - so < tgts[j] then
            so2 := cum[(j - 1) * (v_n + 1) + least(d + 10, v_n) + 1] - cum[(j - 1) * (v_n + 1) + d + 1];
            amt := ceil((tgts[j] + so2 - bal[j]) / 50000) * 50000;
          end if;
        end if;
        continue when amt <= 0;
        -- From collections first, within what it can spare today.
        av := bal[rc] - (cum[(rc - 1) * (v_n + 1) + least(d + 3, v_n) + 1] - cum[(rc - 1) * (v_n + 1) + d + 1]) - tgts[rc];
        x := greatest(0, least(amt, floor(av / 1000) * 1000, lim_left));
        if x > 0 then seqn := seqn + 1; kk := kk + 1; bal[rc] := bal[rc] - x; bal[j] := bal[j] + x; lim_left := lim_left - x;
          insert into bk_tr values (s.slice_no, day, seqn, ids[rc], ids[j], x, 'transfer', kk); end if;
        rest := amt - x;
        continue when rest <= 0;
        -- The rest from the OD line (or collections if there is none), drawing a loan if needed.
        src := coalesce(ro, rc);
        av := bal[src] - (cum[(src - 1) * (v_n + 1) + least(d + 3, v_n) + 1] - cum[(src - 1) * (v_n + 1) + d + 1]) - tgts[src];
        if av < rest then disb := ceil((rest - av) / 100000) * 100000; seqn := seqn + 1; kk := kk + 1; bal[src] := bal[src] + disb;
          insert into bk_tr values (s.slice_no, day, seqn, null, ids[src], disb, 'disbursal', kk); end if;
        seqn := seqn + 1; kk := kk + 1; bal[src] := bal[src] - rest; bal[j] := bal[j] + rest;
        insert into bk_tr values (s.slice_no, day, seqn, ids[src], ids[j], rest, 'transfer', kk);
      end loop;
      -- Collections' own floor.
      so := cum[(rc - 1) * (v_n + 1) + least(d + 5, v_n) + 1] - cum[(rc - 1) * (v_n + 1) + d + 1];
      if bal[rc] - so < tgts[rc] then
        amt := ceil((tgts[rc] + so - bal[rc]) / 100000) * 100000; src := coalesce(ro, rc);
        if src <> rc then
          av := bal[src] - (cum[(src - 1) * (v_n + 1) + least(d + 3, v_n) + 1] - cum[(src - 1) * (v_n + 1) + d + 1]) - tgts[src];
          if av < amt then disb := ceil((amt - av) / 100000) * 100000; seqn := seqn + 1; kk := kk + 1; bal[src] := bal[src] + disb;
            insert into bk_tr values (s.slice_no, day, seqn, null, ids[src], disb, 'disbursal', kk); end if;
          seqn := seqn + 1; kk := kk + 1; bal[src] := bal[src] - amt; bal[rc] := bal[rc] + amt;
          insert into bk_tr values (s.slice_no, day, seqn, ids[src], ids[rc], amt, 'transfer', kk);
        else
          seqn := seqn + 1; kk := kk + 1; bal[rc] := bal[rc] + amt;
          insert into bk_tr values (s.slice_no, day, seqn, null, ids[rc], amt, 'disbursal', kk);
        end if;
      end if;
      -- The OD line's own floor (its sanctioned limit).
      if ro is not null then
        so := cum[(ro - 1) * (v_n + 1) + least(d + 5, v_n) + 1] - cum[(ro - 1) * (v_n + 1) + d + 1];
        if bal[ro] - so < tgts[ro] then disb := ceil((tgts[ro] + so - bal[ro]) / 100000) * 100000;
          seqn := seqn + 1; kk := kk + 1; bal[ro] := bal[ro] + disb;
          insert into bk_tr values (s.slice_no, day, seqn, null, ids[ro], disb, 'disbursal', kk); end if;
      end if;
      -- Mondays: spare collections cash repays the OD toward its opening level.
      if ro is not null and extract(isodow from day) = 1 and bal[ro] < opens[ro] then
        av := bal[rc] - (cum[(rc - 1) * (v_n + 1) + least(d + 10, v_n) + 1] - cum[(rc - 1) * (v_n + 1) + d + 1]) - 2 * tgts[rc];
        x := least(floor(av / 100000) * 100000, ceil((opens[ro] - bal[ro]) / 100000) * 100000, lim_left);
        if x > 0 then seqn := seqn + 1; kk := kk + 1; bal[rc] := bal[rc] - x; bal[ro] := bal[ro] + x;
          insert into bk_tr values (s.slice_no, day, seqn, ids[rc], ids[ro], x, 'transfer', kk); end if;
      end if;
      -- The day's scheduled events land.
      for a in 1..na loop bal[a] := bal[a] + net[(a - 1) * v_n + d + 1]; end loop;
      -- Drawn OD balance accrues interest daily.
      if ro is not null then neg_acc := neg_acc + greatest(0, -bal[ro]); end if;
    end loop;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Pass 3: LINES. First the narration renderer: one template per bank format
-- and rail, as each bank's statement prints it.
-- -----------------------------------------------------------------------------

-- Bank display name from the IFSC's 4-letter code.
create function pg_temp.bankname(ifsc text) returns text language sql immutable as $$
  -- Unknown codes fall back to the code itself, as some statements print.
  select coalesce((array['HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK', 'KOTAK MAHINDRA BANK',
    'PUNJAB NATIONAL BANK', 'BANK OF BARODA', 'CANARA BANK', 'YES BANK'])[array_position(
    array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK', 'PUNB', 'BARB', 'CNRB', 'YESB'], left(coalesce(ifsc, ''), 4))], left(coalesce(ifsc, 'BANK'), 4))
$$;

-- One narration. fmt = statement_format, dir = 'CR'/'DR', ch = rail or line
-- type, nm = the (already mangled) counterparty, k = the line's stable key.
create function pg_temp.narr(fmt text, dir text, ch text, nm text, ifsc text, a4 text, ref text, chq text, memo text, k text)
returns text language sql immutable as $$
  select case fmt
  -- HDFC: dash-separated fields, "NEFT CR-<IFSC>-<NAME>-<MEMO>-<UTR>".
  when 'hdfc' then case ch
    when 'neft' then 'NEFT ' || dir || '-' || coalesce(ifsc, '') || '-' || coalesce(nm, 'A/C XXXXXXX' || a4) || '-' || case when dir = 'DR' then 'NETBANK, MUM-' else '' end || coalesce(nullif(memo, ''), 'PAYMENT') || '-' || coalesce(ref, '')
    when 'rtgs' then 'RTGS ' || dir || '-' || coalesce(ifsc, '') || '-' || coalesce(nm, 'A/C XXXXXXX' || a4) || '-' || coalesce(ref, '')
    when 'imps' then 'IMPS-' || coalesce(ref, '') || '-' || coalesce(nm, '') || '-' || left(coalesce(ifsc, ''), 4) || '-XXXXXXXX' || coalesce(a4, '') || '-' || coalesce(memo, '')
    when 'upi' then 'UPI-' || coalesce(nm, '') || '-' || lower(regexp_replace(left(coalesce(nm, 'pay'), 10), '[^A-Za-z0-9]', '', 'g')) || (array['@okhdfcbank', '@okicici', '@oksbi', '@ybl', '@paytm'])[1 + floor(pg_temp.h(k || 'vpa') * 5)::int] || '-' || coalesce(ifsc, '') || '-' || coalesce(ref, '') || '-' || coalesce(nullif(memo, ''), 'UPI')
    when 'cheque' then case when dir = 'CR' then 'CHQ DEP - MICR CLG - ' || coalesce(chq, '') || ' - ' || coalesce(nm, '') else 'CHQ PAID-MICR CTS-' || coalesce(chq, '') || '-' || coalesce(nm, '') end
    when 'card_settle' then 'MERCHANT SETTL-' || coalesce(ref, '') || '-CARD BATCH'
    when 'pos' then 'POS 416021XXXXXX' || pg_temp.dg(k || 'card', 4) || ' ' || coalesce(nm, '')
    when 'return' then 'NEFT RETURN-' || coalesce(ref, '') || '-' || coalesce(nm, '') || '-' || coalesce(memo, '')
    when 'own_trf' then 'FT - ' || dir || ' - ' || '5020000' || pg_temp.dg(k || 'own', 3) || coalesce(a4, '') || ' - OWN A/C TRF'
    when 'salary' then 'SALARY UPLOAD-' || coalesce(memo, '') || '-' || coalesce(ref, '')
    when 'gstr3b' then 'GST PMT-CPIN ' || coalesce(ref, '') || '-' || coalesce(memo, '')
    when 'tds' then 'TAX PAYMENT-ITNS281-' || coalesce(ref, '')
    when 'advance_tax' then 'TAX PAYMENT-ITNS280-' || coalesce(ref, '')
    when 'pf' then 'EPFO-ECR-TRRN ' || coalesce(ref, '')
    when 'esi' then 'ESIC CHALLAN-' || coalesce(ref, '')
    when 'emi' then 'LOAN EMI-' || coalesce(ref, '') || '-' || coalesce(nm, '') || '-' || coalesce(memo, '')
    when 'od_int' then 'INT.COLL:' || coalesce(memo, '')
    when 'disb' then 'WCDL DISB-' || coalesce(ref, '')
    when 'refund' then 'CMP TAX REFUND-' || coalesce(ref, '') || '-' || coalesce(memo, '')
    when 'charge_maint' then 'CHRG: ACCOUNT MAINTENANCE ' || coalesce(memo, '')
    when 'charge_sms' then 'SMS CHRG FOR:' || coalesce(memo, '')
    when 'charge_txn' then 'CHRG: ' || coalesce(memo, '') || ' OUTWARD-' || coalesce(ref, '')
    when 'charge_chq' then 'CHQ BOOK ISSUE CHGS-' || coalesce(ref, '')
    else 'MISC DR - ADJ ' || coalesce(ref, '') end
  -- ICICI: slash-separated, "BY TRANSFER/NEFT/<UTR>/<NAME>" for credits.
  when 'icici' then case ch
    when 'neft' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRANSFER/NEFT/' || coalesce(ref, '') || '/' || coalesce(nm, 'A/C ' || a4)
    when 'rtgs' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRANSFER/RTGS/' || coalesce(ref, '') || '/' || coalesce(nm, 'A/C ' || a4)
    when 'imps' then 'MMT/IMPS/' || coalesce(ref, '') || '/' || coalesce(nullif(memo, ''), 'IMPS') || '/' || coalesce(nm, '') || '/' || pg_temp.bankname(ifsc)
    when 'upi' then 'UPI/' || coalesce(ref, '') || '/' || coalesce(nullif(memo, ''), 'PAYMENT') || '/' || lower(regexp_replace(left(coalesce(nm, 'pay'), 10), '[^A-Za-z0-9]', '', 'g')) || '@ybl/' || pg_temp.bankname(ifsc)
    when 'cheque' then 'CLG/' || coalesce(nm, '') || '/' || coalesce(chq, '')
    when 'card_settle' then 'BY TRANSFER/MSF SETTLEMENT/' || coalesce(ref, '')
    when 'pos' then 'POS/' || coalesce(nm, '') || '/HYDERABAD'
    when 'return' then 'BY TRANSFER/NEFT RTN/' || coalesce(ref, '') || '/' || coalesce(memo, '')
    when 'own_trf' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRF/OWN A/C/XX' || coalesce(a4, '')
    when 'salary' then 'BIL/BPAY/' || coalesce(ref, '') || '/SALARY ' || coalesce(memo, '')
    when 'gstr3b' then 'BIL/ONL/' || coalesce(ref, '') || '/GST CPIN/' || coalesce(memo, '')
    when 'tds' then 'BIL/ONL/' || coalesce(ref, '') || '/INCOME TAX 281'
    when 'advance_tax' then 'BIL/ONL/' || coalesce(ref, '') || '/INCOME TAX 280'
    when 'pf' then 'BIL/ONL/' || coalesce(ref, '') || '/EPFO'
    when 'esi' then 'BIL/ONL/' || coalesce(ref, '') || '/ESIC'
    when 'emi' then 'ACH/' || coalesce(nm, '') || '/' || coalesce(ref, '')
    when 'od_int' then 'OD INT/' || coalesce(memo, '')
    when 'disb' then 'BY LOAN DISB/' || coalesce(ref, '')
    when 'refund' then 'BY TRANSFER/CPC ITD REFUND/' || coalesce(ref, '')
    when 'charge_maint' then 'CHGS/AMC/' || coalesce(memo, '')
    when 'charge_sms' then 'SMS CHGS/' || coalesce(memo, '')
    when 'charge_txn' then 'CHGS/' || coalesce(memo, '') || '/' || coalesce(ref, '')
    when 'charge_chq' then 'CHQ BK CHGS/' || coalesce(ref, '')
    else 'DR ADJ/' || coalesce(ref, '') end
  -- SBI: "BY/TO TRANSFER-<RAIL>*...--" with the trailing double dash.
  when 'sbi' then case ch
    when 'neft' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRANSFER-NEFT*' || coalesce(ifsc, '') || '*' || coalesce(ref, '') || '*' || coalesce(nm, 'A/C ' || a4) || '--'
    when 'rtgs' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRANSFER-RTGS UTR NO: ' || coalesce(ref, '') || '--' || coalesce(nm, 'A/C ' || a4)
    when 'imps' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRANSFER-IMPS/P2A/' || coalesce(ref, '') || '/' || coalesce(nm, '') || '--'
    when 'upi' then case when dir = 'CR' then 'BY TRANSFER-UPI/CR/' else 'TO TRANSFER-UPI/DR/' end || coalesce(ref, '') || '/' || coalesce(nm, '') || '/' || left(coalesce(ifsc, ''), 4) || '--'
    when 'cheque' then case when dir = 'CR' then 'BY CLEARING-' else 'TO CLEARING-' end || coalesce(chq, '') || '-' || coalesce(nm, '')
    when 'card_settle' then 'BY TRANSFER-POS SETTLEMENT ' || coalesce(ref, '') || '--'
    when 'pos' then 'TO DEBIT THROUGH POS-' || coalesce(nm, '')
    when 'return' then 'BY TRANSFER-NEFT RETURN*' || coalesce(ref, '') || '*' || coalesce(memo, '') || '--'
    when 'own_trf' then case when dir = 'CR' then 'BY' else 'TO' end || ' TRANSFER-INB OWN A/C ' || coalesce(a4, '') || '--'
    when 'salary' then 'TO TRANSFER-INB SALARY ' || coalesce(memo, '') || '--'
    when 'gstr3b' then 'TO TRANSFER-INB GST ' || coalesce(ref, '') || '--'
    when 'tds' then 'TO TRANSFER-INB TAX 281 ' || coalesce(ref, '') || '--'
    when 'advance_tax' then 'TO TRANSFER-INB TAX 280 ' || coalesce(ref, '') || '--'
    when 'pf' then 'TO TRANSFER-INB EPFO ' || coalesce(ref, '') || '--'
    when 'esi' then 'TO TRANSFER-INB ESIC ' || coalesce(ref, '') || '--'
    when 'emi' then 'TO ACH DR-' || coalesce(nm, '') || '-' || coalesce(ref, '')
    when 'od_int' then 'TO INT DR OD ' || coalesce(memo, '')
    when 'disb' then 'BY LOAN DISBURSEMENT ' || coalesce(ref, '')
    when 'refund' then 'BY TRANSFER-CPC REFUND ' || coalesce(ref, '') || '--'
    when 'charge_maint' then 'TO ACCT MAINT CHRGS ' || coalesce(memo, '')
    when 'charge_sms' then 'TO SMS CHRGS ' || coalesce(memo, '')
    when 'charge_txn' then 'TO ' || coalesce(memo, '') || ' COMM ' || coalesce(ref, '')
    when 'charge_chq' then 'TO CHQ BOOK CHRGS ' || coalesce(ref, '')
    else 'TO DEBIT ADJ ' || coalesce(ref, '') end
  -- Axis: "NEFT/<UTR>/<NAME>/<BANK>", direction only in the column.
  else case ch
    when 'neft' then 'NEFT/' || coalesce(ref, '') || '/' || coalesce(nm, 'A/C ' || a4) || '/' || pg_temp.bankname(ifsc)
    when 'rtgs' then 'RTGS/' || coalesce(ref, '') || '/' || coalesce(nm, 'A/C ' || a4)
    when 'imps' then 'IMPS/P2A/' || coalesce(ref, '') || '/' || coalesce(nm, '') || '/' || coalesce(memo, '')
    when 'upi' then 'UPI/P2M/' || coalesce(ref, '') || '/' || coalesce(nm, '') || '/' || coalesce(nullif(memo, ''), 'Payment') || '/' || pg_temp.bankname(ifsc)
    when 'cheque' then 'CLG/' || coalesce(chq, '') || '/' || coalesce(nm, '')
    when 'card_settle' then 'MSF/SETTL/' || coalesce(ref, '')
    when 'pos' then 'POS/' || coalesce(nm, '') || '/HYDERABAD'
    when 'return' then 'NEFT RTN/' || coalesce(ref, '') || '/' || coalesce(memo, '')
    when 'own_trf' then 'TRF/OWN/' || coalesce(a4, '')
    when 'salary' then 'TRF/SALARY/' || coalesce(memo, '')
    when 'gstr3b' then 'GIB/' || coalesce(ref, '') || '/GST'
    when 'tds' then 'GIB/' || coalesce(ref, '') || '/ITNS281'
    when 'advance_tax' then 'GIB/' || coalesce(ref, '') || '/ITNS280'
    when 'pf' then 'GIB/' || coalesce(ref, '') || '/EPFO'
    when 'esi' then 'GIB/' || coalesce(ref, '') || '/ESIC'
    when 'emi' then 'ACH-DR-' || coalesce(nm, '') || '-' || coalesce(ref, '')
    when 'od_int' then 'OD INT/' || coalesce(memo, '')
    when 'disb' then 'LOAN DISB/' || coalesce(ref, '')
    when 'refund' then 'CPC REFUND/' || coalesce(ref, '')
    when 'charge_maint' then 'Consolidated Charges for A/c ' || coalesce(memo, '')
    when 'charge_sms' then 'SMS CHRG ' || coalesce(memo, '')
    when 'charge_txn' then coalesce(memo, '') || ' CHG/' || coalesce(ref, '')
    when 'charge_chq' then 'CHQ BOOK CHG/' || coalesce(ref, '')
    else 'ADJ DR/' || coalesce(ref, '') end
  end
$$;

-- Every statement line before rendering: events plus both legs of each transfer.
create temp table bk_line on commit drop as
select e.slice_no, e.account_id, e.posted_date, e.value_date, e.seq, e.debit, e.credit, e.kind, e.src_key,
  e.ch, e.cp_name, e.cp_ifsc, e.cp_acct4, e.ref, e.chq, e.memo, e.payment_id, e.vpay_id,
  -- Events have no pair; transfers set it below.
  null::text as grp, case when e.credit > 0 then 'CR' else 'DR' end as dir
from bk_ev e;

-- Transfer legs. 40% are unlabelled (A13): they read like an ordinary NEFT or
-- RTGS to "A/C XXXX1234" with no own-account wording, so only the matching
-- UTR, amount and date on the other statement give them away.
insert into bk_line
select t.slice_no, l.acct, t.posted_date, t.posted_date, t.seq, l.debit, l.credit, t.kind,
  'tr|' || t.slice_no || '|' || t.k || '|' || l.leg,
  x.ch, null, l.o_ifsc, l.o_a4,
  -- Both legs carry the same UTR, as a real inter-bank transfer does.
  case when x.ch = 'own_trf' then pg_temp.dg('trref' || t.slice_no || t.k, 10)
       else left(fa.ifsc, 4) || case when x.ch = 'rtgs' then 'R' else 'N' end || to_char(t.posted_date, 'YYMMDD') || pg_temp.dg('trref' || t.slice_no || t.k, 8) end,
  null, '', null, null,
  'tr|' || t.slice_no || '|' || t.k, l.dir
from bk_tr t
join public.nova_bank_accounts fa on fa.id = t.from_id
join public.nova_bank_accounts ta on ta.id = t.to_id
-- Labelled or not, and the rail an unlabelled one pretends to be.
cross join lateral (select case when pg_temp.h('trl' || t.slice_no || '|' || t.k) >= 0.4 then 'own_trf'
  when t.amount >= 200000 then 'rtgs' else 'neft' end as ch) x
-- Debit on the sender, credit on the receiver; each shows the OTHER account.
cross join lateral (values ('dr', t.from_id, t.amount, 0::numeric, ta.ifsc, ta.account_last4, 'DR'),
                           ('cr', t.to_id, 0::numeric, t.amount, fa.ifsc, fa.account_last4, 'CR')) l(leg, acct, debit, credit, o_ifsc, o_a4, dir)
where t.kind in ('transfer', 'a23');

-- OD interest (back-valued to the month's last day) and loan drawdowns.
insert into bk_line
select t.slice_no, coalesce(t.from_id, t.to_id), t.posted_date,
  case when t.kind = 'od_interest' then t.posted_date - 1 else t.posted_date end,
  t.seq, case when t.kind = 'od_interest' then t.amount else 0 end, case when t.kind = 'disbursal' then t.amount else 0 end,
  t.kind, 'tr|' || t.slice_no || '|' || t.k,
  case when t.kind = 'od_interest' then 'od_int' else 'disb' end, null, null, null,
  case when t.kind = 'disbursal' then 'WC' || pg_temp.dg('wc' || t.slice_no || t.k, 10) end, null,
  -- The interest period, e.g. "01-08-2026 TO 31-08-2026".
  case when t.kind = 'od_interest' then to_char(t.posted_date - interval '1 month', 'DD-MM-YYYY') || ' TO ' || to_char(t.posted_date - 1, 'DD-MM-YYYY') else '' end,
  null, null, null, case when t.kind = 'od_interest' then 'DR' else 'CR' end
from bk_tr t where t.kind in ('od_interest', 'disbursal');

-- Rendered lines with running balances, before duplicates are added.
create temp table bk_out on commit drop as
select l.*,
  -- Balance after the line, in statement order, from the opening balance.
  a.opening_balance + sum(l.credit - l.debit) over (partition by l.account_id order by l.posted_date, l.seq, l.src_key rows unbounded preceding) as running_balance,
  -- The narration, cut to the width that bank's statement export keeps.
  left(regexp_replace(pg_temp.narr(a.statement_format, l.dir, l.ch,
    case when l.cp_name is not null then pg_temp.mess(l.cp_name, l.src_key,
      case a.statement_format when 'hdfc' then 30 when 'icici' then 28 when 'sbi' then 24 else 22 end) end,
    l.cp_ifsc, l.cp_acct4, l.ref, l.chq, l.memo, l.src_key),
    -- 8% of lines carry one stray space after the first dash (no 'g' flag: first only).
    '-', case when pg_temp.h(l.src_key || 'sp') < 0.08 then '- ' else '-' end),
    case a.statement_format when 'hdfc' then 85 when 'icici' then 70 when 'sbi' then 80 else 60 end) as raw_narration,
  -- The bank's own counterparty field: a cleaned, cut name, missing 15% of the time.
  case when l.ch = 'own_trf' then 'SELF'
       when l.ch in ('gstr3b') then 'GSTN' when l.ch in ('tds', 'advance_tax') then 'CBDT'
       when l.ch = 'pf' then 'EPFO' when l.ch = 'esi' then 'ESIC'
       when l.cp_name is not null and pg_temp.h(l.src_key || 'cpt') >= 0.15
         then upper(left(regexp_replace(l.cp_name, '\s+(pvt\.? ?ltd|private limited|ltd|llp|& co)\.?$', '', 'i'), 20)) end as counterparty_text,
  'btx_' || left(md5('btx|' || l.src_key), 12) as id,
  false as is_dup
from bk_line l
join public.nova_bank_accounts a on a.id = l.account_id;

-- A13: ~2% of lines imported twice. The copy is verbatim — same dates,
-- amount, narration, ref and even running balance — which is exactly how a
-- re-imported statement file looks, and the balance break is the tell.
insert into bk_out
select o.slice_no, o.account_id, o.posted_date, o.value_date, o.seq, o.debit, o.credit, o.kind, o.src_key || '|dup',
  o.ch, o.cp_name, o.cp_ifsc, o.cp_acct4, o.ref, o.chq, o.memo, null, null, o.src_key, o.dir,
  o.running_balance, o.raw_narration, o.counterparty_text, 'btx_' || left(md5('btx|' || o.src_key || '|dup'), 12), true
from bk_out o
where pg_temp.h(o.src_key || 'dup') < 0.02;

-- The statement itself. line_no follows statement order; a duplicate sits
-- right after the line it copies (its src_key extends the original's).
insert into public.nova_bank_transactions (id, account_id, line_no, value_date, posted_date, debit, credit, running_balance,
  raw_narration, counterparty_text, bank_ref, cheque_no, slice_no)
select o.id, o.account_id,
  row_number() over (partition by o.account_id order by o.posted_date, o.seq, o.src_key),
  o.value_date, o.posted_date, o.debit, o.credit, o.running_balance, o.raw_narration, o.counterparty_text,
  -- Cheque lines are known by the cheque number, not a UTR.
  case when o.chq is null then o.ref end, o.chq,
  -- Inherited from the account (child slice = parent slice).
  a.slice_no
from bk_out o
join public.nova_bank_accounts a on a.id = o.account_id;

-- -----------------------------------------------------------------------------
-- Back-links and FKs. A duplicate copy is never linked: the books point at
-- the line the bank really posted.
-- -----------------------------------------------------------------------------
update public.nova_payments p set bank_transaction_id = o.id
from bk_out o where o.payment_id = p.id and not o.is_dup;
update public.nova_vendor_payments v set bank_transaction_id = o.id
from bk_out o where o.vpay_id = v.id and o.kind = 'vpay' and not o.is_dup;
-- Restrict: a statement line a receipt points at must not silently vanish.
alter table public.nova_payments add constraint nova_payments_bank_transaction_fk
  foreign key (bank_transaction_id) references public.nova_bank_transactions(id) on delete restrict;
alter table public.nova_vendor_payments add constraint nova_vendor_payments_bank_transaction_fk
  foreign key (bank_transaction_id) references public.nova_bank_transactions(id) on delete restrict;
-- Postgres does not index FK columns; lookups from a line to its receipt need these.
create index if not exists nova_payments_bank_transaction_idx on public.nova_payments (bank_transaction_id);
create index if not exists nova_vendor_payments_bank_transaction_idx on public.nova_vendor_payments (bank_transaction_id);

-- -----------------------------------------------------------------------------
-- Budgets: per department, category and month, for the 12 months ending in
-- the as-of month (k = 0..11). committed = spend committed that month:
-- non-cancelled POs raised (materials), expenses booked (expense categories)
-- and payroll accrued (payroll). Actual-vs-committed is the team's analysis.
-- -----------------------------------------------------------------------------

-- Committed spend per department, category and month, from the books.
-- Each source is aggregated once and joined, rather than probed per cell.
create temp table bk_commit on commit drop as
select d.id as department_id, d.slice_no, c.category, m.k, m.m, coalesce(x.amt, 0) as committed
from public.nova_departments d
cross join (select unnest(array['payroll', 'materials', 'rent', 'travel', 'software', 'utilities', 'office_supplies',
  'professional_fees', 'marketing', 'meals', 'other']) as category) c
cross join bk_month m
left join (
  -- Payroll accrues from the same per-employee pay the runs are summed from.
  select department_id, 'payroll' as category, m, sum(gross) as amt from bk_emp_pay group by 1, 2, 3
  union all
  -- A PO commits its full value in the month it is raised.
  select department_id, 'materials', date_trunc('month', order_date)::date, sum(total_amount)
  from public.nova_purchase_orders where status <> 'cancelled' group by 1, 2, 3
  union all
  -- Expenses have no PO stage: booking them is the commitment. Salaries are
  -- payroll's; a category outside the list is budgeted as 'other'.
  select department_id, case when category in ('rent', 'travel', 'software', 'utilities', 'office_supplies',
    'professional_fees', 'marketing', 'meals') then category else 'other' end,
    date_trunc('month', expense_date)::date, sum(total_amount)
  from public.nova_expenses where category <> 'salaries' and department_id is not null group by 1, 2, 3
) x on x.department_id = d.id and x.category = c.category and x.m = m.m
where m.k <= 11;

-- Which categories each department budgets: payroll, materials, its biggest
-- expense category, and a second one for the slice's biggest expense spender.
-- 8 departments × 3 + 1 = 25 lines × 12 months = 300 rows a slice.
create temp table bk_pair on commit drop as
with spend as (
  -- Annual spend per expense category, ranked inside the department.
  select department_id, slice_no, category, sum(committed) as total,
    row_number() over (partition by department_id order by sum(committed) desc, category) as rk
  from bk_commit where category not in ('payroll', 'materials') group by department_id, slice_no, category
), dept as (
  -- The department with the most expense spend gets the extra category.
  select department_id, slice_no, row_number() over (partition by slice_no order by sum(total) desc, department_id) as drk
  from spend group by department_id, slice_no
)
select d.id as department_id, d.slice_no, c.category
from public.nova_departments d
cross join lateral (
  select 'payroll' as category union all select 'materials'
  -- Top expense category; with no expenses at all, a stable default.
  union all select coalesce((select s.category from spend s where s.department_id = d.id and s.rk = 1 and s.total > 0),
    (array['travel', 'office_supplies', 'software'])[1 + floor(pg_temp.h(d.id || 'cat') * 3)::int])
  union all select s.category from spend s join dept x on x.department_id = s.department_id
    where s.department_id = d.id and x.drk = 1 and s.rk = 2
) c;

-- A18 targets per slice: Y overruns via commitments (the department with the
-- most PO commitments), X trends to overrun (the biggest other spender).
create temp table bk_a18 on commit drop as
select y.slice_no, y.department_id as dep_y,
  (select c.department_id from bk_commit c where c.slice_no = y.slice_no and c.department_id <> y.department_id
   group by c.department_id order by sum(c.committed) desc, c.department_id limit 1) as dep_x,
  -- X will have used 86–92% of its annual budget by month 9.
  0.86 + 0.06 * pg_temp.h('a18u' || y.slice_no) as u,
  -- Y's materials commitments exceed its budget by 6–15%.
  1.06 + 0.09 * pg_temp.h('a18v' || y.slice_no) as v
from (select distinct on (slice_no) slice_no, department_id from bk_commit where category = 'materials'
      group by slice_no, department_id order by slice_no, sum(committed) desc, department_id) y;

-- Normal budget: the pair's monthly run-rate × 1.08–1.30 headroom × ±10%
-- seasonality (payroll: 3–7% headroom, flat), in round thousands.
create temp table bk_bud on commit drop as
select c.*,
  greatest(1000, round(case when c.annual = 0 then 25000 * (1 + pg_temp.h(c.department_id || c.category))
    else c.annual / 12 * case when c.category = 'payroll' then 1.03 + 0.04 * pg_temp.h(c.department_id || 'pf')
      else (1.08 + 0.22 * pg_temp.h(c.department_id || c.category || 'f')) * (0.9 + 0.2 * pg_temp.h(c.department_id || c.category || c.m)) end
    end, -3)) as amount0
from (select c0.*, sum(c0.committed) over (partition by c0.department_id, c0.category) as annual from bk_commit c0) c
join bk_pair x on x.department_id = c.department_id and x.category = c.category;

-- A18 rescale factors, computed once per slice rather than per budget row.
create temp table bk_a18f on commit drop as
select a.*,
  -- X: months 1–9 of 12 (k = 11..3) consume exactly u of the rescaled year.
  (select sum(b.committed) from bk_bud b where b.department_id = a.dep_x and b.k >= 3)
    / a.u / nullif((select sum(b.amount0) from bk_bud b where b.department_id = a.dep_x), 0) as kx,
  -- Y: the year's materials commitments are v × the rescaled materials budget.
  (select sum(b.committed) from bk_bud b where b.department_id = a.dep_y and b.category = 'materials')
    / a.v / nullif((select sum(b.amount0) from bk_bud b where b.department_id = a.dep_y and b.category = 'materials'), 0) as ky
from bk_a18 a;

-- Every other department: if its months 1–9 already use over 78% of its
-- normal budget (a lumpy early PO), raise the budget so they do not, keeping
-- the A18 department the only one past 85%.
create temp table bk_normf on commit drop as
select b.department_id,
  greatest(1, sum(b.committed) filter (where b.k >= 3) / 0.78 / nullif(sum(b.amount0), 0)) as kn
from bk_bud b group by b.department_id;

-- Budgets, with the two A18 plants applied as a rescale of the normal amounts.
insert into public.nova_budgets (id, department_id, category, month, amount, committed, slice_no)
select 'bud_' || left(md5('bud|' || b.department_id || '|' || b.category || '|' || b.m), 12),
  b.department_id, b.category, b.m,
  -- Normal lines keep their amount; X and Y lines take their A18 factor.
  greatest(1000, round(b.amount0 * case
    when b.department_id = a.dep_x then coalesce(a.kx, 1)
    when b.department_id = a.dep_y and b.category = 'materials' then coalesce(a.ky, 1)
    else coalesce(n.kn, 1) end, -3)),
  b.committed, b.slice_no
from bk_bud b
left join bk_a18f a on a.slice_no = b.slice_no
left join bk_normf n on n.department_id = b.department_id;

-- -----------------------------------------------------------------------------
-- Ground truth (contract §7): every plant and decoy of this file.
-- -----------------------------------------------------------------------------

-- A13 duplicate import: each copy with the line it copies.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select d.slice_no, 'A13', 'bank-transactions', array[o.id, d.id], 'A13-dup-' || d.id, 'easy', false,
  'Statement line imported twice: identical date, amount, narration, ref and running balance. Count it once.'
from bk_out d join bk_out o on o.src_key = d.grp and not o.is_dup
where d.is_dup;

-- A13 unlabelled internal transfers: both legs, matched by UTR, amount and date.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A13', 'bank-transactions', array_agg(o.id order by o.dir desc), 'A13-' || o.grp, 'medium', false,
  'Internal transfer between two of the company''s own accounts, narrated like an external NEFT/RTGS. Not income, not spend.'
from bk_out o
where o.kind in ('transfer', 'a23') and o.ch in ('neft', 'rtgs') and not o.is_dup
group by o.slice_no, o.grp;

-- A13 unexplained charges.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A13', 'bank-transactions', array[o.id], 'A13-' || o.src_key, 'medium', false,
  'Bank debit with a vague adjustment narration and an amount matching no tariff: raise it with the bank.'
from bk_out o where o.kind = 'misc' and not o.is_dup;

-- A13 decoy: two identical cheque-book charges that are both genuine.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A13', 'bank-transactions', array_agg(o.id order by o.src_key), 'A13-cbk-' || o.slice_no, 'medium', true,
  'Two cheque books issued the same day: same charge twice, but different refs and the balance moves both times. Not a duplicate import.'
from bk_out o where o.kind = 'chqbook' and not o.is_dup group by o.slice_no;

-- A14 bank side: credits no receipt explains, and the refund decoy.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A14', 'bank-transactions', array[o.id], 'A14-' || o.src_key,
  case when o.kind = 'refund' then 'easy' when o.src_key like '%|1' then 'hard' else 'medium' end,
  o.kind = 'refund',
  case when o.kind = 'refund' then 'Income-tax refund: no invoice, but not customer money either. Nothing to chase.'
       when o.src_key like '%|1' then 'Credit from a real customer with no receipt booked against it: unapplied cash to allocate.'
       else 'Credit from a party that is not a customer, with no receipt or invoice: suspense until identified.' end
from bk_out o where o.kind in ('unknown_receipt', 'refund') and not o.is_dup;

-- A18: X trending to overrun, Y over via commitments, and a spike decoy.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select a.slice_no, 'A18', 'budgets', array_agg(b.id order by b.month, b.category), 'A18-x-' || a.dep_x, 'medium', false,
  'Department has used over 85% of its annual budget by month 9 of 12 and is on course to overrun.'
from bk_a18 a join public.nova_budgets b on b.department_id = a.dep_x group by a.slice_no, a.dep_x
union all
select a.slice_no, 'A18', 'budgets', array_agg(b.id order by b.month), 'A18-y-' || a.dep_y, 'medium', false,
  'Materials commitments (open and closed POs) exceed the annual materials budget.'
from bk_a18 a join public.nova_budgets b on b.department_id = a.dep_y and b.category = 'materials' group by a.slice_no, a.dep_y;

-- The decoy: the single month most over its own budget among the other
-- departments, whose year stays under budget (a one-off bulk buy).
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select distinct on (b.slice_no) b.slice_no, 'A18', 'budgets', array[b.id], 'A18-decoy-' || b.slice_no, 'medium', true,
  'One month well over budget from a one-off purchase; the department''s year is still inside budget.'
from public.nova_budgets b
join bk_a18 a on a.slice_no = b.slice_no and b.department_id not in (a.dep_x, a.dep_y)
where b.committed > b.amount
  and (select sum(b2.committed) from public.nova_budgets b2 where b2.department_id = b.department_id)
    < (select sum(b2.amount) from public.nova_budgets b2 where b2.department_id = b.department_id)
order by b.slice_no, b.committed / b.amount desc, b.id;

-- A23: the operating account's lines below its minimum (the squeeze and the
-- partial top-ups that climb out of it, within a week), and the late GST challan.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select q.slice_no, 'A23', 'bank-transactions', array_agg(t.id order by t.line_no), 'A23-' || q.slice_no, 'hard', false,
  'Payroll week: salaries, the loan EMI and a late GSTR-3B fell together and the operating account closed below its minimum balance.'
from bk_a23 q
join public.nova_bank_accounts a on a.id = q.victim
join public.nova_bank_transactions t on t.account_id = q.victim and t.posted_date between q.g and q.g + 7 and t.running_balance < a.min_balance
group by q.slice_no
union all
select q.slice_no, 'A23', 'statutory-dues', array_agg(s.id), 'A23-' || q.slice_no, 'hard', false,
  'The GSTR-3B paid late, with interest, in the squeeze week.'
from bk_a23 q join public.nova_statutory_dues s on s.slice_no = q.slice_no and s.due_type = 'gstr3b'
  and s.period = to_char(q.m - interval '1 month', 'YYYY-MM')
group by q.slice_no;

-- A23 decoy: the heaviest other EMI week on the operating account, fully
-- pre-funded, so it never breaks the minimum.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select w.slice_no, 'A23', 'bank-transactions', w.ids, 'A23-decoy-' || w.slice_no, 'hard', true,
  'Heavy payroll-and-EMI week, but treasury moved cash in beforehand and the account stayed above its minimum.'
from (
  select distinct on (q.slice_no) q.slice_no,
    (array_agg(t.id order by t.debit desc, t.id))[1:3] as ids
  from bk_a23 q
  cross join bk_month m
  -- Real lines only: a duplicate copy is A13's, not part of this decoy.
  join bk_out o on o.account_id = q.victim and not o.is_dup
  join public.nova_bank_transactions t on t.id = o.id and t.debit > 0
    and t.posted_date between pg_temp.emi_date(m.m) - 3 and pg_temp.emi_date(m.m) + 3
  where m.m <> q.m and m.k between 1 and 11
  group by q.slice_no, q.victim, m.m
  having min(t.running_balance) >= (select a.min_balance from public.nova_bank_accounts a where a.id = q.victim)
  order by q.slice_no, sum(t.debit) desc, m.m
) w;

-- -----------------------------------------------------------------------------
-- Read views: the API reads views only. security_invoker so a view can never
-- bypass RLS for its caller. Dropped and recreated: a view's column list is
-- frozen at creation, and CREATE OR REPLACE cannot reorder columns.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_bank_transactions_v, public.nova_payroll_runs_v, public.nova_statutory_dues_v, public.nova_budgets_v;
create view public.nova_bank_transactions_v with (security_invoker = true) as select * from public.nova_bank_transactions;
create view public.nova_payroll_runs_v with (security_invoker = true) as select * from public.nova_payroll_runs;
-- Status derived against the frozen as-of date, never current_date (contract §1).
create view public.nova_statutory_dues_v with (security_invoker = true) as
select s.*,
  case when s.paid_date is not null then 'paid'
       when s.due_date < coalesce((select m.as_of_date from public.nova_dataset_meta m where m.id), current_date) then 'overdue'
       else 'upcoming' end as status
from public.nova_statutory_dues s;
-- Headroom left, so teams need not compute it.
create view public.nova_budgets_v with (security_invoker = true) as
select b.*, b.amount - b.committed as remaining from public.nova_budgets b;

-- Lockdown, as in 001: RLS on with no policies, anon/authenticated revoked,
-- service_role only.
alter table public.nova_bank_transactions enable row level security;
alter table public.nova_payroll_runs enable row level security;
alter table public.nova_statutory_dues enable row level security;
alter table public.nova_budgets enable row level security;
revoke all on public.nova_bank_transactions, public.nova_payroll_runs, public.nova_statutory_dues, public.nova_budgets,
  public.nova_bank_transactions_v, public.nova_payroll_runs_v, public.nova_statutory_dues_v, public.nova_budgets_v
  from anon, authenticated;
grant select, insert, update, delete on public.nova_bank_transactions, public.nova_payroll_runs, public.nova_statutory_dues,
  public.nova_budgets to service_role;
grant select on public.nova_bank_transactions_v, public.nova_payroll_runs_v, public.nova_statutory_dues_v, public.nova_budgets_v
  to service_role;

-- Temp tables and pg_temp helpers vanish with the transaction/session.
commit;
