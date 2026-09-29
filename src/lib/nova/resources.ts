/*
  Nova v1 resource registry + query-string → PostgREST translator.
  Design: docs/nova-api-architecture.md §6.

  WHY ONE REGISTRY: eight resources share identical list/get/filter logic, so
  one table of config beats eight near-copy route files. Adding a resource is a
  registry entry plus a view.

  WHY THIS FILE IS PURE (its only import is ./fields.ts, which imports
  nothing): it is the security boundary between an untrusted query string and
  the database, so it must be testable in isolation — resources.check.ts runs
  it under plain `node` with no Next.js, no path aliases and no env vars. The
  explicit ".ts" extensions are what plain node needs; tsconfig's
  allowImportingTsExtensions lets tsc and Next accept them.

  THE RULE IT ENFORCES: untrusted input reaches PostgREST only as a validated,
  URL-encoded VALUE, never as syntax. Keys (field names, operators, sort
  columns) come from the allowlist below, never from the request.
*/

// Types and field shorthands live in fields.ts (no imports), so domain files can
// share them without a circular import through this module.
import {
  ALL_OPERATORS,
  bool,
  code,
  date,
  DOCUMENT_STATUS,
  number,
  oneOf,
  PAYMENT_METHODS,
  text,
  type FieldType,
  type FilterField,
  type Operator,
  type Resource,
} from "./fields.ts";
// Re-exported so existing importers (route.ts, docs pages) keep working unchanged.
export type { FieldType, FilterField, Operator, Resource } from "./fields.ts";

// Error codes this module can produce; the route maps them to HTTP 400.
export type QueryErrorCode = "validation_failed" | "unknown_filter" | "unsupported_operator";

// A structured 400, carried back to the route rather than thrown, so the
// caller cannot forget to handle it (it is part of the return type).
export type QueryError = {
  // Machine-readable code for the error envelope.
  code: QueryErrorCode;
  // Human-readable message for the error envelope.
  message: string;
  // Per-field issues, the reference API's `details.issues` shape.
  details?: { issues: { field: string; message: string }[] };
};

// Either a ready PostgREST query string or the reason it was refused.
export type ListQueryResult =
  // limit/offset are echoed back so the route can build `pagination`.
  | { ok: true; query: string; limit: number; offset: number }
  | { ok: false; error: QueryError };

// Reference API bounds: limit 1–200, default 50.
export const DEFAULT_LIMIT = 50;
// Upper bound; larger requests are clamped rather than refused (see parseLimit).
export const MAX_LIMIT = 200;
// Caps one value's length so a megabyte query string cannot become a
// megabyte ilike pattern the database has to scan with.
const MAX_VALUE_LENGTH = 200;
// Caps `in` lists for the same reason: bounded work per request.
const MAX_IN_VALUES = 100;
// Query keys that are paging controls, not filters.
const RESERVED_KEYS = new Set(["limit", "offset", "sort", "order"]);

