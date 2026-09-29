-- =============================================================================
-- Nova API — deterministic dummy dataset, cut into 80 per-team slices.
-- Run AFTER 001_schema.sql, 003 and 004_team_slices.sql (this file writes the
-- slice_no columns and nova_dataset_meta that 004 adds).
-- Design: docs/nova-api-architecture.md §4.3; slicing rule: 004 header.
--
-- Slices are coherent books: slice s owns 4 clients, 2 vendors and 5 stock
-- items, and every invoice / quotation / payment / bill / movement inherits
-- its slice from the client / vendor / item it belongs to. A team therefore
-- sees a small but complete set of books whose payments reconcile against its
-- own invoices. Per slice: 30 invoices, 8 quotations, ~22 payments, 15 bills,
-- 20 expenses, 40 stock movements.
--
-- Deterministic: setseed() pins the random() stream, and random() is only
-- called in statements that scan generate_series or a temp table with no join
-- (the "draw, then derive" pattern: *_draw tables hold raw rolls, later
-- statements join and compute from them without drawing again). Joins can be
-- planned in either order, so keeping random() out of them is what makes a
-- rerun byte-identical. Dates are offsets from current_date so the data keeps
-- its "last 12 months" shape whenever it is loaded.
--
-- Statuses are assigned by a row's POSITION inside its slice, not by a random
-- roll: with only 30 invoices a slice, random statuses leave ~1 slice in 10
-- with no overdue invoice at all. A fixed pattern guarantees every team gets
-- paid, partial, pending and overdue invoices and all six quote statuses.
--
-- GST slabs: only 0 / 5 / 18 are used. 12% and 28% were folded into 5% and
-- 18% by the rate rationalisation effective 22 Sep 2025; every date here is
-- later, so a 12% line would be an anachronism.
--
-- Re-runnable: the nine business tables are truncated first; nova_dataset_meta
-- is upserted last, never truncated (the auth function reads it on every call).
-- =============================================================================

-- One transaction: a failure halfway rolls back the truncate too, so teams
-- never see an empty or half-seeded dataset.
begin;

-- Pins random() so every rerun draws the identical sequence.
select setseed(0.42);

-- Parallel workers consume random() in timing-dependent order; local = the
-- setting reverts at commit and touches nothing else in the session.
set local max_parallel_workers_per_gather = 0;

-- Wipe only the business tables; cascade covers the FKs among the nine.
-- Platform tables are deliberately absent: reseeding must never sign a team
-- out, revoke a key, or reshuffle team slots.
truncate table
  public.nova_stock_movements,
  public.nova_inventory,
  public.nova_expenses,
  public.nova_payments,
  public.nova_quotations,
  public.nova_purchase_bills,
  public.nova_invoices,
  public.nova_vendors,
  public.nova_clients
restart identity cascade;

-- -----------------------------------------------------------------------------
-- Name and place vocabularies. 320 clients + 160 vendors are too many to
-- hand-write, so names are composed as "<prefix> <industry> <suffix>". Each
-- (prefix, industry) pair is used once, and client and vendor industry lists
-- are disjoint, so no two businesses anywhere share a name.
-- -----------------------------------------------------------------------------

-- 40 business-name prefixes: family names, deities and trade words that real
-- Indian firm names are built from.
create temp table seed_prefix on commit drop as
select (ord - 1)::int as p, word
from unnest(array[
  'Sharma', 'Reddy', 'Sri Balaji', 'Lakshmi', 'Shree Ganesh', 'Om Sai', 'Patel', 'Gupta',
  'Agarwal', 'Mehta', 'Iyer', 'Nair', 'Deccan', 'Sunrise', 'Evergreen', 'Pioneer',
  'Trident', 'Apex', 'Galaxy', 'Royal', 'National', 'Supreme', 'Bharat', 'Hindustan',
  'Vishnu', 'Krishna', 'Ganga', 'Kaveri', 'Narmada', 'Himalaya', 'Everest', 'Srinivasa',
  'Venkatesh', 'Jain', 'Kapoor', 'Banerjee', 'Desai', 'Kulkarni', 'Chettiar', 'Malhotra'
]) with ordinality as t(word, ord);

-- 20 customer industries: the kinds of buyers a B2B seller invoices.
create temp table seed_client_industry on commit drop as
select (ord - 1)::int as i, word
from unnest(array[
  'Textiles', 'Agro Foods', 'Steel Traders', 'Pharma Distributors', 'Electricals',
  'Hospitality Services', 'Granite Exports', 'Infosolutions', 'Packaging', 'Auto Parts',
  'Hardware Mart', 'Printers', 'Poultry Feeds', 'Chemicals', 'Logistics',
  'Constructions', 'Plastics', 'Spice Traders', 'Engineering Works', 'Furnishings'
]) with ordinality as t(word, ord);

-- 12 supplier industries. 'Transport Services' and 'Caterers' are there on
-- purpose: they drive the reverse-charge and blocked-ITC cases on bills.
create temp table seed_vendor_industry on commit drop as
select (ord - 1)::int as i, word
from unnest(array[
  'Paper Mills', 'Stationery Suppliers', 'Transport Services', 'Power Solutions',
  'Caterers', 'Steel Suppliers', 'Cement Traders', 'Electronics Components',
  'Tools Corporation', 'Machinery', 'Warehousing', 'Polymers'
]) with ordinality as t(word, ord);

-- States with their GST state codes and a few real cities. i = 0 is the
-- seller's own state (Telangana, 36), which is what makes a sale intra-state.
create temp table seed_state on commit drop as
select * from (values
  (0,  'Telangana',      '36', array['Hyderabad', 'Secunderabad', 'Warangal', 'Karimnagar']),
  (1,  'Andhra Pradesh', '37', array['Visakhapatnam', 'Vijayawada', 'Guntur']),
  (2,  'Karnataka',      '29', array['Bengaluru', 'Mysuru', 'Hubballi']),
  (3,  'Maharashtra',    '27', array['Mumbai', 'Pune', 'Nagpur']),
  (4,  'Tamil Nadu',     '33', array['Chennai', 'Coimbatore', 'Madurai']),
  (5,  'Delhi',          '07', array['New Delhi']),
  (6,  'Gujarat',        '24', array['Ahmedabad', 'Surat', 'Rajkot']),
  (7,  'West Bengal',    '19', array['Kolkata', 'Howrah']),
  (8,  'Uttar Pradesh',  '09', array['Lucknow', 'Kanpur', 'Noida']),
  (9,  'Kerala',         '32', array['Kochi', 'Thiruvananthapuram']),
  (10, 'Rajasthan',      '08', array['Jaipur', 'Udaipur']),
  (11, 'Haryana',        '06', array['Gurugram', 'Faridabad']),
  (12, 'Punjab',         '03', array['Ludhiana', 'Amritsar']),
  (13, 'Odisha',         '21', array['Bhubaneswar', 'Cuttack']),
  (14, 'Madhya Pradesh', '23', array['Indore', 'Bhopal'])
) as s(i, state, state_code, cities);

