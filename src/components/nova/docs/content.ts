/*
  Prose and example data for the Nova docs — the parts the registry cannot
  hold. Field lists, operators, enum values and sort columns are NOT here:
  the pages read those from src/lib/nova/resources.ts so they cannot drift.

  The example rows follow the nova_*_v view columns in
  supabase/nova/001_schema.sql and the id/number formats of 002_seed.sql
  (inv_ + 8 hex, INV-00001, …). They are illustrative, not live rows: a live
  capture was attempted but key creation failed while the portal was being
  rebuilt, so replace them with real ones when convenient.
*/

// Base URL shown everywhere. www, not the apex: aczen.in redirects to
// www.aczen.in and HTTP clients drop Authorization on a cross-host redirect,
// so an apex base URL would 401 every call.
export const BASE_URL = "https://www.aczen.in/nova-api/v1";

// Placeholder key used in every snippet; obviously fake so nobody pastes a real one into docs.
export const SAMPLE_KEY = "nova_sk_your_key_here";

// Where keys are created; one constant so the shell can move it in one edit.
export const KEYS_PAGE = "/nova-api/dashboard";

// Docs root; every docs href is built from it.
export const DOCS_ROOT = "/nova-api/docs";

// Reading order of the guide pages, used by the index cards and the pager.
export const GUIDE_PAGES = [
  { href: DOCS_ROOT, label: "Introduction" },
  { href: `${DOCS_ROOT}/authentication`, label: "Authentication" },
  { href: `${DOCS_ROOT}/filtering`, label: "Filtering & pagination" },
  { href: `${DOCS_ROOT}/errors`, label: "Errors" },
  { href: `${DOCS_ROOT}/rate-limits`, label: "Rate limits" },
] as const;

// How many distinct per-team slices the seed holds; team N+1 reuses a slice.
export const TEAM_SLICE_COUNT = 80;

// Approximate rows one team sees, as of the per-team slicing (2026-09-29).
// ponytail: hand-kept from the seed's shape; derive from the seed if it changes often.
export const TEAM_SLICE_ROWS: { path: string; rows: string }[] = [
  { path: "/clients", rows: "4" },
  { path: "/invoices", rows: "30" },
  { path: "/payments", rows: "21" },
  { path: "/quotations", rows: "8" },
  { path: "/vendors", rows: "2" },
  { path: "/purchase-bills", rows: "15" },
  { path: "/expenses", rows: "20" },
  { path: "/inventory", rows: "5" },
  { path: "/inventory/{id}/movements", rows: "40 across all items" },
];

// Prose per resource, keyed by the SAME URL segment as RESOURCES, so a typo
// here is a type error in the resource page rather than a missing section.
export type ResourceDoc = {
  // Page title.
  title: string;
  // One-sentence lead under the title.
  summary: string;
  // The id prefix, which tells integrators what a stray id belongs to.
  idPrefix: string;
  // Child list routes, by child segment; validated against findSubResource.
  children?: { segment: string; summary: string; idPrefix: string }[];
  // Extra notes worth a callout (derived fields, GST quirks).
  notes?: string[];
  // A realistic single row, rendered as the example `data` element.
  example: Record<string, unknown>;
  // A curl query that shows off this resource's most useful filters.
  exampleQuery: string;
};

// Example line item, reused by invoices/quotations so their shapes agree.
const LINE_18 = {
  description: "Cotton yarn, 40s count",
  hsn_code: "5205",
  quantity: 250,
  rate: 180,
  gst_rate: 5,
  amount: 45000,
  gst_amount: 2250,
};

