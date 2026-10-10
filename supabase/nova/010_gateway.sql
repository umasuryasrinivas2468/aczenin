-- STATUS: VERIFIED 2026-09-30
-- =============================================================================
-- Nova Tier 2 pack 2a: payments and gateway. Payment channels, the attempt
-- history of every electronic vendor payment, the online-sales gateway's
-- transactions and its daily settlement batches, plus anomaly A11
-- (settlement leakage) and its decoys.
-- Contract: docs/nova-tier2-build-contract.md §4.2, §5, §6 (A11), §8, §10 G1.
--
-- Run order: 001 → 003 → 004 → 005 → 002 → 006 → 007 → 008 → 009 →
-- 010 (this) → 011 → 013 → 012. Reads 005 (nova_bank_accounts,
-- nova_dataset_meta) and 007 (nova_vendor_payments) only. It reads NO 008
-- table on purpose (§3.1), so a later fix can make 008 consume this file.
--
-- Two flows:
--   * PAYOUTS: each nova_vendor_payments row paid on an electronic rail gets
--     1–4 attempts. The last attempt IS the payment: its outcome is the
--     payment's status, its channel the payment's channel, its time the
--     payment's initiated_at, and its bank_ref the UTR 008 prints on the
--     statement (same formula, recomputed here from 005/007 columns).
--     Cheque payments get no attempts: a cheque is not routed on a rail.
--   * COLLECTIONS: the company's web shop, paid through one payment gateway.
--     It is a separate sales channel from the B2B invoice book, so nothing
--     here double-counts nova_payments.
--
-- success_rate on a channel is the TECHNICAL success rate: the share of its
-- attempts not lost to the rail itself (timeouts, bank or gateway outages).
-- Business declines (bad IFSC, insufficient funds, limits, card declines) are
-- the payer's or payee's problem, not the rail's, and ops teams exclude them
-- when they rank rails. The figure is computed from this file's own rows.
--
-- Determinism: every choice is pg_temp.gw_h(key), an md5 of a stable text
-- key, so no value depends on plan shape. setseed() is pinned anyway.
-- Rerun: truncates only this file's four tables in one statement (no
-- CASCADE) and deletes only A11 from nova_ground_truth. Cross-file ids are
-- soft (no FK), checked by the self-check block at the end (§2.2).
-- =============================================================================

-- One transaction: DDL, truncate, seed and self-check land together or not at all.
begin;

-- Reruns print "already exists, skipping" notices that bury real errors.
set local client_min_messages = warning;

-- Contract §2.1: a pinned stream, in case a later edit reaches for random().
select setseed(0.1010);

-- Parallel plans could reorder any random() calls; pinned for determinism.
set local max_parallel_workers_per_gather = 0;

-- -----------------------------------------------------------------------------
-- 1. Tables. Money numeric(14,2), fractions numeric(6,4), percents
-- numeric(5,2), statuses text + CHECK (contract §2.1).
-- -----------------------------------------------------------------------------

