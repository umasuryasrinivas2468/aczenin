-- STATUS: VERIFIED 2026-09-30
-- =============================================================================
-- Nova API — Tier 2 pack 2e: sourcing (requisitions, supplier quotes), access
-- roles (roles, SoD rules, user-role assignments) and integration (source
-- records exported by five other systems, plus their admin-only answer key).
-- Contract: docs/nova-tier2-build-contract.md §2, §3.1, §4.3, §5, §6, §8.
--
-- Run order: 001 → 003 → 004 → 005 → 002 → 006 → 007 → 008 → 009 → 010 →
-- 011 (this) → 013 → 012. Reads 002, 005, 006, 007, 008 (bank_transactions)
-- and 010 (gateway_transactions, settlements). Never reads 009, 012 or 013.
--
-- Two designed scenarios, neither with ground-truth rows (contract §6):
--   * landed cost: in ≥ 60% of requisitions the lowest unit_price quote is
--     not the lowest total cost once freight, packing and MOQ excess count;
--     the low-price vendor also quotes short credit and a long lead time and
--     is, where the slice has one, the vendor with the worst GRN rejections;
--   * toxic access: every employee who approves in a live A20 answer-key row
--     (007) holds a role pair that breaks an SoD rule; 2–3 more hold a toxic
--     pair without an A20 act, and 1–2 temporary toxic grants were revoked.
--
-- Cross-file references are soft (contract §2.2.1): indexed text, no FK,
-- checked by the do-block at the end of this file in the same slice.
--
-- Determinism: every choice comes from pg_temp.sr_roll(key), an md5 of a
-- stable text key, so plan order cannot change the output.
--
-- Rerun: truncates only this file's seven tables in one statement, with no
-- CASCADE. This file owns no anomaly codes, so it never touches
-- nova_ground_truth. Rerun it after any rerun of 008 or 010.
-- =============================================================================

-- One transaction: DDL, truncate, seed and self-check land together or not at all.
begin;

-- Reruns print "already exists, skipping" notices that bury real errors.
set local client_min_messages = warning;

-- -----------------------------------------------------------------------------
-- 1. Tables.
-- -----------------------------------------------------------------------------

-- Internal buying requests, the step before quotes and a PO.
create table if not exists public.nova_purchase_requisitions (
  -- Prefixed id, same convention as every Nova table, so an id reveals its type.
  id text primary key check (id like 'prq\_%'),
  -- The team's book this row belongs to; the API pins every query on it.
  slice_no integer not null check (slice_no >= 0),
  -- Human-facing number; unique per slice so a lookup by number is unambiguous.
  requisition_number text not null,
  -- Soft reference to 005 departments: the cost centre that asked.
  department_id text not null,
  -- Soft reference to 005 employees: the person who raised it.
  requested_by text not null,
  -- Soft reference to 002 inventory; null means a service request.
  item_id text,
  -- Templated one-line need, from a phrase bank.
  description text not null,
  -- Whole units, as every PO line in 006 is.
  quantity integer not null check (quantity > 0),
  -- The item's unit from 002 inventory (pcs, kg, box, ...).
  uom text not null,
  -- Need-by date; future by nature for open and quoted requisitions.
  target_date date not null,
  -- The requester's estimate, which the quotes are judged against.
  budget_amount numeric(14,2) not null check (budget_amount > 0),
  -- Closed set, no enums (contract §2.1).
  priority text not null check (priority in ('normal', 'urgent')),
  -- open = no quotes yet; quoted = quotes in; ordered = a PO exists; cancelled = dropped.
  status text not null check (status in ('open', 'quoted', 'ordered', 'cancelled')),
  -- The day the request was raised; never after as_of.
  created_date date not null,
  -- Soft reference to 006 purchase_orders; set only once ordered.
  po_id text,
  -- Load time, excluded from the md5 check (contract §4 notation).
  created_at timestamptz not null default now(),
  -- One number per slice.
  constraint nova_purchase_requisitions_number_key unique (slice_no, requisition_number),
  -- An ordered requisition always names its PO, and nothing else does.
  constraint nova_purchase_requisitions_po check ((status = 'ordered') = (po_id is not null)),
  -- You cannot need something before you asked for it.
  constraint nova_purchase_requisitions_target check (target_date >= created_date)
);

-- Every vendor quote received against a requisition.
create table if not exists public.nova_supplier_quotes (
  -- Prefixed id.
  id text primary key check (id like 'sqt\_%'),
  -- Inherited from the requisition.
  slice_no integer not null check (slice_no >= 0),
  -- Same-file parent, so a real FK is allowed (contract §2.2.1); restrict keeps quotes from orphaning.
  requisition_id text not null references public.nova_purchase_requisitions(id) on delete restrict,
  -- Soft reference to 002 vendors: who quoted.
  vendor_id text not null,
  -- The vendor's own quote number.
  quote_number text not null,
  -- The day the quote arrived.
  quote_date date not null,
  -- Future by nature: a quote can still be valid after as_of.
  valid_until date not null,
  -- Price per uom, before GST.
  unit_price numeric(14,2) not null check (unit_price > 0),
  -- What the vendor will actually ship: the requested quantity rounded up to its MOQ.
  quantity_offered integer not null check (quantity_offered > 0),
  -- Minimum order quantity; above the requested quantity it forces excess stock.
  moq integer not null check (moq > 0),
  -- The GST slabs 002 uses.
  gst_rate numeric(5,2) not null check (gst_rate in (0, 5, 12, 18, 28)),
  -- One-off charges that make the landed cost differ from the unit price.
  freight_amount numeric(14,2) not null check (freight_amount >= 0),
  packing_amount numeric(14,2) not null check (packing_amount >= 0),
  -- Credit offered; longer terms are worth money to the buyer.
  payment_terms_days integer not null check (payment_terms_days between 0 and 180),
  -- Discount for paying early, a percent.
  early_pay_discount_pct numeric(5,2) not null check (early_pay_discount_pct between 0 and 100),
  -- Days from PO to delivery.
  lead_time_days integer not null check (lead_time_days between 0 and 180),
  -- Null = no warranty offered (consumables).
  warranty_months integer check (warranty_months between 0 and 120),
  -- The quote that became the PO.
  awarded boolean not null,
  -- Templated remark from a phrase bank.
  notes text not null,
  -- Load time, excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- Validity runs forward from the quote date.
  constraint nova_supplier_quotes_validity check (valid_until >= quote_date),
  -- MOQ rounding never ships less than the vendor's minimum.
  constraint nova_supplier_quotes_moq check (quantity_offered >= moq)
);

-- The access roles defined in the finance system, one set per company (contract §2.2.3: no global tables).
create table if not exists public.nova_roles (
  -- Prefixed id.
  id text primary key check (id like 'rol\_%'),
  -- Each company defines its own roles.
  slice_no integer not null check (slice_no >= 0),
  -- The twelve role codes the contract fixes.
  code text not null check (code in ('ap_clerk', 'ap_manager', 'vendor_master_admin', 'treasury_operator', 'treasury_approver', 'payroll_admin',
                                     'procurement_buyer', 'procurement_manager', 'expense_approver', 'finance_controller', 'auditor_readonly', 'system_admin')),
  -- Display name.
  name text not null,
  -- Granted permissions; the contained-by CHECK keeps them inside the fixed vocabulary.
  permissions text[] not null check (permissions <@ array['vendor.create', 'vendor.edit_bank', 'po.create', 'po.approve', 'bill.enter', 'bill.approve',
                                                           'payment.initiate', 'payment.approve', 'journal.post', 'journal.approve', 'payroll.run',
                                                           'expense.approve', 'card.issue', 'user.admin']::text[]),
  -- Privileged roles are what an access review checks first.
  is_privileged boolean not null,
  -- Load time, excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- One row per code per company.
  constraint nova_roles_code_key unique (slice_no, code)
);

-- Pairs of permissions one person must not hold together.
create table if not exists public.nova_sod_rules (
  -- Prefixed id.
  id text primary key check (id like 'sod\_%'),
  -- Per company, like roles.
  slice_no integer not null check (slice_no >= 0),
  -- Short stable code, e.g. SOD-01.
  rule_code text not null,
  -- The two conflicting permissions, from the same vocabulary as nova_roles.permissions.
  permission_a text not null check (permission_a in ('vendor.create', 'vendor.edit_bank', 'po.create', 'po.approve', 'bill.enter', 'bill.approve',
                                                     'payment.initiate', 'payment.approve', 'journal.post', 'journal.approve', 'payroll.run',
                                                     'expense.approve', 'card.issue', 'user.admin')),
  -- Second half of the pair, same vocabulary.
  permission_b text not null check (permission_b in ('vendor.create', 'vendor.edit_bank', 'po.create', 'po.approve', 'bill.enter', 'bill.approve',
                                                     'payment.initiate', 'payment.approve', 'journal.post', 'journal.approve', 'payroll.run',
                                                     'expense.approve', 'card.issue', 'user.admin')),
  -- Closed set.
  severity text not null check (severity in ('high', 'medium')),
  -- Why the pair is a conflict, in one sentence.
  description text not null,
  -- Load time, excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- One row per code per company.
  constraint nova_sod_rules_code_key unique (slice_no, rule_code),
  -- A rule needs two different permissions.
  constraint nova_sod_rules_pair check (permission_a <> permission_b)
);

