-- STATUS: VERIFIED 2026-09-30
-- =============================================================================
-- Nova Tier 2 pack 2d: debt (docs/nova-tier2-build-contract.md §4.4).
-- Owner: debt builder. Runs after 008 and before 012 in the Tier 2 order
-- 009 → 010 → 011 → 013 → 012: the ledger's EMI journals need the
-- principal/interest split this file computes (§3.1).
--
-- Creates nova_loans (2 per slice: one term loan, one cash-credit line) and
-- nova_loan_schedules (the term loan's 60 instalments).
--
-- The debt is READ OFF the bank statement 008 already wrote, so the two can
-- never disagree:
--   * term loan: the monthly EMI debits (bank_ref 'LN' + 10 digits) fix the
--     EMI, the lender, the loan reference and the repayment account; the
--     principal is back-solved from the EMI with the 60-month annuity factor.
--   * cash credit: the working-capital drawdowns into the od account
--     (bank_ref 'WC' + 10 digits) fix the drawn amount. 008 never repays
--     them (contract §10 G4), so the outstanding is their sum.
-- A13 duplicate imports are skipped: a schedule row links to the line the
-- bank really posted, never to its re-imported copy.
--
-- Reads (read-only): 005 nova_bank_accounts, nova_dataset_meta; 008
-- nova_bank_transactions. Reads no other Tier 2 table. Writes nothing
-- upstream (§2.2.4) and owns no anomaly code (§6: none planted in 013).
--
-- Cross-file references are soft (§2.2.1): repayment_account_id and
-- bank_transaction_id are indexed text with no FK, checked by the do-block
-- at the end, which rolls the whole file back if any fails to resolve.
--
-- Deterministic: every choice is an md5 roll of a stable key (pg_temp.h);
-- no random() is used. Re-runnable: truncates only its own two tables.
-- =============================================================================

-- One transaction: a failure halfway leaves the previous debt tables intact.
begin;

-- Pinned per file (§2.1), although nothing below calls random().
select setseed(0.1313);

-- Parallel workers could make plan-dependent ordering leak into results.
set local max_parallel_workers_per_gather = 0;

-- -----------------------------------------------------------------------------
-- Tables. Money numeric(14,2), percent numeric(5,2), status text + CHECK,
-- text ids with a type prefix: the conventions every Nova table follows.
-- -----------------------------------------------------------------------------

-- One row per borrowing facility of the company.
create table if not exists public.nova_loans (
  -- 12 hex characters (Tier 1 D5), prefixed so an id names its table.
  id text primary key check (id like 'lon\_%'),
  -- The two facilities an Indian SME typically carries: a term loan for
  -- capex and a cash-credit line for working capital.
  loan_type text not null check (loan_type in ('term_loan', 'cash_credit')),
  -- Term loan: the EMI counterparty; cash credit: the od account's bank.
  lender text not null,
  -- The lender's account number for the facility, as statements quote it.
  loan_account_ref text not null,
  -- The limit (cash credit) or the principal lent (term loan).
  sanctioned_amount numeric(14,2) not null check (sanctioned_amount > 0),
  -- Both facilities predate the statement window (contract §4.4).
  sanction_date date not null,
  -- Money actually released: all of it for the term loan, the drawdowns for CC.
  disbursed_amount numeric(14,2) not null check (disbursed_amount >= 0),
  -- Annual rate in percent, e.g. 11.75.
  interest_rate_pct numeric(5,2) not null check (interest_rate_pct > 0),
  -- Term loans here are fixed; cash credit floats over the bank's benchmark.
  rate_type text not null check (rate_type in ('fixed', 'floating')),
  -- Term loan only: the number of monthly instalments.
  tenure_months integer check (tenure_months > 0),
  -- Term loan only: the monthly EMI, equal to the bank debit.
  emi_amount numeric(14,2) check (emi_amount > 0),
  -- Soft reference to nova_bank_accounts (005): the account debited (term
  -- loan) or drawn into (cash credit). No FK, see the header.
  repayment_account_id text not null,
  -- The collateral, templated from a phrase bank.
  security text not null,
  -- Cash credit only: the annual renewal date; may be after as-of.
  review_date date,
  -- Principal still owed at the as-of date.
  outstanding_principal numeric(14,2) not null check (outstanding_principal >= 0),
  -- Both facilities are live; 'closed' is kept for a repaid loan.
  status text not null check (status in ('active', 'closed')),
  -- The team partition (contract §2).
  slice_no integer not null check (slice_no >= 0),
  -- Row birth time; never part of the determinism md5 (§8.2 C3).
  created_at timestamptz not null default now(),
  -- One facility of each kind per company.
  constraint nova_loans_type_key unique (slice_no, loan_type),
  -- A term loan always has a tenure and an EMI; a cash-credit line has neither.
  constraint nova_loans_term_shape check ((loan_type = 'term_loan') = (tenure_months is not null and emi_amount is not null)),
  -- Only the cash-credit line is renewed annually.
  constraint nova_loans_review check (review_date is null or loan_type = 'cash_credit'),
  -- Nothing is owed beyond what was released.
  constraint nova_loans_outstanding check (outstanding_principal <= disbursed_amount)
);

-- One row per instalment of a term loan's amortisation table.
create table if not exists public.nova_loan_schedules (
  -- Prefixed deterministic id.
  id text primary key check (id like 'lsc\_%'),
  -- Same-file FK (allowed, §2.2.1). Truncated together with nova_loans in
  -- one statement, so the FK never blocks a rerun.
  loan_id text not null references public.nova_loans(id) on delete restrict,
  -- 1-based position in the tenure.
  instalment_no integer not null check (instalment_no >= 1),
  -- The NACH debit date; future instalments are after as-of by nature.
  due_date date not null,
  -- Principal owed before this instalment.
  opening_principal numeric(14,2) not null check (opening_principal > 0),
  -- The instalment's split: principal reduces the balance, interest does not.
  principal_due numeric(14,2) not null check (principal_due > 0),
  interest_due numeric(14,2) not null check (interest_due >= 0),
  -- The EMI; only the last instalment differs, by the rounding it absorbs.
  total_due numeric(14,2) not null,
  -- Principal owed after this instalment.
  closing_principal numeric(14,2) not null check (closing_principal >= 0),
  -- paid: debited; due: fell due by as-of, not yet debited; scheduled: future.
  status text not null check (status in ('paid', 'due', 'scheduled')),
  -- When it was actually debited; null unless paid.
  paid_date date,
  -- Soft reference to nova_bank_transactions (008): the EMI line that paid
  -- it. Null for instalments paid before the statement window starts.
  bank_transaction_id text,
  -- Copied from the loan (child slice = parent slice).
  slice_no integer not null check (slice_no >= 0),
  -- Row birth time; excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- An instalment is split exactly, to the paisa.
  constraint nova_loan_schedules_split check (total_due = principal_due + interest_due),
  -- Reducing balance: what is left is what was owed less what was repaid.
  constraint nova_loan_schedules_balance check (closing_principal = opening_principal - principal_due),
  -- A paid date exists exactly when the instalment is paid.
  constraint nova_loan_schedules_paid check ((status = 'paid') = (paid_date is not null)),
  -- Only a paid instalment can point at a bank line.
  constraint nova_loan_schedules_btx check (bank_transaction_id is null or status = 'paid'),
  -- One row per instalment per loan.
  constraint nova_loan_schedules_key unique (loan_id, instalment_no)
);

-- Every API list pins slice_no then sorts by date: one composite index serves both.
create index if not exists nova_loans_slice_idx on public.nova_loans (slice_no, sanction_date desc);
-- Soft references are indexed (§2.2.1), so the self-check and joins stay cheap.
create index if not exists nova_loans_repayment_account_idx on public.nova_loans (repayment_account_id);
-- The dated list index for the schedules resource.
create index if not exists nova_loan_schedules_slice_idx on public.nova_loan_schedules (slice_no, due_date desc);
-- The child route /loans/{id}/loan-schedules; Postgres never indexes FK columns itself.
create index if not exists nova_loan_schedules_loan_idx on public.nova_loan_schedules (loan_id);
-- Bank matching goes from a statement line to its instalment (012 does this).
create index if not exists nova_loan_schedules_btx_idx on public.nova_loan_schedules (bank_transaction_id);

-- -----------------------------------------------------------------------------
-- Reset: only this file's two tables, in ONE statement and without CASCADE
-- (§3.1). One statement is what lets the in-file FK stay: TRUNCATE refuses a
-- referenced table only when the referencing table is not truncated with it.
-- No ground-truth delete: 013 owns no anomaly code.
-- -----------------------------------------------------------------------------
truncate table public.nova_loan_schedules, public.nova_loans;

-- -----------------------------------------------------------------------------
-- Helpers (session-temporary, gone when the connection closes).
-- -----------------------------------------------------------------------------

-- A stable roll in [0, 1) from any key: first 32 bits of its md5. Same
-- definition as 008's, so a choice never depends on row visit order.
create function pg_temp.h(k text) returns numeric language sql immutable as $$
  -- Hex → 32-bit unsigned integer → fraction of 2^32, numeric for exact maths.
  select ('x' || substr(md5(k), 1, 8))::bit(32)::bigint::numeric / 4294967296
$$;

-- The EMI date for the month starting m: the 28th, or the Monday after when
-- it falls on a weekend (NACH debits roll forward). It is the rule the 008
-- EMI lines follow (contract §4.4); the self-check proves every in-window
-- instalment lands exactly on its bank line, so a drift would fail loudly.
create function pg_temp.emi_date(m date) returns date language sql immutable as $$
  -- m is the first of the month, so m + 27 is the 28th; Sat +2, Sun +1.
  select d + case extract(isodow from d)::int when 6 then 2 when 7 then 1 else 0 end
  from (select m + 27 as d) x
$$;

-- -----------------------------------------------------------------------------
-- Context: the frozen as-of date (005) ends every schedule's "paid" part.
-- -----------------------------------------------------------------------------
create temp table dt_ctx on commit drop as
-- Never current_date (contract §1); the fallback only guards a missing 005.
select coalesce((select m.as_of_date from public.nova_dataset_meta m where m.id), current_date) as as_of;

-- EMI lines as the bank really posted them. An A13 re-import is a verbatim
-- copy on the same account and date that sits right after its original in
-- statement order, so the lowest line_no per (account, date) is the original.
create temp table dt_emi on commit drop as
select distinct on (t.account_id, t.posted_date)
  t.id, t.slice_no, t.account_id, t.posted_date, t.debit, t.bank_ref, t.counterparty_text
from public.nova_bank_transactions t
-- 'LN' + 10 digits is the loan reference 008 stamps on every EMI debit.
where t.bank_ref ~ '^LN[0-9]{10}$' and t.debit > 0
-- distinct on keeps the first row of each group in this order: the original.
order by t.account_id, t.posted_date, t.line_no;

-- Working-capital drawdowns, originals only. Each has its own 'WC' reference,
-- so a copy shares its original's bank_ref; keep the lowest line_no.
create temp table dt_wc on commit drop as
select distinct on (t.account_id, t.bank_ref)
  t.id, t.slice_no, t.account_id, t.posted_date, t.credit, t.bank_ref
from public.nova_bank_transactions t
-- 'WC' + 10 digits marks a loan disbursal credit in 008.
where t.bank_ref ~ '^WC[0-9]{10}$' and t.credit > 0
-- The original comes first in statement order.
order by t.account_id, t.bank_ref, t.line_no;

-- The lenders 008's EMI counterparties are drawn from, by legal name. The
-- statement shows them cut and without the suffix; this maps them back.
create temp table dt_lender on commit drop as
select nm, upper(regexp_replace(nm, '\s+(ltd|limited)\.?$', '', 'i')) as short
from unnest(array['HDFC BANK LTD', 'BAJAJ FINANCE LTD', 'TATA CAPITAL', 'SIDBI', 'ICICI BANK LTD']) as l(nm);

-- -----------------------------------------------------------------------------
-- Term loan parameters, one row per slice, all read off the EMI lines.
-- -----------------------------------------------------------------------------
create temp table dt_term on commit drop as
select e.slice_no, e.account_id, e.bank_ref, e.emi, e.first_line, e.lines,
  -- The legal name when the statement's short form is a known lender, else
  -- the statement's own text (never null: see the self-check).
  coalesce(l.nm, e.cpt) as lender,
  -- Rate 10.50–13.00% in 0.05 steps, per slice (contract §4.4).
  r.rate,
  -- Instalment 1 falls two years before the as-of month: 008 numbers its
  -- window lines 'EMI n/60' from a loan taken then.
  (date_trunc('month', c.as_of) - interval '24 months')::date as m1
from (
  select slice_no,
    -- One account and one reference per slice (the self-check asserts it).
    min(account_id) as account_id, min(bank_ref) as bank_ref,
    -- The EMI is a fixed debit; min = max is asserted below.
    min(debit) as emi,
    -- The first statement EMI: instalments due earlier predate the window.
    min(posted_date) as first_line,
    -- How many EMIs the statement carries.
    count(*) as lines,
    -- The most common counterparty text; ties break alphabetically, stably.
    mode() within group (order by counterparty_text) as cpt
  from dt_emi group by slice_no
) e
cross join dt_ctx c
left join dt_lender l on l.short = e.cpt
-- One stable roll per slice for the rate.
cross join lateral (select round((10.50 + 2.50 * pg_temp.h('lonrate|' || e.slice_no)) * 20) / 20 as rate) r;

-- Principal back-solved from the EMI: EMI × the 60-month annuity factor
-- (1 − (1+i)^−60) / i at the monthly rate i, rounded to ₹1,000 as a
-- sanction letter would be.
create temp table dt_principal on commit drop as
select t.*, round(t.emi * (1 - power(1 + t.rate / 1200, -60)) / (t.rate / 1200), -3) as principal
from dt_term t;

-- -----------------------------------------------------------------------------
-- Amortisation: reducing balance, interest on the opening principal at the
-- monthly rate, rounded to the paisa each month. Instalments 1–59 are
-- exactly the EMI (so every in-window one equals its bank debit to the
-- paisa); instalment 60 repays whatever principal is left and so absorbs
-- the rounding of the ₹1,000 principal and of every monthly interest.
-- -----------------------------------------------------------------------------
create temp table dt_amort on commit drop as
with recursive a (slice_no, n, opening) as (
  -- Instalment 1 opens on the full principal.
  select p.slice_no, 1, p.principal from dt_principal p
  union all
  -- Each next opening is this closing: opening − (EMI − interest).
  select a.slice_no, a.n + 1, a.opening - (p.emi - round(a.opening * p.rate / 1200, 2))
  from a join dt_principal p on p.slice_no = a.slice_no
  -- 60 instalments (contract §4.4).
  where a.n < 60
)
select a.slice_no, a.n, a.opening, x.interest,
  -- The last instalment clears the balance; the rest pay EMI − interest.
  case when a.n = 60 then a.opening else p.emi - x.interest end as principal,
  -- The instalment's due date: month n counted from instalment 1's month.
  pg_temp.emi_date((p.m1 + make_interval(months => a.n - 1))::date) as due_date
from a
join dt_principal p on p.slice_no = a.slice_no
-- The month's interest, computed once and reused for both columns.
cross join lateral (select round(a.opening * p.rate / 1200, 2) as interest) x;

-- Each instalment with its status and its bank line, if the statement has one.
create temp table dt_sched on commit drop as
select a.*, e.id as btx_id,
  -- paid: on the statement, or due before the statement's first EMI (the
  -- window starts 2025-09-30, so earlier debits are simply not shown);
  -- scheduled: after as-of; due: fell due since the last EMI line.
  case when e.id is not null or a.due_date < p.first_line then 'paid'
       when a.due_date > c.as_of then 'scheduled'
       else 'due' end as status,
  -- The debit date for a statement line; for a pre-window instalment the
  -- NACH mandate debits on the due date by construction.
  case when e.id is not null then e.posted_date when a.due_date < p.first_line then a.due_date end as paid_date
