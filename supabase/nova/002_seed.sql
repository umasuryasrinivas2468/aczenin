-- STATUS: VERIFIED 2026-09-29
-- =============================================================================
-- Nova API — Tier 0 dataset: the nine original business tables, 80 slices.
-- Contract: docs/nova-tier1-build-contract.md §4 and §6 (org row).
-- Run order: 001 → 003 → 004 → 005 → 002 (this) → 006 → 007 → 008.
-- 005 must run first: it adds the Tier 0 columns, creates the employees and
-- business units these rows point at, and freezes nova_dataset_meta.as_of_date.
--
-- One slice is one company (seller registered in Telangana, state code 36).
-- Per slice: 30 clients, 20 vendors, 30 stock items, 300 invoices, 75
-- quotations, ~270 receipts, ~200 purchase bills, 300 expenses and ~750 stock
-- movements, all dated in the 12 months before the as-of date.
--
-- Coherence rules this file guarantees (and the verify loop checks):
--   * every child row carries its parent's slice_no;
--   * invoice paid_amount = the sum of receipt allocations to it;
--   * stock movements are generated FROM documents: a sale movement is an
--     invoice line of that item on the invoice date; a purchase movement is a
--     bill line on the bill's received date. Purchase quantities are sized from
--     the sales they must cover, so stock never goes negative;
--   * GST is computed per line and summed, CGST/SGST vs IGST by the
--     counterparty's state (vendors now carry state_code);
--   * GSTINs carry the real mod-36 check character, and PAN = GSTIN chars
--     3–12, except the four A6 rows planted to break exactly that.
--
-- Planted anomalies (contract §6, org row): A1 A5 A6 A14 A24 A28, each with a
-- decoy, all recorded in nova_ground_truth. Plants are chosen by random rank
-- inside each slice, so they sit at different positions in every company, and
-- they are generated in the same statements as normal rows.
--
-- Determinism: setseed() + "draw, then derive" — random() is only called in
-- statements that scan generate_series with no join; everything else is
-- computed from stored rolls or from md5 of stable keys. Two runs give
-- identical ids and amounts. Dates are offsets from the frozen as-of date.
-- =============================================================================

-- One transaction: a failure anywhere rolls back the truncate as well.
begin;

-- Pins the random() stream (a different seed from 005, so the two files'
-- streams are independent).
select setseed(0.42);

-- Parallel workers would draw random() in timing-dependent order.
set local max_parallel_workers_per_gather = 0;

-- Truncate cascade notices would otherwise flood the SQL editor.
set local client_min_messages = warning;

-- The frozen clock, set by 005. Fails loudly (division by zero) if 005 has
-- not run, instead of silently dating everything off a null.
create temp table seed_asof on commit drop as
select as_of_date as d, 1 / (case when as_of_date is null then 0 else 1 end) as guard
from public.nova_dataset_meta where id;

-- Replace this file's data only. Cascade also empties 006–008 tables that
-- reference these rows; they rerun after this file anyway (run order above).
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

-- Only this file's answer-key rows; 006–008 own the other codes. A14 is
-- shared with 008 (which records resource 'bank-transactions'), so only the
-- receipt-side A14 rows are ours to delete.
delete from public.nova_ground_truth
where anomaly_code in ('A1', 'A5', 'A6', 'A24', 'A28') or (anomaly_code = 'A14' and resource = 'payments');

-- GSTIN check character: the published mod-36 algorithm (weights 1,2,1,2...
-- over the first 14 characters, digits of each product summed in base 36).
-- A session-temp function because the expression is needed in four places.
create or replace function pg_temp.gstin_check(g text) returns text
language sql immutable as $$
  select substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    ((36 - (sum(((strpos('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', substr(g, i, 1)) - 1) * (2 - i % 2)) / 36
              + ((strpos('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', substr(g, i, 1)) - 1) * (2 - i % 2)) % 36))::int % 36) % 36) + 1, 1)
  from generate_series(1, 14) as i
$$;

-- -----------------------------------------------------------------------------
-- Per-slice economics. scale uses the same formula as 005's bank balances, so
-- a company's balances and revenue are the same size. Book size therefore
-- spans 0.75–1.35 (1.8x). Seven slices sell at thin markups and lose money;
-- the rest are profitable.
-- -----------------------------------------------------------------------------
create temp table seed_slice on commit drop as
select
  s as slice_no,
  round(0.75 + 0.6 * ((s * 37) % 80) / 79.0, 4) as scale,
  -- Revenue and running-cost scale, 0.90–1.20 (same ordering as scale).
  -- Narrower than scale because payroll (005) is the same size in every
  -- company: a wider spread would push the smallest companies into loss.
  round(0.90 + 0.30 * ((s * 37) % 80) / 79.0, 4) as rev_scale,
  -- Markup on cost: 1.62–1.82 normally (enough to carry the fixed payroll
  -- from 005 even in the smallest company), 1.15 for the loss-makers.
  case when s % 11 = 4 then 1.15 else 1.62 + ((s * 13) % 5) * 0.05 end as markup,
  s % 11 = 4 as loss_maker
from generate_series(0, 79) as s;

-- 100 business-name prefixes. Within a slice, party r uses prefix
-- (7s + 13r) % 100; 13 is coprime with 100, so the 46 parties of one company
-- (18 vendors + 28 clients) never share a prefix and never look related.
create temp table seed_prefix on commit drop as
select (ord - 1)::int as p, word from unnest(array[
  'Sharma', 'Reddy', 'Sri Balaji', 'Lakshmi', 'Shree Ganesh', 'Om Sai', 'Patel', 'Gupta', 'Agarwal', 'Mehta',
  'Iyer', 'Nair', 'Deccan', 'Sunrise', 'Evergreen', 'Pioneer', 'Trident', 'Apex', 'Galaxy', 'Royal',
  'National', 'Supreme', 'Bharat', 'Hindustan', 'Vishnu', 'Krishna', 'Ganga', 'Kaveri', 'Narmada', 'Himalaya',
  'Everest', 'Srinivasa', 'Venkatesh', 'Jain', 'Kapoor', 'Banerjee', 'Desai', 'Kulkarni', 'Chettiar', 'Malhotra',
  'Adarsh', 'Ajanta', 'Amrit', 'Anand', 'Annapurna', 'Arihant', 'Ashoka', 'Bhavani', 'Bhagya', 'Chandra',
  'Chola', 'Deepam', 'Dhanlaxmi', 'Durga', 'Ekta', 'Gajanan', 'Garuda', 'Gomathi', 'Hari Om', 'Indira',
  'Jagdamba', 'Janata', 'Kalpana', 'Kamadhenu', 'Kanaka', 'Kohinoor', 'Kumaran', 'Mahalaxmi', 'Mahavir', 'Manjunath',
  'Maruthi', 'Meenakshi', 'Mithra', 'Nandi', 'Navaratna', 'Neelkanth', 'Padmavathi', 'Parvathi', 'Prabhat', 'Pragati',
  'Rajdhani', 'Ramdev', 'Sagar', 'Sambhav', 'Samrat', 'Saraswati', 'Shakti', 'Shiva', 'Siddhi', 'Sindhu',
  'Sri Venkateswara', 'Swastik', 'Tirumala', 'Triveni', 'Udaya', 'Vaibhav', 'Vasantha', 'Vijaya', 'Vinayaka', 'Yamuna'
]) with ordinality as t(word, ord);

-- Customer industries: the name word and the sector reported in `industry`.
create temp table seed_client_industry on commit drop as
select (ord - 1)::int as i, t.word, t.sector
from unnest(
  array['Textiles', 'Agro Foods', 'Steel Traders', 'Pharma Distributors', 'Electricals', 'Hotels',
        'Granite Exports', 'Infosolutions', 'Packaging', 'Auto Parts', 'Hardware Mart', 'Printers',
        'Poultry Feeds', 'Chemicals', 'Logistics', 'Constructions', 'Plastics', 'Spice Traders',
        'Engineering Works', 'Furnishings', 'Hospitals', 'Educational Society', 'Realty', 'Motors'],
  array['Textiles', 'Food Processing', 'Metals', 'Pharmaceuticals', 'Electrical Equipment', 'Hospitality',
        'Construction Materials', 'IT Services', 'Packaging', 'Automotive', 'Retail', 'Printing',
        'Agriculture', 'Chemicals', 'Logistics', 'Construction', 'Plastics', 'Food Processing',
        'Engineering', 'Retail', 'Healthcare', 'Education', 'Real Estate', 'Automotive']
) with ordinality as t(word, sector, ord);

-- States, GST codes, cities and the sales region each maps to. i = 0 is the
-- seller's own state.
create temp table seed_state on commit drop as
select * from (values
  (0,  'Telangana',      '36', 'South', array['Hyderabad', 'Secunderabad', 'Warangal', 'Karimnagar']),
  (1,  'Andhra Pradesh', '37', 'South', array['Visakhapatnam', 'Vijayawada', 'Guntur']),
  (2,  'Karnataka',      '29', 'South', array['Bengaluru', 'Mysuru', 'Hubballi']),
  (3,  'Maharashtra',    '27', 'West',  array['Mumbai', 'Pune', 'Nagpur']),
  (4,  'Tamil Nadu',     '33', 'South', array['Chennai', 'Coimbatore', 'Madurai']),
  (5,  'Delhi',          '07', 'North', array['New Delhi']),
  (6,  'Gujarat',        '24', 'West',  array['Ahmedabad', 'Surat', 'Rajkot']),
  (7,  'West Bengal',    '19', 'East',  array['Kolkata', 'Howrah']),
  (8,  'Uttar Pradesh',  '09', 'North', array['Lucknow', 'Kanpur', 'Noida']),
  (9,  'Kerala',         '32', 'South', array['Kochi', 'Thiruvananthapuram']),
  (10, 'Rajasthan',      '08', 'North', array['Jaipur', 'Udaipur']),
  (11, 'Haryana',        '06', 'North', array['Gurugram', 'Faridabad']),
  (12, 'Punjab',         '03', 'North', array['Ludhiana', 'Amritsar']),
  (13, 'Odisha',         '21', 'East',  array['Bhubaneswar', 'Cuttack']),
  (14, 'Madhya Pradesh', '23', 'West',  array['Indore', 'Bhopal'])
) as s(i, state, state_code, region, cities);

-- -----------------------------------------------------------------------------
-- Vendor roles: every company has one vendor per role. Roles 0–11 supply
-- stock items; 12–17 sell services billed on a schedule. A per-role roster
-- (instead of random vendor names) is what lets a bill's lines always match
-- what that vendor actually sells.
-- -----------------------------------------------------------------------------
create temp table seed_vendor_role on commit drop as
select * from (values
  -- r, name word, category, criticality, service?, SAC, GST %, service line text, bills per year, base amount (₹, pre-scale), terms days
  (0,  'Paper Products',          'Paper and Stationery',    'medium', false, null,   null, null,                                  0,  0,      30),
  (1,  'Textile Mills',           'Textiles',                'medium', false, null,   null, null,                                  0,  0,      45),
  (2,  'Agro Commodities',        'Food Commodities',        'high',   false, null,   null, null,                                  0,  0,      15),
  (3,  'Steel and Pipes',         'Metals',                  'high',   false, null,   null, null,                                  0,  0,      30),
  (4,  'Electrical Distributors', 'Electricals',             'medium', false, null,   null, null,                                  0,  0,      30),
  (5,  'Computer Systems',        'IT Hardware',             'high',   false, null,   null, null,                                  0,  0,      45),
  (6,  'Office Furniture',        'Furniture',               'low',    false, null,   null, null,                                  0,  0,      30),
  (7,  'Healthcare Supplies',     'Healthcare Consumables',  'medium', false, null,   null, null,                                  0,  0,      30),
  (8,  'Building Materials',      'Construction Materials',  'high',   false, null,   null, null,                                  0,  0,      30),
  (9,  'Industrial Spares',       'Industrial Supplies',     'medium', false, null,   null, null,                                  0,  0,      45),
  (10, 'Garments',                'Apparel',                 'low',    false, null,   null, null,                                  0,  0,      30),
  (11, 'Solar Energy',            'Renewable Energy',        'medium', false, null,   null, null,                                  0,  0,      60),
  -- Services. Transporters bill per trip; the rest on monthly contracts.
  (12, 'Transport Services',      'Freight and Transport',   'high',   true,  '9965', 5,    'Freight charges - outward consignments', 40, 15000,  15),
  (13, 'Warehousing',             'Warehousing',             'medium', true,  '9967', 18,   'Warehouse space rental',                 12, 80000,  30),
  (14, 'Facility Services',       'Facility Management',     'low',    true,  '9985', 18,   'Housekeeping and security services',     24, 30000,  30),
  (15, 'Caterers',                'Canteen Services',        'low',    true,  '9963', 5,    'Staff canteen services',                 12, 40000,  15),
  (16, 'Machinery Maintenance',   'Maintenance and Repairs', 'medium', true,  '9987', 18,   'Forklift and machinery servicing',       14, 20000,  30),
  (17, 'IT Services',             'IT Services',             'medium', true,  '9983', 18,   'IT support and network AMC',             12, 35000,  30)
) as r(r, word, category, criticality, is_service, sac, gst_rate, service_text, bills_per_year, base_amount, terms_days);

