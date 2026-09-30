/*
  Nova ledger resources — Tier 2 pack 2c ledger (docs/nova-tier2-build-contract.md §4.5, §5).
  Owned by ONE builder; merged into the registry by resources.ts.
  Column names are exactly the nova_*_v view columns in supabase/nova/012_ledger.sql;
  slice_no is never listed (the translator refuses it and resources.check.ts asserts it).
*/

// Field shorthands from fields.ts, which imports nothing, so there is no cycle
// (importing resources.ts here would be circular: it imports this file).
import { bool, code, date, number, oneOf, text, timestamp, type Resource } from "./fields.ts";

// GET /chart-of-accounts — the company's accounts, one GL account per bank account.
const CHART_OF_ACCOUNTS: Resource = {
  // Singular snake_case of the key, like every resource tag.
  object: "chart_of_account",
  // The security_invoker view over nova_chart_of_accounts.
  view: "nova_chart_of_accounts_v",
  filters: {
    // Four-digit codes and the header an account rolls up into: exact matches.
    account_code: code,
    parent_code: code,
    // The CHECK lists on nova_chart_of_accounts, copied exactly (C9).
    account_type: oneOf(["asset", "liability", "equity", "income", "expense"]),
    sub_type: oneOf([
      "bank", "cash", "receivable", "inventory", "fixed_asset", "accumulated_depreciation", "tax_asset",
      "clearing", "payable", "tax_payable", "loan", "equity", "revenue", "other_income", "cogs", "opex",
      "payroll", "finance_cost", "depreciation",
    ]),
    // AR and AP are the control accounts a reconciliation starts from.
    is_control: bool,
    // Which bank account a bank GL mirrors, for the bank reconciliation.
    bank_account_id: code,
    // Substring search on the account name ("receivable", "GST").
    name: text,
  },
  // Code order is how a chart is read.
  sort: ["account_code"],
  // First sort field (contract §5).
  defaultSort: "account_code",
};

// GET /accounting-periods — the 13 months of the book and their close.
const ACCOUNTING_PERIODS: Resource = {
  // Object tag.
  object: "accounting_period",
  // View over nova_accounting_periods.
  view: "nova_accounting_periods_v",
  filters: {
    // 'YYYY-MM': exact match.
    period: code,
    // Open or closed, from the table CHECK.
    status: oneOf(["open", "closed"]),
    // The month's first day.
    start_date: date,
    // When the month was closed: a timestamptz column, so timestamp, never date.
    closed_at: timestamp,
  },
  // Calendar order, then the label.
  sort: ["start_date", "period"],
  // Latest month first.
  defaultSort: "start_date",
};

// GET /journal-entries — every entry of the general ledger with its lines.
const JOURNAL_ENTRIES: Resource = {
  // Object tag.
  object: "journal_entry",
  // View over nova_journal_entries.
  view: "nova_journal_entries_v",
  filters: {
    // The period (the child route pins this too).
    period_id: code,
    // What produced the entry, from the table CHECK.
    source_type: oneOf([
      "invoice", "credit_note", "customer_receipt", "purchase_bill", "vendor_payment", "expense", "payroll",
      "statutory", "bank_charge", "bank_interest", "loan_emi", "loan_drawdown", "internal_transfer",
      "gateway_settlement", "card_statement", "expense_claim", "depreciation", "accrual", "opening_balance",
      "monthly_summary", "manual",
    ]),
    // The document drill-down: "the entry for this invoice".
    source_id: code,
    // Posted or reversed, from the table CHECK.
    status: oneOf(["posted", "reversed"]),
    // Accounting date, and keying time (timestamptz: timestamp).
    entry_date: date,
    posted_at: timestamp,
    // Who keyed and who approved, for close and segregation reviews.
    posted_by: code,
    approved_by: code,
    // Amounts, for "debits differ from credits" and size queries.
    total_debit: number,
    total_credit: number,
    // The entry a reversal undoes.
    reversal_of: code,
  },
  // Date, keying time, voucher number and size.
  sort: ["entry_date", "posted_at", "entry_number", "total_debit"],
  // Newest accounting date first.
  defaultSort: "entry_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const LEDGER_RESOURCES: Record<string, Resource> = {
  // The chart.
  "chart-of-accounts": CHART_OF_ACCOUNTS,
  // The periods and their close.
  "accounting-periods": ACCOUNTING_PERIODS,
  // The journal.
  "journal-entries": JOURNAL_ENTRIES,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const LEDGER_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /accounting-periods/{id}/journal-entries: one month's entries.
  "accounting-periods/journal-entries": { resource: JOURNAL_ENTRIES, parentField: "period_id" },
};
