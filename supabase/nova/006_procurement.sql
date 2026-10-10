-- STATUS: VERIFIED 2026-09-29
-- =============================================================================
-- Nova API — Tier 1 procurement: vendor contracts, purchase orders and goods
-- receipts, plus the po_id / grn_id links on purchase bills.
-- Contract: docs/nova-tier1-build-contract.md §5 (procurement) and §6.
-- Run AFTER 001 → 003 → 004 → 005 → 002 (it reads vendors, items, bills,
-- departments, employees and the A1 rows of nova_ground_truth).
--
-- HOW THE DATA HANGS TOGETHER (read this before the seed):
--   * Most bills are PO-backed. For each one, a PO and a GRN are derived FROM
--     the bill, so the three documents match by construction: PO price = bill
--     rate, accepted qty (received − rejected) = billed qty, same GST rate.
--     Rejected units are added to the PO qty, i.e. the vendor billed only what
--     passed inspection.
--   * The rest of each slice's ~175 POs are recent POs not yet billed (open,
--     partially received, received awaiting the bill) or cancelled ones.
--   * The PO approval limit is ₹1,00,000 (pr_meta.po_limit). A7 splits sit
--     just under it.
--   * Planted anomalies are PERTURBATIONS applied during generation (a PO line
--     priced below the bill, a GRN short on one line, ...), never extra rows
--     appended at the end, so ids, numbers and dates give nothing away.
--
-- Deterministic WITHOUT the random() stream: every roll is md5 of a stable
-- key (pg_temp.nova_u below), so no join order or parallel plan can change a
-- value. setseed() is still called because the contract asks every file to.
--
-- Re-runnable: drops its own FKs on nova_purchase_bills, clears po_id/grn_id,
-- truncates its three tables and deletes only its own ground-truth rows
-- (A8, A9, A10, and A7 on purchase-orders; payables owns A7 on payments).
-- =============================================================================

-- One transaction: a failure halfway leaves the previous procurement data intact.
begin;

-- Contract §2 asks for it; harmless, since this file never calls random().
select setseed(0.606);
-- Same contract rule; keeps plans serial so row order in temp tables is stable.
set local max_parallel_workers_per_gather = 0;

-- -----------------------------------------------------------------------------
-- Tables. Conventions from 001: prefixed text ids with a CHECK, numeric(14,2)
-- money, text + CHECK statuses, jsonb line arrays, slice_no on every row.
-- -----------------------------------------------------------------------------

-- Rate contracts: one agreed price per (vendor, item) for a validity window.
create table if not exists public.nova_vendor_contracts (
  -- "vct_…" prefix so an id reveals its type, as everywhere in Nova.
  id text primary key check (id like 'vct\_%'),
  -- The supplier the rate was agreed with; restrict because seed data is never deleted.
  vendor_id text not null references public.nova_vendors(id) on delete restrict,
  -- The stock item the rate covers.
  item_id text not null references public.nova_inventory(id) on delete restrict,
  -- Agreed unit price before GST; strictly positive, a free item is not a contract.
  contract_price numeric(14,2) not null check (contract_price > 0),
  -- Quantity breaks [{min_qty, unit_price}]; jsonb because it is always read whole.
  volume_tiers jsonb not null default '[]'::jsonb check (jsonb_typeof(volume_tiers) = 'array'),
  -- Units per month the vendor committed to supply.
  monthly_capacity integer not null check (monthly_capacity > 0),
  -- Minimum order quantity; an order below it may be refused by the vendor.
  moq integer not null check (moq >= 1),
  -- Agreed days from order to delivery; promised dates on POs derive from it.
  lead_time_days integer not null check (lead_time_days between 1 and 120),
  -- Validity window; "active on date d" means valid_from <= d <= valid_to.
  valid_from date not null,
  valid_to date not null,
  -- timestamptz for the same offset-safety reason as 001.
  created_at timestamptz not null default now(),
  -- Team slice, inherited from the vendor (and equal to the item's).
  slice_no integer not null check (slice_no >= 0),
  -- A window that ends before it starts is a seed bug, not data.
  constraint nova_vendor_contracts_window check (valid_to >= valid_from)
);

-- Purchase orders: what was ordered, from whom, at what price.
create table if not exists public.nova_purchase_orders (
  -- "po_…" prefix.
  id text primary key check (id like 'po\_%'),
  -- Human-facing number, unique so a lookup by number is unambiguous.
  po_number text not null unique,
  -- Supplier ordered from.
  vendor_id text not null references public.nova_vendors(id) on delete restrict,
  -- Requesting department, the budget the spend lands on.
  department_id text not null references public.nova_departments(id) on delete restrict,
  -- Lines [{item_id, qty, unit_price, gst_rate}], always returned with the PO.
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) >= 1),
  -- Sum of line value + line GST, each rounded per line like a GST document.
  total_amount numeric(14,2) not null check (total_amount >= 0),
  -- Date the PO was issued.
  order_date date not null,
  -- Delivery date the vendor committed to (order_date + lead time).
  promised_date date not null,
  -- Lifecycle: closed = received and billed and settled.
  status text not null check (status in ('open', 'partially_received', 'received', 'closed', 'cancelled')),
  -- Buyer who raised it; drives segregation-of-duties checks.
  raised_by text not null references public.nova_employees(id) on delete restrict,
  -- Sourcing route: catalog (no contract for the item), contract (bought from
  -- the contracted vendor), off_contract (item has a contract elsewhere).
  channel text not null check (channel in ('catalog', 'contract', 'off_contract')),
  created_at timestamptz not null default now(),
  -- Inherited from the vendor.
  slice_no integer not null check (slice_no >= 0),
  -- A promise before the order exists is impossible.
  constraint nova_purchase_orders_promise_after_order check (promised_date >= order_date)
);

-- Goods receipts (GRNs): what physically arrived against a PO.
create table if not exists public.nova_goods_receipts (
  -- "grn_…" prefix.
  id text primary key check (id like 'grn\_%'),
  -- Human-facing receipt number, unique.
  grn_number text not null unique,
  -- The PO received against; one PO may have several deliveries.
  po_id text not null references public.nova_purchase_orders(id) on delete restrict,
  -- Date the goods reached the store.
  received_date date not null,
  -- Lines [{item_id, qty_received, qty_rejected, reject_reason}].
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) >= 1),
  -- Storekeeper who signed for the goods.
  received_by text not null references public.nova_employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Inherited from the PO.
  slice_no integer not null check (slice_no >= 0)
);

-- -----------------------------------------------------------------------------
-- Indexes: (slice_no, main date desc) serves every API list (slice pin + default
-- sort); the FK indexes serve child routes and joins, which Postgres does not
-- index on its own.
-- -----------------------------------------------------------------------------
create index if not exists nova_vendor_contracts_slice_idx on public.nova_vendor_contracts (slice_no, valid_from desc);
create index if not exists nova_vendor_contracts_vendor_id_idx on public.nova_vendor_contracts (vendor_id);
create index if not exists nova_vendor_contracts_item_id_idx on public.nova_vendor_contracts (item_id);
create index if not exists nova_purchase_orders_slice_idx on public.nova_purchase_orders (slice_no, order_date desc);
create index if not exists nova_purchase_orders_vendor_id_idx on public.nova_purchase_orders (vendor_id);
create index if not exists nova_purchase_orders_department_id_idx on public.nova_purchase_orders (department_id);
create index if not exists nova_purchase_orders_raised_by_idx on public.nova_purchase_orders (raised_by);
create index if not exists nova_goods_receipts_slice_idx on public.nova_goods_receipts (slice_no, received_date desc);
-- /purchase-orders/{id}/goods-receipts filters po_id then sorts by date.
create index if not exists nova_goods_receipts_po_id_idx on public.nova_goods_receipts (po_id, received_date desc);
create index if not exists nova_goods_receipts_received_by_idx on public.nova_goods_receipts (received_by);
-- The bill-side links this file fills; FK columns need their own index.
create index if not exists nova_purchase_bills_po_id_idx on public.nova_purchase_bills (po_id);
create index if not exists nova_purchase_bills_grn_id_idx on public.nova_purchase_bills (grn_id);

-- -----------------------------------------------------------------------------
-- Read views. Thin select * views, as in 004: the API reads views only, and a
-- derived column can be added later without touching the code. security_invoker
-- so a view can never bypass RLS on the caller's behalf.
-- -----------------------------------------------------------------------------
create or replace view public.nova_vendor_contracts_v with (security_invoker = true) as select * from public.nova_vendor_contracts;
create or replace view public.nova_purchase_orders_v with (security_invoker = true) as select * from public.nova_purchase_orders;
create or replace view public.nova_goods_receipts_v with (security_invoker = true) as select * from public.nova_goods_receipts;