-- The 50-product catalogue, each tagged with the vendor role that supplies
-- it. Post-September-2025 GST slabs only (0 / 5 / 18); 12% and 28% were
-- folded away by that rate rationalisation and every date here is later.
create temp table seed_product on commit drop as
select * from (values
  (1,  'A4 Copier Paper 75 GSM (5 reams)',     '4802', 'box',   1150.00, 18, 0),
  (2,  'Corrugated Shipping Carton 18x12x12',  '4819', 'pcs',     32.00, 18, 0),
  (3,  'Cotton Shirting Fabric',               '5208', 'metre',  145.00,  5, 1),
  (4,  'Polyester Blend Suiting Fabric',       '5515', 'metre',  210.00,  5, 1),
  (5,  'Basmati Rice (Branded, Packed)',       '1006', 'kg',      88.00,  5, 2),
  (6,  'Refined Sunflower Oil',                '1512', 'litre',  135.00,  5, 2),
  (7,  'Toor Dal (Loose)',                     '0713', 'kg',     118.00,  0, 2),
  (8,  'Turmeric Powder',                      '0910', 'kg',     165.00,  5, 2),
  (9,  'Red Chilli Powder',                    '0904', 'kg',     210.00,  5, 2),
  (10, 'Mild Steel TMT Bar 12mm',              '7214', 'kg',      58.00, 18, 3),
  (11, 'GI Pipe 1 inch',                       '7306', 'metre',  210.00, 18, 3),
  (12, 'PVC Conduit Pipe 25mm',                '3917', 'metre',   34.00, 18, 3),
  (13, 'Copper Wire 2.5 sq mm (90 m coil)',    '8544', 'pcs',   2150.00, 18, 4),
  (14, 'LED Panel Light 18W',                  '9405', 'pcs',    420.00, 18, 4),
  (15, 'MCB 32A Double Pole',                  '8536', 'pcs',    385.00, 18, 4),
  (16, 'Ceiling Fan 1200mm',                   '8414', 'pcs',   1650.00, 18, 4),
  (17, 'Laptop 14 inch Core i5',               '8471', 'pcs',  48500.00, 18, 5),
  (18, 'Wireless Keyboard and Mouse Combo',    '8471', 'set',    890.00, 18, 5),
  (19, '27 inch LED Monitor',                  '8528', 'pcs',  11800.00, 18, 5),
  (20, 'Network Switch 24 Port',               '8517', 'pcs',   9200.00, 18, 5),
  (21, 'CAT6 LAN Cable (305 m box)',           '8544', 'box',   5400.00, 18, 5),
  (22, 'Ergonomic Office Chair',               '9401', 'pcs',   5600.00, 18, 6),
  (23, 'Steel Filing Cabinet 4 Drawer',        '9403', 'pcs',   9800.00, 18, 6),
  (24, 'Whiteboard 4x3 ft',                    '9610', 'pcs',   1350.00, 18, 6),
  (25, 'Ballpoint Pens (Box of 50)',           '9608', 'box',    210.00, 18, 0),
  (26, 'Printer Toner Cartridge',              '8443', 'pcs',   2900.00, 18, 5),
  (27, 'Hand Sanitiser',                       '3808', 'litre',   95.00, 18, 7),
  (28, 'Floor Cleaner Concentrate',            '3402', 'litre',   72.00, 18, 7),
  (29, 'Paracetamol 500mg (Box of 10 strips)', '3004', 'box',    180.00,  5, 7),
  (30, 'Nitrile Gloves (Box of 100)',          '4015', 'box',    340.00,  5, 7),
  (31, 'N95 Respirator Mask',                  '6307', 'pcs',     38.00,  5, 7),
  (32, 'Portland Cement 50kg Bag',             '2523', 'pcs',    330.00, 18, 8),
  (33, 'Vitrified Floor Tile 600x600',         '6907', 'box',    780.00, 18, 8),
  (34, 'Polished Granite Slab',                '6802', 'pcs',   2400.00, 18, 8),
  (35, 'Teak Wood Plank',                      '4407', 'metre', 1250.00, 18, 8),
  (36, 'Emulsion Paint 20L',                   '3209', 'pcs',   3900.00, 18, 8),
  (37, 'Ball Bearing 6205',                    '8482', 'pcs',    145.00, 18, 9),
  (38, 'V-Belt B-52',                          '4010', 'pcs',    260.00, 18, 9),
  (39, 'Hydraulic Oil ISO 68',                 '2710', 'litre',  165.00, 18, 9),
  (40, 'Welding Electrode 3.15mm (Box)',       '8311', 'box',    820.00, 18, 9),
  (41, 'Safety Helmet',                        '6506', 'pcs',    190.00, 18, 9),
  (42, 'Safety Shoes (Pair)',                  '6403', 'set',    980.00,  5, 10),
  (43, 'Cotton T-Shirt',                       '6109', 'pcs',    180.00,  5, 10),
  (44, 'Jute Shopping Bag',                    '6305', 'pcs',     65.00,  5, 1),
  (45, 'Cashew Kernels W320',                  '0801', 'kg',     720.00,  5, 2),
  (46, 'Green Tea Leaves',                     '0902', 'kg',     540.00,  5, 2),
  (47, 'Packaged Drinking Water 20L Jar',      '2201', 'pcs',     60.00,  5, 2),
  (48, 'Brass Door Handle Set',                '8302', 'set',    640.00, 18, 8),
  (49, 'Stainless Steel Water Bottle 1L',      '7323', 'pcs',    240.00,  5, 9),
  (50, 'Solar Panel 540W',                     '8541', 'pcs',  13500.00,  5, 11)
) as p(b, name, hsn_code, unit, base_cost, gst_rate, role);

-- -----------------------------------------------------------------------------
-- Party rolls: 50 per slice (slots 0–19 vendors, 20–49 clients). Plants are
-- picked by ranking these rolls inside a slice, which is what puts them at a
-- different position in every company.
-- -----------------------------------------------------------------------------
create temp table seed_party_draw on commit drop as
select g, g / 50 as slice_no, g % 50 as slot, random() as roll
from generate_series(0, 3999) as g;

-- Stock-role vendors ranked by roll: ranks 1–2 get an A5 duplicate master,
-- rank 3 an A6 PAN mismatch, rank 4 an A6 malformed IFSC.
create temp table seed_vendor_pick on commit drop as
select slice_no, slot as r, rank() over (partition by slice_no order by roll, slot) as rk
from seed_party_draw
where slot < 12;

-- Base vendors: one per role (slots 0–17).
create temp table seed_vendor on commit drop as
select
  s.slice_no, vr.r as slot, vr.r as role,
  'ven_' || left(md5('ven' || s.slice_no || '-' || vr.r), 12) as id,
  trim(p.word || ' ' || vr.word || ' ' || sf.suffix) as name, sf.suffix,
  st.state, st.state_code,
  st.cities[1 + (s.slice_no + vr.r) % array_length(st.cities, 1)] as city,
  -- Road transporters are small fleet owners, unregistered for GST: their
  -- bills fall under reverse charge. Everyone else is registered.
  vr.r <> 12 as registered,
  -- PAN: 3 letters, holder type (C company, F firm/LLP, P proprietor),
  -- name initial, 4 digits, a letter. md5 of the id keeps it stable.
  translate(substr(md5('pan' || s.slice_no || '-v' || vr.r), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || case when sf.suffix like '%Ltd' then 'C' when sf.suffix in ('LLP', '& Co') then 'F' else 'P' end
    || upper(left(p.word, 1))
    || substr(translate(md5('pan' || s.slice_no || '-v' || vr.r), 'abcdef', '012345'), 4, 4)
    || translate(substr(md5('pan' || s.slice_no || '-v' || vr.r), 8, 1), '0123456789abcdef', 'ABCDEFGHJKLMNPQR') as pan,
  coalesce(pk.rk, 99) as rk,
  vr.category, vr.criticality, vr.terms_days
from seed_slice s
cross join seed_vendor_role vr
-- Vendor prefixes are party indices 0–17 of the slice.
join seed_prefix p on p.p = (7 * s.slice_no + 13 * vr.r) % 100
cross join lateral (select (array['Pvt Ltd', 'Pvt Ltd', 'Ltd', 'LLP', '& Co', ''])[1 + (s.slice_no * 3 + vr.r) % 6] as suffix) sf
-- Service vendors are local; suppliers come from anywhere, often out of state.
join seed_state st on st.i = case when vr.r >= 12 then 0 else (s.slice_no + vr.r * 3) % 15 end
left join seed_vendor_pick pk on pk.slice_no = s.slice_no and pk.r = vr.r;

-- A5: two duplicate vendor masters per slice (slots 18, 19), copies of the
-- rank-1 and rank-2 suppliers: same PAN and GSTIN, a spelling variant of the
-- name, created later by a different buyer.
insert into seed_vendor (slice_no, slot, role, id, name, suffix, state, state_code, city, registered, pan, rk, category, criticality, terms_days)
select
  v.slice_no, 17 + v.rk::int, v.role,
  'ven_' || left(md5('ven' || v.slice_no || '-' || (17 + v.rk)), 12),
  -- The way a second clerk re-keys a supplier: legal form spelled out, or
  -- the whole name in capitals.
  case when v.suffix = '' then upper(v.name)
       else replace(replace(replace(replace(v.name, 'Pvt Ltd', 'Private Limited'), ' Ltd', ' Limited'), 'LLP', 'L.L.P.'), '& Co', 'and Company') end,
  v.suffix, v.state, v.state_code, v.city, v.registered, v.pan, 100 + v.rk, v.category, v.criticality, v.terms_days
from seed_vendor v
where v.rk in (1, 2) and v.slot < 12;

-- Vendors. A6 plants break exactly one identifier each; the PAN column of the
-- rank-3 supplier disagrees with its GSTIN, the rank-4 supplier's IFSC has a
-- letter O where RBI requires a zero.
insert into public.nova_vendors (
  id, name, gst_number, email, phone, address, state, state_code, bank_ifsc, bank_account_last4,
  category, criticality, payment_terms_days, early_pay_discount_pct, late_penalty_pct_per_month,
  pan, created_by, status, created_at, slice_no
)
select
  v.id, v.name,
  -- GSTIN = state code + PAN + entity 1 + Z + real check character.
  case when v.registered then v.state_code || v.pan || '1Z' || pg_temp.gstin_check(v.state_code || v.pan || '1Z') end,
  -- Role mailbox local part; .example is a reserved domain.
  'accounts@' || lower(regexp_replace(split_part(v.name, ' ', 1) || split_part(v.name, ' ', 2), '[^A-Za-z]', '', 'g'))
    || case when v.slot >= 18 then 'group' else '' end || '.example',
  '+91 9' || substr(translate(md5('ph' || v.id), 'abcdef', '012345'), 1, 9),
  (20 + v.slot * 11) || ', ' || (array['Industrial Estate', 'Trade Centre', 'Warehouse Road', 'Auto Nagar', 'Market Yard'])[1 + v.slot % 5]
    || ', ' || v.city || ', ' || v.state,
  v.state, v.state_code,
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])[1 + (v.slice_no + v.slot) % 5]
    || case when v.rk = 4 and v.slot < 12 then 'O' else '0' end
    || substr(translate(md5('ifsc' || v.id), 'abcdef', '012345'), 1, 6),
  substr(translate(md5('acct' || v.id), 'abcdef', '012345'), 1, 4),
  v.category, v.criticality, v.terms_days,
  -- Some suppliers offer a prompt-payment discount, some charge late interest.
  case (v.slice_no + v.slot) % 4 when 0 then 2.00 when 1 then 1.00 else 0 end,
  case v.slot % 3 when 0 then 1.50 when 1 then 2.00 else 0 end,
  -- PAN column: the rank-3 supplier's last digit is off by one (A6).
  case when v.rk = 3 and v.slot < 12
       then left(v.pan, 8) || ((substr(v.pan, 9, 1)::int + 1) % 10)::text || right(v.pan, 1)
       else v.pan end,
  -- Masters are created by procurement staff (core staff, never leavers).
  'emp_' || left(md5('emp' || v.slice_no || '-' || (18 + (v.slice_no + v.slot) % 5)), 8),
  -- One maintenance vendor in every fifth company was blocked after disputes.
  case when v.role = 16 and v.slice_no % 5 = 2 then 'blocked' else 'active' end,
  -- Originals predate the books; duplicates were keyed during the year.
  case when v.slot >= 18 then ((select d from seed_asof) - 330 + (v.slice_no * 7) % 90)::timestamptz
       else ((select d from seed_asof) - 420 - (v.slot * 37) % 600)::timestamptz end,
  v.slice_no