-- Who holds which role, and when it was granted and revoked.
create table if not exists public.nova_user_role_assignments (
  -- Prefixed id.
  id text primary key check (id like 'ura\_%'),
  -- Inherited from the employee and the role, which share a slice.
  slice_no integer not null check (slice_no >= 0),
  -- Soft reference to 005 employees: the holder.
  employee_id text not null,
  -- Same-file parent, so a real FK.
  role_id text not null references public.nova_roles(id) on delete restrict,
  -- When access started.
  granted_at timestamptz not null,
  -- Soft reference to 005 employees: who granted it.
  granted_by text not null,
  -- Null = still held.
  revoked_at timestamptz,
  -- Templated reason for the grant.
  justification text not null,
  -- Load time, excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- Access cannot end before it starts.
  constraint nova_user_role_assignments_window check (revoked_at is null or revoked_at > granted_at)
);

-- Raw rows as five other systems export them, in their own field names and formats.
create table if not exists public.nova_source_records (
  -- Prefixed id.
  id text primary key check (id like 'src\_%'),
  -- The team's book the export belongs to.
  slice_no integer not null check (slice_no >= 0),
  -- The exporting system.
  source_system text not null check (source_system in ('invoicing_app', 'bank_export', 'gateway_report', 'procurement_portal', 'crm_export')),
  -- What kind of record the row is.
  record_type text not null check (record_type in ('invoice', 'receipt', 'bank_line', 'gateway_txn', 'settlement', 'vendor', 'client')),
  -- The id the row carries in its own system (not a Nova id).
  external_id text not null,
  -- When the export ran.
  exported_at timestamptz not null,
  -- The system's own fields; always an object.
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  -- Load time, excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- Each system exports only its own record types.
  constraint nova_source_records_system_type check (
    (source_system = 'invoicing_app' and record_type in ('invoice', 'receipt'))
    or (source_system = 'bank_export' and record_type = 'bank_line')
    or (source_system = 'gateway_report' and record_type in ('gateway_txn', 'settlement'))
    or (source_system = 'procurement_portal' and record_type = 'vendor')
    or (source_system = 'crm_export' and record_type = 'client'))
);

-- Admin-only answer key: which canonical Nova row each source record is.
-- No view and no registry entry, exactly like nova_ground_truth (contract §2.2.6).
create table if not exists public.nova_source_record_links (
  -- One link per source record, so the record id is the key.
  source_record_id text primary key references public.nova_source_records(id) on delete restrict,
  -- Same slice as the source record; kept for per-team judging queries.
  slice_no integer not null check (slice_no >= 0),
  -- The registry key of the counterpart's resource, e.g. invoices.
  canonical_resource text not null check (canonical_resource in ('invoices', 'payments', 'bank-transactions', 'gateway-transactions', 'settlements', 'vendors', 'clients')),
  -- Soft reference to that resource's table; null = no counterpart.
  canonical_id text,
  -- How the record relates to its counterpart.
  match_kind text not null check (match_kind in ('exact', 'fuzzy', 'duplicate', 'conflict', 'orphan')),
  -- One plain sentence for judges.
  note text not null,
  -- Load time, excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- An orphan has no counterpart, and everything else has one.
  constraint nova_source_record_links_orphan check ((match_kind = 'orphan') = (canonical_id is null))
);

-- -----------------------------------------------------------------------------
-- 2. Indexes: (slice_no, main date desc) for every API list, plus every FK and
-- soft-reference column, which Postgres never indexes on its own.
-- -----------------------------------------------------------------------------
create index if not exists nova_purchase_requisitions_slice_idx on public.nova_purchase_requisitions (slice_no, created_date desc);
-- Soft references are indexed so the self-check and team joins stay cheap (contract §2.2.1).
create index if not exists nova_purchase_requisitions_department_idx on public.nova_purchase_requisitions (department_id);
create index if not exists nova_purchase_requisitions_requested_by_idx on public.nova_purchase_requisitions (requested_by);
create index if not exists nova_purchase_requisitions_item_idx on public.nova_purchase_requisitions (item_id);
create index if not exists nova_purchase_requisitions_po_idx on public.nova_purchase_requisitions (po_id);
-- The main list order for quotes.
create index if not exists nova_supplier_quotes_slice_idx on public.nova_supplier_quotes (slice_no, quote_date desc);
-- The child route /purchase-requisitions/{id}/supplier-quotes filters on this.
create index if not exists nova_supplier_quotes_requisition_idx on public.nova_supplier_quotes (requisition_id);
-- Soft reference to vendors.
create index if not exists nova_supplier_quotes_vendor_idx on public.nova_supplier_quotes (vendor_id);
-- Contract §4.3 asks for (slice_no, code); the unique key already is that index.
-- Same for sod rules: the (slice_no, rule_code) unique key serves the list order.
-- The main list order for assignments.
create index if not exists nova_user_role_assignments_slice_idx on public.nova_user_role_assignments (slice_no, granted_at desc);
-- Both child routes filter on one of these.
create index if not exists nova_user_role_assignments_employee_idx on public.nova_user_role_assignments (employee_id);
create index if not exists nova_user_role_assignments_role_idx on public.nova_user_role_assignments (role_id);
-- Soft reference to the granting employee.
create index if not exists nova_user_role_assignments_granted_by_idx on public.nova_user_role_assignments (granted_by);
-- The main list order for source records.
create index if not exists nova_source_records_slice_idx on public.nova_source_records (slice_no, exported_at desc);
-- Per-system browsing, as contract §4.3 names it.
create index if not exists nova_source_records_system_idx on public.nova_source_records (source_system, record_type);
-- Judges look links up by the canonical row they point at.
create index if not exists nova_source_record_links_canonical_idx on public.nova_source_record_links (canonical_id);

-- -----------------------------------------------------------------------------
-- 3. Read views, one per team-visible table (contract §2.1). Dropped and
-- recreated because a view's column list freezes at creation; views hold no
-- data. nova_source_record_links gets NO view: it is the answer key.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_purchase_requisitions_v, public.nova_supplier_quotes_v, public.nova_roles_v,
  public.nova_sod_rules_v, public.nova_user_role_assignments_v, public.nova_source_records_v;

-- security_invoker so a view can never bypass RLS for its caller (see 001).
create view public.nova_purchase_requisitions_v  with (security_invoker = true) as select * from public.nova_purchase_requisitions;
-- Same pattern for every other table of this file.
create view public.nova_supplier_quotes_v        with (security_invoker = true) as select * from public.nova_supplier_quotes;
create view public.nova_roles_v                  with (security_invoker = true) as select * from public.nova_roles;
create view public.nova_sod_rules_v              with (security_invoker = true) as select * from public.nova_sod_rules;
create view public.nova_user_role_assignments_v  with (security_invoker = true) as select * from public.nova_user_role_assignments;
create view public.nova_source_records_v         with (security_invoker = true) as select * from public.nova_source_records;

-- -----------------------------------------------------------------------------
-- 4. Lockdown, as in 001/007 but scoped to this file's thirteen relations, so
-- it never re-grants something another file deliberately narrowed.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Each of this file's tables and views.
  r record;
begin
  -- Walk exactly our relations, found by name in pg_class.
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
      and c.relname in ('nova_purchase_requisitions', 'nova_supplier_quotes', 'nova_roles', 'nova_sod_rules',
                        'nova_user_role_assignments', 'nova_source_records', 'nova_source_record_links',
                        'nova_purchase_requisitions_v', 'nova_supplier_quotes_v', 'nova_roles_v', 'nova_sod_rules_v',
                        'nova_user_role_assignments_v', 'nova_source_records_v')
  loop
    -- anon ships in browser bundles; authenticated is any signed-up user.
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
    -- The server's only credential.
    execute format('grant select, insert, update, delete on public.%I to service_role', r.relname);
    -- RLS with no policies = deny-all for every role without BYPASSRLS.
    if r.relkind = 'r' then
      -- Tables only; views inherit through security_invoker.
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Rerun cleanup: only what this file owns, in one statement, no CASCADE
-- (contract §3.1). Children listed with parents so the in-file FKs allow it.
-- This file owns no anomaly codes, so nova_ground_truth is not touched.
-- -----------------------------------------------------------------------------
truncate table
  public.nova_source_record_links,
  public.nova_source_records,
  public.nova_user_role_assignments,
  public.nova_sod_rules,
  public.nova_roles,
  public.nova_supplier_quotes,
  public.nova_purchase_requisitions;

-- -----------------------------------------------------------------------------
-- 6. Seed helpers.
-- -----------------------------------------------------------------------------

-- Contract §2.1 asks for a pinned stream; nothing below calls random(), but a
-- future edit that does stays deterministic.
select setseed(0.1101);

-- Parallel plans could reorder any random() calls; harmless to pin.
set local max_parallel_workers_per_gather = 0;

-- A [0,1) roll from a text key: the first 32 bits of its md5. Same key, same
-- roll, whatever order the planner visits rows in.
create function pg_temp.sr_roll(p_key text) returns float8
language sql immutable as $$ select ('x' || substr(md5(p_key), 1, 8))::bit(32)::bigint / 4294967296.0 $$;

