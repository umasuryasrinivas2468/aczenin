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
import { RESOURCES, findResource, buildListQuery, buildGetQuery, isValidId, tagRow, findSubResource } from "./resources.ts";

// Invoices exercise every field kind except boolean; bills cover boolean.
const invoices = RESOURCES.invoices;
// Purchase bills for the boolean fields.
const bills = RESOURCES["purchase-bills"];

// A non-zero slice, so a pin that silently fell back to 0 would be caught.
const SLICE = 3;
// The clause every query must start with.
const PIN = `slice_no=eq.${SLICE}&`;

// Runs the translator and asserts success, returning the query string with
// the (asserted) slice pin removed, so the filter asserts below stay readable.
function ok(resource: typeof invoices, qs: string): string {
  // URLSearchParams decodes exactly as Next's request.nextUrl.searchParams does.
  const result = buildListQuery(resource, new URLSearchParams(qs), SLICE);
  // Show the error on failure so a broken case is diagnosable.
  assert.equal(result.ok, true, `expected ok for "${qs}": ${JSON.stringify(result)}`);
  // Narrowed by the assert above.
  const query = (result as { query: string }).query;
  // The slice pin is on EVERY successful list query, first.
  assert.ok(query.startsWith(PIN), `slice pin missing for "${qs}": ${query}`);
  // Exactly one slice clause: nothing the caller sent added a second.
  assert.equal(query.split("&").filter((c) => c.startsWith("slice_no=")).length, 1, `extra slice clause for "${qs}"`);
  // Rest of the query for the per-case asserts.
  return query.slice(PIN.length);
}

// Runs the translator and asserts the given error code.
function fails(resource: typeof invoices, qs: string, code: string): void {
  // Same decoding as ok().
  const result = buildListQuery(resource, new URLSearchParams(qs), SLICE);
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
const pinned = buildListQuery(RESOURCES.payments, new URLSearchParams("invoice_id=inv_other"), SLICE, { field: "invoice_id", value: "inv_1" });
// Slice pin, then parent pin, then the user's filter — all ANDed.
assert.match((pinned as { query: string }).query, /^slice_no=eq\.3&invoice_id=eq\.inv_1&invoice_id=eq\.inv_other&/);

// --- Team slices (004_team_slices.sql) --------------------------------------
// Caller cannot name slice_no in any form: bare, with an operator, duplicated.
fails(invoices, "slice_no=5", "unknown_filter");
fails(invoices, "slice_no.in=0,1,2", "unknown_filter");
fails(invoices, "slice_no.gte=0", "unknown_filter");
fails(invoices, "slice_no=3&slice_no=5", "unknown_filter");
// ...nor smuggle it through PostgREST's logic keys.
fails(invoices, "or=(slice_no.eq.5)", "unknown_filter");
fails(invoices, "and=(slice_no.eq.5)", "unknown_filter");
// ...nor through a value: it stays an encoded operand of an allowlisted field.
assert.match(ok(invoices, "client_name=" + encodeURIComponent("x&slice_no=eq.5")), /^client_name=eq\.x%26slice_no%3Deq\.5&/);
// No resource lets a caller filter or sort on it, now or after a registry edit.
for (const r of Object.values(RESOURCES)) {
  // Registry-level guard, independent of the translator's by-name refusal.
  assert.equal(Object.hasOwn(r.filters, "slice_no"), false, `${r.view} exposes slice_no as a filter`);
  assert.equal(r.sort.includes("slice_no"), false, `${r.view} exposes slice_no as a sort`);
}
// Sorting by it is refused too.
fails(invoices, "sort=slice_no", "validation_failed");
// Child route /inventory/{id}/movements: resolved exactly as the route does,
// and carries both the slice pin and the parent pin.
const movementsSub = findSubResource("inventory", "movements");
// The child route must exist for the rest of this assert to mean anything.
assert.notEqual(movementsSub, null);
// Built with the same call shape as route.ts listRows.
const movements = buildListQuery(movementsSub.resource, new URLSearchParams(""), SLICE, { field: movementsSub.parentField, value: "itm_1" });
// Slice pin first, parent pin second.
assert.match((movements as { query: string }).query, /^slice_no=eq\.3&item_id=eq\.itm_1&/);
// Get-by-id is pinned, so another slice's id reads zero rows → 404.
assert.equal(buildGetQuery("inv_8f2c91a4", SLICE), "slice_no=eq.3&id=eq.inv_8f2c91a4&limit=1");
// A non-integer slice is a server bug: refuse to build an unpinned query.
assert.throws(() => buildGetQuery("inv_1", Number.NaN));
assert.throws(() => buildListQuery(invoices, new URLSearchParams(""), undefined as unknown as number));
assert.throws(() => buildListQuery(invoices, new URLSearchParams(""), -1));
// Rows leave with no slice_no key and with "object" first.
const shaped = tagRow(invoices, { id: "inv_1", slice_no: 3, status: "paid" });
assert.equal(Object.hasOwn(shaped, "slice_no"), false);
assert.deepEqual(Object.keys(shaped), ["object", "id", "status"]);

// Registry lookups ignore prototype keys.
assert.equal(findResource("constructor"), null);
assert.equal(findResource("__proto__"), null);
assert.equal(findResource("invoices"), invoices);
// Id charset gate.
assert.equal(isValidId("inv_8f2c91a4"), true);
assert.equal(isValidId("inv_1,or(x)"), false);

// Reached only if every assert held.
console.log("resources.check: all assertions passed");