from seed_vendor v
order by v.slice_no, v.slot;

-- -----------------------------------------------------------------------------
-- Clients: 28 base (r 0–27) + 2 A5 duplicates (r 28, 29) per slice.
-- r 0–3 enterprise, 4–11 mid-market, 12–27 SMB. Ranks by roll choose:
--   enterprise rank 1 → A24 anchor (large, slowing, over its limit);
--   enterprise rank 2 → decoy: a NEW large customer that pays on time;
--   enterprise rank 3 → also registered in a second state (A5 decoy, r 26);
--   mid/SMB rank 1–2 → A5 duplicated masters; rank 3 → A6 bad checksum;
--   rank 4 → A6 GSTIN state code ≠ state.
-- r 25 and 27 are unregistered (no GSTIN): r 25 is the A6 decoy.
-- -----------------------------------------------------------------------------
create temp table seed_client_rank on commit drop as
select
  slice_no, slot - 20 as r,
  -- Separate rankings for the enterprise tier and the mid/SMB pool.
  case when slot - 20 < 4 then rank() over (partition by slice_no, slot - 20 < 4 order by roll, slot) end as ent_rk,
  case when slot - 20 between 4 and 24 then rank() over (partition by slice_no, slot - 20 between 4 and 24 order by roll, slot) end as pool_rk
from seed_party_draw
where slot between 20 and 47;

-- Base client attributes.
create temp table seed_client on commit drop as
select
  s.slice_no, c.r,
  'cli_' || left(md5('cli' || s.slice_no || '-' || c.r), 12) as id,
  trim(p.word || ' ' || ind.word || ' ' || sf.suffix) as name, sf.suffix, ind.sector,
  case when c.r < 4 then 'enterprise' when c.r < 12 then 'mid_market' else 'smb' end as segment,
  st.state, st.state_code, st.region,
  st.cities[1 + (s.slice_no + c.r) % array_length(st.cities, 1)] as city,
  c.r not in (25, 27) as registered,
  translate(substr(md5('pan' || s.slice_no || '-c' || c.r), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || case when sf.suffix like '%Ltd' then 'C' when sf.suffix in ('LLP', '& Co') then 'F' else 'P' end
    || upper(left(p.word, 1))
    || substr(translate(md5('pan' || s.slice_no || '-c' || c.r), 'abcdef', '012345'), 4, 4)
    || translate(substr(md5('pan' || s.slice_no || '-c' || c.r), 8, 1), '0123456789abcdef', 'ABCDEFGHJKLMNPQR') as pan,
  k.ent_rk, k.pool_rk,
  -- Stable 0–1 fraction per client for limits and terms, independent of rank.
  ('x' || substr(md5('clih' || s.slice_no || '-' || c.r), 1, 6))::bit(24)::int / 16777216.0 as h
from seed_slice s
cross join generate_series(0, 27) as c(r)
-- Client prefixes are party indices 18–45: never a vendor's prefix.
join seed_prefix p on p.p = (7 * s.slice_no + 13 * (18 + c.r)) % 100
join seed_client_industry ind on ind.i = (s.slice_no * 5 + c.r * 7) % 24
-- Enterprises are companies; smaller customers include firms and proprietors.
cross join lateral (select case when c.r < 4 then (array['Pvt Ltd', 'Ltd'])[1 + (s.slice_no + c.r) % 2]
  else (array['Pvt Ltd', 'Pvt Ltd', 'Ltd', 'LLP', '& Co', ''])[1 + (s.slice_no * 5 + c.r) % 6] end as suffix) sf
-- Two in five customers are local (intra-state supply).
join seed_state st on st.i = case when c.r % 5 in (0, 1) then 0 else 1 + (s.slice_no * 3 + c.r) % 14 end
left join seed_client_rank k on k.slice_no = s.slice_no and k.r = c.r;

-- r 26 is the A5 decoy: the rank-3 enterprise's registration in another state.
-- Same PAN (one legal entity), its own GSTIN and billing address — a correct
-- separate master, because GST treats each state registration separately.
update seed_client c
set name = e.name || ' (' || st.state || ')', suffix = e.suffix, sector = e.sector, segment = 'mid_market',
    state = st.state, state_code = st.state_code, region = st.region, city = st.cities[1], pan = e.pan
from seed_client e
join seed_state st on st.i = 1 + (e.slice_no + 4) % 14
where c.r = 26 and e.slice_no = c.slice_no and e.ent_rk = 3;

-- A5: the rank-1/2 pool clients re-keyed as second masters (r 28, 29).
insert into seed_client (slice_no, r, id, name, suffix, sector, segment, state, state_code, region, city, registered, pan, ent_rk, pool_rk, h)
select
  c.slice_no, 27 + c.pool_rk::int,
  'cli_' || left(md5('cli' || c.slice_no || '-' || (27 + c.pool_rk)), 12),
  -- Clerical variants: capitals, or the legal form spelled out.
  case when c.pool_rk = 1 then upper(c.name)
       else replace(replace(replace(replace(c.name, 'Pvt Ltd', 'Private Limited'), ' Ltd', ' Limited'), 'LLP', 'L.L.P.'), '& Co', 'and Co.') end,
  c.suffix, c.sector, c.segment, c.state, c.state_code, c.region, c.city, c.registered, c.pan, null, 100 + c.pool_rk, c.h
from seed_client c
where c.pool_rk in (1, 2);

-- Commercial terms and weights used by the invoice generator.
create temp table seed_client_full on commit drop as
select
  c.*,
  -- A24 anchor, and the on-time decoy that joined in the last five months.
  -- coalesce: ent_rk is null outside the enterprise tier, and a null flag
  -- would silently drop those clients out of every later filter.
  coalesce(c.ent_rk = 1, false) as is_anchor,
  coalesce(c.ent_rk = 2, false) as is_new_large,
  case c.segment when 'enterprise' then (array[45, 60])[1 + floor(c.h * 2)::int]
                 when 'mid_market' then (array[30, 45])[1 + floor(c.h * 2)::int]
                 else (array[15, 30])[1 + floor(c.h * 2)::int] end as terms_days,
  -- Limits in round lakhs, scaled to the company's size.
  round(sl.scale * case c.segment when 'enterprise' then 6000000 + 9000000 * c.h
                                  when 'mid_market' then 1500000 + 2500000 * c.h
                                  else 300000 + 500000 * c.h end, -5) as credit_limit,
  -- How often the invoice generator picks this client.
  case when c.ent_rk = 1 then 7.0 when c.segment = 'enterprise' then 3.0 when c.segment = 'mid_market' then 1.5
       when c.r >= 28 then 0.3 else 0.6 end as weight,
  -- Per-line goods order value (₹, before scale): what the segment buys.
  case when c.ent_rk = 1 then 60000 when c.segment = 'enterprise' then 50000
       when c.segment = 'mid_market' then 20000 else 8000 end as line_value,
  -- Service value per invoice (₹, before scale). The company earns most of
  -- its revenue from installation, maintenance and support: that is what a
  -- 60-person payroll (005) is paid from.
  case when c.ent_rk = 1 then 370000 when c.segment = 'enterprise' then 297000
       when c.segment = 'mid_market' then 123000 else 43000 end as service_value,
  -- Payment habit: 0 early, 1 on terms, 2 late.
  case when c.segment = 'enterprise' then 1 when c.h < 0.45 then 0 when c.h < 0.8 then 1 else 2 end as pay_class,
  'emp_' || left(md5('emp' || c.slice_no || '-' || (1 + (c.r + c.slice_no) % 11)), 8) as owner_id,
  'bu_' || left(md5('bu' || c.slice_no || '-' || (c.r % 4)), 8) as business_unit_id
from seed_client c
join seed_slice sl on sl.slice_no = c.slice_no;

-- Clients. A6: pool rank 3 gets a GSTIN whose check character is wrong;
-- pool rank 4 gets a GSTIN with another state's prefix (checksum valid, so
-- only a state-vs-code comparison catches it).
insert into public.nova_clients (
  id, name, gst_number, email, phone, billing_address, state, state_code, created_at, slice_no,
  segment, industry, region, credit_limit, payment_terms_days, account_owner_id, business_unit_id, pan
)
select
  c.id, c.name,
  case
    when not c.registered then null
    -- Wrong check character: the next symbol after the correct one.
    when c.pool_rk = 3 then c.state_code || c.pan || '1Z'
      || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', strpos('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', pg_temp.gstin_check(c.state_code || c.pan || '1Z')) % 36 + 1, 1)
    -- Registered under another state's code than the billing state.
    when c.pool_rk = 4 then g.other || c.pan || '1Z' || pg_temp.gstin_check(g.other || c.pan || '1Z')
    else c.state_code || c.pan || '1Z' || pg_temp.gstin_check(c.state_code || c.pan || '1Z')
  end,
  -- Duplicates were keyed from a different contact's email.
  case when c.r >= 28 then 'finance@' else 'accounts@' end
    || lower(regexp_replace(split_part(c.name, ' ', 1) || split_part(c.name, ' ', 2), '[^A-Za-z]', '', 'g')) || '.example',
  '+91 9' || substr(translate(md5('ph' || c.id), 'abcdef', '012345'), 1, 9),
  (12 + c.r * 7) || '-' || (1 + c.r % 9) || ', '
    || (array['Industrial Area', 'Main Road', 'MG Road', 'Station Road', 'Market Street', 'Ring Road'])[1 + c.r % 6]
    || ', ' || c.city || ', ' || c.state,
  c.state, c.state_code,
  case when c.is_new_large then ((select d from seed_asof) - 140)::timestamptz
       when c.r >= 28 then ((select d from seed_asof) - 320 + (c.r * 13 + c.slice_no) % 60)::timestamptz
       else ((select d from seed_asof) - 400 - (c.r * 29) % 700)::timestamptz end,
  c.slice_no, c.segment, c.sector, c.region, c.credit_limit, c.terms_days, c.owner_id, c.business_unit_id, c.pan
from seed_client_full c
-- A state code guaranteed to differ from the client's own.
cross join lateral (select case when c.state_code = '27' then '29' else '27' end as other) g
order by c.slice_no, c.r;

-- Cumulative pick weights per slice, two sets: before the new large customer
-- existed (weight 0 for it) and after. A client is picked where
-- roll x total falls into its [lo, hi) band.
create temp table seed_client_band on commit drop as
select
  c.slice_no, c.r, c.id, set_no,
  sum(w) over (partition by c.slice_no, set_no order by c.r) - w as lo,
  sum(w) over (partition by c.slice_no, set_no order by c.r) as hi,
  sum(w) over (partition by c.slice_no, set_no) as total
from seed_client_full c
cross join generate_series(0, 1) as set_no
cross join lateral (select case when set_no = 0 and c.is_new_large then 0 else c.weight end as w) x;

-- -----------------------------------------------------------------------------
-- Invoice rolls: 300 per slice, all drawn up front in one fixed order.
-- -----------------------------------------------------------------------------
create temp table seed_inv_draw on commit drop as
select
  g, g / 300 as slice_no, g % 300 as pos,
  random() as client_roll,
  random() as day_roll,
  random() as lines_roll,
  -- Offset of the first line's item; later lines step by 7 (distinct items).
  random() as item_roll,
  random() as service_roll,
  random() as discount_roll,
  random() as disc_pct_roll,
  random() as lag_roll,
  random() as partial_roll,
  random() as partial_frac_roll,
  random() as lag2_roll,
  random() as method_roll,
  random() as dispute_roll,
  -- Size of the invoice's service line (long-tailed, see seed_inv_line).
  random() as service_value_roll
from generate_series(0, 23999) as g;

-- Line rolls: up to 3 stock lines per invoice, drawn for all three so the
-- stream never depends on the line count.
create temp table seed_inv_line_draw on commit drop as
select g, g / 3 as inv_g, g % 3 as line_no, random() as qty_roll
from generate_series(0, 71999) as g;

-- -----------------------------------------------------------------------------
-- Stock items: 30 of the 50 products per slice. The first product of every
-- supplier role is always stocked, so all twelve suppliers have something to
-- sell; the other 18 are picked by an md5 rank, so companies differ. Every
-- slice ends up with a similar price mix, which is what keeps book sizes
-- within 2x of each other.
-- -----------------------------------------------------------------------------
create temp table seed_item on commit drop as
with forced as (
  -- Lowest product number per role.
  select role, min(b) as b from seed_product group by role
), ranked as (
  -- Remaining products, in a per-slice pseudo-random order.
  select s.slice_no, p.b,
         row_number() over (partition by s.slice_no order by md5('pick' || s.slice_no || '-' || p.b)) as rn
  from seed_slice s cross join seed_product p
  where p.b not in (select b from forced)
), chosen as (
  select s.slice_no, f.b from seed_slice s cross join forced f
  union all
  select slice_no, b from ranked where rn <= 18
)
select
  c.slice_no, p.b,
  (row_number() over (partition by c.slice_no order by p.b) - 1)::int as k,
  'itm_' || left(md5('itm' || c.slice_no || '-' || p.b), 12) as id,
  p.name, p.hsn_code, p.unit, p.gst_rate, p.role,
  'ven_' || left(md5('ven' || c.slice_no || '-' || p.role), 12) as vendor_id,
  pp.purchase_price,
  -- Selling price: the slice's markup ±5% by item; whole rupees above ₹100.
  round(pp.purchase_price * sl.markup * (0.95 + ((p.b * 3 + c.slice_no) % 5) * 0.025),
        case when pp.purchase_price >= 100 then 0 else 1 end) as sale_price,
  -- Stable 0–1 fraction per item for lead time, sourcing and reorder level.
  ('x' || substr(md5('itmh' || c.slice_no || '-' || p.b), 1, 6))::bit(24)::int / 16777216.0 as h,
  -- One in three items is kept at the branch depot, the rest centrally.
  case when (c.slice_no + p.b) % 3 = 0
       then (array['Secunderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'])[1 + c.slice_no % 5] || ' Depot'
       else 'Hyderabad Central Warehouse' end as warehouse
from chosen c
join seed_product p on p.b = c.b
join seed_slice sl on sl.slice_no = c.slice_no
-- Cost varies ±8% by company, so two teams stocking one product still differ.
cross join lateral (select round(p.base_cost * (0.92 + ((c.slice_no * 7 + p.b) % 9) * 0.02),
                                 case when p.base_cost >= 100 then 0 else 1 end) as purchase_price) pp;

-- -----------------------------------------------------------------------------
-- Invoice headers. Dates are spread evenly over the year (pos is the slot in
-- time, the roll jitters it inside the slot), so no month is over-full.
-- -----------------------------------------------------------------------------
create temp table seed_inv on commit drop as
select
  d.*, dt.invoice_date, cl.id as client_id, cf.segment, cf.state_code, cf.terms_days, cf.pay_class,
  cf.line_value, cf.service_value, cf.is_anchor, cf.owner_id, cf.business_unit_id, cf.r as client_r,
  case when d.lines_roll < 0.5 then 1 when d.lines_roll < 0.8 then 2 else 3 end as stock_lines,
  -- 85% of invoices carry a service line (installation, maintenance, support).
  d.service_roll < 0.85 as has_service,
  -- Trade discount on three in ten invoices.
  case when d.discount_roll < 0.3 then (array[2, 3, 5, 7.5, 10])[1 + floor(d.disc_pct_roll * 5)::int] else 0 end as disc_pct,
  -- 'INV-<slice>-<n>', numbered per company in date order (gap-free series).
  'inv_' || left(md5('inv' || d.slice_no || '-' || d.pos), 12) as id
from seed_inv_draw d
cross join lateral (select (select a.d from seed_asof a) - 364 + floor((d.pos + d.day_roll) * 364 / 300)::int as invoice_date) dt
-- Weight set 1 (includes the new large customer) only in its last 140 days.
join seed_client_band cl on cl.slice_no = d.slice_no
  and cl.set_no = case when dt.invoice_date >= (select a.d from seed_asof a) - 140 then 1 else 0 end
  and d.client_roll * cl.total >= cl.lo and d.client_roll * cl.total < cl.hi
join seed_client_full cf on cf.id = cl.id;

-- Temp tables get no autovacuum statistics, so without ANALYZE the planner
-- guesses row counts and picks nested loops; the indexes serve the joins on
-- invoice ordinal and on (slice, position) that follow.
create index on seed_inv (g);
create index on seed_inv (slice_no, pos);
analyze seed_inv;
analyze seed_inv_line_draw;
analyze seed_item;

-- Priced lines. Line amount is net of its discount; GST is rounded per line.
create temp table seed_inv_line on commit drop as
select
  i.slice_no, i.g, l.line_no, it.id as item_id, it.name, it.hsn_code, q.qty, it.sale_price as rate, it.gst_rate,
  round(q.qty * it.sale_price * i.disc_pct / 100, 2) as discount,
  q.qty * it.sale_price - round(q.qty * it.sale_price * i.disc_pct / 100, 2) as amount,
  round((q.qty * it.sale_price - round(q.qty * it.sale_price * i.disc_pct / 100, 2)) * it.gst_rate / 100, 2) as gst_amount
from seed_inv i
join seed_inv_line_draw l on l.inv_g = i.g and l.line_no < i.stock_lines
-- Distinct items per invoice: offsets step by 7 around the 30-item list.
join seed_item it on it.slice_no = i.slice_no and it.k = (floor(i.item_roll * 30)::int + l.line_no * 7) % 30
join seed_slice sl on sl.slice_no = i.slice_no
-- Quantity sized to the customer's usual order value; at least one unit.
cross join lateral (select greatest(1, round(i.line_value * sl.rev_scale * (0.4 + 1.2 * l.qty_roll) / it.sale_price))::int as qty) q;

-- Service line, SAC 9987/9983 at 18%. Its value has a long tail
-- (0.3 + 0.9r + 2.5r^8: mean about 1, occasionally 3–4x), the way a few big
-- projects sit among many routine visits. Loss-making companies discount
-- their services by a quarter to win work.
insert into seed_inv_line (slice_no, g, line_no, item_id, name, hsn_code, qty, rate, gst_rate, discount, amount, gst_amount)
select i.slice_no, i.g, 9, null, sv.name, sv.sac, 1, v.amt, 18, 0, v.amt, round(v.amt * 0.18, 2)
from seed_inv i
join seed_slice sl on sl.slice_no = i.slice_no
cross join lateral (select round(i.service_value * sl.rev_scale * case when sl.loss_maker then 0.75 else 1 end
  * (0.3 + 0.9 * i.service_value_roll + 2.5 * power(i.service_value_roll, 8))::numeric, -2) as amt) v
-- Four service types, chosen by the invoice position.
cross join lateral (select (array['Installation and commissioning', 'Annual maintenance contract', 'Technical support services', 'Site survey and system design'])[1 + i.pos % 4] as name,
                           (array['9987', '9987', '9983', '9983'])[1 + i.pos % 4] as sac) sv
where i.has_service;

-- Headers' money, plus the per-slice invoice number in date order.
create temp table seed_inv_total on commit drop as
select
  i.g, i.slice_no,
  'INV-' || lpad(i.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by i.slice_no order by i.invoice_date, i.pos)::text, 4, '0') as invoice_number,
  t.items, t.amount, t.discount, t.gst_amount, t.amount + t.gst_amount as total_amount
