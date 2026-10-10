/*
  Nova banking resources — Tier 1 (docs/nova-tier1-build-contract.md).
  Owned by ONE worker; merged into the registry by resources.ts.
  Columns are exactly the views in supabase/nova/008_banking.sql. slice_no is
  in every view (the API pins on it) but never listed here: the translator
  refuses it by name and resources.check.ts asserts no resource exposes it.
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle
// (importing resources.ts here would be circular — it imports this file).
import { code, date, number, oneOf, text, type Resource } from "./fields.ts";

// GET /bank-transactions — every statement line of the team's five accounts.
const BANK_TRANSACTIONS: Resource = {
  // Singular object tag, like the core resources.
  object: "bank_transaction",
  // The security_invoker view over nova_bank_transactions.
  view: "nova_bank_transactions_v",
  filters: {
    // Narrow to one account (the child route pins this too).
    account_id: code,
    // Statement dates: value date for cash positioning, posted for ordering.
    value_date: date,
    posted_date: date,
    // Amounts, for "credits above ₹1L" style queries.
    debit: number,
    credit: number,
    // Matching keys for reconciliation: UTR / RRN / challan and cheque number.
    bank_ref: code,
    cheque_no: code,
    // Substring search over the bank's messy text is how teams find a payer.
    counterparty_text: text,
    raw_narration: text,
  },
  // line_no restores statement order within an account.
  sort: ["value_date", "posted_date", "line_no", "debit", "credit", "running_balance"],
  // Newest value date first, like every dated resource.
  defaultSort: "value_date",
};

// GET /payroll-runs — one row per department per month, no individual pay.
const PAYROLL_RUNS: Resource = {
  // Object tag.
  object: "payroll_run",
  // View over nova_payroll_runs.
  view: "nova_payroll_runs_v",
  filters: {
    // Payroll month (first of the month).
    month: date,
    // Per-department and per-account slicing.
    department_id: code,
    account_id: code,
    // When salaries were credited.
    pay_date: date,
    // Cost and cash-out ranges.
    gross: number,
    net: number,
  },
  // Sortable by period, date and size.
  sort: ["month", "pay_date", "gross", "net"],
  // Latest month first.
  defaultSort: "month",
};

// GET /statutory-dues — GST, TDS, PF, ESI and advance-tax obligations.
const STATUTORY_DUES: Resource = {
  // Object tag.
  object: "statutory_due",
  // The view derives status against the frozen as-of date.
  view: "nova_statutory_dues_v",
  filters: {
    // The five due types from the table CHECK.
    due_type: oneOf(["gstr3b", "tds", "pf", "esi", "advance_tax"]),
    // 'YYYY-MM' or 'FY2026-27 Q2'; exact match only.
    period: code,
    // Due and paid dates for calendars and lateness.
    due_date: date,
    paid_date: date,
    // Size of the obligation.
    amount: number,
    // Derived in the view: paid, overdue (past due, unpaid), upcoming.
    status: oneOf(["paid", "overdue", "upcoming"]),
  },
  // Calendar order is the useful one.
  sort: ["due_date", "paid_date", "amount"],
  // Latest due date first.
  defaultSort: "due_date",
};

// GET /budgets — department × category × month, with committed spend.
const BUDGETS: Resource = {
  // Object tag.
  object: "budget",
  // The view adds remaining = amount − committed.
  view: "nova_budgets_v",
  filters: {
    // Per-department budget control.
    department_id: code,
    // The categories from the nova_budgets CHECK.
    category: oneOf([
      "payroll", "materials", "rent", "travel", "software", "utilities",
      "office_supplies", "professional_fees", "marketing", "meals", "other",
    ]),
    // Budget month (first of the month).
    month: date,
    // Budget, commitments and headroom ranges ("where is remaining < 0").
    amount: number,
    committed: number,
    remaining: number,
  },
  // Period and size sorts.
  sort: ["month", "amount", "committed", "remaining"],
  // Latest month first.
  defaultSort: "month",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const BANKING_RESOURCES: Record<string, Resource> = {
  // Statement lines.
  "bank-transactions": BANK_TRANSACTIONS,
  // Department payroll.
  "payroll-runs": PAYROLL_RUNS,
  // Tax and social-security calendar.
  "statutory-dues": STATUTORY_DUES,
  // Budget vs commitments.
  budgets: BUDGETS,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const BANKING_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /bank-accounts/{id}/bank-transactions: one account's statement.
  "bank-accounts/bank-transactions": { resource: BANK_TRANSACTIONS, parentField: "account_id" },
};