-- The id convention of contract §2.1: prefix + 12 hex of md5('<table>|slice|key').
create function pg_temp.sr_id(p_prefix text, p_table text, p_slice int, p_key text) returns text
language sql immutable as $$ select p_prefix || left(md5(p_table || '|' || p_slice || '|' || p_key), 12) $$;

-- Indian digit grouping (12,34,567.89), the way Indian systems print amounts.
create function pg_temp.sr_inr(p numeric) returns text
language sql immutable as $$
  select case when abs(p) < 1000 then to_char(p, 'FM990.00')
    else regexp_replace(to_char(trunc(abs(p) / 1000), 'FM9999999999'), '(\d)(?=(\d\d)+$)', '\1,', 'g')
         || ',' || to_char(abs(p) - trunc(abs(p) / 1000) * 1000, 'FM000.00') end
$$;

-- The frozen clock (005). Every date below is relative to it, never current_date.
create temp table sr_asof on commit drop as
select as_of_date as d, as_of_date - 364 as win_start from public.nova_dataset_meta where id;

-- Employees with their department name and head flag, the lookup every step uses.
create temp table sr_emp on commit drop as
select e.id, e.slice_no, e.grade, e.manager_id, e.department_id, e.join_date, e.exit_date, d.name as dept_name,
  -- A department head approves that department's spend.
  (d.head_employee_id = e.id) as is_head
from public.nova_employees e
join public.nova_departments d on d.id = e.department_id;
-- Looked up by id and by (slice, department) many times.
create index on sr_emp (id);
create index on sr_emp (slice_no, department_id);

-- -----------------------------------------------------------------------------
-- 7. Purchase requisitions. Ordered ones are back-derived from real item POs
-- (006): the PO's first line fixes item, quantity and department, and the
-- requisition is raised 5–20 days before the order date.
-- -----------------------------------------------------------------------------

-- Per slice: how many requisitions of each status (18–25 in total).
create temp table sr_prq_n on commit drop as
select s as slice_no,
  -- 13–16 ordered, 3–4 quoted, 2–3 open, 1–2 cancelled: 19–25 in all.
  13 + floor(pg_temp.sr_roll('prq-n-ordered-' || s) * 4)::int as n_ordered,
  3 + floor(pg_temp.sr_roll('prq-n-quoted-' || s) * 2)::int as n_quoted,
  2 + floor(pg_temp.sr_roll('prq-n-open-' || s) * 2)::int as n_open,
  1 + floor(pg_temp.sr_roll('prq-n-cancelled-' || s) * 2)::int as n_cancelled
from generate_series(0, 79) s;

-- Candidate POs: not cancelled, first line is a stock item, and early enough
-- that a requisition 20 days earlier still falls inside the book window.
create temp table sr_po on commit drop as
select p.id as po_id, p.slice_no, p.vendor_id, p.department_id, p.order_date, p.promised_date, p.raised_by,
  -- The first line fixes the requisition's item, quantity, price and GST rate.
  p.items->0->>'item_id' as item_id, (p.items->0->>'qty')::numeric::int as qty,
  (p.items->0->>'unit_price')::numeric as unit_price, (p.items->0->>'gst_rate')::numeric as gst_rate,
  -- Hashed rank decides which POs get a requisition, independent of plan order.
  row_number() over (partition by p.slice_no order by md5('prq-pick|' || p.id)) as k
from public.nova_purchase_orders p
where p.status <> 'cancelled' and p.items->0->>'item_id' is not null
  and p.order_date - 20 >= (select win_start from sr_asof);

-- Every requisition to write, with the fields that differ by status.
create temp table sr_prq (
  -- The stable text key its id and every roll derive from.
  key text, slice_no int, id text, status text, item_id text, department_id text, quantity int,
  -- Price basis for the quotes: the PO price when ordered, else the item cost.
  unit_price numeric, gst_rate numeric, created_date date, target_date date,
  -- PO context (ordered only).
  po_id text, po_vendor_id text, order_date date, raised_by text
) on commit drop;

-- Ordered: one per picked PO; target is the PO's promised date.
insert into sr_prq
select 'po-' || p.po_id, p.slice_no, null, 'ordered', p.item_id, p.department_id, p.qty, p.unit_price, p.gst_rate,
  p.order_date - 5 - floor(pg_temp.sr_roll('prq-lead-' || p.po_id) * 16)::int, p.promised_date,
  p.po_id, p.vendor_id, p.order_date, p.raised_by
from sr_po p join sr_prq_n n on n.slice_no = p.slice_no
where p.k <= n.n_ordered;

-- Not ordered: a hashed stock item each, distinct within the slice.
insert into sr_prq
select x.status || '-' || x.j, x.slice_no, null, x.status, i.id,
  -- The department that last bought this item, else Procurement itself.
  coalesce((select p.department_id from sr_po p where p.item_id = i.id order by p.order_date desc, p.po_id limit 1),
           (select d.id from public.nova_departments d where d.slice_no = x.slice_no and d.name = 'Procurement')),
  -- The item's usual PO quantity, else a round default.
  coalesce((select round(avg(p.qty))::int from sr_po p where p.item_id = i.id), 50),
  -- Cost basis: the catalogue purchase price, moved ±4% by hash.
  round(i.purchase_price * (0.96 + 0.08 * pg_temp.sr_roll('prq-price-' || x.slice_no || '-' || x.status || x.j))::numeric, 2),
  i.gst_rate,
  -- Quoted: 3–29 days ago (time for quotes); open: 0–9 days ago; cancelled: 2–10 months ago.
  (select d from sr_asof) - case x.status
    when 'quoted' then 3 + floor(pg_temp.sr_roll('prq-age-' || x.slice_no || x.status || x.j) * 27)::int
    when 'open' then floor(pg_temp.sr_roll('prq-age-' || x.slice_no || x.status || x.j) * 10)::int
    else 60 + floor(pg_temp.sr_roll('prq-age-' || x.slice_no || x.status || x.j) * 240)::int end,
  -- Target date filled in just below, from the created date.
  null, null, null, null, null
from (
  -- Expand each status count into numbered slots, then give every slot a distinct item.
  select n.slice_no, s.status, j, row_number() over (partition by n.slice_no order by s.status, j) as slot
  from sr_prq_n n
  cross join lateral (values ('quoted', n.n_quoted), ('open', n.n_open), ('cancelled', n.n_cancelled)) s(status, cnt)
  cross join lateral generate_series(1, s.cnt) j
) x
join (
  -- Items ranked by hash per slice; slot k takes the k-th item.
  select i.*, row_number() over (partition by i.slice_no order by md5('prq-item|' || i.id)) as r
  from public.nova_inventory i
) i on i.slice_no = x.slice_no and i.r = x.slot;
-- Need-by 14–43 days after raising; future by nature for open and quoted ones.
update sr_prq set target_date = created_date + 14 + floor(pg_temp.sr_roll('prq-target-' || slice_no || key) * 30)::int
where status <> 'ordered';
-- Ids follow contract §2.1, keyed on the stable key.
update sr_prq set id = pg_temp.sr_id('prq_', 'nova_purchase_requisitions', slice_no, key);

-- Write the requisitions. The requester is someone in the requesting
-- department employed on the day, else the PO's raiser (always employed).
insert into public.nova_purchase_requisitions (id, slice_no, requisition_number, department_id, requested_by, item_id, description,
  quantity, uom, target_date, budget_amount, priority, status, created_date, po_id)
select r.id, r.slice_no,
  -- PR-<yymm>-<seq>: seq counts the slice's requisitions in date order, so it is unique per slice.
  'PR-' || to_char(r.created_date, 'YYMM') || '-' || lpad(row_number() over (partition by r.slice_no order by r.created_date, r.id)::text, 3, '0'),
  r.department_id,
  coalesce((select e.id from sr_emp e
            where e.slice_no = r.slice_no and e.department_id = r.department_id and e.join_date <= r.created_date
              and (e.exit_date is null or e.exit_date > r.created_date)
            order by md5('prq-req|' || r.id || e.id) limit 1),
           r.raised_by,
           -- A department with nobody on the day falls back to its head.
           (select d.head_employee_id from public.nova_departments d where d.id = r.department_id)),
  r.item_id,
  -- Templated need text from a four-phrase bank, keyed by hash.
  (array['Replenishment of ', 'Stock top-up: ', 'Buffer stock of ', 'Requirement for upcoming orders: '])[1 + floor(pg_temp.sr_roll('prq-desc-' || r.id) * 4)::int] || i.name,
  r.quantity, i.unit, r.target_date,
  -- The requester's estimate: 3–15% above the price basis, to the rupee.
  round(r.quantity * r.unit_price * (1.03 + 0.12 * pg_temp.sr_roll('prq-budget-' || r.id))::numeric, 0),
  -- About one in five is urgent.
  case when pg_temp.sr_roll('prq-prio-' || r.id) < 0.2 then 'urgent' else 'normal' end,
  r.status, r.created_date, r.po_id
from sr_prq r
join public.nova_inventory i on i.id = r.item_id;