from seed_inv i
join (
  select g,
    jsonb_agg(jsonb_build_object('item_id', item_id, 'description', name, 'hsn_code', hsn_code, 'quantity', qty,
      'rate', rate, 'discount', discount, 'gst_rate', gst_rate, 'amount', amount, 'gst_amount', gst_amount) order by line_no) as items,
    sum(amount) as amount, sum(discount) as discount, sum(gst_amount) as gst_amount
  from seed_inv_line group by g
) t on t.g = i.g;

-- -----------------------------------------------------------------------------
-- Receipts: simulated from each customer's paying habit, then plants applied.
-- -----------------------------------------------------------------------------

-- Per-invoice payment timing. A receipt exists only if its date has arrived
-- by the as-of date; what has not arrived is simply still owed, which is how
-- pending, partial and overdue invoices come about naturally.
create temp table seed_inv_pay on commit drop as
select
  i.g, i.slice_no, i.id, i.client_id, i.segment, i.is_anchor, i.invoice_date, i.terms_days, t.total_amount, t.amount,
  i.method_roll, i.lag2_roll,
  -- Disputed invoices are never paid (2%, never the A24 anchor's).
  i.dispute_roll < 0.02 and not i.is_anchor as disputed,
  -- Part-payers (18%) pay 40–80% early, inside terms, and the rest weeks
  -- later — so recent ones show as partial but not yet overdue.
  i.partial_roll < 0.18 and not i.is_anchor as part_payer,
  round(t.total_amount * (0.4 + 0.4 * i.partial_frac_roll)::numeric, 2) as part_amount,
  i.invoice_date + case when i.partial_roll < 0.18 and not i.is_anchor
                        then floor(i.terms_days * 0.5 * i.lag_roll)::int else lag.days end as p1
from seed_inv i
join seed_inv_total t on t.g = i.g
cross join lateral (select case
  -- A24: days-to-pay grows about a week with every month of the year.
  when i.is_anchor then i.terms_days + 3 + 7 * floor((i.invoice_date - ((select a.d from seed_asof a) - 364)) / 30.4)::int + floor(i.lag_roll * 6)::int
  when i.pay_class = 0 then floor(i.terms_days * (0.3 + 0.6 * i.lag_roll))::int
  when i.pay_class = 1 then floor(i.terms_days * (0.8 + 0.5 * i.lag_roll))::int
  else i.terms_days + 10 + floor(50 * i.lag_roll)::int
end as days) lag;

-- Plant slot per invoice; null = ordinary. Filled by the statements below in
-- a fixed order, each taking only still-ordinary invoices, so plants never
-- overlap. Candidates are ranked by md5 of the invoice id inside the slice.
-- Statistics for the planner (temp tables are never auto-analyzed).
analyze seed_inv_pay;

-- Every company gets at least two invoices that are part-paid but still
-- inside terms: issued 3–19 days ago, first instalment the next day, so the
-- remainder (20+ days later) cannot have arrived yet. Without this, a slice
-- can end with no 'partial' in the view, only 'overdue'.
update seed_inv_pay p set part_payer = true, disputed = false, p1 = p.invoice_date + 1
from (select g, row_number() over (partition by slice_no order by md5('part' || id)) as rn
      from seed_inv_pay
      where not is_anchor and not part_payer
        and invoice_date between (select a.d from seed_asof a) - 19 and (select a.d from seed_asof a) - 3) x
where p.g = x.g and x.rn <= 2;

alter table seed_inv_pay add column plant text, add column plant_group text;

-- Eligible for a plant = one full receipt that has arrived (the ordinary
-- case). A column, not a temp view: a view would block the on-commit drop.
alter table seed_inv_pay add column clean boolean;
update seed_inv_pay set clean = not disputed and not part_payer and not is_anchor and p1 <= (select a.d from seed_asof a);

-- A14(a): three customers per slice each pay three invoices with ONE receipt.
update seed_inv_pay p set plant = 'multi', plant_group = x.client_id
from (
  select c.id, c.client_id
  from (select id, client_id, slice_no, row_number() over (partition by client_id order by invoice_date desc, id) as k from seed_inv_pay where plant is null and clean) c
  join (
    select slice_no, client_id, row_number() over (partition by slice_no order by md5('a14m' || client_id)) as rn
    from seed_inv_pay where plant is null and clean group by slice_no, client_id having count(*) >= 3
  ) cl on cl.client_id = c.client_id and cl.rn <= 3
  where c.k <= 3
) x
where p.id = x.id;

-- A14(b): six enterprise/mid invoices short-paid by 2% TDS on the taxable value.
update seed_inv_pay p set plant = 'tds'
from (select id, row_number() over (partition by slice_no order by md5('a14t' || id)) as rn
      from seed_inv_pay where plant is null and clean and segment in ('enterprise', 'mid_market')) x
where p.id = x.id and x.rn <= 6;

-- A14(c): four receipts rounded UP to the next ₹10,000: the excess sits
-- unapplied on the customer's account.
update seed_inv_pay p set plant = 'overpay'
from (select id, row_number() over (partition by slice_no order by md5('a14o' || id)) as rn from seed_inv_pay where plant is null and clean) x
where p.id = x.id and x.rn <= 4;

-- A28: one or two cash receipts of ₹2 lakh or more (s.269ST), from smaller
-- customers, the kind that plausibly pay at the counter.
update seed_inv_pay p set plant = 'cash_breach'
from (select id, slice_no, row_number() over (partition by slice_no order by md5('a28r' || id)) as rn
      from seed_inv_pay where plant is null and clean and segment in ('smb', 'mid_market') and total_amount between 200000 and 900000) x
where p.id = x.id and x.rn <= 1 + x.slice_no % 2;

-- A14 decoy: one invoice settled the same day by two receipts (UPI ₹1 lakh +
-- NEFT for the rest). It looks split, but it matches to the paisa.
update seed_inv_pay p set plant = 'split_decoy'
from (select id, row_number() over (partition by slice_no order by md5('a14d' || id)) as rn
      from seed_inv_pay where plant is null and clean and total_amount between 150000 and 2000000) x
where p.id = x.id and x.rn = 1;

-- A28 decoy: ₹1,99,000 in cash plus NEFT for the balance — under the s.269ST
-- ₹2 lakh line, so lawful, though it sits right at the threshold.
update seed_inv_pay p set plant = 'cash_decoy'
from (select id, row_number() over (partition by slice_no order by md5('a28d' || id)) as rn
      from seed_inv_pay where plant is null and clean and total_amount between 300000 and 1500000) x
where p.id = x.id and x.rn = 1;

-- Rail by amount, the way Indian B2B money moves: RTGS for ₹2 lakh and up,
-- NEFT/IMPS/cheque in the middle, UPI and small cash only at the low end.
-- Ordinary cash is capped at ₹50,000 from SMBs, so no unplanted cash receipt
-- ever reaches the ₹2 lakh line.
create or replace function pg_temp.rail(amt numeric, roll float8, segment text) returns text
language sql immutable as $$
  select case
    when amt >= 200000 then case when roll < 0.5 then 'rtgs' when roll < 0.9 then 'neft' else 'cheque' end
    when amt >= 100000 then case when roll < 0.6 then 'neft' when roll < 0.85 then 'imps' else 'cheque' end
    when roll < 0.35 then 'upi'
    when roll < 0.70 then 'neft'
    when roll < 0.85 then 'imps'
    when roll < 0.95 or amt > 50000 or segment <> 'smb' then 'cheque'
    else 'cash'
  end
$$;

-- Receipt rows before insert: one row per receipt, allocations alongside.
create temp table seed_receipt (
  slice_no int not null,
  -- Stable key the id is hashed from.
  rkey text not null,
  -- Invoice the receipt is filed against (the earliest one it pays).
  inv_g int not null,
  amount numeric(14,2) not null,
  tds numeric(14,2) not null default 0,
  payment_date date not null,
  method text not null,
  -- [{invoice_g, amount}] before ids are resolved.
  alloc jsonb not null,
  plant text,
  plant_group text
) on commit drop;

-- Ordinary, anchor, cash-breach and overpaid receipts: one per invoice, paid
-- in full (an overpayment allocates the total and leaves the excess unapplied).
insert into seed_receipt (slice_no, rkey, inv_g, amount, payment_date, method, alloc, plant)
select
  p.slice_no, p.g || '-1', p.g,
  case when p.plant = 'overpay' then (floor(p.total_amount / 10000) + 1) * 10000 else p.total_amount end,
  p.p1,
  case when p.plant = 'cash_breach' then 'cash' else pg_temp.rail(p.total_amount, p.method_roll, p.segment) end,
  jsonb_build_array(jsonb_build_object('g', p.g, 'amount', p.total_amount)),
  p.plant
from seed_inv_pay p
where not p.disputed and not p.part_payer and p.p1 <= (select a.d from seed_asof a)
  and (p.plant is null or p.plant in ('cash_breach', 'overpay'));

-- TDS short-pay: the customer withholds 2% of the taxable value and pays the
-- rest, so the invoice shows a balance equal to the TDS until a certificate
-- is reconciled.
insert into seed_receipt (slice_no, rkey, inv_g, amount, tds, payment_date, method, alloc, plant)
select p.slice_no, p.g || '-1', p.g, p.total_amount - x.tds, x.tds, p.p1,
       pg_temp.rail(p.total_amount - x.tds, p.method_roll, p.segment),
       jsonb_build_array(jsonb_build_object('g', p.g, 'amount', p.total_amount - x.tds)), 'tds'
from seed_inv_pay p
cross join lateral (select round(p.amount * 0.02, 0) as tds) x
where p.plant = 'tds';

-- Part-payers: first instalment when due, the remainder weeks later, each
-- only if it has arrived by the as-of date.
insert into seed_receipt (slice_no, rkey, inv_g, amount, payment_date, method, alloc)
select p.slice_no, p.g || '-' || s.seq, p.g, s.amt, s.d,
       pg_temp.rail(s.amt, case when s.seq = 1 then p.method_roll else p.lag2_roll end, p.segment),
       jsonb_build_array(jsonb_build_object('g', p.g, 'amount', s.amt))
from seed_inv_pay p
cross join lateral (values
  (1, p.part_amount, p.p1),
  (2, p.total_amount - p.part_amount, p.p1 + 20 + floor(40 * p.lag2_roll)::int)
) as s(seq, amt, d)
where p.part_payer and not p.disputed and s.d <= (select a.d from seed_asof a);

-- Same-day split (decoy) and the ₹1,99,000 cash decoy: two receipts each.
insert into seed_receipt (slice_no, rkey, inv_g, amount, payment_date, method, alloc, plant)
select p.slice_no, p.g || '-' || s.seq, p.g, s.amt, p.p1, s.method,
       jsonb_build_array(jsonb_build_object('g', p.g, 'amount', s.amt)), p.plant
from seed_inv_pay p
cross join lateral (values
  (1, case when p.plant = 'split_decoy' then 100000 else 199000 end::numeric, case when p.plant = 'split_decoy' then 'upi' else 'cash' end),
  (2, p.total_amount - case when p.plant = 'split_decoy' then 100000 else 199000 end, 'neft')
) as s(seq, amt, method)
where p.plant in ('split_decoy', 'cash_decoy');

-- One receipt for three invoices: dated when the last of the three would
-- have been paid, filed against the earliest.
insert into seed_receipt (slice_no, rkey, inv_g, amount, payment_date, method, alloc, plant, plant_group)
select p.slice_no, 'm' || min(p.g), (array_agg(p.g order by p.invoice_date, p.g))[1], sum(p.total_amount), max(p.p1),
       pg_temp.rail(sum(p.total_amount), min(p.method_roll), min(p.segment)),
       jsonb_agg(jsonb_build_object('g', p.g, 'amount', p.total_amount) order by p.invoice_date, p.g), 'multi', p.plant_group
from seed_inv_pay p
where p.plant = 'multi'
group by p.slice_no, p.plant_group;

-- Allocated cash per invoice: the single source of paid_amount.
create temp table seed_inv_paid on commit drop as
select (e ->> 'g')::int as g, sum((e ->> 'amount')::numeric) as paid
from seed_receipt r cross join lateral jsonb_array_elements(r.alloc) as e
group by 1;

-- Invoices.
insert into public.nova_invoices (
  id, invoice_number, client_id, client_name, client_gst_number, items, amount, gst_amount,
  cgst_amount, sgst_amount, igst_amount, intra_state, total_amount, paid_amount, status,
  invoice_date, due_date, created_at, slice_no, business_unit_id, sales_rep_id, discount_amount
)
select
  i.id, t.invoice_number, c.id, c.name, c.gst_number, t.items, t.amount, t.gst_amount,
  -- Seller is in Telangana: a Telangana customer means CGST + SGST, with SGST
  -- taking the odd paisa so the three always sum to gst_amount.
  case when c.state_code = '36' then round(t.gst_amount / 2, 2) else 0 end,
  case when c.state_code = '36' then t.gst_amount - round(t.gst_amount / 2, 2) else 0 end,
  case when c.state_code = '36' then 0 else t.gst_amount end,
  c.state_code = '36',
  t.total_amount, coalesce(pd.paid, 0),
  case when coalesce(pd.paid, 0) = 0 then 'pending' when pd.paid >= t.total_amount then 'paid' else 'partial' end,
  i.invoice_date, i.invoice_date + i.terms_days,
  (i.invoice_date + time '11:00') at time zone 'Asia/Kolkata',
  i.slice_no, i.business_unit_id,
  -- The account owner sells to their own accounts.
  i.owner_id, t.discount
from seed_inv i
join seed_inv_total t on t.g = i.g
join public.nova_clients c on c.id = i.client_id
left join seed_inv_paid pd on pd.g = i.g;

-- Fresh statistics before the receipt joins below.
analyze seed_receipt;
-- Allocations with invoice ids resolved, built once as a set (a per-receipt
-- subquery would rescan the invoices for every receipt), in allocation order.
create temp table seed_receipt_alloc on commit drop as
select r.rkey, jsonb_agg(jsonb_build_object('invoice_id', si.id, 'amount', (e.v ->> 'amount')::numeric) order by e.ord) as allocations
from seed_receipt r
cross join lateral jsonb_array_elements(r.alloc) with ordinality as e(v, ord)
join seed_inv si on si.g = (e.v ->> 'g')::int
group by r.rkey;

-- Payments. Client and slice are copied from the invoice, so a receipt can
-- never name another customer or land in another company's books.
insert into public.nova_payments (
  id, payment_number, invoice_id, client_id, client_name, amount, payment_date, method, reference,
  created_at, slice_no, tds_deducted, allocations
)
select
  x.id,
  'PAY-' || lpad(r.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by r.slice_no order by r.payment_date, r.rkey)::text, 4, '0'),
  inv.id, inv.client_id, inv.client_name, r.amount, r.payment_date, r.method,
  -- The reference reconciliation matches on, shaped per rail; cash has none.
  case r.method
    when 'upi'    then substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 12)
    when 'cheque' then substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 6)
    when 'cash'   then null
    when 'card'   then 'XXXX' || substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 4)
    else (array['HDFC', 'ICIC', 'SBIN', 'UTIB'])[1 + r.slice_no % 4] || upper(left(r.method, 1)) || substr(translate(md5('ref' || x.id), 'abcdef', '012345'), 1, 11)
  end,
  (r.payment_date + time '15:00') at time zone 'Asia/Kolkata',
  r.slice_no, r.tds,
  al.allocations