from dt_amort a
join dt_principal p on p.slice_no = a.slice_no
cross join dt_ctx c
-- The EMI line posted on this instalment's due date, on the loan's account.
left join dt_emi e on e.slice_no = a.slice_no and e.account_id = p.account_id and e.posted_date = a.due_date;

-- -----------------------------------------------------------------------------
-- Loans. The term loan comes from the EMI lines, the cash credit from the
-- WC drawdowns on the od account (contract §4.4).
-- -----------------------------------------------------------------------------
insert into public.nova_loans (id, loan_type, lender, loan_account_ref, sanctioned_amount, sanction_date, disbursed_amount,
  interest_rate_pct, rate_type, tenure_months, emi_amount, repayment_account_id, security, review_date,
  outstanding_principal, status, slice_no)
select
  -- Loan 1 of the slice (§2.1 id recipe).
  'lon_' || left(md5('nova_loans|' || p.slice_no || '|1'), 12),
  'term_loan', p.lender,
  -- The loan reference is the bank_ref every EMI line carries.
  p.bank_ref, p.principal,
  -- The 1st–20th of the month before the first EMI: disbursal, then a
  -- NACH mandate that starts debiting the following month.
  ((p.m1 - interval '1 month')::date + floor(20 * pg_temp.h('lonsan|' || p.slice_no))::int),
  -- A term loan is released in full at sanction.
  p.principal, p.rate, 'fixed', 60, p.emi,
  -- The operating account the EMIs are debited from.
  p.account_id,
  -- Term-loan collateral: the assets it financed, plus the usual guarantee.
  (array['Hypothecation of plant and machinery financed, with personal guarantee of the directors',
         'Exclusive charge on the equipment financed and equitable mortgage of the factory premises',
         'First charge on fixed assets purchased from the loan, with collateral of a fixed deposit',
         'Hypothecation of the assets financed, with a corporate guarantee of the promoter company'])
    [1 + floor(4 * pg_temp.h('lonsec|' || p.slice_no))::int],
  null,
  -- Principal owed at as-of: the opening of the FIRST instalment not yet paid
  -- (ordered by n: min(opening) would pick instalment 60's small balance).
  coalesce((select s.opening from dt_sched s where s.slice_no = p.slice_no and s.status <> 'paid' order by s.n limit 1), 0),
  'active', p.slice_no
from dt_principal p;

-- The cash-credit line: one per slice, on the od account.
insert into public.nova_loans (id, loan_type, lender, loan_account_ref, sanctioned_amount, sanction_date, disbursed_amount,
  interest_rate_pct, rate_type, tenure_months, emi_amount, repayment_account_id, security, review_date,
  outstanding_principal, status, slice_no)
select
  -- Loan 2 of the slice.
  'lon_' || left(md5('nova_loans|' || a.slice_no || '|2'), 12),
  -- The bank that runs the od account extends the line.
  'cash_credit', a.bank,
  -- 'CC' + the od account's last 4, as the contract defines the reference.
  'CC' || a.account_last4,
  -- The limit: the peak cumulative drawdown, rounded UP to the next ₹25 lakh.
  -- 008 never repays a drawdown, so the peak is the total.
  ceil(w.drawn / 2500000) * 2500000,
  -- 395–694 days before as-of, i.e. 1–11 months before the window
  -- (as-of − 364) starts: sanctioned before the window (contract §4.4).
  (c.as_of - 395 - floor(300 * pg_temp.h('ccsan|' || a.slice_no))::int),
  -- Released = everything drawn.
  w.drawn,
  -- 10.50%, the rate 008 charges its monthly OD interest at.
  10.50, 'floating', null, null,
  -- Drawn into, and serviced from, the od account.
  a.id,
  -- Working-capital collateral: current assets.
  (array['Hypothecation of stock and book debts, with drawing power at 75% of paid stock',
         'First charge on current assets, stock and receivables, with personal guarantee of the directors',
         'Hypothecation of inventory and receivables up to 90 days, with a collateral fixed deposit',
         'Pari passu charge on current assets, with equitable mortgage of the office premises'])
    [1 + floor(4 * pg_temp.h('ccsec|' || a.slice_no))::int],
  -- Annual renewal: the second anniversary of sanction, which falls after as-of.
  ((c.as_of - 395 - floor(300 * pg_temp.h('ccsan|' || a.slice_no))::int) + interval '2 years')::date,
  -- Repayable on demand and never repaid in 008 (§10 G4): all of it is owed.
  w.drawn, 'active', a.slice_no
from public.nova_bank_accounts a
cross join dt_ctx c
-- Drawdowns per od account.
join (select account_id, sum(credit) as drawn from dt_wc group by account_id) w on w.account_id = a.id
-- The od account is the one 008 draws working-capital loans into.
where a.purpose = 'od';

-- The term loan's 60 instalments.
insert into public.nova_loan_schedules (id, loan_id, instalment_no, due_date, opening_principal, principal_due, interest_due,
  total_due, closing_principal, status, paid_date, bank_transaction_id, slice_no)
select
  -- Instalment n of the slice (§2.1 id recipe).
  'lsc_' || left(md5('nova_loan_schedules|' || s.slice_no || '|' || s.n), 12),
  -- The slice's term loan (loan 1).
  'lon_' || left(md5('nova_loans|' || s.slice_no || '|1'), 12),
  s.n, s.due_date, s.opening, s.principal, s.interest,
  -- EMI for 1–59; principal + interest by construction, so the CHECK holds.
  s.principal + s.interest,
  s.opening - s.principal,
  s.status, s.paid_date, s.btx_id, s.slice_no
from dt_sched s;

-- -----------------------------------------------------------------------------
-- Read views: the API reads views only. security_invoker so a view can never
-- bypass RLS for its caller. Dropped and recreated: a view's column list is
-- frozen at creation, and CREATE OR REPLACE cannot reorder columns.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_loans_v, public.nova_loan_schedules_v;
-- No derived columns: every figure a team needs is stored (contract §4.4).
create view public.nova_loans_v with (security_invoker = true) as select * from public.nova_loans;
create view public.nova_loan_schedules_v with (security_invoker = true) as select * from public.nova_loan_schedules;

-- Lockdown, as in 001: RLS on with no policies, anon/authenticated revoked
-- (Supabase's default privileges grant them everything), service_role only.
alter table public.nova_loans enable row level security;
alter table public.nova_loan_schedules enable row level security;
revoke all on public.nova_loans, public.nova_loan_schedules, public.nova_loans_v, public.nova_loan_schedules_v
  from anon, authenticated;
grant select, insert, update, delete on public.nova_loans, public.nova_loan_schedules to service_role;
grant select on public.nova_loans_v, public.nova_loan_schedules_v to service_role;

-- -----------------------------------------------------------------------------
-- Self-check (§2.2.2). Any failure raises, which rolls the whole file back,
-- so a rerun after an upstream change fails loudly instead of leaving
-- dangling ids or a schedule that disagrees with the statement.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Count of offending rows for the check being run.
  bad integer;
begin
  -- Every slice with accounts has exactly one loan of each kind.
  select count(*) into bad from (select distinct slice_no from public.nova_bank_accounts) s
  where (select count(*) from public.nova_loans l where l.slice_no = s.slice_no) <> 2;
  if bad > 0 then raise exception '013 self-check: % slices without exactly 2 loans', bad; end if;

  -- Soft reference: the repayment account exists in the loan's own slice.
  select count(*) into bad from public.nova_loans l
  where not exists (select 1 from public.nova_bank_accounts a where a.id = l.repayment_account_id and a.slice_no = l.slice_no);
  if bad > 0 then raise exception '013 self-check: % loans with an unresolved repayment_account_id', bad; end if;

  -- Soft reference: a linked statement line exists in the instalment's own slice.
  select count(*) into bad from public.nova_loan_schedules s
  where s.bank_transaction_id is not null
    and not exists (select 1 from public.nova_bank_transactions t where t.id = s.bank_transaction_id and t.slice_no = s.slice_no);
  if bad > 0 then raise exception '013 self-check: % instalments with an unresolved bank_transaction_id', bad; end if;

  -- In-file FK slice: a schedule row sits in its loan's slice.
  select count(*) into bad from public.nova_loan_schedules s join public.nova_loans l on l.id = s.loan_id
  where l.slice_no <> s.slice_no;
  if bad > 0 then raise exception '013 self-check: % instalments outside their loan''s slice', bad; end if;

  -- One EMI shape per slice: one account, one reference, one amount.
  select count(*) into bad from (select slice_no from dt_emi group by slice_no
    having count(distinct account_id) > 1 or count(distinct bank_ref) > 1 or count(distinct debit) > 1) x;
  if bad > 0 then raise exception '013 self-check: % slices whose EMI lines disagree', bad; end if;

  -- Every original EMI line pays exactly one instalment, on its due date,
  -- for exactly the debit: the schedule and the statement agree to the paisa.
  select count(*) into bad from dt_emi e
  where (select count(*) from public.nova_loan_schedules s
         where s.bank_transaction_id = e.id and s.due_date = e.posted_date and s.total_due = e.debit) <> 1;
  if bad > 0 then raise exception '013 self-check: % EMI lines not matched to one instalment', bad; end if;

  -- No gap: every instalment due inside the statement's EMI range has a line.
  select count(*) into bad from dt_sched s join dt_principal p on p.slice_no = s.slice_no
  where s.due_date between p.first_line and (select max(e.posted_date) from dt_emi e where e.slice_no = s.slice_no)
    and s.btx_id is null;
  if bad > 0 then raise exception '013 self-check: % in-window instalments with no EMI line', bad; end if;

  -- Amortisation closes: principal repaid = principal lent, final balance 0.
  select count(*) into bad from public.nova_loans l
  where l.loan_type = 'term_loan'
    and (l.sanctioned_amount <> (select sum(s.principal_due) from public.nova_loan_schedules s where s.loan_id = l.id)
      or (select s.closing_principal from public.nova_loan_schedules s where s.loan_id = l.id and s.instalment_no = 60) <> 0
      or (select count(*) from public.nova_loan_schedules s where s.loan_id = l.id) <> 60);
  if bad > 0 then raise exception '013 self-check: % term loans whose schedule does not close', bad; end if;

  -- The term loan's outstanding is the balance after its last paid instalment.
  select count(*) into bad from public.nova_loans l
  where l.loan_type = 'term_loan'
    and l.outstanding_principal <> (select s.closing_principal from public.nova_loan_schedules s
      where s.loan_id = l.id and s.status = 'paid' order by s.instalment_no desc limit 1);
  if bad > 0 then raise exception '013 self-check: % term loans with a wrong outstanding', bad; end if;

  -- The cash-credit outstanding is exactly the original drawdowns.
  select count(*) into bad from public.nova_loans l
  where l.loan_type = 'cash_credit'
    and l.outstanding_principal <> (select sum(w.credit) from dt_wc w where w.account_id = l.repayment_account_id);
  if bad > 0 then raise exception '013 self-check: % cash-credit lines off their drawdowns', bad; end if;
end $$;

-- Temp tables and pg_temp helpers vanish with the transaction/session.
commit;