-- -----------------------------------------------------------------------------
-- Clients (4 per slice) and vendors (2 per slice).
-- -----------------------------------------------------------------------------

-- Client roster. j = n - 1 walks prefixes fastest; for a fixed prefix the
-- industry is (j/40 + p) % 20 with j/40 in 0..7, so the pair never repeats.
-- Client k = 1 of every slice is in Telangana and k = 3/4 are out of state,
-- so every team has both CGST+SGST and IGST invoices.
create temp table seed_client on commit drop as
select
  x.n, x.slice_no,
  -- md5 of a salted ordinal: a stable id that survives reruns.
  'cli_' || substr(md5('cli' || x.n), 1, 8) as id,
  -- trim() absorbs the empty suffix of a sole proprietorship.
  trim(p.word || ' ' || ind.word || ' ' || x.suffix) as name,
  st.state, st.state_code,
  -- Rotate cities by slice so same-state clients are not all in one town.
  st.cities[1 + x.slice_no % array_length(st.cities, 1)] as city,
  -- About 1 in 13 is unregistered (B2C-like), exercising a null GSTIN.
  x.n % 13 <> 0 as registered
from (
  select
    n, (n - 1) / 4 as slice_no, (n - 1) % 4 + 1 as k, n - 1 as j,
    -- Legal-form suffix; '' = proprietorship.
    (array['Pvt Ltd', 'Pvt Ltd', 'LLP', '& Co', '', 'Ltd'])[1 + ((n - 1) * 7 + (n - 1) % 40) % 6] as suffix
  from generate_series(1, 320) as n
) x
join seed_prefix p on p.p = x.j % 40
join seed_client_industry ind on ind.i = (x.j / 40 + x.j % 40) % 20
-- k = 1 home state; k = 2 home state every third slice; k = 3/4 elsewhere.
join seed_state st on st.i = case
  when x.k = 1 then 0
  when x.k = 2 and x.slice_no % 3 = 0 then 0
  else 1 + (x.slice_no * 2 + x.k) % 14
end;

-- Vendor roster, same construction. Industry (q*3 + p) % 12 with q = j/40 in
-- 0..3 keeps each (prefix, industry) pair unique. Vendor k = 1 is local,
-- k = 2 out of state, so every team has intra- and inter-state bills.
create temp table seed_vendor on commit drop as
select
  x.n, x.slice_no,
  'ven_' || substr(md5('ven' || x.n), 1, 8) as id,
  trim(p.word || ' ' || ind.word || ' ' || x.suffix) as name,
  -- Kept for bill rules below (reverse charge, blocked ITC).
  ind.word as industry,
  st.state, st.state_code,
  st.cities[1 + x.slice_no % array_length(st.cities, 1)] as city,
  -- Transporters and caterers are often unregistered small operators; half of
  -- them are here, plus 1 in 17 of everyone else.
  not ((ind.word in ('Transport Services', 'Caterers') and x.n % 2 = 0) or x.n % 17 = 0) as registered
from (
  select
    n, (n - 1) / 2 as slice_no, (n - 1) % 2 + 1 as k, n - 1 as j,
    (array['Pvt Ltd', 'Ltd', 'LLP', '& Co', '', 'Pvt Ltd'])[1 + ((n - 1) * 5 + (n - 1) % 40) % 6] as suffix
  from generate_series(1, 160) as n
) x
join seed_prefix p on p.p = x.j % 40
join seed_vendor_industry ind on ind.i = ((x.j / 40) * 3 + x.j % 40) % 12
join seed_state st on st.i = case when x.k = 1 then 0 else 1 + (x.slice_no * 5) % 14 end;