-- -----------------------------------------------------------------------------
-- Lockdown, same as 001: RLS on with no policies, anon/authenticated revoked,
-- service_role granted. Listed explicitly so this file touches only its own objects.
-- -----------------------------------------------------------------------------
alter table public.nova_vendor_contracts enable row level security;
alter table public.nova_purchase_orders enable row level security;
alter table public.nova_goods_receipts enable row level security;
-- anon ships in browsers, authenticated is any signed-up user: neither may read Nova.
revoke all on public.nova_vendor_contracts, public.nova_purchase_orders, public.nova_goods_receipts,
  public.nova_vendor_contracts_v, public.nova_purchase_orders_v, public.nova_goods_receipts_v from anon, authenticated;
-- The server's only credential; write grants on tables match 001's.
grant select, insert, update, delete on public.nova_vendor_contracts, public.nova_purchase_orders, public.nova_goods_receipts to service_role;
-- Views are read-only surfaces for the API.
grant select on public.nova_vendor_contracts_v, public.nova_purchase_orders_v, public.nova_goods_receipts_v to service_role;

-- -----------------------------------------------------------------------------
-- Reset (re-runnability). Drop the bill FKs first: TRUNCATE refuses a table
-- that another table's FK references, and CASCADE would wipe the bills.
-- -----------------------------------------------------------------------------
alter table public.nova_purchase_bills drop constraint if exists nova_purchase_bills_po_id_fkey;
alter table public.nova_purchase_bills drop constraint if exists nova_purchase_bills_grn_id_fkey;
-- Clear only the two columns this file owns; the WHERE avoids rewriting untouched rows.
update public.nova_purchase_bills set po_id = null, grn_id = null where po_id is not null or grn_id is not null;
-- GRNs reference POs, so both go in one statement; no CASCADE on purpose.
truncate table public.nova_goods_receipts, public.nova_purchase_orders, public.nova_vendor_contracts;
-- Only this file's answer-key rows; A7 on payments belongs to the payables file.
delete from public.nova_ground_truth
where anomaly_code in ('A8', 'A9', 'A10') or (anomaly_code = 'A7' and resource = 'purchase-orders');

-- -----------------------------------------------------------------------------
-- Seed helpers and base sets.
-- -----------------------------------------------------------------------------

-- Deterministic uniform roll in [0, 1) from a text key: the first 32 bits of
-- md5 as an unsigned integer over 2^32. Same key → same value on every run and
-- every plan, which random() cannot promise once joins are involved. pg_temp
-- so it vanishes with the session and never lands in the public schema.
create or replace function pg_temp.nova_u(p_key text) returns numeric
language sql immutable as $$ select ('x' || substr(md5(p_key), 1, 8))::bit(32)::bigint / 4294967296.0 $$;

-- Frozen clock and the approval limit, read once. Contract §1: never current_date.
create temp table pr_meta on commit drop as
select m.as_of_date as as_of, 100000.00::numeric(14,2) as po_limit
from public.nova_dataset_meta m where m.id;

-- Fail loudly rather than seed NULL dates if 005 has not run.
do $$ begin
  -- A missing as-of date would make every date below NULL and violate NOT NULL late and obscurely.
  if (select as_of from pr_meta) is null then raise exception '006: nova_dataset_meta.as_of_date is missing; run 005 first'; end if;
end $$;

-- Vendors per slice. ka ranks the ACTIVE ones in a hashed order, so "pick the
-- k-th active vendor" is one equality join; blocked or unverified vendors get
-- no new orders, but their existing bills still get POs.
create temp table pr_vendor on commit drop as
select v.id, v.slice_no, v.name, coalesce(v.status, 'active') = 'active' as active,
  -- Hashed rank among active vendors; NULL for inactive ones.
  case when coalesce(v.status, 'active') = 'active' then
    row_number() over (partition by v.slice_no, coalesce(v.status, 'active') = 'active' order by md5('prv' || v.id)) end as ka,
  -- Active-vendor count per slice, the modulus for picks.
  count(*) filter (where coalesce(v.status, 'active') = 'active') over (partition by v.slice_no) as na
from public.nova_vendors v;

-- Items per slice with a lead time. 005 may leave lead_time_days null; a
-- hashed 5–16 days stands in so every promised date is computable.
create temp table pr_item on commit drop as
select i.id, i.slice_no, i.name, i.gst_rate, i.purchase_price,
  greatest(1, coalesce(i.lead_time_days, 5 + floor(pg_temp.nova_u('lead' || i.id) * 12)::int)) as lead,
  -- Hashed rank for "pick the k-th item".
  row_number() over (partition by i.slice_no order by md5('pri' || i.id)) as k,
  count(*) over (partition by i.slice_no) as n
from public.nova_inventory i;

-- Departments per slice, hashed rank for picks.
create temp table pr_dept on commit drop as
select d.id, d.slice_no, d.name,
  row_number() over (partition by d.slice_no order by md5('prd' || d.id)) as k,
  count(*) over (partition by d.slice_no) as n
from public.nova_departments d;

-- Employees with the two roles procurement needs: buyers raise POs (the
-- Procurement department), stores/operations staff sign GRNs.
create temp table pr_emp on commit drop as
select e.id, e.slice_no, e.department_id, e.join_date, e.exit_date,
  d.name ~* '(procure|purchas)' as buyer,
  d.name ~* '(operation|store|warehouse|logistic)' as receiver
from public.nova_employees e
join public.nova_departments d on d.id = e.department_id;

-- Temp tables get no autovacuum statistics and no indexes; both are added by
-- hand so the correlated lookups below are index probes, not repeated scans.
create index on pr_emp (slice_no);
analyze pr_emp;
-- Picks join on (slice_no, k) / (slice_no, ka).
create index on pr_item (slice_no, k);
create index on pr_vendor (slice_no, ka);
create index on pr_dept (slice_no, k);
-- Statistics for the three pick tables.
analyze pr_item; analyze pr_vendor; analyze pr_dept;

-- -----------------------------------------------------------------------------
-- Bill lines. item_id is taken from the line if 002 wrote one, else matched by
-- description to the slice's own inventory (002 copies the item name into
-- the line). A line that maps to no item marks its bill as non-PO spend.
-- -----------------------------------------------------------------------------
create temp table pr_bill_line on commit drop as
select b.id as bill_id, b.slice_no, l.ord::int as line_no,
  coalesce(l.v ->> 'item_id', im.id) as item_id,
  -- Tolerates either key spelling so a 002 rename cannot silently zero the qty.
  coalesce(l.v ->> 'quantity', l.v ->> 'qty')::numeric as qty,
  coalesce(l.v ->> 'rate', l.v ->> 'unit_price')::numeric as rate,
  (l.v ->> 'gst_rate')::numeric as gst_rate
from public.nova_purchase_bills b
cross join lateral jsonb_array_elements(b.items) with ordinality as l(v, ord)
-- Lowest id wins if two items share a name, so the match is deterministic.
left join lateral (
  select i.id from public.nova_inventory i
  where i.slice_no = b.slice_no and i.name = l.v ->> 'description' order by i.id limit 1
) im on true;
-- Every later step looks lines up by bill.
create index on pr_bill_line (bill_id);
analyze pr_bill_line;

-- Bill headers with the facts the role choice needs.
create temp table pr_bill on commit drop as
select b.id, b.slice_no, b.vendor_id, b.bill_date, b.status,
  -- Every line must map to a priced stock item for a PO to be derivable.
  bool_and(l.item_id is not null and l.qty > 0 and l.rate > 0 and l.gst_rate is not null) as eligible,
  -- Largest line qty: qty perturbations need room (>= 4 units) to stay positive.
  max(l.qty) as max_qty
from public.nova_purchase_bills b
join pr_bill_line l on l.bill_id = b.id
group by b.id, b.slice_no, b.vendor_id, b.bill_date, b.status;

-- A1 duplicates (planted by 002): the later bill of each pair is linked to the
-- original's PO and GRN, which is exactly how a duplicate bill looks in real
-- AP — two invoices against one order. Decoy A1 rows are ordinary bills.
create temp table pr_dup on commit drop as
select x.bill_id, x.orig_id from (
  select b.id as bill_id,
    -- Earliest bill in the group is the original.
    first_value(b.id) over (partition by g.id order by b.bill_date, b.id) as orig_id,
    row_number() over (partition by g.id order by b.bill_date, b.id) as rn
  from public.nova_ground_truth g
  join public.nova_purchase_bills b on b.id = any (g.record_ids)
  where g.anomaly_code = 'A1' and not g.is_decoy
) x where x.rn > 1;

