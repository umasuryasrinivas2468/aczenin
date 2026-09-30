/*
  Nova debt resources — Tier 2 pack 2d debt (docs/nova-tier2-build-contract.md §4.4, §5).
  Owned by ONE builder; merged into the registry by resources.ts.
  Pre-wired EMPTY on 2026-09-29 so the builder fills only this file and never
  edits resources.ts (write-ownership partitioning). Column names are exactly
  the nova_*_v view columns in supabase/nova/013_debt.sql; slice_no is never
  listed (the translator refuses it and resources.check.ts asserts it).
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle
// (importing resources.ts here would be circular — it imports this file).
import { code, date, number, oneOf, text, type Resource } from "./fields.ts";

// GET /loans — the company's borrowings: one term loan and one cash-credit line.
const LOANS: Resource = {
  // Singular object tag, like every other resource.
  object: "loan",
  // The security_invoker view over nova_loans.
  view: "nova_loans_v",
  filters: {
    // The two facility kinds from the nova_loans CHECK.
    loan_type: oneOf(["term_loan", "cash_credit"]),
    // Substring search: lender names are long ("BAJAJ FINANCE LTD").
    lender: text,
    // The status CHECK list; both loans are live today, but the list is the contract.
    status: oneOf(["active", "closed"]),
    // When the facility was sanctioned, for vintage questions (FIN-37).
    sanction_date: date,
    // The cash-credit renewal date; may be after as-of.
    review_date: date,
    // Exposure ranges, for "which debt is largest" (FIN-39).
    outstanding_principal: number,
  },
  // Vintage first, then exposure.
  sort: ["sanction_date", "outstanding_principal"],
  // Newest sanction first, like every dated resource.
  defaultSort: "sanction_date",
};

// GET /loan-schedules — the term loan's 60 instalments, past and future.
const LOAN_SCHEDULES: Resource = {
  // Object tag.
  object: "loan_schedule",
  // View over nova_loan_schedules.
  view: "nova_loan_schedules_v",
  filters: {
    // One loan's schedule (the child route pins this too).
    loan_id: code,
    // paid / due / scheduled, from the table CHECK.
    status: oneOf(["paid", "due", "scheduled"]),
    // Future due dates are the cash commitments FIN-20 asks about.
    due_date: date,
    // When an instalment actually cleared.
    paid_date: date,
    // Position in the 60-month tenure.
    instalment_no: number,
    // The EMI amount (the last instalment differs by the rounding it absorbs).
    total_due: number,
    // The statement line an instalment was paid by, for bank matching.
    bank_transaction_id: code,
  },
  // Calendar order, then tenure order.
  sort: ["due_date", "instalment_no"],
  // Latest due date first.
  defaultSort: "due_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const DEBT_RESOURCES: Record<string, Resource> = {
  // Facilities.
  loans: LOANS,
  // Instalments.
  "loan-schedules": LOAN_SCHEDULES,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const DEBT_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /loans/{id}/loan-schedules: one loan's amortisation table.
  "loans/loan-schedules": { resource: LOAN_SCHEDULES, parentField: "loan_id" },
};