/*
  Top-level resources, keyed by URL segment. Column names are exactly the
  nova_*_v view columns in supabase/nova/001_schema.sql; filters per §6.
*/
const CORE_RESOURCES: Record<string, Resource> = {
  // GET /invoices
  invoices: {
    object: "invoice",
    view: "nova_invoices_v",
    filters: {
      status: oneOf(DOCUMENT_STATUS),
      invoice_date: date,
      due_date: date,
      client_id: code,
      client_name: text,
      total_amount: number,
      invoice_number: text,
      // Tier 0 (005): which unit and rep sold it, and the trade discount.
      business_unit_id: code,
      sales_rep_id: code,
      discount_amount: number,
    },
    sort: ["invoice_date", "due_date", "total_amount", "invoice_number", "created_at"],
    defaultSort: "invoice_date",
  },
  // GET /clients
  clients: {
    object: "client",
    view: "nova_clients_v",
    filters: {
      name: text,
      gst_number: code,
      state: text,
      // Tier 0 (005): segmentation and ownership, the CRM/credit questions.
      segment: oneOf(["enterprise", "mid_market", "smb"]),
      industry: text,
      // The four regions 002 derives from the state.
      region: oneOf(["South", "West", "North", "East"]),
      credit_limit: number,
      payment_terms_days: number,
      account_owner_id: code,
      business_unit_id: code,
      // Identifier, so exact match only.
      pan: code,
      state_code: code,
    },
    sort: ["name", "state", "credit_limit", "created_at"],
    // Clients have no business date, so newest-created first.
    defaultSort: "created_at",
  },
  // GET /quotations
  quotations: {
    object: "quotation",
    view: "nova_quotations_v",
    filters: {
      // The full lifecycle from the nova_quotations CHECK.
      status: oneOf(["draft", "sent", "accepted", "rejected", "expired", "converted"]),
      quotation_date: date,
      client_id: code,
      client_name: text,
      total_amount: number,
      // Tier 0 (005): the rep who raised the quote.
      sales_rep_id: code,
    },
    sort: ["quotation_date", "valid_until", "total_amount", "quotation_number", "created_at"],
    defaultSort: "quotation_date",
  },
  // GET /payments
  payments: {
    object: "payment",
    view: "nova_payments_v",
    filters: {
      payment_date: date,
      method: oneOf(PAYMENT_METHODS),
      invoice_id: code,
      client_id: code,
      amount: number,
      // Tier 0 (005): TDS withheld, and the bank line 008 links it to.
      tds_deducted: number,
      bank_transaction_id: code,
    },
    sort: ["payment_date", "amount", "payment_number", "created_at"],
    defaultSort: "payment_date",
  },
  // GET /vendors
  vendors: {
    object: "vendor",
    view: "nova_vendors_v",
    filters: {
      name: text,
      gst_number: code,
      state: text,
      // Tier 0 (005): supplier risk, terms and master-data fields.
      category: text,
      criticality: oneOf(["high", "medium", "low"]),
      payment_terms_days: number,
      state_code: code,
      pan: code,
      created_by: code,
      status: oneOf(["active", "blocked", "pending_verification"]),
    },
    sort: ["name", "state", "payment_terms_days", "created_at"],
    defaultSort: "created_at",
  },
  // GET /purchase-bills — hyphenated URL, underscored view, as in the reference.
  "purchase-bills": {
    object: "purchase_bill",
    view: "nova_purchase_bills_v",
    filters: {
      status: oneOf(DOCUMENT_STATUS),
      bill_date: date,
      due_date: date,
      vendor_id: code,
      vendor_name: text,
      total_amount: number,
      reverse_charge: bool,
      itc_eligible: bool,
      // The vendor's own invoice number (no longer unique: duplicates are
      // what A1 detection looks for), matched exactly or by substring.
      bill_number: text,
      // Tier 0 (005): procurement links (filled by 006), who keyed it,
      // approval state and the goods-received date.
      po_id: code,
      grn_id: code,
      submitted_by: code,
      approval_status: oneOf(["pending", "approved", "rejected"]),
      received_date: date,
    },
    sort: ["bill_date", "due_date", "received_date", "total_amount", "bill_number", "created_at"],
    defaultSort: "bill_date",
  },
  // GET /expenses
  expenses: {
    object: "expense",
    view: "nova_expenses_v",
    filters: {
      // The ten categories from the nova_expenses CHECK.
      category: oneOf([
        "rent", "travel", "software", "utilities", "office_supplies",
        "professional_fees", "marketing", "meals", "salaries", "other",
      ]),
      expense_date: date,
      payment_method: oneOf(PAYMENT_METHODS),
      total_amount: number,
      // Payee search.
      vendor_name: text,
      // Tier 0 (005): who spent it, for which cost centre and customer.
      employee_id: code,
      department_id: code,
      business_unit_id: code,
      client_id: code,
      recurring: bool,
    },
    sort: ["expense_date", "total_amount", "expense_number", "created_at"],
    defaultSort: "expense_date",
  },
  // GET /inventory
  inventory: {
    object: "inventory_item",
    view: "nova_inventory_v",
    filters: {
      sku: text,
      name: text,
      hsn_code: code,
      quantity_on_hand: number,
      // The view's low-stock flag, the first thing a reorder report asks.
      below_reorder_level: bool,
      // Tier 0 (005): sourcing facts for supplier-risk questions.
      primary_vendor_id: code,
      lead_time_days: number,
      single_source: bool,
    },
    sort: ["name", "sku", "quantity_on_hand", "created_at"],
    defaultSort: "created_at",
  },
};