-- The rails the company pays out on and the gateway methods it collects on.
-- Per slice (§2.2.3): each company has its own bank, gateway and rates.
create table if not exists public.nova_payment_channels (
  -- Prefixed id, so an id reveals its type (convention since 001).
  id text primary key check (id like 'pch\_%'),
  -- The team's company book; the API pins every query on it.
  slice_no integer not null check (slice_no >= 0),
  -- The eight rails the contract fixes; attempts and captures name one.
  channel_code text not null check (channel_code in ('neft', 'rtgs', 'imps', 'upi_payout', 'gw_card', 'gw_upi', 'gw_netbanking', 'gw_wallet')),
  -- Payout = money out to vendors; collection = money in from web orders.
  direction text not null check (direction in ('payout', 'collection')),
  -- The bank for payouts, the gateway company for collections.
  provider text not null,
  -- How the fee is computed from fee_pct and fee_flat.
  fee_model text not null check (fee_model in ('flat', 'percent', 'percent_plus_flat', 'slab')),
  -- Domestic percentage fee as a fraction (0.0199 = 1.99%).
  fee_pct numeric(6,4) not null check (fee_pct >= 0),
  -- Cards only: the higher rate charged on foreign-issued cards.
  fee_pct_international numeric(6,4) check (fee_pct_international >= 0),
  -- Fixed fee per successful transaction, before GST.
  fee_flat numeric(14,2) not null check (fee_flat >= 0),
  -- GST charged on the fee (18% in India).
  gst_on_fee_pct numeric(5,2) not null,
  -- Smallest amount the rail accepts (RTGS: ₹2,00,000).
  min_amount numeric(14,2) not null check (min_amount >= 0),
  -- Largest amount the rail accepts; null = no cap.
  max_amount numeric(14,2) check (max_amount > 0),
  -- T+n days until collected money reaches the bank; 0 for payouts.
  settlement_days integer not null check (settlement_days >= 0),
  -- Same-day cut-off, HH:MM IST; null = none.
  cutoff_time text check (cutoff_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  -- '24x7' or 'HH:MM-HH:MM' IST.
  operating_hours text not null check (operating_hours ~ '^(24x7|[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9])$'),
  -- Trailing technical success rate (see the header), a fraction.
  success_rate numeric(6,4) not null check (success_rate between 0 and 1),
  -- Typical seconds from submit to final status.
  avg_latency_seconds integer not null check (avg_latency_seconds > 0),
  -- The day these terms took effect.
  effective_from date not null,
  -- Row birth time; excluded from the md5 check (§4 notation).
  created_at timestamptz not null default now(),
  -- One row per rail per company, so a lookup by code is unambiguous.
  constraint nova_payment_channels_code_key unique (slice_no, channel_code),
  -- A payout rail never settles later; a collection always takes ≥ 1 day.
  constraint nova_payment_channels_settle check ((direction = 'payout') = (settlement_days = 0))
);

-- Every try at sending a vendor payment, in order; the last is the payment.
create table if not exists public.nova_payment_attempts (
  -- Prefixed id.
  id text primary key check (id like 'pat\_%'),
  -- Equal to the vendor payment's slice (checked at the end of this file).
  slice_no integer not null check (slice_no >= 0),
  -- Soft reference into 007 (§2.2.1): an FK would break 007's rerun truncate.
  vendor_payment_id text not null,
  -- 1-based order of tries for one payment.
  attempt_no integer not null check (attempt_no between 1 and 4),
  -- Same-file FK: a channel row of the same company.
  channel_id text not null references public.nova_payment_channels(id) on delete restrict,
  -- When this try was submitted.
  attempted_at timestamptz not null,
  -- Always the payment's own amount: a retry resends the same instruction.
  amount numeric(14,2) not null check (amount > 0),
  -- reversed = accepted, then returned by the beneficiary bank.
  outcome text not null check (outcome in ('success', 'failed', 'timeout', 'reversed')),
  -- Why a try failed; null when it succeeded or was reversed.
  failure_code text check (failure_code in ('insufficient_funds', 'beneficiary_ifsc_invalid', 'beneficiary_account_closed', 'name_mismatch',
                                            'bank_timeout', 'limit_exceeded', 'cutoff_missed', 'duplicate_suspected')),
  -- Where in the chain it failed.
  failure_stage text check (failure_stage in ('initiation', 'remitter_bank', 'beneficiary_bank')),
  -- What ops did next.
  next_action text not null check (next_action in ('none', 'retry_same_channel', 'retry_alternate_channel', 'manual_review')),
  -- The UTR/RRN the bank gave the accepted try; null on failures.
  bank_ref text,
  -- Rail charge before GST on an accepted try; 0 on failures (banks bill success only).
  fee numeric(14,2) not null check (fee >= 0),
  -- Row birth time; excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- One row per try number per payment.
  constraint nova_payment_attempts_try_key unique (vendor_payment_id, attempt_no),
  -- A failure always has a code and a stage; a success or reversal has neither.
  constraint nova_payment_attempts_failure check ((outcome in ('failed', 'timeout')) = (failure_code is not null and failure_stage is not null))
);

-- One daily payout batch from the gateway to the collections account.
create table if not exists public.nova_settlements (
  -- Prefixed id.
  id text primary key check (id like 'stl\_%'),
  -- The company whose gateway account this batch belongs to.
  slice_no integer not null check (slice_no >= 0),
  -- The payout UTR, the key a team matches against a bank credit.
  settlement_ref text not null,
  -- The day the batch was paid out (never after as_of).
  settlement_date date not null,
  -- First and last capture date the batch covers.
  period_start date not null,
  period_end date not null,
  -- How many linked gateway transactions the batch carries.
  txn_count integer not null check (txn_count >= 0),
  -- Captured sales in the batch.
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  -- Refunds deducted from this batch.
  refunds numeric(14,2) not null check (refunds >= 0),
  -- Chargebacks deducted from this batch.
  chargebacks numeric(14,2) not null check (chargebacks >= 0),
  -- Gateway fees on the batch's captures, and the GST on them.
  fees numeric(14,2) not null check (fees >= 0),
  gst_on_fees numeric(14,2) not null check (gst_on_fees >= 0),
  -- Signed extras: + chargeback won back, − refund recovered.
  adjustments numeric(14,2) not null default 0,
  -- Why adjustments is non-zero; null when it is zero.
  adjustment_reason text check (adjustment_reason in ('chargeback reversal', 'refund recovery')),
  -- The gateway_ref the adjustment concerns (text, not an id).
  adjustment_ref text,
  -- What actually reached the bank.
  net_amount numeric(14,2) not null,
  -- Soft reference into 005: the slice's collections account.
  payout_account_id text not null,
  -- on_hold = the gateway kept the payout back (risk review).
  status text not null check (status in ('settled', 'on_hold')),
  -- Row birth time; excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- A UTR names one payout of one company.
  constraint nova_settlements_ref_key unique (slice_no, settlement_ref),
  -- One batch per settlement day (§4.2 rules).
  constraint nova_settlements_day_key unique (slice_no, settlement_date),
  -- The reported components always add up; leakage shows only on recompute (A11).
  constraint nova_settlements_net check (net_amount = gross_amount - refunds - chargebacks - fees - gst_on_fees + adjustments),
  -- A reason and a ref exist exactly when there is an adjustment.
  constraint nova_settlements_adjustment check ((adjustments = 0) = (adjustment_reason is null) and (adjustment_reason is null) = (adjustment_ref is null)),
  -- A batch covers captures from before it was paid.
  constraint nova_settlements_period check (period_start <= period_end and period_end <= settlement_date)
);

-- Every event on the gateway: captures, refunds, chargebacks and reversals.
create table if not exists public.nova_gateway_transactions (
  -- Prefixed id.
  id text primary key check (id like 'gtx\_%'),
  -- The company's gateway account.
  slice_no integer not null check (slice_no >= 0),
  -- The gateway's own reference, unique per company (indexed below).
  gateway_ref text not null,
  -- The web shop's order id, in that company's own format; a refund repeats it.
  order_ref text not null,
  -- Hashed shopper id: repeat buyers share it, no names are held.
  customer_ref text not null,
  -- Same-file FK: a collection channel of the same company.
  channel_id text not null references public.nova_payment_channels(id) on delete restrict,
  -- Cards only: foreign-issued cards cost more (fee_pct_international).
  card_scope text check (card_scope in ('domestic', 'international')),
  -- The event kind; everything but a capture points at its parent.
  txn_type text not null check (txn_type in ('capture', 'refund', 'chargeback', 'chargeback_reversal')),
  -- Same-file self-FK: refund/chargeback → capture, reversal → chargeback.
  parent_txn_id text references public.nova_gateway_transactions(id) on delete restrict,
  -- When the event happened.
  txn_at timestamptz not null,
  -- Gross, always positive; the sign comes from txn_type.
  amount numeric(14,2) not null check (amount > 0),
  -- Gateway fee before GST; only successful captures carry one.
  fee numeric(14,2) not null check (fee >= 0),
  -- 18% GST on the fee.
  gst_on_fee numeric(14,2) not null check (gst_on_fee >= 0),
  -- amount − fee − GST: what the event is worth in its batch.
  net_amount numeric(14,2) not null,
  -- failed = never charged; pending = not yet final at as_of.
  status text not null check (status in ('success', 'failed', 'pending')),
  -- Why a capture failed; null otherwise.
  failure_code text check (failure_code in ('card_declined', 'authentication_failed', 'insufficient_funds', 'risk_declined',
                                            'upi_collect_expired', 'bank_unavailable', 'gateway_timeout')),
  -- Same-file FK: the batch that paid this event out; null = not in a batch.
  settlement_id text references public.nova_settlements(id) on delete restrict,
  -- The network / UPI RRN of a successful event.
  bank_rrn text,
  -- Row birth time; excluded from the md5 check.
  created_at timestamptz not null default now(),
  -- Captures stand alone; every other event has a parent.
  constraint nova_gateway_transactions_parent check ((txn_type = 'capture') = (parent_txn_id is null)),
  -- The net always adds up, so a batch can be recomputed from its rows.
  constraint nova_gateway_transactions_net check (net_amount = amount - fee - gst_on_fee),
  -- A code only on failures, and every failure has one.
  constraint nova_gateway_transactions_failure check ((status = 'failed') = (failure_code is not null))
);

-- -----------------------------------------------------------------------------
-- 2. Indexes: (slice_no, main date desc) for every API list (§2.1), plus the
-- lookup and FK columns, which Postgres never indexes on its own.
-- -----------------------------------------------------------------------------
create index if not exists nova_payment_channels_slice_idx on public.nova_payment_channels (slice_no, effective_from desc);
create index if not exists nova_payment_attempts_slice_idx on public.nova_payment_attempts (slice_no, attempted_at desc);
-- The child route vendor-payments/payment-attempts; also the soft reference (§2.2.1).
create index if not exists nova_payment_attempts_vendor_payment_idx on public.nova_payment_attempts (vendor_payment_id);
create index if not exists nova_settlements_slice_idx on public.nova_settlements (slice_no, settlement_date desc);
-- Soft reference, indexed as §2.2.1 requires.
create index if not exists nova_settlements_payout_account_idx on public.nova_settlements (payout_account_id);
create index if not exists nova_gateway_transactions_slice_idx on public.nova_gateway_transactions (slice_no, txn_at desc);
-- The child route settlements/gateway-transactions.
create index if not exists nova_gateway_transactions_settlement_idx on public.nova_gateway_transactions (settlement_id);
-- Refund and chargeback trails walk parent → child.
create index if not exists nova_gateway_transactions_parent_idx on public.nova_gateway_transactions (parent_txn_id);
-- The gateway's reference is unique within a company (§4.2).
create unique index if not exists nova_gateway_transactions_gateway_ref_key on public.nova_gateway_transactions (slice_no, gateway_ref);

-- -----------------------------------------------------------------------------
-- 3. Read views, one per table (§2.1). Dropped and recreated because a view's
-- column list freezes at creation; views hold no data.
-- -----------------------------------------------------------------------------
drop view if exists public.nova_payment_channels_v, public.nova_payment_attempts_v,
  public.nova_settlements_v, public.nova_gateway_transactions_v;

-- security_invoker so a view can never bypass RLS for its caller (see 001).
create view public.nova_payment_channels_v     with (security_invoker = true) as select * from public.nova_payment_channels;
create view public.nova_payment_attempts_v     with (security_invoker = true) as select * from public.nova_payment_attempts;
create view public.nova_settlements_v          with (security_invoker = true) as select * from public.nova_settlements;
create view public.nova_gateway_transactions_v with (security_invoker = true) as select * from public.nova_gateway_transactions;

-- -----------------------------------------------------------------------------
-- 4. Lockdown, as in 001/007, scoped to this file's eight relations so it
-- never re-grants something another file deliberately narrowed.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Each of this file's tables and views.
  r record;
begin
  -- Walk the catalogue, so every relation of ours is covered by name.
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
      and c.relname in ('nova_payment_channels', 'nova_payment_attempts', 'nova_settlements', 'nova_gateway_transactions',
                        'nova_payment_channels_v', 'nova_payment_attempts_v', 'nova_settlements_v', 'nova_gateway_transactions_v')
  loop
    -- anon ships in browser bundles; authenticated is any signed-up user.
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
    -- The server's only credential.
    execute format('grant select, insert, update, delete on public.%I to service_role', r.relname);
    -- RLS with no policies = deny-all for every role without BYPASSRLS.
    if r.relkind = 'r' then
      -- Views have no RLS of their own; security_invoker defers to the table's.
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Rerun cleanup: only what this file owns (§3.1 rerun rules).
-- -----------------------------------------------------------------------------

-- One statement, no CASCADE: nothing outside this file references these
-- tables by FK, so if something ever does, this fails loudly instead of
-- silently emptying another file's data.
truncate table public.nova_gateway_transactions, public.nova_settlements, public.nova_payment_attempts, public.nova_payment_channels;

-- A11 has exactly one owner, this file (§2.2.5), so the code alone filters it.
delete from public.nova_ground_truth where anomaly_code in ('A11');

-- -----------------------------------------------------------------------------
-- 6. Seed helpers and per-company settings.
-- -----------------------------------------------------------------------------

-- A [0,1) roll from a text key: first 32 bits of its md5. Same key, same
-- roll, whatever order the planner visits rows in (the 007 pc_roll idea).
create function pg_temp.gw_h(p_key text) returns float8
language sql immutable as $$ select ('x' || substr(md5(p_key), 1, 8))::bit(32)::bigint / 4294967296.0 $$;

-- n stable decimal digits from a key. Byte-for-byte 008's pg_temp.dg, so the
-- UTRs recomputed below equal the bank_ref 008 prints for the same payment.
create function pg_temp.gw_dg(p_key text, n integer) returns text
language sql immutable as $$ select substr(translate(md5(p_key) || md5(p_key || '#'), 'abcdef', '012345'), 1, n) $$;

-- Rolls a gateway payout day off the weekend: banks credit Monday–Friday.
create function pg_temp.gw_bday(d date) returns date
language sql immutable as $$ select d + case extract(isodow from d)::int when 6 then 2 when 7 then 1 else 0 end $$;

-- The frozen clock (005). Every date below is relative to it, never current_date.
create temp table gw_asof on commit drop as
select as_of_date as d, as_of_date - 364 as w_start from public.nova_dataset_meta where id;

-- One row per company: the accounts this file needs and its gateway terms.
create temp table gw_slice on commit drop as
select b.slice_no,
  -- The account gateway payouts land in (005 gives every slice exactly one).
  max(b.id) filter (where b.purpose = 'collections') as coll_id,
  max(b.ifsc) filter (where b.purpose = 'collections') as coll_ifsc,
  -- The payout rails are the vendor account's bank.
  max(b.bank) filter (where b.purpose = 'vendor') as vendor_bank,
  -- One gateway per company, from a bank of made-up brand names.
  (array['Paynexa Payments', 'Orbipay Networks', 'Cashlane Payments', 'Settlix Technologies', 'Paycurve Solutions',
         'Tranzora Payments', 'Vellapay Networks', 'Quickrail Payments'])[1 + floor(pg_temp.gw_h('gwname|' || b.slice_no) * 8)::int] as gw_name,
  -- How many web orders the shop takes in the year: 630–680 captures.
  630 + floor(pg_temp.gw_h('ncap|' || b.slice_no) * 51)::int as n_cap,
  -- Order-number style of that shop's platform (0–3).
  floor(pg_temp.gw_h('ofmt|' || b.slice_no) * 4)::int as order_fmt,
  -- Size of the shopper base: fewer shoppers = more repeat buyers.
  350 + floor(pg_temp.gw_h('pool|' || b.slice_no) * 150)::int as cust_pool
from public.nova_bank_accounts b
group by b.slice_no;

-- -----------------------------------------------------------------------------
-- 7. Payment channels: 8 per company. Payout fees are NOT varied: they must
-- equal the charges 008 debits on the statement (RTGS ₹25, IMPS ₹5, NEFT and
-- UPI free, each + 18% GST). Everything else varies per company by hash.
-- -----------------------------------------------------------------------------
insert into public.nova_payment_channels (id, slice_no, channel_code, direction, provider, fee_model, fee_pct, fee_pct_international,
  fee_flat, gst_on_fee_pct, min_amount, max_amount, settlement_days, cutoff_time, operating_hours, success_rate, avg_latency_seconds, effective_from)
select
  -- Contract §2.1 id shape: table, slice and a stable key.
  'pch_' || left(md5('nova_payment_channels|' || s.slice_no || '|' || c.code), 12),
  s.slice_no, c.code, c.direction,
  -- Payout rails run through the company's vendor bank; collections through its gateway.
  case c.direction when 'payout' then s.vendor_bank else s.gw_name end,
  c.fee_model, c.fee_pct, c.fee_pct_intl, c.fee_flat,
  -- GST on a financial service fee is 18%.
  18.00, c.min_amount, c.max_amount, c.settle, c.cutoff, '24x7',
  -- Placeholder: section 14 replaces it with the rate measured on this file's rows.
  0.9900,
  c.latency,
  -- Terms signed before the book window opens, a different day per rail.
  date '2024-04-01' + floor(pg_temp.gw_h('eff|' || s.slice_no || c.code) * 450)::int
from gw_slice s
cross join lateral (values
  -- NEFT: free online for current accounts, no cap; settles in half-hourly batches.
  ('neft', 'payout', 'flat', 0.0000, null::numeric, 0.00, 1.00, null::numeric, 0, null::text,
   1200 + floor(pg_temp.gw_h('lat|neft|' || s.slice_no) * 1200)::int),
  -- RTGS: RBI floor ₹2,00,000; the bank's same-day cut-off falls after AP's last keying (17:12).
  ('rtgs', 'payout', 'flat', 0.0000, null, 25.00, 200000.00, null, 0, '17:30',
   60 + floor(pg_temp.gw_h('lat|rtgs|' || s.slice_no) * 120)::int),
  -- IMPS: instant, capped at ₹5,00,000 per transfer.
  ('imps', 'payout', 'flat', 0.0000, null, 5.00, 1.00, 500000.00, 0, null,
   5 + floor(pg_temp.gw_h('lat|imps|' || s.slice_no) * 25)::int),
  -- UPI payouts: instant, ₹1,00,000 per transfer.
  ('upi_payout', 'payout', 'flat', 0.0000, null, 0.00, 1.00, 100000.00, 0, null,
   3 + floor(pg_temp.gw_h('lat|upi|' || s.slice_no) * 10)::int),
  -- Cards: ~1.8–2.2% domestic, ~2.8–3.5% on foreign cards, T+2 or T+3.
  ('gw_card', 'collection', 'percent', round((0.0180 + pg_temp.gw_h('fee|card|' || s.slice_no) * 0.0040)::numeric, 4),
   round((0.0280 + pg_temp.gw_h('fee|intl|' || s.slice_no) * 0.0070)::numeric, 4), 0.00, 1.00, null, 2 + (pg_temp.gw_h('sd|card|' || s.slice_no) < 0.3)::int, null,
   4 + floor(pg_temp.gw_h('lat|gwc|' || s.slice_no) * 6)::int),
  -- UPI collections: zero or near-zero MDR, capped at ₹1,00,000, T+1.
  ('gw_upi', 'collection', 'percent', (array[0.0000, 0.0000, 0.0015, 0.0025])[1 + floor(pg_temp.gw_h('fee|upi|' || s.slice_no) * 4)::int]::numeric,
   null, 0.00, 1.00, 100000.00, 1, null, 5 + floor(pg_temp.gw_h('lat|gwu|' || s.slice_no) * 10)::int),
  -- Netbanking: a flat ₹12–20 per payment, T+1 or T+2.
  ('gw_netbanking', 'collection', 'flat', 0.0000, null, (12 + floor(pg_temp.gw_h('fee|nb|' || s.slice_no) * 9))::numeric(14,2),
   1.00, null, 1 + (pg_temp.gw_h('sd|nb|' || s.slice_no) < 0.5)::int, null, 20 + floor(pg_temp.gw_h('lat|gwn|' || s.slice_no) * 40)::int),
  -- Wallets: ~1.5–2% plus ₹1–2, wallet balances cap a payment at ₹10,000, T+2.
  ('gw_wallet', 'collection', 'percent_plus_flat', round((0.0150 + pg_temp.gw_h('fee|wal|' || s.slice_no) * 0.0050)::numeric, 4), null,
   (1 + (pg_temp.gw_h('flat|wal|' || s.slice_no) < 0.5)::int)::numeric(14,2), 1.00, 10000.00, 2, null, 2 + floor(pg_temp.gw_h('lat|gww|' || s.slice_no) * 4)::int)
) as c(code, direction, fee_model, fee_pct, fee_pct_intl, fee_flat, min_amount, max_amount, settle, cutoff, latency);

-- The channel rows every later step looks up by (slice, code).
create temp table gw_ch on commit drop as
select c.* from public.nova_payment_channels c;
-- Lookups by company and rail code.
create index on gw_ch (slice_no, channel_code);

-- -----------------------------------------------------------------------------
-- 8. Payment attempts. The final attempt reproduces 007's payment exactly;
-- earlier ones come BEFORE it the same day (from 08:00 IST), 5 minutes to
-- 4 hours apart, so initiated_at is the moment the deciding try went out.
-- -----------------------------------------------------------------------------
create temp table gw_pay on commit drop as
select v.id, v.slice_no, v.amount, v.status, v.initiated_at, v.channel,
  -- 007 says 'upi'; the rail list names the payout variant 'upi_payout'.
  case v.channel when 'upi' then 'upi_payout' else v.channel end as final_ch,
  -- The IST calendar day and minute of day: the day the statement shows it.
  (v.initiated_at at time zone 'Asia/Kolkata')::date as ist_day,
  extract(epoch from (v.initiated_at at time zone 'Asia/Kolkata')::time)::int / 60 as ist_min,
  -- 008's UTR, same formula and inputs (its posted date is the IST day, capped at as_of).
  case when v.status in ('success', 'reversed') then
    case when v.channel in ('neft', 'rtgs') then left(fa.ifsc, 4) || case when v.channel = 'rtgs' then 'R' else 'N' end
           || to_char(least(a.d, (v.initiated_at at time zone 'Asia/Kolkata')::date), 'YYMMDD') || pg_temp.gw_dg(v.id || 'utr', 8)
         else pg_temp.gw_dg(v.id || 'rrn', 12) end
  end as utr,
  -- Exactly 30% of each company's electronic payments needed 2–4 tries, picked by
  -- hashed rank (60% of them two, 28% three, 12% four). A fixed share, not a
  -- per-row coin flip, keeps every company inside the 260–320 attempts band.
  case when v.rk <= round(0.30 * v.n_el)
       then 2 + (v.rk > round(0.60 * round(0.30 * v.n_el)))::int + (v.rk > round(0.88 * round(0.30 * v.n_el)))::int
       else 1 end as n_try
from (select v.*,
  -- Hashed position of the payment inside its company, and the company's electronic count.
  row_number() over (partition by v.slice_no order by md5('multi|' || v.id)) as rk,
  count(*) over (partition by v.slice_no) as n_el
  from public.nova_vendor_payments v
  -- A cheque is paper: it is presented, not routed, so it has no attempts.
  where v.channel <> 'cheque') as v
cross join gw_asof a
-- The paying account's IFSC gives the UTR its bank code, exactly as in 008.
join public.nova_bank_accounts fa on fa.id = v.from_account_id;

-- One row per try, with its rail. An earlier try either breaks a rail's cap
-- (the only way limit_exceeded arises), routes to another valid rail, or
-- repeats the final rail. Rails an amount is not allowed on are never "valid".
create temp table gw_try on commit drop as
select p.*, t.i, t.i = p.n_try as is_final, x.lim_ch,
  case when t.i = p.n_try then p.final_ch
       -- 15%: someone first tried the instant rail and hit its cap.
       when x.r < 0.15 and x.lim_ch is not null then x.lim_ch
       -- 30%: alternate routing to another rail this amount may use.
       when x.r < 0.45 and cardinality(x.alts) > 0 then x.alts[1 + floor(pg_temp.gw_h('altpick|' || p.id || '|' || t.i) * cardinality(x.alts))::int]
       -- Otherwise the same rail was simply retried.
       else p.final_ch end as ch,
  -- Minutes from this try to the next, 6–239 so the ±50 s jitter below keeps
  -- every gap inside the contract's 5 minutes to 4 hours; the final try has none.
  case when t.i < p.n_try then 6 + floor(pg_temp.gw_h('gap|' || p.id || '|' || t.i) * (least(240, (p.ist_min - 480) / (p.n_try - 1)) - 7))::int
       else 0 end as gap
from gw_pay p
cross join lateral generate_series(1, p.n_try) as t(i)
cross join lateral (select
  -- One roll decides this try's routing.
  pg_temp.gw_h('alt|' || p.id || '|' || t.i) as r,
  -- The rail whose cap this amount breaks, if any (IMPS ₹5L, UPI ₹1L).
  case when p.amount > 500000 then 'imps' when p.amount > 100000 then 'upi_payout' end as lim_ch,
  -- Rails the amount may legally use, other than the final one.
  array_remove(array_remove(array['neft',
    case when p.amount >= 200000 then 'rtgs' end,
    case when p.amount <= 500000 then 'imps' end,
    case when p.amount <= 100000 then 'upi_payout' end], null), p.final_ch) as alts
) x;

-- Codes before capping timeouts. The failure_code bank is per position: the
-- final try of a failed payment can fail on a closed account; an earlier try
-- cannot, because the retry went to the same beneficiary account and worked.
create temp table gw_try2 on commit drop as
select t.*,
  -- The next try's rail, for next_action.
  lead(t.ch) over (partition by t.id order by t.i) as next_ch,
  -- Minutes before initiated_at: the sum of the gaps from this try onward.
  sum(t.gap) over (partition by t.id order by t.i desc rows unbounded preceding) as mins_before,
  case when t.is_final and t.status <> 'failed' then null
       when not t.is_final and t.ch = t.lim_ch then 'limit_exceeded'
       when t.is_final then
         case when f.f < 0.25 then 'insufficient_funds' when f.f < 0.45 then 'beneficiary_ifsc_invalid'
              when f.f < 0.65 then 'beneficiary_account_closed' when f.f < 0.85 then 'name_mismatch' else 'duplicate_suspected' end
       else
         case when f.f < 0.18 then 'insufficient_funds' when f.f < 0.36 then 'beneficiary_ifsc_invalid'
              when f.f < 0.64 then 'name_mismatch' when f.f < 0.78 then 'bank_timeout' else 'duplicate_suspected' end
  end as code0
from gw_try t
cross join lateral (select pg_temp.gw_h('fc|' || t.id || '|' || t.i) as f) f;

-- A rail's technical failures (timeouts) are capped at 4% of its tries in a
-- company, so its success_rate lands in the contract's 0.95–0.995 band. A
-- timeout over the cap becomes a name mismatch, the commonest business decline.
create temp table gw_att on commit drop as
select t.*,
  case when t.code0 = 'bank_timeout' and t.tk > floor(0.04 * t.n_on_ch) then 'name_mismatch' else t.code0 end as code
from (
  select t.*,
    -- Tries this company made on this rail.
    count(*) over (partition by t.slice_no, t.ch) as n_on_ch,
    -- Hashed rank among this rail's timeout candidates.
    row_number() over (partition by t.slice_no, t.ch, t.code0 = 'bank_timeout' order by md5('tmo|' || t.id || t.i)) as tk
  from gw_try2 t
) t;

-- Write the attempts.
insert into public.nova_payment_attempts (id, slice_no, vendor_payment_id, attempt_no, channel_id, attempted_at, amount, outcome,
  failure_code, failure_stage, next_action, bank_ref, fee)
select
  -- Contract §2.1 id shape.
  'pat_' || left(md5('nova_payment_attempts|' || t.slice_no || '|' || t.id || '|' || t.i), 12),
  t.slice_no, t.id, t.i, c.id,
  -- Earlier tries lead up to the payment's own timestamp, seconds jittered.
  t.initiated_at - make_interval(mins => t.mins_before::int)
    - case when t.is_final then interval '0' else make_interval(secs => floor(pg_temp.gw_h('sec|' || t.id || t.i) * 50)::int) end,
  t.amount,
  -- The final try IS the payment: same outcome as 007's status.
  case when t.is_final then t.status when t.code = 'bank_timeout' then 'timeout' else 'failed' end,
  t.code,
  -- Where each code arises: validation at initiation, balance and duplicate
  -- checks at the remitter bank, account and name checks at the beneficiary.
  case t.code when 'limit_exceeded' then 'initiation' when 'beneficiary_ifsc_invalid' then 'initiation'
              when 'insufficient_funds' then 'remitter_bank' when 'duplicate_suspected' then 'remitter_bank'
              when 'beneficiary_account_closed' then 'beneficiary_bank' when 'name_mismatch' then 'beneficiary_bank'
              when 'bank_timeout' then case when pg_temp.gw_h('stg|' || t.id || t.i) < 0.5 then 'remitter_bank' else 'beneficiary_bank' end end,
  -- Ops' next step: retry (same or other rail), or a person looks at it.
  case when t.is_final then case when t.status = 'success' then 'none' else 'manual_review' end
       when t.next_ch = t.ch then 'retry_same_channel' else 'retry_alternate_channel' end,
  -- Only the accepted try has a UTR; a reversed transfer was accepted first.
  case when t.is_final then t.utr end,
  -- Banks bill the rail charge on accepted transfers only.
  case when t.is_final and t.status <> 'failed' then c.fee_flat else 0 end
from gw_att t
join gw_ch c on c.slice_no = t.slice_no and c.channel_code = t.ch;

-- -----------------------------------------------------------------------------
-- 9. Web-shop captures. Days are drawn by stratified quantiles over a daily
-- weight (weekends +30%, the first week of a month +35% for payday, ±20%
-- noise per company), so volume is smooth and every day has orders.
-- -----------------------------------------------------------------------------
create temp table gw_day on commit drop as
select s.slice_no, d.d::date as d,
  -- Running weight up to and including this day, and the year's total.
  sum(w.w) over (partition by s.slice_no order by d.d) as cum,
  sum(w.w) over (partition by s.slice_no) as tot
from gw_slice s
cross join gw_asof a
cross join generate_series(a.w_start, a.d, interval '1 day') as d(d)
cross join lateral (select
  (case when extract(isodow from d.d) in (6, 7) then 1.25 else 0.95 end)
  * (case when extract(day from d.d) <= 7 then 1.35 else 1 end)
  * (0.8 + 0.4 * pg_temp.gw_h('dw|' || s.slice_no || '|' || d.d::date)) as w) w;
-- The quantile lookup below walks this index once per capture.
create index on gw_day (slice_no, cum);

-- One row per capture, k = 1..n_cap in time order (the shop's order counter).
create temp table gw_cap on commit drop as
select s.slice_no, k.k, 'c' || k.k as key, s.n_cap,
  -- The last two orders fall on as_of: captured, successful, not yet due to
  -- settle. They are the A11(b) decoys (section 11), placed where any shop has them.
  case when k.k > s.n_cap - 2 then a.d
       else (select g.d from gw_day g where g.slice_no = s.slice_no and g.cum >= (k.k - 0.5) / s.n_cap * g.tot order by g.cum limit 1) end as day,
  -- Evening-heavy shopping hours, 07:00–23:59 IST (so the UTC date is the IST date).
  420 + floor(power(pg_temp.gw_h('tm|' || s.slice_no || '|' || k.k), 0.8) * 1019)::int as minute,
  floor(pg_temp.gw_h('sec|' || s.slice_no || '|' || k.k) * 60)::int as sec,
  -- Log-normal order value around ₹2,200, then shelf pricing (₹x99 about 45% of the time).
  greatest(300, least(60000,
    case when pg_temp.gw_h('p99|' || s.slice_no || '|' || k.k) < 0.45 then round(z.v / 100) * 100 - 1 else round(z.v) end))::numeric(14,2) as amount,
  -- One roll for the payment method, one for success.
  pg_temp.gw_h('ch|' || s.slice_no || '|' || k.k) as r_ch,
  pg_temp.gw_h('st|' || s.slice_no || '|' || k.k) as r_st,
  a.d as as_of
from gw_slice s
cross join gw_asof a
cross join lateral generate_series(1, s.n_cap) as k(k)
-- Box–Muller from two hash rolls gives the normal draw behind the log-normal.
cross join lateral (select exp(ln(2200) + 0.95 * sqrt(-2 * ln(greatest(pg_temp.gw_h('a1|' || s.slice_no || '|' || k.k), 1e-9)))
  * cos(2 * pi() * pg_temp.gw_h('a2|' || s.slice_no || '|' || k.k)))::numeric as v) z;

-- Method, status and the columns that follow from them.
create temp table gw_cap2 on commit drop as
select c.*, m.code, ch.id as channel_id, ch.settlement_days,
  -- Foreign-issued cards: about 8% of card payments.
  case when m.code = 'gw_card' then case when pg_temp.gw_h('intl|' || c.slice_no || '|' || c.k) < 0.08 then 'international' else 'domestic' end end as card_scope,
  st.status,
  -- Failure mix per method; gateway_timeout and bank_unavailable are the
  -- technical ones that count against success_rate (~15% of failures).
  case when st.status = 'failed' then
    case m.code
      when 'gw_card' then case when f.g < 0.08 then 'gateway_timeout' when f.g < 0.15 then 'bank_unavailable' when f.g < 0.45 then 'card_declined'
                               when f.g < 0.75 then 'authentication_failed' when f.g < 0.88 then 'insufficient_funds' else 'risk_declined' end
      when 'gw_upi' then case when f.g < 0.08 then 'gateway_timeout' when f.g < 0.16 then 'bank_unavailable' when f.g < 0.60 then 'upi_collect_expired'
                              else 'insufficient_funds' end
      when 'gw_netbanking' then case when f.g < 0.07 then 'gateway_timeout' when f.g < 0.20 then 'bank_unavailable' else 'authentication_failed' end
      else case when f.g < 0.08 then 'gateway_timeout' when f.g < 0.55 then 'insufficient_funds' else 'authentication_failed' end
    end end as failure_code,
  -- Batch day: T+n on the method's terms, rolled off the weekend.
  pg_temp.gw_bday(c.day + ch.settlement_days) as settle_on,
  -- Plant roles are set in section 11; null = an ordinary capture.
  null::text as role
from gw_cap c
cross join lateral (select case
  when c.r_ch < 0.46 then 'gw_upi' when c.r_ch < 0.76 then 'gw_card' when c.r_ch < 0.90 then 'gw_netbanking'
  -- A wallet balance cannot cover more than ₹10,000; those shoppers pay by UPI.
  when c.amount > 10000 then 'gw_upi' else 'gw_wallet' end as code) m
join gw_ch ch on ch.slice_no = c.slice_no and ch.channel_code = m.code
cross join lateral (select case
  -- The two as_of decoys are successful by construction.
  when c.k > c.n_cap - 2 then 'success'
  -- About 9% of captures fail.
  when c.r_st < 0.09 then 'failed'
  -- A third of today's orders are still awaiting the bank's answer.
  when c.day = c.as_of and pg_temp.gw_h('pend|' || c.slice_no || '|' || c.k) < 0.35 then 'pending'
  else 'success' end as status) st
cross join lateral (select pg_temp.gw_h('fcc|' || c.slice_no || '|' || c.k) as g) f;
-- Section 10 and 11 pick by (slice, key).
create index on gw_cap2 (slice_no, k);

-- -----------------------------------------------------------------------------
-- 10. Refunds, chargebacks and chargeback reversals, each hanging off a
-- successful capture. Refunds: 3–5% of successful captures, 1–20 days later.
-- Chargebacks: 5 per company (~0.75% of captures), 15–60 days later, on
-- orders old enough that a dispute could have run its course. Two of the
-- five are won back (40%), 20–45 days after the chargeback.
-- -----------------------------------------------------------------------------
create temp table gw_evt (
  -- Stable key the id is derived from ('r'/'b'/'v' + the capture's k).
  key text not null, slice_no int not null, txn_type text not null,
  -- The capture's (or, for a reversal, the chargeback's) key.
  parent_key text not null, day date not null, minute int not null, amount numeric(14,2) not null,
  status text not null, rrn text,
  -- Section 12 links it to a batch; won_rank marks the two won disputes.
  settle_key date, won_rank int
) on commit drop;

-- Refunds: whole order about 70% of the time, else a partial return.
insert into gw_evt (key, slice_no, txn_type, parent_key, day, minute, amount, status, rrn)
select 'r' || c.k, c.slice_no, 'refund', c.key,
  c.day + 1 + floor(pg_temp.gw_h('rfd|' || c.slice_no || c.key) * least(20, c.as_of - c.day))::int,
  540 + floor(pg_temp.gw_h('rfm|' || c.slice_no || c.key) * 660)::int,
  case when pg_temp.gw_h('rfa|' || c.slice_no || c.key) < 0.7 then c.amount
       else round(c.amount * (0.2 + 0.7 * pg_temp.gw_h('rfp|' || c.slice_no || c.key))::numeric, 2) end,
  'success', pg_temp.gw_dg('rfrrn|' || c.slice_no || c.key, 12)
from (
  select c.*, row_number() over (partition by c.slice_no order by md5('rf|' || c.slice_no || c.key)) as rn,
    -- 3–5% of the company's successful captures.
    round(count(*) over (partition by c.slice_no) * (0.03 + 0.02 * pg_temp.gw_h('nref|' || c.slice_no))::numeric) as n_ref
  from gw_cap2 c
  where c.status = 'success' and c.k <= c.n_cap - 2 and c.day <= c.as_of - 2
) c
where c.rn <= c.n_ref;
-- A refund raised on as_of is still being processed half the time.
update gw_evt e set status = 'pending'
from gw_asof a where e.day = a.d and pg_temp.gw_h('rfpend|' || e.slice_no || e.key) < 0.5;

-- Chargebacks on card and UPI orders at least 120 days before as_of, not refunded.
insert into gw_evt (key, slice_no, txn_type, parent_key, day, minute, amount, status, rrn, won_rank)
select 'b' || c.k, c.slice_no, 'chargeback', c.key,
  c.day + 15 + floor(pg_temp.gw_h('cbd|' || c.slice_no || c.key) * 46)::int,
  600 + floor(pg_temp.gw_h('cbm|' || c.slice_no || c.key) * 480)::int,
  -- A dispute claws back the whole order.
  c.amount, 'success',
  -- The disputed payment's RRN, which is how a chargeback is traced back.
  pg_temp.gw_dg('rrn|' || c.slice_no || c.key, 12),
  -- The two disputes won, by hashed rank.
  nullif(least(row_number() over (partition by c.slice_no order by md5('won|' || c.slice_no || c.key)), 3), 3)
from (
  select c.*, row_number() over (partition by c.slice_no order by md5('cb|' || c.slice_no || c.key)) as rn
  from gw_cap2 c
  where c.status = 'success' and c.code in ('gw_card', 'gw_upi') and c.day <= c.as_of - 120
    and not exists (select 1 from gw_evt e where e.slice_no = c.slice_no and e.parent_key = c.key)
) c
where c.rn <= 5;

-- Reversals of the two won disputes: the gateway returns the money.
insert into gw_evt (key, slice_no, txn_type, parent_key, day, minute, amount, status, rrn, won_rank)
select 'v' || substr(b.key, 2), b.slice_no, 'chargeback_reversal', b.key,
  b.day + 20 + floor(pg_temp.gw_h('cbv|' || b.slice_no || b.key) * 26)::int,
  600 + floor(pg_temp.gw_h('cbvm|' || b.slice_no || b.key) * 480)::int,
  b.amount, 'success', b.rrn, b.won_rank
from gw_evt b
where b.txn_type = 'chargeback' and b.won_rank is not null;

-- -----------------------------------------------------------------------------
-- 11. A11 capture-level plants and decoys, at hashed positions among
-- ordinary captures that no refund or chargeback touches (so each has one
-- signal only). Section 12 plants the batch-level patterns.
-- -----------------------------------------------------------------------------
update gw_cap2 c set role = p.role
from (
  select c.slice_no, c.k,
    -- Ranked separately per candidate pool, then the top n of each pool plays a role.
    case when c.pool = 'dom_card' and c.rn <= 3 then 'a11a'
         when c.pool = 'intl_card' and c.rn <= 2 then 'a11a_decoy'
         when c.pool = 'old' and c.rn <= 2 then 'a11b' end as role
  from (
    select c.slice_no, c.k, x.pool,
      row_number() over (partition by c.slice_no, x.pool order by md5(x.pool || '|' || c.slice_no || '|' || c.key)) as rn
    from gw_cap2 c
    cross join lateral (select case
      -- (a) fee above contract: domestic cards whose batch is already paid.
      when c.code = 'gw_card' and c.card_scope = 'domestic' and c.k % 2 = 0 then 'dom_card'
      -- Decoy: a foreign card, legitimately at the higher rate.
      when c.code = 'gw_card' and c.card_scope = 'international' then 'intl_card'
      -- (b) missing settlement: well past T+n+3 (10+ days old), any method.
      when c.k % 2 = 1 then 'old' end as pool) x
    where c.status = 'success' and c.k <= c.n_cap - 2 and c.settle_on <= c.as_of - 7 and c.day <= c.as_of - 10
      and not exists (select 1 from gw_evt e where e.slice_no = c.slice_no and e.parent_key = c.key)
  ) c
) p
where p.role is not null and c.slice_no = p.slice_no and c.k = p.k;

-- The two as_of captures: settled tomorrow at the earliest, so not yet in a batch.
update gw_cap2 c set role = 'a11b_decoy' where c.k > c.n_cap - 2;

-- -----------------------------------------------------------------------------
-- 12. Settlement batches: one per payout day that has settled captures
-- (§4.2). An A11(b) capture is left out of its batch, which is the plant.
-- A refund, chargeback or won-back reversal is taken in the first batch paid
-- after the day it happened.
-- -----------------------------------------------------------------------------
create temp table gw_batch on commit drop as
select c.slice_no, c.settle_on as sdate,
  -- Contract §2.1 id shape; the payout day is unique per company.
  'stl_' || left(md5('nova_settlements|' || c.slice_no || '|' || c.settle_on), 12) as id,
  -- Position in the company's batch sequence, for "a later batch" picks.
  row_number() over (partition by c.slice_no order by c.settle_on) as seq
from gw_cap2 c
where c.status = 'success' and c.role is distinct from 'a11b' and c.settle_on <= c.as_of
group by c.slice_no, c.settle_on;
-- Event linking looks batches up by (slice, day).
create index on gw_batch (slice_no, sdate);

-- Successful events go into the next batch; the A11(d) reversal (the first
-- dispute won) never reaches one, which is the plant.
update gw_evt e set settle_key = (select min(b.sdate) from gw_batch b where b.slice_no = e.slice_no and b.sdate > e.day)
where e.status = 'success' and not (e.txn_type = 'chargeback_reversal' and e.won_rank = 1);

-- The gateway's reference for any event: one shape for every event type.
create function pg_temp.gw_ref(p_slice int, p_key text) returns text
language sql immutable as $$ select 'GW' || upper(left(md5('gref|' || p_slice || '|' || p_key), 14)) $$;

-- Batch adjustments: the won-back chargeback credit, and the A11(c) plant
-- and decoy. At most one per batch, so each batch carries one reason.
create temp table gw_adj (slice_no int, sdate date, amount numeric(14,2), reason text, ref text, role text, refund_key text) on commit drop;

-- The second dispute won is credited back in its batch.
insert into gw_adj
select e.slice_no, e.settle_key, e.amount, 'chargeback reversal', pg_temp.gw_ref(e.slice_no, e.key), 'reversal', null
from gw_evt e where e.txn_type = 'chargeback_reversal' and e.won_rank = 2 and e.settle_key is not null;

-- A11(c) plant: a refund already taken in its own batch is recovered AGAIN
-- 1–3 batches later as a "refund recovery", so the batch is short by it.
insert into gw_adj
select distinct on (x.slice_no) x.slice_no, t.sdate, -x.amount, 'refund recovery', pg_temp.gw_ref(x.slice_no, x.key), 'a11c', x.key
from (
  select e.*, b.seq from gw_evt e join gw_batch b on b.slice_no = e.slice_no and b.sdate = e.settle_key
  where e.txn_type = 'refund'
) x
join gw_batch t on t.slice_no = x.slice_no and t.seq = x.seq + 1 + floor(pg_temp.gw_h('a11cseq|' || x.slice_no || x.key) * 3)::int
where not exists (select 1 from gw_adj a where a.slice_no = x.slice_no and a.sdate = t.sdate)
order by x.slice_no, md5('a11c|' || x.slice_no || x.key);

-- A11(c) decoy: a refund the gateway did NOT net in a batch is instead
-- recovered by adjustment in that batch: deducted exactly once, legitimately.
insert into gw_adj
select distinct on (e.slice_no) e.slice_no, e.settle_key, -e.amount, 'refund recovery', pg_temp.gw_ref(e.slice_no, e.key), 'a11c_decoy', e.key
from gw_evt e
where e.txn_type = 'refund' and e.settle_key is not null
  and not exists (select 1 from gw_adj a where a.slice_no = e.slice_no and (a.sdate = e.settle_key or a.refund_key = e.key))
order by e.slice_no, md5('a11cd|' || e.slice_no || e.key);
-- That refund therefore belongs to no batch of its own.
update gw_evt e set settle_key = null
from gw_adj a where a.role = 'a11c_decoy' and a.slice_no = e.slice_no and a.refund_key = e.key;

-- Captures in final shape: ids, references and fees. A11(a) plants are
-- charged 0.30–0.60 points above the contracted domestic card rate.
create temp table gw_capx on commit drop as
select c.*,
  -- Contract §2.1 id shape.
  'gtx_' || left(md5('nova_gateway_transactions|' || c.slice_no || '|' || c.key), 12) as id,
  pg_temp.gw_ref(c.slice_no, c.key) as gateway_ref,
  -- The shop's order number, in the format of that company's platform.
  case s.order_fmt
    when 0 then 'ORD-' || to_char(c.day, 'YYMM') || '-' || lpad(c.k::text, 5, '0')
    when 1 then 'WEB' || (104000 + 3 * c.k + floor(pg_temp.gw_h('on|' || c.slice_no || c.k) * 3)::int)
    when 2 then 'SO/' || to_char(c.day, 'YYYY') || '/' || lpad(c.k::text, 6, '0')
    else 'OD' || lpad((7 * c.k + c.slice_no)::text, 9, '0') end as order_ref,
  -- Repeat buyers: a skewed draw from the company's shopper base.
  'cus_' || left(md5('cust|' || c.slice_no || '|' || (1 + floor(power(pg_temp.gw_h('cu|' || c.slice_no || c.k), 1.7) * s.cust_pool))::int), 10) as customer_ref,
  -- Only successful captures are charged.
  case when c.status = 'success' then round(c.amount * (case when c.card_scope = 'international' then ch.fee_pct_international else ch.fee_pct end
    + case when c.role = 'a11a' then 0.0030 + 0.0030 * pg_temp.gw_h('a11a|' || c.slice_no || c.k)::numeric else 0 end) + ch.fee_flat, 2) else 0 end as fee,
  -- The batch it went out in, if any.
  b.id as settlement_id,
  case when c.status = 'success' then pg_temp.gw_dg('rrn|' || c.slice_no || c.key, 12) end as rrn
from gw_cap2 c
join gw_slice s on s.slice_no = c.slice_no
join gw_ch ch on ch.id = c.channel_id
left join gw_batch b on b.slice_no = c.slice_no and b.sdate = c.settle_on and c.status = 'success' and c.role is distinct from 'a11b';
-- Events look their capture up by key.
create index on gw_capx (slice_no, key);
-- Section 13 sums each batch's captures by batch id.
create index on gw_capx (settlement_id);
-- ...and each batch's events by (slice, payout day).
create index on gw_evt (slice_no, settle_key);
-- Temp tables get no autovacuum statistics; without these the planner guesses row counts badly.
analyze gw_capx;
analyze gw_evt;
analyze gw_batch;

-- -----------------------------------------------------------------------------
-- 13. Write settlements, then gateway transactions (they reference batches).
-- Components are the sums of each batch's linked rows (§4.2), so they add up
-- by construction; only A11 breaks the story, and only on recompute.
-- -----------------------------------------------------------------------------
insert into public.nova_settlements (id, slice_no, settlement_ref, settlement_date, period_start, period_end, txn_count, gross_amount,
  refunds, chargebacks, fees, gst_on_fees, adjustments, adjustment_reason, adjustment_ref, net_amount, payout_account_id, status)
select b.id, b.slice_no,
  -- The payout UTR: the collections bank's code, the day, 8 stable digits (008's NEFT shape).
  left(s.coll_ifsc, 4) || 'N' || to_char(b.sdate, 'YYMMDD') || pg_temp.gw_dg('stl|' || b.slice_no || '|' || b.sdate, 8),
  b.sdate, cap.p_start, cap.p_end, cap.n + ev.n, cap.gross, ev.refunds, ev.chargebacks, cap.fees, cap.gst,
  coalesce(a.amount, 0), a.reason, a.ref,
  cap.gross - ev.refunds - ev.chargebacks - cap.fees - cap.gst + coalesce(a.amount, 0),
  s.coll_id,
  -- About 2% of payouts are held back for a risk review.
  case when pg_temp.gw_h('hold|' || b.id) < 0.02 then 'on_hold' else 'settled' end
from gw_batch b
join gw_slice s on s.slice_no = b.slice_no
-- Captures in the batch: gross, fees, GST and the capture dates covered.
cross join lateral (select count(*) as n, sum(c.amount) as gross, sum(c.fee) as fees, sum(round(c.fee * 0.18, 2)) as gst,
  min(c.day) as p_start, max(c.day) as p_end
  from gw_capx c where c.settlement_id = b.id) cap
-- Refunds, chargebacks and credited reversals taken in the batch.
cross join lateral (select count(*) as n,
  coalesce(sum(e.amount) filter (where e.txn_type = 'refund'), 0) as refunds,
  coalesce(sum(e.amount) filter (where e.txn_type = 'chargeback'), 0) as chargebacks
  from gw_evt e where e.slice_no = b.slice_no and e.settle_key = b.sdate) ev
left join gw_adj a on a.slice_no = b.slice_no and a.sdate = b.sdate;

-- Every capture and every event, one insert (self-FKs are checked at statement end).
insert into public.nova_gateway_transactions (id, slice_no, gateway_ref, order_ref, customer_ref, channel_id, card_scope, txn_type,
  parent_txn_id, txn_at, amount, fee, gst_on_fee, net_amount, status, failure_code, settlement_id, bank_rrn)
select c.id, c.slice_no, c.gateway_ref, c.order_ref, c.customer_ref, c.channel_id, c.card_scope, 'capture', null,
  -- IST wall-clock time stored as timestamptz.
  (c.day + make_interval(mins => c.minute, secs => c.sec)) at time zone 'Asia/Kolkata',
  c.amount, c.fee, round(c.fee * 0.18, 2), c.amount - c.fee - round(c.fee * 0.18, 2), c.status, c.failure_code, c.settlement_id, c.rrn
from gw_capx c
union all
select 'gtx_' || left(md5('nova_gateway_transactions|' || e.slice_no || '|' || e.key), 12), e.slice_no, pg_temp.gw_ref(e.slice_no, e.key),
  -- A refund or dispute carries the original order, shopper, method and card scope.
  o.order_ref, o.customer_ref, o.channel_id, o.card_scope, e.txn_type,
  'gtx_' || left(md5('nova_gateway_transactions|' || e.slice_no || '|' || e.parent_key), 12),
  (e.day + make_interval(mins => e.minute)) at time zone 'Asia/Kolkata',
  -- Refunds and disputes carry no new fee (§4.2).
  e.amount, 0, 0, e.amount, e.status, null,
  (select b.id from gw_batch b where b.slice_no = e.slice_no and b.sdate = e.settle_key),
  case when e.status = 'success' then e.rrn end
from gw_evt e
-- The original capture: the event's parent, or for a reversal its chargeback's parent.
join gw_capx o on o.slice_no = e.slice_no and o.key = 'c' || substr(e.key, 2);

-- -----------------------------------------------------------------------------
-- 14. success_rate from this file's own rows: 1 − (technical failures ÷
-- tries) per rail per company, held in the 0.95–0.995 band (§4.2). Payout
-- timeouts are capped at 4% (section 8), so the band never moves it far.
-- -----------------------------------------------------------------------------
update public.nova_payment_channels c set success_rate = greatest(0.95, least(0.995, round(r.rate, 4)))
from (
  select a.channel_id, 1 - avg((a.outcome = 'timeout')::int) as rate from public.nova_payment_attempts a group by a.channel_id
  union all
  select g.channel_id, 1 - avg(coalesce(g.failure_code in ('gateway_timeout', 'bank_unavailable'), false)::int) as rate
  from public.nova_gateway_transactions g where g.txn_type = 'capture' group by g.channel_id
) r
where r.channel_id = c.id;