from seed_receipt r
cross join lateral (select 'pay_' || left(md5('pay' || r.slice_no || '-' || r.rkey), 12) as id) x
join seed_receipt_alloc al on al.rkey = r.rkey
join seed_inv si0 on si0.g = r.inv_g
join public.nova_invoices inv on inv.id = si0.id;

-- A24: the anchor's credit limit sits well below what it now owes, the way a
-- limit set a year ago looks after months of slowing payment.
update public.nova_clients c
set credit_limit = greatest(500000, round(o.owed * 0.6, -5))
from (select client_id, sum(total_amount - paid_amount) as owed from public.nova_invoices group by client_id) o
join seed_client_full cf on cf.id = o.client_id and cf.is_anchor
where c.id = o.client_id;

-- -----------------------------------------------------------------------------
-- Quotations: 75 per slice. Status by position in a 15-slot cycle, so every
-- company has all six lifecycle states (25 converted, 10 accepted, 10 sent,
-- 5 draft, 15 rejected, 10 expired).
-- -----------------------------------------------------------------------------
create temp table seed_quo_draw on commit drop as
select g, g / 75 as slice_no, g % 75 as pos, random() as client_roll, random() as date_roll,
       random() as lines_roll, random() as item_roll, random() as q1, random() as q2, random() as q3
from generate_series(0, 5999) as g;

create temp table seed_quo on commit drop as
select
  q.*, st.status,
  -- Converted quote k points at invoice position 4k + offset: distinct
  -- invoices, and the quote takes that invoice's client (same company).
  case when st.status = 'converted' then (q.pos * 4 + (q.slice_no * 7) % 4) % 300 end as inv_pos,
  'quo_' || left(md5('quo' || q.slice_no || '-' || q.pos), 12) as id
from seed_quo_draw q
cross join lateral (select (array['converted', 'converted', 'converted', 'converted', 'accepted', 'sent', 'sent', 'draft',
  'rejected', 'rejected', 'expired', 'expired', 'converted', 'accepted', 'rejected'])[1 + q.pos % 15] as status) st;

