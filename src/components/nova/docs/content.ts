/*
  Prose for the Nova docs — the parts the registry cannot hold. Field lists,
  operators, enum values, sort columns and child routes are NOT here: the
  pages read those from src/lib/nova/resources.ts so they cannot drift, and
  example rows are read live per team (teamData.ts).

  Wording is neutral by Teja's rule: no visible text says dummy, fake, test,
  sample, synthetic, sandbox or demo, and nothing claims the data is or is
  not real.
*/

// The registry, only to order the pager by the resources that actually exist.
import { RESOURCES } from "@/lib/nova/resources";

// Base URL shown everywhere. www, not the apex: aczen.in redirects to
// www.aczen.in and HTTP clients drop Authorization on a cross-host redirect,
// so an apex base URL would 401 every call.
export const BASE_URL = "https://www.aczen.in/nova-api/v1";

// Placeholder key used in every snippet; plainly not a key, so nobody pastes a live one into docs.
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

// Hand-written prose for one resource. Everything structural comes from the registry.
export type ResourceDoc = {
  // Page title; generated from the slug when absent.
  title?: string;
  // One plain-language sentence under the title.
  summary: string;
  // Gotchas worth a callout (derived fields, GST quirks).
  notes?: string[];
};

/*
  Descriptions keyed by URL segment. A registry key missing from this map
  still gets a page (see resourceDoc's fallback), so a new resource is never
  blocked on prose — it just reads more plainly until someone adds a line.
*/
const RESOURCE_DOCS: Record<string, ResourceDoc> = {
  // --- Core -------------------------------------------------------------------
  invoices: {
    summary: "Sales invoices raised against clients, with the full GST split and what is still owed.",
    notes: [
      "status reads overdue when an invoice is pending or partial and its due_date is before the dataset's as-of date; the stored status never says overdue.",
      "Intra-state invoices (intra_state: true) carry CGST + SGST; inter-state ones carry IGST. The other side is always 0.",
      "balance_due is total_amount minus paid_amount, computed for you.",
    ],
  },
  clients: {
    summary: "The customers invoices and quotations are raised against.",
    notes: ["gst_number is null for unregistered (B2C) customers.", "state_code is the two-digit GST state code that prefixes a GSTIN."],
  },
  quotations: {
    summary: "Proposals sent to clients, through their whole lifecycle from draft to converted.",
    notes: ["converted_invoice_id is set only when status is converted, and points at the resulting invoice."],
  },
  payments: {
    summary: "Customer payments received against invoices, with the rail and the reference reconciliation matches on.",
    notes: ["reference is the UTR for bank transfers and UPI, or the cheque number."],
  },
  vendors: {
    summary: "The suppliers purchase bills are recorded against, with the bank details an accounts-payable integration needs.",
    notes: ["Only the last four digits of a bank account are ever returned."],
  },
  "purchase-bills": {
    title: "Purchase bills",
    summary: "Accounts payable: bills from vendors, with reverse-charge and input-tax-credit flags.",
    notes: [
      "status derives overdue exactly as invoices do, against the as-of date.",
      "reverse_charge: true means the buyer pays the GST to the government. itc_eligible says whether that GST can be claimed back.",
    ],
  },
  expenses: {
    summary: "Direct spend that never had a bill, such as rent, travel and software, with TDS where it applies.",
    notes: ["tds_rate is a percentage (10.00 for 194J professional fees); tds_amount is what was withheld."],
  },
  inventory: {
    summary: "Stock items with their HSN code, GST slab, prices and quantity on hand.",
    notes: [
      "below_reorder_level is true when quantity_on_hand is at or under reorder_level.",
      "Quantities are decimals: kg, litres and metres are fractional. A movement's quantity is signed, positive into stock.",
    ],
  },
  // --- Org (contract §5) ----------------------------------------------------------
  "business-units": { summary: "The branches and product lines the business reports by." },
  departments: { summary: "Departments with their cost centre, head and business unit." },
  employees: {
    summary: "People on the books: department, manager, grade, role, pay band and hourly cost rate.",
    notes: ["There is no per-person salary; payroll is reported per department per month under /payroll-runs."],
  },
  "bank-accounts": { summary: "The company's own bank accounts, by purpose, with balances and transfer limits." },
  // --- Procurement ------------------------------------------------------------------
  "vendor-contracts": { summary: "Agreed prices, volume tiers, capacity and lead times per vendor and item." },
  "purchase-orders": { summary: "Orders raised to vendors, with line items, promised dates and the channel they went through." },
  "goods-receipts": { summary: "What actually arrived against each purchase order, including rejected quantities and why." },
  // --- Payables and controls ----------------------------------------------------------
  "vendor-bank-accounts": { summary: "Each vendor's bank account history, with validity dates and verification status." },
  "vendor-payments": { summary: "Payments made to vendors: which bills, from which account, to which beneficiary, and who approved them." },
  approvals: { summary: "The approval trail for purchase orders, bills, payments, expenses, credit notes and vendor changes." },
  "master-data-changes": { summary: "Every change to vendor, client, employee and bank-account records: the field, old and new value, and who changed it." },
  "credit-notes": { summary: "Credit notes issued against invoices, with the reason and approver." },
  // --- Banking ------------------------------------------------------------------------
  "bank-transactions": {
    summary: "Bank statement lines for every company account, with the bank's own narration and running balance.",
    notes: ["raw_narration keeps each bank's own statement format, so parsing it is part of the job."],
  },
  "payroll-runs": { summary: "Monthly payroll per department: gross, net and the PF, ESI and TDS deducted." },
  "statutory-dues": { summary: "GST, TDS, PF, ESI and advance-tax obligations, with due and paid dates and any interest." },
  budgets: { summary: "Monthly budgets per department and category, with the amount already committed." },
};

// "purchase-bills" → "Purchase bills": the fallback title for undescribed keys.
function titleFromSlug(slug: string): string {
  // Hyphens become spaces; only the first letter is capitalised, matching the hand-written titles.
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Prose for any registry key, with a generated fallback so every key renders.
export function resourceDoc(slug: string): Required<Pick<ResourceDoc, "title" | "summary">> & Pick<ResourceDoc, "notes"> {
  // Own-key lookup, so "constructor" and friends never resolve to prototype members.
  const doc = Object.hasOwn(RESOURCE_DOCS, slug) ? RESOURCE_DOCS[slug] : undefined;
  // Title: hand-written if given, else derived from the URL segment.
  const title = doc?.title ?? titleFromSlug(slug);
  // Summary: hand-written, else a plain sentence that is still true for any resource.
  return { title, summary: doc?.summary ?? `The ${title.toLowerCase()} in your team's books.`, notes: doc?.notes };
}

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

// Full reading order: the guides, then every registry resource in registry order.
const READING_ORDER: { href: string; label: string }[] = [
  // Spread: GUIDE_PAGES is readonly and this list is only read.
  ...GUIDE_PAGES,
  // From the registry, so a new resource joins the pager with no edit here.
  ...Object.keys(RESOURCES).map((slug) => ({ href: `${DOCS_ROOT}/${slug}`, label: resourceDoc(slug).title })),
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