-- PO-backed bills: up to 130 per slice (≈ 70% of eligible), hashed choice.
-- The rest are non-PO spend (small or direct purchases), as in real books.
create temp table pr_bb on commit drop as
select x.id, x.slice_no, x.vendor_id, x.bill_date, x.status, x.max_qty from (
  select b.*,
    row_number() over (partition by b.slice_no order by md5('bb' || b.id)) as r,
    count(*) over (partition by b.slice_no) as n_eligible
  from pr_bill b
  where b.eligible and not exists (select 1 from pr_dup d where d.bill_id = b.id)
) x where x.r <= least(130, ceil(x.n_eligible * 0.7));

-- A10 candidates: the two active vendors with the most PO-backed bills in the
-- last four months (rk 1–2, deteriorating) and the third (rk 3, the decoy that
-- has one bad month and recovers). Busy vendors, so the trend has data points.
create temp table pr_a10v on commit drop as
select t.slice_no, t.vendor_id, t.rk from (
  select b.slice_no, b.vendor_id,
    row_number() over (partition by b.slice_no
      order by count(*) filter (where b.bill_date >= m.as_of - 120) desc, count(*) desc, md5('a10' || b.vendor_id)) as rk
  from pr_bb b cross join pr_meta m
  join pr_vendor v on v.id = b.vendor_id and v.active
  group by b.slice_no, b.vendor_id
) t where t.rk <= 3;

-- A9 roles: 5% of each slice's bills (contract §6), drawn in hashed order from
-- PO-backed bills with room to perturb, excluding A10 vendors (whose receipts
-- carry their own signal) and A1 originals (whose PO a duplicate shares).
-- Type mix per 10: 3 qty, 3 price, 3 no_grn, 1 gst. The next 2 are decoys.
create temp table pr_bb_role on commit drop as
select c.id as bill_id,
  case when c.r <= c.k9 then (array['qty', 'price', 'no_grn', 'qty', 'price', 'no_grn', 'gst', 'qty', 'price', 'no_grn'])[1 + (c.r - 1) % 10]
       else 'split_decoy' end as role
from (
  select b.id,
    row_number() over (partition by b.slice_no order by md5('a9' || b.id)) as r,
    -- Target count from ALL bills in the slice, not just candidates.
    greatest(1, round(0.05 * (select count(*) from public.nova_purchase_bills pb where pb.slice_no = b.slice_no)))::int as k9
  from pr_bb b
  where b.max_qty >= 4
    and not exists (select 1 from pr_a10v a where a.vendor_id = b.vendor_id)
    and not exists (select 1 from pr_dup d where d.orig_id = b.id)
) c where c.r <= c.k9 + 2;

-- -----------------------------------------------------------------------------
-- Delivery behaviour, shared by bill-backed and unbilled POs so both follow one
-- rule. a10: 0 ordinary, 1–2 deteriorating vendor, 3 = a delivery inside the
-- A10 decoy vendor's one bad month (callers pass 0 for its other months).
-- mb: whole months back from the as-of date (0 = the most recent 30 days).
-- -----------------------------------------------------------------------------

-- Days late against the promised date (negative = early).
create or replace function pg_temp.nova_delay(p_a10 int, p_mb int, p_key text) returns int
language sql immutable as $$
  select case
    -- A10: 3, 6, 9, 12 days late (+0–2) over the last four months, a clear upward trend.
    when p_a10 in (1, 2) and p_mb <= 3 then (4 - p_mb) * 3 + floor(pg_temp.nova_u(p_key || 'b') * 3)::int
    -- Before that the same vendors were reliable (0–1 days), so the trend has a baseline.
    when p_a10 in (1, 2) then floor(pg_temp.nova_u(p_key || 'b') * 2)::int
    -- Decoy's bad month: 8–12 days late; its other months are ordinary.
    when p_a10 = 3 then 8 + floor(pg_temp.nova_u(p_key || 'b') * 5)::int
    -- Everyone else: 15% early by 1–2 days, 60% on time, 25% late by 1–4 days.
    when pg_temp.nova_u(p_key) < 0.15 then -1 - floor(pg_temp.nova_u(p_key || 'b') * 2)::int
    when pg_temp.nova_u(p_key) < 0.75 then 0
    else 1 + floor(pg_temp.nova_u(p_key || 'b') * 4)::int
  end
$$;

-- Units rejected at inspection for a line of p_qty delivered units.
create or replace function pg_temp.nova_rej(p_a10 int, p_mb int, p_qty numeric, p_key text) returns numeric
language sql immutable as $$
  select case
    -- A10: rejection rate 3%, 6%, 9%, 12% over the last four months, on most lines.
    when p_a10 in (1, 2) and p_mb <= 3 and p_qty >= 5 and pg_temp.nova_u(p_key) < 0.85 then greatest(1, round(p_qty * (4 - p_mb) * 0.03))
    -- Decoy's bad month shows rejections too (8%).
    when p_a10 = 3 and p_qty >= 5 then greatest(1, round(p_qty * 0.08))
    -- Deteriorating vendors are otherwise clean, so the trend stands out against their own past.
    when p_a10 in (1, 2, 3) then 0
    -- Ordinary vendors: 8% of sizeable lines lose 1–5% at inspection.
    when p_qty >= 10 and pg_temp.nova_u(p_key) < 0.08 then greatest(1, round(p_qty * (0.01 + 0.04 * pg_temp.nova_u(p_key || 'q'))))
    else 0
  end::numeric
$$;

-- Reason text for a rejection, from a short neutral phrase bank.
create or replace function pg_temp.nova_reason(p_key text) returns text
language sql immutable as $$
  select (array['damaged in transit', 'failed quality inspection', 'wrong specification', 'short shelf life', 'packaging torn'])[1 + floor(pg_temp.nova_u(p_key) * 5)::int]
$$;

-- -----------------------------------------------------------------------------
-- Bill-backed POs: header facts derived from the bill.
-- -----------------------------------------------------------------------------
create temp table pr_bb_head on commit drop as
select b.id as bill_id, b.slice_no, b.vendor_id, b.bill_date, b.status as bill_status,
  -- normal unless chosen for an A9 plant or decoy above.
  coalesce(r.role, 'normal') as role,
  coalesce(a.rk, 0)::int as a10,
  -- Keyed on the bill id: stable across reruns, and says nothing about the plant.
  'po_' || left(md5('po-' || b.id), 8) as po_id,
  -- A PO waits for its slowest item.
  (select max(i.lead) from pr_bill_line l join pr_item i on i.id = l.item_id where l.bill_id = b.id) as lead,
  -- Goods arrive 2 days before to 3 days after the invoice date, never after the as-of date.
  g.grn_date,
  -- Split-receipt decoy: an earlier first delivery 4–9 days before the second.
  case when r.role = 'split_decoy' then g.grn_date - 4 - floor(pg_temp.nova_u('g1' || b.id) * 6)::int else g.grn_date end as first_date
from pr_bb b
cross join pr_meta m
left join pr_bb_role r on r.bill_id = b.id
left join pr_a10v a on a.vendor_id = b.vendor_id
cross join lateral (select least(m.as_of, b.bill_date + floor(pg_temp.nova_u('gd' || b.id) * 6)::int - 2) as grn_date) g;

-- The decoy's bad month: whichever month 4–8 back holds most of its
-- deliveries (5 if it has none), so the one-off shows in every slice.
alter table pr_a10v add column dmb int not null default 5;
update pr_a10v a set dmb = x.mb
from (
  select distinct on (h.vendor_id) h.vendor_id, ((m.as_of - h.first_date) / 30)::int as mb
  from pr_bb_head h cross join pr_meta m
  where h.a10 = 3 and h.role <> 'no_grn' and (m.as_of - h.first_date) / 30 between 4 and 8
  group by h.vendor_id, 2 order by h.vendor_id, count(*) desc, 2
) x where x.vendor_id = a.vendor_id;
-- Only the bad month keeps code 3; the decoy vendor's other deliveries are ordinary.
update pr_bb_head h set a10 = 0
from pr_a10v a, pr_meta m
where a.vendor_id = h.vendor_id and a.rk = 3 and ((m.as_of - h.first_date) / 30)::int <> a.dmb;

-- Dates worked BACKWARDS from the first delivery: promised = delivery − delay,
-- order = promised − lead. That is what lets the delay trend be planted exactly.
create temp table pr_bb_po on commit drop as
select h.*, x.mb, x.delay,
  h.first_date - x.delay - h.lead as order_date,
  h.first_date - x.delay as promised_date
from pr_bb_head h
cross join pr_meta m
cross join lateral (select ((m.as_of - h.first_date) / 30)::int as mb) mm
cross join lateral (select mm.mb,
  -- no_grn has no delivery; a small nominal slack keeps its dates plausible.
  case when h.role = 'no_grn' then floor(pg_temp.nova_u('ng' || h.bill_id) * 3)::int
       -- Floored at 1 − lead so a delivery can never precede the day after ordering.
       else greatest(1 - h.lead, pg_temp.nova_delay(h.a10, mm.mb, 'dl' || h.bill_id)) end as delay) x;

