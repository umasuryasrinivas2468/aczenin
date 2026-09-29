-- =============================================================================
-- Nova API — per-team data slices (Teja, 2026-09-29).
--
-- Each allowlisted email (= one team) is given a permanent SLOT in the order
-- it was added. Its team sees only the rows whose slice_no = slot % slice_count.
-- So teams 1..slice_count get disjoint data, and only once the data runs out
-- does a later team repeat an earlier slice ("repeat only if not enough").
--
-- Slices are COHERENT BOOKS, not row-number cuts: a client and every invoice,
-- payment and quotation of that client share one slice; a vendor and its bills
-- share one; an item and its stock movements share one. A team's payments
-- therefore always reconcile against a team's own invoices.
--
-- Run after 003. Re-runnable. Then re-run 002_seed.sql, which assigns slices.
-- =============================================================================

-- One transaction: columns, views and the auth function change together.
begin;

-- -----------------------------------------------------------------------------
-- How many slices the current seed produced. One row, written by the seed, so
-- the auth function and the seed can never disagree about the modulus.
-- -----------------------------------------------------------------------------
create table if not exists public.nova_dataset_meta (
  -- Boolean PK fixed to true: the classic "exactly one row" table.
  id boolean primary key default true check (id),
  -- >= 1 so slot % slice_count can never divide by zero.
  slice_count integer not null check (slice_count >= 1),
  -- When the seed last ran, for the admin page and for debugging.
  seeded_at timestamptz not null default now()
);
-- Placeholder until the seed runs; 1 slice = everyone sees everything, which is
-- the pre-slicing behaviour, so nothing breaks between this file and the seed.
insert into public.nova_dataset_meta (id, slice_count) values (true, 1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- slice_no on every business table. Default 0 keeps existing rows valid until
-- the reseed; >= 0 because it is a modulus result.
-- -----------------------------------------------------------------------------
alter table public.nova_clients         add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_vendors         add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_invoices        add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_quotations      add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_payments        add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_purchase_bills  add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_expenses        add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_inventory       add column if not exists slice_no integer not null default 0 check (slice_no >= 0);
alter table public.nova_stock_movements add column if not exists slice_no integer not null default 0 check (slice_no >= 0);

-- Every API read now filters slice_no first, then sorts by date; a composite
-- (slice_no, date desc) index serves both in one index scan.
create index if not exists nova_clients_slice_idx         on public.nova_clients (slice_no, created_at desc);
create index if not exists nova_vendors_slice_idx         on public.nova_vendors (slice_no, created_at desc);
create index if not exists nova_invoices_slice_idx        on public.nova_invoices (slice_no, invoice_date desc);
create index if not exists nova_quotations_slice_idx      on public.nova_quotations (slice_no, quotation_date desc);
create index if not exists nova_payments_slice_idx        on public.nova_payments (slice_no, payment_date desc);
create index if not exists nova_purchase_bills_slice_idx  on public.nova_purchase_bills (slice_no, bill_date desc);
create index if not exists nova_expenses_slice_idx        on public.nova_expenses (slice_no, expense_date desc);
create index if not exists nova_inventory_slice_idx       on public.nova_inventory (slice_no, created_at desc);
create index if not exists nova_stock_movements_slice_idx on public.nova_stock_movements (slice_no, movement_date desc);

-- -----------------------------------------------------------------------------
-- Views must be rebuilt: a view's column list is frozen when it is created, so
-- `select *` views do not pick up slice_no on their own. Dropped and recreated
-- (views hold no data) because CREATE OR REPLACE cannot insert a column ahead
-- of an existing one, which nova_inventory_v would need.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_invoices_v, public.nova_purchase_bills_v, public.nova_clients_v,
  public.nova_vendors_v, public.nova_quotations_v, public.nova_payments_v, public.nova_expenses_v,
  public.nova_inventory_v, public.nova_stock_movements_v;

-- Same definitions as 001, plus slice_no. security_invoker as before, so a view
-- can never bypass RLS on behalf of a caller.
create view public.nova_invoices_v with (security_invoker = true) as
select
  i.id, i.invoice_number, i.client_id, i.client_name, i.client_gst_number, i.items,
  i.amount, i.gst_amount, i.cgst_amount, i.sgst_amount, i.igst_amount, i.intra_state,
  i.total_amount, i.paid_amount,
  -- Unpaid and past due reads as overdue, derived at read time (design §4.3).
  case when i.status in ('pending', 'partial') and i.due_date < current_date then 'overdue' else i.status end as status,
  i.total_amount - i.paid_amount as balance_due,
  i.invoice_date, i.due_date, i.currency, i.created_at, i.slice_no
from public.nova_invoices i;

create view public.nova_purchase_bills_v with (security_invoker = true) as
select
  b.id, b.bill_number, b.vendor_id, b.vendor_name, b.vendor_gst_number, b.items,
  b.amount, b.gst_amount, b.cgst_amount, b.sgst_amount, b.igst_amount,
  b.total_amount, b.paid_amount,
  case when b.status in ('pending', 'partial') and b.due_date < current_date then 'overdue' else b.status end as status,
  b.total_amount - b.paid_amount as balance_due,
  b.bill_date, b.due_date, b.reverse_charge, b.itc_eligible, b.currency, b.created_at, b.slice_no
from public.nova_purchase_bills b;

create view public.nova_clients_v         with (security_invoker = true) as select * from public.nova_clients;
create view public.nova_vendors_v         with (security_invoker = true) as select * from public.nova_vendors;
create view public.nova_quotations_v      with (security_invoker = true) as select * from public.nova_quotations;
create view public.nova_payments_v        with (security_invoker = true) as select * from public.nova_payments;
create view public.nova_expenses_v        with (security_invoker = true) as select * from public.nova_expenses;
-- Low-stock flag kept, now after slice_no.
create view public.nova_inventory_v       with (security_invoker = true) as
select v.*, v.quantity_on_hand <= v.reorder_level as below_reorder_level from public.nova_inventory v;
create view public.nova_stock_movements_v with (security_invoker = true) as select * from public.nova_stock_movements;

-- Recreated views start with default grants; re-apply the lockdown.
revoke all on public.nova_invoices_v, public.nova_purchase_bills_v, public.nova_clients_v,
  public.nova_vendors_v, public.nova_quotations_v, public.nova_payments_v, public.nova_expenses_v,
  public.nova_inventory_v, public.nova_stock_movements_v from anon, authenticated;
grant select on public.nova_invoices_v, public.nova_purchase_bills_v, public.nova_clients_v,
  public.nova_vendors_v, public.nova_quotations_v, public.nova_payments_v, public.nova_expenses_v,
  public.nova_inventory_v, public.nova_stock_movements_v to service_role;

-- -----------------------------------------------------------------------------
-- Team slot: assigned once, in allowlist order, never reused. A sequence (not
-- row_number()) so removing a team never shifts everyone else's data.
-- -----------------------------------------------------------------------------
create sequence if not exists public.nova_allowlist_slot_seq minvalue 0 start 0;
alter table public.nova_allowlist add column if not exists slot integer;
-- Backfill existing teams in the order they were added, so the first team is
-- slot 0. row_number() rather than nextval() here: nextval inside an ordered
-- subquery is not guaranteed to fire in sort order, row_number() is.
update public.nova_allowlist a set slot = s.n
from (select email, (row_number() over (order by created_at, email)) - 1 as n from public.nova_allowlist) s
where a.email = s.email and a.slot is null;
-- Move the sequence past the backfilled slots so the next team gets max + 1.
-- is_called = false makes the NEXT nextval() return exactly this value.
select setval('public.nova_allowlist_slot_seq', coalesce((select max(slot) + 1 from public.nova_allowlist), 0), false);
-- New teams draw the next slot automatically; the admin UI never sets it.
alter table public.nova_allowlist alter column slot set default nextval('public.nova_allowlist_slot_seq');
alter table public.nova_allowlist alter column slot set not null;
-- Two teams must never hold the same slot (they would silently share data early).
create unique index if not exists nova_allowlist_slot_key on public.nova_allowlist (slot);
grant usage, select on sequence public.nova_allowlist_slot_seq to service_role;

-- -----------------------------------------------------------------------------
-- Auth now also returns the team's slot and slice. Dropped and recreated
-- because Postgres cannot change a function's RETURNS TABLE in place.
-- -----------------------------------------------------------------------------
drop function if exists public.nova_authenticate_key(text);
create function public.nova_authenticate_key(p_key_hash text)
returns table (
  key_id uuid,
  email text,
  key_name text,
  key_prefix text,
  rate_limit_per_min integer,
  request_count integer,
  window_start timestamptz,
  key_created_at timestamptz,
  -- The team's permanent position in allowlist order.
  team_slot integer,
  -- The slice this team reads: team_slot % slice_count.
  slice_no integer
)
language plpgsql
security definer
set search_path = ''
as $$
-- RETURNS TABLE names double as variables; bare names mean columns (see 001).
#variable_conflict use_column
declare
  -- The live key, joined to a still-allowlisted email.
  k public.nova_api_key%rowtype;
  -- The team's slot, read in the same lookup.
  s integer;
  -- Current fixed one-minute window.
  w timestamptz := date_trunc('minute', now());
  -- Post-increment request count.
  c integer;
  -- Modulus from the seed; coalesce to 1 if the meta row is ever missing.
  n integer := coalesce((select m.slice_count from public.nova_dataset_meta m where m.id), 1);
begin
  -- The allowlist join is what makes removing a team cut its key instantly.
  select ak.* into k
  from public.nova_api_key ak
  join public.nova_allowlist al on al.email = ak.email
  where ak.key_hash = p_key_hash and ak.revoked_at is null;

  -- Unknown or revoked key: zero rows, the caller answers 401.
  if not found then
    return;
  end if;

  -- Separate select: PL/pgSQL forbids a row variable and a scalar in one INTO
  -- list. The email is the allowlist PK, so this is a single index lookup.
  select al.slot into s from public.nova_allowlist al where al.email = k.email;

  -- Race-free per-minute metering, unchanged from 001.
  insert into public.nova_api_usage as u (key_id, window_start, request_count)
  values (k.id, w, 1)
  on conflict (key_id, window_start) do update set request_count = u.request_count + 1
  returning u.request_count into c;

  -- last_used_at at most once a minute, unchanged from 001.
  if k.last_used_at is null or k.last_used_at < w then
    update public.nova_api_key set last_used_at = now() where id = k.id;
  end if;

  -- slot % n is the whole "repeat only when data runs out" rule.
  return query select k.id, k.email, k.name, k.prefix, k.rate_limit_per_min, c, w, k.created_at, s, s % n;
end;
$$;

-- Recreated function starts executable by PUBLIC; take that away again.
revoke all on function public.nova_authenticate_key(text) from public, anon, authenticated;
grant execute on function public.nova_authenticate_key(text) to service_role;

-- Lock down the new meta table like every nova_ table.
alter table public.nova_dataset_meta enable row level security;
revoke all on public.nova_dataset_meta from anon, authenticated;
grant select, insert, update on public.nova_dataset_meta to service_role;

commit;