-- -----------------------------------------------------------------------------
-- 15. Answer key (§6). Per company: 7 plants (a ×3, b ×2, c ×1, d ×1) and
-- 5 decoys (a ×2, b ×2, c ×1). resource = registry key of the first id.
-- -----------------------------------------------------------------------------
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select g.slice_no, 'A11', g.resource, g.ids, 'A11-' || g.pat || '-' || g.ids[1], g.difficulty, g.is_decoy, g.note
from (
  -- (a) and (b): single capture rows, by role.
  select c.slice_no, 'gateway-transactions' as resource, array[c.id] as ids,
    case when c.role like 'a11a%' then 'a' else 'b' end as pat, 'medium' as difficulty, c.role like '%decoy' as is_decoy,
    case c.role
      when 'a11a' then 'Domestic card capture charged a fee above the channel''s contracted fee_pct; the excess sits inside a settled batch''s fees.'
      when 'a11a_decoy' then 'Fee looks high, but the card is international and the fee equals the contracted fee_pct_international.'
      when 'a11b' then 'Successful capture well past its T+n settlement day that is in no settlement batch: the money never reached the bank.'
      else 'Successful capture in no batch yet, but it was taken on the as-of date, before its T+n settlement day.' end as note
  from gw_capx c where c.role is not null
  union all
  -- (c): the batch and the refund it recovers.
  select a.slice_no, 'settlements', array[b.id, 'gtx_' || left(md5('nova_gateway_transactions|' || a.slice_no || '|' || a.refund_key), 12)],
    'c', 'hard', a.role = 'a11c_decoy',
    case a.role
      when 'a11c' then 'Batch deducts, as a refund recovery, a refund that an earlier batch already netted: the refund is taken twice.'
      else 'Negative refund-recovery adjustment, but that refund was netted in no batch of its own: it is deducted exactly once.' end
  from gw_adj a join gw_batch b on b.slice_no = a.slice_no and b.sdate = a.sdate
  where a.role in ('a11c', 'a11c_decoy')
  union all
  -- (d): the reversal and the chargeback it reverses.
  select e.slice_no, 'gateway-transactions',
    array['gtx_' || left(md5('nova_gateway_transactions|' || e.slice_no || '|' || e.key), 12),
          'gtx_' || left(md5('nova_gateway_transactions|' || e.slice_no || '|' || e.parent_key), 12)],
    'd', 'hard', false,
    'Chargeback won back more than 10 days ago (successful reversal), but the reversal was never credited in any settlement batch.'
  from gw_evt e where e.txn_type = 'chargeback_reversal' and e.won_rank = 1
) g
-- Written in (slice, group) order so the key reads naturally.
order by g.slice_no, g.pat, g.is_decoy, g.ids[1];