-- Lines for non-converted quotes (converted ones copy the invoice's lines).
create temp table seed_quo_line on commit drop as
select q.g, l.n as line_no, it.id as item_id, it.name, it.hsn_code, qty.qty, it.sale_price as rate, it.gst_rate,
       qty.qty * it.sale_price as amount, round(qty.qty * it.sale_price * it.gst_rate / 100, 2) as gst_amount
from seed_quo q
join seed_client_full cf on cf.slice_no = q.slice_no and cf.r = floor(q.client_roll * 28)::int
join seed_slice sl on sl.slice_no = q.slice_no
cross join lateral generate_series(0, case when q.lines_roll < 0.5 then 0 when q.lines_roll < 0.8 then 1 else 2 end) as l(n)
join seed_item it on it.slice_no = q.slice_no and it.k = (floor(q.item_roll * 30)::int + l.n * 7) % 30
cross join lateral (select greatest(1, round(cf.line_value * sl.rev_scale * (0.4 + 1.2 * (array[q.q1, q.q2, q.q3])[l.n + 1]) / it.sale_price))::int as qty) qty
where q.status <> 'converted';

-- A service line on each open quote, priced like the invoices' (without the
-- tail), so quotes are the same size as the business they turn into.
insert into seed_quo_line
select q.g, 9, null, 'Installation and commissioning', '9987', 1, v.amt, 18, v.amt, round(v.amt * 0.18, 2)
from seed_quo q
join seed_client_full cf on cf.slice_no = q.slice_no and cf.r = floor(q.client_roll * 28)::int
join seed_slice sl on sl.slice_no = q.slice_no
cross join lateral (select round(cf.service_value * sl.rev_scale * (0.5 + q.q3)::numeric, -2) as amt) v
where q.status <> 'converted';

-- Quotations, numbered per company in date order.
insert into public.nova_quotations (
  id, quotation_number, client_id, client_name, items, amount, gst_amount, total_amount, status,
  quotation_date, valid_until, converted_invoice_id, created_at, slice_no, sales_rep_id
)
select
  x.id,
  'QT-' || lpad(x.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by x.slice_no order by x.qdate, x.pos)::text, 4, '0'),
  x.client_id, x.client_name, x.items, x.amount, x.gst_amount, x.amount + x.gst_amount, x.status,
  x.qdate, x.qdate + 30, x.inv_id, (x.qdate + time '10:00') at time zone 'Asia/Kolkata', x.slice_no, x.rep
from (
  select q.id, q.slice_no, q.pos, q.status,
    coalesce(inv.client_id, c.id) as client_id, coalesce(inv.client_name, c.name) as client_name,
    coalesce(inv.items, ql.items) as items, coalesce(inv.amount, ql.amount) as amount, coalesce(inv.gst_amount, ql.gst_amount) as gst_amount,
    inv.id as inv_id, coalesce(inv.sales_rep_id, c.account_owner_id) as rep,
    case q.status
      when 'converted' then inv.invoice_date - (3 + floor(q.date_roll * 10)::int)
      when 'draft' then (select a.d from seed_asof a) - floor(q.date_roll * 7)::int
      when 'sent' then (select a.d from seed_asof a) - floor(q.date_roll * 20)::int
      when 'expired' then (select a.d from seed_asof a) - (45 + floor(q.date_roll * 300)::int)
      else (select a.d from seed_asof a) - floor(q.date_roll * 330)::int
    end as qdate
  from seed_quo q
  left join seed_inv si on q.status = 'converted' and si.slice_no = q.slice_no and si.pos = q.inv_pos
  left join public.nova_invoices inv on inv.id = si.id
  left join seed_client_full cf on q.status <> 'converted' and cf.slice_no = q.slice_no and cf.r = floor(q.client_roll * 28)::int
  left join public.nova_clients c on c.id = cf.id
  left join (select g, jsonb_agg(jsonb_build_object('item_id', item_id, 'description', name, 'hsn_code', hsn_code, 'quantity', qty,
               'rate', rate, 'gst_rate', gst_rate, 'amount', amount, 'gst_amount', gst_amount) order by line_no) as items,
               sum(amount) as amount, sum(gst_amount) as gst_amount
             from seed_quo_line group by g) ql on ql.g = q.g
) x;

-- Line statistics for the delivery-window join below.
analyze seed_inv_line;
-- -----------------------------------------------------------------------------
-- Purchase bills. Stock bills come from a replenishment plan: each supplier
-- delivers all its items every 45–75 days, and each line covers exactly the
-- sales until the next delivery plus a 3–8% buffer. The first delivery
-- lands before the year starts, so stock is on hand before the first sale,
-- and the running balance can never go negative.
-- -----------------------------------------------------------------------------

-- Delivery schedule per supplier role. An A5 duplicate vendor master takes
-- every fourth delivery of its role — which is exactly how a duplicate master
-- hurts: the supplier's history is split across two records.
create temp table seed_order on commit drop as
select
  v.slice_no, v.role, o.k, o.d as received_date,
  lead(o.d) over (partition by v.slice_no, v.role order by o.k) as next_date,
  coalesce(case when o.k % 4 = 3 then dup.id end, v.id) as vendor_id
from seed_vendor v
cross join lateral (select 45 + floor(30 * (('x' || substr(md5('gap' || v.id), 1, 6))::bit(24)::int / 16777216.0))::int as gap) gp
cross join lateral (
  select k, (select a.d from seed_asof a) - 372 + (v.role % 5) + k * gp.gap as d
  from generate_series(0, 9) as k
) o
left join seed_vendor dup on dup.slice_no = v.slice_no and dup.role = v.role and dup.slot >= 18
where v.slot < 12 and o.d <= (select a.d from seed_asof a) - 3;

-- Units sold per item in each delivery window [received_date, next_date),
-- computed as one set join (each sale finds its window by date range).
create temp table seed_window_sales on commit drop as
select o.slice_no, o.role, o.k, l.item_id, sum(l.qty) as sold
from seed_inv_line l
join seed_inv i on i.g = l.g
join seed_item it on it.id = l.item_id
join seed_order o on o.slice_no = it.slice_no and o.role = it.role
  and i.invoice_date >= o.received_date and (o.next_date is null or i.invoice_date < o.next_date)
group by o.slice_no, o.role, o.k, l.item_id;

-- One line per item per delivery: the window's sales plus a buffer.
create temp table seed_order_line on commit drop as
select
  o.slice_no, o.role, o.k, o.vendor_id, o.received_date, it.id as item_id, it.name, it.hsn_code, it.gst_rate,
  -- No flat extra units: on a ₹48,500 laptop a fixed +3 per delivery adds
  -- lakhs of stock nobody sells.
  s.sold + ceil(s.sold * (0.03 + 0.05 * h.f)) as qty,
  -- Cost varies ±3% per delivery around the item's purchase price.
  round(it.purchase_price * (0.97 + 0.06 * h.f), 2) as rate
from seed_order o
join seed_item it on it.slice_no = o.slice_no and it.role = o.role
cross join lateral (select ('x' || substr(md5('ol' || it.id || '-' || o.k), 1, 6))::bit(24)::int / 16777216.0 as f) h
-- Inner join: an item with no sales in the window is simply not reordered.
join seed_window_sales s on s.slice_no = o.slice_no and s.role = o.role and s.k = o.k and s.item_id = it.id;

-- Bill headers before numbering: stock deliveries and scheduled services.
create temp table seed_bill (
  slice_no int not null, bkey text not null, vendor_id text not null, role int not null,
  received_date date not null, bill_date date not null, items jsonb not null,
  amount numeric(14,2) not null, gst_amount numeric(14,2) not null,
  -- Who keyed it: buyers for stock, accounts for services.
  submitted_by text not null
) on commit drop;

-- Stock bills: one per delivery, lines for every item the vendor supplies;
-- the vendor invoices 0–3 days after delivery.
insert into seed_bill
select
  l.slice_no, 's' || l.role || '-' || l.k, l.vendor_id, l.role, l.received_date,
  l.received_date + (l.k * 3 + l.role) % 4,
  jsonb_agg(jsonb_build_object('item_id', l.item_id, 'description', l.name, 'hsn_code', l.hsn_code, 'quantity', l.qty,
    'rate', l.rate, 'gst_rate', l.gst_rate, 'amount', l.qty * l.rate, 'gst_amount', round(l.qty * l.rate * l.gst_rate / 100, 2)) order by l.item_id),
  sum(l.qty * l.rate), sum(round(l.qty * l.rate * l.gst_rate / 100, 2)),
  'emp_' || left(md5('emp' || l.slice_no || '-' || (18 + (l.k + l.role) % 5)), 8)
from seed_order_line l
group by l.slice_no, l.role, l.k, l.vendor_id, l.received_date;

-- Service bills on each contract's schedule. Monthly contracts bill a fixed
-- amount (the warehousing rent is the A1 decoy: identical amounts, different
-- numbers); trips and repairs vary.
insert into seed_bill
select
  v.slice_no, 'v' || v.role || '-' || j, v.id, v.role, x.d, x.d,
  jsonb_build_array(jsonb_build_object('item_id', null, 'description', vr.service_text, 'hsn_code', vr.sac, 'quantity', 1,
    'rate', m.amt, 'gst_rate', vr.gst_rate, 'amount', m.amt, 'gst_amount', round(m.amt * vr.gst_rate / 100, 2))),
  m.amt, round(m.amt * vr.gst_rate / 100, 2),
  'emp_' || left(md5('emp' || v.slice_no || '-' || (12 + j % 6)), 8)
from seed_vendor v
join seed_vendor_role vr on vr.r = v.role
join seed_slice sl on sl.slice_no = v.slice_no
cross join generate_series(0, vr.bills_per_year - 1) as j
-- Evenly through the year, a few days' jitter for per-trip work.
cross join lateral (select (select a.d from seed_asof a) - 360 + floor(j * 360.0 / vr.bills_per_year)::int
  + case when vr.r in (12, 16) then (j * 7 + v.slice_no) % 5 else 0 end as d) x
cross join lateral (select ('x' || substr(md5('sv' || v.id || '-' || j), 1, 6))::bit(24)::int / 16777216.0 as f) h
cross join lateral (select round(vr.base_amount * sl.rev_scale * case
  -- Fixed monthly contracts; facility services alternate two contracts.
  when vr.r in (13, 15, 17) then 1
  when vr.r = 14 then case when j % 2 = 0 then 1 else 0.7 end
  else 0.5 + h.f end, 0) as amt) m
where v.slot < 18 and vr.is_service and x.d <= (select a.d from seed_asof a) - 1;

-- Statistics for the numbering and plant joins that follow.
analyze seed_bill;

-- Numbered bills with payment state. bill_number is the VENDOR's invoice
-- number, in the vendor's own style: initials / Indian financial year /
-- running number (it restarts each April, as GST invoice series do).
create temp table seed_bill_num on commit drop as
select
  b.*, v.name as vendor_name, v.state_code, v.registered, v.role as vendor_role,
  ini.code || '/' || fy.label || '/'
    || lpad((10 + floor(400 * (('x' || substr(md5('seq' || b.vendor_id), 1, 6))::bit(24)::int / 16777216.0))::int
             + row_number() over (partition by b.vendor_id, fy.label order by b.bill_date, b.bkey))::text, 4, '0') as bill_number,
  vr.terms_days,
  -- Two stable fractions: when it gets paid, and how its approval stands.
  ('x' || substr(md5('bp' || b.slice_no || b.bkey), 1, 6))::bit(24)::int / 16777216.0 as f1,
  ('x' || substr(md5('ba' || b.slice_no || b.bkey), 1, 6))::bit(24)::int / 16777216.0 as f2,
  'bil_' || left(md5('bil' || b.slice_no || '-' || b.bkey), 12) as id
from seed_bill b
join seed_vendor v on v.id = b.vendor_id
join seed_vendor_role vr on vr.r = v.role
-- Initials of the first three words of the vendor's name.
cross join lateral (select upper(string_agg(left(w, 1), '' order by o)) as code
  from regexp_split_to_table(v.name, ' ') with ordinality as t(w, o) where o <= 3 and w ~ '^[A-Za-z]') ini
-- April–March financial year label, e.g. 25-26.
cross join lateral (select case when extract(month from b.bill_date) >= 4
  then to_char(b.bill_date, 'YY') || '-' || to_char(b.bill_date + interval '1 year', 'YY')
  else to_char(b.bill_date - interval '1 year', 'YY') || '-' || to_char(b.bill_date, 'YY') end as label) fy;

-- A1: six bills per slice (at least a month old, so a re-keyed copy is
-- plausible) get a second entry. Ranks 1–3: exact copies. Rank 4: the number
-- re-keyed with hyphens. Rank 5: same number, dated two days later. Rank 6:
-- separators dropped and a ₹1 round-off line added.
create temp table seed_bill_dup on commit drop as
select b.*, x.rk::int as rk
from seed_bill_num b
join (select id, row_number() over (partition by slice_no order by md5('a1' || id)) as rk
      from seed_bill_num where bill_date <= (select a.d from seed_asof a) - 30) x on x.id = b.id
where x.rk <= 6;

