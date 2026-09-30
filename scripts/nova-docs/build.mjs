/*
  Builds the downloadable Nova API reference from the SAME registry the API
  runs on, so the doc cannot drift from the endpoints:
    public/nova-api-docs.md      — served at /nova-api-docs.md (download button)
    Nova_API_Documentation.pdf   — repo root, rendered by pdf.py via headless Edge/Chrome

  Run from the repo root:  node scripts/nova-docs/build.mjs
  Re-run after any registry change (a new resource, filter or child route).

  Wording follows content.ts's rule: no visible text says dummy, fake, test,
  sample, synthetic, sandbox or demo.
*/

// Hook registration: content.ts imports "@/lib/..." (a tsconfig alias plain node cannot resolve).
import { register } from "node:module";
// Writes the .md; execFileSync runs the PDF step and fails this script if it fails.
import { writeFileSync } from "node:fs";
// Runs pdf.py without a shell, so paths with spaces (OneDrive) need no quoting.
import { execFileSync } from "node:child_process";
// Absolute paths from this file's location, so the script works from any cwd.
import { fileURLToPath, pathToFileURL } from "node:url";
// Joins repo-relative paths portably on Windows.
import path from "node:path";

// Repo root: two levels up from scripts/nova-docs/.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// src/ as a file URL, the target of the "@/" alias for the hook below.
const SRC_URL = pathToFileURL(path.join(ROOT, "src") + path.sep).href;

// A 4-line resolve hook as a data: URL — maps "@/x" to src/x.ts, the one alias content.ts uses.
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) { return s.startsWith("@/") ? next(new URL(s.slice(2) + ".ts", ${JSON.stringify(SRC_URL)}).href, c) : next(s, c); }`,
    ),
);

// The live registry and its child-route lookup; imported after register() so the alias resolves.
const { RESOURCES, childRoutesOf, DEFAULT_LIMIT, MAX_LIMIT } = await import(pathToFileURL(path.join(ROOT, "src/lib/nova/resources.ts")).href);
// Per-resource prose and the shared constants the portal pages already use.
const { BASE_URL, SAMPLE_KEY, resourceDoc } = await import(pathToFileURL(path.join(ROOT, "src/components/nova/docs/content.ts")).href);

// Every registered resource, in registry order (the portal sidebar's order). No skip list: a
// resource whose data is not loaded yet answers 503 resource_not_provisioned, documented in Section 6.
const SLUGS = Object.keys(RESOURCES);
// Build date, stamped on the cover so a reader can tell a stale copy.
const TODAY = new Date().toISOString().slice(0, 10);

// Inline-code helper, so the templates below stay readable.
const c = (s) => "`" + s + "`";

// Human label for a field type, shown in the filter tables.
function typeLabel(type) {
  // Enums list their values inline: that is the answer to "what can I pass".
  if (type.kind === "enum") return "enum: " + type.values.map(c).join(" ");
  // Timestamps accept a whole day or an exact instant.
  if (type.kind === "timestamp") return "timestamp (YYYY-MM-DD or ISO 8601 with Z/offset)";
  // Dates are calendar-validated.
  if (type.kind === "date") return "date (YYYY-MM-DD)";
  // string / number / boolean read fine as-is.
  return type.kind;
}

// One resource's reference section: summary, notes, endpoints, filters, sort, children.
function resourceSection(slug) {
  // Registry entry: the source of truth for everything structural.
  const r = RESOURCES[slug];
  // Hand-written title/summary/notes, with content.ts's generated fallback.
  const doc = resourceDoc(slug);
  // Child routes from the real table, e.g. /invoices/{id}/payments.
  const children = childRoutesOf(slug);
  // Accumulated lines of Markdown for this resource.
  const out = [`### ${doc.title}`, "", doc.summary, ""];
  // Endpoint list first: it is what a reader scans for.
  out.push("| Endpoint | Returns |", "|---|---|");
  // The paged list.
  out.push(`| ${c(`GET /${slug}`)} | Paged list of ${c(r.object)} objects |`);
  // The single-row lookup.
  out.push(`| ${c(`GET /${slug}/{id}`)} | One ${c(r.object)}, or 404 |`);
  // Each child list, pinned to the parent id.
  for (const { child, sub } of children) out.push(`| ${c(`GET /${slug}/{id}/${child}`)} | Paged list of ${c(sub.resource.object)} for that ${r.object} |`);
  // Filters table, straight from the allowlist.
  out.push("", "**Filters**", "", "| Field | Type | Operators |", "|---|---|---|");
  // Every allowlisted filter with its type and operators.
  for (const [field, spec] of Object.entries(r.filters)) out.push(`| ${c(field)} | ${typeLabel(spec.type)} | ${spec.ops.map(c).join(" ")} |`);
  // Sort columns plus the default, so a reader knows the unsorted order.
  out.push("", `**Sort by:** ${r.sort.map(c).join(", ")} — default ${c(r.defaultSort)}, newest first.`);
  // Gotchas from content.ts, when there are any.
  if (doc.notes?.length) out.push("", "**Notes**", "", ...doc.notes.map((n) => `- ${n}`));
  // Trailing blank line separates sections.
  out.push("");
  // One string per resource.
  return out.join("\n");
}