// Stock movements are only reachable as /inventory/{id}/movements, so they are
// not a top-level key (that would expose /stock-movements, which §6 does not).
const STOCK_MOVEMENTS: Resource = {
  object: "stock_movement",
  view: "nova_stock_movements_v",
  // Not listed in §6; these two are the obvious ones for an audit trail.
  filters: {
    movement_type: oneOf(["purchase", "sale", "adjustment"]),
    movement_date: date,
    // The invoice or bill number that caused the movement.
    reference: text,
    // Tier 0 (005): location and cost.
    warehouse: text,
    unit_cost: number,
  },
  sort: ["movement_date", "quantity", "created_at"],
  defaultSort: "movement_date",
};

// A child list scoped to one parent row, e.g. /invoices/{id}/payments.
export type SubResource = {
  // Which resource's view, filters and sort the child list uses.
  resource: Resource;
  // The child's foreign-key column pinned to the parent id.
  parentField: string;
};

// Child routes, keyed "<parent segment>/<child segment>".
const CORE_SUB_RESOURCES: Record<string, SubResource> = {
  // Payments carry invoice_id (FK to nova_invoices).
  "invoices/payments": { resource: CORE_RESOURCES.payments, parentField: "invoice_id" },
  // Movements carry item_id (FK to nova_inventory).
  "inventory/movements": { resource: STOCK_MOVEMENTS, parentField: "item_id" },
};

/*
  Domain registries (Tier 1, 2026-09-29). Each domain owns one file and exports
  a resource map plus a child-route map; this module merges them. Separate
  files so parallel workers never edit the same file (write-ownership
  partitioning) and so a domain's resources can be reviewed as one unit.
*/
import { ORG_RESOURCES, ORG_SUB_RESOURCES } from "./resources.org.ts";
import { PROCUREMENT_RESOURCES, PROCUREMENT_SUB_RESOURCES } from "./resources.procurement.ts";
import { BANKING_RESOURCES, BANKING_SUB_RESOURCES } from "./resources.banking.ts";
import { PAYABLES_RESOURCES, PAYABLES_SUB_RESOURCES } from "./resources.payables.ts";

// Merges maps and THROWS on a duplicate key at module load. Without the guard,
// a later spread would silently replace an earlier resource — e.g. a domain
// file redefining "invoices" — and the first sign would be wrong API output.
function mergeUnique<T>(label: string, maps: Record<string, T>[]): Record<string, T> {
  // Accumulator; a null prototype so keys like "constructor" cannot collide
  // with Object.prototype during the duplicate check.
  const out: Record<string, T> = Object.create(null);
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      // Fail loudly at startup, which fails the build and every test run.
      if (Object.hasOwn(out, key)) throw new Error(`Duplicate ${label} key in Nova registry: ${key}`);
      out[key] = value;
    }
  }
  // Frozen: the registry is config, and nothing may mutate it per request.
  return Object.freeze(out);
}

// Every top-level resource: the original nine plus each domain's.
export const RESOURCES: Record<string, Resource> = mergeUnique("resource", [
  CORE_RESOURCES,
  ORG_RESOURCES,
  PROCUREMENT_RESOURCES,
  BANKING_RESOURCES,
  PAYABLES_RESOURCES,
]);

// Every child route, keyed "<parent segment>/<child segment>".
const SUB_RESOURCES: Record<string, SubResource> = mergeUnique("child route", [
  CORE_SUB_RESOURCES,
  ORG_SUB_RESOURCES,
  PROCUREMENT_SUB_RESOURCES,
  BANKING_SUB_RESOURCES,
  PAYABLES_SUB_RESOURCES,
]);