-- -----------------------------------------------------------------------------
-- 8. Supplier quotes: 3–4 per requisition that reached quoting (all but open).
-- Roles inside a requisition: 'base' is the PO vendor (awarded when ordered)
-- or the item's primary vendor; 'low' quotes the lowest unit price; 'alt' are
-- the rest. In trap requisitions (≥ 75% of those with quotes) 'low' is the
-- low-price, high-landed-cost offer: big freight, an MOQ well above the need,
-- short credit and a long lead time.
-- -----------------------------------------------------------------------------

-- GRN quality per vendor from 006: rejected share of everything received.
create temp table sr_vendor_quality on commit drop as
select p.vendor_id, sum((l->>'qty_rejected')::numeric) / nullif(sum((l->>'qty_received')::numeric), 0) as reject_rate
from public.nova_goods_receipts g
join public.nova_purchase_orders p on p.id = g.po_id
cross join lateral jsonb_array_elements(g.items) l
group by p.vendor_id;

-- Stock-item vendors per slice (002 roles 0–11): the ones that can quote goods.
-- 002 has one vendor per category, so rival quotes come from other goods
-- vendors acting as distributors (contract §4.3 deviation, see report).
create temp table sr_goods_vendor on commit drop as
select distinct v.id as vendor_id, v.slice_no, coalesce(v.payment_terms_days, 30) as terms, coalesce(v.early_pay_discount_pct, 0) as disc,
  coalesce(q.reject_rate, 0) as reject_rate
from public.nova_vendors v
join public.nova_inventory i on i.primary_vendor_id = v.id
left join sr_vendor_quality q on q.vendor_id = v.id
where coalesce(v.status, 'active') = 'active';

-- Requisitions that get quotes, with the trap flag set by hashed rank.
create temp table sr_q_req on commit drop as
select r.*, i.lead_time_days as item_lead, i.primary_vendor_id,
  coalesce(r.po_vendor_id, i.primary_vendor_id) as base_vendor_id,
  -- 4 quotes for the top 60% by hash, else 3: keeps every slice inside 60–90 quotes.
  3 + (row_number() over (partition by r.slice_no order by md5('sqt-n|' || r.id)) <= ceil(0.6 * count(*) over (partition by r.slice_no)))::int as n_quotes,
  -- Top 75% by hash are traps: at least 60% of all requisitions even with the open ones counted.
  (row_number() over (partition by r.slice_no order by md5('sqt-trap|' || r.id))
     <= ceil(0.75 * count(*) over (partition by r.slice_no))) as trap
from sr_prq r
join public.nova_inventory i on i.id = r.item_id
where r.status <> 'open';

-- One row per quote: role and vendor. Rivals are ranked per requisition; the
-- trap's low-price vendor is the worst-GRN rival, the others follow by hash.
create temp table sr_q on commit drop as
select q.*, row_number() over (partition by q.req_id order by q.role_order, q.vendor_id) as seq
from (
  -- The base quote.
  select r.id as req_id, 0 as role_order, 'base' as role, r.base_vendor_id as vendor_id from sr_q_req r
  union all
  -- Rivals: rank 1 is 'low', ranks 2–3 are 'alt', cut to the quote count.
  select x.req_id, x.rk, case when x.rk = 1 then 'low' else 'alt' end, x.vendor_id
  from (
    select r.id as req_id, r.n_quotes, g.vendor_id,
      row_number() over (partition by r.id order by case when r.trap then -g.reject_rate else 0 end, md5('sqt-rival|' || r.id || g.vendor_id)) as rk
    from sr_q_req r
    join sr_goods_vendor g on g.slice_no = r.slice_no and g.vendor_id <> r.base_vendor_id
  ) x
  where x.rk <= x.n_quotes - 1
) q;

-- Write the quotes. v = the requisition's value at the price basis; every
-- charge is a share of it, so the landed-cost gap holds at any price level.
insert into public.nova_supplier_quotes (id, slice_no, requisition_id, vendor_id, quote_number, quote_date, valid_until, unit_price,
  quantity_offered, moq, gst_rate, freight_amount, packing_amount, payment_terms_days, early_pay_discount_pct, lead_time_days,
  warranty_months, awarded, notes)
select pg_temp.sr_id('sqt_', 'nova_supplier_quotes', r.slice_no, r.key || '|' || q.seq), r.slice_no, r.id, q.vendor_id,
  -- The vendor's own numbering: a vendor code, the year, a hashed serial.
  'Q' || upper(left(md5('vcode' || q.vendor_id), 3)) || '/' || to_char(x.quote_date, 'YY') || '/' || lpad((1 + floor(pg_temp.sr_roll('sqt-no-' || r.id || q.seq) * 9998))::int::text, 4, '0'),
  x.quote_date,
  -- Valid 15, 30 or 45 days; future by nature, so it may pass as_of.
  x.quote_date + (array[15, 30, 45])[1 + floor(pg_temp.sr_roll('sqt-valid-' || r.id || q.seq) * 3)::int],
  x.unit_price,
  -- Ship at least the need, rounded up to the MOQ.
  greatest(r.quantity, x.moq), x.moq, r.gst_rate,
  round(x.v * x.freight_share, 0), round(x.v * x.packing_share, 0),
  x.terms, x.disc, x.lead,
  -- About a third of quotes carry a warranty.
  case when pg_temp.sr_roll('sqt-warr-' || r.id || q.seq) < 0.35 then (array[6, 12, 24])[1 + floor(pg_temp.sr_roll('sqt-warm-' || r.id || q.seq) * 3)::int] end,
  -- Only the PO vendor's quote on an ordered requisition won.
  (q.role = 'base' and r.status = 'ordered'),
  -- Neutral remark from an eight-phrase bank.
  (array['Prices firm for the validity period.', 'Freight charged at actuals to site.', 'Delivery in part lots acceptable.',
         'Packing in standard cartons.', 'Payment by NEFT against invoice.', 'Rates linked to the raw material index.',
         'Inspection certificate with each lot.', 'Taxes extra as applicable.'])[1 + floor(pg_temp.sr_roll('sqt-note-' || r.id || q.seq) * 8)::int]
from sr_q q
join sr_q_req r on r.id = q.req_id
join public.nova_vendors v on v.id = q.vendor_id
cross join lateral (
  -- u = one roll per quote, reused for price, charges and lead time.
  select pg_temp.sr_roll('sqt-u-' || r.id || q.seq)::numeric as u, r.quantity * r.unit_price as v
) b
cross join lateral (
  select b.v,
    -- Quote date: between raising and ordering; for quoted ones up to as_of; cancelled ones within a week.
    case r.status
      when 'ordered' then r.created_date + 1 + floor(pg_temp.sr_roll('sqt-date-' || r.id || q.seq) * greatest(r.order_date - r.created_date - 1, 1))::int
      when 'quoted' then r.created_date + floor(pg_temp.sr_roll('sqt-date-' || r.id || q.seq) * ((select d from sr_asof) - r.created_date + 1))::int
      else r.created_date + 1 + floor(pg_temp.sr_roll('sqt-date-' || r.id || q.seq) * 6)::int end as quote_date,
    -- Base = the price basis exactly (so an awarded quote equals the PO price);
    -- low = 90–95% (trap) or 93–97%; alt = 102–112%.
    case q.role when 'base' then r.unit_price
      when 'low' then round(r.unit_price * case when r.trap then 0.90 + 0.05 * b.u else 0.93 + 0.04 * b.u end, 2)
      else round(r.unit_price * (1.02 + 0.10 * b.u), 2) end as unit_price,
    -- Trap MOQ is 140–190% of the need; everyone else's is at most the need.
    case when q.role = 'low' and r.trap then ceil(r.quantity * (1.4 + 0.5 * b.u))::int
      else greatest(1, floor(r.quantity * (0.3 + 0.6 * b.u))::int) end as moq,
    -- Freight: 8–14% of value on a trap, 0.5–2% otherwise.
    case when q.role = 'low' and r.trap then 0.08 + 0.06 * b.u else 0.005 + 0.015 * b.u end as freight_share,
    -- Packing: 1–2% on a trap, 0–0.6% otherwise.
    case when q.role = 'low' and r.trap then 0.01 + 0.01 * b.u else 0.006 * b.u end as packing_share,
    -- Credit: the base vendor's own terms; a trap offers 0 or 7 days.
    case when q.role = 'base' then coalesce(v.payment_terms_days, 30)
      when r.trap and q.role = 'low' then (array[0, 7])[1 + (b.u < 0.5)::int]
      else (array[30, 45, 60])[1 + floor(b.u * 3)::int] end as terms,
    -- Early-pay discount: the vendor master's rate on base; none on a trap; 0–2% otherwise.
    case when q.role = 'base' then coalesce(v.early_pay_discount_pct, 0)
      when r.trap and q.role = 'low' then 0 else floor(b.u * 3) end as disc,
    -- Lead time: the item's own, +7–20 days on a trap, ±5 otherwise (never below 1).
    greatest(1, coalesce(r.item_lead, 14) + case when q.role = 'low' and r.trap then 7 + floor(b.u * 14)::int
      when q.role = 'base' then 0 else floor(b.u * 11)::int - 5 end) as lead
) x;

-- -----------------------------------------------------------------------------
-- 9. Roles and SoD rules: the same twelve roles and eight rules per company
-- (contract §2.2.3). No single role breaks a rule on its own, so every
-- conflict in the data comes from a person holding two roles.
-- -----------------------------------------------------------------------------

