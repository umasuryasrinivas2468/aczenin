-- STATUS: VERIFIED 2026-09-29
-- =============================================================================
-- Nova API — Tier 1 payables and controls: vendor bank accounts, vendor
-- payments, approvals, master-data changes and credit notes, plus planted
-- anomalies A2 A3 A4 A7 A12 A20 A21 A22 and their decoys.
-- Contract: docs/nova-tier1-build-contract.md §5 (Payables), §6, §7, §8.
--
-- Run order: 001 → 003 → 004 → 005 → 002 → 006 → 007 (this) → 008.
--
-- Approval model (the baseline the A20 conflicts stand out against):
--   * every grade has an approval limit (pc_grade_limit below);
--   * a document goes to the raiser's manager, then up the manager chain,
--     each level that lacks the authority recording 'escalate', until someone
--     with a big-enough limit approves or rejects it;
--   * a raiser with no manager (the MD) goes to the finance head instead;
--   * threshold_applied is the acting approver's own limit (null = unlimited),
--     so "amount > threshold_applied on an approve row" is the level breach.
--
-- Determinism: all "random" choices come from pg_temp.pc_roll(key), an md5 of
-- a stable text key. It cannot depend on join order or plan shape, which is
-- stronger than setseed() + random() (kept anyway, per contract §2).
--
-- Rerun: truncates only this file's five tables (no CASCADE: 008 must never be
-- emptied by us), deletes only this file's ground-truth rows, and deletes the
-- one vendor + one bill per slice it adds for A2 (by their exact ids) before
-- re-adding them. Rerunning 002/005 empties these tables through their
-- cascades, so rerun 007 → 008 after them.
-- =============================================================================

-- One transaction: DDL, truncate and seed land together or not at all.
begin;

-- Reruns print "already exists, skipping" notices that bury real errors.
set local client_min_messages = warning;

-- -----------------------------------------------------------------------------
-- 1. Tables.
-- -----------------------------------------------------------------------------

-- Every account a vendor has been paid into, one row per validity window.
-- nova_vendors.bank_ifsc/bank_account_last4 is the onboarding snapshot; this
-- table is the history, so a changed account shows up here, not there.
create table if not exists public.nova_vendor_bank_accounts (
  -- Prefixed id, same convention as 001, so an id reveals its type.
  id text primary key check (id like 'vba\_%'),
  -- Inherited from the vendor: a vendor's accounts live in its team's books.
  slice_no integer not null check (slice_no >= 0),
  -- Restrict: an account history must not lose its owner.
  vendor_id text not null references public.nova_vendors(id) on delete restrict,
  -- No format CHECK: A6 (org) plants malformed IFSCs on vendor masters, and
  -- the onboarding row copies the master value as it is.
  ifsc text not null,
  -- Masked like every account number in Nova.
  account_last4 text not null check (account_last4 ~ '^[0-9]{4}$'),
  -- Opaque hash of the full account number (same 16-hex shape as
  -- nova_employees.bank_fingerprint): equal fingerprints = the same account.
  account_fingerprint text not null check (account_fingerprint ~ '^[0-9a-f]{16}$'),
  -- The name the bank holds the account under.
  holder_name text not null,
  -- First day payments may go to it.
  valid_from date not null,
  -- The day the next account took over (exclusive); null = still current.
  valid_to date,
  -- Penny-drop verified before use.
  verified boolean not null,
  -- A window cannot end before it starts.
  constraint nova_vendor_bank_accounts_window check (valid_to is null or valid_to >= valid_from)
);

-- Outgoing payments to vendors: the AP cash-out ledger.
create table if not exists public.nova_vendor_payments (
  id text primary key check (id like 'vpy\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Human-facing number, unique so a lookup by number is unambiguous.
  payment_number text not null unique,
  vendor_id text not null references public.nova_vendors(id) on delete restrict,
  -- Bills this payment settles, as a jsonb list of ids; [] = advance with no
  -- bill yet. A list, not a join table: one payment can clear several bills.
  bill_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(bill_ids) = 'array'),
  -- The account the money was sent to, as it stood on the payment date.
  beneficiary_account_id text not null references public.nova_vendor_bank_accounts(id) on delete restrict,
  -- The company account it left from (005).
  from_account_id text not null references public.nova_bank_accounts(id) on delete restrict,
  -- Strictly positive: a zero payment is not a payment.
  amount numeric(14,2) not null check (amount > 0),
  -- The rails Indian AP actually pays on.
  channel text not null check (channel in ('neft', 'rtgs', 'imps', 'upi', 'cheque')),
  -- Maker: the accounts staff who keyed it.
  initiated_by text not null references public.nova_employees(id) on delete restrict,
  -- Checker: the final approver in nova_approvals for this payment.
  approved_by text not null references public.nova_employees(id) on delete restrict,
  initiated_at timestamptz not null,
  -- failed = never left the bank; reversed = left, then came back.
  status text not null check (status in ('success', 'failed', 'reversed')),
  -- Statement line link. Nullable, no FK: 008 creates the table and fills it.
  bank_transaction_id text,
  -- RBI rule: RTGS is for ₹2 lakh and above, so a smaller RTGS is a seed bug.
  constraint nova_vendor_payments_rtgs_min check (channel <> 'rtgs' or amount >= 200000)
);

-- Every approval action on every controlled document type.
create table if not exists public.nova_approvals (
  id text primary key check (id like 'apr\_%'),
  slice_no integer not null check (slice_no >= 0),
  -- Which kind of document doc_id names.
  doc_type text not null check (doc_type in ('purchase_order', 'purchase_bill', 'vendor_payment', 'expense', 'credit_note', 'vendor_master')),
  -- Polymorphic id, so no FK; the verify loop checks it resolves.
  doc_id text not null,
  -- 1 = first approver; each escalation adds a level.
  level integer not null check (level between 1 and 6),
  action text not null check (action in ('approve', 'reject', 'escalate')),
  actor_id text not null references public.nova_employees(id) on delete restrict,
  acted_at timestamptz not null,
  -- The actor's approval limit that applied; null = unlimited or non-monetary.
  threshold_applied numeric(14,2) check (threshold_applied >= 0),
  -- One action per level per document.
  constraint nova_approvals_doc_level_key unique (doc_type, doc_id, level)
);

-- Change log for vendor, client, employee and vendor-bank-account masters.
create table if not exists public.nova_master_data_changes (
  id text primary key check (id like 'mdc\_%'),
  slice_no integer not null check (slice_no >= 0),
  entity_type text not null check (entity_type in ('vendor', 'client', 'employee', 'vendor_bank_account')),
  -- Polymorphic id of the changed record; checked by the verify loop.
  entity_id text not null,
  -- Column name that changed.
  field text not null,
  -- Text either side, whatever the column type; null = was/became empty.
  old_value text,
  new_value text,
  changed_by text not null references public.nova_employees(id) on delete restrict,
  changed_at timestamptz not null,
  -- Null = nobody signed the change off (the A3 pattern lives here).
  approved_by text references public.nova_employees(id) on delete restrict
);

-- Credit notes against sales invoices.
create table if not exists public.nova_credit_notes (
  id text primary key check (id like 'crn\_%'),
  slice_no integer not null check (slice_no >= 0),
  credit_note_number text not null unique,
  invoice_id text not null references public.nova_invoices(id) on delete restrict,
  -- Denormalised like invoices: the client the note was issued to.
  client_id text not null references public.nova_clients(id) on delete restrict,
  note_date date not null,
  -- Taxable value credited, and the GST reversed on it.
  amount numeric(14,2) not null check (amount > 0),
  gst_amount numeric(14,2) not null check (gst_amount >= 0),
  reason text not null check (reason in ('return', 'discount', 'refund', 'price_difference')),
  approved_by text not null references public.nova_employees(id) on delete restrict
);

-- -----------------------------------------------------------------------------
-- 2. Indexes: (slice_no, main date desc) for every API list, plus FK and
-- lookup columns, which Postgres never indexes on its own.
-- -----------------------------------------------------------------------------
create index if not exists nova_vendor_bank_accounts_slice_idx on public.nova_vendor_bank_accounts (slice_no, valid_from desc);
create index if not exists nova_vendor_bank_accounts_vendor_id_idx on public.nova_vendor_bank_accounts (vendor_id);
-- Shared-account (A4) queries group on the fingerprint within a slice.
create index if not exists nova_vendor_bank_accounts_fingerprint_idx on public.nova_vendor_bank_accounts (slice_no, account_fingerprint);
create index if not exists nova_vendor_payments_slice_idx on public.nova_vendor_payments (slice_no, initiated_at desc);
create index if not exists nova_vendor_payments_vendor_id_idx on public.nova_vendor_payments (vendor_id);
create index if not exists nova_vendor_payments_beneficiary_idx on public.nova_vendor_payments (beneficiary_account_id);
create index if not exists nova_vendor_payments_from_account_idx on public.nova_vendor_payments (from_account_id);
create index if not exists nova_approvals_slice_idx on public.nova_approvals (slice_no, acted_at desc);
create index if not exists nova_approvals_actor_id_idx on public.nova_approvals (actor_id);
-- The unique key already serves (doc_type, doc_id) lookups; doc_id alone needs its own.
create index if not exists nova_approvals_doc_id_idx on public.nova_approvals (doc_id);
create index if not exists nova_master_data_changes_slice_idx on public.nova_master_data_changes (slice_no, changed_at desc);
create index if not exists nova_master_data_changes_entity_idx on public.nova_master_data_changes (entity_id);
create index if not exists nova_credit_notes_slice_idx on public.nova_credit_notes (slice_no, note_date desc);
create index if not exists nova_credit_notes_invoice_id_idx on public.nova_credit_notes (invoice_id);
create index if not exists nova_credit_notes_client_id_idx on public.nova_credit_notes (client_id);

-- -----------------------------------------------------------------------------
-- 3. Read views, one per table (contract §2). Dropped and recreated because a
-- view's column list freezes at creation; views hold no data.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_vendor_bank_accounts_v, public.nova_vendor_payments_v,
  public.nova_approvals_v, public.nova_master_data_changes_v, public.nova_credit_notes_v;

-- security_invoker so a view can never bypass RLS for its caller (see 001).
create view public.nova_vendor_bank_accounts_v with (security_invoker = true) as select * from public.nova_vendor_bank_accounts;
create view public.nova_vendor_payments_v      with (security_invoker = true) as select * from public.nova_vendor_payments;
create view public.nova_approvals_v            with (security_invoker = true) as select * from public.nova_approvals;
create view public.nova_master_data_changes_v  with (security_invoker = true) as select * from public.nova_master_data_changes;
-- Credit notes add their total, so integrators need not compute it.
create view public.nova_credit_notes_v with (security_invoker = true) as
select c.id, c.credit_note_number, c.invoice_id, c.client_id, c.note_date, c.amount, c.gst_amount,
  c.amount + c.gst_amount as total_amount, c.reason, c.approved_by, c.slice_no