/*
  Registry lookups. Object.hasOwn, not `RESOURCES[segment]`: a plain index
  would resolve "constructor" or "__proto__" to Object.prototype members and
  hand the route a truthy non-resource.
*/
export function findResource(segment: string): Resource | null {
  // Own keys only; anything else is an unknown path.
  return Object.hasOwn(RESOURCES, segment) ? RESOURCES[segment] : null;
}

// Same own-key guard for "<parent>/<child>".
export function findSubResource(parent: string, child: string): SubResource | null {
  // Joined key is safe to build: both parts are only used as a lookup string.
  const key = `${parent}/${child}`;
  return Object.hasOwn(SUB_RESOURCES, key) ? SUB_RESOURCES[key] : null;
}

// Every child route under one parent segment, e.g. "purchase-orders" →
// [{ child: "goods-receipts", … }]. Exported so the docs list children from the
// real table instead of probing candidate names, which would silently miss a
// child segment that is not also a top-level resource key.
export function childRoutesOf(parent: string): { child: string; sub: SubResource }[] {
  // Keys are "<parent>/<child>"; the prefix match includes the slash so
  // "vendors" never matches "vendors-archive/…".
  const prefix = `${parent}/`;
  return Object.keys(SUB_RESOURCES)
    .filter((key) => key.startsWith(prefix))
    .map((key) => ({ child: key.slice(prefix.length), sub: SUB_RESOURCES[key] }));
}

// Path ids: our ids are "inv_8f2c91a4"-shaped. Rejecting anything outside this
// charset lets the route answer 404 without a database round trip.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// True when a path segment could be a real id.
export function isValidId(id: string): boolean {
  // typeof guard: a missing segment arrives as undefined.
  return typeof id === "string" && ID_PATTERN.test(id);
}

/*
  encodeURIComponent leaves ! ' ( ) * unescaped. PostgREST decodes before it
  parses, so this is belt-and-braces rather than load-bearing — but it means a
  value can never contain a raw PostgREST metacharacter, which is easier to
  reason about than "raw but harmless in this position".
*/
export function encodeValue(value: string): string {
  // Escape the five leftovers as %XX.
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// PostgREST `in` list element: double-quoted, with " and \ backslash-escaped,
// so a value containing a comma or parenthesis stays one element.
function quoteInValue(value: string): string {
  // Escape the two characters that are special inside a quoted element.
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

// Real-calendar check: Date.UTC rolls 2026-02-30 over to March, so comparing
// the parts back catches impossible dates the regex alone would accept.
function isRealDate(value: string): boolean {
  // Shape first; also rejects times, timezones and 5-digit years.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Split into numbers for the round-trip.
  const [y, m, d] = value.split("-").map(Number);
  // Month is 0-based in Date.UTC.
  const parsed = new Date(Date.UTC(y, m - 1, d));
  // Any rollover changes at least one part.
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

// Full ISO timestamp: date, T, hh:mm[:ss[.ffffff]], then Z or ±hh:mm. The zone
// is mandatory so the instant never depends on the DB session's TimeZone.
const ISO_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,6})?)?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/;

// A timestamp value is either a real calendar date or a strict ISO timestamp
// whose date part is also real (the regex alone accepts 2026-02-30T…).
function isTimestampValue(value: string): boolean {
  // Date-only form, widened to the day later by timestampClauses.
  if (isRealDate(value)) return true;
  // Otherwise the full form; group 1 is its date part.
  const match = ISO_TIMESTAMP.exec(value);
  // Both the shape and the calendar must hold.
  return match !== null && isRealDate(match[1]);
}