-- All bill rows: originals plus the duplicates, which are unpaid (entered
-- again, awaiting payment) and carry their own id and entry date.
create temp table seed_bill_all on commit drop as
select b.id, b.slice_no, b.vendor_id, b.vendor_name, b.state_code, b.registered, b.vendor_role, b.bill_number,
       b.bill_date, b.received_date, b.items, b.amount, b.gst_amount, b.terms_days, b.f1, b.f2, b.submitted_by,
       null::int as dup_rk, null::text as dup_of, b.bill_date + (b.bkey ~ '^s')::int * 2 as entered
from seed_bill_num b
union all
select 'bil_' || left(md5('bil' || d.slice_no || '-dup' || d.rk), 12), d.slice_no, d.vendor_id, d.vendor_name, d.state_code,
       d.registered, d.vendor_role,
       case d.rk when 4 then replace(d.bill_number, '/', '-') when 6 then replace(d.bill_number, '/', '') else d.bill_number end,
       d.bill_date + case when d.rk = 5 then 2 else 0 end, d.received_date,
       case when d.rk = 6 then d.items || jsonb_build_array(jsonb_build_object('item_id', null, 'description', 'Round off',
         'hsn_code', null, 'quantity', 1, 'rate', 1, 'gst_rate', 0, 'amount', 1, 'gst_amount', 0)) else d.items end,
       d.amount + case when d.rk = 6 then 1 else 0 end, d.gst_amount, d.terms_days, 0.99, 0.9,
       -- Keyed by a different clerk from the original.
       'emp_' || left(md5('emp' || d.slice_no || '-' || (12 + d.rk % 6)), 8),
       d.rk, d.id, d.bill_date + 6 + d.rk * 3
from seed_bill_dup d;

-- Bills. Paid if the vendor's terms (with some slack either way) have run
-- out by the as-of date; a few unpaid ones are part-paid.
insert into public.nova_purchase_bills (
  id, bill_number, vendor_id, vendor_name, vendor_gst_number, items, amount, gst_amount, cgst_amount, sgst_amount,
  igst_amount, total_amount, paid_amount, status, bill_date, due_date, reverse_charge, itc_eligible, created_at, slice_no,
  submitted_by, approval_status, received_date
)
select
  b.id, b.bill_number, b.vendor_id, b.vendor_name, v.gst_number, b.items, b.amount, b.gst_amount,
  -- Split by the VENDOR's state (now carried on nova_vendors).
  case when b.state_code = '36' then round(b.gst_amount / 2, 2) else 0 end,
  case when b.state_code = '36' then b.gst_amount - round(b.gst_amount / 2, 2) else 0 end,
  case when b.state_code = '36' then 0 else b.gst_amount end,
  b.amount + b.gst_amount,
  case st.status when 'paid' then b.amount + b.gst_amount
                 when 'partial' then round((b.amount + b.gst_amount) * (0.3 + 0.4 * b.f2)::numeric, 2) else 0 end,
  st.status, b.bill_date, b.bill_date + b.terms_days,
  -- Goods transport from an unregistered operator: reverse charge.
  not b.registered and b.vendor_role = 12,
  -- Canteen services: ITC blocked under s.17(5).
  b.vendor_role <> 15,
  (b.entered + time '12:00') at time zone 'Asia/Kolkata',
  b.slice_no, b.submitted_by,
  case when st.status <> 'pending' then 'approved'
       when b.dup_rk is null and b.bill_date > (select a.d from seed_asof a) - 7 and b.f2 > 0.5 then 'pending'
       when b.dup_rk is null and b.f2 < 0.03 then 'rejected'
       else 'approved' end,
  b.received_date
from seed_bill_all b
join public.nova_vendors v on v.id = b.vendor_id
cross join lateral (select case
  when b.dup_rk is not null then 'pending'
  when b.bill_date + floor(b.terms_days * (0.6 + 0.6 * b.f1))::int <= (select a.d from seed_asof a) then 'paid'
  when b.f2 < 0.15 then 'partial'
  else 'pending' end as status) st;

-- -----------------------------------------------------------------------------
-- Stock movements, derived from the documents: purchases are stock-bill lines
-- on their received date, sales are invoice lines on the invoice date, and a
-- few adjustments are stock counts. Built before inventory so
-- quantity_on_hand can be inserted as the ledger's sum.
-- -----------------------------------------------------------------------------
create temp table seed_mov (
  slice_no int not null, mkey text not null, item_id text not null, movement_type text not null,
  quantity numeric(14,3) not null, reference text, movement_date date not null, unit_cost numeric(14,2) not null
) on commit drop;

-- Purchases: one per stock-bill line, referencing the vendor's bill number.
insert into seed_mov
select l.slice_no, 'p' || l.role || '-' || l.k || '-' || l.item_id, l.item_id, 'purchase', l.qty, b.bill_number, l.received_date, l.rate
from seed_order_line l
join seed_bill_num b on b.slice_no = l.slice_no and b.bkey = 's' || l.role || '-' || l.k;

-- Sales: one per invoice stock line, on the invoice date, at standard cost.
insert into seed_mov
select l.slice_no, 's' || l.g || '-' || l.line_no, l.item_id, 'sale', -l.qty, t.invoice_number, i.invoice_date, it.purchase_price
from seed_inv_line l
join seed_inv i on i.g = l.g
join seed_inv_total t on t.g = l.g
join seed_item it on it.id = l.item_id
where l.item_id is not null;

-- Write-offs: at the third delivery, half of that delivery's buffer is found
-- damaged. Only buffer is written off, so the delivery still covers every
-- sale in its window and stock stays non-negative.
insert into seed_mov
select l.slice_no, 'a' || l.item_id || '-' || l.k, l.item_id, 'adjustment', -floor((l.qty - coalesce(s.sold, 0)) / 2),
       'Damaged stock written off', l.received_date, it.purchase_price
from seed_order_line l
join seed_item it on it.id = l.item_id
left join seed_window_sales s on s.slice_no = l.slice_no and s.role = l.role and s.k = l.k and s.item_id = l.item_id
where l.k = 2 and floor((l.qty - coalesce(s.sold, 0)) / 2) >= 1;

-- Count gains on two in five items, ten days after the fifth delivery.
insert into seed_mov
select l.slice_no, 'g' || l.item_id, l.item_id, 'adjustment', 1 + floor(5 * it.h)::int,
       'Stock count gain', l.received_date + 10, it.purchase_price
from seed_order_line l
join seed_item it on it.id = l.item_id
where l.k = 4 and it.h < 0.4 and l.received_date + 10 <= (select a.d from seed_asof a);

-- Inventory: on-hand = the ledger's sum by construction. Reorder level is
-- 0.2–0.8 months of the item's own average sales (closing stock is the
-- accumulated delivery buffers, about 0.6–0.9 months), so which items sit below it
-- varies naturally instead of following a fixed pattern.
insert into public.nova_inventory (
  id, sku, name, hsn_code, unit, sale_price, purchase_price, gst_rate, quantity_on_hand, reorder_level, created_at,
  slice_no, primary_vendor_id, lead_time_days, single_source
)
select
  it.id,
  'ACZ-' || it.hsn_code || '-' || lpad(it.slice_no::text, 2, '0') || lpad(it.b::text, 2, '0'),
  it.name, it.hsn_code, it.unit, it.sale_price, it.purchase_price, it.gst_rate,
  q.qoh,
  round(coalesce(q.sold, 0) / 12.0 * (0.2 + 0.6 * h2.f), 0),
  ((select a.d from seed_asof a) - 500)::timestamptz,
  it.slice_no, it.vendor_id,
  3 + floor(27 * it.h)::int,
  -- One in five items has no alternative supplier.
  h2.g < 0.2
from seed_item it
join (select item_id, sum(quantity) as qoh, -sum(quantity) filter (where movement_type = 'sale') as sold from seed_mov group by item_id) q
  on q.item_id = it.id
cross join lateral (select
  ('x' || substr(md5('ro' || it.id), 1, 6))::bit(24)::int / 16777216.0 as f,
  ('x' || substr(md5('ss' || it.id), 1, 6))::bit(24)::int / 16777216.0 as g) h2;

-- The ledger. Warehouse is the item's home location.
insert into public.nova_stock_movements (id, item_id, movement_type, quantity, reference, movement_date, created_at, slice_no, warehouse, unit_cost)
select
  'mov_' || left(md5('mov' || m.slice_no || '-' || m.mkey), 12),
  m.item_id, m.movement_type, m.quantity, m.reference, m.movement_date,
  (m.movement_date + time '09:30') at time zone 'Asia/Kolkata',
  inv.slice_no, it.warehouse, m.unit_cost
from seed_mov m
join public.nova_inventory inv on inv.id = m.item_id
join seed_item it on it.id = m.item_id;

-- -----------------------------------------------------------------------------
-- Expenses: 300 per slice = 96 recurring (rents, subscriptions, utilities, the
-- CA retainer) + 204 one-off. No 'salaries' rows: payroll is aggregated per
-- department per month in 008, and booking it here as well would double it.
-- -----------------------------------------------------------------------------
create temp table seed_exp_draw on commit drop as
select g, g / 204 as slice_no, g % 204 as pos, random() as cat_roll, random() as amt_roll, random() as emp_roll,
       random() as client_roll, random() as method_roll, random() as date_roll, random() as payee_roll
from generate_series(0, 16319) as g;

create temp table seed_exp (
  slice_no int not null, ekey text not null, category text not null, vendor_name text, description text,
  amount numeric(14,2) not null, gst_rate numeric not null, tds_rate numeric(5,2) not null, method text not null,
  expense_date date not null, emp_pos int not null, bu_k int, client_r int, recurring boolean not null
) on commit drop;

-- Recurring: fixed schedules, one row per month per contract.
insert into seed_exp
select s.slice_no, 'r' || c.k || '-' || m, c.category, c.payee, c.descr,
       round(c.base * s.rev_scale * case when c.k = 5 then 0.8 + 0.4 * (('x' || substr(md5('el' || s.slice_no || '-' || m), 1, 6))::bit(24)::int / 16777216.0) else 1 end, 0),
       c.gst, c.tds, c.method,
       (select a.d from seed_asof a) - 355 + m * 30 + c.k, 12 + (m + c.k) % 6, c.bu_k, null, true
from seed_slice s
cross join (values
  -- k, category, payee, description, base ₹/month, GST %, TDS %, rail, unit
  (0, 'rent', 'Banjara Estates LLP', 'Head office rent', 120000, 18, 10, 'neft', 0),
  (1, 'rent', 'Sree Lakshmi Properties', 'Branch premises rent', 45000, 18, 10, 'neft', 1),
  (2, 'software', 'CloudStack Software Pvt Ltd', 'Accounting software subscription', 18000, 18, 0, 'card', 0),
  (3, 'software', 'Zenith SaaS Solutions', 'CRM subscription', 9500, 18, 0, 'card', 2),
  (4, 'software', 'CodeForge Tools', 'Warehouse management system licence', 32000, 18, 0, 'neft', 1),
  (5, 'utilities', 'City Power Distribution', 'Electricity charges', 38000, 0, 0, 'neft', 0),
  (6, 'utilities', 'FiberNet Broadband', 'Internet leased line', 6500, 18, 0, 'neft', 0),
  (7, 'professional_fees', 'Rao and Associates Chartered Accountants', 'Monthly accounting retainer', 50000, 18, 10, 'neft', 0)
) as c(k, category, payee, descr, base, gst, tds, method, bu_k)
cross join generate_series(0, 11) as m;