-- The role catalogue: code, display name, permissions, privileged flag.
create temp table sr_role_def on commit drop as
select * from (values
  ('ap_clerk',            'Accounts Payable Clerk',      array['bill.enter', 'payment.initiate', 'journal.post'], false),
  ('ap_manager',          'Accounts Payable Manager',    array['bill.approve', 'payment.approve'], true),
  ('vendor_master_admin', 'Vendor Master Administrator', array['vendor.create', 'vendor.edit_bank'], true),
  ('treasury_operator',   'Treasury Operator',           array['payment.initiate'], false),
  ('treasury_approver',   'Treasury Approver',           array['payment.approve'], true),
  ('payroll_admin',       'Payroll Administrator',       array['payroll.run'], true),
  ('procurement_buyer',   'Procurement Buyer',           array['po.create'], false),
  ('procurement_manager', 'Procurement Manager',         array['po.approve'], true),
  ('expense_approver',    'Expense Approver',            array['expense.approve'], false),
  ('finance_controller',  'Finance Controller',          array['journal.approve', 'expense.approve'], true),
  -- Read-only audit access holds no write permission at all.
  ('auditor_readonly',    'Auditor (Read Only)',         array[]::text[], false),
  ('system_admin',        'System Administrator',        array['user.admin', 'card.issue'], true)
) as r(code, name, permissions, is_privileged);

-- The rule book: code, the pair, severity, the reason.
create temp table sr_sod_def on commit drop as
select * from (values
  ('SOD-01', 'vendor.create',    'payment.approve', 'high',   'Creating a vendor and approving payments lets one person pay a vendor they set up.'),
  ('SOD-02', 'vendor.edit_bank', 'payment.initiate', 'high',  'Changing vendor bank details and keying payments lets one person redirect a payment.'),
  ('SOD-03', 'po.create',        'po.approve',      'high',   'Raising and approving purchase orders removes the independent check on buying.'),
  ('SOD-04', 'journal.post',     'journal.approve', 'high',   'Posting and approving journals lets one person change the books unchecked.'),
  ('SOD-05', 'payment.initiate', 'payment.approve', 'high',   'Keying and approving the same payment defeats maker-checker.'),
  ('SOD-06', 'bill.enter',       'bill.approve',    'medium', 'Entering and approving vendor bills lets one person book a liability unchecked.'),
  ('SOD-07', 'expense.approve',  'payroll.run',     'medium', 'Claims are reimbursed through payroll, so approving them and running payroll should be split.'),
  ('SOD-08', 'user.admin',       'payment.approve', 'high',   'An administrator who approves payments can grant themselves any other access.')
) as s(rule_code, permission_a, permission_b, severity, description);

-- Write the roles, one set per slice.
insert into public.nova_roles (id, slice_no, code, name, permissions, is_privileged)
select pg_temp.sr_id('rol_', 'nova_roles', s, r.code), s, r.code, r.name, r.permissions, r.is_privileged
from generate_series(0, 79) s cross join sr_role_def r;

-- Write the rules, one set per slice.
insert into public.nova_sod_rules (id, slice_no, rule_code, permission_a, permission_b, severity, description)
select pg_temp.sr_id('sod_', 'nova_sod_rules', s, d.rule_code), s, d.rule_code, d.permission_a, d.permission_b, d.severity, d.description
from generate_series(0, 79) s cross join sr_sod_def d;

-- -----------------------------------------------------------------------------
-- 10. User-role assignments. Baseline access follows department and grade;
-- then the A20 approvers (007) get the missing half of their toxic pair, 2–3
-- more people get a toxic pair they never used, and 1–2 temporary toxic
-- grants were revoked (decoys for FIN-42). Only employees still employed at
-- as_of hold access.
-- -----------------------------------------------------------------------------

-- Every grant to write: who, which role, why it exists, and its dates.
create temp table sr_hold (
  -- kind: base, a20, extra or revoked; drives dates and the justification bank.
  slice_no int, employee_id text, role_code text, kind text, grant_date date, revoke_date date
) on commit drop;

-- Employees who hold access: employed at as_of.
create temp table sr_active on commit drop as
select e.*,
  -- Rank inside department by grade (highest first), ties by id, for "the senior one" picks.
  row_number() over (partition by e.slice_no, e.department_id, e.is_head order by e.grade desc, e.id) as senior_rank
from sr_emp e
where e.exit_date is null or e.exit_date > (select d from sr_asof);

-- Baseline, by department and grade.
insert into sr_hold (slice_no, employee_id, role_code, kind)
select a.slice_no, a.id, r.code, 'base'
from sr_active a
cross join lateral (
  -- Finance head: controls the books and releases payments.
  select 'finance_controller' as code where a.dept_name = 'Finance and Accounts' and a.is_head
  union all select 'treasury_approver' where a.dept_name = 'Finance and Accounts' and a.is_head
  -- Finance juniors key bills and payments.
  union all select 'ap_clerk' where a.dept_name = 'Finance and Accounts' and not a.is_head and a.grade in ('G1', 'G2', 'G3')
  -- Finance G4 runs the payment files.
  union all select 'treasury_operator' where a.dept_name = 'Finance and Accounts' and not a.is_head and a.grade = 'G4'
  -- Finance seniors below the head approve bills and payments.
  union all select 'ap_manager' where a.dept_name = 'Finance and Accounts' and not a.is_head and a.grade in ('G5', 'G6', 'G7')
  -- Procurement head approves POs; the team raises them.
  union all select 'procurement_manager' where a.dept_name = 'Procurement' and a.is_head
  union all select 'procurement_buyer' where a.dept_name = 'Procurement' and not a.is_head
  -- The senior buyer also onboards vendors.
  union all select 'vendor_master_admin' where a.dept_name = 'Procurement' and not a.is_head and a.senior_rank = 1
  -- Every other department head approves their team's claims (Finance's head already can).
  union all select 'expense_approver' where a.is_head and a.dept_name <> 'Finance and Accounts'
  -- The senior HR non-head runs payroll (never a head, who approves claims).
  union all select 'payroll_admin' where a.dept_name = 'Human Resources' and not a.is_head and a.senior_rank = 1
  -- The IT head administers users.
  union all select 'system_admin' where a.dept_name = 'Information Technology' and a.is_head
  -- The MD (top of the chain) keeps read-only oversight.
  union all select 'auditor_readonly' where a.manager_id is null
) r;

-- Each role's permissions per slice employee, recomputed as grants are added.
create temp view sr_held_perm as
select h.slice_no, h.employee_id, unnest(d.permissions) as perm
from sr_hold h join sr_role_def d on d.code = h.role_code
where h.revoke_date is null;

-- The permission that grants each missing half, when a toxic pair is completed.
create temp table sr_perm_role on commit drop as
select * from (values
  ('po.create', 'procurement_buyer'), ('po.approve', 'procurement_manager'), ('expense.approve', 'expense_approver'),
  ('payroll.run', 'payroll_admin'), ('payment.initiate', 'treasury_operator'), ('payment.approve', 'treasury_approver'),
  ('vendor.create', 'vendor_master_admin'), ('bill.enter', 'ap_clerk'), ('bill.approve', 'ap_manager')
) as p(perm, role_code);

-- Every approval an A20 answer-key row (007, not a decoy) names, with the
-- permission pair that act exercised: raising + approving a PO, approving a
-- claim that payroll reimburses, keying + approving a payment, or creating a
-- vendor + approving its payment.
create temp table sr_a20 on commit drop as
select a.slice_no, a.actor_id, a.acted_at, x.perm_a, x.perm_b
from public.nova_ground_truth g
cross join lateral unnest(g.record_ids) rid
join public.nova_approvals a on a.id = rid and a.slice_no = g.slice_no
left join public.nova_vendor_payments p on p.id = a.doc_id and a.doc_type = 'vendor_payment'
cross join lateral (
  select case a.doc_type when 'purchase_order' then 'po.create' when 'expense' then 'expense.approve'
           when 'vendor_payment' then case when a.actor_id = p.initiated_by then 'payment.initiate' else 'vendor.create' end
           else 'bill.enter' end as perm_a,
         case a.doc_type when 'purchase_order' then 'po.approve' when 'expense' then 'payroll.run'
           when 'vendor_payment' then 'payment.approve' else 'bill.approve' end as perm_b
) x
where g.anomaly_code = 'A20' and not g.is_decoy;

-- Give each A20 approver the roles for whichever half of a pair they lack.
insert into sr_hold (slice_no, employee_id, role_code, kind)
select distinct n.slice_no, n.actor_id, m.role_code, 'a20'
from (select slice_no, actor_id, perm_a as perm from sr_a20 union select slice_no, actor_id, perm_b from sr_a20) n
join sr_perm_role m on m.perm = n.perm
where not exists (select 1 from sr_held_perm h where h.employee_id = n.actor_id and h.perm = n.perm);

