-- =============================================================================
-- Nova API — schema. Run once in the Nova Supabase project's SQL editor.
-- Design: docs/nova-api-architecture.md §4.
--
-- Re-runnable: every object is created with IF NOT EXISTS / OR REPLACE, so a
-- second run after a partial failure finishes the job instead of erroring out.
-- Deliberately NOT in supabase/migrations/: that folder is applied to the
-- aczen.in site project, and Nova lives in a separate project on purpose
-- (blast-radius isolation — see §4.1).
-- =============================================================================

-- One transaction, so a failure halfway leaves no half-built schema behind.
begin;

-- -----------------------------------------------------------------------------
-- Business tables — the shared dummy dataset every key reads.
-- Money is numeric(14,2): float would turn 0.1 + 0.2 into 0.30000000000000004,
-- which is unacceptable in a GST total that must reconcile to the paisa.
-- Status columns are text + CHECK rather than Postgres enums, because adding a
-- value to a CHECK is one ALTER while an enum value can never be removed.
-- -----------------------------------------------------------------------------

-- Customers invoices and quotations are raised against.
create table if not exists public.nova_clients (
  -- Prefixed text id ("cli_…") mirrors the reference API, so an id reveals its type.
  id text primary key check (id like 'cli\_%'),
  -- Legal name, the field integrations display and search on.
  name text not null,
  -- GSTIN is optional: unregistered customers (B2C) have none.
  gst_number text,
  -- Contact fields, nullable because real books are often missing them.
  email text,
  phone text,
  billing_address text,
  -- Place of supply decides CGST+SGST vs IGST, so state is carried explicitly.
  state text not null,
  -- The two-digit GST state code that prefixes a GSTIN (e.g. 36 = Telangana).
  state_code text not null,
  -- timestamptz, never timestamp: a naive timestamp loses the offset and
  -- silently shifts by 5h30 when read from a UTC server.
  created_at timestamptz not null default now()
);