-- Bill-backed PO lines. Normal: PO qty = billed + rejected, price and GST equal
-- the bill. A9 plants perturb the bill's largest line (the "target"):
--   qty    → GRN received 10–25% short of billed, nothing rejected;
--   price  → PO unit price 7–14% below the bill rate;
--   gst    → PO GST slab differs from the bill's;
--   no_grn → nothing received at all.
create temp table pr_bb_ln on commit drop as
select h.po_id, h.bill_id, h.slice_no, h.role, h.a10, h.mb, l.line_no, l.item_id,
  l.qty as bill_qty, l.rate, l.gst_rate, t.is_target, rj.rej,
  -- Ordered qty: rejected units were ordered too; the vendor billed only accepted ones.
  l.qty + rj.rej as po_qty,
  case when h.role = 'price' and t.is_target then round(l.rate * (0.86 + 0.07 * pg_temp.nova_u('pp' || h.bill_id)), 2) else l.rate end as po_price,
  -- 18 ↔ 5, and 0 → 5: always a legal slab, always a different one.
  case when h.role = 'gst' and t.is_target then case l.gst_rate when 18 then 5 when 5 then 18 else 5 end else l.gst_rate end as po_gst,
  -- Units delivered in total.
  case when h.role = 'qty' and t.is_target then l.qty - greatest(1, floor(l.qty * (0.10 + 0.15 * pg_temp.nova_u('qs' || h.bill_id))))
       when h.role = 'no_grn' then 0
       else l.qty + rj.rej end as recv
from pr_bb_po h
join pr_bill_line l on l.bill_id = h.bill_id
-- Largest line, lowest line_no on a tie, so exactly one target per bill.
cross join lateral (select l.line_no = (select l2.line_no from pr_bill_line l2 where l2.bill_id = h.bill_id order by l2.qty desc, l2.line_no limit 1) as is_target) t
-- Plants and the split decoy keep rejections at zero so their arithmetic reads cleanly.
cross join lateral (select case when h.role in ('qty', 'split_decoy', 'no_grn') then 0
  else pg_temp.nova_rej(h.a10, h.mb, l.qty, 'rj' || h.bill_id || '-' || l.line_no) end as rej) rj;
-- Looked up by PO, by bill and by item in the contract and answer-key steps.
create index on pr_bb_ln (po_id);
create index on pr_bb_ln (item_id);
analyze pr_bb_ln;

-- Receipt lines for every PO, bill-backed now and unbilled later. seq numbers
-- deliveries within a PO; the bill links to the highest seq.
create temp table pr_grn_ln (
  -- PO received against.
  po_id text not null,
  -- Delivery number within the PO.
  seq int not null,
  -- Delivery date.
  received_date date not null,
  -- Line order inside the GRN.
  line_no int not null,
  item_id text not null,
  -- Units that arrived, and how many of them failed inspection.
  qty_received numeric not null,
  qty_rejected numeric not null
) on commit drop;

-- One delivery for every bill-backed PO except no_grn and the split decoy.
insert into pr_grn_ln (po_id, seq, received_date, line_no, item_id, qty_received, qty_rejected)
select l.po_id, 1, h.grn_date, l.line_no, l.item_id, l.recv, l.rej
from pr_bb_ln l join pr_bb_po h on h.po_id = l.po_id
where h.role not in ('no_grn', 'split_decoy');

-- Split decoy: 60% arrives first, the rest later; zero-unit lines are omitted
-- (a GRN lists only what arrived). The bill matches the PO, not either GRN alone.
insert into pr_grn_ln (po_id, seq, received_date, line_no, item_id, qty_received, qty_rejected)
select l.po_id, s.seq, case s.seq when 1 then h.first_date else h.grn_date end, l.line_no, l.item_id,
  case s.seq when 1 then floor(l.po_qty * 0.6) else l.po_qty - floor(l.po_qty * 0.6) end, 0
from pr_bb_ln l join pr_bb_po h on h.po_id = l.po_id
cross join (values (1), (2)) as s(seq)
where h.role = 'split_decoy'
  and case s.seq when 1 then floor(l.po_qty * 0.6) else l.po_qty - floor(l.po_qty * 0.6) end > 0;

-- -----------------------------------------------------------------------------
-- Vendor contracts: 15 per slice, one per item, each with the vendor that
-- supplies that item most often on PO-backed bills. You contract for what you
-- buy repeatedly, so contracts land on real, recurring purchases.
-- -----------------------------------------------------------------------------

-- Per-item reference facts from PO-backed lines (all vendors in the slice).
create temp table pr_ref on commit drop as
select i.id as item_id, i.slice_no, i.gst_rate, i.lead,
  -- The highest price actually paid on a PO. Using the max means no ordinary
  -- PO is ever above the contract or reference price: only plants are.
  coalesce(max(l.po_price), i.purchase_price) as ref_price,
  -- Typical order size, for unbilled POs of the same item.
  coalesce(percentile_disc(0.5) within group (order by l.bill_qty), 20) as typ_q,
  -- How many PO lines exist, so a price premium has something to compare against.
  count(l.po_id) as n_lines
from pr_item i
left join pr_bb_ln l on l.item_id = i.id
group by i.id, i.slice_no, i.gst_rate, i.lead, i.purchase_price;
-- Probed per slice and per item by every unbilled-PO pick.
create index on pr_ref (slice_no);
create index on pr_ref (item_id);
analyze pr_ref;

-- (vendor, item) purchase history among active vendors.
create temp table pr_pair on commit drop as
select h.slice_no, h.vendor_id, l.item_id,
  count(*) as cnt, min(l.po_qty) as min_q, max(l.po_qty) as max_q,
  -- Best vendor per item first; md5 breaks ties deterministically.
  row_number() over (partition by h.slice_no, l.item_id order by count(*) desc, md5('pair' || h.vendor_id)) as vr
from pr_bb_ln l
join pr_bb_po h on h.po_id = l.po_id
join pr_vendor v on v.id = h.vendor_id and v.active
group by h.slice_no, h.vendor_id, l.item_id;

-- The 15 most-bought items per slice, with their best vendor.
create temp table pr_ctr0 on commit drop as
select p.*, r.ref_price, r.lead,
  -- MOQ at half the smallest order ever placed, so ordinary POs never breach it.
  greatest(1, floor(p.min_q * 0.5))::int as moq,
  row_number() over (partition by p.slice_no order by p.cnt desc, md5('ctr' || p.item_id)) as ir
from pr_pair p
join pr_ref r on r.item_id = p.item_id
where p.vr = 1;
-- Probed by vendor and item when picking vendors for unbilled POs.
create index on pr_pair (vendor_id);
create index on pr_pair (item_id);
analyze pr_pair;

-- Roles for the contracts A8 needs. moq_decoy takes the contract with the
-- largest MOQ (it must be >= 3 for a below-MOQ order to exist); the others
-- are hashed: 1–2 above-contract plants, 3–4 off-contract plants, 5 expiry
-- decoy, the rest ordinary. Validity windows follow the role.
create temp table pr_ctr on commit drop as
select c.*, v.valid_from, v.valid_from + v.days as valid_to
from (
  select m.*,
    'vct_' || left(md5('vct-' || m.slice_no || '-' || m.item_id), 8) as contract_id,
    case when m.is_moqd then 'moq_decoy'
         else coalesce((array['above1', 'above2', 'off1', 'off2', 'exp_decoy'])[m.hr], 'normal') end as role
  from (
    -- Rank again with the decoy candidate sorted last (false < true), so it never takes a plant slot.
    select q.*, row_number() over (partition by q.slice_no order by q.is_moqd, md5('hr' || q.item_id))::int as hr
    from (
      select c0.*, (row_number() over (partition by c0.slice_no order by c0.moq desc, md5('mq' || c0.item_id)) = 1 and c0.moq >= 3) as is_moqd
      from pr_ctr0 c0 where c0.ir <= 15
    ) q
  ) m
) c
cross join pr_meta mt
cross join lateral (select case
  -- Expiry decoy: a one-year contract that ended 60–79 days ago.
  when c.role = 'exp_decoy' then mt.as_of - 60 - floor(pg_temp.nova_u('vt' || c.contract_id) * 20)::int - 364
  -- Plant contracts: two-year terms active across the whole recent window.
  when c.role in ('above1', 'above2', 'off1', 'off2', 'moq_decoy') then mt.as_of - 250 - floor(pg_temp.nova_u('vf' || c.contract_id) * 100)::int
  -- Ordinary: started 330–419 days ago, so some have lapsed and some run on.
  else mt.as_of - 330 - floor(pg_temp.nova_u('vf' || c.contract_id) * 90)::int
end as valid_from,
case
  when c.role = 'exp_decoy' then 364
  when c.role in ('above1', 'above2', 'off1', 'off2', 'moq_decoy') then 729
  -- 30% of ordinary contracts are two-year terms.
  when pg_temp.nova_u('vd' || c.contract_id) < 0.3 then 729 else 364
end as days) v;
-- "Does this item have a contract?" is asked for every candidate item.
create index on pr_ctr (item_id);
create index on pr_ctr (slice_no, role);
analyze pr_ctr;

