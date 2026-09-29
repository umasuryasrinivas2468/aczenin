/*
  Nova registry building blocks: the types and field shorthands every resource
  definition uses. Split out of resources.ts on 2026-09-29 so each domain can
  own its own resource file (resources.<domain>.ts) without a circular import:
  domain files and resources.ts both import from HERE, and this file imports
  nothing — so it stays loadable under plain node for resources.check.ts.
*/

// The PostgREST operators the public grammar exposes; anything else is refused.
export type Operator = "eq" | "in" | "gte" | "lte" | "gt" | "lt" | "ilike";

// Every operator the grammar recognises. Checked before the per-field list so
// an unknown op ("status.neq", "status.or") can never be looked up anywhere.
export const ALL_OPERATORS: readonly Operator[] = ["eq", "in", "gte", "lte", "gt", "lt", "ilike"];

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

// --- Field shorthands --------------------------------------------------------
// Named once so every resource gets the same operator set for the same kind of
// column; a per-resource ops list would drift.

// Searchable text (names): exact, one-of, or substring.
export const text: FilterField = { type: { kind: "string" }, ops: ["eq", "in", "ilike"] };
// Identifiers and codes: exact or one-of; substring search on an id is meaningless.
export const code: FilterField = { type: { kind: "string" }, ops: ["eq", "in"] };
// Dates: exact or a range.
export const date: FilterField = { type: { kind: "date" }, ops: ["eq", "gte", "lte", "gt", "lt"] };
// Amounts and quantities: exact or a range.
export const number: FilterField = { type: { kind: "number" }, ops: ["eq", "gte", "lte", "gt", "lt"] };
// Flags: only equality means anything.
export const bool: FilterField = { type: { kind: "boolean" }, ops: ["eq"] };
// Closed sets: exact or one-of, validated against the allowed values.
export function oneOf(values: readonly string[]): FilterField {
  // Returned fresh per call so each resource owns its own value list.
  return { type: { kind: "enum", values }, ops: ["eq", "in"] };
}

// Payment rails, shared by payments.method and expenses.payment_method
// (both CHECKs in 001_schema.sql list the same seven).
export const PAYMENT_METHODS = ["upi", "neft", "rtgs", "imps", "cheque", "cash", "card"] as const;
// Invoice/bill status as the VIEW returns it: the stored three plus derived overdue.
export const DOCUMENT_STATUS = ["pending", "partial", "paid", "overdue"] as const;