// Prose and examples for the eight top-level resources.
export const RESOURCE_DOCS: Record<string, ResourceDoc> = {
  // Sales invoices.
  invoices: {
    title: "Invoices",
    summary: "Sales invoices raised against clients, with the full GST split and what is still owed.",
    idPrefix: "inv_",
    children: [{ segment: "payments", summary: "Payments allocated to one invoice, with the same filters as /payments.", idPrefix: "pay_" }],
    notes: [
      "status reads overdue when an invoice is pending or partial and its due_date has passed; the stored status never says overdue.",
      "Intra-state invoices (intra_state: true) carry CGST + SGST; inter-state ones carry IGST. The other side is always 0.",
      "balance_due is total_amount minus paid_amount, computed for you.",
    ],
    example: {
      object: "invoice",
      id: "inv_c4ca4238",
      invoice_number: "INV-00142",
      client_id: "cli_c81e728d",
      client_name: "Deccan Agro Foods Pvt Ltd",
      client_gst_number: "36ABCCD1234E1Z5",
      items: [LINE_18],
      amount: 45000,
      gst_amount: 2250,
      cgst_amount: 1125,
      sgst_amount: 1125,
      igst_amount: 0,
      intra_state: true,
      total_amount: 47250,
      paid_amount: 20000,
      status: "overdue",
      balance_due: 27250,
      invoice_date: "2026-07-14",
      due_date: "2026-08-13",
      currency: "INR",
      created_at: "2026-07-14T10:32:11.000Z",
    },
    exampleQuery: "invoices?status.in=pending,overdue&invoice_date.gte=2026-04-01&sort=total_amount&order=desc&limit=5",
  },
  // Customers.
  clients: {
    title: "Clients",
    summary: "The customers invoices and quotations are raised against.",
    idPrefix: "cli_",
    notes: ["gst_number is null for unregistered (B2C) customers.", "state_code is the two-digit GST state code that prefixes a GSTIN."],
    example: {
      object: "client",
      id: "cli_c81e728d",
      name: "Deccan Agro Foods Pvt Ltd",
      gst_number: "36ABCCD1234E1Z5",
      email: "accounts@deccanagro.example",
      phone: "+91 98480 12345",
      billing_address: "Plot 12, Jeedimetla Industrial Area, Hyderabad 500055",
      state: "Telangana",
      state_code: "36",
      created_at: "2025-10-02T09:15:00.000Z",
    },
    exampleQuery: "clients?state=Telangana&name.ilike=pvt&sort=name&order=asc",
  },
  // Proposals.
  quotations: {
    title: "Quotations",
    summary: "Proposals sent to clients, through their whole lifecycle from draft to converted.",
    idPrefix: "quo_",
    notes: ["converted_invoice_id is set only when status is converted, and points at the resulting invoice."],
    example: {
      object: "quotation",
      id: "quo_a87ff679",
      quotation_number: "QT-00037",
      client_id: "cli_e4da3b7f",
      client_name: "Charminar Electricals",
      items: [
        { description: "LED panel light, 18W", hsn_code: "9405", quantity: 120, rate: 650, gst_rate: 18, amount: 78000, gst_amount: 14040 },
      ],
      amount: 78000,
      gst_amount: 14040,
      total_amount: 92040,
      status: "sent",
      quotation_date: "2026-09-10",
      valid_until: "2026-10-10",
      converted_invoice_id: null,
      currency: "INR",
      created_at: "2026-09-10T12:04:47.000Z",
    },
    exampleQuery: "quotations?status=sent&quotation_date.gte=2026-09-01",
  },
  // Money received.
  payments: {
    title: "Payments",
    summary: "Customer payments received against invoices, with the rail and the reference reconciliation matches on.",
    idPrefix: "pay_",
    notes: ["reference is the UTR for bank transfers and UPI, or the cheque number."],
    example: {
      object: "payment",
      id: "pay_1679091c",
      payment_number: "PAY-00088",
      invoice_id: "inv_c4ca4238",
      client_id: "cli_c81e728d",
      client_name: "Deccan Agro Foods Pvt Ltd",
      amount: 20000,
      payment_date: "2026-08-02",
      method: "neft",
      reference: "UTIBN52026080212345",
      currency: "INR",
      created_at: "2026-08-02T15:41:09.000Z",
    },
    exampleQuery: "payments?method.in=upi,neft&amount.gte=10000&sort=amount",
  },
  // Suppliers.
  vendors: {
    title: "Vendors",
    summary: "The suppliers purchase bills are recorded against, with the bank details an AP integration needs.",
    idPrefix: "ven_",
    notes: ["Only the last four digits of the bank account are ever returned, as bank_account_last4."],
    example: {
      object: "vendor",
      id: "ven_eccbc87e",
      name: "Godavari Cotton Mills Ltd",
      gst_number: "37AABCG5678H1Z2",
      email: "billing@godavaricotton.example",
      phone: "+91 88866 54321",
      address: "Survey 44, Rajahmundry Road, Kakinada 533003",
      state: "Andhra Pradesh",
      bank_ifsc: "SBIN0001234",
      bank_account_last4: "4821",
      created_at: "2025-10-01T08:00:00.000Z",
    },
    exampleQuery: "vendors?state=Andhra%20Pradesh&sort=name&order=asc",
  },
  // Accounts payable.
  "purchase-bills": {
    title: "Purchase bills",
    summary: "Accounts payable: bills from vendors, with reverse-charge and input-tax-credit flags.",
    idPrefix: "bil_",
    notes: [
      "status derives overdue exactly as invoices do.",
      "reverse_charge: true means the buyer pays the GST to the government. itc_eligible says whether that GST can be claimed back.",
    ],
    example: {
      object: "purchase_bill",
      id: "bil_8f14e45f",
      bill_number: "BILL-00061",
      vendor_id: "ven_eccbc87e",
      vendor_name: "Godavari Cotton Mills Ltd",
      vendor_gst_number: "37AABCG5678H1Z2",
      items: [
        { description: "Raw cotton bales", hsn_code: "5201", quantity: 40, rate: 5200, gst_rate: 5, amount: 208000, gst_amount: 10400 },
      ],
      amount: 208000,
      gst_amount: 10400,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 10400,
      total_amount: 218400,
      paid_amount: 218400,
      status: "paid",
      balance_due: 0,
      bill_date: "2026-06-21",
      due_date: "2026-07-21",
      reverse_charge: false,
      itc_eligible: true,
      currency: "INR",
      created_at: "2026-06-21T11:20:00.000Z",
    },
    exampleQuery: "purchase-bills?status=overdue&itc_eligible=true&sort=due_date&order=asc",
  },
  // Direct spend.
  expenses: {
    title: "Expenses",
    summary: "Direct spend that never had a bill, such as rent, travel and software, with TDS where it applies.",
    idPrefix: "exp_",
    notes: ["tds_rate is a percentage (10.00 for 194J professional fees); tds_amount is what was withheld."],
    example: {
      object: "expense",
      id: "exp_45c48cce",
      expense_number: "EXP-00019",
      category: "professional_fees",
      vendor_name: "Rao & Associates, Chartered Accountants",
      description: "Statutory audit, FY 2025-26",
      amount: 60000,
      gst_amount: 10800,
      total_amount: 70800,
      tds_rate: 10,
      tds_amount: 6000,
      payment_method: "neft",
      expense_date: "2026-05-30",
      currency: "INR",
      created_at: "2026-05-30T17:02:36.000Z",
    },
    exampleQuery: "expenses?category.in=rent,software&expense_date.gte=2026-04-01",
  },
  // Stock.
  inventory: {
    title: "Inventory",
    summary: "Stock items with their HSN code, GST slab, prices and quantity on hand.",
    idPrefix: "itm_",
    children: [{ segment: "movements", summary: "The stock movements (purchases, sales, adjustments) behind one item's quantity_on_hand.", idPrefix: "mov_" }],
    notes: [
      "below_reorder_level is true when quantity_on_hand is at or under reorder_level.",
      "Quantities are decimals: kg, litres and metres are fractional. A movement's quantity is signed, positive into stock.",
    ],
    example: {
      object: "inventory_item",
      id: "itm_c9f0f895",
      sku: "ACZ-5205-003",
      name: "Cotton yarn, 40s count",
      hsn_code: "5205",
      unit: "kg",
      sale_price: 180,
      purchase_price: 142,
      gst_rate: 5,
      quantity_on_hand: 86.5,
      reorder_level: 100,
      created_at: "2025-10-01T08:00:00.000Z",
      below_reorder_level: true,
    },
    exampleQuery: "inventory?quantity_on_hand.lte=100&sort=quantity_on_hand&order=asc",
  },
};