-- Contracts. The price is the reference price, so ordinary contract buys sit
-- exactly at it. Tier breaks start above 1.5x the largest order ever placed:
-- a real rate card, but one no ordinary PO qualifies for, so no false leakage.
insert into public.nova_vendor_contracts (id, vendor_id, item_id, contract_price, volume_tiers, monthly_capacity, moq, lead_time_days, valid_from, valid_to, created_at, slice_no)
select c.contract_id, c.vendor_id, c.item_id, c.ref_price,
  jsonb_build_array(
    jsonb_build_object('min_qty', c.moq, 'unit_price', c.ref_price),
    jsonb_build_object('min_qty', t.t2, 'unit_price', round(c.ref_price * 0.97, 2)),
    jsonb_build_object('min_qty', t.t2 * 2, 'unit_price', round(c.ref_price * 0.94, 2))),
  -- Capacity comfortably above demand, rounded to tens like a negotiated figure.
  (ceil(greatest(c.max_q * 2, c.moq * 4) / 10.0) * 10)::int,
  c.moq,
  -- The item's own lead time, so contract and PO promised dates agree.
  least(120, c.lead),
  c.valid_from, c.valid_to,
  -- Signed a week before it took effect.
  ((c.valid_from - 7) + time '11:00') at time zone 'Asia/Kolkata',
  c.slice_no
from pr_ctr c
cross join lateral (select (ceil(c.max_q * 1.5 / 10.0) * 10)::int as t2) t;

-- -----------------------------------------------------------------------------
-- Unbilled POs: 175 minus the bill-backed count per slice (at least 40). Each
-- gets a role from a HASHED rank, so which PO number carries a plant differs
-- per slice and follows no pattern. Rank → role:
--   1–4 A7 cluster 1 · 5–7 A7 cluster 2 · 8–10 A7 decoy · 11–12 A8 above
--   contract · 13–14 A8 off contract · 15–16 A8 vendor premium · 17 A8 MOQ
--   decoy · 18 A8 expiry decoy · 19–22 A10 recent orders · 23–27 cancelled ·
--   rest ordinary. A role whose prerequisite is missing falls back to ordinary.
-- -----------------------------------------------------------------------------
create temp table pr_own0 on commit drop as
select s.slice_no, g.n, 'po_' || left(md5('po-' || s.slice_no || '-o-' || g.n), 8) as po_id,
  row_number() over (partition by s.slice_no order by md5('own-role' || s.slice_no || '-' || g.n))::int as r
from (
  -- Every slice that has vendors, even one with no PO-backed bills.
  select v.slice_no, greatest(40, 175 - coalesce(max(b.cnt), 0))::int as own_n
  from (select distinct slice_no from pr_vendor) v
  left join (select slice_no, count(*) as cnt from pr_bb group by slice_no) b on b.slice_no = v.slice_no
  group by v.slice_no
) s
cross join lateral generate_series(1, s.own_n) as g(n);

-- One row per unbilled PO, filled by one INSERT per role family below.
create temp table pr_own (
  po_id text primary key, slice_no int not null, n int not null,
  -- Role, plus cluster number and member index for multi-PO patterns.
  role text not null, grp int, m int,
  vendor_id text not null, item_id text not null, dept_id text not null,
  qty numeric not null, price numeric not null, order_date date not null,
  -- Local IST wall-clock time; A7's 48-hour window lives here.
  local_ts timestamp not null,
  -- Same key → same buyer, which is how a split cluster shares one raiser.
  raise_key text not null,
  -- The contract a plant is measured against, for the answer key.
  contract_id text,
  -- Status family for ordinary POs: open / partially_received / received.
  sub text
) on commit drop;

-- A7 clusters: same vendor, item, department and buyer; created 0, 6, 23 and
-- 41 hours after a base time (+ up to 50 min), so all within 48 hours; each
-- total 90–99% of the limit. Item: no contract, cheap enough for >= 15 units.
insert into pr_own (po_id, slice_no, n, role, grp, m, vendor_id, item_id, dept_id, qty, price, order_date, local_ts, raise_key)
select o.po_id, o.slice_no, o.n, 'a7', g.grp, g.m, v.id, it.item_id, d.id,
  floor(mt.po_limit * (0.90 + 0.09 * pg_temp.nova_u('a7a' || o.po_id)) / (it.ref_price * (1 + it.gst_rate / 100.0))),
  it.ref_price, t.ts::date, t.ts, 'a7-' || o.slice_no || '-' || g.grp
from pr_own0 o
cross join pr_meta mt
cross join lateral (select case when o.r <= 4 then 1 else 2 end as grp, case when o.r <= 4 then o.r else o.r - 4 end as m) g
join pr_vendor v on v.slice_no = o.slice_no and v.ka = 1 + floor(pg_temp.nova_u('a7v' || o.slice_no || '-' || g.grp) * v.na)::int
-- Cluster 1 takes the first eligible item in hashed order, cluster 2 the second.
join lateral (
  select r.item_id, r.ref_price, r.gst_rate from pr_ref r
  where r.slice_no = o.slice_no and r.ref_price * (1 + r.gst_rate / 100.0) <= mt.po_limit / 15
    and not exists (select 1 from pr_ctr c where c.item_id = r.item_id)
  order by md5('a7i' || r.item_id) offset g.grp - 1 limit 1
) it on true
join pr_dept d on d.slice_no = o.slice_no and d.k = 1 + floor(pg_temp.nova_u('a7d' || o.slice_no || '-' || g.grp) * d.n)::int
cross join lateral (select ((mt.as_of - 12 - floor(pg_temp.nova_u('a7t' || o.slice_no || '-' || g.grp) * 70)::int) + time '10:00')
  + make_interval(hours => (array[0, 6, 23, 41])[g.m], mins => floor(pg_temp.nova_u('a7m' || o.po_id) * 50)::int) as ts) t
where o.r <= 7;

-- A7 decoy: one vendor, three POs inside 48 hours, each under the limit — but
-- three different items for three different departments: separate needs.
insert into pr_own (po_id, slice_no, n, role, grp, m, vendor_id, item_id, dept_id, qty, price, order_date, local_ts, raise_key)
select o.po_id, o.slice_no, o.n, 'a7d', 0, o.r - 7, v.id, it.id, d.id,
  greatest(1, floor(mt.po_limit * (0.45 + 0.40 * pg_temp.nova_u('a7da' || o.po_id)) / (rf.ref_price * (1 + rf.gst_rate / 100.0)))),
  rf.ref_price, t.ts::date, t.ts, o.po_id
from pr_own0 o
cross join pr_meta mt
join pr_vendor v on v.slice_no = o.slice_no and v.ka = 1 + floor(pg_temp.nova_u('a7dv' || o.slice_no) * v.na)::int
-- Items 7 hash-ranks apart and consecutive departments: always distinct.
join pr_item it on it.slice_no = o.slice_no and it.k = 1 + (floor(pg_temp.nova_u('a7di' || o.slice_no) * it.n)::int + (o.r - 7) * 7) % it.n
join pr_ref rf on rf.item_id = it.id
join pr_dept d on d.slice_no = o.slice_no and d.k = 1 + (floor(pg_temp.nova_u('a7dd' || o.slice_no) * d.n)::int + o.r - 7) % d.n
cross join lateral (select ((mt.as_of - 12 - floor(pg_temp.nova_u('a7dt' || o.slice_no) * 70)::int) + time '10:30')
  + make_interval(hours => (array[0, 20, 38])[o.r - 7]) as ts) t
where o.r between 8 and 10;

-- A8 plants and decoys measured against a contract. Vendor: the contracted
-- one (above, expiry decoy) or another active vendor (off-contract, MOQ decoy).
insert into pr_own (po_id, slice_no, n, role, vendor_id, item_id, dept_id, qty, price, order_date, local_ts, raise_key, contract_id)
select o.po_id, o.slice_no, o.n, x.role, v.id, c.item_id, d.id, q.qty,
  round(c.ref_price * x.mult, 2), dt.d, dt.d + make_interval(hours => 9 + floor(pg_temp.nova_u('h' || o.po_id) * 8)::int), o.po_id, c.contract_id
