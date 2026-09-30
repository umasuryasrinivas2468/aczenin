/*
  Nova spend resources — Tier 2 pack 2b spend and cards (docs/nova-tier2-build-contract.md §4.1, §5).
  Owned by ONE builder; merged into the registry by resources.ts.
  Columns are exactly the nova_*_v view columns in supabase/nova/009_spend.sql.
  slice_no is in every view (the API pins on it) but never listed here: the
  translator refuses it by name and resources.check.ts asserts no resource exposes it.
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle
// (importing resources.ts here would be circular — it imports this file).
import { bool, code, date, number, oneOf, text, timestamp, type Resource } from "./fields.ts";

// GET /spend-policies — the limits claims, cards and subscriptions are checked against.
const SPEND_POLICIES: Resource = {
  // Singular object tag, like the core resources.
  object: "spend_policy",
  // The security_invoker view over nova_spend_policies.
  view: "nova_spend_policies_v",
  filters: {
    // Which sub-ledger a rule governs; the exact CHECK list.
    applies_to: oneOf(["expense_claim", "card_transaction", "subscription"]),
    // Claim category, card MCC group or subscription category: an exact code.
    category: code,
    // Company-wide rules have no department; department rules name one.
    department_id: code,
    // Grade band ends (G1–G8), matched exactly.
    grade_min: code,
    grade_max: code,
    // Validity window, so "the rule in force on date D" is two filters.
    effective_from: date,
    effective_to: date,
    // Cap size, for "limits above ₹5,000" style queries.
    limit_amount: number,
  },
  // Newest rule first by default; code and cap for lookups and ranking.
  sort: ["effective_from", "policy_code", "limit_amount"],
  // The first sort field is the default (contract §5).
  defaultSort: "effective_from",
};

// GET /leave-records — who was away, and whether it was approved.
const LEAVE_RECORDS: Resource = {
  // Object tag.
  object: "leave_record",
  // View over nova_leave_records.
  view: "nova_leave_records_v",
  filters: {
    // One person's leave (the child route pins this too).
    employee_id: code,
    // The five leave kinds from the table CHECK.
    leave_type: oneOf(["earned", "sick", "casual", "unpaid", "comp_off"]),
    // Only approved leave means the person was really away.
    status: oneOf(["approved", "rejected", "cancelled", "pending"]),
    // Range filters for "on leave during D".
    start_date: date,
    end_date: date,
    // Length, half days included.
    days: number,
  },
  // Calendar order is the useful one.
  sort: ["start_date", "end_date", "days"],
  // Latest leave first.
  defaultSort: "start_date",
};

// GET /expense-claims — out-of-pocket claims and their reimbursement.
const EXPENSE_CLAIMS: Resource = {
  // Object tag.
  object: "expense_claim",
  // View over nova_expense_claims.
  view: "nova_expense_claims_v",
  filters: {
    // Claimant and cost centre.
    employee_id: code,
    department_id: code,
    // The ten claim heads from the table CHECK.
    category: oneOf([
      "travel_air", "travel_rail", "local_conveyance", "hotel", "meals",
      "client_entertainment", "telecom", "fuel", "office_supplies", "other",
    ]),
    // Workflow state from the table CHECK.
    status: oneOf(["submitted", "queried", "approved", "rejected", "reimbursed"]),
    // Spend day, and when it was filed (timestamptz, so the timestamp kind).
    expense_date: date,
    submitted_at: timestamp,
    // Claim size.
    amount: number,
    // Grouping keys: one trip, one client.
    trip_id: code,
    client_id: code,
    // Receipt keys: duplicate-bill detection joins on these.
    receipt_number: code,
    receipt_hash: code,
    // Merchant names are messy, so substring search.
    receipt_merchant: text,
    // Knowingly allowed over-limit claims.
    policy_exception: bool,
    // Which payroll paid it back.
    payroll_run_id: code,
  },
  // Date, filing time, size and the claim number.
  sort: ["expense_date", "submitted_at", "amount", "claim_number"],
  // Latest spend first.
  defaultSort: "expense_date",
};

// GET /corporate-cards — the company card programme.
const CORPORATE_CARDS: Resource = {
  // Object tag.
  object: "corporate_card",
  // View over nova_corporate_cards.
  view: "nova_corporate_cards_v",
  filters: {
    // Holder and cost centre.
    employee_id: code,
    department_id: code,
    // Card state and network, from the table CHECKs.
    status: oneOf(["active", "blocked", "closed"]),
    network: oneOf(["visa", "mastercard", "rupay"]),
    // When it was issued.
    issued_on: date,
    // Limits, for "cards with a cap above X".
    per_txn_limit: number,
    monthly_limit: number,
  },
  // Issue date and limit size.
  sort: ["issued_on", "monthly_limit"],
  // Newest card first.
  defaultSort: "issued_on",
};

// GET /card-transactions — every authorisation, approved or declined.
const CARD_TRANSACTIONS: Resource = {
  // Object tag.
  object: "card_transaction",
  // The view adds txn_hour_ist, the local hour of the swipe.
  view: "nova_card_transactions_v",
  filters: {
    // One card (the child route pins this too) or one holder.
    card_id: code,
    employee_id: code,
    // Swipe time (timestamptz) and booking day.
    txn_at: timestamp,
    posted_date: date,
    // Merchant category code, exact.
    mcc: code,
    // The eleven MCC groups from the table CHECK.
    mcc_group: oneOf([
      "travel", "lodging", "fuel", "restaurants", "software", "office",
      "telecom", "retail", "entertainment", "cash", "other",
    ]),
    // Merchant names vary, so substring search.
    merchant_name: text,
    // Ticket size.
    amount: number,
    // Outcome and the issuer's reason, from the table CHECKs.
    auth_status: oneOf(["approved", "declined"]),
    decline_reason: oneOf(["over_txn_limit", "over_monthly_limit", "blocked_mcc", "card_blocked", "outside_hours"]),
    // Charges that bill a subscription.
    subscription_id: code,
    // The IST hour (0–23), for night-spend questions.
    txn_hour_ist: number,
  },
  // Time, booking day and size.
  sort: ["txn_at", "posted_date", "amount"],
  // Latest swipe first.
  defaultSort: "txn_at",
};

// GET /subscriptions — recurring services, bank-billed and card-billed.
const SUBSCRIPTIONS: Resource = {
  // Object tag.
  object: "subscription",
  // The view adds annualised_cost.
  view: "nova_subscriptions_v",
  filters: {
    // Payee as billed; joins to expenses.vendor_name, so substring search.
    vendor_name: text,
    // The vendor master, when the payee is one.
    vendor_id: code,
    // The nine categories from the table CHECK.
    category: oneOf([
      "saas", "cloud", "telecom", "insurance", "maintenance", "rent",
      "utilities", "professional_services", "media",
    ]),
    // Owning department and person.
    department_id: code,
    owner_employee_id: code,
    // Cycle, channel and state, from the table CHECKs.
    billing_cycle: oneOf(["monthly", "quarterly", "annual"]),
    billing_channel: oneOf(["bank", "card"]),
    status: oneOf(["active", "paused", "cancelled"]),
    // Renewal calendar and start.
    renewal_date: date,
    started_on: date,
    // Renews on its own unless someone acts.
    auto_renew: bool,
    // Bill size per cycle.
    current_amount: number,
  },
  // Renewal calendar first; start, bill and yearly cost for ranking.
  sort: ["renewal_date", "started_on", "current_amount", "annualised_cost"],
  // Next renewal at the top.
  defaultSort: "renewal_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const SPEND_RESOURCES: Record<string, Resource> = {
  // The rulebook.
  "spend-policies": SPEND_POLICIES,
  // Leave, for claim-on-leave checks.
  "leave-records": LEAVE_RECORDS,
  // Out-of-pocket claims.
  "expense-claims": EXPENSE_CLAIMS,
  // The card programme.
  "corporate-cards": CORPORATE_CARDS,
  // Card authorisations.
  "card-transactions": CARD_TRANSACTIONS,
  // Recurring services.
  subscriptions: SUBSCRIPTIONS,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const SPEND_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /employees/{id}/expense-claims: one person's claims.
  "employees/expense-claims": { resource: EXPENSE_CLAIMS, parentField: "employee_id" },
  // /employees/{id}/leave-records: one person's leave.
  "employees/leave-records": { resource: LEAVE_RECORDS, parentField: "employee_id" },
  // /corporate-cards/{id}/card-transactions: one card's statement.
  "corporate-cards/card-transactions": { resource: CARD_TRANSACTIONS, parentField: "card_id" },
};