-- Suppliers purchase bills are recorded against.
create table if not exists public.nova_vendors (
  -- "ven_…" prefix, same reasoning as clients.
  id text primary key check (id like 'ven\_%'),
  name text not null,
  gst_number text,
  email text,
  phone text,
  address text,
  state text not null,
  -- Bank details are what an AP integration needs to pay a vendor.
  bank_ifsc text,
  -- Only the last four digits: even dummy data should model the masking a
  -- real API must do, so integrators build against the safe shape.
  bank_account_last4 text check (bank_account_last4 ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);

-- Sales invoices — the headline resource.
create table if not exists public.nova_invoices (
  id text primary key check (id like 'inv\_%'),
  -- Human-facing number, unique so a lookup by number is unambiguous.
  invoice_number text not null unique,
  -- FK keeps the dataset internally consistent; restrict because this data is
  -- never deleted by the API and a dangling invoice would be a seed bug.
  client_id text not null references public.nova_clients(id) on delete restrict,
  -- Denormalised name and GSTIN, as the reference returns them: an invoice
  -- records who it was billed to at the time, even if the client is renamed.
  client_name text not null,
  client_gst_number text,
  -- Line items as jsonb: read-only and always returned with the document, so
  -- a child table would cost a join and buy nothing (design §4.3).
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  -- Taxable value before GST.
  amount numeric(14,2) not null check (amount >= 0),
  -- Total GST, and its split. Exactly one of (cgst+sgst) or igst is non-zero.
  gst_amount numeric(14,2) not null check (gst_amount >= 0),
  cgst_amount numeric(14,2) not null default 0,
  sgst_amount numeric(14,2) not null default 0,
  igst_amount numeric(14,2) not null default 0,
  -- True when place of supply = seller's state, which is what picks CGST+SGST.
  intra_state boolean not null,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  -- Sum of allocated payments; kept on the row so list reads need no aggregate.
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  -- Stored status excludes 'overdue' — that is derived in the view below, so
  -- the dummy data ages realistically without a background job.
  status text not null check (status in ('pending', 'partial', 'paid')),
  invoice_date date not null,
  due_date date not null,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  -- Guards the GST arithmetic so a seed bug cannot ship inconsistent totals.
  constraint nova_invoices_gst_split check (gst_amount = cgst_amount + sgst_amount + igst_amount),
  constraint nova_invoices_total check (total_amount = amount + gst_amount),
  constraint nova_invoices_due_after_issue check (due_date >= invoice_date)
);

-- Quotations — proposals that may later convert into invoices.
create table if not exists public.nova_quotations (
  id text primary key check (id like 'quo\_%'),
  quotation_number text not null unique,
  client_id text not null references public.nova_clients(id) on delete restrict,
  client_name text not null,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  amount numeric(14,2) not null check (amount >= 0),
  gst_amount numeric(14,2) not null check (gst_amount >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  -- The full quote lifecycle, so integrators can test every branch.
  status text not null check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  quotation_date date not null,
  valid_until date not null,
  -- Set only when status = 'converted'; set null on delete keeps the quote if
  -- an invoice were ever removed.
  converted_invoice_id text references public.nova_invoices(id) on delete set null,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  constraint nova_quotations_total check (total_amount = amount + gst_amount)
);

-- Customer payments received against invoices.
create table if not exists public.nova_payments (
  id text primary key check (id like 'pay\_%'),
  payment_number text not null unique,
  invoice_id text not null references public.nova_invoices(id) on delete restrict,
  client_id text not null references public.nova_clients(id) on delete restrict,
  client_name text not null,
  -- Strictly positive: a zero payment is not a payment.
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  -- The rails Indian businesses actually receive money on.
  method text not null check (method in ('upi', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card')),
  -- UTR / cheque number, the thing reconciliation matches on.
  reference text,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

-- Purchase bills — accounts payable, with RCM and ITC flags.
create table if not exists public.nova_purchase_bills (
  id text primary key check (id like 'bil\_%'),
  bill_number text not null unique,
  vendor_id text not null references public.nova_vendors(id) on delete restrict,
  vendor_name text not null,
  vendor_gst_number text,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  amount numeric(14,2) not null check (amount >= 0),
  gst_amount numeric(14,2) not null check (gst_amount >= 0),
  cgst_amount numeric(14,2) not null default 0,
  sgst_amount numeric(14,2) not null default 0,
  igst_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  -- Same stored/derived split as invoices; 'overdue' comes from the view.
  status text not null check (status in ('pending', 'partial', 'paid')),
  bill_date date not null,
  due_date date not null,
  -- Reverse charge: the buyer, not the vendor, pays the GST to the government.
  reverse_charge boolean not null default false,
  -- Whether the GST on this bill can be claimed as input tax credit.
  itc_eligible boolean not null default true,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  constraint nova_purchase_bills_gst_split check (gst_amount = cgst_amount + sgst_amount + igst_amount),
  constraint nova_purchase_bills_total check (total_amount = amount + gst_amount),
  constraint nova_purchase_bills_due_after_issue check (due_date >= bill_date)
);

-- Direct spend that never had a bill (rent, travel, SaaS), with TDS.
create table if not exists public.nova_expenses (
  id text primary key check (id like 'exp\_%'),
  expense_number text not null unique,
  category text not null check (category in ('rent', 'travel', 'software', 'utilities', 'office_supplies', 'professional_fees', 'marketing', 'meals', 'salaries', 'other')),
  vendor_name text,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  gst_amount numeric(14,2) not null default 0 check (gst_amount >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  -- TDS rate as a percentage (e.g. 10.00 for 194J professional fees).
  tds_rate numeric(5,2) not null default 0 check (tds_rate between 0 and 100),
  tds_amount numeric(14,2) not null default 0 check (tds_amount >= 0),
  payment_method text not null check (payment_method in ('upi', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card')),
  expense_date date not null,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  constraint nova_expenses_total check (total_amount = amount + gst_amount)
);

-- Stock items.
create table if not exists public.nova_inventory (
  id text primary key check (id like 'itm\_%'),
  sku text not null unique,
  name text not null,
  -- HSN code classifies the good for GST; required on a GST invoice line.
  hsn_code text not null,
  unit text not null check (unit in ('pcs', 'kg', 'box', 'litre', 'metre', 'set')),
  sale_price numeric(14,2) not null check (sale_price >= 0),
  purchase_price numeric(14,2) not null check (purchase_price >= 0),
  -- The legal GST slabs only, so dummy data never shows an impossible rate.
  gst_rate numeric(5,2) not null check (gst_rate in (0, 5, 12, 18, 28)),
  -- Numeric, not integer: kg and litres are fractional.
  quantity_on_hand numeric(14,3) not null check (quantity_on_hand >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  created_at timestamptz not null default now()
);

-- Every change to an item's stock, the audit trail behind quantity_on_hand.
create table if not exists public.nova_stock_movements (
  id text primary key check (id like 'mov\_%'),
  item_id text not null references public.nova_inventory(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment')),
  -- Signed: positive into stock, negative out of it; zero is not a movement.
  quantity numeric(14,3) not null check (quantity <> 0),
  -- Invoice/bill number or adjustment reason that caused the movement.
  reference text,
  movement_date date not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes. Postgres does NOT index foreign keys automatically; without these,
-- /invoices/{id}/payments and client_id filters are sequential scans.
-- The date indexes serve the default sort (newest first) and range filters.
-- -----------------------------------------------------------------------------
create index if not exists nova_invoices_client_id_idx on public.nova_invoices (client_id);
create index if not exists nova_invoices_invoice_date_idx on public.nova_invoices (invoice_date desc);
create index if not exists nova_quotations_client_id_idx on public.nova_quotations (client_id);
create index if not exists nova_quotations_converted_invoice_id_idx on public.nova_quotations (converted_invoice_id);
create index if not exists nova_payments_invoice_id_idx on public.nova_payments (invoice_id);
create index if not exists nova_payments_client_id_idx on public.nova_payments (client_id);
create index if not exists nova_payments_payment_date_idx on public.nova_payments (payment_date desc);
create index if not exists nova_purchase_bills_vendor_id_idx on public.nova_purchase_bills (vendor_id);
create index if not exists nova_purchase_bills_bill_date_idx on public.nova_purchase_bills (bill_date desc);
create index if not exists nova_expenses_expense_date_idx on public.nova_expenses (expense_date desc);
create index if not exists nova_stock_movements_item_id_idx on public.nova_stock_movements (item_id, movement_date desc);

-- -----------------------------------------------------------------------------
-- Read views — what the API actually queries (design §4.2 layer 3).
-- security_invoker = true makes the view run with the CALLER's privileges, not
-- the owner's. Without it, a view owned by postgres silently bypasses RLS —
-- the most common Supabase data-leak mistake. Here the only caller is
-- service_role, but the flag keeps the view safe if grants ever change.
-- -----------------------------------------------------------------------------

-- Invoices with 'overdue' derived at read time from due_date.
create or replace view public.nova_invoices_v with (security_invoker = true) as
select
  -- Every stored column, unchanged, except status.
  i.id, i.invoice_number, i.client_id, i.client_name, i.client_gst_number, i.items,
  i.amount, i.gst_amount, i.cgst_amount, i.sgst_amount, i.igst_amount, i.intra_state,
  i.total_amount, i.paid_amount,
  -- Unpaid and past due reads as overdue — the reference API's documented rule.
  case when i.status in ('pending', 'partial') and i.due_date < current_date then 'overdue' else i.status end as status,
  -- What is still owed, so integrators need not compute it.
  i.total_amount - i.paid_amount as balance_due,
  i.invoice_date, i.due_date, i.currency, i.created_at
from public.nova_invoices i;

-- Purchase bills with the same derived overdue.
create or replace view public.nova_purchase_bills_v with (security_invoker = true) as
select
  b.id, b.bill_number, b.vendor_id, b.vendor_name, b.vendor_gst_number, b.items,
  b.amount, b.gst_amount, b.cgst_amount, b.sgst_amount, b.igst_amount,
  b.total_amount, b.paid_amount,
  case when b.status in ('pending', 'partial') and b.due_date < current_date then 'overdue' else b.status end as status,
  b.total_amount - b.paid_amount as balance_due,
  b.bill_date, b.due_date, b.reverse_charge, b.itc_eligible, b.currency, b.created_at
from public.nova_purchase_bills b;

-- The remaining resources need no derived columns; thin views keep the API
-- reading views uniformly, so a derived field can be added later without
-- touching the code.
create or replace view public.nova_clients_v with (security_invoker = true) as select * from public.nova_clients;
create or replace view public.nova_vendors_v with (security_invoker = true) as select * from public.nova_vendors;
create or replace view public.nova_quotations_v with (security_invoker = true) as select * from public.nova_quotations;
create or replace view public.nova_payments_v with (security_invoker = true) as select * from public.nova_payments;
create or replace view public.nova_expenses_v with (security_invoker = true) as select * from public.nova_expenses;
-- Inventory flags low stock, the first thing an inventory integration asks.
create or replace view public.nova_inventory_v with (security_invoker = true) as
select v.*, v.quantity_on_hand <= v.reorder_level as below_reorder_level from public.nova_inventory v;
create or replace view public.nova_stock_movements_v with (security_invoker = true) as select * from public.nova_stock_movements;

-- -----------------------------------------------------------------------------
-- Platform tables — allowlist, sign-in, keys, metering (design §4.4).
-- -----------------------------------------------------------------------------

-- Who may sign in to the developer portal. Deleting a row revokes everything.
create table if not exists public.nova_allowlist (
  -- Forced lowercase so "Teja@X.com" and "teja@x.com" can never be two rows.
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  -- Free text for the admin: who this is and why they have access.
  note text,
  -- UNUSED today: the portal password is the user's own email (Teja,
  -- 2026-09-29). Kept nullable as the upgrade slot for per-user scrypt
  -- "saltHex:keyHex" hashes if real data ever lands here; the CHECK rejects a
  -- plaintext password pasted in by hand.
  password_hash text check (password_hash ~ '^[0-9a-f]{32}:[0-9a-f]{128}$'),
  created_at timestamptz not null default now()
);

-- Portal sessions, server-side so revocation is instant (design §5).
create table if not exists public.nova_portal_session (
  -- sha256 of the random cookie value; a DB leak does not yield live cookies.
  token_hash text primary key,
  -- Cascade: removing someone from the allowlist deletes their sessions too.
  email text not null references public.nova_allowlist(email) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists nova_portal_session_email_idx on public.nova_portal_session (email);

-- API keys. Only the hash is stored; the secret is shown once.
create table if not exists public.nova_api_key (
  id uuid primary key default gen_random_uuid(),
  -- Cascade so an allowlist removal also deletes the person's keys outright.
  email text not null references public.nova_allowlist(email) on delete cascade,
  -- The label the user typed ("staging sync"), to tell keys apart.
  name text not null check (length(name) between 1 and 60),
  -- First 16 chars of the key (e.g. "nova_sk_AbC12xYz"), safe to display.
  prefix text not null,
  -- sha256 hex of the full key; unique doubles as the lookup index.
  key_hash text not null unique,
  -- Per-key ceiling, adjustable by an admin, bounded like the reference.
  rate_limit_per_min integer not null default 120 check (rate_limit_per_min between 1 and 6000),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  -- Soft revoke keeps the row for usage history; the auth function ignores it.
  revoked_at timestamptz
);
create index if not exists nova_api_key_email_idx on public.nova_api_key (email);

-- Per-key per-minute request counter: rate limit AND usage history in one.
create table if not exists public.nova_api_usage (
  key_id uuid not null references public.nova_api_key(id) on delete cascade,
  -- Truncated to the minute: fixed windows, as the reference documents.
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (key_id, window_start)
);
-- Admin usage charts aggregate by time across all keys.
create index if not exists nova_api_usage_window_idx on public.nova_api_usage (window_start);

-- Brute-force throttling for the admin password and the portal sign-in.
create table if not exists public.nova_auth_attempt (
  id bigint generated always as identity primary key,
  -- Salted daily-rotating IP hash from identity.ts, never a raw IP.
  ip_hash text not null,
  -- Which door was knocked on, so each has its own budget.
  kind text not null check (kind in ('admin', 'portal_login')),
  -- The email a sign-in was attempted for, so guessing one account's password
  -- from many IPs is still throttled per account.
  email text,
  succeeded boolean not null,
  occurred_at timestamptz not null default now()
);
create index if not exists nova_auth_attempt_lookup_idx on public.nova_auth_attempt (kind, ip_hash, occurred_at desc);
create index if not exists nova_auth_attempt_email_idx on public.nova_auth_attempt (kind, email, occurred_at desc);

-- -----------------------------------------------------------------------------
-- authenticate + meter in ONE statement (design §4.4).
-- Atomic upsert means two concurrent requests cannot both read 119 and pass.
-- security definer + empty search_path: runs as owner with every name
-- schema-qualified, so a hostile search_path cannot redirect it to fake tables.
-- -----------------------------------------------------------------------------
create or replace function public.nova_authenticate_key(p_key_hash text)
returns table (
  key_id uuid,
  email text,
  key_name text,
  key_prefix text,
  rate_limit_per_min integer,
  request_count integer,
  window_start timestamptz,
  key_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
-- RETURNS TABLE column names (key_id, window_start, request_count) are also
-- PL/pgSQL variables, which made ON CONFLICT (key_id, window_start) ambiguous
-- (42702, caught by the 2026-09-29 smoke test). Bare names mean columns here.
#variable_conflict use_column
declare
  -- The key row, if it exists, is live, and its owner is still allowlisted.
  k public.nova_api_key%rowtype;
  -- The current fixed one-minute window.
  w timestamptz := date_trunc('minute', now());
  -- The post-increment count for this window.
  c integer;
begin
  -- The join to the allowlist is what makes an allowlist removal cut API
  -- access instantly, even for a key that somehow survived the cascade.
  select ak.* into k
  from public.nova_api_key ak
  join public.nova_allowlist al on al.email = ak.email
  where ak.key_hash = p_key_hash and ak.revoked_at is null;

  -- Unknown or revoked key: return zero rows; the caller answers 401.
  if not found then
    return;
  end if;

  -- Count this request. ON CONFLICT makes the increment race-free.
  insert into public.nova_api_usage as u (key_id, window_start, request_count)
  values (k.id, w, 1)
  on conflict (key_id, window_start) do update set request_count = u.request_count + 1
  returning u.request_count into c;

  -- Touch last_used_at at most once a minute, so a busy key does not turn
  -- every read into an extra row write (design §4.4 step 3).
  if k.last_used_at is null or k.last_used_at < w then
    update public.nova_api_key set last_used_at = now() where id = k.id;
  end if;

  -- The caller compares request_count to rate_limit_per_min itself, so it can
  -- still emit correct RateLimit-* headers on the rejected request.
  return query select k.id, k.email, k.name, k.prefix, k.rate_limit_per_min, c, w, k.created_at;
end;
$$;

-- -----------------------------------------------------------------------------
-- Lock everything down: service_role only (design §4.2).
-- -----------------------------------------------------------------------------
do $$
declare
  -- Every nova_ table and view in public.
  r record;
begin
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname like 'nova\_%' and c.relkind in ('r', 'v')
  loop
    -- anon ships in every browser bundle; authenticated is any signed-up user.
    -- Neither may touch Nova data except through our server.
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
    -- The server's only credential.
    execute format('grant select, insert, update, delete on public.%I to service_role', r.relname);
    -- RLS applies to tables only. Enabled with zero policies = deny-all for
    -- every role without BYPASSRLS. Deliberately NOT forced: FORCE would also
    -- bind the owner (postgres), which is the role nova_authenticate_key runs
    -- as under security definer, and a forced table would hand it zero rows.
    if r.relkind = 'r' then
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
  end loop;
end;
$$;

-- Functions are executable by PUBLIC by default in Postgres; take that away.
revoke all on function public.nova_authenticate_key(text) from public, anon, authenticated;
grant execute on function public.nova_authenticate_key(text) to service_role;

-- Identity-column sequence for nova_auth_attempt inserts via PostgREST.
grant usage on all sequences in schema public to service_role;

commit;