-- One-off spend. Category weights: travel 7, meals 4, office 3, marketing 2,
-- fees 1, other 3 (out of 20). Loss-making companies overspend on travel and
-- marketing.
insert into seed_exp
select d.slice_no, 'o' || d.pos, c.category,
  (case c.category
    when 'travel' then array['Skyline Travels', 'Metro Cabs Hyderabad', 'Redline Tours and Travels']
    when 'meals' then array['Hyderabad House Caterers', 'Spice Route Kitchen', 'Cafe Nirvana']
    when 'office_supplies' then array['Office Mart', 'Supreme Stationers', 'Paper Point']
    when 'marketing' then array['Pixel Bloom Digital', 'Deccan Print Media', 'Brandwave Events']
    when 'professional_fees' then array['Menon Legal LLP', 'Iyer Tax Consultants', 'Kamath Valuers']
    else array['Speedpost Couriers', 'Bank charges', 'Local hardware store'] end)[1 + floor(d.payee_roll * 3)::int],
  case c.category when 'travel' then 'Client visit travel' when 'meals' then 'Team and client meals'
    when 'office_supplies' then 'Office supplies purchase' when 'marketing' then 'Marketing campaign'
    when 'professional_fees' then 'Legal and advisory services' else 'Miscellaneous expense' end,
  round(sl.rev_scale * case c.category when 'travel' then 12000 when 'meals' then 3000 when 'office_supplies' then 6000
    when 'marketing' then 60000 when 'professional_fees' then 75000 else 3500 end
    * (0.3 + 1.4 * d.amt_roll)::numeric * case when sl.loss_maker and c.category in ('travel', 'marketing') then 1.6 else 1 end, 0),
  case c.category when 'travel' then 5 when 'meals' then 5 when 'other' then 0 else 18 end,
  case c.category when 'professional_fees' then 10 when 'marketing' then 2 else 0 end,
  case c.category
    when 'travel' then (array['card', 'upi', 'neft'])[1 + floor(d.method_roll * 3)::int]
    when 'meals' then (array['upi', 'card', 'cash'])[1 + floor(d.method_roll * 3)::int]
    when 'office_supplies' then (array['upi', 'cash', 'card'])[1 + floor(d.method_roll * 3)::int]
    when 'other' then (array['cash', 'upi'])[1 + floor(d.method_roll * 2)::int]
    else 'neft' end,
  (select a.d from seed_asof a) - floor(d.date_roll * 364)::int,
  -- Sales staff travel and entertain; the sales head runs campaigns; accounts
  -- book the rest.
  case when c.category in ('travel', 'meals') then 1 + floor(d.emp_roll * 11)::int
       when c.category = 'marketing' then floor(d.emp_roll * 2)::int
       else 12 + floor(d.emp_roll * 6)::int end,
  null,
  -- Four in ten trips and meals are for a specific customer.
  case when c.category in ('travel', 'meals') and d.client_roll < 0.4 then floor(d.client_roll / 0.4 * 28)::int end,
  false
from seed_exp_draw d
join seed_slice sl on sl.slice_no = d.slice_no
cross join lateral (select (array['travel', 'travel', 'travel', 'travel', 'travel', 'travel', 'travel', 'meals', 'meals', 'meals', 'meals',
  'office_supplies', 'office_supplies', 'office_supplies', 'marketing', 'marketing', 'professional_fees', 'other', 'other', 'other'])[1 + floor(d.cat_roll * 20)::int] as category) c;

-- s.40A(3): a cash payment above ₹10,000 is disallowed, so ordinary cash
-- spend stays at or under it; anything larger moves to UPI.
update seed_exp set method = 'upi' where method = 'cash' and amount + round(amount * gst_rate / 100, 2) > 10000;

-- Plant slot for the two A28 expense cases.
alter table seed_exp add column plant text;

-- A28: three to five one-off expenses per slice paid in cash above ₹10,000.
update seed_exp e set method = 'cash', plant = 'cash_breach',
  amount = greatest(e.amount, round(12000 + 30000 * (('x' || substr(md5('a28e' || e.slice_no || e.ekey), 1, 6))::bit(24)::int / 16777216.0), 0))
from (select slice_no, ekey, row_number() over (partition by slice_no order by md5('a28x' || slice_no || ekey)) as rn
      from seed_exp where not recurring and category in ('office_supplies', 'other', 'travel', 'meals')) x
where e.slice_no = x.slice_no and e.ekey = x.ekey and x.rn <= 3 + x.slice_no % 3;

-- A28 decoy: exactly ₹10,000 in cash, which the section allows (the bar is
-- "exceeds ₹10,000").
update seed_exp e set method = 'cash', plant = 'cash_decoy', category = 'other', amount = 10000, gst_rate = 0, tds_rate = 0,
  description = 'Miscellaneous expense', vendor_name = 'Local hardware store'
from (select slice_no, ekey, row_number() over (partition by slice_no order by md5('a28y' || slice_no || ekey)) as rn
      from seed_exp where not recurring and plant is null and category in ('office_supplies', 'other')) x
where e.slice_no = x.slice_no and e.ekey = x.ekey and x.rn = 1;

-- Expenses, numbered per company in date order. Department and unit follow
-- the employee who incurred the cost (a rent row follows its premises).
insert into public.nova_expenses (
  id, expense_number, category, vendor_name, description, amount, gst_amount, total_amount, tds_rate, tds_amount,
  payment_method, expense_date, created_at, slice_no, employee_id, department_id, business_unit_id, client_id, recurring
)
select
  'exp_' || left(md5('exp' || e.slice_no || '-' || e.ekey), 12),
  'EXP-' || lpad(e.slice_no::text, 2, '0') || '-' || lpad(row_number() over (partition by e.slice_no order by e.expense_date, e.ekey)::text, 4, '0'),
  e.category, e.vendor_name, e.description, e.amount, g.gst, e.amount + g.gst, e.tds_rate, round(e.amount * e.tds_rate / 100, 2),
  e.method, e.expense_date, (e.expense_date + time '16:00') at time zone 'Asia/Kolkata', e.slice_no,
  'emp_' || left(md5('emp' || e.slice_no || '-' || e.emp_pos), 8),
  'dep_' || left(md5('dep' || e.slice_no || '-' || case when e.emp_pos < 12 then 0 else 1 end), 8),
  -- Sales sits in product line 2, accounts at head office (005's layout).
  'bu_' || left(md5('bu' || e.slice_no || '-' || coalesce(e.bu_k, case when e.emp_pos < 12 then 2 else 0 end)), 8),
  case when e.client_r is not null then 'cli_' || left(md5('cli' || e.slice_no || '-' || e.client_r), 12) end,
  e.recurring
from seed_exp e
cross join lateral (select round(e.amount * e.gst_rate / 100, 2) as gst) g;

-- -----------------------------------------------------------------------------
-- Answer key (admin only, never reachable from the team API).
-- -----------------------------------------------------------------------------

-- A1: each duplicate with the bill it copies.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select b.slice_no, 'A1', 'purchase-bills', array[b.dup_of, b.id], 'A1-' || b.slice_no || '-' || b.dup_rk,
  case when b.dup_rk <= 3 then 'easy' when b.dup_rk = 6 then 'hard' else 'medium' end, false,
  case when b.dup_rk <= 3 then 'Exact duplicate: same vendor, bill number, date and amount entered twice.'
       when b.dup_rk = 4 then 'Near duplicate: bill number re-keyed with hyphens instead of slashes.'
       when b.dup_rk = 5 then 'Near duplicate: same bill number and amount, dated two days later.'
       else 'Near duplicate: separators dropped from the bill number and a Rs 1 round-off line added.' end
from seed_bill_all b where b.dup_rk is not null;

-- A1 decoy: the fixed monthly warehouse rent.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select slice_no, 'A1', 'purchase-bills', (array_agg(id order by bill_date))[1:3], 'A1-' || slice_no || '-decoy', 'medium', true,
  'Monthly warehouse rent at a fixed contract amount: identical amounts, but different bill numbers and months. Not duplicates.'
from seed_bill_num where vendor_role = 13 group by slice_no;

-- A5: duplicate vendor and client masters, and the same-PAN decoy.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select d.slice_no, 'A5', 'vendors', array[o.id, d.id], 'A5-' || d.slice_no || '-v' || d.slot, 'medium', false,
  'Duplicate vendor master: same PAN and GSTIN, name keyed differently; deliveries are split between the two records.'
from seed_vendor d join seed_vendor o on o.slice_no = d.slice_no and o.role = d.role and o.slot < 12
where d.slot >= 18
union all
select d.slice_no, 'A5', 'clients', array[o.id, d.id], 'A5-' || d.slice_no || '-c' || d.r, 'medium', false,
  'Duplicate customer master: same PAN and GSTIN, name keyed differently; invoices are split between the two records.'
from seed_client d join seed_client o on o.slice_no = d.slice_no and o.pool_rk = d.pool_rk - 100
where d.r >= 28
union all
select d.slice_no, 'A5', 'clients', array[o.id, d.id], 'A5-' || d.slice_no || '-decoy', 'hard', true,
  'Same PAN, but a separate GST registration in another state: a legitimate second master, not a duplicate.'
from seed_client d join seed_client o on o.slice_no = d.slice_no and o.ent_rk = 3
where d.r = 26;

-- A6: the four broken identifiers, and the unregistered-customer decoy.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select slice_no, 'A6', 'clients', array[id], 'A6-' || slice_no || '-checksum', 'medium', false,
  'GSTIN check character is wrong (mod-36 checksum fails).' from seed_client where pool_rk = 3
union all
select slice_no, 'A6', 'clients', array[id], 'A6-' || slice_no || '-state', 'easy', false,
  'GSTIN state code does not match the customer''s state_code.' from seed_client where pool_rk = 4
union all
select slice_no, 'A6', 'vendors', array[id], 'A6-' || slice_no || '-pan', 'medium', false,
  'PAN field does not match the PAN embedded in the GSTIN (characters 3-12).' from seed_vendor where rk = 3 and slot < 12
union all
select slice_no, 'A6', 'vendors', array[id], 'A6-' || slice_no || '-ifsc', 'easy', false,
  'Malformed IFSC: letter O in the fifth position, where RBI requires the digit zero.' from seed_vendor where rk = 4 and slot < 12
union all
select slice_no, 'A6', 'clients', array[id], 'A6-' || slice_no || '-decoy', 'easy', true,
  'No GSTIN because the customer is unregistered: valid, not an invalid identifier.' from seed_client where r = 25;

-- A14 and A28 receipts: payment ids come from the same hash as the insert.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select r.slice_no,
  case when r.plant in ('cash_breach', 'cash_decoy') then 'A28' else 'A14' end,
  'payments',
  array_agg(distinct 'pay_' || left(md5('pay' || r.slice_no || '-' || r.rkey), 12))
    || array_agg(distinct si.id),
  'A' || case when r.plant in ('cash_breach', 'cash_decoy') then '28' else '14' end || '-' || r.slice_no || '-' || r.plant || '-' || min(r.inv_g),
  case r.plant when 'overpay' then 'easy' when 'cash_breach' then 'easy' when 'multi' then 'hard' else 'medium' end,
  r.plant in ('split_decoy', 'cash_decoy'),
  case r.plant
    when 'multi' then 'One receipt settles three invoices of the same customer; allocations list all three.'
    when 'tds' then 'Customer withheld 2% TDS on the taxable value; the open balance equals tds_deducted and clears only against a TDS certificate.'
    when 'overpay' then 'Receipt rounded up to the next Rs 10,000; the excess over the invoice sits unapplied on the customer account.'
    when 'split_decoy' then 'Two receipts on the same day (UPI and NEFT) that together match the invoice exactly. Fully reconciled.'
    when 'cash_breach' then 'Cash receipt of Rs 2 lakh or more from one person for one transaction: prohibited by s.269ST of the Income-tax Act.'
    else 'Rs 1,99,000 in cash plus NEFT for the balance: the cash part is under the s.269ST limit, so lawful.'
  end
from seed_receipt r
cross join lateral jsonb_array_elements(r.alloc) as e(v)
join seed_inv si on si.g = (e.v ->> 'g')::int
where r.plant is not null
group by r.slice_no, r.plant, case when r.plant in ('multi', 'split_decoy', 'cash_decoy') then r.inv_g::text || coalesce(r.plant_group, '') else r.rkey end;

-- A24: the anchor customer, and the new large customer that pays on time.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select slice_no, 'A24', 'clients', array[id], 'A24-' || slice_no || case when is_anchor then '' else '-decoy' end, 'medium', not is_anchor,
  case when is_anchor
    then 'Largest receivable (25%+ of open AR): days-to-pay lengthens about a week every month and the balance exceeds the credit limit.'
    else 'New large customer (first invoice in the last five months) with a big share of sales, paying within terms. Concentration, not deterioration.' end
from seed_client_full where is_anchor or is_new_large;

-- A28 expenses: cash payments above Rs 10,000, and the exactly-Rs-10,000 decoy.
insert into public.nova_ground_truth (slice_no, anomaly_code, resource, record_ids, group_id, difficulty, is_decoy, note)
select slice_no, 'A28', 'expenses', array['exp_' || left(md5('exp' || slice_no || '-' || ekey), 12)],
  'A28-' || slice_no || '-exp-' || ekey, 'easy', plant = 'cash_decoy',
  case when plant = 'cash_breach'
    then 'Expense paid in cash above Rs 10,000 in a day to one payee: disallowed under s.40A(3) of the Income-tax Act.'
    else 'Cash payment of exactly Rs 10,000: s.40A(3) applies only above Rs 10,000, so this is allowed.' end
from seed_exp where plant is not null;

-- Publish the slice count (upsert: the auth function reads this row on every
-- request, so it must never be missing). as_of_date stays as 005 froze it.
insert into public.nova_dataset_meta (id, slice_count, seeded_at)
values (true, 80, now())
on conflict (id) do update set slice_count = excluded.slice_count, seeded_at = excluded.seeded_at;

-- Temp tables drop here; the pg_temp helper functions end with the session.
commit;
