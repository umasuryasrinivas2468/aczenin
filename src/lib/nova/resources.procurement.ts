/*
  Nova procurement resources — Tier 1 (docs/nova-tier1-build-contract.md §5).
  Owned by ONE worker; merged into the registry by resources.ts.
  Column names are exactly the nova_*_v views in supabase/nova/006_procurement.sql.
  slice_no is deliberately absent everywhere: the translator pins it and strips it.
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle.
import { code, date, number, oneOf, type Resource } from "./fields.ts";

// PO lifecycle, copied from the nova_purchase_orders status CHECK so the API
// rejects a value the database could never hold.
const PO_STATUS = ["open", "partially_received", "received", "closed", "cancelled"] as const;
// How a PO was sourced, from the nova_purchase_orders channel CHECK.
const PO_CHANNEL = ["catalog", "contract", "off_contract"] as const;

// GET /goods-receipts — defined as a const first because the child route
// /purchase-orders/{id}/goods-receipts reuses the very same object.
const GOODS_RECEIPTS: Resource = {
  // Singular object tag, as every other resource uses.
  object: "goods_receipt",
  // The read view; the API never touches the table itself.
  view: "nova_goods_receipts_v",
  filters: {
    // The PO a receipt belongs to, the join a three-way match starts from.
    po_id: code,
    // Human-facing receipt number, looked up exactly.
    grn_number: code,
    // Range filters for delivery-trend questions ("last four months").
    received_date: date,
    // Who signed for the goods, for segregation-of-duties checks.
    received_by: code,
  },
  // Receipt date first: it is the date every receiving question sorts on.
  sort: ["received_date", "grn_number", "created_at"],
  // Newest deliveries first, like every other dated resource.
  defaultSort: "received_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const PROCUREMENT_RESOURCES: Record<string, Resource> = {
  // GET /vendor-contracts — hyphenated URL, underscored view, as elsewhere.
  "vendor-contracts": {
    object: "vendor_contract",
    view: "nova_vendor_contracts_v",
    filters: {
      // Which supplier and which stock item the rate card covers.
      vendor_id: code,
      item_id: code,
      // Price comparisons against purchase orders need a numeric range.
      contract_price: number,
      // Validity window, so "contracts active on date X" is two filters.
      valid_from: date,
      valid_to: date,
    },
    // valid_from first: contracts are read in the order they took effect.
    sort: ["valid_from", "valid_to", "contract_price", "created_at"],
    defaultSort: "valid_from",
  },
  // GET /purchase-orders
  "purchase-orders": {
    object: "purchase_order",
    view: "nova_purchase_orders_v",
    filters: {
      // Closed sets validated against the CHECK values above.
      status: oneOf(PO_STATUS),
      channel: oneOf(PO_CHANNEL),
      // Exact lookups on the foreign keys analysts group by.
      vendor_id: code,
      department_id: code,
      raised_by: code,
      po_number: code,
      // Order and promised dates, for lead-time and split-order windows.
      order_date: date,
      promised_date: date,
      // Value ranges, e.g. "just under the approval limit".
      total_amount: number,
    },
    // Order date first, matching the (slice_no, order_date desc) index.
    sort: ["order_date", "promised_date", "total_amount", "po_number", "created_at"],
    defaultSort: "order_date",
  },
  // GET /goods-receipts
  "goods-receipts": GOODS_RECEIPTS,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const PROCUREMENT_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /purchase-orders/{id}/goods-receipts: receipts carry po_id (FK to nova_purchase_orders).
  "purchase-orders/goods-receipts": { resource: GOODS_RECEIPTS, parentField: "po_id" },
};
