/*
  Nova sourcing resources — Tier 2 pack 2e sourcing, roles and integration (docs/nova-tier2-build-contract.md).
  Owned by ONE builder; merged into the registry by resources.ts.
  Column names are exactly the nova_*_v view columns in
  supabase/nova/011_sourcing_roles.sql; slice_no is never listed (the
  translator refuses it and resources.check.ts asserts it).
  nova_source_record_links is the admin-only answer key for source records:
  it has no view and must never get an entry here (contract §2.2.6).
*/

// Field shorthands and the Resource type; fields.ts imports nothing, so no cycle.
import { bool, code, date, number, oneOf, timestamp, type Resource } from "./fields.ts";

// GET /purchase-requisitions — internal buying requests that precede quotes and POs.
const PURCHASE_REQUISITIONS: Resource = {
  // Singular object tag, like every other resource.
  object: "purchase_requisition",
  // The security_invoker view over nova_purchase_requisitions.
  view: "nova_purchase_requisitions_v",
  filters: {
    // Who asked, for which cost centre.
    department_id: code,
    requested_by: code,
    // Stock item requested; null means a service.
    item_id: code,
    // Exactly the CHECK list in 011, so a typo is refused before it reaches SQL.
    status: oneOf(["open", "quoted", "ordered", "cancelled"]),
    // Same rule for the priority CHECK.
    priority: oneOf(["normal", "urgent"]),
    // Request and need-by dates (both date columns, not timestamps).
    created_date: date,
    target_date: date,
    // The PO an ordered requisition became, for joining to purchase-orders.
    po_id: code,
  },
  // Sortable by when it was raised, when it is needed and how big it is.
  sort: ["created_date", "target_date", "budget_amount"],
  // Newest request first.
  defaultSort: "created_date",
};

// GET /supplier-quotes — every vendor quote received against a requisition.
const SUPPLIER_QUOTES: Resource = {
  // Object tag.
  object: "supplier_quote",
  // View over nova_supplier_quotes.
  view: "nova_supplier_quotes_v",
  filters: {
    // One requisition's quotes (the child route pins this too).
    requisition_id: code,
    // One vendor's quoting history.
    vendor_id: code,
    // Quote dates; valid_until may be after the as-of date.
    quote_date: date,
    valid_until: date,
    // The quote that won.
    awarded: bool,
    // Price and speed ranges for comparison queries.
    unit_price: number,
    lead_time_days: number,
  },
  // Sortable by date, price and lead time.
  sort: ["quote_date", "unit_price", "lead_time_days"],
  // Newest quote first.
  defaultSort: "quote_date",
};

// GET /roles — the access roles defined in the finance system.
const ROLES: Resource = {
  // Object tag.
  object: "role",
  // View over nova_roles.
  view: "nova_roles_v",
  filters: {
    // Exactly the 12 role codes in 011's CHECK.
    code: oneOf([
      "ap_clerk", "ap_manager", "vendor_master_admin", "treasury_operator", "treasury_approver", "payroll_admin",
      "procurement_buyer", "procurement_manager", "expense_approver", "finance_controller", "auditor_readonly", "system_admin",
    ]),
    // Privileged roles are the ones an access review looks at first.
    is_privileged: bool,
  },
  // Code is the only natural order for a fixed list.
  sort: ["code"],
  // Alphabetical by code.
  defaultSort: "code",
};

// GET /sod-rules — permission pairs one person must not hold together.
const SOD_RULES: Resource = {
  // Object tag.
  object: "sod_rule",
  // View over nova_sod_rules.
  view: "nova_sod_rules_v",
  filters: {
    // Look a rule up by its code.
    rule_code: code,
    // Exactly the severity CHECK list.
    severity: oneOf(["high", "medium"]),
    // Find the rules a given permission takes part in.
    permission_a: code,
    permission_b: code,
  },
  // Rule code is the natural order.
  sort: ["rule_code"],
  // Alphabetical by rule code.
  defaultSort: "rule_code",
};

// GET /user-role-assignments — who holds which role, granted and revoked when.
const USER_ROLE_ASSIGNMENTS: Resource = {
  // Object tag.
  object: "user_role_assignment",
  // View over nova_user_role_assignments.
  view: "nova_user_role_assignments_v",
  filters: {
    // One employee's roles, or one role's holders (child routes pin these).
    employee_id: code,
    role_id: code,
    // Who granted the access.
    granted_by: code,
    // timestamptz columns, so the timestamp shorthand (never date).
    granted_at: timestamp,
    revoked_at: timestamp,
  },
  // Sortable by grant and revoke time.
  sort: ["granted_at", "revoked_at"],
  // Newest grant first.
  defaultSort: "granted_at",
};

// GET /source-records — raw rows exported by five other systems, in their own formats.
const SOURCE_RECORDS: Resource = {
  // Object tag.
  object: "source_record",
  // View over nova_source_records (never the admin-only links table).
  view: "nova_source_records_v",
  filters: {
    // Exactly the source_system CHECK list.
    source_system: oneOf(["invoicing_app", "bank_export", "gateway_report", "procurement_portal", "crm_export"]),
    // Exactly the record_type CHECK list.
    record_type: oneOf(["invoice", "receipt", "bank_line", "gateway_txn", "settlement", "vendor", "client"]),
    // The id the row carries in its own system.
    external_id: code,
    // timestamptz export time.
    exported_at: timestamp,
  },
  // Sortable by export time and by the external id.
  sort: ["exported_at", "external_id"],
  // Latest export first.
  defaultSort: "exported_at",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const SOURCING_RESOURCES: Record<string, Resource> = {
  // Buying requests.
  "purchase-requisitions": PURCHASE_REQUISITIONS,
  // Competing vendor quotes.
  "supplier-quotes": SUPPLIER_QUOTES,
  // Access roles and their permissions.
  roles: ROLES,
  // Segregation-of-duties rule book.
  "sod-rules": SOD_RULES,
  // Role grants per employee.
  "user-role-assignments": USER_ROLE_ASSIGNMENTS,
  // Multi-system export rows for reconciliation.
  "source-records": SOURCE_RECORDS,
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const SOURCING_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // /purchase-requisitions/{id}/supplier-quotes: one requisition's quotes.
  "purchase-requisitions/supplier-quotes": { resource: SUPPLIER_QUOTES, parentField: "requisition_id" },
  // /roles/{id}/user-role-assignments: everyone holding one role.
  "roles/user-role-assignments": { resource: USER_ROLE_ASSIGNMENTS, parentField: "role_id" },
  // /employees/{id}/user-role-assignments: one employee's access.
  "employees/user-role-assignments": { resource: USER_ROLE_ASSIGNMENTS, parentField: "employee_id" },
};