// The full document. Guide prose mirrors the portal's guide pages and route.ts behaviour.
const md = `# Nova API Reference

**Version:** v1 · read-only REST · **Generated:** ${TODAY} · **Base URL:** ${c(BASE_URL)}

Nova is Aczen's read-only accounting data API: invoices, clients, bills, expenses, stock, banking, payroll, procurement and more. Each team reads **its own set of books**, delivered as JSON over one authenticated endpoint. Amounts are INR under Indian GST.

This document is written for two readers: **developers** integrating Nova, and **AI coding assistants** (Claude Code, Cursor, Antigravity, Copilot and others) generating code against it. Section 2 is the assistant brief; drop this whole file into your assistant's context, or paste Section 2 into ${c("AGENTS.md")} / ${c(".cursorrules")} / ${c("CLAUDE.md")}.

## Contents

1. Quick start
2. Rules for AI coding assistants
3. Authentication
4. Requests and responses
5. Filtering, sorting and pagination
6. Errors
7. Rate limits
8. Your team's data
9. Code examples
10. Resource reference (${SLUGS.length} resources)

---

## 1. Quick start

1. Sign in at ${c("https://www.aczen.in/nova-api")} with your allowlisted email.
2. Create a key on the **API keys** page. The full key is shown **once** — copy it into an environment variable such as ${c("NOVA_API_KEY")}.
3. Run these three calls:

\`\`\`bash
# 1. The API is reachable (no key needed)
curl ${BASE_URL}/health

# 2. Your key works
curl ${BASE_URL}/me \\
  -H "Authorization: Bearer $NOVA_API_KEY"

# 3. A real read with a filter — the shape of every call after this one
curl "${BASE_URL}/invoices?status=overdue&limit=5" \\
  -H "Authorization: Bearer $NOVA_API_KEY"
\`\`\`

> **Use ${c("www.aczen.in")}, not ${c("aczen.in")}.** The apex domain redirects to www, and HTTP clients drop the ${c("Authorization")} header on a cross-host redirect — so a base URL without www answers every call with 401.

---

## 2. Rules for AI coding assistants

Follow these exactly when generating code that calls Nova. Each rule prevents a real failure.

1. **Base URL is ${c(BASE_URL)}** — always ${c("www")}. Put it in one constant.
2. **Read the key from an environment variable** (${c("NOVA_API_KEY")}). Never hardcode it, never commit it, never log it. Keys match ${c("nova_sk_")} + 43 characters.
3. **Call Nova from server-side code only** (API route, server action, backend, script). A key in browser or mobile code is a leaked key.
4. **Send ${c("Authorization: Bearer <key>")}** on every request except ${c("/health")}.
5. **Only ${c("GET")} exists.** There is no create, update or delete. Do not generate POST/PUT/PATCH/DELETE calls — they return ${c("405")}.
6. **Every list is paged.** Response is ${c("{ data: [...], pagination: { limit, offset, total, has_more } }")}. Default ${c(`limit=${DEFAULT_LIMIT}`)}, max ${c(String(MAX_LIMIT))} (larger values are clamped, not refused). To fetch everything, loop with ${c("offset += limit")} while ${c("has_more")} is true.
7. **A single object is wrapped:** ${c("{ data: { object: \"invoice\", ... } }")}. Unwrap ${c(".data")}.
8. **Filter grammar is ${c("field=value")} or ${c("field.op=value")}.** Operators: ${c("eq in gte lte gt lt ilike")}. ${c("in")} takes a comma list (max 100). Only fields listed in Section 10 for that resource are allowed; anything else returns ${c("400 unknown_filter")}. Do not invent filters or use PostgREST syntax (${c("select=")}, ${c("or=")}, ${c("neq")}).
9. **${c("ilike")} is substring search already** — do not add ${c("*")} or ${c("%")}; they are stripped.
10. **Dates are ${c("YYYY-MM-DD")}.** Ranges: ${c("invoice_date.gte=2026-01-01&invoice_date.lte=2026-03-31")}. Booleans are literal ${c("true")} / ${c("false")}. Numbers are plain decimals (no ${c("1e5")}).
11. **Sort** with ${c("sort=<column>&order=asc|desc")}; only the listed sort columns work. Default order is newest first.
12. **Handle errors by ${c("error.code")}, not by message text.** Envelope: ${c("{ error: { type, code, message, details? }, request_id }")}. Log ${c("request_id")}.
13. **On ${c("429")} wait ${c("Retry-After")} seconds, then retry.** Retry ${c("502")} with exponential backoff (e.g. 1s, 2s, 4s, max 3 tries). Never retry ${c("400")}, ${c("401")}, ${c("404")}, ${c("405")} or ${c("503 resource_not_provisioned")} — they will fail the same way.
14. **Default limit is 120 requests/minute per key.** Read ${c("RateLimit-Remaining")} and slow down near 0. Prefer one ${c("limit=200")} page over many small calls.
15. **${c("404 resource_not_found")} means "not visible to you"** — a missing id, a malformed id, and another team's id all look the same. Treat it as absent.
16. **Money:** amounts are INR JSON numbers. Sum in integer paise (${c("Math.round(x * 100)")}) or a decimal library, not raw floats. GST is split CGST + SGST (intra-state) or IGST (inter-state); the other side is ${c("0")}.
17. **"Overdue" is computed against the dataset's fixed as-of date**, not today. Filter with ${c("status=overdue")}; do not recompute from ${c("new Date()")}.
18. **The data does not change between requests**, so results are safe to cache for a session and to assert on in tests.
19. **Unknown response fields may be added** in future; ignore fields you do not use rather than failing on them.

---

## 3. Authentication

Every request except ${c("/health")} needs a bearer key:

\`\`\`http
Authorization: Bearer nova_sk_...
\`\`\`

- Keys start with ${c("nova_sk_")} followed by 43 random characters. The word ${c("Bearer")} is case-insensitive; the key is not.
- **One active key per account.** To rotate: revoke the current key, then create a new one. Name it after where it runs (${c("staging-worker")}).
- **The full key is shown once.** Nova stores only a SHA-256 hash. Lose it → revoke and create a new one. The dashboard keeps the first 16 characters (the prefix) so you can tell keys apart.
- **Revocation is instant** — the next call with a revoked key gets 401. It cannot be undone.
- ${c("GET /me")} tells you which key a service is using:

\`\`\`json
{
  "data": {
    "object": "api_key",
    "id": "…",
    "email": "you@example.com",
    "name": "staging-worker",
    "prefix": "nova_sk_AbC12xYz",
    "rate_limit_per_min": 120,
    "created_at": "2026-09-29T10:00:00Z",
    "team_slot": 1,
    "dataset_slice": 3
  }
}
\`\`\`

A missing header, a malformed, unknown or revoked key, and a key whose owner lost access **all get the same 401**:

\`\`\`json
{ "error": { "type": "authentication_error", "code": "invalid_api_key",
  "message": "Missing or invalid API key. Send 'Authorization: Bearer nova_sk_...'." },
  "request_id": "…" }
\`\`\`

Getting a 401 with a fresh key? Check for ${c("www")} in the base URL first, then for whitespace or a line break pasted into the key.

---

## 4. Requests and responses

| Endpoint | Auth | Purpose |
|---|---|---|
| ${c("GET /health")} | none | Uptime check — ${c('{ "status": "ok" }')} |
| ${c("GET /me")} | key | The calling key, its limit and team slice |
| ${c("GET /{resource}")} | key | Paged list |
| ${c("GET /{resource}/{id}")} | key | One object |
| ${c("GET /{resource}/{id}/{child}")} | key | Paged list scoped to a parent |

- **Methods:** ${c("GET")}, ${c("HEAD")} (same status and headers, no body) and ${c("OPTIONS")} (CORS preflight). Everything else → ${c("405 method_not_allowed")}.
- **Ids** look like ${c("inv_8f2c91a4")}: letters, digits, ${c("_")} and ${c("-")}, up to 64 characters.
- **Every object** carries an ${c('"object"')} tag first (${c('"invoice"')}, ${c('"payment"')} …), so mixed lists are self-describing.
- **Response headers:** ${c("X-Request-Id")} on every response; ${c("RateLimit-Limit")}, ${c("RateLimit-Remaining")}, ${c("RateLimit-Reset")} on authenticated ones; ${c("Retry-After")} on 429. ${c("Cache-Control: no-store")} always.
- **CORS** is open (${c("Access-Control-Allow-Origin: *")}) so you can explore from a browser console — but ship keys server-side only.

**List response**

\`\`\`json
{
  "data": [
    { "object": "invoice", "id": "inv_8f2c91a4", "invoice_number": "INV-2026-0142",
      "status": "overdue", "total_amount": 118000, "balance_due": 59000 }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 312, "has_more": true }
}
\`\`\`

---

## 5. Filtering, sorting and pagination

| Parameter | Meaning |
|---|---|
| ${c("field=value")} | Equality (same as ${c("field.eq=value")}) |
| ${c("field.in=a,b,c")} | Any of — up to 100 values |
| ${c("field.gte=")} ${c("field.lte=")} ${c("field.gt=")} ${c("field.lt=")} | Ranges on dates and numbers |
| ${c("field.ilike=text")} | Case-insensitive substring (wildcards added for you) |
| ${c("sort=column")} | One of the resource's sort columns |
| ${c("order=asc|desc")} | Default ${c("desc")} |
| ${c("limit=1..200")} | Page size, default ${DEFAULT_LIMIT}; over 200 is clamped to 200 |
| ${c("offset=0..")} | Rows to skip |

- Filters are **AND**ed. Repeat a key to bound both ends: ${c("total_amount.gte=10000&total_amount.lte=50000")}.
- Each field allows only the operators listed for it in Section 10 (e.g. ids take ${c("eq in")}, names also take ${c("ilike")}).
- Enum values are validated — a wrong one returns 400 **listing the valid values**.
- Timestamp fields accept a bare date meaning **that whole UTC day**: ${c("created_at=2026-01-05")} matches all of 5 Jan.
- Values are capped at 200 characters.
- Order has a hidden ${c("id")} tiebreak, so offset pages never skip or repeat rows.

**Examples**

\`\`\`text
/invoices?status.in=overdue,partial&sort=due_date&order=asc
/purchase-bills?vendor_name.ilike=steel&bill_date.gte=2026-04-01
/expenses?category=travel&total_amount.gt=5000&limit=200
/inventory?below_reorder_level=true
/invoices/inv_8f2c91a4/payments
\`\`\`

---

## 6. Errors

Every error uses one envelope:

\`\`\`json
{
  "error": {
    "type": "invalid_request",
    "code": "validation_failed",
    "message": "Invalid value for 'invoice_date.gte': must be a real date in YYYY-MM-DD format.",
    "details": { "issues": [{ "field": "invoice_date.gte", "message": "must be a real date in YYYY-MM-DD format" }] }
  },
  "request_id": "5f0c…"
}
\`\`\`

| Status | ${c("type")} | ${c("code")} | Cause | Retry? |
|---|---|---|---|---|
| 400 | invalid_request | ${c("validation_failed")} | Bad value, limit, offset, sort or order | No — fix the request |
| 400 | invalid_request | ${c("unknown_filter")} | Field not allowed on this resource (message lists allowed ones) | No |
| 400 | invalid_request | ${c("unsupported_operator")} | Operator not allowed on this field | No |
| 401 | authentication_error | ${c("invalid_api_key")} | Missing, malformed, unknown or revoked key | No |
| 404 | invalid_request | ${c("resource_not_found")} | Unknown path, bad id, missing row, or another team's row | No |
| 405 | invalid_request | ${c("method_not_allowed")} | Any write verb | No |
| 429 | rate_limit_error | ${c("rate_limit_exceeded")} | Over the per-minute limit | Yes, after ${c("Retry-After")} |
| 502 | api_error | ${c("upstream_error")} | Temporary upstream problem | Yes, with backoff |
| 503 | api_error | ${c("resource_not_provisioned")} | Resource exists but its data isn't loaded yet | No — it will not appear by retrying |

Error messages never contain database text. Quote the ${c("request_id")} when asking for help. Your own calls and their errors are listed on the **Usage** page of the portal.

---

## 7. Rate limits

- **120 requests per minute per key** by default, in fixed 60-second windows. ${c("/me")} reports your key's ${c("rate_limit_per_min")}.
- Every authenticated request counts, including 400s, 404s and 429s. ${c("/health")} and 401s do not.
- Headers: ${c("RateLimit-Limit")}, ${c("RateLimit-Remaining")}, ${c("RateLimit-Reset")} (seconds until the window resets), plus ${c("Retry-After")} on a 429. All are readable from browsers.
- Stay under it: use ${c("limit=200")}, cache results (the data does not change), and run paging loops sequentially rather than in parallel.

---

## 8. Your team's data

- Every allowlisted email belongs to a team, and each team reads **its own coherent set of books**: a set of clients and vendors with the invoices, payments, bills, stock, bank lines and payroll that belong to them.
- The team filter is applied **server-side, before your filters**, and no parameter can change or widen it. Another team's id returns 404.
- ${c("/me")} reports your ${c("team_slot")} and ${c("dataset_slice")}. Teams with different slices see different numbers — that is expected when comparing results.
- Overdue status and ageing use the dataset's **fixed as-of date**, so the same query gives the same answer every day.

---

## 9. Code examples

**TypeScript / JavaScript (Node 18+, server-side)** — a typed client with paging and retry:

\`\`\`ts
// One constant: always www (see Section 1).
const BASE_URL = "${BASE_URL}";

// Key from the environment, never from source.
const KEY = process.env.NOVA_API_KEY;
if (!KEY) throw new Error("NOVA_API_KEY is not set");

type Page<T> = { data: T[]; pagination: { limit: number; offset: number; total: number; has_more: boolean } };

async function nova<T>(path: string, params: Record<string, string | number> = {}, attempt = 0): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: \`Bearer \${KEY}\` } });
  // 429: wait exactly as long as the server says.
  if (res.status === 429 && attempt < 3) {
    await new Promise((r) => setTimeout(r, Number(res.headers.get("Retry-After") ?? 60) * 1000));
    return nova<T>(path, params, attempt + 1);
  }
  // 502: exponential backoff.
  if (res.status === 502 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return nova<T>(path, params, attempt + 1);
  }
  const body = await res.json();
  if (!res.ok) throw new Error(\`Nova \${res.status} \${body.error.code}: \${body.error.message} (request \${body.request_id})\`);
  return body as T;
}

// Every row of a list, page by page.
async function listAll<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await nova<Page<T>>(path, { ...params, limit: 200, offset });
    rows.push(...page.data);
    if (!page.pagination.has_more) return rows;
  }
}

// Usage
const overdue = await listAll<{ id: string; balance_due: number }>("/invoices", { status: "overdue" });
const paise = overdue.reduce((sum, inv) => sum + Math.round(inv.balance_due * 100), 0);
console.log(\`\${overdue.length} overdue invoices, ₹\${(paise / 100).toFixed(2)} outstanding\`);
\`\`\`

**Python (requests)**

\`\`\`python
import os, time, requests

BASE_URL = "${BASE_URL}"
session = requests.Session()
session.headers["Authorization"] = f"Bearer {os.environ['NOVA_API_KEY']}"

def nova(path, **params):
    for attempt in range(4):
        r = session.get(BASE_URL + path, params=params, timeout=30)
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", 60))); continue
        if r.status_code == 502:
            time.sleep(2 ** attempt); continue
        body = r.json()
        if not r.ok:
            e = body["error"]
            raise RuntimeError(f"Nova {r.status_code} {e['code']}: {e['message']} ({body['request_id']})")
        return body
    raise RuntimeError("Nova: retries exhausted")

def list_all(path, **params):
    offset, rows = 0, []
    while True:
        page = nova(path, limit=200, offset=offset, **params)
        rows += page["data"]
        if not page["pagination"]["has_more"]:
            return rows
        offset += 200

bills = list_all("/purchase-bills", status="overdue", sort="due_date", order="asc")
print(len(bills), "overdue bills")
\`\`\`

---

## 10. Resource reference

All paths are relative to ${c(BASE_URL)}. Every list endpoint accepts ${c("limit")}, ${c("offset")}, ${c("sort")} and ${c("order")} in addition to the filters shown. Responses include every field of the object, not only the filterable ones — call the endpoint once to see the full shape.

| Resource | Path | Object |
|---|---|---|
${SLUGS.map((slug) => `| ${resourceDoc(slug).title} | ${c("/" + slug)} | ${c(RESOURCES[slug].object)} |`).join("\n")}

${SLUGS.map(resourceSection).join("\n")}
---

*Nova API Reference · generated ${TODAY} from the live API registry · https://www.aczen.in/nova-api/docs*
`;

// Served by Next from public/ at /nova-api-docs.md; LF endings for every OS.
const MD_PATH = path.join(ROOT, "public", "nova-api-docs.md");
// Write the Markdown the download button serves.
writeFileSync(MD_PATH, md, "utf8");
// Report what was built, so a run is checkable at a glance.
console.log(`wrote ${path.relative(ROOT, MD_PATH)} — ${SLUGS.length} resources, ${md.length} chars`);

// Render the PDF next to the other root-level Nova PDF; stdio inherited so its errors show.
execFileSync("python", [path.join(ROOT, "scripts/nova-docs/pdf.py"), MD_PATH, path.join(ROOT, "Nova_API_Documentation.pdf")], { stdio: "inherit" });
