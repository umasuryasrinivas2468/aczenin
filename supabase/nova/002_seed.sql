-- =============================================================================
-- Nova API — deterministic dummy dataset. Run after 001_schema.sql, in the
-- same Nova Supabase project's SQL editor.
-- Design: docs/nova-api-architecture.md §4.3 (shared read-only dataset).
--
-- Deterministic: setseed() pins the random() stream, and every random draw
-- happens in a statement whose row order is fixed (a plain scan of
-- generate_series or of a temp table), so a rerun produces the same ids,
-- amounts and statuses. Dates are offsets from current_date on purpose: the
-- data keeps "the last 12 months" shape whenever it is loaded, and 'overdue'
-- keeps ageing through the views without a job.
--
-- Re-runnable: the nine business tables are truncated first, so a rerun
-- replaces the dataset instead of colliding on primary keys.
--
-- Pattern used throughout: "draw, then derive". A *_draw temp table holds only
-- raw random() rolls; later statements join and compute from those rolls with
-- no further random() calls. Joins may reorder rows between Postgres versions
-- or plans, so keeping random() out of any statement with a join is what makes
-- the stream reproducible.
--
-- GST slabs: only 0 / 5 / 18 are used. The 12% and 28% slabs were folded into
-- 5% and 18% by the GST rate rationalisation effective 22 Sep 2025, and every
-- date here falls after it, so a 12% line would be an anachronism.
-- =============================================================================

-- One transaction: a failure halfway rolls the truncate back too, so the
-- project is never left with an empty or half-seeded dataset.
begin;

-- Pins random() so reruns draw the identical sequence (the whole point of a
-- shared fixture integrators write assertions against).
select setseed(0.42);

-- Parallel workers each consume random() in a timing-dependent order, which
-- would break determinism; local = reverts at commit, touching nothing else.
set local max_parallel_workers_per_gather = 0;

-- Wipe only the business tables. Restart identity is harmless here (text ids)
-- but future-proofs a serial column; cascade covers the FKs between the nine.
-- Platform tables (allowlist, keys, usage, sessions) are deliberately absent:
-- reseeding must never sign anyone out or revoke a key.
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
-- Reference data — hand-written, because realistic names and state/code pairs
-- cannot be generated convincingly.
-- -----------------------------------------------------------------------------

-- Customers. ~Third in Telangana (36) so both CGST+SGST and IGST invoices are
-- common; three unregistered (registered = false) to exercise a null GSTIN.
create temp table seed_client on commit drop as
select
  -- n is the join key every later draw picks a client by.
  c.n,
  -- md5 of a fixed salt gives a stable, random-looking id that survives reruns.
  'cli_' || substr(md5('cli' || c.n), 1, 8) as id,
  c.name, c.city, c.state, c.state_code, c.registered