from public.nova_credit_notes c;

-- -----------------------------------------------------------------------------
-- 4. Lockdown, same as 001/005 but scoped to this file's ten relations, so it
-- never re-grants something another file deliberately narrowed.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Each of this file's tables and views.
  r record;
begin
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
      and c.relname in ('nova_vendor_bank_accounts', 'nova_vendor_payments', 'nova_approvals', 'nova_master_data_changes', 'nova_credit_notes',
                        'nova_vendor_bank_accounts_v', 'nova_vendor_payments_v', 'nova_approvals_v', 'nova_master_data_changes_v', 'nova_credit_notes_v')
  loop
    -- anon ships in browser bundles; authenticated is any signed-up user.
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
    -- The server's only credential.
    execute format('grant select, insert, update, delete on public.%I to service_role', r.relname);
    -- RLS with no policies = deny-all for every role without BYPASSRLS.
    if r.relkind = 'r' then
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Rerun cleanup: only what this file owns.
-- -----------------------------------------------------------------------------

-- No CASCADE on purpose: if 008 ever adds an FK to these tables, this fails
-- loudly instead of silently emptying banking data we do not own.
truncate table
  public.nova_approvals,
  public.nova_master_data_changes,
  public.nova_credit_notes,
  public.nova_vendor_payments,
  public.nova_vendor_bank_accounts;

-- Our answer-key rows only. A7 is shared with procurement (split POs), so our
-- A7 rows are told apart by the 'pay-' group prefix every row here carries.
delete from public.nova_ground_truth
where anomaly_code in ('A2', 'A3', 'A4', 'A12', 'A20', 'A21', 'A22')
   or (anomaly_code = 'A7' and group_id like 'pay-%');

-- The A2 rows this file adds to tables it does not own: exactly one bill and
-- one vendor per slice, by id. Bill first, because it references the vendor.
delete from public.nova_purchase_bills where id in (select 'bil_' || left(md5('bil-a2-' || s), 8) from generate_series(0, 79) s);
delete from public.nova_vendors where id in (select 'ven_' || left(md5('ven-a2-' || s), 8) from generate_series(0, 79) s);

-- -----------------------------------------------------------------------------
-- 6. Seed helpers.
-- -----------------------------------------------------------------------------

-- Contract §2 asks for a pinned stream; nothing below calls random(), but a
-- future edit that does stays deterministic.
select setseed(0.707);

-- Parallel plans would reorder any random() calls; harmless to pin.
set local max_parallel_workers_per_gather = 0;

-- A [0,1) roll from a text key: first 32 bits of its md5. Same key, same roll,
-- whatever order the planner visits rows in.
create function pg_temp.pc_roll(p_key text) returns float8
language sql immutable as $$ select ('x' || substr(md5(p_key), 1, 8))::bit(32)::bigint / 4294967296.0 $$;

-- A 16-hex opaque account fingerprint, the shape 005 uses for employees.
create function pg_temp.pc_fp(p_key text) returns text
language sql immutable as $$ select left(md5('vendacct' || p_key), 16) $$;

-- The frozen clock (005). Every date below is relative to it.
create temp table pc_asof on commit drop as
select as_of_date as d from public.nova_dataset_meta where id;

-- Delegation-of-authority matrix by grade (₹, document value incl. GST).
-- spend_limit governs POs, bills, expenses and credit notes; pay_limit governs
-- releasing vendor payments (a stricter, separate authority, as in most DoA
-- matrices). G6 spend = ₹1,00,000 is 006's PO limit, so its A7 split POs sit
-- just under it; G7 pay = ₹1,00,000 is the line our A7 split payments dodge.
-- G1–G3 hold no authority; G8 (the MD) is unlimited (null).
create temp table pc_grade_limit on commit drop as
select * from (values
  ('G1', 0::numeric, 0::numeric), ('G2', 0, 0), ('G3', 0, 0), ('G4', 25000, 0),
  ('G5', 50000, 25000), ('G6', 100000, 50000), ('G7', 500000, 100000), ('G8', null, null)
) as g(grade, spend_limit, pay_limit);

-- Employees with their limit and department, the one lookup every step uses.
create temp table pc_emp on commit drop as
select e.id, e.slice_no, e.name, e.grade, e.manager_id, e.department_id, e.join_date, e.exit_date,
  e.bank_fingerprint, g.spend_limit, g.pay_limit, d.name as dept_name
from public.nova_employees e
join public.nova_departments d on d.id = e.department_id
join pc_grade_limit g on g.grade = e.grade;
-- Chain walks look employees up by id thousands of times.
create index on pc_emp (id);

-- Per slice: the finance head (fallback approver) and the MD (top of chain).
create temp table pc_slice on commit drop as
select d.slice_no, d.head_employee_id as fin_head_id,
  (select e.id from pc_emp e where e.slice_no = d.slice_no and e.manager_id is null) as md_id
from public.nova_departments d
where d.name = 'Finance and Accounts';

-- Accounts staff who key payments and maintain vendor masters: finance G1–G4.
-- 005 never churns finance staff, so they are employed on every date.
create temp table pc_clerk on commit drop as
select e.slice_no, e.id, e.manager_id,
  row_number() over (partition by e.slice_no order by e.id) as k,
  count(*) over (partition by e.slice_no) as n
from pc_emp e
where e.dept_name = 'Finance and Accounts' and e.grade in ('G1', 'G2', 'G3', 'G4') and e.exit_date is null;

