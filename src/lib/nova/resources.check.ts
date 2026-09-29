/*
  Self-check for the Nova filter translator — the API's security boundary.
  Run: node --experimental-strip-types src/lib/nova/resources.check.ts
  Silent on success except the final line; any failed assert throws and exits 1.
*/

// node:assert/strict so equality is ===, not the loose == of legacy assert.
import assert from "node:assert/strict";
// The explicit .ts extension is what plain node needs to resolve the file;
// tsc (bundler resolution, no allowImportingTsExtensions) rejects it, so the
// error is suppressed on this one line only.
// @ts-ignore TS5097 — .ts import extension, required by node --experimental-strip-types
import { RESOURCES, findResource, buildListQuery, buildGetQuery, isValidId } from "./resources.ts";

// Invoices exercise every field kind except boolean; bills cover boolean.
const invoices = RESOURCES.invoices;
// Purchase bills for the boolean fields.
const bills = RESOURCES["purchase-bills"];

// Runs the translator and asserts success, returning the query string.
function ok(resource: typeof invoices, qs: string): string {
  // URLSearchParams decodes exactly as Next's request.nextUrl.searchParams does.
  const result = buildListQuery(resource, new URLSearchParams(qs));
  // Show the error on failure so a broken case is diagnosable.
  assert.equal(result.ok, true, `expected ok for "${qs}": ${JSON.stringify(result)}`);
  // Narrowed by the assert above.
  return (result as { query: string }).query;
}

// Runs the translator and asserts the given error code.
function fails(resource: typeof invoices, qs: string, code: string): void {
  // Same decoding as ok().
  const result = buildListQuery(resource, new URLSearchParams(qs));
  // Must be refused...
  assert.equal(result.ok, false, `expected ${code} for "${qs}", got ${JSON.stringify(result)}`);
  // ...with the right code.
  assert.equal((result as { error: { code: string } }).error.code, code, `wrong code for "${qs}"`);
}

// Default: default sort + tiebreak + default paging.
assert.equal(ok(invoices, ""), "order=invoice_date.desc,id.desc&limit=50&offset=0");
// eq, bare form.
assert.match(ok(invoices, "status=paid"), /^status=eq\.paid&/);
// in: each value double-quoted, then encoded (%22 = ").
assert.match(ok(invoices, "status.in=paid,overdue"), /^status=in\.\(%22paid%22,%22overdue%22\)&/);
// gte on a date.
assert.match(ok(invoices, "invoice_date.gte=2026-01-31"), /^invoice_date=gte\.2026-01-31&/);
// ilike: our wildcards added, value encoded.
assert.match(ok(invoices, "client_name.ilike=acme co"), /^client_name=ilike\.\*acme%20co\*&/);
// boolean eq.
assert.match(ok(bills, "reverse_charge=true"), /^reverse_charge=eq\.true&/);
// Sort + order honoured.
assert.match(ok(invoices, "sort=total_amount&order=asc"), /order=total_amount\.asc,id\.desc/);

// unknown_filter: an unlisted column, PostgREST's own syntax keys, and a
// prototype name (proves the hasOwn guard).
fails(invoices, "nope=1", "unknown_filter");
fails(invoices, "status=paid&select=*", "unknown_filter");
fails(invoices, "or=(id.eq.x)", "unknown_filter");
fails(invoices, "constructor=x", "unknown_filter");
// unsupported_operator: real PostgREST op we don't expose, op not allowed on
// this field, and a double-dot key.
fails(invoices, "status.neq=paid", "unsupported_operator");
fails(invoices, "status.ilike=pa", "unsupported_operator");
fails(invoices, "status.eq.x=paid", "unsupported_operator");
// validation_failed: impossible date, wrong shape, bad enum, bad number, bad boolean.
fails(invoices, "invoice_date.gte=2026-02-30", "validation_failed");
fails(invoices, "invoice_date.gte=yesterday", "validation_failed");
fails(invoices, "status=void", "validation_failed");
fails(invoices, "total_amount.gte=1e5", "validation_failed");
fails(bills, "itc_eligible=yes", "validation_failed");
// ilike of only wildcards is empty after stripping → refused, not match-all.
fails(invoices, "client_name.ilike=*%25*", "validation_failed");

// limit: clamp above 200, refuse 0 / negative / non-integer.
assert.match(ok(invoices, "limit=500"), /&limit=200&/);
assert.match(ok(invoices, "limit=1"), /&limit=1&/);
fails(invoices, "limit=0", "validation_failed");
fails(invoices, "limit=-5", "validation_failed");
fails(invoices, "limit=abc", "validation_failed");
fails(invoices, "offset=-1", "validation_failed");
// sort/order allowlists.
fails(invoices, "sort=items", "validation_failed");
fails(invoices, "order=sideways", "validation_failed");

// Injection: PostgREST syntax in a value is stripped/encoded, never raw.
const injected = ok(invoices, "client_name.ilike=" + encodeURIComponent("a*),or(id.eq.x"));
// User's * removed, parens and comma encoded, so no ")" or "," can close the clause.
assert.match(injected, /^client_name=ilike\.\*a%29%2Cor%28id\.eq\.x\*&/);
// The first clause contains no raw metacharacters at all.
assert.doesNotMatch(injected.split("&")[0].slice("client_name=ilike.".length), /[(),"&]/);
// A quote/backslash inside an `in` element is escaped, then encoded.
assert.match(ok(invoices, "client_id.in=" + encodeURIComponent('a"b\\c')), /^client_id=in\.\(%22a%5C%22b%5C%5Cc%22\)&/);
// "&" in a value cannot start a new PostgREST parameter.
assert.match(ok(invoices, "client_name=" + encodeURIComponent("x&select=*")), /^client_name=eq\.x%26select%3D%2A&/);

// Child-route pin is present and user filters cannot remove it.
const pinned = buildListQuery(RESOURCES.payments, new URLSearchParams("invoice_id=inv_other"), { field: "invoice_id", value: "inv_1" });
// Both the pin and the user's filter are ANDed.
assert.match((pinned as { query: string }).query, /^invoice_id=eq\.inv_1&invoice_id=eq\.inv_other&/);

// Registry lookups ignore prototype keys.
assert.equal(findResource("constructor"), null);
assert.equal(findResource("__proto__"), null);
assert.equal(findResource("invoices"), invoices);
// Id charset gate.
assert.equal(isValidId("inv_8f2c91a4"), true);
assert.equal(isValidId("inv_1,or(x)"), false);
assert.equal(buildGetQuery("inv_8f2c91a4"), "id=eq.inv_8f2c91a4&limit=1");

// Reached only if every assert held.
console.log("resources.check: all assertions passed");