-- Extra toxic holders: 2–3 per slice from four candidate completions, never
-- an A20 approver, one per person. None has an act that uses both halves.
create temp table sr_extra on commit drop as
select c.slice_no, c.employee_id, c.role_code
from (
  select c.*, row_number() over (partition by c.slice_no order by md5('ura-extra|' || c.employee_id || c.role_code)) as k
  from (
    select distinct on (a.slice_no, a.id) a.slice_no, a.id as employee_id, o.role_code
    from sr_active a
    join sr_hold h on h.employee_id = a.id and h.kind = 'base'
    join (values
      -- Payment operator also approving payments (SOD-05).
      ('treasury_operator', 'treasury_approver'),
      -- AP manager also keying bills and payments (SOD-05, SOD-06).
      ('ap_manager', 'ap_clerk'),
      -- User administrator also approving payments (SOD-08).
      ('system_admin', 'treasury_approver'),
      -- Finance controller also posting journals (SOD-04, SOD-05).
      ('finance_controller', 'ap_clerk')
    ) o(has_role, role_code) on o.has_role = h.role_code
    where a.id not in (select actor_id from sr_a20)
      -- Only a completion the person does not already hold.
      and not exists (select 1 from sr_hold x where x.employee_id = a.id and x.role_code = o.role_code)
    order by a.slice_no, a.id, md5('ura-extra-pick|' || a.id || o.role_code)
  ) c
) c
where c.k <= 2 + (pg_temp.sr_roll('ura-extra-n-' || c.slice_no) < 0.5)::int;
-- Record them as grants.
insert into sr_hold (slice_no, employee_id, role_code, kind)
select slice_no, employee_id, role_code, 'extra' from sr_extra;

-- Revoked temporary grants: 1–2 per slice, a junior given the approving half
-- of a toxic pair for a few weeks, then removed. Never an A20 or extra holder.
insert into sr_hold (slice_no, employee_id, role_code, kind, grant_date, revoke_date)
select c.slice_no, c.employee_id, c.role_code, 'revoked', c.g, c.g + 7 + floor(pg_temp.sr_roll('ura-rev-len-' || c.employee_id) * 15)::int
from (
  select a.slice_no, a.id as employee_id, o.role_code,
    -- Granted 40–200 days before as_of, so the revocation is also in the past.
    (select d from sr_asof) - 40 - floor(pg_temp.sr_roll('ura-rev-at-' || a.id) * 161)::int as g,
    row_number() over (partition by a.slice_no order by md5('ura-rev|' || a.id)) as k
  from sr_active a
  join sr_hold h on h.employee_id = a.id and h.kind = 'base'
  -- An AP clerk covering payment approvals, or a buyer covering PO approvals.
  join (values ('ap_clerk', 'treasury_approver'), ('procurement_buyer', 'procurement_manager')) o(has_role, role_code) on o.has_role = h.role_code
  where a.id not in (select actor_id from sr_a20) and a.id not in (select employee_id from sr_extra)
    -- One temporary grant per person, and never a role they already hold.
    and not exists (select 1 from sr_hold x where x.employee_id = a.id and x.role_code = o.role_code)
) c
where c.k <= 1 + (pg_temp.sr_roll('ura-rev-n-' || c.slice_no) < 0.5)::int;

-- Grant dates for everything but the revoked grants (dated above).
update sr_hold h set grant_date = least((select d from sr_asof), case h.kind
    -- Baseline: on joining, or at the system go-live 18 months before the window, plus 0–9 days of setup.
    when 'base' then greatest(e.join_date, (select win_start from sr_asof) - 548) + floor(pg_temp.sr_roll('ura-g-' || h.employee_id || h.role_code) * 10)::int
    -- A20 completion: 30–119 days before the person's first A20 act, never before joining.
    when 'a20' then greatest(e.join_date, (select min(a.acted_at)::date from sr_a20 a where a.actor_id = h.employee_id)
                                          - 30 - floor(pg_temp.sr_roll('ura-g-' || h.employee_id || h.role_code) * 90)::int)
    -- Extra toxic grant: 60–299 days before as_of, never before joining.
    else greatest(e.join_date, (select d from sr_asof) - 60 - floor(pg_temp.sr_roll('ura-g-' || h.employee_id || h.role_code) * 240)::int) end)
from sr_emp e
where e.id = h.employee_id and h.kind <> 'revoked';

-- Per slice: the IT head (who administers users) and the MD (the fallback granter).
create temp table sr_granter on commit drop as
select a.slice_no,
  max(a.id) filter (where a.dept_name = 'Information Technology' and a.is_head) as it_head,
  max(a.join_date) filter (where a.dept_name = 'Information Technology' and a.is_head) as it_join,
  max(a.id) filter (where a.manager_id is null) as md
from sr_emp a
group by a.slice_no;

-- Write the assignments. Time of day 10:00–17:59 IST, stored as timestamptz.
insert into public.nova_user_role_assignments (id, slice_no, employee_id, role_id, granted_at, granted_by, revoked_at, justification)
select pg_temp.sr_id('ura_', 'nova_user_role_assignments', h.slice_no, h.employee_id || '|' || h.role_code || '|' || h.kind),
  h.slice_no, h.employee_id, r.id,
  (h.grant_date::timestamp + make_interval(mins => 600 + floor(pg_temp.sr_roll('ura-t-' || h.employee_id || h.role_code) * 480)::int)) at time zone 'Asia/Kolkata',
  -- The IT head grants access once employed, except to themselves; the MD otherwise.
  case when g.it_head is not null and g.it_head <> h.employee_id and g.it_join <= h.grant_date then g.it_head else g.md end,
  -- Revoked at 18:00 IST on the last day of cover.
  case when h.revoke_date is not null then (h.revoke_date::timestamp + interval '18 hours') at time zone 'Asia/Kolkata' end,
  -- Templated reason; a revoked grant draws from the temporary-cover bank.
  case when h.kind = 'revoked'
    then (array['Temporary cover during approver leave', 'Interim access for quarter-end close', 'Short-term backup during system migration'])[1 + floor(pg_temp.sr_roll('ura-j-' || h.employee_id || h.role_code) * 3)::int]
    else (array['Mapped to job profile', 'Assigned on joining the team', 'Access request approved by department head',
                'Role realigned after access review', 'Additional access for month-end workload', 'Backup approver during staff shortage'])[1 + floor(pg_temp.sr_roll('ura-j-' || h.employee_id || h.role_code) * 6)::int] end
from sr_hold h
join public.nova_roles r on r.slice_no = h.slice_no and r.code = h.role_code
join sr_granter g on g.slice_no = h.slice_no;

-- -----------------------------------------------------------------------------
-- 11. Source records: the last 60 days of invoices, receipts, collections
-- bank lines, gateway captures and settlements, plus every vendor and client
-- master, re-exported by five systems in their own shapes. Planted: 5% of
-- transactional canonical rows never exported, 5% of exports duplicated, ~3%
-- with a conflicting amount, 3 gateway rows per slice with no Nova row.
-- -----------------------------------------------------------------------------

-- Name drift the way other systems mangle a party name: capitals, an M/s
-- prefix, the legal suffix spelt out or abbreviated, or cut to two words.
create function pg_temp.sr_drift(p_name text, p_key text) returns text
language sql immutable as $$
  select case
    when r < 0.20 then upper(p_name)
    when r < 0.38 then 'M/s ' || p_name
    when r < 0.52 then replace(replace(replace(p_name, 'Pvt Ltd', 'Private Limited'), 'L.L.P.', 'LLP'), ' Ltd', ' Limited')
    when r < 0.62 then array_to_string((regexp_split_to_array(p_name, ' '))[1:2], ' ')
    else p_name end
  from (select pg_temp.sr_roll('drift|' || p_key) as r) x
$$;

-- An IST wall-clock time on a date, stored as timestamptz. Exports run 23:20–23:53 IST
-- (minute 1400–1425, plus up to 3 hashed and 5 for a same-night re-export), so
-- nothing crosses midnight past as_of.
create function pg_temp.sr_ist(p_day date, p_minutes int) returns timestamptz
language sql immutable as $$ select (p_day::timestamp + make_interval(mins => p_minutes)) at time zone 'Asia/Kolkata' $$;

-- Every canonical row considered for export, before omission and duplication.
create temp table sr_src (
  -- kind = the record_type; key = the stable text every roll and id derives from.
  slice_no int, record_type text, key text, canonical_resource text, canonical_id text,
  -- Export fields; payload is built without the planted changes, which come later.
  source_system text, external_id text, export_day date, export_min int, payload jsonb,
  -- The amount field a conflict edits (a payload key), and the fuzzy reason, if any.
  amount_key text, amount_is_paise boolean, fuzzy_reason text,
  -- The canonical amount behind amount_key, so a conflict can rewrite it.
  amount numeric
) on commit drop;