from (values
  (1,  'Sharma Textiles Pvt Ltd',            'Hyderabad',      'Telangana',      '36', true),
  (2,  'Deccan Agro Foods Pvt Ltd',          'Hyderabad',      'Telangana',      '36', true),
  (3,  'Kakatiya Steel Traders',             'Warangal',       'Telangana',      '36', true),
  (4,  'Golconda Pharma Distributors LLP',   'Hyderabad',      'Telangana',      '36', true),
  (5,  'Charminar Electricals',              'Secunderabad',   'Telangana',      '36', true),
  (6,  'Nizam Hospitality Services Pvt Ltd', 'Hyderabad',      'Telangana',      '36', true),
  (7,  'Karimnagar Granite Exports',         'Karimnagar',     'Telangana',      '36', true),
  (8,  'Hitech City Infosolutions Pvt Ltd',  'Hyderabad',      'Telangana',      '36', true),
  (9,  'Musi Valley Packaging',              'Nalgonda',       'Telangana',      '36', true),
  (10, 'Bhagyanagar Auto Parts',             'Hyderabad',      'Telangana',      '36', true),
  (11, 'Srinivasa Hardware Mart',            'Khammam',        'Telangana',      '36', true),
  (12, 'Reddy & Sons Retail',                'Hyderabad',      'Telangana',      '36', false),
  (13, 'Telangana Poultry Feeds Pvt Ltd',    'Siddipet',       'Telangana',      '36', true),
  (14, 'Lakshmi Printers',                   'Hyderabad',      'Telangana',      '36', true),
  (15, 'Vizag Marine Supplies Pvt Ltd',      'Visakhapatnam',  'Andhra Pradesh', '37', true),
  (16, 'Godavari Rice Mills',                'Rajahmundry',    'Andhra Pradesh', '37', true),
  (17, 'Amaravati Constructions Pvt Ltd',    'Vijayawada',     'Andhra Pradesh', '37', true),
  (18, 'Bengaluru Cloudworks Pvt Ltd',       'Bengaluru',      'Karnataka',      '29', true),
  (19, 'Mysore Silk Emporium',               'Mysuru',         'Karnataka',      '29', true),
  (20, 'Mangalore Cashew Industries',        'Mangaluru',      'Karnataka',      '29', true),
  (21, 'Patil Engineering Works',            'Pune',           'Maharashtra',    '27', true),
  (22, 'Mumbai Freight Forwarders Pvt Ltd',  'Mumbai',         'Maharashtra',    '27', true),
  (23, 'Nagpur Orange Exports',              'Nagpur',         'Maharashtra',    '27', true),
  (24, 'Deshmukh Pharmaceuticals Ltd',       'Mumbai',         'Maharashtra',    '27', true),
  (25, 'Chennai Auto Components Pvt Ltd',    'Chennai',        'Tamil Nadu',     '33', true),
  (26, 'Coimbatore Spinning Mills Ltd',      'Coimbatore',     'Tamil Nadu',     '33', true),
  (27, 'Madurai Handlooms',                  'Madurai',        'Tamil Nadu',     '33', false),
  (28, 'Gupta Trading Company',              'New Delhi',      'Delhi',          '07', true),
  (29, 'Capital Office Solutions Pvt Ltd',   'New Delhi',      'Delhi',          '07', true),
  (30, 'Patel Chemicals Pvt Ltd',            'Ahmedabad',      'Gujarat',        '24', true),
  (31, 'Surat Diamond Tools',                'Surat',          'Gujarat',        '24', true),
  (32, 'Kolkata Jute Products Ltd',          'Kolkata',        'West Bengal',    '19', true),
  (33, 'Banerjee Tea Traders',               'Siliguri',       'West Bengal',    '19', true),
  (34, 'Agarwal Brass Works',                'Moradabad',      'Uttar Pradesh',  '09', true),
  (35, 'Lucknow Chikan Crafts',              'Lucknow',        'Uttar Pradesh',  '09', false),
  (36, 'Kochi Spice Traders',                'Kochi',          'Kerala',         '32', true),
  (37, 'Jaipur Marble House',                'Jaipur',         'Rajasthan',      '08', true),
  (38, 'Gurugram Logistics Pvt Ltd',         'Gurugram',       'Haryana',        '06', true),
  (39, 'Ludhiana Hosiery Works',             'Ludhiana',       'Punjab',         '03', true),
  (40, 'Kalinga Minerals Pvt Ltd',           'Bhubaneswar',    'Odisha',         '21', true)
) as c(n, name, city, state, state_code, registered);

-- Suppliers. vendor 5 (caterer) and 20 (road transport) are unregistered on
-- purpose: they drive the blocked-ITC and reverse-charge cases below.
create temp table seed_vendor on commit drop as
select
  -- n is the key bill draws pick a vendor by.
  v.n,
  -- Same stable-id scheme as clients, different salt so ids never collide.
  'ven_' || substr(md5('ven' || v.n), 1, 8) as id,
  -- state_code is kept here because nova_vendors has no such column, yet a
  -- bill's CGST/SGST vs IGST split still depends on it.
  v.name, v.city, v.state, v.state_code, v.registered
from (values
  (1,  'Hyderabad Paper Mills Pvt Ltd',        'Hyderabad',    'Telangana',      '36', true),
  (2,  'Balaji Stationery Suppliers',          'Hyderabad',    'Telangana',      '36', true),
  (3,  'Sai Krishna Logistics',                'Secunderabad', 'Telangana',      '36', true),
  (4,  'Telangana Power Solutions Pvt Ltd',    'Hyderabad',    'Telangana',      '36', true),
  (5,  'Annapurna Caterers',                   'Hyderabad',    'Telangana',      '36', false),
  (6,  'Venkateswara Steel Pvt Ltd',           'Hyderabad',    'Telangana',      '36', true),
  (7,  'Andhra Cement Traders',                'Vijayawada',   'Andhra Pradesh', '37', true),
  (8,  'Guntur Chilli Merchants',              'Guntur',       'Andhra Pradesh', '37', true),
  (9,  'Bangalore Electronics Components Pvt Ltd', 'Bengaluru', 'Karnataka',     '29', true),
  (10, 'Karnataka Tools Corporation',          'Hubballi',     'Karnataka',      '29', true),
  (11, 'Pune Machinery Pvt Ltd',               'Pune',         'Maharashtra',    '27', true),
  (12, 'Bhiwandi Warehousing LLP',             'Bhiwandi',     'Maharashtra',    '27', true),
  (13, 'Tiruppur Knit Fabrics',                'Tiruppur',     'Tamil Nadu',     '33', true),
  (14, 'Chennai Polymers Pvt Ltd',             'Chennai',      'Tamil Nadu',     '33', true),
  (15, 'Delhi Office Furnishers',              'New Delhi',    'Delhi',          '07', true),
  (16, 'Rajkot Brass Fittings',                'Rajkot',       'Gujarat',        '24', true),
  (17, 'Vapi Chemicals Ltd',                   'Vapi',         'Gujarat',        '24', true),
  (18, 'Howrah Castings',                      'Howrah',       'West Bengal',    '19', true),
  (19, 'Kanpur Leather Goods',                 'Kanpur',       'Uttar Pradesh',  '09', true),
  (20, 'Ramesh Transport Services',            'Hyderabad',    'Telangana',      '36', false)
) as v(n, name, city, state, state_code, registered);