from pr_own0 o
cross join pr_meta mt
cross join lateral (select case o.r when 11 then 'above1' when 12 then 'above2' when 13 then 'off1' when 14 then 'off2' when 17 then 'moq_decoy' when 18 then 'exp_decoy' end as crole) cr
join pr_ctr c on c.slice_no = o.slice_no and c.role = cr.crole
join pr_vendor cv on cv.id = c.vendor_id
cross join lateral (select
  case when cr.crole like 'above%' then 'a8_above' when cr.crole like 'off%' then 'a8_off' else 'a8d_' || split_part(cr.crole, '_', 1) end as role,
  -- Premiums: above contract +8–20%, off contract +15–30%, MOQ decoy +12–22%, post-expiry +8–14%.
  case when cr.crole like 'above%' then 1.08 + 0.12 * pg_temp.nova_u('pm' || o.po_id)
       when cr.crole like 'off%' then 1.15 + 0.15 * pg_temp.nova_u('pm' || o.po_id)
       when cr.crole = 'moq_decoy' then 1.12 + 0.10 * pg_temp.nova_u('pm' || o.po_id)
       else 1.08 + 0.06 * pg_temp.nova_u('pm' || o.po_id) end as mult,
  -- Another vendor: a hashed pick among the other na − 1 active vendors.
  1 + floor(pg_temp.nova_u('ov' || o.po_id) * (cv.na - 1))::int as p) x
join pr_vendor v on v.slice_no = o.slice_no and v.ka = case
  when cr.crole in ('above1', 'above2', 'exp_decoy') then cv.ka
  when x.p >= cv.ka then x.p + 1 else x.p end
join pr_dept d on d.slice_no = o.slice_no and d.k = 1 + floor(pg_temp.nova_u('dp' || o.po_id) * d.n)::int
-- MOQ decoy orders 40% of the MOQ; the rest a normal-sized order at or above it.
cross join lateral (select case when cr.crole = 'moq_decoy' then greatest(1, floor(c.moq * 0.4))
  else greatest(c.moq, round(c.max_q * (0.5 + 0.4 * pg_temp.nova_u('qq' || o.po_id)))) end as qty) q
-- Plants fall in the last 5–84 days; the expiry decoy between 10 days after expiry and 5 days ago.
cross join lateral (select case when cr.crole = 'exp_decoy'
  then c.valid_to + 10 + floor(pg_temp.nova_u('od' || o.po_id) * greatest(1, mt.as_of - c.valid_to - 15))::int
  else mt.as_of - 5 - floor(pg_temp.nova_u('od' || o.po_id) * 80)::int end as d) dt
where cv.na >= 2;

-- A8 vendor premium: an item with no contract and at least two PO lines to
-- compare against, bought from a vendor who is NOT its usual supplier at
-- +15–30% over what every other PO paid.
insert into pr_own (po_id, slice_no, n, role, vendor_id, item_id, dept_id, qty, price, order_date, local_ts, raise_key)
select o.po_id, o.slice_no, o.n, 'a8_prem', v.id, it.item_id, d.id,
  greatest(1, round(it.typ_q * (0.6 + 0.8 * pg_temp.nova_u('qq' || o.po_id)))),
  round(it.ref_price * (1.15 + 0.15 * pg_temp.nova_u('pm' || o.po_id)), 2),
  dt.d, dt.d + make_interval(hours => 9 + floor(pg_temp.nova_u('h' || o.po_id) * 8)::int), o.po_id
from pr_own0 o
cross join pr_meta mt
join lateral (
  select r.* from pr_ref r
  where r.slice_no = o.slice_no and r.n_lines >= 2 and not exists (select 1 from pr_ctr c where c.item_id = r.item_id)
  order by md5('a8p' || r.item_id) offset o.r - 15 limit 1
) it on true
-- First active vendor in hashed order that never supplied this item on a PO.
join lateral (
  select pv.id from pr_vendor pv
  where pv.slice_no = o.slice_no and pv.active
    and not exists (select 1 from pr_pair p where p.vendor_id = pv.id and p.item_id = it.item_id)
  order by md5('pv' || o.po_id || pv.id) limit 1
) v on true
join pr_dept d on d.slice_no = o.slice_no and d.k = 1 + floor(pg_temp.nova_u('dp' || o.po_id) * d.n)::int
cross join lateral (select mt.as_of - 5 - floor(pg_temp.nova_u('od' || o.po_id) * 80)::int as d) dt
where o.r in (15, 16);

-- A10 recent orders: two per deteriorating vendor in the last four months, so
-- the trend has enough receipts even when the vendor's bills are sparse.
insert into pr_own (po_id, slice_no, n, role, vendor_id, item_id, dept_id, qty, price, order_date, local_ts, raise_key)
select o.po_id, o.slice_no, o.n, 'a10s', a.vendor_id, it.item_id, d.id,
  greatest(5, round(rf.typ_q * (0.6 + 0.8 * pg_temp.nova_u('qq' || o.po_id)))), rf.ref_price,
  dt.d, dt.d + make_interval(hours => 9 + floor(pg_temp.nova_u('h' || o.po_id) * 8)::int), o.po_id
from pr_own0 o
cross join pr_meta mt
join pr_a10v a on a.slice_no = o.slice_no and a.rk = 1 + (o.r - 19) / 2
-- An item this vendor already supplies, else any item of the slice.
join lateral (
  select coalesce(
    (select p.item_id from pr_pair p where p.vendor_id = a.vendor_id order by md5('ai' || o.po_id || p.item_id) limit 1),
    (select i.id from pr_item i where i.slice_no = o.slice_no order by md5('ai' || o.po_id || i.id) limit 1)) as item_id
) it on true
join pr_ref rf on rf.item_id = it.item_id
join pr_dept d on d.slice_no = o.slice_no and d.k = 1 + floor(pg_temp.nova_u('dp' || o.po_id) * d.n)::int
-- Promised 20–109 days ago, so even a 14-day delay lands before the as-of date.
cross join lateral (select mt.as_of - rf.lead - 20 - floor(pg_temp.nova_u('od' || o.po_id) * 90)::int as d) dt
where o.r between 19 and 22;

-- Everything left: cancelled (ranks 23–27) and ordinary POs, plus any plant
-- slot whose prerequisite was missing. Vendor: the contracted one if the item
-- has a contract, else its usual PO supplier, else a hashed active vendor —
-- which is what keeps ordinary POs on-contract and at the reference price.
insert into pr_own (po_id, slice_no, n, role, vendor_id, item_id, dept_id, qty, price, order_date, local_ts, raise_key, sub)
select o.po_id, o.slice_no, o.n, case when o.r between 23 and 27 then 'cancelled' else 'normal' end,
  coalesce(c.vendor_id, pp.vendor_id, hv.id), it.id, d.id,
  greatest(coalesce(c.moq, 1), round(rf.typ_q * (0.6 + 0.8 * pg_temp.nova_u('qq' || o.po_id)))), rf.ref_price,
  dt.d, dt.d + make_interval(hours => 9 + floor(pg_temp.nova_u('h' || o.po_id) * 8)::int), o.po_id, st.sub
from pr_own0 o
cross join pr_meta mt
join pr_item it on it.slice_no = o.slice_no and it.k = 1 + floor(pg_temp.nova_u('it' || o.po_id) * it.n)::int
join pr_ref rf on rf.item_id = it.id
left join pr_ctr c on c.item_id = it.id
left join pr_pair pp on pp.item_id = it.id and pp.vr = 1
join pr_vendor hv on hv.slice_no = o.slice_no and hv.ka = 1 + floor(pg_temp.nova_u('hv' || o.po_id) * hv.na)::int
join pr_dept d on d.slice_no = o.slice_no and d.k = 1 + floor(pg_temp.nova_u('dp' || o.po_id) * d.n)::int
-- 30% open, 25% partially received, 45% received and awaiting the bill.
cross join lateral (select case when pg_temp.nova_u('st' || o.po_id) < 0.30 then 'open'
  when pg_temp.nova_u('st' || o.po_id) < 0.55 then 'partially_received' else 'received' end as sub) st
-- Cancelled anywhere in the year; open in the last 25 days; the others old
-- enough for at least one delivery to have arrived.
cross join lateral (select case
  when o.r between 23 and 27 then mt.as_of - floor(pg_temp.nova_u('od' || o.po_id) * 360)::int
  when st.sub = 'open' then mt.as_of - floor(pg_temp.nova_u('od' || o.po_id) * 25)::int
  when st.sub = 'partially_received' then mt.as_of - rf.lead - 5 - floor(pg_temp.nova_u('od' || o.po_id) * 50)::int
  else mt.as_of - rf.lead - 5 - floor(pg_temp.nova_u('od' || o.po_id) * 70)::int end as d) dt
where not exists (select 1 from pr_own x where x.po_id = o.po_id);