// The UTC day after a YYYY-MM-DD date, as YYYY-MM-DD. Date.UTC rolls month and
// year ends over, so 2026-12-31 → 2027-01-01 without calendar code of our own.
function nextDay(date: string): string {
  // Parts of an already-validated date.
  const [y, m, d] = date.split("-").map(Number);
  // d + 1 overflows into the next month/year exactly as the calendar does.
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/*
  PostgREST clauses for one timestamp filter. A bare date on a timestamptz
  column means midnight, so "eq.2026-01-05" would match only 00:00:00 and
  "lte.2026-01-05" would drop the whole 5th. A date-only value therefore means
  the whole UTC day [D, D+1) and each operator is rewritten to that range:
    eq D  → gte D & lt D+1      lte D → lt D+1      gt D → gte D+1
    gte D → gte D (unchanged)   lt D  → lt D (unchanged)
  A full ISO timestamp is an exact instant and passes through as-is.
  ponytail: "day" is the UTC day; per-team timezones would need an offset input.
*/
function timestampClauses(field: string, op: Operator, value: string): string[] {
  // An exact instant needs no widening.
  if (!isRealDate(value)) return [`${field}=${op}.${encodeValue(value)}`];
  // Exclusive upper bound of the day; dates are digits and dashes, nothing to encode.
  const next = nextDay(value);
  // Two clauses on one key are fine: PostgREST ANDs repeated filters.
  if (op === "eq") return [`${field}=gte.${value}`, `${field}=lt.${next}`];
  // "On or before D" includes all of D.
  if (op === "lte") return [`${field}=lt.${next}`];
  // "After D" starts once D is over.
  if (op === "gt") return [`${field}=gte.${next}`];
  // gte and lt already mean "from D's start" / "before D's start".
  return [`${field}=${op}.${value}`];
}

// Validates one value against its field type; returns an issue message or null.
function checkValue(type: FieldType, value: string): string | null {
  // Empty values would become "eq." — a filter on the empty string nobody meant.
  if (value === "") return "must not be empty";
  // Bounded work per request (see MAX_VALUE_LENGTH).
  if (value.length > MAX_VALUE_LENGTH) return `must be at most ${MAX_VALUE_LENGTH} characters`;
  // Per-type rules.
  switch (type.kind) {
    // Text is accepted as-is; encoding makes it inert.
    case "string":
      return null;
    // Closed set: listing the options makes the error self-serve.
    case "enum":
      return type.values.includes(value) ? null : `must be one of: ${type.values.join(", ")}`;
    // Calendar dates only.
    case "date":
      return isRealDate(value) ? null : "must be a real date in YYYY-MM-DD format";
    // A day or an exact instant; anything else is refused before PostgREST sees it.
    case "timestamp":
      return isTimestampValue(value) ? null : "must be YYYY-MM-DD or an ISO timestamp with Z or an offset (e.g. 2026-01-05T09:30:00Z)";
    // Plain decimals: the regex rules out 1e5, 0x10, Infinity and NaN, which
    // Number() would accept or Postgres would reject with an upstream error.
    case "number":
      return /^-?\d{1,12}(\.\d{1,3})?$/.test(value) ? null : "must be a number";
    // Only the two literals PostgREST's boolean parsing is unambiguous on.
    case "boolean":
      return value === "true" || value === "false" ? null : "must be true or false";
  }
}

// Shorthand for a single-issue validation_failed.
function invalid(field: string, message: string): ListQueryResult {
  // Top-level message names the field; details carry the structured form.
  return {
    ok: false,
    error: { code: "validation_failed", message: `Invalid value for '${field}': ${message}.`, details: { issues: [{ field, message }] } },
  };
}

/*
  limit: integers only; below 1 is refused, above MAX_LIMIT is clamped. Clamping
  (not refusing) the top end means a client asking for "all" still gets a
  well-formed page and learns the ceiling from pagination.limit.
*/
function parseLimit(raw: string | null): number | string {
  // Absent → default.
  if (raw === null) return DEFAULT_LIMIT;
  // Digits only; 9 caps it well inside safe-integer range.
  if (!/^\d{1,9}$/.test(raw)) return "must be an integer between 1 and 200";
  // Parse once validated.
  const n = Number(raw);
  // Zero rows per page is never useful and would make has_more meaningless.
  if (n < 1) return "must be an integer between 1 and 200";
  // Clamp the top end.
  return Math.min(n, MAX_LIMIT);
}

// offset: non-negative integer, default 0.
function parseOffset(raw: string | null): number | string {
  // Absent → start of the list.
  if (raw === null) return 0;
  // Digits only, bounded, so no negative or fractional offsets.
  if (!/^\d{1,9}$/.test(raw)) return "must be a non-negative integer";
  // Safe to convert.
  return Number(raw);
}

// The per-team slice column (supabase/nova/004_team_slices.sql). Server-set
// only: it is never in any resource's filters or sort, and never returned.
export const SLICE_FIELD = "slice_no";

/*
  The mandatory slice pin, as a PostgREST clause. Throws rather than returns a
  400 on a bad value: sliceNo comes from the auth RPC, never the caller, so a
  non-integer here is a server bug and must fail closed (the route → 502)
  instead of silently reading an unpinned query.
*/
function slicePin(sliceNo: number): string {
  // Integer >= 0 is what the DB CHECK allows; anything else is a bug upstream.
  if (!Number.isSafeInteger(sliceNo) || sliceNo < 0) throw new Error(`Invalid slice number: ${String(sliceNo)}`);
  // Number → decimal string: no user bytes, nothing to encode.
  return `${SLICE_FIELD}=eq.${sliceNo}`;
}

/*
  Turns the caller's query string into a PostgREST query string, or a 400.

  `sliceNo` is REQUIRED, not optional, so no call site can forget the team
  pin: it is the tenant boundary between teams (004_team_slices.sql).
  `parent` pins a parent filter for child routes (/invoices/{id}/payments).
  Both are applied in addition to — not instead of — any user filters, and
  the caller cannot name slice_no at all, so neither pin can be widened:
  PostgREST ANDs every filter.
*/
export function buildListQuery(
  // The resource whose allowlist governs this request.
  resource: Resource,
  // The raw request query; URLSearchParams has already percent-decoded it.
  params: URLSearchParams,
  // The authenticated key's slice, from nova_authenticate_key.
  sliceNo: number,
  // Optional parent pin for child routes.
  parent?: { field: string; value: string },
): ListQueryResult {
  // Filter clauses; the slice pin first so it is present on every query built.
  const clauses: string[] = [slicePin(sliceNo)];

  // The parent pin next, likewise independent of anything the caller sends.
  if (parent !== undefined) clauses.push(`${parent.field}=eq.${encodeValue(parent.value)}`);

  // Every non-reserved key must be a known field with an allowed operator.
  for (const [key, rawValue] of params) {
    // Paging keys are handled after the loop.
    if (RESERVED_KEYS.has(key)) continue;

    // "field" or "field.op" — at most one dot; field names contain none.
    const parts = key.split(".");
    // Name part; everything the allowlist is keyed on.
    const field = parts[0];
    // Bare "field=" means equality, as in the reference grammar.
    const op = parts.length === 1 ? "eq" : parts[1];

    // Unknown field (including select/or/and — PostgREST's own syntax keys —
    // and prototype names, thanks to hasOwn) → unknown_filter. slice_no is
    // refused by name too, so even a future registry entry that lists it by
    // mistake cannot let a caller add a second, conflicting slice filter.
    if (field === SLICE_FIELD || !Object.hasOwn(resource.filters, field)) {
      // List the real filters so the error is self-serve.
      return {
        ok: false,
        error: {
          code: "unknown_filter",
          message: `Unknown filter '${field}'. Allowed: ${Object.keys(resource.filters).join(", ")}.`,
          details: { issues: [{ field: key, message: "unknown filter" }] },
        },
      };
    }

    // The field's declared type and ops.
    const spec = resource.filters[field];
    // Too many dots, an operator we do not expose, or one this field disallows.
    if (parts.length > 2 || !ALL_OPERATORS.includes(op as Operator) || !spec.ops.includes(op as Operator)) {
      // Name the allowed ops for this field.
      return {
        ok: false,
        error: {
          code: "unsupported_operator",
          message: `Operator '${parts.slice(1).join(".")}' is not supported on '${field}'. Allowed: ${spec.ops.join(", ")}.`,
          details: { issues: [{ field: key, message: "unsupported operator" }] },
        },
      };
    }

    // `in`: comma-separated list, each element validated and quoted.
    if (op === "in") {
      // Split on commas; the user cannot quote, so a comma always separates.
      const values = rawValue.split(",");
      // Bounded list size.
      if (values.length > MAX_IN_VALUES) return invalid(key, `must list at most ${MAX_IN_VALUES} values`);
      // Every element must pass the field's type.
      for (const v of values) {
        // First bad element wins; one clear error beats a list of them.
        const issue = checkValue(spec.type, v);
        if (issue !== null) return invalid(key, issue);
      }
      // Structural ( , ) stay raw; each quoted element is fully encoded.
      clauses.push(`${field}=in.(${values.map((v) => encodeValue(quoteInValue(v))).join(",")})`);
      // Next key.
      continue;
    }

    // `ilike`: substring search. Wildcards are OURS, never the user's — strip
    // * and % so "a*" cannot turn into a prefix scan or an everything-match.
    // ponytail: `_` (single-char wildcard) is left in, so "a_b" also matches
    // "axb"; escape it with a backslash if exact-substring semantics matter.
    const value = op === "ilike" ? rawValue.replace(/[*%]/g, "") : rawValue;
    // Type check the (possibly stripped) value.
    const issue = checkValue(spec.type, value);
    if (issue !== null) return invalid(key, issue);
    // Timestamps may expand to a day range, so they build their own clauses.
    if (spec.type.kind === "timestamp") {
      // Validated above; op is one of the five range/eq ops the shorthand allows.
      clauses.push(...timestampClauses(field, op as Operator, value));
      // Next key.
      continue;
    }
    // ilike gets *…* (PostgREST's wildcard); everything else is a bare value.
    const operand = op === "ilike" ? `*${encodeValue(value)}*` : encodeValue(value);
    // Key and op come from the allowlist; only the operand is user-derived.
    clauses.push(`${field}=${op}.${operand}`);
  }

  // Paging, validated after filters so a bad filter is reported first.
  const limit = parseLimit(params.get("limit"));
  if (typeof limit === "string") return invalid("limit", limit);
  // Same for offset.
  const offset = parseOffset(params.get("offset"));
  if (typeof offset === "string") return invalid("offset", offset);

  // Sort column must be allowlisted; it becomes PostgREST syntax, so it cannot
  // be a free value.
  const sort = params.get("sort") ?? resource.defaultSort;
  if (!resource.sort.includes(sort)) return invalid("sort", `must be one of: ${resource.sort.join(", ")}`);
  // Direction: asc|desc, newest-first by default like the reference.
  const order = params.get("order") ?? "desc";
  if (order !== "asc" && order !== "desc") return invalid("order", "must be asc or desc");

  // id.desc tiebreak: many rows share a date, and without a unique last key
  // Postgres may order ties differently per query, so offset pages would
  // skip or repeat rows.
  clauses.push(`order=${sort}.${order},id.desc`);
  // Paging last.
  clauses.push(`limit=${limit}`, `offset=${offset}`);

  // Joined with & — every piece is either allowlisted or encoded.
  return { ok: true, query: clauses.join("&"), limit, offset };
}

// Single-row query for GET /{resource}/{id}; callers check isValidId first.
// Slice-pinned like lists, so another team's id reads as zero rows → the same
// 404 as a missing row, and ids cannot be probed across slices.
export function buildGetQuery(id: string, sliceNo: number): string {
  // limit=1: ids are primary keys, so one row is the most there can be.
  return `${slicePin(sliceNo)}&id=eq.${encodeValue(id)}&limit=1`;
}

// Shapes a view row for the client: `"object"` tag first (as the reference
// API does) and slice_no removed, so the partitioning never leaks into JSON.
export function tagRow(resource: Resource, row: Record<string, unknown>): Record<string, unknown> {
  // Destructure slice_no out; the rest is the public shape.
  const { [SLICE_FIELD]: _slice, ...rest } = row;
  // Spread after, so object is first in key order; views have no "object" column.
  return { object: resource.object, ...rest };
}