-- Invoices from the invoicing app: its own doc id, DD/MM/YYYY dates, amounts as Indian-grouped strings.
insert into sr_src
select i.slice_no, 'invoice', 'inv|' || i.id, 'invoices', i.id, 'invoicing_app',
  'IA-' || upper(left(md5('ia|' || i.id), 8)), i.invoice_date, 1400,
  jsonb_strip_nulls(jsonb_build_object(
    'InvoiceNo', i.invoice_number, 'InvoiceDate', to_char(i.invoice_date, 'DD/MM/YYYY'), 'DueDate', to_char(i.due_date, 'DD/MM/YYYY'),
    'CustomerName', pg_temp.sr_drift(i.client_name, i.id),
    -- One in seven exports drops the GSTIN (the app's field is optional).
    'CustomerGSTIN', case when pg_temp.sr_roll('src-gst|' || i.id) >= 0.14 then i.client_gst_number end,
    'TaxableValue', pg_temp.sr_inr(i.amount), 'TaxAmount', pg_temp.sr_inr(i.gst_amount),
    'InvoiceTotal', pg_temp.sr_inr(i.total_amount), 'Status', upper(i.status))),
  'InvoiceTotal', false,
  -- Fuzzy when the name no longer matches exactly, or the GSTIN is gone.
  case when pg_temp.sr_drift(i.client_name, i.id) <> i.client_name then 'the customer name is written differently'
       when i.client_gst_number is not null and pg_temp.sr_roll('src-gst|' || i.id) < 0.14 then 'the GSTIN is missing in the export' end,
  i.total_amount
from public.nova_invoices i
where i.invoice_date > (select d from sr_asof) - 60;

-- Receipts from the same app: amounts in paise, the payer name drifted.
insert into sr_src
select p.slice_no, 'receipt', 'pay|' || p.id, 'payments', p.id, 'invoicing_app',
  'RC-' || upper(left(md5('rc|' || p.id), 8)), p.payment_date, 1405,
  jsonb_strip_nulls(jsonb_build_object(
    'ReceiptNo', p.payment_number, 'ReceiptDate', to_char(p.payment_date, 'DD/MM/YYYY'),
    'ReceivedFrom', pg_temp.sr_drift(p.client_name, p.id), 'AmountPaise', (p.amount * 100)::bigint,
    'Mode', upper(p.method), 'Reference', p.reference, 'AgainstInvoice', i.invoice_number)),
  'AmountPaise', true,
  case when pg_temp.sr_drift(p.client_name, p.id) <> p.client_name then 'the payer name is written differently' end,
  p.amount
from public.nova_payments p
join public.nova_invoices i on i.id = p.invoice_id
where p.payment_date > (select d from sr_asof) - 60;

-- Collections-account lines from the bank's export: YYYYMMDD dates, blank-or-amount columns.
insert into sr_src
select t.slice_no, 'bank_line', 'btx|' || t.id, 'bank-transactions', t.id, 'bank_export',
  a.account_last4 || '-' || lpad(t.line_no::text, 5, '0'), t.posted_date, 1410,
  jsonb_strip_nulls(jsonb_build_object(
    'txn_date', to_char(t.posted_date, 'YYYYMMDD'), 'value_date', to_char(t.value_date, 'YYYYMMDD'),
    'description', t.raw_narration, 'ref_no', t.bank_ref, 'cheque_no', t.cheque_no,
    'withdrawal', case when t.debit > 0 then pg_temp.sr_inr(t.debit) else '' end,
    'deposit', case when t.credit > 0 then pg_temp.sr_inr(t.credit) else '' end,
    'balance', pg_temp.sr_inr(t.running_balance))),
  -- The bank is the book of record for its own lines: never a planted conflict.
  null, null, null, null
from public.nova_bank_transactions t
join public.nova_bank_accounts a on a.id = t.account_id
where a.purpose = 'collections' and t.value_date > (select d from sr_asof) - 60;

-- The last 20 settlements from the gateway report: its own id, the UTR inside, epoch times, paise.
insert into sr_src
select x.slice_no, 'settlement', 'stl|' || x.id, 'settlements', x.id, 'gateway_report',
  'setl_' || left(md5('setl|' || x.id), 14), x.settlement_date, 1420,
  jsonb_build_object('settlement_id', 'setl_' || left(md5('setl|' || x.id), 14), 'utr', x.settlement_ref,
    'settled_on', extract(epoch from pg_temp.sr_ist(x.settlement_date, 660))::bigint,
    'gross', (x.gross_amount * 100)::bigint, 'refunds', (x.refunds * 100)::bigint, 'chargebacks', (x.chargebacks * 100)::bigint,
    'fees', (x.fees * 100)::bigint, 'tax', (x.gst_on_fees * 100)::bigint, 'adjustments', (x.adjustments * 100)::bigint,
    'net', (x.net_amount * 100)::bigint, 'count', x.txn_count, 'status', x.status),
  -- Settlement totals are reconciled by recomputation (A11), not by a planted conflict.
  null, null, null, null
from (
  -- Newest first within the 60-day window.
  select s.*, row_number() over (partition by s.slice_no order by s.settlement_date desc, s.id) as k
  from public.nova_settlements s
  where s.settlement_date > (select d from sr_asof) - 60
) x
where x.k <= 20;

-- Vendor masters from the procurement portal: its own supplier codes and category codes.
insert into sr_src
select v.slice_no, 'vendor', 'ven|' || v.id, 'vendors', v.id, 'procurement_portal',
  'SUP' || lpad(row_number() over (partition by v.slice_no order by md5('sup|' || v.id))::text, 4, '0'), (select d from sr_asof), 1290,
  jsonb_strip_nulls(jsonb_build_object(
    'SupplierName', pg_temp.sr_drift(v.name, v.id),
    -- One in seven portal records lacks the GSTIN.
    'GSTIN', case when pg_temp.sr_roll('src-gst|' || v.id) >= 0.14 then v.gst_number end,
    'PAN', v.pan, 'State', v.state,
    -- The portal's own three-letter category code.
    'CategoryCode', upper(left(regexp_replace(coalesce(v.category, 'General'), '[^A-Za-z]', '', 'g'), 3)),
    'PaymentTerms', 'NET' || coalesce(v.payment_terms_days, 30), 'Status', upper(coalesce(v.status, 'active')))),
  null, null,
  case when pg_temp.sr_drift(v.name, v.id) <> v.name then 'the supplier name is written differently'
       when v.gst_number is not null and pg_temp.sr_roll('src-gst|' || v.id) < 0.14 then 'the GSTIN is missing in the export' end,
  -- Masters carry no amount to conflict on.
  null
from public.nova_vendors v;
-- The supplier code sits in the payload too, as the portal's key field.
update sr_src set payload = payload || jsonb_build_object('SupplierCode', external_id) where record_type = 'vendor';

-- Client masters from the CRM: account ids, segment codes, snake_case fields.
insert into sr_src
select c.slice_no, 'client', 'cli|' || c.id, 'clients', c.id, 'crm_export',
  'ACC-' || lpad((10000 + row_number() over (partition by c.slice_no order by md5('acc|' || c.id)))::text, 5, '0'), (select d from sr_asof), 1295,
  jsonb_strip_nulls(jsonb_build_object(
    'account_name', pg_temp.sr_drift(c.name, c.id),
    'gstin', case when pg_temp.sr_roll('src-gst|' || c.id) >= 0.14 then c.gst_number end,
    'pan', c.pan, 'state', c.state, 'region', c.region,
    -- The CRM's own segment codes.
    'segment', case c.segment when 'enterprise' then 'ENT' when 'mid_market' then 'MM' when 'smb' then 'SMB' end,
    'credit_limit', case when c.credit_limit is not null then pg_temp.sr_inr(c.credit_limit) end)),
  null, null,
  case when pg_temp.sr_drift(c.name, c.id) <> c.name then 'the account name is written differently'
       when c.gst_number is not null and pg_temp.sr_roll('src-gst|' || c.id) < 0.14 then 'the GSTIN is missing in the export' end,
  -- Masters carry no amount to conflict on.
  null
from public.nova_clients c;
-- The account id sits in the payload as the CRM's key field.
update sr_src set payload = payload || jsonb_build_object('account_id', external_id) where record_type = 'client';

-- Transactional rows not exported at all: 5% of invoices, receipts, bank lines
-- and settlements by hash (the "canonical row with no source record" plant).
delete from sr_src where record_type in ('invoice', 'receipt', 'bank_line', 'settlement') and pg_temp.sr_roll('src-omit|' || key) < 0.05;

-- Gateway captures fill each slice to about 335 exports (captures are the
-- largest pool): the newest ones in the window, 45–130 of them.
insert into sr_src
select x.slice_no, 'gateway_txn', 'gtx|' || x.id, 'gateway-transactions', x.id, 'gateway_report',
  x.gateway_ref, (x.txn_at at time zone 'Asia/Kolkata')::date, 1425,
  jsonb_strip_nulls(jsonb_build_object('id', x.gateway_ref, 'order_id', x.order_ref,
    'created_at', extract(epoch from x.txn_at)::bigint, 'amount', (x.amount * 100)::bigint,
    'fee', (x.fee * 100)::bigint, 'tax', (x.gst_on_fee * 100)::bigint,
    'status', case x.status when 'success' then 'captured' when 'failed' then 'failed' else 'authorized' end,
    'rrn', x.bank_rrn, 'settlement_utr', s.settlement_ref)),
  'amount', true, null, x.amount
from (
  select g.*, row_number() over (partition by g.slice_no order by g.txn_at desc, g.id) as k
  from public.nova_gateway_transactions g
  where g.txn_type = 'capture' and (g.txn_at at time zone 'Asia/Kolkata')::date > (select d from sr_asof) - 60
) x
left join public.nova_settlements s on s.id = x.settlement_id
join (select slice_no, greatest(45, least(130, 335 - count(*)))::int as n from sr_src group by slice_no) t on t.slice_no = x.slice_no
-- 5% of the picked captures are not exported, like the other transactional rows.
where x.k <= t.n and pg_temp.sr_roll('src-omit|gtx|' || x.id) >= 0.05;

-- Three gateway rows per slice with no Nova transaction: shaped like a real
-- capture of the slice, with the id tail taken from another capture so the
-- format matches.
insert into sr_src
select o.slice_no, 'gateway_txn', 'orphan|' || o.slice_no || '|' || o.n, 'gateway-transactions', null, 'gateway_report',
  o.ref, (o.txn_at at time zone 'Asia/Kolkata')::date, 1425,
  jsonb_build_object('id', o.ref, 'order_id', o.order_ref || '-R', 'created_at', extract(epoch from o.txn_at + interval '37 minutes')::bigint,
    'amount', (o.amount * 100)::bigint, 'fee', (o.fee * 100)::bigint, 'tax', (o.gst_on_fee * 100)::bigint, 'status', 'captured'),
  null, null, null, null
from (
  select a.slice_no, a.n, a.txn_at, a.order_ref, a.amount, a.fee, a.gst_on_fee,
    left(a.gateway_ref, length(a.gateway_ref) - 6) || right(b.gateway_ref, 6) as ref
  from (
    -- Three exported captures per slice by hash supply the shape and time.
    select s.slice_no, g.id, g.txn_at, g.order_ref, g.amount, g.fee, g.gst_on_fee, g.gateway_ref,
      row_number() over (partition by s.slice_no order by md5('orphan|' || g.id)) as n
    from sr_src s join public.nova_gateway_transactions g on g.id = s.canonical_id
    where s.record_type = 'gateway_txn'
  ) a
  -- Another capture of the same slice lends its tail.
  cross join lateral (
    select g2.gateway_ref from public.nova_gateway_transactions g2
    where g2.slice_no = a.slice_no and g2.txn_type = 'capture' and g2.id <> a.id
    order by md5('orphan-tail|' || g2.id || a.n) limit 1
  ) b
  where a.n <= 3
) o
-- Never collide with a real gateway reference.
where not exists (select 1 from public.nova_gateway_transactions g where g.slice_no = o.slice_no and g.gateway_ref = o.ref);

-- Conflicting amounts: ~5% of the rows that carry an amount (about 3% of all
-- exports) move by 1–5%, up or down, to the rupee. Orphans are left alone.
update sr_src s set payload = s.payload || jsonb_build_object(s.amount_key,
    case when s.amount_is_paise then ((s.amount + x.delta) * 100)::bigint::text::jsonb else to_jsonb(pg_temp.sr_inr(s.amount + x.delta)) end),
  -- Keep the shift itself for the answer-key note.
  fuzzy_reason = 'conflict:' || x.delta
from (
  select key, round(amount * (0.01 + 0.04 * pg_temp.sr_roll('src-conf-size|' || key))::numeric, 0)
           * case when pg_temp.sr_roll('src-conf-sign|' || key) < 0.5 then -1 else 1 end as delta
  from sr_src
) x
where x.key = s.key and s.amount_key is not null and s.canonical_id is not null
  and pg_temp.sr_roll('src-conf|' || s.key) < 0.05 and x.delta <> 0;

-- Duplicates: 5% of exports appear a second time, re-exported the next night
-- (or five minutes later when the first export ran on the as-of day).
insert into sr_src
select slice_no, record_type, key || '|dup', canonical_resource, canonical_id, source_system, external_id,
  case when export_day < (select d from sr_asof) then export_day + 1 else export_day end,
  case when export_day < (select d from sr_asof) then export_min else export_min + 5 end,
  payload, amount_key, amount_is_paise, 'duplicate', amount
from sr_src
where canonical_id is not null and pg_temp.sr_roll('src-dup|' || key) < 0.05;

-- Write the source records.
insert into public.nova_source_records (id, slice_no, source_system, record_type, external_id, exported_at, payload)
select pg_temp.sr_id('src_', 'nova_source_records', slice_no, key), slice_no, source_system, record_type, external_id,
  -- Nightly export time in IST, a few hashed minutes apart per record.
  pg_temp.sr_ist(export_day, export_min + floor(pg_temp.sr_roll('src-min|' || key) * 4)::int), payload
from sr_src;

-- Write the answer key: one link per source record.
insert into public.nova_source_record_links (source_record_id, slice_no, canonical_resource, canonical_id, match_kind, note)
select pg_temp.sr_id('src_', 'nova_source_records', slice_no, key), slice_no, canonical_resource, canonical_id,
  case when canonical_id is null then 'orphan' when fuzzy_reason = 'duplicate' then 'duplicate'
       when fuzzy_reason like 'conflict:%' then 'conflict' when fuzzy_reason is not null then 'fuzzy' else 'exact' end,
  case when canonical_id is null then 'Reported by the gateway with no matching transaction in Nova.'
       when fuzzy_reason = 'duplicate' then 'A second export of a row this system already exported; it adds nothing new.'
       when fuzzy_reason like 'conflict:%' then 'Same row as the canonical record, but the exported amount differs by Rs '
            || pg_temp.sr_inr(abs(substr(fuzzy_reason, 10)::numeric)) || '.'
       when fuzzy_reason is not null then 'Same row as the canonical record, but ' || fuzzy_reason || '.'
       else 'Same row as the canonical record; only field names and formats differ.' end
from sr_src;

-- -----------------------------------------------------------------------------
-- 12. Self-check (contract §2.2.2): every soft reference resolves to a row in
-- the SAME slice, and every in-file FK child shares its parent's slice. Any
-- failure raises, so the whole transaction rolls back instead of leaving
-- dangling ids after an upstream change.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Count of broken references for the check being run.
  n bigint;
  -- One row per check: its name and the query counting failures.
  c record;
begin
  for c in select * from (values
    ('prq.department_id', 'select count(*) from nova_purchase_requisitions r where not exists (select 1 from nova_departments p where p.id = r.department_id and p.slice_no = r.slice_no)'),
    ('prq.requested_by', 'select count(*) from nova_purchase_requisitions r where not exists (select 1 from nova_employees p where p.id = r.requested_by and p.slice_no = r.slice_no)'),
    ('prq.item_id', 'select count(*) from nova_purchase_requisitions r where r.item_id is not null and not exists (select 1 from nova_inventory p where p.id = r.item_id and p.slice_no = r.slice_no)'),
    ('prq.po_id', 'select count(*) from nova_purchase_requisitions r where r.po_id is not null and not exists (select 1 from nova_purchase_orders p where p.id = r.po_id and p.slice_no = r.slice_no)'),
    ('sqt.vendor_id', 'select count(*) from nova_supplier_quotes r where not exists (select 1 from nova_vendors p where p.id = r.vendor_id and p.slice_no = r.slice_no)'),
    ('sqt.requisition_id', 'select count(*) from nova_supplier_quotes r join nova_purchase_requisitions p on p.id = r.requisition_id where p.slice_no <> r.slice_no'),
    ('ura.employee_id', 'select count(*) from nova_user_role_assignments r where not exists (select 1 from nova_employees p where p.id = r.employee_id and p.slice_no = r.slice_no)'),
    ('ura.granted_by', 'select count(*) from nova_user_role_assignments r where not exists (select 1 from nova_employees p where p.id = r.granted_by and p.slice_no = r.slice_no)'),
    ('ura.role_id', 'select count(*) from nova_user_role_assignments r join nova_roles p on p.id = r.role_id where p.slice_no <> r.slice_no'),
    ('link.source_record_id', 'select count(*) from nova_source_record_links r join nova_source_records p on p.id = r.source_record_id where p.slice_no <> r.slice_no'),
    -- Each canonical resource resolves in its own table.
    ('link.canonical_id', 'select count(*) from nova_source_record_links r where r.canonical_id is not null and not exists (
       select 1 from nova_invoices p where r.canonical_resource = ''invoices'' and p.id = r.canonical_id and p.slice_no = r.slice_no
       union all select 1 from nova_payments p where r.canonical_resource = ''payments'' and p.id = r.canonical_id and p.slice_no = r.slice_no
       union all select 1 from nova_bank_transactions p where r.canonical_resource = ''bank-transactions'' and p.id = r.canonical_id and p.slice_no = r.slice_no
       union all select 1 from nova_gateway_transactions p where r.canonical_resource = ''gateway-transactions'' and p.id = r.canonical_id and p.slice_no = r.slice_no
       union all select 1 from nova_settlements p where r.canonical_resource = ''settlements'' and p.id = r.canonical_id and p.slice_no = r.slice_no
       union all select 1 from nova_vendors p where r.canonical_resource = ''vendors'' and p.id = r.canonical_id and p.slice_no = r.slice_no
       union all select 1 from nova_clients p where r.canonical_resource = ''clients'' and p.id = r.canonical_id and p.slice_no = r.slice_no)')
  ) v(name, q) loop
    -- Run the count for this reference.
    execute c.q into n;
    -- Any broken reference aborts the file.
    if n > 0 then
      raise exception '011 self-check failed: % has % reference(s) with no parent in the same slice', c.name, n;
    end if;
  end loop;
end;
$$;

-- The helper view reads temp tables that drop at commit; drop it first.
drop view sr_held_perm;

-- Temp tables and pg_temp functions go with the session; data lands here.
commit;