-- -----------------------------------------------------------------------------
-- All POs, bill-backed and unbilled, in one shape.
-- -----------------------------------------------------------------------------
create temp table pr_po_all on commit drop as
select h.po_id, h.slice_no, h.vendor_id, d.id as dept_id, h.po_id as raise_key, h.order_date, h.promised_date,
  -- Short receipt = still partially received; no receipt = still open; a
  -- settled bill closes the PO; anything else is received and billed.
  case when h.role = 'qty' then 'partially_received' when h.role = 'no_grn' then 'open'
       when h.bill_status = 'paid' then 'closed' else 'received' end as status,
  -- Office hours on the order date, minutes varied so no two POs look stamped.
  h.order_date + make_interval(hours => 9 + floor(pg_temp.nova_u('h' || h.po_id) * 8)::int, mins => floor(pg_temp.nova_u('mi' || h.po_id) * 60)::int) as local_ts,
  h.role, h.bill_id, h.a10
from pr_bb_po h
join pr_dept d on d.slice_no = h.slice_no and d.k = 1 + floor(pg_temp.nova_u('dp' || h.po_id) * d.n)::int
union all
select o.po_id, o.slice_no, o.vendor_id, o.dept_id, o.raise_key, o.order_date, o.order_date + rf.lead,
  case o.role
    when 'cancelled' then 'cancelled'
    when 'a10s' then 'received'
    -- A single unit cannot be partially received.
    when 'normal' then case when o.sub = 'partially_received' and o.qty < 2 then 'received' else o.sub end
    -- Plants: received once the promised date is two days past, else still open.
    else case when o.order_date + rf.lead + 2 < mt.as_of then 'received' else 'open' end
  end,
  o.local_ts, o.role, null,
  -- Decoy vendor counts as code 3 only when the delivery falls in its bad month.
  case when a.rk = 3 and ((mt.as_of - o.order_date - rf.lead) / 30)::int <> a.dmb then 0 else coalesce(a.rk, 0) end::int
from pr_own o
cross join pr_meta mt
join pr_ref rf on rf.item_id = o.item_id
left join pr_a10v a on a.vendor_id = o.vendor_id;

-- All PO lines. Unbilled POs carry one line at the item master's GST slab.
create temp table pr_po_ln on commit drop as
select l.po_id, l.line_no, l.item_id, l.po_qty as qty, l.po_price as unit_price, l.po_gst as gst_rate from pr_bb_ln l
union all
select o.po_id, 1, o.item_id, o.qty, o.price, i.gst_rate from pr_own o join pr_item i on i.id = o.item_id;

-- Deliveries for unbilled POs. Ordinary received POs arrive in 1–3 lots;
-- partial ones have one lot of 30–70%; plants and A10 orders one full lot.
insert into pr_grn_ln (po_id, seq, received_date, line_no, item_id, qty_received, qty_rejected)
select p.po_id, s.seq, dd.d, 1, l.item_id, sh.share,
  pg_temp.nova_rej(p.a10, ((mt.as_of - dd.d) / 30)::int, sh.share, 'rj' || p.po_id || '-' || s.seq)
from pr_po_all p
cross join pr_meta mt
join pr_own o on o.po_id = p.po_id
join pr_po_ln l on l.po_id = p.po_id
cross join lateral (select case when p.status = 'received' and p.role = 'normal' then least(l.qty, 1 + floor(pg_temp.nova_u('gc' || p.po_id) * 3))::int else 1 end as g,
  case when p.status = 'received' then l.qty else greatest(1, floor(l.qty * (0.3 + 0.4 * pg_temp.nova_u('pr' || p.po_id)))) end as total) c
cross join lateral generate_series(1, c.g) as s(seq)
-- Equal lots, the last taking the remainder, so lots sum to the total exactly.
cross join lateral (select case when s.seq < c.g then floor(c.total / c.g) else c.total - (c.g - 1) * floor(c.total / c.g) end as share) sh
-- First lot at promised + delay (never before the day after ordering), later
-- lots 3–9 days apart; nothing can arrive after the as-of date.
cross join lateral (select least(mt.as_of,
  greatest(p.order_date + 1, p.promised_date + pg_temp.nova_delay(p.a10, ((mt.as_of - p.promised_date) / 30)::int, 'dl' || p.po_id))
  + (s.seq - 1) * (3 + floor(pg_temp.nova_u('gp' || p.po_id) * 7)::int)) as d) dd
where p.status in ('received', 'partially_received');

-- Sourcing channel from the contracts active on the order date: any line
-- under this vendor's contract → contract; a line whose item is contracted
-- to someone else → off_contract; otherwise catalog.
create temp table pr_chan on commit drop as
select p.po_id,
  case when bool_or(c.vendor_id = p.vendor_id) then 'contract'
       when bool_or(c.vendor_id is not null) then 'off_contract' else 'catalog' end as channel
from pr_po_all p
join pr_po_ln l on l.po_id = p.po_id
left join public.nova_vendor_contracts c on c.item_id = l.item_id and p.order_date between c.valid_from and c.valid_to
group by p.po_id;

-- -----------------------------------------------------------------------------
-- Insert POs. Numbers run per slice in creation order, like a real PO series,
-- so a plant's number is as unremarkable as its neighbours'.
-- -----------------------------------------------------------------------------
insert into public.nova_purchase_orders (id, po_number, vendor_id, department_id, items, total_amount, order_date, promised_date, status, raised_by, channel, created_at, slice_no)
select p.po_id,
  'PO-' || lpad(p.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by p.slice_no order by p.local_ts, p.po_id)::text, 4, '0'),
  p.vendor_id, p.dept_id, t.items, t.total, p.order_date, p.promised_date, p.status, e.id, ch.channel,
  p.local_ts at time zone 'Asia/Kolkata',
  -- Inherited from the vendor row, never computed independently.
  v.slice_no
from pr_po_all p
join public.nova_vendors v on v.id = p.vendor_id
join pr_chan ch on ch.po_id = p.po_id
-- GST rounded per line then summed, the same rule bills and invoices follow.
join (
  select l.po_id,
    jsonb_agg(jsonb_build_object('item_id', l.item_id, 'qty', l.qty, 'unit_price', l.unit_price, 'gst_rate', l.gst_rate) order by l.line_no) as items,
    sum(round(l.qty * l.unit_price, 2) + round(l.qty * l.unit_price * l.gst_rate / 100, 2)) as total
  from pr_po_ln l group by l.po_id
) t on t.po_id = p.po_id
-- Buyer: a Procurement employee in post on the order date (same key → same
-- buyer); fall back to anyone in post, then to the slice's longest-serving.
cross join lateral (select coalesce(
  (select e.id from pr_emp e where e.slice_no = p.slice_no and e.buyer and e.join_date <= p.order_date and (e.exit_date is null or e.exit_date >= p.order_date) order by md5(p.raise_key || e.id) limit 1),
  (select e.id from pr_emp e where e.slice_no = p.slice_no and e.join_date <= p.order_date and (e.exit_date is null or e.exit_date >= p.order_date) order by md5(p.raise_key || e.id) limit 1),
  (select e.id from pr_emp e where e.slice_no = p.slice_no order by e.join_date, e.id limit 1)) as id) e;

-- Insert GRNs, numbered per slice in receipt order.
insert into public.nova_goods_receipts (id, grn_number, po_id, received_date, items, received_by, created_at, slice_no)
select g.grn_id,
  'GRN-' || lpad(po.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by po.slice_no order by g.received_date, g.grn_id)::text, 4, '0'),
  g.po_id, g.received_date, g.items, e.id,
  -- Afternoon unloading, minutes varied.
  (g.received_date + make_interval(hours => 13 + floor(pg_temp.nova_u('gh' || g.grn_id) * 4)::int, mins => floor(pg_temp.nova_u('gm' || g.grn_id) * 60)::int)) at time zone 'Asia/Kolkata',
  -- Inherited from the PO.
  po.slice_no
from (
  select l.po_id, l.seq, 'grn_' || left(md5('grn-' || l.po_id || '-' || l.seq), 8) as grn_id, min(l.received_date) as received_date,
    -- reject_reason only when something was rejected; null otherwise.
    jsonb_agg(jsonb_build_object('item_id', l.item_id, 'qty_received', l.qty_received, 'qty_rejected', l.qty_rejected,
      'reject_reason', case when l.qty_rejected > 0 then pg_temp.nova_reason('rr' || l.po_id || l.seq || '-' || l.line_no) end) order by l.line_no) as items
  from pr_grn_ln l group by l.po_id, l.seq
) g
join public.nova_purchase_orders po on po.id = g.po_id
-- Storekeeper in post on the day; same fallbacks as buyers.
cross join lateral (select coalesce(
  (select e.id from pr_emp e where e.slice_no = po.slice_no and e.receiver and e.join_date <= g.received_date and (e.exit_date is null or e.exit_date >= g.received_date) order by md5('rcv' || g.grn_id || e.id) limit 1),
  (select e.id from pr_emp e where e.slice_no = po.slice_no and e.join_date <= g.received_date and (e.exit_date is null or e.exit_date >= g.received_date) order by md5('rcv' || g.grn_id || e.id) limit 1),
  (select e.id from pr_emp e where e.slice_no = po.slice_no order by e.join_date, e.id limit 1)) as id) e;