-- -----------------------------------------------------------------------------
-- 16. Self-check (§2.2.2). Every soft reference must resolve to a row in the
-- same slice, and every electronic vendor payment must have its final try.
-- Any failure raises, which rolls the whole file back.
-- -----------------------------------------------------------------------------
do $$
declare
  -- Attempts whose vendor payment is missing or in another slice.
  n_att bigint;
  -- Batches not paid into their own company's collections account.
  n_stl bigint;
  -- Electronic payments without exactly one final try that matches them.
  n_cov bigint;
begin
  -- Soft reference 1: nova_payment_attempts.vendor_payment_id → 007.
  select count(*) into n_att from public.nova_payment_attempts a
  where not exists (select 1 from public.nova_vendor_payments v where v.id = a.vendor_payment_id and v.slice_no = a.slice_no);
  -- Soft reference 2: nova_settlements.payout_account_id → 005 (collections only).
  select count(*) into n_stl from public.nova_settlements s
  where not exists (select 1 from public.nova_bank_accounts b where b.id = s.payout_account_id and b.slice_no = s.slice_no and b.purpose = 'collections');
  -- Coverage: the last try of each electronic payment equals it (status and IST day).
  select count(*) into n_cov from public.nova_vendor_payments v
  where v.channel <> 'cheque' and not exists (
    select 1 from public.nova_payment_attempts a
    where a.vendor_payment_id = v.id and a.outcome = v.status and a.next_action in ('none', 'manual_review')
      and (a.attempted_at at time zone 'Asia/Kolkata')::date = (v.initiated_at at time zone 'Asia/Kolkata')::date);
  -- Fail loudly: an upstream rerun that changed ids must not leave dangling references.
  if n_att + n_stl + n_cov > 0 then
    raise exception '010 self-check failed: % attempts, % settlements dangling; % payments without a matching final try', n_att, n_stl, n_cov;
  end if;
end;
$$;

-- Temp tables and pg_temp functions go with the session; data lands here.
commit;
