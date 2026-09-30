/*
  Nova gateway resources — Tier 2 pack 2a payments and settlement (docs/nova-tier2-build-contract.md §4.2, §5).
  Owned by ONE builder; merged into the registry by resources.ts (write-ownership
  partitioning: this file is the only one the gateway builder edits).
  Column names are exactly the nova_*_v view columns in supabase/nova/010_gateway.sql.
  slice_no is in every view (the API pins on it) but never listed here: the
  translator refuses it by name and resources.check.ts asserts it.
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle
// (importing resources.ts here would be circular — it imports this file).
import { code, date, number, oneOf, timestamp, type Resource } from "./fields.ts";

// GET /payment-channels — the payout rails and gateway methods, with fees and limits.
const PAYMENT_CHANNELS: Resource = {
  // Singular object tag, like the core resources.
  object: "payment_channel",
  // The security_invoker view over nova_payment_channels.
  view: "nova_payment_channels_v",
  filters: {
    // The eight rails, exactly the table CHECK list.
    channel_code: oneOf(["neft", "rtgs", "imps", "upi_payout", "gw_card", "gw_upi", "gw_netbanking", "gw_wallet"]),
    // Money out to vendors vs money in from web orders.
    direction: oneOf(["payout", "collection"]),
    // How the fee is built, for routing-cost questions (FIN-13).
    fee_model: oneOf(["flat", "percent", "percent_plus_flat", "slab"]),
    // T+n, for "which methods settle same day" style queries.
    settlement_days: number,
  },
  // Terms date first, then code order and cost.
  sort: ["effective_from", "channel_code", "fee_pct"],
  // Latest terms first, like every dated resource.
  defaultSort: "effective_from",
};

// GET /payment-attempts — every try at sending a vendor payment (FIN-12).
const PAYMENT_ATTEMPTS: Resource = {
  // Object tag.
  object: "payment_attempt",
  // View over nova_payment_attempts.
  view: "nova_payment_attempts_v",
  filters: {
    // One payment's retry chain (the child route pins this too).
    vendor_payment_id: code,
    // Per-rail failure analysis.
    channel_id: code,
    // The four outcomes from the table CHECK.
    outcome: oneOf(["success", "failed", "timeout", "reversed"]),
    // The eight failure codes from the table CHECK.
    failure_code: oneOf([
      "insufficient_funds", "beneficiary_ifsc_invalid", "beneficiary_account_closed", "name_mismatch",
      "bank_timeout", "limit_exceeded", "cutoff_missed", "duplicate_suspected",
    ]),
    // Where in the chain a try failed.
    failure_stage: oneOf(["initiation", "remitter_bank", "beneficiary_bank"]),
    // What ops did next: the recovery-path question.
    next_action: oneOf(["none", "retry_same_channel", "retry_alternate_channel", "manual_review"]),
    // A timestamptz column, so the timestamp shorthand (a bare date means that whole day).
    attempted_at: timestamp,
    // "Payments that needed a 3rd try" and size ranges.
    attempt_no: number,
    amount: number,
  },
  // Time order, then position in the chain, then size.
  sort: ["attempted_at", "attempt_no", "amount"],
  // Newest try first.
  defaultSort: "attempted_at",
};

// GET /gateway-transactions — web-shop captures, refunds, chargebacks and reversals.
const GATEWAY_TRANSACTIONS: Resource = {
  // Object tag.
  object: "gateway_transaction",
  // View over nova_gateway_transactions.
  view: "nova_gateway_transactions_v",
  filters: {
    // Event kinds and statuses, exactly the table CHECK lists.
    txn_type: oneOf(["capture", "refund", "chargeback", "chargeback_reversal"]),
    status: oneOf(["success", "failed", "pending"]),
    // Per-method views, and the domestic vs foreign card split (fee checks).
    channel_id: code,
    card_scope: oneOf(["domestic", "international"]),
    // Batch membership (the child route pins this too) and refund trails.
    settlement_id: code,
    parent_txn_id: code,
    // Matching keys for reconciliation: gateway, order, shopper and network refs.
    gateway_ref: code,
    order_ref: code,
    customer_ref: code,
    bank_rrn: code,
    // A timestamptz column.
    txn_at: timestamp,
    // Order value and fee ranges ("fees above x% of amount").
    amount: number,
    fee: number,
  },
  // Time order, then size and cost.
  sort: ["txn_at", "amount", "fee"],
  // Newest event first.
  defaultSort: "txn_at",
};

// GET /settlements — the gateway's daily payout batches (FIN-11, FIN-14).
const SETTLEMENTS: Resource = {
  // Object tag.
  object: "settlement",
  // View over nova_settlements.
  view: "nova_settlements_v",
  filters: {
    // The payout UTR, the key a bank credit is matched on.
    settlement_ref: code,
    // Payout day and the capture dates the batch covers.
    settlement_date: date,
    period_start: date,
    period_end: date,
    // Paid out or held back.
    status: oneOf(["settled", "on_hold"]),
    // Batch value and signed adjustments ("adjustments < 0" finds recoveries).
    net_amount: number,
    adjustments: number,
    // The account the batch was paid into.
    payout_account_id: code,
  },
  // Payout day first, then value.
  sort: ["settlement_date", "net_amount", "gross_amount"],
  // Latest batch first.
  defaultSort: "settlement_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const GATEWAY_RESOURCES: Record<string, Resource> = {
  // Rails and methods.
  "payment-channels": PAYMENT_CHANNELS,
  // Payout retry history.
  "payment-attempts": PAYMENT_ATTEMPTS,
  // Web-shop gateway events.
  "gateway-transactions": GATEWAY_TRANSACTIONS,
  // Gateway payout batches.
  settlements: SETTLEMENTS,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const GATEWAY_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /vendor-payments/{id}/payment-attempts: one payment's tries, in order.
  "vendor-payments/payment-attempts": { resource: PAYMENT_ATTEMPTS, parentField: "vendor_payment_id" },
  // /settlements/{id}/gateway-transactions: the rows one batch paid out.
  "settlements/gateway-transactions": { resource: GATEWAY_TRANSACTIONS, parentField: "settlement_id" },
};