-- -----------------------------------------------------------------------------
-- Link bills. A bill points at its PO and at the PO's LAST delivery (the
-- split decoy's second lot); no_grn bills get a PO but no GRN.
-- -----------------------------------------------------------------------------
update public.nova_purchase_bills b
set po_id = h.po_id,
    grn_id = case when h.role = 'no_grn' then null
                  else 'grn_' || left(md5('grn-' || h.po_id || '-' || case when h.role = 'split_decoy' then 2 else 1 end), 8) end
from pr_bb_po h
where h.bill_id = b.id;

-- A1 duplicates share their original's PO and GRN (only if the original has one).
update public.nova_purchase_bills b
set po_id = o.po_id, grn_id = o.grn_id
from pr_dup d
join public.nova_purchase_bills o on o.id = d.orig_id
where b.id = d.bill_id and o.po_id is not null;

-- FKs added after the fill so they validate the finished data in one pass.
alter table public.nova_purchase_bills add constraint nova_purchase_bills_po_id_fkey
  foreign key (po_id) references public.nova_purchase_orders(id) on delete restrict;
alter table public.nova_purchase_bills add constraint nova_purchase_bills_grn_id_fkey
  foreign key (grn_id) references public.nova_goods_receipts(id) on delete restrict;

-- -----------------------------------------------------------------------------
-- Answer key (nova_ground_truth, admin-only). One row per planted pattern or
-- decoy; record_ids name every row a judge needs to see it.
-- -----------------------------------------------------------------------------

-- A7 split POs: one row per cluster.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A7', 'purchase-orders', array_agg(o.po_id order by o.local_ts), 'A7-PO-' || o.slice_no || '-' || o.grp, 'medium', false,
  count(*) || ' purchase orders to ' || max(v.name) || ' for ' || max(i.name) || ', raised by one buyer for one department within 48 hours. '
    || 'Each is just under the ₹1,00,000 PO approval limit; together they total ₹' || sum(po.total_amount) || ', so one need was split to avoid approval.'
from pr_own o
join public.nova_purchase_orders po on po.id = o.po_id
join public.nova_vendors v on v.id = o.vendor_id
join public.nova_inventory i on i.id = o.item_id
where o.role = 'a7'
group by o.slice_no, o.grp;

-- A7 decoy: same vendor and window, but different items and departments.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A7', 'purchase-orders', array_agg(o.po_id order by o.local_ts), 'A7-PO-' || o.slice_no || '-D', 'medium', true,
  'Three purchase orders to ' || max(v.name) || ' within 48 hours, each under the approval limit, but for three different items requested by three different departments: separate needs, not a split order.'
from pr_own o
join public.nova_vendors v on v.id = o.vendor_id
where o.role = 'a7d'
group by o.slice_no;

-- A8 price leakage: one row per PO.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A8', 'purchase-orders',
  case when o.contract_id is null then array[o.po_id, o.item_id] else array[o.po_id, o.contract_id] end,
  null,
  case o.role when 'a8_above' then 'easy' when 'a8_off' then 'medium' else 'hard' end, false,
  case o.role
    when 'a8_above' then 'Bought ' || i.name || ' from the contracted vendor ' || v.name || ' at ₹' || o.price || ' a unit against an active contract price of ₹' || c.contract_price || '.'
    when 'a8_off' then 'Bought ' || i.name || ' from ' || v.name || ' at ₹' || o.price || ' a unit while an active contract with ' || cv.name || ' fixes ₹' || c.contract_price || ': an off-contract buy at a premium.'
    else 'Bought ' || i.name || ' from ' || v.name || ', a vendor that has never supplied it, at ₹' || o.price || ' a unit; every other order for it paid at most ₹' || rf.ref_price || '.'
  end
from pr_own o
join public.nova_vendors v on v.id = o.vendor_id
join public.nova_inventory i on i.id = o.item_id
join pr_ref rf on rf.item_id = o.item_id
left join public.nova_vendor_contracts c on c.id = o.contract_id
left join public.nova_vendors cv on cv.id = c.vendor_id
where o.role in ('a8_above', 'a8_off', 'a8_prem');

-- A8 decoys: a premium with a legitimate reason.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select o.slice_no, 'A8', 'purchase-orders', array[o.po_id, o.contract_id], null, 'medium', true,
  case o.role
    when 'a8d_moq' then 'Off-contract buy of ' || o.qty || ' units of ' || i.name || ' at a premium, but the contracted vendor''s minimum order is ' || c.moq || ' units: a small urgent need the contract could not serve.'
    else 'Bought ' || i.name || ' from ' || v.name || ' above the old contract price, but that contract expired on ' || c.valid_to || ' before this order: no active contract applies.'
  end
from pr_own o
join public.nova_vendors v on v.id = o.vendor_id
join public.nova_inventory i on i.id = o.item_id
join public.nova_vendor_contracts c on c.id = o.contract_id
where o.role in ('a8d_moq', 'a8d_exp');

-- A9 three-way match failures: bill, PO and (where one exists) GRN.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select h.slice_no, 'A9', 'purchase-bills',
  case when b.grn_id is null then array[h.bill_id, h.po_id] else array[h.bill_id, h.po_id, b.grn_id] end,
  null,
  case h.role when 'no_grn' then 'easy' when 'gst' then 'hard' else 'medium' end, false,
  case h.role
    when 'qty' then 'Bill charges ' || l.bill_qty || ' units of ' || i.name || ' but the goods receipt shows only ' || l.recv || ' received.'
    when 'price' then 'Bill rate for ' || i.name || ' is ₹' || l.rate || ' a unit against ₹' || l.po_price || ' on the purchase order.'
    when 'gst' then 'Bill applies GST at ' || l.gst_rate || '% on ' || i.name || ' while the purchase order says ' || l.po_gst || '%.'
    else 'Bill is linked to a purchase order but no goods receipt exists: nothing was recorded as received.'
  end
from pr_bb_po h
join public.nova_purchase_bills b on b.id = h.bill_id
join pr_bb_ln l on l.bill_id = h.bill_id and l.is_target
join public.nova_inventory i on i.id = l.item_id
where h.role in ('qty', 'price', 'gst', 'no_grn');

-- A9 decoy: billed qty exceeds the linked GRN, but two deliveries cover it.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select h.slice_no, 'A9', 'purchase-bills', array[h.bill_id, h.po_id] || array_agg(g.id order by g.received_date), null, 'medium', true,
  'The bill quantity exceeds the goods receipt it links to, but the order arrived in two deliveries that together match the bill exactly.'
from pr_bb_po h
join public.nova_goods_receipts g on g.po_id = h.po_id
where h.role = 'split_decoy'
group by h.slice_no, h.bill_id, h.po_id;

-- A10 supplier deterioration: the vendor plus its receipts of the last four months.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select a.slice_no, 'A10', 'goods-receipts', array[a.vendor_id] || array_agg(g.id order by g.received_date),
  'A10-' || a.slice_no || '-' || a.rk, 'hard', false,
  max(v.name) || ': delivery delay against the promised date and the rejection rate both rise month on month over the last four months, after a reliable record before that.'
from pr_a10v a
cross join pr_meta mt
join public.nova_vendors v on v.id = a.vendor_id
join public.nova_purchase_orders po on po.vendor_id = a.vendor_id
join public.nova_goods_receipts g on g.po_id = po.id and g.received_date > mt.as_of - 120
where a.rk in (1, 2)
group by a.slice_no, a.vendor_id, a.rk;

-- A10 decoy: one bad month five months back, fully recovered since.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select a.slice_no, 'A10', 'goods-receipts', array[a.vendor_id] || array_agg(g.id order by g.received_date),
  'A10-' || a.slice_no || '-D', 'hard', true,
  max(v.name) || ': one month of late, partly rejected deliveries some months ago, then back to normal; a one-off disruption, not a trend.'
from pr_a10v a
cross join pr_meta mt
join public.nova_vendors v on v.id = a.vendor_id
join public.nova_purchase_orders po on po.vendor_id = a.vendor_id
join public.nova_goods_receipts g on g.po_id = po.id and (mt.as_of - g.received_date) / 30 = a.dmb
where a.rk = 3
group by a.slice_no, a.vendor_id;

-- Temp tables drop here (on commit drop); the pg_temp helpers end with the session.
commit;