-- Stock catalogue. Doubles as the product list invoice/quote/bill lines are
-- drawn from, so line HSN codes and rates always match a real inventory row.
create temp table seed_item on commit drop as
select
  -- n is the key line draws and movements pick an item by.
  i.n,
  -- Stable id, same scheme as the other resources.
  'itm_' || substr(md5('itm' || i.n), 1, 8) as id,
  i.name, i.hsn_code, i.unit, i.purchase_price, i.gst_rate,
  -- Markup varies 18–34% by item so margins are not suspiciously uniform;
  -- rounded to whole rupees because that is how price lists are written.
  round(i.purchase_price * (1.18 + (i.n % 5) * 0.04), 0) as sale_price
from (values
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
) as i(n, name, hsn_code, unit, purchase_price, gst_rate);

-- -----------------------------------------------------------------------------
-- Clients and vendors.
-- GSTIN = state code + PAN (3 letters, holder-type letter, name initial,
-- 4 digits, letter) + entity number + 'Z' + check character. Format-valid only:
-- the real mod-36 checksum is not computed, so a strict GSTIN validator would
-- reject these — acceptable for a sandbox, and it guarantees no id is a real
-- taxpayer's. translate() maps md5 hex onto letters or digits, which yields
-- stable pseudo-random characters without consuming the random() stream.
-- -----------------------------------------------------------------------------