-- GSTIN = state code + PAN (3 letters, holder-type letter, name initial,
-- 4 digits, letter) + entity digit + 'Z' + check character. Format-valid only:
-- the real mod-36 checksum is not computed, which also guarantees no seeded
-- GSTIN is a real taxpayer's. translate() maps md5 hex onto letters/digits,
-- giving stable pseudo-random characters without touching random().
insert into public.nova_clients (id, name, gst_number, email, phone, billing_address, state, state_code, created_at, slice_no)
select
  c.id,
  c.name,
  -- Unregistered customers have no GSTIN; the API must return null for them.
  case when c.registered then
    c.state_code
    || translate(substr(md5('pan' || c.id), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    -- PAN 4th letter = holder type: C company, F firm/LLP, P proprietor.
    || case when c.name ~ 'Ltd$' then 'C' when c.name ~ '(LLP|& Co)$' then 'F' else 'P' end
    || upper(left(c.name, 1))
    || substr(translate(md5('pan' || c.id), 'abcdef', '012345'), 4, 4)
    || translate(substr(md5('pan' || c.id), 8, 1), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || '1Z'
    || upper(substr(md5('gstchk' || c.id), 1, 1))
  end,
  -- .example is an IANA-reserved TLD: no seeded address can reach a real inbox.
  'accounts@' || lower(regexp_replace(split_part(c.name, ' ', 1) || split_part(c.name, ' ', 2) || split_part(c.name, ' ', 3), '[^A-Za-z]', '', 'g')) || '.example',
  -- Indian mobile shape (+91, 10 digits starting 9); digits come from md5.
  '+91 9' || substr(translate(md5('ph' || c.id), 'abcdef', '012345'), 1, 9),
  -- Plausible street address; cycling street names avoids a long literal.
  (12 + c.n * 7 % 480) || '-' || (1 + c.n % 9) || ', '
    || (array['Industrial Area', 'Main Road', 'MG Road', 'Station Road', 'Market Street', 'Ring Road'])[1 + c.n % 6]
    || ', ' || c.city || ', ' || c.state,
  c.state,
  c.state_code,
  -- Clients predate their first invoice (which is at most 365 days back).
  (current_date - 400 - c.n % 30)::timestamptz,
  c.slice_no
from seed_client c
order by c.n;

-- Vendors mirror clients, plus the masked bank details AP integrations need.
insert into public.nova_vendors (id, name, gst_number, email, phone, address, state, bank_ifsc, bank_account_last4, created_at, slice_no)
select
  v.id,
  v.name,
  -- Same GSTIN construction; unregistered vendors stay null.
  case when v.registered then
    v.state_code
    || translate(substr(md5('pan' || v.id), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || case when v.name ~ 'Ltd$' then 'C' when v.name ~ '(LLP|& Co)$' then 'F' else 'P' end
    || upper(left(v.name, 1))
    || substr(translate(md5('pan' || v.id), 'abcdef', '012345'), 4, 4)
    || translate(substr(md5('pan' || v.id), 8, 1), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || '1Z'
    || upper(substr(md5('gstchk' || v.id), 1, 1))
  end,
  -- Reserved TLD, same can-never-deliver reason.
  'billing@' || lower(regexp_replace(split_part(v.name, ' ', 1) || split_part(v.name, ' ', 2) || split_part(v.name, ' ', 3), '[^A-Za-z]', '', 'g')) || '.example',
  '+91 9' || substr(translate(md5('ph' || v.id), 'abcdef', '012345'), 1, 9),
  (20 + v.n * 11 % 480) || ', '
    || (array['Industrial Estate', 'Trade Centre', 'Warehouse Road', 'Auto Nagar'])[1 + v.n % 4]
    || ', ' || v.city || ', ' || v.state,
  v.state,
  -- IFSC shape: 4-letter bank code, a literal 0, 6-character branch code.
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])[1 + v.n % 5] || '0' || substr(translate(md5('ifsc' || v.id), 'abcdef', '012345'), 1, 6),
  -- Four digits only, satisfying the masking CHECK.
  substr(translate(md5('acct' || v.id), 'abcdef', '012345'), 1, 4),
  (current_date - 400 - v.n % 30)::timestamptz,
  v.slice_no
from seed_vendor v
order by v.n;

-- -----------------------------------------------------------------------------
-- Stock items (5 per slice), picked from a 50-product catalogue.
-- -----------------------------------------------------------------------------

-- The base catalogue: realistic goods with correct HSN codes and post-2025
-- GST slabs. Bands of 10 (b = 1..10, 11..20, ...) group similar goods.
create temp table seed_product on commit drop as
select * from (values
  (1,  'A4 Copier Paper 75 GSM (5 reams)',   '4802', 'box',   1150.00, 18),
  (2,  'Corrugated Shipping Carton 18x12x12', '4819', 'pcs',    32.00, 18),
  (3,  'Cotton Shirting Fabric',             '5208', 'metre',  145.00,  5),
  (4,  'Polyester Blend Suiting Fabric',     '5515', 'metre',  210.00,  5),
  (5,  'Basmati Rice (Branded, Packed)',     '1006', 'kg',      88.00,  5),
  (6,  'Refined Sunflower Oil',              '1512', 'litre',  135.00,  5),
  (7,  'Toor Dal (Loose)',                   '0713', 'kg',     118.00,  0),
  (8,  'Turmeric Powder',                    '0910', 'kg',     165.00,  5),
  (9,  'Red Chilli Powder',                  '0904', 'kg',     210.00,  5),
  (10, 'Mild Steel TMT Bar 12mm',            '7214', 'kg',      58.00, 18),
  (11, 'GI Pipe 1 inch',                     '7306', 'metre',  210.00, 18),
  (12, 'PVC Conduit Pipe 25mm',              '3917', 'metre',   34.00, 18),
  (13, 'Copper Wire 2.5 sq mm (90 m coil)',  '8544', 'pcs',   2150.00, 18),
  (14, 'LED Panel Light 18W',                '9405', 'pcs',    420.00, 18),
  (15, 'MCB 32A Double Pole',                '8536', 'pcs',    385.00, 18),
  (16, 'Ceiling Fan 1200mm',                 '8414', 'pcs',   1650.00, 18),
  (17, 'Laptop 14 inch Core i5',             '8471', 'pcs',  48500.00, 18),
  (18, 'Wireless Keyboard and Mouse Combo',  '8471', 'set',    890.00, 18),
  (19, '27 inch LED Monitor',                '8528', 'pcs',  11800.00, 18),
  (20, 'Network Switch 24 Port',             '8517', 'pcs',   9200.00, 18),
  (21, 'CAT6 LAN Cable (305 m box)',         '8544', 'box',   5400.00, 18),
  (22, 'Ergonomic Office Chair',             '9401', 'pcs',   5600.00, 18),
  (23, 'Steel Filing Cabinet 4 Drawer',      '9403', 'pcs',   9800.00, 18),
  (24, 'Whiteboard 4x3 ft',                  '9610', 'pcs',   1350.00, 18),
  (25, 'Ballpoint Pens (Box of 50)',         '9608', 'box',    210.00, 18),
  (26, 'Printer Toner Cartridge',            '8443', 'pcs',   2900.00, 18),
  (27, 'Hand Sanitiser',                     '3808', 'litre',   95.00, 18),
  (28, 'Floor Cleaner Concentrate',          '3402', 'litre',   72.00, 18),
  (29, 'Paracetamol 500mg (Box of 10 strips)', '3004', 'box',  180.00,  5),
  (30, 'Nitrile Gloves (Box of 100)',        '4015', 'box',    340.00,  5),
  (31, 'N95 Respirator Mask',                '6307', 'pcs',     38.00,  5),
  (32, 'Portland Cement 50kg Bag',           '2523', 'pcs',    330.00, 18),
  (33, 'Vitrified Floor Tile 600x600',       '6907', 'box',    780.00, 18),
  (34, 'Polished Granite Slab',              '6802', 'pcs',   2400.00, 18),
  (35, 'Teak Wood Plank',                    '4407', 'metre', 1250.00, 18),
  (36, 'Emulsion Paint 20L',                 '3209', 'pcs',   3900.00, 18),
  (37, 'Ball Bearing 6205',                  '8482', 'pcs',    145.00, 18),
  (38, 'V-Belt B-52',                        '4010', 'pcs',    260.00, 18),
  (39, 'Hydraulic Oil ISO 68',               '2710', 'litre',  165.00, 18),
  (40, 'Welding Electrode 3.15mm (Box)',     '8311', 'box',    820.00, 18),
  (41, 'Safety Helmet',                      '6506', 'pcs',    190.00, 18),
  (42, 'Safety Shoes (Pair)',                '6403', 'set',    980.00,  5),
  (43, 'Cotton T-Shirt',                     '6109', 'pcs',    180.00,  5),
  (44, 'Jute Shopping Bag',                  '6305', 'pcs',     65.00,  5),
  (45, 'Cashew Kernels W320',                '0801', 'kg',     720.00,  5),
  (46, 'Green Tea Leaves',                   '0902', 'kg',     540.00,  5),
  (47, 'Packaged Drinking Water 20L Jar',    '2201', 'pcs',     60.00,  5),
  (48, 'Brass Door Handle Set',              '8302', 'set',    640.00, 18),
  (49, 'Stainless Steel Water Bottle 1L',    '7323', 'pcs',    240.00,  5),
  (50, 'Solar Panel 540W',                   '8541', 'pcs',  13500.00,  5)
) as p(b, name, hsn_code, unit, purchase_price, gst_rate);

-- A slice's 5 items come one from each band of 10, so every team stocks a
-- varied range; the offset inside a band shifts with the slice (and every 10
-- slices by k), so neighbouring teams stock different products. Prices vary
-- ±10% by slice so two teams selling the same product still differ.
create temp table seed_item on commit drop as
select
  x.n, x.slice_no, x.k,
  'itm_' || substr(md5('itm' || x.n), 1, 8) as id,
  p.name, p.hsn_code, p.unit, p.gst_rate,
  f.purchase_price,
  -- Markup 18–34% by item so margins are not suspiciously uniform; whole
  -- rupees, as price lists are written.
  round(f.purchase_price * (1.18 + (x.n % 5) * 0.04), 0) as sale_price
from (
  select n, (n - 1) / 5 as slice_no, (n - 1) % 5 as k from generate_series(1, 400) as n
) x
join seed_product p on p.b = x.k * 10 + ((x.slice_no * 7 + (x.slice_no / 10) * (x.k + 1)) % 10) + 1
-- Whole rupees above ₹100, one decimal below, like a real rate card.
cross join lateral (select round(p.purchase_price * (0.9 + (x.slice_no % 9) * 0.025), case when p.purchase_price >= 100 then 0 else 1 end) as purchase_price) f;

-- -----------------------------------------------------------------------------
-- Random draws, in one fixed order: invoices, invoice lines, quotations,
-- quotation lines, bills, bill lines, expenses, movements.
-- -----------------------------------------------------------------------------

-- Invoice rolls: 30 per slice, slice = (n-1)/30, position pos = (n-1)%30.
create temp table seed_inv_draw on commit drop as
select
  n,
  (n - 1) / 30 as slice_no,
  (n - 1) % 30 as pos,
  -- Which of the slice's 4 clients is billed.
  1 + floor(random() * 4)::int as client_k,
  -- Payment terms; 30 days doubled as the common Indian default.
  (array[15, 30, 30, 45])[1 + floor(random() * 4)::int] as term_days,
  -- 1–4 lines per document.
  1 + floor(random() * 4)::int as line_count,
  -- Positions the invoice date inside its allowed window.
  random() as date_roll,
  -- Whether a paid invoice was settled in two instalments.
  random() as split_roll,
  -- Fraction of the total covered by the first payment.
  random() as frac_roll,
  -- Delay invoice→first payment, first→second.
  random() as lag1_roll,
  random() as lag2_roll,
  -- Payment rails for the up-to-two payments.
  1 + floor(random() * 8)::int as method1_n,
  1 + floor(random() * 8)::int as method2_n
from generate_series(1, 2400) as n;

-- Raw line rolls for every document family, so one pricing step serves all.
create temp table seed_line_draw (
  -- 'inv' | 'quo' | 'bil' — the document family.
  doc text not null,
  -- Document ordinal within its family.
  n int not null,
  -- Line position, preserved into the jsonb array order.
  line_no int not null,
  -- Which of the slice's 5 items the line carries (1..5).
  item_k int not null,
  -- Scales the quantity; interpreted per family in seed_line.
  qty_roll float8 not null
) on commit drop;

-- Invoice lines. lateral generate_series forces a nested loop over a seq scan
-- of seed_inv_draw, so rows (and random() calls) stay in insertion order.
insert into seed_line_draw (doc, n, line_no, item_k, qty_roll)
select 'inv', d.n, l.line_no, 1 + floor(random() * 5)::int, random()
from seed_inv_draw d
cross join lateral generate_series(1, d.line_count) as l(line_no);

-- Quotation rolls: 8 per slice.
create temp table seed_quo_draw on commit drop as
select
  n,
  (n - 1) / 8 as slice_no,
  (n - 1) % 8 as pos,
  -- Client for non-converted quotes (converted ones inherit the invoice's).
  1 + floor(random() * 4)::int as client_k,
  1 + floor(random() * 4)::int as line_count,
  -- Positions the quotation date inside its status's window.
  random() as date_roll
from generate_series(1, 640) as n;

-- Quotation lines, drawn for all quotes even though converted ones copy their
-- invoice's lines, so the stream length never depends on status logic.
insert into seed_line_draw (doc, n, line_no, item_k, qty_roll)
select 'quo', d.n, l.line_no, 1 + floor(random() * 5)::int, random()
from seed_quo_draw d
cross join lateral generate_series(1, d.line_count) as l(line_no);

-- Bill rolls: 15 per slice.
create temp table seed_bil_draw on commit drop as
select
  n,
  (n - 1) / 15 as slice_no,
  (n - 1) % 15 as pos,
  -- Which of the slice's 2 vendors issued it.
  1 + floor(random() * 2)::int as vendor_k,
  (array[15, 30, 30, 45])[1 + floor(random() * 4)::int] as term_days,
  -- Bills run shorter than invoices: 1–3 lines.
  1 + floor(random() * 3)::int as line_count,
  random() as date_roll,
  random() as frac_roll,
  -- Reverse-charge bills beyond the unregistered-transporter rule.
  random() as rcm_roll,
  -- ITC-ineligible bills beyond the caterer rule.
  random() as itc_roll
from generate_series(1, 1200) as n;

-- Bill lines.
insert into seed_line_draw (doc, n, line_no, item_k, qty_roll)
select 'bil', d.n, l.line_no, 1 + floor(random() * 5)::int, random()
from seed_bil_draw d
cross join lateral generate_series(1, d.line_count) as l(line_no);

-- Expense rolls: 20 per slice. Repeated categories weight the mix.
create temp table seed_exp_draw on commit drop as
select
  n,
  (n - 1) / 20 as slice_no,
  (array['rent', 'travel', 'travel', 'software', 'software', 'utilities', 'office_supplies',
         'professional_fees', 'professional_fees', 'marketing', 'meals', 'meals', 'salaries', 'other'])[1 + floor(random() * 14)::int] as category,
  -- Scales the amount around the category's typical size.
  random() as amount_roll,
  -- One of three payees for the category.
  1 + floor(random() * 3)::int as payee_n,
  -- Rail when the category does not force one.
  1 + floor(random() * 7)::int as method_n,
  -- Spreads expenses across the year.
  random() as date_roll
from generate_series(1, 1600) as n;

-- Movement rolls: 8 per item x 400 items. One flat series (item = g/8,
-- k = g%8) rather than a cross join, which could be planned either way round.
create temp table seed_mov_draw on commit drop as
select g, random() as type_roll, random() as qty_roll, random() as sign_roll, random() as day_roll
from generate_series(0, 3199) as g;

-- -----------------------------------------------------------------------------
-- Line pricing, shared by invoices, quotations and bills. GST is computed and
-- rounded PER LINE, then summed: the order a GST invoice is legally drawn up
-- in, and the only order where the header equals its printed lines exactly.
-- -----------------------------------------------------------------------------

-- Each line's slice is its document's slice; it carries that slice's item k.
create temp table seed_line on commit drop as
select
  l.doc, l.n, l.line_no,
  i.name, i.hsn_code, q.qty, p.rate, i.gst_rate,
  -- Integer qty x 2-dp rate: already exact, no rounding needed.
  q.qty * p.rate as amount,
  round(q.qty * p.rate * i.gst_rate / 100, 2) as gst_amount
from seed_line_draw l
-- Slice of the owning document, recovered from its ordinal and slice size.
cross join lateral (select case l.doc when 'inv' then (l.n - 1) / 30 when 'quo' then (l.n - 1) / 8 else (l.n - 1) / 15 end as slice_no) s
join seed_item i on i.slice_no = s.slice_no and i.k = l.item_k - 1
-- Bills buy at cost; invoices and quotes sell at list price.
cross join lateral (select case when l.doc = 'bil' then i.purchase_price else i.sale_price end as rate) p
-- Big-ticket goods move in ones and twos; purchases come in bulk lots.
cross join lateral (select case
  when p.rate > 5000 then 1 + floor(l.qty_roll * 4)::int
  when l.doc = 'bil' then 10 + floor(l.qty_roll * 90)::int
  else 1 + floor(l.qty_roll * 24)::int
end as qty) q;

-- Document totals plus the jsonb items array in the API's line shape.
create temp table seed_doc_total on commit drop as
select
  doc, n,
  -- Ordered by line_no so the array matches the printed document.
  jsonb_agg(jsonb_build_object(
    'description', name, 'hsn_code', hsn_code, 'quantity', qty, 'rate', rate,
    'gst_rate', gst_rate, 'amount', amount, 'gst_amount', gst_amount
  ) order by line_no) as items,
  sum(amount) as amount,
  sum(gst_amount) as gst_amount,
  sum(amount) + sum(gst_amount) as total_amount
from seed_line
group by doc, n;

-- -----------------------------------------------------------------------------
-- Invoices and payments.
-- -----------------------------------------------------------------------------

-- Status by position in the slice: 0–14 paid, 15–19 partial, 20–29 pending;
-- positions 19 and 29 are dated past due, so each team has 2 of 15 unpaid
-- invoices overdue (~13%) and the rest still inside terms. Without the
-- in-terms dating, a year-wide spread would make nearly every unpaid invoice
-- overdue and the view's derivation untestable.
create temp table seed_inv on commit drop as
select
  d.*, s.status, t.total_amount,
  c.id as client_id, c.state_code,
  current_date - case
    -- Paid: 10 to 364 days old.
    when s.status = 'paid' then 10 + floor(d.date_roll * 355)::int
    -- Overdue: older than its terms by 1–300 days.
    when d.pos in (19, 29) then d.term_days + 1 + floor(d.date_roll * 300)::int
    -- In terms: issued within the last term_days, so due_date >= today.
    else floor(d.date_roll * d.term_days)::int
  end as invoice_date
from seed_inv_draw d
join seed_doc_total t on t.doc = 'inv' and t.n = d.n
-- The client comes from the invoice's own slice: this is what keeps a
-- team's books closed.
join seed_client c on c.n = d.slice_no * 4 + d.client_k
cross join lateral (select case
  when d.pos < 15 then 'paid'
  when d.pos < 20 then 'partial'
  else 'pending'
end as status) s;

-- First payment per paid/partial invoice. Money is cast to numeric before
-- rounding: random() is float8, and round(float8, int) does not exist.
create temp table seed_pay on commit drop as
select
  i.n as inv_n,
  i.slice_no,
  1 as seq,
  case
    -- Partial: 20–80% received, strictly between 0 and the total.
    when i.status = 'partial' then round(i.total_amount * (0.2 + 0.6 * i.frac_roll)::numeric, 2)
    -- Paid in two instalments: first covers 30–70%.
    when i.split_roll < 0.15 then round(i.total_amount * (0.3 + 0.4 * i.frac_roll)::numeric, 2)
    -- Paid in one go.
    else i.total_amount
  end as amount,
  -- Between invoice date and the earlier of due date or today: never future.
  i.invoice_date + floor(i.lag1_roll * least(i.term_days, current_date - i.invoice_date))::int as payment_date,
  i.method1_n as method_n
from seed_inv i
where i.status in ('paid', 'partial');

-- Second instalment is exactly the remainder, so a paid invoice's payments sum
-- to its total with no rounding residue.
insert into seed_pay (inv_n, slice_no, seq, amount, payment_date, method_n)
select
  i.n, i.slice_no, 2, i.total_amount - p.amount,
  -- After the first payment, never after today.
  p.payment_date + floor(i.lag2_roll * (current_date - p.payment_date))::int,
  i.method2_n
from seed_inv i
join seed_pay p on p.inv_n = i.n and p.seq = 1
where i.status = 'paid' and i.split_roll < 0.15;

-- Invoices. paid_amount is summed from seed_pay, the very rows inserted into
-- nova_payments below, so the two can never disagree.
insert into public.nova_invoices (
  id, invoice_number, client_id, client_name, client_gst_number, items,
  amount, gst_amount, cgst_amount, sgst_amount, igst_amount, intra_state,
  total_amount, paid_amount, status, invoice_date, due_date, created_at, slice_no
)
select
  'inv_' || substr(md5('inv' || i.n), 1, 8),
  -- A gap-free series per slice (each team is its own seller), in date order
  -- as a GST invoice series must be; the slice infix keeps it globally
  -- unique. Ordering by the date offset keeps numbers stable across days.
  'INV-' || lpad(i.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by i.slice_no order by i.invoice_date, i.n)::text, 4, '0'),
  c.id, c.name, c.gst_number, t.items,
  t.amount, t.gst_amount,
  -- Intra-state (seller in Telangana, 36): half each to CGST and SGST, SGST
  -- taking the odd paisa so the three still sum to gst_amount exactly.
  case when x.intra then round(t.gst_amount / 2, 2) else 0 end,
  case when x.intra then t.gst_amount - round(t.gst_amount / 2, 2) else 0 end,
  -- Inter-state: all IGST.
  case when x.intra then 0 else t.gst_amount end,
  x.intra,
  t.total_amount,
  coalesce(p.paid, 0),
  i.status, i.invoice_date, i.invoice_date + i.term_days,
  -- Recorded mid-morning IST on its invoice date.
  (i.invoice_date + time '11:00') at time zone 'Asia/Kolkata',
  -- Inherited from the client, never computed independently.
  c.slice_no
from seed_inv i
join seed_doc_total t on t.doc = 'inv' and t.n = i.n
join public.nova_clients c on c.id = i.client_id
cross join lateral (select i.state_code = '36' as intra) x
left join (select inv_n, sum(amount) as paid from seed_pay group by inv_n) p on p.inv_n = i.n;

-- Payments copy client and slice from their invoice, so a payment can never
-- name a different customer, or land in a different team, than what it pays.
insert into public.nova_payments (id, payment_number, invoice_id, client_id, client_name, amount, payment_date, method, reference, created_at, slice_no)
select
  x.id,
  -- Receipt numbers follow receipt order within the team's cash book.
  'PAY-' || lpad(inv.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by inv.slice_no order by p.payment_date, p.inv_n, p.seq)::text, 4, '0'),
  inv.id, inv.client_id, inv.client_name,
  p.amount, p.payment_date, m.method,
  -- The identifier reconciliation matches on, shaped per rail; cash has none.
  case m.method
    when 'upi'    then substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 12)
    when 'cheque' then substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 6)
    when 'cash'   then null
    when 'card'   then 'XXXX' || substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 4)
    -- NEFT/RTGS/IMPS: a bank-prefixed UTR.
    else 'HDFC' || upper(left(m.method, 1)) || substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 11)
  end,
  (p.payment_date + time '15:00') at time zone 'Asia/Kolkata',
  inv.slice_no