-- -----------------------------------------------------------------------------
-- 7. A2 ghost vendor: one extra vendor and one bill per slice, in this file's
-- own id space ('ven-a2-'/'bil-a2-' md5 keys, same 8-hex shape as 002's ids).
-- A service vendor with no GSTIN that still charges GST, no PO or GRN, a round
-- amount kept just under the finance head's ₹1,00,000 payment limit, and the
-- same accounts employee creating the vendor, submitting the bill and keying
-- the payment. Its created_at sits months back, not at the end of the table.
-- -----------------------------------------------------------------------------
create temp table pc_ghost on commit drop as
select
  s.slice_no,
  'ven_' || left(md5('ven-a2-' || s.slice_no), 8) as vendor_id,
  'bil_' || left(md5('bil-a2-' || s.slice_no), 8) as bill_id,
  -- Service-firm names; none reuses 002's "<prefix> <industry>" vocabulary.
  (array['Sai Krishna Business Services', 'Vijaya Facility Management', 'Sri Venkateswara Consultancy Services',
         'Anjaneya Manpower Solutions', 'Maruthi Corporate Services', 'Ganesh Advisory Services',
         'Om Shakti Support Services', 'Lakshmi Narasimha Agencies'])[1 + s.slice_no % 8] as name,
  -- The accounts employee behind it, picked per slice.
  c.id as clerk_id,
  -- Vendor onboarded 70–130 days before the as-of date.
  (select d from pc_asof) - 70 - floor(pg_temp.pc_roll('a2-created-' || s.slice_no) * 60)::int as created_on,
  -- Taxable value ₹60,000–80,000 in ₹5,000 steps: round, and with 18% GST
  -- (₹70,800–94,400) still under the ₹1,00,000 payment limit.
  (60000 + 5000 * floor(pg_temp.pc_roll('a2-amount-' || s.slice_no) * 5))::numeric(14,2) as taxable
from generate_series(0, 79) as s(slice_no)
join pc_clerk c on c.slice_no = s.slice_no
  and c.k = 1 + floor(pg_temp.pc_roll('a2-clerk-' || s.slice_no) * c.n)::int;

-- The ghost vendor master. Category/criticality/terms copied from a sibling
-- vendor of the slice, so no column stands out as a null or an odd value.
insert into public.nova_vendors (
  id, name, gst_number, email, phone, address, state, bank_ifsc, bank_account_last4, created_at, slice_no,
  category, criticality, payment_terms_days, early_pay_discount_pct, late_penalty_pct_per_month, pan, state_code, created_by, status
)
select
  g.vendor_id, g.name,
  -- No GSTIN: the tell a GST-aware check finds.
  null,
  -- .example domain, as every seeded address.
  'accounts@' || lower(regexp_replace(split_part(g.name, ' ', 1) || split_part(g.name, ' ', 2), '[^A-Za-z]', '', 'g')) || '.example',
  '+91 9' || substr(translate(md5('a2ph' || g.vendor_id), 'abcdef', '012345'), 1, 9),
  -- A plausible Hyderabad office address.
  (10 + g.slice_no * 7 % 90) || '-' || (1 + g.slice_no % 9) || ', Road No. ' || (1 + g.slice_no % 12) || ', Banjara Hills, Hyderabad, Telangana',
  'Telangana',
  'HDFC0' || substr(translate(md5('a2ifsc' || g.vendor_id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('a2acct' || g.vendor_id), 'abcdef', '012345'), 1, 4),
  (g.created_on + time '12:30') at time zone 'Asia/Kolkata',
  g.slice_no,
  t.category, 'low', 30, 0, 0,
  -- PAN present (individual holder type P), GSTIN absent.
  translate(substr(md5('a2pan' || g.vendor_id), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR') || 'P'
    || upper(left(g.name, 1)) || substr(translate(md5('a2pan' || g.vendor_id), 'abcdef', '012345'), 4, 4) || 'K',
  '36', g.clerk_id, 'active'
from pc_ghost g
-- Sibling template: the slice's vendor with the lowest md5 key.
cross join lateral (
  select v.category from public.nova_vendors v
  where v.slice_no = g.slice_no and v.id <> g.vendor_id
  order by md5('a2tpl' || v.id) limit 1
) t;

-- The ghost bill: fully paid, approved, no po_id/grn_id.
insert into public.nova_purchase_bills (
  id, bill_number, vendor_id, vendor_name, vendor_gst_number, items, amount, gst_amount, cgst_amount, sgst_amount, igst_amount,
  total_amount, paid_amount, status, bill_date, due_date, reverse_charge, itc_eligible, created_at, slice_no,
  po_id, grn_id, submitted_by, approval_status, received_date
)
select
  g.bill_id,
  -- A small firm's own invoice series.
  'SVC/' || to_char(b.bill_date, 'YY') || '/' || lpad((11 + g.slice_no % 60)::text, 3, '0'),
  g.vendor_id, g.name, null,
  -- One service line; SAC 998519 (other support services) in the hsn_code slot.
  jsonb_build_array(jsonb_build_object('description', 'Support services for the month', 'hsn_code', '998519', 'quantity', 1,
    'rate', g.taxable, 'gst_rate', 18, 'amount', g.taxable, 'gst_amount', round(g.taxable * 0.18, 2))),
  g.taxable, round(g.taxable * 0.18, 2),
  -- Intra-state (Telangana): CGST + SGST halves.
  round(g.taxable * 0.09, 2), round(g.taxable * 0.18, 2) - round(g.taxable * 0.09, 2), 0,
  g.taxable + round(g.taxable * 0.18, 2), g.taxable + round(g.taxable * 0.18, 2),
  'paid', b.bill_date, b.bill_date + 30, false, true,
  (b.bill_date + time '12:00') at time zone 'Asia/Kolkata',
  g.slice_no, null, null, g.clerk_id, 'approved', b.bill_date
from pc_ghost g
-- Billed 6–14 days after onboarding.
cross join lateral (select g.created_on + 6 + floor(pg_temp.pc_roll('a2-bill-' || g.slice_no) * 9)::int as bill_date) b;

-- -----------------------------------------------------------------------------
-- 8. Working sets and the baseline payment plan.
-- -----------------------------------------------------------------------------

-- Every vendor (002's plus the ghosts) with what payments and accounts need.
create temp table pc_vendor on commit drop as
select v.id, v.slice_no, v.name, v.created_at::date as created_on, v.created_by, v.status,
  -- Onboarding bank details; generated only if the master has none.
  coalesce(v.bank_ifsc, 'SBIN0' || substr(translate(md5('ifsc' || v.id), 'abcdef', '012345'), 1, 6)) as ifsc,
  coalesce(v.bank_account_last4, substr(translate(md5('acct' || v.id), 'abcdef', '012345'), 1, 4)) as last4,
  v.id like 'ven\_%' and v.id in (select vendor_id from pc_ghost) as is_ghost
from public.nova_vendors v;

-- Bills that have money against them: the only ones a payment can settle.
create temp table pc_bill on commit drop as
select b.id, b.slice_no, b.vendor_id, b.total_amount, b.paid_amount, b.status, b.bill_date, b.due_date,
  coalesce(b.received_date, b.bill_date) as received_date,
  b.id in (select bill_id from pc_ghost) as is_ghost,
  -- Size rank inside the slice: the biggest bills are paid in tranches.
  row_number() over (partition by b.slice_no order by b.total_amount desc, b.id) as size_rank,
  count(*) over (partition by b.slice_no) as paid_bills
from public.nova_purchase_bills b
where b.paid_amount > 0;

-- Instalments per bill. ~207 base payments per slice lands the table near the
-- contract's 225 once retries, reversals and plants are added: the largest
-- (207 - paid bills) bills get two tranches, and three if that is not enough.
create temp table pc_bill_plan on commit drop as
select b.*,
  case when b.is_ghost then 1
       else 1 + (b.size_rank <= 207 - b.paid_bills)::int + (b.size_rank <= 207 - 2 * b.paid_bills)::int
  end as n_inst,
  -- Earliest release: 3 days after receipt, the time AP takes to book it.
  greatest(b.bill_date, b.received_date) + 3 as win_start,
  -- Latest release: the due date, or up to 25 days late for ~30% of bills,
  -- never after the as-of date.
  least(b.due_date + case when pg_temp.pc_roll('late-' || b.id) < 0.3 then 3 + floor(pg_temp.pc_roll('lateby-' || b.id) * 23)::int else 0 end,
        (select d from pc_asof)) as win_end
from pc_bill b;

-- One row per planned payment. kind tags where a row came from, so plants can
-- find their rows; it is never written to the table.
create temp table pc_plan (
  -- Stable key the payment id is derived from.
  key text primary key,
  slice_no int not null,
  vendor_id text not null,
  -- Settled bills (jsonb list); [] for advances.
  bill_ids jsonb not null,
  amount numeric(14,2) not null,
  pay_date date not null,
  initiated_by text not null,
  status text not null,
  -- base | split | dup | advance | retry_fail | reversal
  kind text not null,
  -- Minutes after 10:00 IST the payment was keyed; set per kind.
  minute_of_day int not null
) on commit drop;

-- Baseline tranches. Tranche i lands at fraction (i-1+roll)/n of the payment
-- window, so tranches are in date order; all but the last are a jittered 1/n
-- share rounded to the rupee, and the last takes the exact remainder.
insert into pc_plan (key, slice_no, vendor_id, bill_ids, amount, pay_date, initiated_by, status, kind, minute_of_day)
select
  'base-' || b.id || '-' || i.i,
  b.slice_no, b.vendor_id, jsonb_build_array(b.id),
  case when i.i < b.n_inst then round(b.paid_amount / b.n_inst * (0.85 + 0.3 * pg_temp.pc_roll('share-' || b.id || i.i))::numeric, 0)
       else b.paid_amount - coalesce((select sum(round(b.paid_amount / b.n_inst * (0.85 + 0.3 * pg_temp.pc_roll('share-' || b.id || j))::numeric, 0))
                                      from generate_series(1, b.n_inst - 1) j), 0) end,
  least(b.win_start + floor(greatest(b.win_end - b.win_start, 0) * (i.i - 1 + pg_temp.pc_roll('when-' || b.id || i.i)) / b.n_inst)::int,
        (select d from pc_asof)),
  -- Ghost bill: keyed by its own creator. Others: any accounts employee.
  case when b.is_ghost then (select g.clerk_id from pc_ghost g where g.bill_id = b.id)
       else (select c.id from pc_clerk c where c.slice_no = b.slice_no and c.k = 1 + floor(pg_temp.pc_roll('clerk-' || b.id || i.i) * c.n)::int) end,
  'success', 'base',
  -- Business hours, 10:00–17:00 IST.
  floor(pg_temp.pc_roll('min-' || b.id || i.i) * 420)::int
from pc_bill_plan b
cross join lateral generate_series(1, b.n_inst) as i(i);

-- Batch payments: single-tranche bills of one vendor released in the same
-- 10-day bucket are, half the time, paid together in one transfer. This is
-- why bill_ids is a list. The surviving row takes the latest date.
create temp table pc_merge on commit drop as
select p.slice_no, p.vendor_id, (p.pay_date - date '2000-01-01') / 10 as bucket,
  jsonb_agg(p.bill_ids -> 0 order by p.key) as bill_ids, sum(p.amount) as amount, max(p.pay_date) as pay_date,
  min(p.key) as keep_key, array_agg(p.key) as keys
from pc_plan p
join pc_bill_plan b on b.id = p.bill_ids ->> 0
where b.n_inst = 1 and not b.is_ghost
group by 1, 2, 3
having count(*) >= 2 and pg_temp.pc_roll('merge-' || p.vendor_id || ((p.pay_date - date '2000-01-01') / 10)) < 0.5;
-- Fold each group into its first row, then drop the rest.
update pc_plan p set bill_ids = m.bill_ids, amount = m.amount, pay_date = m.pay_date
from pc_merge m where p.key = m.keep_key;
delete from pc_plan p using pc_merge m where p.key = any (m.keys) and p.key <> m.keep_key;

-- -----------------------------------------------------------------------------
-- 9. Plant roles and payment-level plants. Vendors are ranked per slice by an
-- md5 key, so each slice plants on different vendors at different positions
-- (contract §2: no telling ids, no top-of-order placement). Only active,
-- non-ghost vendors with at least 4 base payments qualify, so every planted
-- pattern has history around it.
-- -----------------------------------------------------------------------------
create temp table pc_vrole on commit drop as
select v.id as vendor_id, v.slice_no,
  row_number() over (partition by v.slice_no order by md5('role-' || v.id)) as r
from pc_vendor v
where not v.is_ghost and coalesce(v.status, 'active') = 'active'
  and (select count(*) from pc_plan p where p.vendor_id = v.id) >= 4;
-- Role by rank: 1-2 A3, 3 A4 (sharer) + 4 (owner), 5 A4 vendor-employee,
-- 6 A4 decoy (+7 its look-alike), 8 A21, 9-11 ordinary bank changes (9 is the
-- A3 decoy), 12+ free for A7, A12 and the advance decoy.

-- A7 split payments: the free vendor bill that best fits 3-4 tranches just
-- under the finance head's ₹1,00,000 payment limit (₹2.85L or ₹3.8L ideal).
create temp table pc_a7 on commit drop as
select distinct on (b.slice_no) b.slice_no, b.id as bill_id, b.vendor_id, b.paid_amount,
  -- Enough tranches that each, with ±1.5% jitter, stays below ₹99,500.
  greatest(3, ceil(b.paid_amount * 1.015 / 99500))::int as n,
  (select min(p.pay_date) from pc_plan p where p.bill_ids ? b.id) as t0,
  (select c.id from pc_clerk c where c.slice_no = b.slice_no and c.k = 1 + floor(pg_temp.pc_roll('a7clerk-' || b.slice_no) * c.n)::int) as clerk_id
from pc_bill_plan b
join pc_vrole r on r.vendor_id = b.vendor_id and r.r >= 12
where b.status = 'paid' and b.paid_amount >= 200000
  and not exists (select 1 from pc_plan p where p.bill_ids ? b.id and jsonb_array_length(p.bill_ids) > 1)
order by b.slice_no, least(abs(b.paid_amount - 285000), abs(b.paid_amount - 380000)), b.id;
-- Replace that bill's tranches with the split cluster.
delete from pc_plan p using pc_a7 a where p.bill_ids ? a.bill_id;
-- n near-equal tranches inside 48 hours (half-day steps), one maker.
insert into pc_plan (key, slice_no, vendor_id, bill_ids, amount, pay_date, initiated_by, status, kind, minute_of_day)
select 'split-' || a.bill_id || '-' || j, a.slice_no, a.vendor_id, jsonb_build_array(a.bill_id),
  case when j < a.n then round(a.paid_amount / a.n * (0.985 + 0.03 * pg_temp.pc_roll('a7share-' || a.bill_id || j))::numeric, 0)
       else a.paid_amount - (select sum(round(a.paid_amount / a.n * (0.985 + 0.03 * pg_temp.pc_roll('a7share-' || a.bill_id || k))::numeric, 0)) from generate_series(1, a.n - 1) k) end,
  least(a.t0 + (j - 1) / 2, (select d from pc_asof)),
  a.clerk_id, 'success', 'split',
  -- Morning and afternoon slots alternate, so the cluster spans < 48 hours.
  case when j % 2 = 1 then 30 else 300 end + floor(pg_temp.pc_roll('a7min-' || a.bill_id || j) * 60)::int
from pc_a7 a
cross join lateral generate_series(1, a.n) as j;

-- A12 double payment: two single-tranche fully paid bills on two further free
-- vendors. Variant 1 pays again 2-6 days later by another employee; variant 2
-- is a retry where both attempts went through, minutes apart.
create temp table pc_a12 on commit drop as
select y.slice_no, y.key, y.vendor_id, y.variant
from (
  -- Number the one-per-vendor candidates per slice; the first two are used.
  select x.*, row_number() over (partition by x.slice_no order by md5('a12-' || x.key)) as variant
  from (
    -- One candidate tranche per vendor, so the two duplicates hit two vendors.
    select p.slice_no, p.key, p.vendor_id,
      row_number() over (partition by p.vendor_id order by md5('a12v-' || p.key)) as per_vendor
    from pc_plan p
    join pc_vrole r on r.vendor_id = p.vendor_id and r.r >= 12
    join pc_bill_plan b on b.id = p.bill_ids ->> 0
    where p.kind = 'base' and jsonb_array_length(p.bill_ids) = 1 and b.n_inst = 1 and b.status = 'paid'
      and p.vendor_id not in (select vendor_id from pc_a7)
      -- Room for the late duplicate before the as-of date.
      and p.pay_date <= (select d from pc_asof) - 7
  ) x
  where x.per_vendor = 1
) y
where y.variant <= 2;
-- The duplicate rows. The first vendor pick per slice is variant 1.
insert into pc_plan (key, slice_no, vendor_id, bill_ids, amount, pay_date, initiated_by, status, kind, minute_of_day)
select 'dup-' || p.key, p.slice_no, p.vendor_id, p.bill_ids, p.amount,
  case when a.variant = 1 then p.pay_date + 2 + floor(pg_temp.pc_roll('a12d-' || p.key) * 5)::int else p.pay_date end,
  case when a.variant = 1
       then (select c.id from pc_clerk c where c.slice_no = p.slice_no and c.id <> p.initiated_by order by md5('a12c-' || c.id) limit 1)
       else p.initiated_by end,
  'success', 'dup',
  case when a.variant = 1 then floor(pg_temp.pc_roll('a12m-' || p.key) * 420)::int
       else least(p.minute_of_day + 15 + floor(pg_temp.pc_roll('a12m-' || p.key) * 36)::int, 470) end
from pc_a12 a join pc_plan p on p.key = a.key;

-- Failed attempts and reversals on ordinary tranches (~3% and ~1.5%): the
-- failed one is retried next day, the reversed one re-paid 3 days later. Same
-- amount, same payee, so they are the decoys a naive duplicate check trips on.
insert into pc_plan (key, slice_no, vendor_id, bill_ids, amount, pay_date, initiated_by, status, kind, minute_of_day)
select case when x.roll < 0.03 then 'fail-' else 'rev-' end || p.key, p.slice_no, p.vendor_id, p.bill_ids, p.amount,
  p.pay_date - case when x.roll < 0.03 then 1 else 3 end,
  p.initiated_by,
  case when x.roll < 0.03 then 'failed' else 'reversed' end,
  case when x.roll < 0.03 then 'retry_fail' else 'reversal' end,
  p.minute_of_day
from pc_plan p
cross join lateral (select pg_temp.pc_roll('fail-' || p.key) as roll) x
where p.kind = 'base' and x.roll < 0.045
  and p.vendor_id not in (select vendor_id from pc_vrole where r <= 8);

-- -----------------------------------------------------------------------------
-- 10. A21 circular flow and the advance decoy. Ring: the company pays vendor
-- V (rank 8) "advances" with no bill; V's account is held in client C's name;
-- 2-4 days later C pays the company the same amount against its invoices. The
-- cash goes out and comes back as revenue. C is the client with 3+ receipts
-- after V was onboarded, picked by md5; its 3 latest receipts drive the ring.
-- -----------------------------------------------------------------------------
create temp table pc_a21 on commit drop as
select distinct on (r.slice_no) r.slice_no, r.vendor_id, c.id as client_id, c.name as client_name
from pc_vrole r
join pc_vendor v on v.id = r.vendor_id
join public.nova_clients c on c.slice_no = r.slice_no
where r.r = 8
  and (select count(*) from public.nova_payments p where p.client_id = c.id and p.payment_date >= v.created_on + 40) >= 3
order by r.slice_no, md5('a21-' || c.id);
-- The three receipts the ring mirrors.
create temp table pc_a21_receipt on commit drop as
select a.slice_no, a.vendor_id, p.id as payment_id, p.amount, p.payment_date
from pc_a21 a
join pc_vendor v on v.id = a.vendor_id
cross join lateral (
  select p.* from public.nova_payments p
  where p.client_id = a.client_id and p.payment_date >= v.created_on + 40
  order by p.payment_date desc, p.id limit 3
) p;
-- One advance per receipt, same amount, 2-4 days before it.
insert into pc_plan (key, slice_no, vendor_id, bill_ids, amount, pay_date, initiated_by, status, kind, minute_of_day)
select 'adv-' || r.payment_id, r.slice_no, r.vendor_id, '[]'::jsonb, r.amount,
  r.payment_date - 2 - floor(pg_temp.pc_roll('a21d-' || r.payment_id) * 3)::int,
  (select c.id from pc_clerk c where c.slice_no = r.slice_no and c.k = 1 + floor(pg_temp.pc_roll('a21c-' || r.payment_id) * c.n)::int),
  'success', 'advance', floor(pg_temp.pc_roll('a21m-' || r.payment_id) * 420)::int
from pc_a21_receipt r;

-- Decoy: a genuine 30% advance against an open PO of a free vendor, 2 days
-- after the order. Same "payment with no bill" shape, legitimate reason.
create temp table pc_adv_decoy on commit drop as
select distinct on (po.slice_no) po.slice_no, po.id as po_id, po.vendor_id,
  greatest(round(po.total_amount * 0.3, -3), 1000) as amount, po.order_date + 2 as pay_date
from public.nova_purchase_orders po
join pc_vrole r on r.vendor_id = po.vendor_id and r.r >= 12
where po.status in ('open', 'partially_received') and po.order_date + 2 <= (select d from pc_asof)
  and po.vendor_id not in (select vendor_id from pc_a7) and po.vendor_id not in (select vendor_id from pc_a12)
order by po.slice_no, md5('advdecoy-' || po.id);
insert into pc_plan (key, slice_no, vendor_id, bill_ids, amount, pay_date, initiated_by, status, kind, minute_of_day)
select 'podv-' || d.po_id, d.slice_no, d.vendor_id, '[]'::jsonb, d.amount, d.pay_date,
  (select c.id from pc_clerk c where c.slice_no = d.slice_no and c.k = 1 + floor(pg_temp.pc_roll('podc-' || d.po_id) * c.n)::int),
  'success', 'advance', floor(pg_temp.pc_roll('podm-' || d.po_id) * 420)::int
from pc_adv_decoy d;

-- -----------------------------------------------------------------------------
-- 11. Bank-account history. One onboarding row per vendor, then every change.
-- -----------------------------------------------------------------------------

-- A vendor's k-th most recent payment date (k counted from the end); change
-- dates are placed relative to real payments so each change has payments on
-- both sides of it.
create temp table pc_vpay_rank on commit drop as
select p.vendor_id, p.key, p.pay_date, p.initiated_by,
  row_number() over (partition by p.vendor_id order by p.pay_date desc, p.key) as from_end,
  row_number() over (partition by p.vendor_id order by p.pay_date, p.key) as from_start,
  count(*) over (partition by p.vendor_id) as n
from pc_plan p where p.kind in ('base', 'advance');

-- Every change as (vendor, date, new account). kind drives ground truth.
create temp table pc_change (
  vendor_id text not null, slice_no int not null, kind text not null, change_on date not null,
  ifsc text not null, last4 text not null, fp text not null, holder text not null, verified boolean not null,
  changed_by text not null, approved_by text, target_key text
) on commit drop;

-- A3: the account moves to a new, unverified one 1-4 days before a mid-history
-- payment, by the employee who then keys that payment, with no approver...
insert into pc_change
select t.vendor_id, t.slice_no, 'a3_temp', t.pay_date - 1 - floor(pg_temp.pc_roll('a3t1-' || t.vendor_id) * 4)::int,
  (array['ICIC', 'UTIB', 'KKBK', 'YESB'])[1 + floor(pg_temp.pc_roll('a3b-' || t.vendor_id) * 4)::int] || '0' || substr(translate(md5('a3ifsc' || t.vendor_id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('a3acct' || t.vendor_id), 'abcdef', '012345'), 1, 4),
  pg_temp.pc_fp('a3-' || t.vendor_id), v.name, false, t.initiated_by, null, t.key
from (
  select q.*, r.slice_no from pc_vpay_rank q join pc_vrole r on r.vendor_id = q.vendor_id and r.r in (1, 2)
  join pc_plan p on p.key = q.key and p.kind = 'base'
  where q.from_start = greatest(2, q.n / 2) and q.pay_date <= (select d from pc_asof) - 6
) t join pc_vendor v on v.id = t.vendor_id;
-- ...and moves back to the original account 2-5 days after that payment.
insert into pc_change
select c.vendor_id, c.slice_no, 'a3_revert', p.pay_date + 2 + floor(pg_temp.pc_roll('a3t2-' || c.vendor_id) * 4)::int,
  v.ifsc, v.last4, pg_temp.pc_fp(v.id || '-0'), v.name, true, c.changed_by, null, c.target_key
from pc_change c join pc_plan p on p.key = c.target_key join pc_vendor v on v.id = c.vendor_id
where c.kind = 'a3_temp';

-- Changes that stick, dated 3 days before the vendor's 3rd-last payment so at
-- least three payments land on the new account. Keyed by an accounts
-- employee and approved by the finance head (their manager), as normal.
create temp table pc_change_base on commit drop as
select r.vendor_id, r.slice_no, r.r, q.pay_date - 3 as change_on, v.name, v.created_by,
  (select c.id from pc_clerk c where c.slice_no = r.slice_no and c.k = 1 + floor(pg_temp.pc_roll('chg-' || r.vendor_id) * c.n)::int) as clerk_id,
  s.fin_head_id
from pc_vrole r
join pc_vendor v on v.id = r.vendor_id
join pc_slice s on s.slice_no = r.slice_no
join pc_vpay_rank q on q.vendor_id = r.vendor_id and q.from_end = least(3, q.n)
where r.r in (3, 5, 6, 8);

-- A4 cluster 1: rank 3 switches to rank 4's own account (same fingerprint,
-- IFSC and last4, held in rank 4's name). Two vendors, one account.
insert into pc_change
select b.vendor_id, b.slice_no, 'a4_vendor', b.change_on, o.ifsc, o.last4, pg_temp.pc_fp(o.id || '-0'), o.name, true, b.clerk_id, b.fin_head_id, o.id
from pc_change_base b
join pc_vrole ro on ro.slice_no = b.slice_no and ro.r = 4
join pc_vendor o on o.id = ro.vendor_id
where b.r = 3;
-- A4 cluster 2: rank 5 switches to an employee's salary account (the
-- employee who created the vendor, when known): fingerprint = bank_fingerprint.
insert into pc_change
select b.vendor_id, b.slice_no, 'a4_employee', b.change_on,
  'SBIN0' || substr(translate(md5('a4eifsc' || e.id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('a4eacct' || e.id), 'abcdef', '012345'), 1, 4),
  e.bank_fingerprint, e.name, false, b.clerk_id, b.fin_head_id, e.id
from pc_change_base b
cross join lateral (
  select x.* from pc_emp x where x.slice_no = b.slice_no
  order by (x.id = b.created_by) desc, md5('a4e-' || x.id) limit 1
) e
where b.r = 5;
-- A4 decoy: rank 6 moves to a new account whose IFSC and last4 equal rank 7's
-- current ones, but a different full number (fingerprint). Naive last4
-- matching flags it; the fingerprint clears it.
insert into pc_change
select b.vendor_id, b.slice_no, 'a4_decoy', b.change_on, o.ifsc, o.last4, pg_temp.pc_fp('a4d-' || b.vendor_id), b.name, true, b.clerk_id, b.fin_head_id, o.id
from pc_change_base b
join pc_vrole ro on ro.slice_no = b.slice_no and ro.r = 7
join pc_vendor o on o.id = ro.vendor_id
where b.r = 6;
-- A21: rank 8 moves to an account held in client C's name, a week before the
-- first advance, unverified but signed off.
insert into pc_change
select a.vendor_id, a.slice_no, 'a21',
  (select min(p.pay_date) from pc_plan p where p.vendor_id = a.vendor_id and p.kind = 'advance') - 7,
  'HDFC0' || substr(translate(md5('a21ifsc' || a.client_id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('a21acct' || a.client_id), 'abcdef', '012345'), 1, 4),
  pg_temp.pc_fp('a21-' || a.client_id), a.client_name, false,
  (select c.id from pc_clerk c where c.slice_no = a.slice_no and c.k = 1 + floor(pg_temp.pc_roll('chg-' || a.vendor_id) * c.n)::int),
  s.fin_head_id, a.client_id
from pc_a21 a join pc_slice s on s.slice_no = a.slice_no;
-- Ordinary changes on ranks 9-11, verified and approved. Rank 9 is the A3
-- decoy: changed 3 days before a mid-history payment, but approved, verified
-- and never reverted. Ranks 10-11 change on a random day of their history.
insert into pc_change
select r.vendor_id, r.slice_no, case when r.r = 9 then 'a3_decoy' else 'legit' end,
  case when r.r = 9 then q.pay_date - 3
       else v.created_on + 60 + floor(pg_temp.pc_roll('legit-' || v.id) * greatest((select d from pc_asof) - v.created_on - 90, 1))::int end,
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])[1 + floor(pg_temp.pc_roll('lgb-' || v.id) * 5)::int] || '0' || substr(translate(md5('lgifsc' || v.id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('lgacct' || v.id), 'abcdef', '012345'), 1, 4),
  pg_temp.pc_fp('legit-' || v.id), v.name, true,
  (select c.id from pc_clerk c where c.slice_no = r.slice_no and c.k = 1 + floor(pg_temp.pc_roll('chg-' || r.vendor_id) * c.n)::int),
  s.fin_head_id, q.key
from pc_vrole r
join pc_vendor v on v.id = r.vendor_id
join pc_slice s on s.slice_no = r.slice_no
join pc_vpay_rank q on q.vendor_id = r.vendor_id and q.from_start = greatest(2, q.n / 2)
where r.r in (9, 10, 11);

-- The history: onboarding row (seq 0) plus one row per change; each row is
-- valid until the next one starts. Ghost and not-yet-verified vendors open
-- on an unverified account.
create temp table pc_vba on commit drop as
select h.*, lead(h.valid_from) over (partition by h.vendor_id order by h.valid_from, h.seq) as valid_to
from (
  select v.id as vendor_id, v.slice_no, 0 as seq, 'onboard' as kind, v.ifsc, v.last4, pg_temp.pc_fp(v.id || '-0') as fp,
    v.name as holder, v.created_on as valid_from, not v.is_ghost and coalesce(v.status, 'active') <> 'pending_verification' as verified
  from pc_vendor v
  union all
  select c.vendor_id, c.slice_no, row_number() over (partition by c.vendor_id order by c.change_on, c.kind)::int, c.kind,
    c.ifsc, c.last4, c.fp, c.holder, c.change_on, c.verified
  from pc_change c
) h;
-- Stable ids from vendor + position in its history.
alter table pc_vba add column id text;
update pc_vba set id = 'vba_' || left(md5('vba-' || vendor_id || '-' || seq), 12);

-- Each payment goes to the account valid on its date (the onboarding one if
-- a payment somehow predates onboarding).
alter table pc_plan add column beneficiary_id text;
update pc_plan p set beneficiary_id = coalesce(
  (select a.id from pc_vba a where a.vendor_id = p.vendor_id and a.valid_from <= p.pay_date and (a.valid_to is null or a.valid_to > p.pay_date) order by a.valid_from desc, a.seq desc limit 1),
  (select a.id from pc_vba a where a.vendor_id = p.vendor_id and a.seq = 0));

-- -----------------------------------------------------------------------------
-- 12. Payment rows, final shape (approved_by comes from the approval chain).
-- -----------------------------------------------------------------------------
create temp table pc_pay on commit drop as
select p.*,
  'vpy_' || left(md5('vpy-' || p.key), 12) as id,
  ((p.pay_date + time '10:00' + make_interval(mins => p.minute_of_day)) at time zone 'Asia/Kolkata') as initiated_at,
  -- Rail by size, the way AP picks it: RTGS from ₹2 lakh, else mostly NEFT.
  -- Rolled on the ORIGINAL tranche's key, so a retry uses the same rail.
  case when p.amount >= 200000 then case when x.roll < 0.85 then 'rtgs' else 'neft' end
       when x.roll < 0.60 then 'neft'
       when x.roll < 0.85 then 'imps'
       when x.roll < 0.93 and p.amount <= 100000 then 'upi'
       when x.roll < 0.93 then 'neft'
       else 'cheque' end as channel,
  -- Paid from the vendor account; ~10% from the OD line when cash is tight.
  (select b.id from public.nova_bank_accounts b where b.slice_no = p.slice_no
   order by (b.purpose = case when pg_temp.pc_roll('from-' || p.key) < 0.9 then 'vendor' else 'od' end) desc, b.purpose = 'vendor' desc, b.id limit 1) as from_account_id
from pc_plan p
cross join lateral (select pg_temp.pc_roll('rail-' || regexp_replace(p.key, '^(fail|rev|dup)-', '')) as roll) x;

-- -----------------------------------------------------------------------------
-- 13. Credit-note plan: 20 per slice = 6 (A22) + 5 (decoy) + 9 ordinary.
-- -----------------------------------------------------------------------------

-- Invoices old enough to have a credit note, with who owns the customer.
create temp table pc_inv on commit drop as
select i.id, i.slice_no, i.client_id, i.amount, i.gst_amount, i.invoice_date,
  coalesce(c.account_owner_id, i.sales_rep_id) as owner_id
from public.nova_invoices i
join public.nova_clients c on c.id = i.client_id
where i.invoice_date <= (select d from pc_asof) - 10 and i.amount > 0
  and coalesce(c.account_owner_id, i.sales_rep_id) is not null;

-- A22: a client (not the A21 one) with 6+ such invoices. Decoy: a second
-- client with 5+. Both picked by md5 per slice.
create temp table pc_crn_client on commit drop as
select x.slice_no, x.client_id, x.pick
from (
  select i.slice_no, i.client_id, row_number() over (partition by i.slice_no order by md5('a22-' || i.client_id)) as pick
  from pc_inv i
  where i.client_id not in (select client_id from pc_a21)
  group by i.slice_no, i.client_id having count(*) >= 6
) x where x.pick <= 2;

-- The notes. kind: a22 (5 refunds + 1 discount, all to the refund client),
-- a22_decoy (5 returns: a defective batch sent back), base (9 others).
create temp table pc_crn on commit drop as
select i.*, k.kind, k.n,
  case when k.kind = 'a22' then case when k.n <= 5 then 'refund' else 'discount' end
       when k.kind = 'a22_decoy' then 'return'
       when pg_temp.pc_roll('crr-' || i.id) < 0.35 then 'return'
       when pg_temp.pc_roll('crr-' || i.id) < 0.65 then 'discount'
       when pg_temp.pc_roll('crr-' || i.id) < 0.85 then 'price_difference'
       else 'refund' end as reason
from (
  -- A22 and decoy: that client's invoices, md5 order, first 6 / 5.
  select i.id, c.pick, row_number() over (partition by i.client_id order by md5('crn-' || i.id)) as n
  from pc_inv i join pc_crn_client c on c.client_id = i.client_id
  union all
  -- Ordinary: 9 invoices of any other client.
  select y.id, 0, y.n from (
    select i.id, row_number() over (partition by i.slice_no order by md5('crn-' || i.id)) as n
    from pc_inv i where i.client_id not in (select client_id from pc_crn_client)
  ) y where y.n <= 9
) s
join pc_inv i on i.id = s.id
cross join lateral (select case s.pick when 1 then 'a22' when 2 then 'a22_decoy' else 'base' end as kind, s.n) k
where (s.pick = 1 and s.n <= 6) or (s.pick = 2 and s.n <= 5) or s.pick = 0;

-- Amounts and dates. Share of the invoice's taxable value by reason; GST at
-- the invoice's own effective rate; dated 10-40 days after the invoice.
alter table pc_crn add column credit_amount numeric(14,2), add column credit_gst numeric(14,2), add column note_date date, add column crn_id text;
update pc_crn c set
  -- c.amount is the INVOICE's taxable value; the note credits a share of it.
  credit_amount = greatest(round(c.amount * (case c.reason
    when 'return' then 0.04 + 0.12 * pg_temp.pc_roll('cra-' || c.id)
    when 'discount' then 0.02 + 0.06 * pg_temp.pc_roll('cra-' || c.id)
    when 'price_difference' then 0.01 + 0.04 * pg_temp.pc_roll('cra-' || c.id)
    else 0.08 + 0.10 * pg_temp.pc_roll('cra-' || c.id) end)::numeric, 2), 1),
  -- GST reversed at the invoice's own effective rate.
  credit_gst = round(c.amount * (case c.reason
    when 'return' then 0.04 + 0.12 * pg_temp.pc_roll('cra-' || c.id)
    when 'discount' then 0.02 + 0.06 * pg_temp.pc_roll('cra-' || c.id)
    when 'price_difference' then 0.01 + 0.04 * pg_temp.pc_roll('cra-' || c.id)
    else 0.08 + 0.10 * pg_temp.pc_roll('cra-' || c.id) end)::numeric, 2) * c.gst_amount / c.amount,
  note_date = least(c.invoice_date + 10 + floor(pg_temp.pc_roll('crd-' || c.id) * 31)::int, (select d from pc_asof)),
  crn_id = 'crn_' || left(md5('crn-' || c.id), 12);
-- Round the GST to the paisa once, after the share is fixed.
update pc_crn set credit_gst = round(credit_gst, 2);

-- -----------------------------------------------------------------------------
-- 14. Approval routing. One row per controlled document, then a walk up the
-- raiser's manager chain until someone's limit covers the amount.
-- -----------------------------------------------------------------------------
create temp table pc_doc (
  slice_no int not null, doc_type text not null, doc_id text not null, raiser_id text not null,
  -- Value the limit is compared with (incl. GST).
  amount numeric(14,2) not null,
  -- When level 1 acted; later levels follow it.
  base_ts timestamptz not null,
  -- approve | reject | pending (pending = the final level has not acted yet).
  outcome text not null,
  -- 'spend' or 'pay': which column of the grade matrix applies.
  lim text not null,
  primary key (doc_type, doc_id)
) on commit drop;

-- Purchase orders: approved the working day before issue. Half the cancelled
-- ones were rejected; the rest were approved, then cancelled.
insert into pc_doc
select po.slice_no, 'purchase_order', po.id, po.raised_by, po.total_amount,
  ((po.order_date - 1 + time '10:30') at time zone 'Asia/Kolkata'),
  case when po.status = 'cancelled' and pg_temp.pc_roll('porej-' || po.id) < 0.5 then 'reject' else 'approve' end, 'spend'
from public.nova_purchase_orders po;
-- Purchase bills: the day after receipt, outcome as 002 recorded it.
insert into pc_doc
select b.slice_no, 'purchase_bill', b.id, b.submitted_by, b.total_amount,
  ((coalesce(b.received_date, b.bill_date) + 1 + time '11:00') at time zone 'Asia/Kolkata'),
  case b.approval_status when 'rejected' then 'reject' when 'pending' then 'pending' else 'approve' end, 'spend'
from public.nova_purchase_bills b where b.submitted_by is not null;
-- Vendor payments: minutes after keying. Failed and reversed ones were
-- approved too; the failure happened at the bank.
insert into pc_doc
select p.slice_no, 'vendor_payment', p.id, p.initiated_by, p.amount, p.initiated_at + interval '20 minutes', 'approve', 'pay'
from pc_pay p;
-- Expenses from ₹5,000 (petty spend below it is pre-approved by policy),
-- claimed the day after they were incurred.
insert into pc_doc
select x.slice_no, 'expense', x.id, x.employee_id, x.total_amount,
  ((x.expense_date + 1 + time '12:00') at time zone 'Asia/Kolkata'), 'approve', 'spend'
from public.nova_expenses x where x.employee_id is not null and x.total_amount >= 5000;
-- Credit notes: raised by the account owner, approved on the note date.
insert into pc_doc
select c.slice_no, 'credit_note', c.crn_id, c.owner_id, c.credit_amount + c.credit_gst,
  ((c.note_date + time '09:30') at time zone 'Asia/Kolkata'), 'approve', 'spend'
from pc_crn c;

-- The walk. depth 1 is the raiser's manager; it climbs while the current
-- actor is not an eligible approver with enough authority. An actor who had
-- left, or not yet joined, on the document date is walked past.
create temp table pc_walk on commit drop as
with recursive walk as (
  select d.doc_type, d.doc_id, 1 as depth, m.id as actor_id, m.manager_id as next_id,
    x.eligible, x.lim_value, x.eligible and (x.lim_value is null or x.lim_value >= d.amount) as done
  from pc_doc d
  join pc_emp r on r.id = d.raiser_id
  join pc_emp m on m.id = r.manager_id
  cross join lateral (select
    m.join_date <= d.base_ts::date and (m.exit_date is null or m.exit_date > d.base_ts::date) as eligible,
    case d.lim when 'pay' then m.pay_limit else m.spend_limit end as lim_value) x
  union all
  select w.doc_type, w.doc_id, w.depth + 1, m.id, m.manager_id, x.eligible, x.lim_value,
    x.eligible and (x.lim_value is null or x.lim_value >= d.amount)
  from walk w
  join pc_doc d on d.doc_type = w.doc_type and d.doc_id = w.doc_id
  join pc_emp m on m.id = w.next_id
  cross join lateral (select
    m.join_date <= d.base_ts::date and (m.exit_date is null or m.exit_date > d.base_ts::date) as eligible,
    case d.lim when 'pay' then m.pay_limit else m.spend_limit end as lim_value) x
  where not w.done
)
select * from walk where eligible;

-- Documents whose chain never reached enough authority (the MD raised it, or
-- the raiser has no manager) go to the finance head; if the finance head
-- raised it, to the MD.
insert into pc_walk (doc_type, doc_id, depth, actor_id, next_id, eligible, lim_value, done)
select d.doc_type, d.doc_id, 99, f.id, null, true, case d.lim when 'pay' then f.pay_limit else f.spend_limit end, true
from pc_doc d
join pc_slice s on s.slice_no = d.slice_no
join pc_emp f on f.id = case when d.raiser_id = s.fin_head_id then s.md_id else s.fin_head_id end
where not exists (select 1 from pc_walk w where w.doc_type = d.doc_type and w.doc_id = d.doc_id and w.done);

-- Levels and actions: every level before the deciding one escalates.
create temp table pc_chain on commit drop as
select d.slice_no, d.doc_type, d.doc_id, d.amount, d.outcome, d.base_ts,
  row_number() over (partition by w.doc_type, w.doc_id order by w.depth)::int as level,
  w.actor_id, w.lim_value as threshold, w.done
from pc_walk w join pc_doc d on d.doc_type = w.doc_type and d.doc_id = w.doc_id;

-- -----------------------------------------------------------------------------
-- 15. A20 segregation-of-duties conflicts (6 per slice) and the A22 refund
-- approvals, applied as edits to the routed chains. pc_a20 records each one.
-- -----------------------------------------------------------------------------
create temp table pc_a20 (slice_no int, doc_type text, doc_id text, variant text) on commit drop;

-- Payments on free vendors only, so an A20 payment never overlaps A7/A12.
create temp table pc_free_pay on commit drop as
select p.* from pc_pay p
join pc_vrole r on r.vendor_id = p.vendor_id and r.r >= 12
where p.kind = 'base' and p.status = 'success'
  and p.vendor_id not in (select vendor_id from pc_a7) and p.vendor_id not in (select vendor_id from pc_a12);

-- (a) 2 POs approved by the buyer who raised them; senior raisers first, the
-- ones who could plausibly get away with it.
insert into pc_a20
select x.slice_no, 'purchase_order', x.doc_id, 'self_approval' from (
  select d.slice_no, d.doc_id, row_number() over (partition by d.slice_no order by e.grade desc, md5('a20a-' || d.doc_id)) as n
  from pc_doc d join pc_emp e on e.id = d.raiser_id
  where d.doc_type = 'purchase_order' and d.outcome = 'approve'
) x where x.n <= 2;
-- (b) 2 escalated POs/expenses approved at level 1 anyway, by an approver
-- whose limit is below the amount (no escalation to the MD).
insert into pc_a20
select x.slice_no, x.doc_type, x.doc_id, 'below_limit' from (
  select c.slice_no, c.doc_type, c.doc_id, row_number() over (partition by c.slice_no order by md5('a20b-' || c.doc_id)) as n
  from pc_chain c
  where c.doc_type in ('purchase_order', 'expense') and c.level = 2 and c.done and c.outcome = 'approve'
    and c.doc_id not in (select doc_id from pc_a20)
) x where x.n <= 2;
-- (c) 1 small payment approved by the employee who keyed it.
insert into pc_a20
select distinct on (p.slice_no) p.slice_no, 'vendor_payment', p.id, 'maker_checker'
-- Prefer the ₹25,000-or-less payments (they tie at 25000, so md5 still picks
-- among them as before); with the real 002 books 21 slices had none on a free
-- vendor, so fall back to the smallest one instead of planting nothing.
from pc_free_pay p
order by p.slice_no, greatest(p.amount, 25000), md5('a20c-' || p.id);
-- (d) 1 payment approved by the employee who created the vendor master,
-- preferring one within that employee's payment limit.
insert into pc_a20
select distinct on (p.slice_no) p.slice_no, 'vendor_payment', p.id, 'vendor_creator'
from pc_free_pay p
join pc_vendor v on v.id = p.vendor_id
join pc_emp e on e.id = v.created_by
where e.id <> p.initiated_by and p.id not in (select doc_id from pc_a20)
order by p.slice_no, (coalesce(e.pay_limit, 1e12) >= p.amount) desc, md5('a20d-' || p.id);

-- Apply: (b) keeps only level 1 and makes it the deciding level.
delete from pc_chain c using pc_a20 a where a.variant = 'below_limit' and c.doc_type = a.doc_type and c.doc_id = a.doc_id and c.level > 1;
update pc_chain c set done = true from pc_a20 a where a.variant = 'below_limit' and c.doc_type = a.doc_type and c.doc_id = a.doc_id;
-- (a) (c) (d) and A22: the whole chain becomes one approval by the named person.
create temp table pc_override on commit drop as
select a.doc_type, a.doc_id,
  case a.variant when 'self_approval' then d.raiser_id when 'maker_checker' then d.raiser_id else v.created_by end as actor_id
from pc_a20 a
join pc_doc d on d.doc_type = a.doc_type and d.doc_id = a.doc_id
left join pc_pay p on p.id = a.doc_id
left join pc_vendor v on v.id = p.vendor_id
where a.variant <> 'below_limit'
union all
-- A22: every refund-cluster note approved by the client's own account owner.
select 'credit_note', c.crn_id, c.owner_id from pc_crn c where c.kind = 'a22';
delete from pc_chain c using pc_override o where c.doc_type = o.doc_type and c.doc_id = o.doc_id;
insert into pc_chain (slice_no, doc_type, doc_id, amount, outcome, base_ts, level, actor_id, threshold, done)
select d.slice_no, d.doc_type, d.doc_id, d.amount, d.outcome, d.base_ts, 1, o.actor_id,
  case d.lim when 'pay' then e.pay_limit else e.spend_limit end, true
from pc_override o
join pc_doc d on d.doc_type = o.doc_type and d.doc_id = o.doc_id
join pc_emp e on e.id = o.actor_id;

-- -----------------------------------------------------------------------------
-- 16. Write the business tables.
-- -----------------------------------------------------------------------------

-- Bank-account history.
insert into public.nova_vendor_bank_accounts (id, slice_no, vendor_id, ifsc, account_last4, account_fingerprint, holder_name, valid_from, valid_to, verified)
select a.id, v.slice_no, a.vendor_id, a.ifsc, a.last4, a.fp, a.holder, a.valid_from, a.valid_to, a.verified
from pc_vba a join public.nova_vendors v on v.id = a.vendor_id
order by a.vendor_id, a.seq;

-- Payments, numbered per slice in keying order; approver = deciding level.
insert into public.nova_vendor_payments (
  id, slice_no, payment_number, vendor_id, bill_ids, beneficiary_account_id, from_account_id, amount, channel,
  initiated_by, approved_by, initiated_at, status, bank_transaction_id
)
select p.id, v.slice_no,
  'VPY-' || lpad(v.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by v.slice_no order by p.initiated_at, p.id)::text, 4, '0'),
  p.vendor_id, p.bill_ids, p.beneficiary_id, p.from_account_id, p.amount, p.channel,
  p.initiated_by, c.actor_id, p.initiated_at, p.status, null
from pc_pay p
join public.nova_vendors v on v.id = p.vendor_id
join pc_chain c on c.doc_type = 'vendor_payment' and c.doc_id = p.id and c.done;

-- Credit notes, numbered per slice in date order.
insert into public.nova_credit_notes (id, slice_no, credit_note_number, invoice_id, client_id, note_date, amount, gst_amount, reason, approved_by)
select c.crn_id, i.slice_no,
  'CN-' || lpad(i.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by i.slice_no order by c.note_date, c.crn_id)::text, 4, '0'),
  c.id, i.client_id, c.note_date, c.credit_amount, c.credit_gst, c.reason, ch.actor_id
from pc_crn c
join public.nova_invoices i on i.id = c.id
join pc_chain ch on ch.doc_type = 'credit_note' and ch.doc_id = c.crn_id and ch.done;

-- Approval rows. Levels follow each other by 45 minutes for payments and
-- ~3 hours for everything else; a pending document has no deciding row yet.
insert into public.nova_approvals (id, slice_no, doc_type, doc_id, level, action, actor_id, acted_at, threshold_applied)
select 'apr_' || left(md5('apr-' || c.doc_type || '-' || c.doc_id || '-' || c.level), 12), c.slice_no, c.doc_type, c.doc_id, c.level,
  case when c.done then c.outcome else 'escalate' end, c.actor_id,
  c.base_ts + (c.level - 1) * case when c.doc_type = 'vendor_payment' then interval '45 minutes' else interval '3 hours' end
    + make_interval(mins => floor(pg_temp.pc_roll('aprt-' || c.doc_id || c.level) * 40)::int),
  c.threshold
from pc_chain c
where not (c.done and c.outcome = 'pending');

-- -----------------------------------------------------------------------------
-- 17. Master-data change log, ~125 per slice. Field edits end at the value
-- the master holds today (new_value = current value), so the log and the
-- master agree; old_value is the plausible value before.
-- -----------------------------------------------------------------------------
create temp table pc_mdc_cand (
  slice_no int, entity_type text, entity_id text, field text, old_value text, new_value text,
  -- Earliest day the change can be dated (the record existed by then).
  earliest date, changed_by text, approved_by text, changed_on date
) on commit drop;

-- Every bank change, with the account before and after as "IFSC / ****1234".
insert into pc_mdc_cand
select c.slice_no, 'vendor_bank_account', a.id, 'bank_account',
  pa.ifsc || ' / ****' || pa.last4, c.ifsc || ' / ****' || c.last4, null, c.changed_by, c.approved_by, c.change_on
from pc_change c
join pc_vba a on a.vendor_id = c.vendor_id and a.kind = c.kind and a.valid_from = c.change_on
join pc_vba pa on pa.vendor_id = a.vendor_id and pa.seq = a.seq - 1;
-- A2: the ghost vendor switched live by its own creator, no second signature.
insert into pc_mdc_cand
select g.slice_no, 'vendor', g.vendor_id, 'status', 'pending_verification', 'active', null, g.clerk_id, null, g.created_on + 2
from pc_ghost g;

-- Candidate field edits, one per (record, field); a per-slice quota below.
create temp table pc_mdc_pool on commit drop as
-- Vendors: contact and terms edits, keyed by accounts staff.
select v.slice_no, 'vendor' as entity_type, v.id as entity_id, f.field, f.old_value, f.new_value, v.created_at::date + 20 as earliest
from public.nova_vendors v
cross join lateral (values
  ('phone', '+91 9' || substr(translate(md5('oldph' || v.id), 'abcdef', '012345'), 1, 9), v.phone),
  ('email', 'accounts@' || split_part(v.email, '@', 2), v.email),
  ('address', regexp_replace(v.address, '^[0-9]+', (3 + length(v.id) * 11 % 97)::text), v.address),
  ('payment_terms_days', case v.payment_terms_days when 30 then '45' else '30' end, v.payment_terms_days::text)
) f(field, old_value, new_value)
where v.id not in (select vendor_id from pc_ghost) and f.new_value is not null and f.old_value is distinct from f.new_value
union all
-- Blocked vendors: every one has the block on record.
select v.slice_no, 'vendor', v.id, 'status', 'active', 'blocked', v.created_at::date + 60
from public.nova_vendors v where v.status = 'blocked'
union all
-- Clients: limits, terms and addresses, keyed by sales staff.
select c.slice_no, 'client', c.id, f.field, f.old_value, f.new_value, c.created_at::date + 20
from public.nova_clients c
cross join lateral (values
  ('credit_limit', (round(c.credit_limit * 0.75, -4))::text, c.credit_limit::text),
  ('payment_terms_days', case c.payment_terms_days when 30 then '45' else '30' end, c.payment_terms_days::text),
  ('billing_address', regexp_replace(c.billing_address, '^[0-9]+', (5 + length(c.id) * 13 % 91)::text), c.billing_address),
  ('email', 'finance@' || split_part(c.email, '@', 2), c.email)
) f(field, old_value, new_value)
where f.new_value is not null and f.old_value is distinct from f.new_value
union all
-- Employees: promotions and salary-account changes, keyed by HR.
select e.slice_no, 'employee', e.id, f.field, f.old_value, f.new_value, e.join_date + 180
from pc_emp e
cross join lateral (values
  ('grade', case when e.grade > 'G1' then 'G' || (substr(e.grade, 2)::int - 1) end, e.grade),
  ('bank_fingerprint', left(md5('oldacct' || e.id), 16), e.bank_fingerprint)
) f(field, old_value, new_value)
where f.old_value is not null and e.exit_date is null;

-- Quotas per slice (35 vendor, 40 client, 38 employee edits; every block
-- kept), picked by md5 so each slice edits different records.
insert into pc_mdc_cand
select x.slice_no, x.entity_type, x.entity_id, x.field, x.old_value, x.new_value, x.earliest, null, null, null
from (
  select p.*, row_number() over (partition by p.slice_no, p.entity_type order by (p.field = 'status') desc, md5('mdc-' || p.entity_id || p.field)) as n
  from pc_mdc_pool p
) x
where x.n <= case x.entity_type when 'vendor' then 35 when 'client' then 40 else 38 end
  and x.earliest < (select d from pc_asof) - 3;

-- Who keyed each edit, from the owning department, never the record itself.
update pc_mdc_cand m set changed_by = (
  select e.id from pc_emp e
  where e.slice_no = m.slice_no and e.exit_date is null and e.manager_id is not null and e.id <> m.entity_id
    and e.dept_name = case m.entity_type when 'client' then 'Sales' when 'employee' then 'Human Resources' else 'Finance and Accounts' end
  order by md5('mdcby-' || m.entity_id || m.field || e.id) limit 1)
where m.changed_by is null;
-- Signed off by that person's manager, except ~12% of contact-only edits
-- (phone, email) that policy lets through unapproved.
update pc_mdc_cand m set approved_by = case when m.field in ('phone', 'email') and pg_temp.pc_roll('mdcap-' || m.entity_id || m.field) < 0.12 then null else e.manager_id end
from pc_emp e where e.id = m.changed_by and m.changed_on is null;
-- Dated on a random day between the earliest date and 3 days before as-of.
update pc_mdc_cand m set changed_on = m.earliest + floor(pg_temp.pc_roll('mdcd-' || m.entity_id || m.field) * ((select d from pc_asof) - 3 - m.earliest))::int
where m.changed_on is null;

insert into public.nova_master_data_changes (id, slice_no, entity_type, entity_id, field, old_value, new_value, changed_by, changed_at, approved_by)
select 'mdc_' || left(md5('mdc-' || m.entity_id || '-' || m.field), 12), m.slice_no, m.entity_type, m.entity_id, m.field, m.old_value, m.new_value,
  m.changed_by, ((m.changed_on + time '11:00' + make_interval(mins => floor(pg_temp.pc_roll('mdct-' || m.entity_id || m.field) * 360)::int)) at time zone 'Asia/Kolkata'),
  m.approved_by
from pc_mdc_cand m where m.changed_by is not null;

-- Vendor-master approvals: one sign-off row per approved vendor/bank edit.
insert into public.nova_approvals (id, slice_no, doc_type, doc_id, level, action, actor_id, acted_at, threshold_applied)
select 'apr_' || left(md5('apr-vendor_master-' || m.id || '-1'), 12), m.slice_no, 'vendor_master', m.id, 1, 'approve', m.approved_by,
  m.changed_at + make_interval(mins => 60 + floor(pg_temp.pc_roll('vmt-' || m.id) * 240)::int), null
from public.nova_master_data_changes m
where m.entity_type in ('vendor', 'vendor_bank_account') and m.approved_by is not null;

-- -----------------------------------------------------------------------------
-- 18. Answer key (contract §7). One row per (pattern, resource): a pattern
-- spanning several resources gets several rows sharing a 'pay-' group_id, so
-- every record_id can be checked against the one resource it lives in.
-- -----------------------------------------------------------------------------
create temp table pc_gt (slice_no int, code text, resource text, ids text[], grp text, difficulty text, is_decoy boolean, note text) on commit drop;

-- A2 ghost vendor.
insert into pc_gt
select g.slice_no, 'A2', x.resource, x.ids, 'pay-a2-' || g.slice_no, 'medium', false,
  'Vendor created, billed and paid by the same accounts employee; no GSTIN yet GST charged, no PO or GRN, round amount just under the payment limit, unverified account.'
from pc_ghost g
cross join lateral (values
  ('vendors', array[g.vendor_id]),
  ('purchase-bills', array[g.bill_id]),
  ('vendor-payments', array(select p.id from pc_pay p where p.bill_ids ? g.bill_id order by p.id)),
  ('vendor-bank-accounts', array(select a.id from pc_vba a where a.vendor_id = g.vendor_id order by a.id)),
  ('master-data-changes', array(select m.id from public.nova_master_data_changes m where m.entity_id = g.vendor_id order by m.id))
) x(resource, ids);

-- A3 (and its decoy): bank change, payments to the new account, revert.
insert into pc_gt
select c.slice_no, 'A3', x.resource, x.ids, 'pay-a3-' || c.vendor_id, 'medium', c.kind = 'a3_decoy',
  case when c.kind = 'a3_decoy'
       then 'Bank change 3 days before a payment, but approved, verified and never reverted: a genuine account move.'
       else 'Account switched to an unverified one with no approver, paid within days by the employee who made the switch, then switched back.' end
from pc_change c
join pc_vba a on a.vendor_id = c.vendor_id and a.kind = c.kind
cross join lateral (values
  ('vendor-bank-accounts', array(select v.id from pc_vba v where v.vendor_id = c.vendor_id and v.kind in ('a3_temp', 'a3_revert', 'a3_decoy') order by v.id)),
  ('master-data-changes', array(select m.id from public.nova_master_data_changes m join pc_vba v on v.id = m.entity_id
                                where v.vendor_id = c.vendor_id and v.kind in ('a3_temp', 'a3_revert', 'a3_decoy') order by m.id)),
  ('vendor-payments', array(select p.id from pc_pay p where p.beneficiary_id = a.id
                            and (c.kind <> 'a3_decoy' or p.pay_date < c.change_on + 7) order by p.id))
) x(resource, ids)
where c.kind in ('a3_temp', 'a3_decoy');

-- A4 cluster 1: two vendors, one account.
insert into pc_gt
select c.slice_no, 'A4', x.resource, x.ids, 'pay-a4v-' || c.vendor_id, 'easy', false,
  'Two vendors are paid into the same bank account (identical fingerprint).'
from pc_change c
join pc_vba a on a.vendor_id = c.vendor_id and a.kind = c.kind
cross join lateral (values
  ('vendor-bank-accounts', array[a.id, (select o.id from pc_vba o where o.vendor_id = c.target_key and o.seq = 0)]),
  ('vendors', array[c.vendor_id, c.target_key]),
  ('vendor-payments', array(select p.id from pc_pay p where p.beneficiary_id = a.id order by p.id))
) x(resource, ids)
where c.kind = 'a4_vendor';
-- A4 cluster 2: vendor paid into an employee's salary account.
insert into pc_gt
select c.slice_no, 'A4', x.resource, x.ids, 'pay-a4e-' || c.vendor_id, 'hard', false,
  'Vendor account fingerprint equals an employee''s salary-account fingerprint; the account is held in the employee''s name.'
from pc_change c
join pc_vba a on a.vendor_id = c.vendor_id and a.kind = c.kind
cross join lateral (values
  ('vendor-bank-accounts', array[a.id]),
  ('employees', array[c.target_key]),
  ('vendor-payments', array(select p.id from pc_pay p where p.beneficiary_id = a.id order by p.id)),
  ('master-data-changes', array(select m.id from public.nova_master_data_changes m where m.entity_id = a.id))
) x(resource, ids)
where c.kind = 'a4_employee';
-- A4 decoy: same IFSC and last4, different account.
insert into pc_gt
select c.slice_no, 'A4', 'vendor-bank-accounts',
  array[a.id, (select o.id from pc_vba o where o.vendor_id = c.target_key order by o.valid_from desc, o.seq desc limit 1)],
  'pay-a4d-' || c.vendor_id, 'medium', true,
  'Two vendors show the same IFSC and last four digits, but the full account numbers (fingerprints) differ: same branch, different accounts.'
from pc_change c join pc_vba a on a.vendor_id = c.vendor_id and a.kind = c.kind
where c.kind = 'a4_decoy';

-- A7 split payments: one bill paid in 3+ tranches just under ₹1,00,000 in 48h.
insert into pc_gt
select a.slice_no, 'A7', x.resource, x.ids, 'pay-a7-' || a.bill_id, 'medium', false,
  'One bill paid in several tranches inside 48 hours, each just under the ₹1,00,000 payment limit, so none reached the MD.'
from pc_a7 a
cross join lateral (values
  ('vendor-payments', array(select p.id from pc_pay p where p.kind = 'split' and p.bill_ids ? a.bill_id order by p.id)),
  ('purchase-bills', array[a.bill_id]),
  ('approvals', array(select r.id from public.nova_approvals r join pc_pay p on p.id = r.doc_id
                      where r.doc_type = 'vendor_payment' and p.kind = 'split' and p.bill_ids ? a.bill_id order by r.id))
) x(resource, ids);

-- A12 double payments: original + duplicate, and the bill they both settle.
insert into pc_gt
select a.slice_no, 'A12', x.resource, x.ids, 'pay-a12-' || a.key, case when a.variant = 1 then 'easy' else 'medium' end, false,
  case when a.variant = 1 then 'Bill paid twice: same amount and payee, a few days apart, keyed by two different employees.'
       else 'Retry where both attempts succeeded: same bill, amount and payee, minutes apart.' end
from pc_a12 a
join pc_plan p on p.key = a.key
cross join lateral (values
  ('vendor-payments', array(select q.id from pc_pay q where q.key in (a.key, 'dup-' || a.key) order by q.id)),
  ('purchase-bills', array[p.bill_ids ->> 0])
) x(resource, ids);
-- A12 decoys: one failed-then-retried and one reversed-then-repaid pair per slice.
insert into pc_gt
select x.slice_no, 'A12', 'vendor-payments', array[x.id, o.id], 'pay-a12d-' || x.key, 'easy', true,
  case x.kind when 'retry_fail' then 'Looks like a double payment, but the first attempt failed at the bank; only the retry settled.'
       else 'Looks like a double payment, but the first transfer was reversed by the bank before it was paid again.' end
from (
  select p.*, row_number() over (partition by p.slice_no, p.kind order by md5('a12d-' || p.key)) as n
  from pc_pay p where p.kind in ('retry_fail', 'reversal')
) x
join pc_pay o on o.key = regexp_replace(x.key, '^(fail|rev)-', '')
where x.n = 1;

-- A20: each conflict's approval rows plus the document itself.
insert into pc_gt
select a.slice_no, 'A20', x.resource, x.ids, 'pay-a20-' || a.doc_id, 'medium', false,
  case a.variant
    when 'self_approval' then 'Purchase order approved by the buyer who raised it.'
    when 'below_limit' then 'Approved at level 1 by an approver whose limit (threshold_applied) is below the amount; it should have gone to the MD.'
    when 'maker_checker' then 'Payment approved by the same employee who initiated it.'
    else 'Payment approved by the employee who created the vendor master record.' end
from pc_a20 a
cross join lateral (values
  ('approvals', array(select r.id from public.nova_approvals r where r.doc_type = a.doc_type and r.doc_id = a.doc_id order by r.id)),
  (case a.doc_type when 'purchase_order' then 'purchase-orders' when 'expense' then 'expenses' else 'vendor-payments' end, array[a.doc_id])
) x(resource, ids);
-- A20 decoy: the largest document whose level-1 approver lacked authority but
-- correctly escalated. Reading level-1 rows alone makes it look like a breach.
insert into pc_gt
select distinct on (c.slice_no) c.slice_no, 'A20', 'approvals',
  array(select r.id from public.nova_approvals r where r.doc_type = c.doc_type and r.doc_id = c.doc_id order by r.id),
  'pay-a20d-' || c.doc_id, 'medium', true,
  'Level-1 approver''s limit is below the amount, but they escalated and a higher level approved: the control worked.'
from pc_chain c
where c.level = 2 and c.done and c.outcome = 'approve' and c.doc_id not in (select doc_id from pc_a20)
order by c.slice_no, c.amount desc, c.doc_id;

-- A21 ring.
insert into pc_gt
select a.slice_no, 'A21', x.resource, x.ids, 'pay-a21-' || a.vendor_id, 'hard', false,
  'Round trip: advances with no bill to a vendor whose account is held in a client''s name, followed days later by receipts of the same amounts from that client.'
from pc_a21 a
cross join lateral (values
  ('vendor-payments', array(select p.id from pc_pay p where p.vendor_id = a.vendor_id and p.kind = 'advance' order by p.id)),
  ('payments', array(select r.payment_id from pc_a21_receipt r where r.vendor_id = a.vendor_id order by r.payment_id)),
  ('vendor-bank-accounts', array(select v.id from pc_vba v where v.vendor_id = a.vendor_id and v.kind = 'a21')),
  ('clients', array[a.client_id]),
  ('vendors', array[a.vendor_id])
) x(resource, ids);
-- A21 decoy: a genuine PO advance.
insert into pc_gt
select d.slice_no, 'A21', x.resource, x.ids, 'pay-a21d-' || d.po_id, 'medium', true,
  'Payment with no bill, but it is a 30% advance against an open purchase order.'
from pc_adv_decoy d
cross join lateral (values
  ('vendor-payments', array(select p.id from pc_pay p where p.key = 'podv-' || d.po_id)),
  ('purchase-orders', array[d.po_id])
) x(resource, ids);

-- A22 refund cluster and its decoy.
insert into pc_gt
select c.slice_no, 'A22', x.resource, x.ids, 'pay-a22-' || c.client_id, case when c.pick = 1 then 'easy' else 'medium' end, c.pick = 2,
  case when c.pick = 1 then 'One customer received 5 refunds and a discount, every note approved by that customer''s own account owner.'
       else 'Five return notes to one customer (a defective batch sent back), each routed through the normal approvers.' end
from pc_crn_client c
cross join lateral (values
  ('credit-notes', array(select n.crn_id from pc_crn n where n.client_id = c.client_id order by n.crn_id)),
  ('clients', array[c.client_id])
) x(resource, ids);

-- Written in (slice, group, resource) order so the key reads naturally.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select slice_no, code, resource, ids, grp, difficulty, is_decoy, note
from pc_gt where cardinality(ids) > 0
order by slice_no, code, grp, resource;

-- Temp tables and pg_temp functions go with the session; data lands here.
commit;