-- Inserted in n order so created_at ordering matches the reference numbering.
insert into public.nova_clients (id, name, gst_number, email, phone, billing_address, state, state_code, created_at)
select
  c.id,
  c.name,
  -- Unregistered customers have no GSTIN; the API must return null for them.
  case when c.registered then
    c.state_code
    || translate(substr(md5('pan' || c.id), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    -- PAN 4th letter encodes holder type: C company, F firm/LLP, P proprietor.
    || case when c.name ~ 'Ltd$' then 'C' when c.name ~ 'LLP$' then 'F' else 'P' end
    || upper(left(c.name, 1))
    || substr(translate(md5('pan' || c.id), 'abcdef', '012345'), 4, 4)
    || translate(substr(md5('pan' || c.id), 8, 1), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || '1Z'
    || upper(substr(md5('gstchk' || c.id), 1, 1))
  end,
  -- .example is an IANA-reserved TLD, so no seeded address can ever reach a
  -- real inbox if an integrator wires up email sending against this data.
  'accounts@' || lower(regexp_replace(split_part(c.name, ' ', 1) || split_part(c.name, ' ', 2), '[^A-Za-z]', '', 'g')) || '.example',
  -- Indian mobile shape (+91, 10 digits starting 9); digits come from md5.
  '+91 9' || substr(translate(md5('ph' || c.id), 'abcdef', '012345'), 1, 9),
  -- Plausible street address; cycling street names avoids a 40-row literal.
  (12 + c.n * 7) || '-' || (1 + c.n % 9) || ', '
    || (array['Industrial Area', 'Main Road', 'MG Road', 'Station Road', 'Market Street', 'Ring Road'])[1 + c.n % 6]
    || ', ' || c.city || ', ' || c.state,
  c.state,
  c.state_code,
  -- Clients predate their first invoice (up to 365 days back).
  (current_date - 420 + c.n)::timestamptz
from seed_client c
order by c.n;

-- Vendors mirror clients, plus the masked bank details an AP integration needs.
insert into public.nova_vendors (id, name, gst_number, email, phone, address, state, bank_ifsc, bank_account_last4, created_at)
select
  v.id,
  v.name,
  -- Same GSTIN construction as clients; unregistered vendors stay null.
  case when v.registered then
    v.state_code
    || translate(substr(md5('pan' || v.id), 1, 3), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || case when v.name ~ 'Ltd$' then 'C' when v.name ~ 'LLP$' then 'F' else 'P' end
    || upper(left(v.name, 1))
    || substr(translate(md5('pan' || v.id), 'abcdef', '012345'), 4, 4)
    || translate(substr(md5('pan' || v.id), 8, 1), '0123456789abcdef', 'ABCDEFGHJKLMNPQR')
    || '1Z'
    || upper(substr(md5('gstchk' || v.id), 1, 1))
  end,
  -- Reserved TLD again, for the same can-never-deliver reason.
  'billing@' || lower(regexp_replace(split_part(v.name, ' ', 1) || split_part(v.name, ' ', 2), '[^A-Za-z]', '', 'g')) || '.example',
  '+91 9' || substr(translate(md5('ph' || v.id), 'abcdef', '012345'), 1, 9),
  (20 + v.n * 11) || ', '
    || (array['Industrial Estate', 'Trade Centre', 'Warehouse Road', 'Auto Nagar'])[1 + v.n % 4]
    || ', ' || v.city || ', ' || v.state,
  v.state,
  -- IFSC shape: 4-letter bank code, a literal 0, 6-character branch code.
  (array['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])[1 + v.n % 5] || '0' || substr(translate(md5('ifsc' || v.id), 'abcdef', '012345'), 1, 6),
  -- Four digits only, satisfying the masking CHECK.
  substr(translate(md5('acct' || v.id), 'abcdef', '012345'), 1, 4),
  (current_date - 420 + v.n)::timestamptz
from seed_vendor v
order by v.n;

-- -----------------------------------------------------------------------------
-- Line items, shared by invoices, quotations and bills.
-- One line table for all three keeps the GST-per-line arithmetic in exactly
-- one place, so the three document types cannot round differently.
-- -----------------------------------------------------------------------------

-- Invoice header rolls. Every random() for invoices is drawn here, left to
-- right per row, so later edits to derivation logic never shift the stream.
create temp table seed_inv_draw on commit drop as
select
  n,
  -- Which client is billed.
  1 + floor(random() * 40)::int as client_n,
  -- Payment terms; 30 days doubled because it is the common Indian default.
  (array[15, 30, 30, 45])[1 + floor(random() * 4)::int] as term_days,
  -- 1–4 lines per document, as the brief requires.
  1 + floor(random() * 4)::int as line_count,
  -- Picks paid / partial / pending.
  random() as status_roll,
  -- Positions the invoice date within its allowed window.
  random() as date_roll,
  -- Decides whether an unpaid invoice is already past due.
  random() as overdue_roll,
  -- Decides whether a paid invoice was settled in two instalments.
  random() as split_roll,
  -- Fraction of the total covered by the first payment.
  random() as frac_roll,
  -- Delay from invoice date to first payment, and first to second.
  random() as lag1_roll,
  random() as lag2_roll,
  -- Payment rails for the two possible payments.
  1 + floor(random() * 8)::int as method1_n,
  1 + floor(random() * 8)::int as method2_n
from generate_series(1, 300) as n;

-- Raw line rolls for every document type. Separate statements per type keep
-- the stream order explicit: invoices, then (later) quotations, then bills.
create temp table seed_line_draw (
  -- 'inv' | 'quo' | 'bil' — which document family the line belongs to.
  doc text not null,
  -- Document ordinal within its family.
  n int not null,
  -- Line position, preserved into the jsonb array order.
  line_no int not null,
  -- Which catalogue item the line sells or buys.
  item_n int not null,
  -- Scales the quantity; interpreted per family in seed_line.
  qty_roll float8 not null
) on commit drop;

-- Invoice lines. lateral generate_series forces a nested loop driven by a
-- sequential scan of seed_inv_draw, so rows (and random() calls) stay ordered.
insert into seed_line_draw (doc, n, line_no, item_n, qty_roll)
select 'inv', d.n, l.line_no, 1 + floor(random() * 50)::int, random()
from seed_inv_draw d
cross join lateral generate_series(1, d.line_count) as l(line_no);

-- Quotation header rolls, drawn after invoice lines to keep one fixed order.
create temp table seed_quo_draw on commit drop as
select
  n,
  -- Client for non-converted quotes (converted ones inherit the invoice's).
  1 + floor(random() * 40)::int as client_n,
  -- 1–4 lines.
  1 + floor(random() * 4)::int as line_count,
  -- Positions the quotation date inside its status's window.
  random() as date_roll
from generate_series(1, 80) as n;

-- Quotation lines; drawn for all 80 even though converted quotes copy their
-- invoice's lines, so the stream length never depends on status logic.
insert into seed_line_draw (doc, n, line_no, item_n, qty_roll)
select 'quo', d.n, l.line_no, 1 + floor(random() * 50)::int, random()
from seed_quo_draw d
cross join lateral generate_series(1, d.line_count) as l(line_no);

-- Purchase-bill header rolls.
create temp table seed_bil_draw on commit drop as
select
  n,
  -- Which vendor issued the bill.
  1 + floor(random() * 20)::int as vendor_n,
  -- Supplier credit terms.
  (array[15, 30, 30, 45])[1 + floor(random() * 4)::int] as term_days,
  -- Bills are shorter than invoices in practice: 1–3 lines.
  1 + floor(random() * 3)::int as line_count,
  random() as status_roll,
  random() as date_roll,
  random() as overdue_roll,
  random() as frac_roll,
  -- Extra reverse-charge bills beyond the always-RCM transporter.
  random() as rcm_roll,
  -- Extra ITC-ineligible bills beyond the always-blocked caterer.
  random() as itc_roll
from generate_series(1, 150) as n;

-- Bill lines.
insert into seed_line_draw (doc, n, line_no, item_n, qty_roll)
select 'bil', d.n, l.line_no, 1 + floor(random() * 50)::int, random()
from seed_bil_draw d
cross join lateral generate_series(1, d.line_count) as l(line_no);

-- Priced lines. GST is computed and rounded PER LINE, then summed — the order
-- a GST invoice is legally drawn up in, and the only order that makes the
-- header equal the sum of its printed lines to the paisa.
create temp table seed_line on commit drop as
select
  l.doc, l.n, l.line_no,
  i.name, i.hsn_code, q.qty, p.rate, i.gst_rate,
  -- qty is an integer and rate has 2 dp, so this product is already exact.
  q.qty * p.rate as amount,
  round(q.qty * p.rate * i.gst_rate / 100, 2) as gst_amount
from seed_line_draw l
join seed_item i on i.n = l.item_n
-- Bills buy at cost, invoices and quotes sell at list price.
cross join lateral (select case when l.doc = 'bil' then i.purchase_price else i.sale_price end as rate) p
-- Big-ticket items sell in ones and twos; cheap stock moves in bulk, and
-- purchases are larger than sales because stock is bought in lots.
cross join lateral (select case
  when p.rate > 5000 then 1 + floor(l.qty_roll * 4)::int
  when l.doc = 'bil' then 10 + floor(l.qty_roll * 90)::int
  else 1 + floor(l.qty_roll * 24)::int
end as qty) q;

-- Document totals and the jsonb items array in the API's line shape.
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

-- Status and dates. Unpaid invoices are dated so ~85% are still inside terms
-- and ~15% are past due: without this, a year-wide date spread would make
-- almost every unpaid invoice overdue and the view's derivation untestable.
create temp table seed_inv on commit drop as
select
  d.*, s.status, t.total_amount,
  current_date - case
    -- Paid invoices: anywhere from 10 to 364 days old.
    when s.status = 'paid' then 10 + floor(d.date_roll * 355)::int
    -- Overdue: older than its terms by 1–300 days.
    when d.overdue_roll < 0.15 then d.term_days + 1 + floor(d.date_roll * 300)::int
    -- Still in terms: issued within the last term_days, so due_date >= today.
    else floor(d.date_roll * d.term_days)::int
  end as invoice_date
from seed_inv_draw d
join seed_doc_total t on t.doc = 'inv' and t.n = d.n
-- 50% paid, 16% partial, 34% pending — yields ~220 payments with the splits.
cross join lateral (select case
  when d.status_roll < 0.50 then 'paid'
  when d.status_roll < 0.66 then 'partial'
  else 'pending'
end as status) s;

-- First payment per paid/partial invoice. Money is cast to numeric before
-- rounding because random() is float8 and round(float8, int) does not exist.
create temp table seed_pay on commit drop as
select
  i.n as inv_n,
  1 as seq,
  case
    -- Partial: 20–80% received, strictly between 0 and the total.
    when i.status = 'partial' then round(i.total_amount * (0.2 + 0.6 * i.frac_roll)::numeric, 2)
    -- Paid in two instalments: first covers 30–70%.
    when i.split_roll < 0.15 then round(i.total_amount * (0.3 + 0.4 * i.frac_roll)::numeric, 2)
    -- Paid in one go.
    else i.total_amount
  end as amount,
  -- Between invoice date and the earlier of due date or today: no payment is
  -- ever dated in the future.
  i.invoice_date + floor(i.lag1_roll * least(i.term_days, current_date - i.invoice_date))::int as payment_date,
  i.method1_n as method_n
from seed_inv i
where i.status in ('paid', 'partial');

-- Second instalment carries exactly the remainder, so a paid invoice's
-- payments sum to its total with no rounding residue.
insert into seed_pay (inv_n, seq, amount, payment_date, method_n)
select
  i.n, 2, i.total_amount - p.amount,
  -- After the first payment, never after today.
  p.payment_date + floor(i.lag2_roll * (current_date - p.payment_date))::int,
  i.method2_n
from seed_inv i
join seed_pay p on p.inv_n = i.n and p.seq = 1
where i.status = 'paid' and i.split_roll < 0.15;

-- Invoices. paid_amount is summed from seed_pay, the same rows inserted into
-- nova_payments below, so the two can never disagree.
insert into public.nova_invoices (
  id, invoice_number, client_id, client_name, client_gst_number, items,
  amount, gst_amount, cgst_amount, sgst_amount, igst_amount, intra_state,
  total_amount, paid_amount, status, invoice_date, due_date, created_at
)
select
  'inv_' || substr(md5('inv' || i.n), 1, 8),
  -- Numbered in date order, as a real sequential GST invoice series must be.
  -- Ordering by the date offset (not the date) means reruns on later days
  -- keep every invoice on the same number.
  'INV-' || lpad(row_number() over (order by i.invoice_date, i.n)::text, 5, '0'),
  c.id, c.name, c.gst_number, t.items,
  t.amount, t.gst_amount,
  -- Intra-state (seller is Telangana, 36): half each to CGST and SGST, with
  -- SGST taking the odd paisa so the three still sum to gst_amount exactly.
  case when x.intra then round(t.gst_amount / 2, 2) else 0 end,
  case when x.intra then t.gst_amount - round(t.gst_amount / 2, 2) else 0 end,
  -- Inter-state: all IGST.
  case when x.intra then 0 else t.gst_amount end,
  x.intra,
  t.total_amount,
  coalesce(p.paid, 0),
  i.status, i.invoice_date, i.invoice_date + i.term_days,
  -- Recorded mid-morning IST on its invoice date.
  (i.invoice_date + time '11:00') at time zone 'Asia/Kolkata'
from seed_inv i
join seed_doc_total t on t.doc = 'inv' and t.n = i.n
join seed_client sc on sc.n = i.client_n
join public.nova_clients c on c.id = sc.id
cross join lateral (select sc.state_code = '36' as intra) x
left join (select inv_n, sum(amount) as paid from seed_pay group by inv_n) p on p.inv_n = i.n;

-- Payments, with client fields copied from their invoice so the denormalised
-- name can never contradict the invoice it pays.
insert into public.nova_payments (id, payment_number, invoice_id, client_id, client_name, amount, payment_date, method, reference, created_at)
select
  x.id,
  -- Receipt numbers follow receipt order, like a real cash book.
  'PAY-' || lpad(row_number() over (order by p.payment_date, p.inv_n, p.seq)::text, 5, '0'),
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
  (p.payment_date + time '15:00') at time zone 'Asia/Kolkata'
from seed_pay p
cross join lateral (select 'pay_' || substr(md5('pay' || p.inv_n || '-' || p.seq), 1, 8) as id) x
join public.nova_invoices inv on inv.id = 'inv_' || substr(md5('inv' || p.inv_n), 1, 8)
-- NEFT doubled: it is the dominant B2B rail.
cross join lateral (select (array['upi', 'neft', 'neft', 'rtgs', 'imps', 'cheque', 'cash', 'card'])[p.method_n] as method) m;

-- -----------------------------------------------------------------------------
-- Quotations.
-- -----------------------------------------------------------------------------

-- Status cycles through all six so every lifecycle branch has ~13 rows.
-- Every 6th quote is 'converted' and points at invoice (n/6)*20 — distinct
-- invoices, so no invoice is claimed by two quotes.
create temp table seed_quo on commit drop as
select
  q.n, s.status,
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
cross join lateral (select (array['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'])[1 + (q.n - 1) % 6] as status) s
join seed_client sc on sc.n = q.client_n
join public.nova_clients c on c.id = sc.id
join seed_doc_total t on t.doc = 'quo' and t.n = q.n
left join public.nova_invoices inv on s.status = 'converted' and inv.id = 'inv_' || substr(md5('inv' || (q.n / 6) * 20), 1, 8);

-- Quotations, numbered in date order like invoices.
insert into public.nova_quotations (
  id, quotation_number, client_id, client_name, items, amount, gst_amount, total_amount,
  status, quotation_date, valid_until, converted_invoice_id, created_at
)
select
  'quo_' || substr(md5('quo' || q.n), 1, 8),
  'QT-' || lpad(row_number() over (order by q.quotation_date, q.n)::text, 5, '0'),
  q.client_id, q.client_name, q.items, q.amount, q.gst_amount, q.amount + q.gst_amount,
  q.status, q.quotation_date,
  -- 30-day validity, the usual Indian B2B quote term.
  q.quotation_date + 30,
  q.converted_invoice_id,
  (q.quotation_date + time '10:00') at time zone 'Asia/Kolkata'
from seed_quo q;

-- -----------------------------------------------------------------------------
-- Purchase bills. No payments table exists for AP, so paid_amount is the only
-- record of settlement and is derived straight from status.
-- -----------------------------------------------------------------------------
insert into public.nova_purchase_bills (
  id, bill_number, vendor_id, vendor_name, vendor_gst_number, items,
  amount, gst_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount,
  status, bill_date, due_date, reverse_charge, itc_eligible, created_at
)
select
  'bil_' || substr(md5('bil' || b.n), 1, 8),
  -- Our internal purchase register number, in bill-date order.
  'BILL-' || lpad(row_number() over (order by d.bill_date, b.n)::text, 5, '0'),
  v.id, v.name, v.gst_number, t.items,
  t.amount, t.gst_amount,
  -- Same split rule as invoices; the place of supply is the vendor's state.
  case when sv.state_code = '36' then round(t.gst_amount / 2, 2) else 0 end,
  case when sv.state_code = '36' then t.gst_amount - round(t.gst_amount / 2, 2) else 0 end,
  case when sv.state_code = '36' then 0 else t.gst_amount end,
  t.total_amount,
  case s.status
    when 'paid' then t.total_amount
    -- Numeric cast for the same round(float8) reason as invoice payments.
    when 'partial' then round(t.total_amount * (0.2 + 0.6 * b.frac_roll)::numeric, 2)
    else 0
  end,
  s.status, d.bill_date, d.bill_date + b.term_days,
  -- Goods transport by an unregistered transporter is a classic RCM case
  -- (vendor 20); ~10% more are random so the flag is not vendor-only.
  b.vendor_n = 20 or b.rcm_roll < 0.10,
  -- Food and catering credit is blocked under section 17(5) (vendor 5); ~12%
  -- more are random so ineligible bills span vendors.
  not (b.vendor_n = 5 or b.itc_roll < 0.12),
  (d.bill_date + time '12:00') at time zone 'Asia/Kolkata'
from seed_bil_draw b
join seed_doc_total t on t.doc = 'bil' and t.n = b.n
join seed_vendor sv on sv.n = b.vendor_n
join public.nova_vendors v on v.id = sv.id
-- 55% paid, 15% partial, 30% pending.
cross join lateral (select case
  when b.status_roll < 0.55 then 'paid'
  when b.status_roll < 0.70 then 'partial'
  else 'pending'
end as status) s
-- Same in-terms / overdue dating rule as invoices, for the same reason.
cross join lateral (select current_date - case
  when s.status = 'paid' then 10 + floor(b.date_roll * 355)::int
  when b.overdue_roll < 0.15 then b.term_days + 1 + floor(b.date_roll * 300)::int
  else floor(b.date_roll * b.term_days)::int
end as bill_date) d;

-- -----------------------------------------------------------------------------
-- Expenses.
-- -----------------------------------------------------------------------------

-- Expense rolls. The category array repeats common categories to weight them.
create temp table seed_exp_draw on commit drop as
select
  n,
  (array['rent', 'travel', 'travel', 'software', 'software', 'utilities', 'office_supplies',
         'professional_fees', 'professional_fees', 'marketing', 'meals', 'meals', 'salaries', 'other'])[1 + floor(random() * 14)::int] as category,
  -- Scales the amount around the category's typical size.
  random() as amount_roll,
  -- Picks one of three payees for the category.
  1 + floor(random() * 3)::int as payee_n,
  -- Payment rail when the category does not force one.
  1 + floor(random() * 7)::int as method_n,
  -- Spreads expenses across the year.
  random() as date_roll
from generate_series(1, 200) as n;

-- Expenses. Rates and TDS come from the category, the way a bookkeeper
-- applies them.
insert into public.nova_expenses (
  id, expense_number, category, vendor_name, description, amount, gst_amount, total_amount,
  tds_rate, tds_amount, payment_method, expense_date, created_at
)
select
  'exp_' || substr(md5('exp' || e.n), 1, 8),
  'EXP-' || lpad(row_number() over (order by x.expense_date, e.n)::text, 5, '0'),
  e.category,
  -- Invented payee names: realistic, but never a real brand.
  (case e.category
    when 'rent'              then array['Banjara Estates LLP', 'Madhapur Properties', 'Jubilee Hills Realty']
    when 'travel'            then array['Skyline Travels', 'Metro Cabs Hyderabad', 'Redline Tours and Travels']
    when 'software'          then array['CloudStack Software Pvt Ltd', 'Zenith SaaS Solutions', 'CodeForge Tools']
    when 'utilities'         then array['City Power Distribution', 'Metro Water Board', 'FiberNet Broadband']
    when 'office_supplies'   then array['Balaji Stationery Suppliers', 'Office Mart', 'Supreme Stationers']
    when 'professional_fees' then array['Rao and Associates Chartered Accountants', 'Menon Legal LLP', 'Iyer Tax Consultants']
    when 'marketing'         then array['Pixel Bloom Digital', 'Deccan Print Media', 'Brandwave Events']
    when 'meals'             then array['Hyderabad House Caterers', 'Annapurna Caterers', 'Cafe Nirvana']
    when 'salaries'          then array['Staff payroll', 'Staff payroll', 'Contract staff payroll']
    else                          array['Speedpost Couriers', 'Bank charges', 'Local vendor']
  end)[e.payee_n],
  case e.category
    when 'rent'              then 'Office rent - Madhapur'
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
  (x.expense_date + time '16:00') at time zone 'Asia/Kolkata'
from seed_exp_draw e
-- Typical size per category, varied 50–150%.
cross join lateral (select round((case e.category
  when 'rent' then 85000 when 'travel' then 6500 when 'software' then 12000
  when 'utilities' then 9000 when 'office_supplies' then 4500 when 'professional_fees' then 40000
  when 'marketing' then 30000 when 'meals' then 3200 when 'salaries' then 350000 else 2500
end) * (0.5 + e.amount_roll)::numeric, 2) as amount) a
-- GST slab per category: electricity/water and salaries are outside GST,
-- transport and restaurant services sit at 5%, the rest at 18%.
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
-- Inventory and stock movements.
-- 8 movements per item (50 x 8 = 400). Movement 1 is always a purchase of
-- q0 units; every later outflow is capped at q0/8 (sales) or q0/16
-- (adjustments), so at most 7/8 of the opening stock can ever leave and the
-- running balance cannot go negative at any point — no procedural loop needed.
-- -----------------------------------------------------------------------------

-- Movement rolls; one flat series (item = g/8, k = g%8) instead of a cross
-- join, because a join of two series could be planned in either order.
create temp table seed_mov_draw on commit drop as
select
  g,
  random() as type_roll,
  random() as qty_roll,
  random() as sign_roll,
  random() as day_roll
from generate_series(0, 399) as g;

-- Derived movements, before inventory exists, so quantity_on_hand can be
-- inserted as their sum instead of patched with an UPDATE afterwards.
create temp table seed_mov on commit drop as
select
  m.g,
  i.id as item_id,
  i.n as item_n,
  k.k,
  t.movement_type,
  -- Fractional units carry 3 dp (the column's scale); countable ones are whole.
  case when t.movement_type = 'sale' or (t.movement_type = 'adjustment' and m.sign_roll < 0.6) then -1 else 1 end
    * case when i.unit in ('kg', 'litre', 'metre') then round(mag.v::numeric, 3) else floor(mag.v)::numeric end as quantity,
  -- Reference points at a document number that exists in this seed.
  case
    when k.k = 1 then 'Opening stock purchase'
    when t.movement_type = 'purchase' then 'BILL-' || lpad((1 + m.g % 150)::text, 5, '0')
    when t.movement_type = 'sale' then 'INV-' || lpad((1 + m.g % 300)::text, 5, '0')
    when m.sign_roll < 0.6 then 'Damaged stock written off'
    else 'Stock count gain'
  end as reference,
  -- Movement k lands in a 30-day window 45 days after movement k-1's window,
  -- so dates are strictly increasing and the opening purchase is the oldest.
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
-- Magnitude (always >= 1, so the quantity <> 0 CHECK holds).
cross join lateral (select case
  when k.k = 1 then q.q0 + m.qty_roll * 50
  when t.movement_type = 'purchase' then 20 + m.qty_roll * (q.q0 / 2.0 - 20)
  when t.movement_type = 'sale' then 1 + m.qty_roll * (q.q0 / 8.0 - 1)
  else 1 + m.qty_roll * (q.q0 / 16.0 - 1)
end as v) mag;

-- Inventory, with quantity_on_hand equal to its movement ledger by
-- construction. Every 5th item gets a reorder level above its stock so the
-- view's below_reorder_level flag has true rows to test against.
insert into public.nova_inventory (id, sku, name, hsn_code, unit, sale_price, purchase_price, gst_rate, quantity_on_hand, reorder_level, created_at)
select
  i.id,
  -- SKU embeds the HSN so a human can read the tax class off the code.
  'ACZ-' || i.hsn_code || '-' || lpad(i.n::text, 3, '0'),
  i.name, i.hsn_code, i.unit, i.sale_price, i.purchase_price, i.gst_rate,
  s.qoh,
  case when i.n % 5 = 0 then s.qoh + 25 else round(s.qoh * 0.25, 0) end,
  (current_date - 400)::timestamptz
from seed_item i
join (select item_n, sum(quantity) as qoh from seed_mov group by item_n) s on s.item_n = i.n;

-- The ledger itself.
insert into public.nova_stock_movements (id, item_id, movement_type, quantity, reference, movement_date, created_at)
select
  'mov_' || substr(md5('mov' || m.g), 1, 8),
  m.item_id, m.movement_type, m.quantity, m.reference, m.movement_date,
  (m.movement_date + time '09:30') at time zone 'Asia/Kolkata'
from seed_mov m
order by m.g;

-- Temp tables drop here (on commit drop); nothing of the seed's scaffolding
-- outlives the transaction.
commit;
