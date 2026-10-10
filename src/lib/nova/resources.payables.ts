/*
  Nova payables resources — Tier 1 (docs/nova-tier1-build-contract.md §5).
  Owned by ONE worker (payables); merged into the registry by resources.ts.
  Column names are exactly the nova_*_v view columns in
  supabase/nova/007_payables_controls.sql. slice_no is never listed: it is the
  tenant pin, set by the server only (resources.check.ts asserts this).
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle
// (importing resources.ts here would be circular — it imports this file).
import { bool, code, date, number, oneOf, text, timestamp, type Resource } from "./fields.ts";

// GET /vendor-bank-accounts — a vendor's bank-account history, one row per validity window.
const VENDOR_BANK_ACCOUNTS: Resource = {
  // Singular object tag, as every other resource uses.
  object: "vendor_bank_account",
  // The read view; the API never reads tables directly.
  view: "nova_vendor_bank_accounts_v",
  filters: {
    // Whose account; the child route pins this same column.
    vendor_id: code,
    // Branch code: exact match is what a shared-account check needs.
    ifsc: code,
    // Masked digits: exact or one-of, substring on 4 digits is meaningless.
    account_last4: code,
    // Stable hash of the full account number: the join key for shared accounts.
    account_fingerprint: code,
    // Name the bank has on the account; substring search finds near-matches.
    holder_name: text,
    // Validity window, so "accounts live on date X" is two range filters.
    valid_from: date,
    valid_to: date,
    // Penny-drop verified or not.
    verified: bool,
  },
  // Dates for timelines, last4 for eyeballing collisions.
  sort: ["valid_from", "valid_to", "account_last4"],
  // Newest account first, like every dated resource.
  defaultSort: "valid_from",
};

// GET /vendor-payments — outgoing payments to vendors.
const VENDOR_PAYMENTS: Resource = {
  object: "vendor_payment",
  view: "nova_vendor_payments_v",
  filters: {
    // Human-facing number; substring helps when only part of it is known.
    payment_number: text,
    // Payee, and the account the money went to.
    vendor_id: code,
    beneficiary_account_id: code,
    // Company bank account it left from (nova_bank_accounts).
    from_account_id: code,
    // Range filters are what threshold and split analysis need.
    amount: number,
    // The five rails the table's CHECK allows.
    channel: oneOf(["neft", "rtgs", "imps", "upi", "cheque"]),
    // Maker and checker, for segregation-of-duties queries.
    initiated_by: code,
    approved_by: code,
    // timestamptz: a YYYY-MM-DD value matches that whole UTC day, not midnight.
    initiated_at: timestamp,
    // Outcome; failed and reversed rows never settled.
    status: oneOf(["success", "failed", "reversed"]),
    // Link to the bank statement line (filled by the banking seed).
    bank_transaction_id: code,
  },
  sort: ["initiated_at", "amount", "payment_number"],
  defaultSort: "initiated_at",
};

// GET /approvals — the approval log across every document type.
const APPROVALS: Resource = {
  object: "approval",
  view: "nova_approvals_v",
  filters: {
    // Which kind of document; doc_id is only meaningful together with it.
    doc_type: oneOf(["purchase_order", "purchase_bill", "vendor_payment", "expense", "credit_note", "vendor_master"]),
    // The approved document's id (polymorphic, so no FK behind it).
    doc_id: code,
    // Level in the chain: 1 = first approver, 2+ = escalations.
    level: number,
    // What the actor did at that level.
    action: oneOf(["approve", "reject", "escalate"]),
    // Who acted.
    actor_id: code,
    // When; timestamptz, so day-widened like initiated_at.
    acted_at: timestamp,
    // The actor's approval limit that applied; compare with the document amount.
    threshold_applied: number,
  },
  sort: ["acted_at", "level", "threshold_applied"],
  defaultSort: "acted_at",
};

// GET /master-data-changes — the change log for vendor, client, employee and bank masters.
const MASTER_DATA_CHANGES: Resource = {
  object: "master_data_change",
  view: "nova_master_data_changes_v",
  filters: {
    // Which master was changed.
    entity_type: oneOf(["vendor", "client", "employee", "vendor_bank_account"]),
    // The changed record's id (polymorphic, no FK).
    entity_id: code,
    // Column name that changed; a code, so exact or one-of.
    field: code,
    // Maker and (optional) checker.
    changed_by: code,
    approved_by: code,
    // When the change was made; timestamptz, day-widened like initiated_at.
    changed_at: timestamp,
  },
  sort: ["changed_at", "field"],
  defaultSort: "changed_at",
};

// GET /credit-notes — credit notes issued against sales invoices.
const CREDIT_NOTES: Resource = {
  object: "credit_note",
  view: "nova_credit_notes_v",
  filters: {
    // Human-facing number.
    credit_note_number: text,
    // The invoice it reduces, and that invoice's client.
    invoice_id: code,
    client_id: code,
    // Issue date.
    note_date: date,
    // Taxable value and the total including GST.
    amount: number,
    total_amount: number,
    // Why it was issued (the table's CHECK list).
    reason: oneOf(["return", "discount", "refund", "price_difference"]),
    // Who signed it off; the refund-cluster pattern groups on this.
    approved_by: code,
  },
  sort: ["note_date", "amount", "total_amount", "credit_note_number"],
  defaultSort: "note_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const PAYABLES_RESOURCES: Record<string, Resource> = {
  // Contract §5 resource names, kebab-case URL segments.
  "vendor-bank-accounts": VENDOR_BANK_ACCOUNTS,
  "vendor-payments": VENDOR_PAYMENTS,
  approvals: APPROVALS,
  "master-data-changes": MASTER_DATA_CHANGES,
  "credit-notes": CREDIT_NOTES,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const PAYABLES_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /vendors/{id}/vendor-bank-accounts: vendor_id is the FK to nova_vendors.
  "vendors/vendor-bank-accounts": { resource: VENDOR_BANK_ACCOUNTS, parentField: "vendor_id" },
};