// Example rows for the two child routes, keyed "<parent>/<child>".
export const CHILD_EXAMPLES: Record<string, Record<string, unknown>> = {
  // /invoices/{id}/payments returns payment rows.
  "invoices/payments": RESOURCE_DOCS.payments.example,
  // /inventory/{id}/movements returns stock movement rows.
  "inventory/movements": {
    object: "stock_movement",
    id: "mov_d3d94468",
    item_id: "itm_c9f0f895",
    movement_type: "sale",
    quantity: -25,
    reference: "INV-00142",
    movement_date: "2026-07-14",
    created_at: "2026-07-14T10:32:11.000Z",
  },
};

// Bearer-authenticated curl for a path under the base URL. Quoted because
// query strings contain & and spaces, which a shell would otherwise eat.
export function curl(path: string): string {
  // Line continuations keep the snippet readable at phone width.
  return `curl "${BASE_URL}/${path}" \\\n  -H "Authorization: Bearer ${SAMPLE_KEY}"`;
}

// Pretty JSON with two-space indent, the shape the API's clients will print.
export function json(value: unknown): string {
  // null replacer: every key, in insertion order ("object" first, like the API).
  return JSON.stringify(value, null, 2);
}

// Full reading order: the guides, then each resource in registry-doc order.
const READING_ORDER: { href: string; label: string }[] = [
  // Spread: GUIDE_PAGES is readonly and this list is only read.
  ...GUIDE_PAGES,
  // Resource pages follow the guides, in the order RESOURCE_DOCS lists them.
  ...Object.entries(RESOURCE_DOCS).map(([slug, doc]) => ({ href: `${DOCS_ROOT}/${slug}`, label: doc.title })),
];

// Prev/next neighbours of a docs page, for DocsPager.
export function pagerFor(href: string): { prev?: { href: string; label: string }; next?: { href: string; label: string } } {
  // Position in the reading order; -1 (unknown page) yields no neighbours.
  const index = READING_ORDER.findIndex((page) => page.href === href);
  // Unknown page: render no pager rather than a wrong one.
  if (index === -1) return {};
  // Out-of-range indexes read as undefined, which DocsPager treats as "none".
  return { prev: READING_ORDER[index - 1], next: READING_ORDER[index + 1] };
}