from seed_pay p
cross join lateral (select 'pay_' || substr(md5('pay' || p.inv_n || '-' || p.seq), 1, 8) as id) x
join public.nova_invoices inv on inv.id = 'inv_' || substr(md5('inv' || p.inv_n), 1, 8)
-- NEFT doubled: it is the dominant B2B rail.
cross join lateral (select (array['upi', 'neft', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card'])[p.method_n] as method) m;

-- -----------------------------------------------------------------------------
-- Quotations: 8 per slice. Positions 0–7 map to draft, sent, accepted,
-- rejected, expired, converted, accepted, converted, so every team sees all
-- six lifecycle states. The two converted quotes point at the slice's
-- invoices at positions 2 (paid) and 16 (partial): distinct invoices, and the
-- quote takes the invoice's client, so it is the same client and slice.
-- -----------------------------------------------------------------------------
create temp table seed_quo on commit drop as
select
  q.n, q.slice_no, s.status,
  case when s.status = 'converted' then inv.client_id else c.id end as client_id,
  case when s.status = 'converted' then inv.client_name else c.name end as client_name,
  -- A converted quote carries the exact lines the invoice was raised from.
  case when s.status = 'converted' then inv.items else t.items end as items,
  case when s.status = 'converted' then inv.amount else t.amount end as amount,
  case when s.status = 'converted' then inv.gst_amount else t.gst_amount end as gst_amount,
  case when s.status = 'converted' then inv.id end as converted_invoice_id,
  case s.status
    -- Converted: quoted 3–12 days before the invoice it became.
    when 'converted' then inv.invoice_date - (3 + floor(q.date_roll * 10)::int)
    -- Draft/sent: recent, still inside their 30-day validity.
    when 'draft' then current_date - floor(q.date_roll * 7)::int
    when 'sent'  then current_date - floor(q.date_roll * 20)::int
    -- Expired: validity lapsed at least two weeks ago.
    when 'expired' then current_date - (45 + floor(q.date_roll * 300)::int)
    -- Accepted/rejected: any time in the year.
    else current_date - floor(q.date_roll * 330)::int
  end as quotation_date
from seed_quo_draw q
cross join lateral (select (array['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'accepted', 'converted'])[q.pos + 1] as status) s
-- Same-slice client for the non-converted case.
join seed_client sc on sc.n = q.slice_no * 4 + q.client_k
join public.nova_clients c on c.id = sc.id
join seed_doc_total t on t.doc = 'quo' and t.n = q.n
-- Same-slice invoice for the converted case (ordinal slice*30 + pos + 1).
left join public.nova_invoices inv on s.status = 'converted'
  and inv.id = 'inv_' || substr(md5('inv' || (q.slice_no * 30 + case when q.pos = 5 then 3 else 17 end)), 1, 8);

-- Quotations, numbered per slice in date order like invoices.
insert into public.nova_quotations (
  id, quotation_number, client_id, client_name, items, amount, gst_amount, total_amount,
  status, quotation_date, valid_until, converted_invoice_id, created_at, slice_no
)
select
  'quo_' || substr(md5('quo' || q.n), 1, 8),
  'QT-' || lpad(q.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by q.slice_no order by q.quotation_date, q.n)::text, 4, '0'),
  q.client_id, q.client_name, q.items, q.amount, q.gst_amount, q.amount + q.gst_amount,
  q.status, q.quotation_date,
  -- 30-day validity, the usual Indian B2B quote term.
  q.quotation_date + 30,
  q.converted_invoice_id,
  (q.quotation_date + time '10:00') at time zone 'Asia/Kolkata',
  -- Inherited from the client row (the quote's slice by construction).
  c.slice_no
from seed_quo q
join public.nova_clients c on c.id = q.client_id;

-- -----------------------------------------------------------------------------
-- Purchase bills: 15 per slice. No AP payments table exists, so paid_amount
-- is derived straight from status. Positions 0–7 paid, 8–9 partial, 10–14
-- pending; 9 and 14 are dated past due so every team has overdue payables.
-- -----------------------------------------------------------------------------
insert into public.nova_purchase_bills (
  id, bill_number, vendor_id, vendor_name, vendor_gst_number, items,
  amount, gst_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount,
  status, bill_date, due_date, reverse_charge, itc_eligible, created_at, slice_no
)
select
  'bil_' || substr(md5('bil' || b.n), 1, 8),
  -- The team's purchase-register number, in bill-date order.
  'BILL-' || lpad(b.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by b.slice_no order by d.bill_date, b.n)::text, 4, '0'),
  v.id, v.name, v.gst_number, t.items,
  t.amount, t.gst_amount,
  -- Same split rule as invoices; place of supply is the vendor's state.
  case when sv.state_code = '36' then round(t.gst_amount / 2, 2) else 0 end,
  case when sv.state_code = '36' then t.gst_amount - round(t.gst_amount / 2, 2) else 0 end,
  case when sv.state_code = '36' then 0 else t.gst_amount end,
  t.total_amount,
  case s.status
    when 'paid' then t.total_amount
    -- Numeric cast for the same round(float8) reason as payments.
    when 'partial' then round(t.total_amount * (0.2 + 0.6 * b.frac_roll)::numeric, 2)
    else 0
  end,
  s.status, d.bill_date, d.bill_date + b.term_days,
  -- Goods transport by an unregistered transporter is the textbook RCM case;
  -- ~10% more are random so the flag is not vendor-only.
  (sv.industry = 'Transport Services' and not sv.registered) or b.rcm_roll < 0.10,
  -- Food and catering credit is blocked under section 17(5); ~12% more are
  -- random so ineligible bills span vendors.
  not (sv.industry = 'Caterers' or b.itc_roll < 0.12),
  (d.bill_date + time '12:00') at time zone 'Asia/Kolkata',
  -- Inherited from the vendor.
  v.slice_no
from seed_bil_draw b
join seed_doc_total t on t.doc = 'bil' and t.n = b.n
-- Vendor from the bill's own slice.
join seed_vendor sv on sv.n = b.slice_no * 2 + b.vendor_k
join public.nova_vendors v on v.id = sv.id
cross join lateral (select case
  when b.pos < 8 then 'paid'
  when b.pos < 10 then 'partial'
  else 'pending'
end as status) s
-- Same in-terms / overdue dating rule as invoices, for the same reason.
cross join lateral (select current_date - case
  when s.status = 'paid' then 10 + floor(b.date_roll * 355)::int
  when b.pos in (9, 14) then b.term_days + 1 + floor(b.date_roll * 300)::int
  else floor(b.date_roll * b.term_days)::int
end as bill_date) d;

-- -----------------------------------------------------------------------------
-- Expenses: 20 per slice. Rates and TDS come from the category, the way a
-- bookkeeper applies them.
-- -----------------------------------------------------------------------------
insert into public.nova_expenses (
  id, expense_number, category, vendor_name, description, amount, gst_amount, total_amount,
  tds_rate, tds_amount, payment_method, expense_date, created_at, slice_no
)
select
  'exp_' || substr(md5('exp' || e.n), 1, 8),
  'EXP-' || lpad(e.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by e.slice_no order by x.expense_date, e.n)::text, 4, '0'),
  e.category,
  -- Invented payee names: realistic, never a real brand.
  (case e.category
    when 'rent'              then array['Banjara Estates LLP', 'Madhapur Properties', 'Jubilee Hills Realty']
    when 'travel'            then array['Skyline Travels', 'Metro Cabs Hyderabad', 'Redline Tours and Travels']
    when 'software'          then array['CloudStack Software Pvt Ltd', 'Zenith SaaS Solutions', 'CodeForge Tools']
    when 'utilities'         then array['City Power Distribution', 'Metro Water Board', 'FiberNet Broadband']
    when 'office_supplies'   then array['Office Mart', 'Supreme Stationers', 'Paper Point']
    when 'professional_fees' then array['Rao and Associates Chartered Accountants', 'Menon Legal LLP', 'Iyer Tax Consultants']
    when 'marketing'         then array['Pixel Bloom Digital', 'Deccan Print Media', 'Brandwave Events']
    when 'meals'             then array['Hyderabad House Caterers', 'Spice Route Kitchen', 'Cafe Nirvana']
    when 'salaries'          then array['Staff payroll', 'Staff payroll', 'Contract staff payroll']
    else                          array['Speedpost Couriers', 'Bank charges', 'Local vendor']
  end)[e.payee_n],
  case e.category
    when 'rent'              then 'Office rent'
    when 'travel'            then 'Client visit travel'
    when 'software'          then 'Monthly software subscription'
    when 'utilities'         then 'Office utilities bill'
    when 'office_supplies'   then 'Office supplies purchase'
    when 'professional_fees' then 'Accounting and legal services'
    when 'marketing'         then 'Marketing campaign'
    when 'meals'             then 'Team and client meals'
    when 'salaries'          then 'Monthly salary disbursement'
    else                          'Miscellaneous expense'
  end,
  a.amount,
  g.gst_amount,
  a.amount + g.gst_amount,
  r.tds_rate,
  -- TDS is on the pre-GST amount, as sections 194I/194J/194C specify.
  round(a.amount * r.tds_rate / 100, 2),
  -- Rent, fees and payroll go by bank transfer; the rest vary.
  case when e.category in ('rent', 'salaries', 'professional_fees') then 'neft'
       else (array['upi', 'upi', 'card', 'card', 'neft', 'cash', 'imps'])[e.method_n] end,
  x.expense_date,
  (x.expense_date + time '16:00') at time zone 'Asia/Kolkata',
  e.slice_no
from seed_exp_draw e
-- Typical size per category, varied 50–150%.
cross join lateral (select round((case e.category
  when 'rent' then 85000 when 'travel' then 6500 when 'software' then 12000
  when 'utilities' then 9000 when 'office_supplies' then 4500 when 'professional_fees' then 40000
  when 'marketing' then 30000 when 'meals' then 3200 when 'salaries' then 350000 else 2500
end) * (0.5 + e.amount_roll)::numeric, 2) as amount) a
-- GST slab per category: power/water and salaries are outside GST, transport
-- and restaurant services sit at 5%, the rest at 18%.
cross join lateral (select case e.category
  when 'utilities' then 0 when 'salaries' then 0 when 'other' then 0
  when 'travel' then 5 when 'meals' then 5 else 18
end as gst_rate) gr
cross join lateral (select round(a.amount * gr.gst_rate / 100, 2) as gst_amount) g
-- 194I rent and 194J fees at 10%, 194C contractors (marketing) at 2%;
-- salaries are slab-based under 192, so no flat rate is modelled.
cross join lateral (select (case e.category
  when 'rent' then 10 when 'professional_fees' then 10 when 'marketing' then 2 else 0
end)::numeric(5,2) as tds_rate) r
cross join lateral (select current_date - floor(e.date_roll * 365)::int as expense_date) x;

-- -----------------------------------------------------------------------------
-- Inventory and stock movements: 8 per item. Movement 1 is always a purchase
-- of q0 units; later outflows are capped at q0/8 (sales) or q0/16
-- (adjustments), so at most 7/8 of opening stock can ever leave and the
-- running balance can never go negative — no procedural loop needed.
-- -----------------------------------------------------------------------------

-- Derived movements, built before inventory so quantity_on_hand can be
-- inserted as their sum rather than patched by an UPDATE afterwards.
create temp table seed_mov on commit drop as
select
  m.g,
  i.id as item_id,
  i.n as item_n,
  i.slice_no,
  k.k,
  t.movement_type,
  -- Fractional units carry 3 dp (the column scale); countable ones are whole.
  case when t.movement_type = 'sale' or (t.movement_type = 'adjustment' and m.sign_roll < 0.6) then -1 else 1 end
    * case when i.unit in ('kg', 'litre', 'metre') then round(mag.v::numeric, 3) else floor(mag.v)::numeric end as quantity,
  -- Points at a document number that exists in the SAME slice (each slice
  -- has invoices 0001–0030 and bills 0001–0015).
  case
    when k.k = 1 then 'Opening stock purchase'
    when t.movement_type = 'purchase' then 'BILL-' || lpad(i.slice_no::text, 2, '0') || '-' || lpad((1 + m.g % 15)::text, 4, '0')
    when t.movement_type = 'sale' then 'INV-' || lpad(i.slice_no::text, 2, '0') || '-' || lpad((1 + m.g % 30)::text, 4, '0')
    when m.sign_roll < 0.6 then 'Damaged stock written off'
    else 'Stock count gain'
  end as reference,
  -- Movement k sits in a 30-day window 45 days after movement k-1's, so dates
  -- strictly increase and the opening purchase is always the oldest.
  current_date - (365 - (k.k - 1) * 45) + floor(m.day_roll * 30)::int as movement_date
from seed_mov_draw m
cross join lateral (select m.g / 8 + 1 as item_n, m.g % 8 + 1 as k) k
join seed_item i on i.n = k.item_n
-- q0: 120–499 units, varied by item without using the random stream.
cross join lateral (select 120 + (i.n * 37) % 380 as q0) q
cross join lateral (select case
  when k.k = 1 then 'purchase'
  when m.type_roll < 0.25 then 'purchase'
  when m.type_roll < 0.85 then 'sale'
  else 'adjustment'
end as movement_type) t
-- Magnitude, always >= 1 so the quantity <> 0 CHECK holds.
cross join lateral (select case
  when k.k = 1 then q.q0 + m.qty_roll * 50
  when t.movement_type = 'purchase' then 20 + m.qty_roll * (q.q0 / 2.0 - 20)
  when t.movement_type = 'sale' then 1 + m.qty_roll * (q.q0 / 8.0 - 1)
  else 1 + m.qty_roll * (q.q0 / 16.0 - 1)
end as v) mag;

-- Inventory, with quantity_on_hand equal to its ledger by construction. Item
-- k = 4 of every slice gets a reorder level above its stock, so each team's
-- below_reorder_level flag has a true row to test against.
insert into public.nova_inventory (id, sku, name, hsn_code, unit, sale_price, purchase_price, gst_rate, quantity_on_hand, reorder_level, created_at, slice_no)
select
  i.id,
  -- SKU embeds the HSN so a human can read the tax class off the code; the
  -- item ordinal keeps it globally unique.
  'ACZ-' || i.hsn_code || '-' || lpad(i.n::text, 4, '0'),
  i.name, i.hsn_code, i.unit, i.sale_price, i.purchase_price, i.gst_rate,
  s.qoh,
  case when i.k = 4 then s.qoh + 25 else round(s.qoh * 0.25, 0) end,
  (current_date - 400)::timestamptz,
  i.slice_no
from seed_item i
join (select item_n, sum(quantity) as qoh from seed_mov group by item_n) s on s.item_n = i.n;

-- The ledger itself; slice copied from the item row it moves.
insert into public.nova_stock_movements (id, item_id, movement_type, quantity, reference, movement_date, created_at, slice_no)
select
  'mov_' || substr(md5('mov' || m.g), 1, 8),
  m.item_id, m.movement_type, m.quantity, m.reference, m.movement_date,
  (m.movement_date + time '09:30') at time zone 'Asia/Kolkata',
  inv.slice_no
from seed_mov m
join public.nova_inventory inv on inv.id = m.item_id
order by m.g;

-- -----------------------------------------------------------------------------
-- Publish the modulus. Upsert, not truncate + insert: the auth function reads
-- this row on every request, and it must never be observed missing. Written
-- in the same transaction as the data, so slice_count and the slices it
-- describes always change together.
-- -----------------------------------------------------------------------------
insert into public.nova_dataset_meta (id, slice_count, seeded_at)
values (true, 80, now())
on conflict (id) do update set slice_count = excluded.slice_count, seeded_at = excluded.seeded_at;

-- Temp tables drop here (on commit drop); none of the scaffolding outlives
-- the transaction.
commit;
