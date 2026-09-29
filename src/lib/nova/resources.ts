/*
  Nova v1 resource registry + query-string → PostgREST translator.
  Design: docs/nova-api-architecture.md §6.

  WHY ONE REGISTRY: eight resources share identical list/get/filter logic, so
  one table of config beats eight near-copy route files. Adding a resource is a
  registry entry plus a view.

  WHY THIS FILE IS PURE (no imports at all): it is the security boundary between
  an untrusted query string and the database, so it must be testable in
  isolation — resources.check.ts runs it under plain `node` with no Next.js,
  no path aliases and no env vars.

  THE RULE IT ENFORCES: untrusted input reaches PostgREST only as a validated,
  URL-encoded VALUE, never as syntax. Keys (field names, operators, sort
  columns) come from the allowlist below, never from the request.
*/

// The PostgREST operators the public grammar exposes; anything else is refused.
export type Operator = "eq" | "in" | "gte" | "lte" | "gt" | "lt" | "ilike";

// Every operator the grammar recognises. Checked before the per-field list so
// an unknown op ("status.neq", "status.or") can never be looked up anywhere.
const ALL_OPERATORS: readonly Operator[] = ["eq", "in", "gte", "lte", "gt", "lt", "ilike"];

// A field's value type decides how its value is validated before it is sent.
export type FieldType =
  // Free text: any non-empty value up to MAX_VALUE_LENGTH.
  | { kind: "string" }
  // A closed set, e.g. invoice status; the DB CHECK constraints are the source.
  | { kind: "enum"; values: readonly string[] }
  // YYYY-MM-DD that is also a real calendar date (no 2026-02-30).
  | { kind: "date" }
  // A plain decimal; no exponent, hex or Infinity.
  | { kind: "number" }
  // Literal "true" / "false" only.
  | { kind: "boolean" };

// One filterable column: its type plus which operators make sense for it.
export type FilterField = { type: FieldType; ops: readonly Operator[] };

// One API resource, mapped onto one read view.
export type Resource = {
  // The `"object"` tag prepended to every row, as in the reference API.
  object: string;
  // The nova_*_v view it reads (design §4.2 layer 3: views, never tables).
  view: string;
  // Allowlisted filters, keyed by the view's exact column name.
  filters: Record<string, FilterField>;
  // Allowlisted sort columns.
  sort: readonly string[];
  // Default sort column: the resource's date field, else created_at.
  defaultSort: string;
};

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

// --- Field shorthands --------------------------------------------------------
// Named once so every resource gets the same operator set for the same kind of
// column; a per-resource ops list would drift.

// Searchable text (names): exact, one-of, or substring.
const text: FilterField = { type: { kind: "string" }, ops: ["eq", "in", "ilike"] };
// Identifiers and codes: exact or one-of; substring search on an id is meaningless.
const code: FilterField = { type: { kind: "string" }, ops: ["eq", "in"] };
// Dates: exact or a range.
const date: FilterField = { type: { kind: "date" }, ops: ["eq", "gte", "lte", "gt", "lt"] };
// Amounts and quantities: exact or a range.
const number: FilterField = { type: { kind: "number" }, ops: ["eq", "gte", "lte", "gt", "lt"] };
// Flags: only equality means anything.
const bool: FilterField = { type: { kind: "boolean" }, ops: ["eq"] };
// Closed sets: exact or one-of, validated against the allowed values.
function oneOf(values: readonly string[]): FilterField {
  // Returned fresh per call so each resource owns its own value list.
  return { type: { kind: "enum", values }, ops: ["eq", "in"] };
}

// Payment rails, shared by payments.method and expenses.payment_method
// (both CHECKs in 001_schema.sql list the same seven).
const PAYMENT_METHODS = ["upi", "neft", "rtgs", "imps", "cheque", "cash", "card"] as const;
// Invoice/bill status as the VIEW returns it: the stored three plus derived overdue.
const DOCUMENT_STATUS = ["pending", "partial", "paid", "overdue"] as const;

/*
  Top-level resources, keyed by URL segment. Column names are exactly the
  nova_*_v view columns in supabase/nova/001_schema.sql; filters per §6.
*/
export const RESOURCES: Record<string, Resource> = {
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
    },
    sort: ["invoice_date", "due_date", "total_amount", "invoice_number", "created_at"],
    defaultSort: "invoice_date",
  },
  // GET /clients
  clients: {
    object: "client",
    view: "nova_clients_v",
    filters: { name: text, gst_number: code, state: text },
    sort: ["name", "state", "created_at"],
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
    },
    sort: ["payment_date", "amount", "payment_number", "created_at"],
    defaultSort: "payment_date",
  },
  // GET /vendors
  vendors: {
    object: "vendor",
    view: "nova_vendors_v",
    filters: { name: text, gst_number: code, state: text },
    sort: ["name", "state", "created_at"],
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
    },
    sort: ["bill_date", "due_date", "total_amount", "bill_number", "created_at"],
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
    },
    sort: ["expense_date", "total_amount", "expense_number", "created_at"],
    defaultSort: "expense_date",
  },
  // GET /inventory
  inventory: {
    object: "inventory_item",
    view: "nova_inventory_v",
    filters: { sku: text, name: text, hsn_code: code, quantity_on_hand: number },
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
  filters: { movement_type: oneOf(["purchase", "sale", "adjustment"]), movement_date: date },
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
const SUB_RESOURCES: Record<string, SubResource> = {
  // Payments carry invoice_id (FK to nova_invoices).
  "invoices/payments": { resource: RESOURCES.payments, parentField: "invoice_id" },
  // Movements carry item_id (FK to nova_inventory).
  "inventory/movements": { resource: STOCK_MOVEMENTS, parentField: "item_id" },
};

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

/*
  Turns the caller's query string into a PostgREST query string, or a 400.

  `fixed` pins a parent filter for child routes (/invoices/{id}/payments). It
  is applied in addition to — not instead of — any user filters, so a user
  cannot widen it: PostgREST ANDs every filter.
*/
export function buildListQuery(
  // The resource whose allowlist governs this request.
  resource: Resource,
  // The raw request query; URLSearchParams has already percent-decoded it.
  params: URLSearchParams,
  // Optional parent pin for child routes.
  fixed?: { field: string; value: string },
): ListQueryResult {
  // Filter clauses, in request order.
  const clauses: string[] = [];

  // The pin goes first so it is present even if the loop below returns early.
  if (fixed !== undefined) clauses.push(`${fixed.field}=eq.${encodeValue(fixed.value)}`);

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
    // and prototype names, thanks to hasOwn) → unknown_filter.
    if (!Object.hasOwn(resource.filters, field)) {
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
export function buildGetQuery(id: string): string {
  // limit=1: ids are primary keys, so one row is the most there can be.
  return `id=eq.${encodeValue(id)}&limit=1`;
}

// Prepends the `"object"` tag as the first key, as the reference API does.
export function tagRow(resource: Resource, row: Record<string, unknown>): Record<string, unknown> {
  // Spread after, so object is first in key order; views have no "object" column.
  return { object: resource.object, ...row };
}
