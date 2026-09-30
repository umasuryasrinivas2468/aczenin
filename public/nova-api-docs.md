# Nova API Reference

**Version:** v1 · read-only REST · **Generated:** 2026-09-30 · **Base URL:** `https://www.aczen.in/nova-api/v1`

Nova is Aczen's read-only accounting data API: invoices, clients, bills, expenses, stock, banking, payroll, procurement and more. Each team reads **its own set of books**, delivered as JSON over one authenticated endpoint. Amounts are INR under Indian GST.

This document is written for two readers: **developers** integrating Nova, and **AI coding assistants** (Claude Code, Cursor, Antigravity, Copilot and others) generating code against it. Section 2 is the assistant brief; drop this whole file into your assistant's context, or paste Section 2 into `AGENTS.md` / `.cursorrules` / `CLAUDE.md`.

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
10. Resource reference (42 resources)

---

## 1. Quick start

1. Sign in at `https://www.aczen.in/nova-api` with your allowlisted email.
2. Create a key on the **API keys** page. The full key is shown **once** — copy it into an environment variable such as `NOVA_API_KEY`.
3. Run these three calls:

```bash
# 1. The API is reachable (no key needed)
curl https://www.aczen.in/nova-api/v1/health

# 2. Your key works
curl https://www.aczen.in/nova-api/v1/me \
  -H "Authorization: Bearer $NOVA_API_KEY"

# 3. A real read with a filter — the shape of every call after this one
curl "https://www.aczen.in/nova-api/v1/invoices?status=overdue&limit=5" \
  -H "Authorization: Bearer $NOVA_API_KEY"
```

> **Use `www.aczen.in`, not `aczen.in`.** The apex domain redirects to www, and HTTP clients drop the `Authorization` header on a cross-host redirect — so a base URL without www answers every call with 401.

---

## 2. Rules for AI coding assistants

Follow these exactly when generating code that calls Nova. Each rule prevents a real failure.

1. **Base URL is `https://www.aczen.in/nova-api/v1`** — always `www`. Put it in one constant.
2. **Read the key from an environment variable** (`NOVA_API_KEY`). Never hardcode it, never commit it, never log it. Keys match `nova_sk_` + 43 characters.
3. **Call Nova from server-side code only** (API route, server action, backend, script). A key in browser or mobile code is a leaked key.
4. **Send `Authorization: Bearer <key>`** on every request except `/health`.
5. **Only `GET` exists.** There is no create, update or delete. Do not generate POST/PUT/PATCH/DELETE calls — they return `405`.
6. **Every list is paged.** Response is `{ data: [...], pagination: { limit, offset, total, has_more } }`. Default `limit=50`, max `200` (larger values are clamped, not refused). To fetch everything, loop with `offset += limit` while `has_more` is true.
7. **A single object is wrapped:** `{ data: { object: "invoice", ... } }`. Unwrap `.data`.
8. **Filter grammar is `field=value` or `field.op=value`.** Operators: `eq in gte lte gt lt ilike`. `in` takes a comma list (max 100). Only fields listed in Section 10 for that resource are allowed; anything else returns `400 unknown_filter`. Do not invent filters or use PostgREST syntax (`select=`, `or=`, `neq`).
9. **`ilike` is substring search already** — do not add `*` or `%`; they are stripped.
10. **Dates are `YYYY-MM-DD`.** Ranges: `invoice_date.gte=2026-01-01&invoice_date.lte=2026-03-31`. Booleans are literal `true` / `false`. Numbers are plain decimals (no `1e5`).
11. **Sort** with `sort=<column>&order=asc|desc`; only the listed sort columns work. Default order is newest first.
12. **Handle errors by `error.code`, not by message text.** Envelope: `{ error: { type, code, message, details? }, request_id }`. Log `request_id`.
13. **On `429` wait `Retry-After` seconds, then retry.** Retry `502` with exponential backoff (e.g. 1s, 2s, 4s, max 3 tries). Never retry `400`, `401`, `404`, `405` or `503 resource_not_provisioned` — they will fail the same way.
14. **Default limit is 120 requests/minute per key.** Read `RateLimit-Remaining` and slow down near 0. Prefer one `limit=200` page over many small calls.
15. **`404 resource_not_found` means "not visible to you"** — a missing id, a malformed id, and another team's id all look the same. Treat it as absent.
16. **Money:** amounts are INR JSON numbers. Sum in integer paise (`Math.round(x * 100)`) or a decimal library, not raw floats. GST is split CGST + SGST (intra-state) or IGST (inter-state); the other side is `0`.
17. **"Overdue" is computed against the dataset's fixed as-of date**, not today. Filter with `status=overdue`; do not recompute from `new Date()`.
18. **The data does not change between requests**, so results are safe to cache for a session and to assert on in tests.
19. **Unknown response fields may be added** in future; ignore fields you do not use rather than failing on them.

---

## 3. Authentication

Every request except `/health` needs a bearer key:

```http
Authorization: Bearer nova_sk_...
```

- Keys start with `nova_sk_` followed by 43 random characters. The word `Bearer` is case-insensitive; the key is not.
- **One active key per account.** To rotate: revoke the current key, then create a new one. Name it after where it runs (`staging-worker`).
- **The full key is shown once.** Nova stores only a SHA-256 hash. Lose it → revoke and create a new one. The dashboard keeps the first 16 characters (the prefix) so you can tell keys apart.
- **Revocation is instant** — the next call with a revoked key gets 401. It cannot be undone.
- `GET /me` tells you which key a service is using:

```json
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
```

A missing header, a malformed, unknown or revoked key, and a key whose owner lost access **all get the same 401**:

```json
{ "error": { "type": "authentication_error", "code": "invalid_api_key",
  "message": "Missing or invalid API key. Send 'Authorization: Bearer nova_sk_...'." },
  "request_id": "…" }
```

Getting a 401 with a fresh key? Check for `www` in the base URL first, then for whitespace or a line break pasted into the key.

---

## 4. Requests and responses

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Uptime check — `{ "status": "ok" }` |
| `GET /me` | key | The calling key, its limit and team slice |
| `GET /{resource}` | key | Paged list |
| `GET /{resource}/{id}` | key | One object |
| `GET /{resource}/{id}/{child}` | key | Paged list scoped to a parent |

- **Methods:** `GET`, `HEAD` (same status and headers, no body) and `OPTIONS` (CORS preflight). Everything else → `405 method_not_allowed`.
- **Ids** look like `inv_8f2c91a4`: letters, digits, `_` and `-`, up to 64 characters.
- **Every object** carries an `"object"` tag first (`"invoice"`, `"payment"` …), so mixed lists are self-describing.
- **Response headers:** `X-Request-Id` on every response; `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` on authenticated ones; `Retry-After` on 429. `Cache-Control: no-store` always.
- **CORS** is open (`Access-Control-Allow-Origin: *`) so you can explore from a browser console — but ship keys server-side only.

**List response**

```json
{
  "data": [
    { "object": "invoice", "id": "inv_8f2c91a4", "invoice_number": "INV-2026-0142",
      "status": "overdue", "total_amount": 118000, "balance_due": 59000 }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 312, "has_more": true }
}
```

---

## 5. Filtering, sorting and pagination

| Parameter | Meaning |
|---|---|
| `field=value` | Equality (same as `field.eq=value`) |
| `field.in=a,b,c` | Any of — up to 100 values |
| `field.gte=` `field.lte=` `field.gt=` `field.lt=` | Ranges on dates and numbers |
| `field.ilike=text` | Case-insensitive substring (wildcards added for you) |
| `sort=column` | One of the resource's sort columns |
| `order=asc|desc` | Default `desc` |
| `limit=1..200` | Page size, default 50; over 200 is clamped to 200 |
| `offset=0..` | Rows to skip |

- Filters are **AND**ed. Repeat a key to bound both ends: `total_amount.gte=10000&total_amount.lte=50000`.
- Each field allows only the operators listed for it in Section 10 (e.g. ids take `eq in`, names also take `ilike`).
- Enum values are validated — a wrong one returns 400 **listing the valid values**.
- Timestamp fields accept a bare date meaning **that whole UTC day**: `created_at=2026-01-05` matches all of 5 Jan.
- Values are capped at 200 characters.
- Order has a hidden `id` tiebreak, so offset pages never skip or repeat rows.

**Examples**

```text
/invoices?status.in=overdue,partial&sort=due_date&order=asc
/purchase-bills?vendor_name.ilike=steel&bill_date.gte=2026-04-01
/expenses?category=travel&total_amount.gt=5000&limit=200
/inventory?below_reorder_level=true
/invoices/inv_8f2c91a4/payments
```

---

## 6. Errors

Every error uses one envelope:

```json
{
  "error": {
    "type": "invalid_request",
    "code": "validation_failed",
    "message": "Invalid value for 'invoice_date.gte': must be a real date in YYYY-MM-DD format.",
    "details": { "issues": [{ "field": "invoice_date.gte", "message": "must be a real date in YYYY-MM-DD format" }] }
  },
  "request_id": "5f0c…"
}
```

| Status | `type` | `code` | Cause | Retry? |
|---|---|---|---|---|
| 400 | invalid_request | `validation_failed` | Bad value, limit, offset, sort or order | No — fix the request |
| 400 | invalid_request | `unknown_filter` | Field not allowed on this resource (message lists allowed ones) | No |
| 400 | invalid_request | `unsupported_operator` | Operator not allowed on this field | No |
| 401 | authentication_error | `invalid_api_key` | Missing, malformed, unknown or revoked key | No |
| 404 | invalid_request | `resource_not_found` | Unknown path, bad id, missing row, or another team's row | No |
| 405 | invalid_request | `method_not_allowed` | Any write verb | No |
| 429 | rate_limit_error | `rate_limit_exceeded` | Over the per-minute limit | Yes, after `Retry-After` |
| 502 | api_error | `upstream_error` | Temporary upstream problem | Yes, with backoff |
| 503 | api_error | `resource_not_provisioned` | Resource exists but its data isn't loaded yet | No — it will not appear by retrying |

Error messages never contain database text. Quote the `request_id` when asking for help. Your own calls and their errors are listed on the **Usage** page of the portal.

---

## 7. Rate limits

- **120 requests per minute per key** by default, in fixed 60-second windows. `/me` reports your key's `rate_limit_per_min`.
- Every authenticated request counts, including 400s, 404s and 429s. `/health` and 401s do not.
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (seconds until the window resets), plus `Retry-After` on a 429. All are readable from browsers.
- Stay under it: use `limit=200`, cache results (the data does not change), and run paging loops sequentially rather than in parallel.

---

## 8. Your team's data

- Every allowlisted email belongs to a team, and each team reads **its own coherent set of books**: a set of clients and vendors with the invoices, payments, bills, stock, bank lines and payroll that belong to them.
- The team filter is applied **server-side, before your filters**, and no parameter can change or widen it. Another team's id returns 404.
- `/me` reports your `team_slot` and `dataset_slice`. Teams with different slices see different numbers — that is expected when comparing results.
- Overdue status and ageing use the dataset's **fixed as-of date**, so the same query gives the same answer every day.

---

## 9. Code examples

**TypeScript / JavaScript (Node 18+, server-side)** — a typed client with paging and retry:

```ts
// One constant: always www (see Section 1).
const BASE_URL = "https://www.aczen.in/nova-api/v1";

// Key from the environment, never from source.
const KEY = process.env.NOVA_API_KEY;
if (!KEY) throw new Error("NOVA_API_KEY is not set");

type Page<T> = { data: T[]; pagination: { limit: number; offset: number; total: number; has_more: boolean } };

async function nova<T>(path: string, params: Record<string, string | number> = {}, attempt = 0): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
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
  if (!res.ok) throw new Error(`Nova ${res.status} ${body.error.code}: ${body.error.message} (request ${body.request_id})`);
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
console.log(`${overdue.length} overdue invoices, ₹${(paise / 100).toFixed(2)} outstanding`);
```

**Python (requests)**

```python
import os, time, requests

BASE_URL = "https://www.aczen.in/nova-api/v1"
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
```

---

## 10. Resource reference

All paths are relative to `https://www.aczen.in/nova-api/v1`. Every list endpoint accepts `limit`, `offset`, `sort` and `order` in addition to the filters shown. Responses include every field of the object, not only the filterable ones — call the endpoint once to see the full shape.

| Resource | Path | Object |
|---|---|---|
| Invoices | `/invoices` | `invoice` |
| Clients | `/clients` | `client` |
| Quotations | `/quotations` | `quotation` |
| Payments | `/payments` | `payment` |
| Vendors | `/vendors` | `vendor` |
| Purchase bills | `/purchase-bills` | `purchase_bill` |
| Expenses | `/expenses` | `expense` |
| Inventory | `/inventory` | `inventory_item` |
| Business units | `/business-units` | `business_unit` |
| Departments | `/departments` | `department` |
| Employees | `/employees` | `employee` |
| Bank accounts | `/bank-accounts` | `bank_account` |
| Vendor contracts | `/vendor-contracts` | `vendor_contract` |
| Purchase orders | `/purchase-orders` | `purchase_order` |
| Goods receipts | `/goods-receipts` | `goods_receipt` |
| Bank transactions | `/bank-transactions` | `bank_transaction` |
| Payroll runs | `/payroll-runs` | `payroll_run` |
| Statutory dues | `/statutory-dues` | `statutory_due` |
| Budgets | `/budgets` | `budget` |
| Vendor bank accounts | `/vendor-bank-accounts` | `vendor_bank_account` |
| Vendor payments | `/vendor-payments` | `vendor_payment` |
| Approvals | `/approvals` | `approval` |
| Master data changes | `/master-data-changes` | `master_data_change` |
| Credit notes | `/credit-notes` | `credit_note` |
| Spend policies | `/spend-policies` | `spend_policy` |
| Leave records | `/leave-records` | `leave_record` |
| Expense claims | `/expense-claims` | `expense_claim` |
| Corporate cards | `/corporate-cards` | `corporate_card` |
| Card transactions | `/card-transactions` | `card_transaction` |
| Subscriptions | `/subscriptions` | `subscription` |
| Payment channels | `/payment-channels` | `payment_channel` |
| Payment attempts | `/payment-attempts` | `payment_attempt` |
| Gateway transactions | `/gateway-transactions` | `gateway_transaction` |
| Settlements | `/settlements` | `settlement` |
| Purchase requisitions | `/purchase-requisitions` | `purchase_requisition` |
| Supplier quotes | `/supplier-quotes` | `supplier_quote` |
| Roles | `/roles` | `role` |
| Sod rules | `/sod-rules` | `sod_rule` |
| User role assignments | `/user-role-assignments` | `user_role_assignment` |
| Source records | `/source-records` | `source_record` |
| Loans | `/loans` | `loan` |
| Loan schedules | `/loan-schedules` | `loan_schedule` |

### Invoices

Sales invoices raised against clients, with the full GST split and what is still owed.

| Endpoint | Returns |
|---|---|
| `GET /invoices` | Paged list of `invoice` objects |
| `GET /invoices/{id}` | One `invoice`, or 404 |
| `GET /invoices/{id}/payments` | Paged list of `payment` for that invoice |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `status` | enum: `pending` `partial` `paid` `overdue` | `eq` `in` |
| `invoice_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `due_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `client_id` | string | `eq` `in` |
| `client_name` | string | `eq` `in` `ilike` |
| `total_amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `invoice_number` | string | `eq` `in` `ilike` |
| `business_unit_id` | string | `eq` `in` |
| `sales_rep_id` | string | `eq` `in` |
| `discount_amount` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `invoice_date`, `due_date`, `total_amount`, `invoice_number`, `created_at` — default `invoice_date`, newest first.

**Notes**

- status reads overdue when an invoice is pending or partial and its due_date is before the dataset's as-of date; the stored status never says overdue.
- Intra-state invoices (intra_state: true) carry CGST + SGST; inter-state ones carry IGST. The other side is always 0.
- balance_due is total_amount minus paid_amount, computed for you.

### Clients

The customers invoices and quotations are raised against.

| Endpoint | Returns |
|---|---|
| `GET /clients` | Paged list of `client` objects |
| `GET /clients/{id}` | One `client`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `name` | string | `eq` `in` `ilike` |
| `gst_number` | string | `eq` `in` |
| `state` | string | `eq` `in` `ilike` |
| `segment` | enum: `enterprise` `mid_market` `smb` | `eq` `in` |
| `industry` | string | `eq` `in` `ilike` |
| `region` | enum: `South` `West` `North` `East` | `eq` `in` |
| `credit_limit` | number | `eq` `gte` `lte` `gt` `lt` |
| `payment_terms_days` | number | `eq` `gte` `lte` `gt` `lt` |
| `account_owner_id` | string | `eq` `in` |
| `business_unit_id` | string | `eq` `in` |
| `pan` | string | `eq` `in` |
| `state_code` | string | `eq` `in` |

**Sort by:** `name`, `state`, `credit_limit`, `created_at` — default `created_at`, newest first.

**Notes**

- gst_number is null for unregistered (B2C) customers.
- state_code is the two-digit GST state code that prefixes a GSTIN.

### Quotations

Proposals sent to clients, through their whole lifecycle from draft to converted.

| Endpoint | Returns |
|---|---|
| `GET /quotations` | Paged list of `quotation` objects |
| `GET /quotations/{id}` | One `quotation`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `status` | enum: `draft` `sent` `accepted` `rejected` `expired` `converted` | `eq` `in` |
| `quotation_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `client_id` | string | `eq` `in` |
| `client_name` | string | `eq` `in` `ilike` |
| `total_amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `sales_rep_id` | string | `eq` `in` |

**Sort by:** `quotation_date`, `valid_until`, `total_amount`, `quotation_number`, `created_at` — default `quotation_date`, newest first.

**Notes**

- converted_invoice_id is set only when status is converted, and points at the resulting invoice.

### Payments

Customer payments received against invoices, with the rail and the reference reconciliation matches on.

| Endpoint | Returns |
|---|---|
| `GET /payments` | Paged list of `payment` objects |
| `GET /payments/{id}` | One `payment`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `payment_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `method` | enum: `upi` `neft` `rtgs` `imps` `cheque` `cash` `card` | `eq` `in` |
| `invoice_id` | string | `eq` `in` |
| `client_id` | string | `eq` `in` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `tds_deducted` | number | `eq` `gte` `lte` `gt` `lt` |
| `bank_transaction_id` | string | `eq` `in` |

**Sort by:** `payment_date`, `amount`, `payment_number`, `created_at` — default `payment_date`, newest first.

**Notes**

- reference is the UTR for bank transfers and UPI, or the cheque number.

### Vendors

The suppliers purchase bills are recorded against, with the bank details an accounts-payable integration needs.

| Endpoint | Returns |
|---|---|
| `GET /vendors` | Paged list of `vendor` objects |
| `GET /vendors/{id}` | One `vendor`, or 404 |
| `GET /vendors/{id}/vendor-bank-accounts` | Paged list of `vendor_bank_account` for that vendor |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `name` | string | `eq` `in` `ilike` |
| `gst_number` | string | `eq` `in` |
| `state` | string | `eq` `in` `ilike` |
| `category` | string | `eq` `in` `ilike` |
| `criticality` | enum: `high` `medium` `low` | `eq` `in` |
| `payment_terms_days` | number | `eq` `gte` `lte` `gt` `lt` |
| `state_code` | string | `eq` `in` |
| `pan` | string | `eq` `in` |
| `created_by` | string | `eq` `in` |
| `status` | enum: `active` `blocked` `pending_verification` | `eq` `in` |

**Sort by:** `name`, `state`, `payment_terms_days`, `created_at` — default `created_at`, newest first.

**Notes**

- Only the last four digits of a bank account are ever returned.

### Purchase bills

Accounts payable: bills from vendors, with reverse-charge and input-tax-credit flags.

| Endpoint | Returns |
|---|---|
| `GET /purchase-bills` | Paged list of `purchase_bill` objects |
| `GET /purchase-bills/{id}` | One `purchase_bill`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `status` | enum: `pending` `partial` `paid` `overdue` | `eq` `in` |
| `bill_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `due_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `vendor_id` | string | `eq` `in` |
| `vendor_name` | string | `eq` `in` `ilike` |
| `total_amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `reverse_charge` | boolean | `eq` |
| `itc_eligible` | boolean | `eq` |
| `bill_number` | string | `eq` `in` `ilike` |
| `po_id` | string | `eq` `in` |
| `grn_id` | string | `eq` `in` |
| `submitted_by` | string | `eq` `in` |
| `approval_status` | enum: `pending` `approved` `rejected` | `eq` `in` |
| `received_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `bill_date`, `due_date`, `received_date`, `total_amount`, `bill_number`, `created_at` — default `bill_date`, newest first.

**Notes**

- status derives overdue exactly as invoices do, against the as-of date.
- reverse_charge: true means the buyer pays the GST to the government. itc_eligible says whether that GST can be claimed back.

### Expenses

Direct spend that never had a bill, such as rent, travel and software, with TDS where it applies.

| Endpoint | Returns |
|---|---|
| `GET /expenses` | Paged list of `expense` objects |
| `GET /expenses/{id}` | One `expense`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `category` | enum: `rent` `travel` `software` `utilities` `office_supplies` `professional_fees` `marketing` `meals` `salaries` `other` | `eq` `in` |
| `expense_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `payment_method` | enum: `upi` `neft` `rtgs` `imps` `cheque` `cash` `card` | `eq` `in` |
| `total_amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `vendor_name` | string | `eq` `in` `ilike` |
| `employee_id` | string | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `business_unit_id` | string | `eq` `in` |
| `client_id` | string | `eq` `in` |
| `recurring` | boolean | `eq` |

**Sort by:** `expense_date`, `total_amount`, `expense_number`, `created_at` — default `expense_date`, newest first.

**Notes**

- tds_rate is a percentage (10.00 for 194J professional fees); tds_amount is what was withheld.

### Inventory

Stock items with their HSN code, GST slab, prices and quantity on hand.

| Endpoint | Returns |
|---|---|
| `GET /inventory` | Paged list of `inventory_item` objects |
| `GET /inventory/{id}` | One `inventory_item`, or 404 |
| `GET /inventory/{id}/movements` | Paged list of `stock_movement` for that inventory_item |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `sku` | string | `eq` `in` `ilike` |
| `name` | string | `eq` `in` `ilike` |
| `hsn_code` | string | `eq` `in` |
| `quantity_on_hand` | number | `eq` `gte` `lte` `gt` `lt` |
| `below_reorder_level` | boolean | `eq` |
| `primary_vendor_id` | string | `eq` `in` |
| `lead_time_days` | number | `eq` `gte` `lte` `gt` `lt` |
| `single_source` | boolean | `eq` |

**Sort by:** `name`, `sku`, `quantity_on_hand`, `created_at` — default `created_at`, newest first.

**Notes**

- below_reorder_level is true when quantity_on_hand is at or under reorder_level.
- Quantities are decimals: kg, litres and metres are fractional. A movement's quantity is signed, positive into stock.

### Business units

The branches and product lines the business reports by.

| Endpoint | Returns |
|---|---|
| `GET /business-units` | Paged list of `business_unit` objects |
| `GET /business-units/{id}` | One `business_unit`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `name` | string | `eq` `in` `ilike` |
| `type` | enum: `branch` `product_line` | `eq` `in` |
| `city` | string | `eq` `in` `ilike` |

**Sort by:** `name`, `created_at` — default `created_at`, newest first.

### Departments

Departments with their cost centre, head and business unit.

| Endpoint | Returns |
|---|---|
| `GET /departments` | Paged list of `department` objects |
| `GET /departments/{id}` | One `department`, or 404 |
| `GET /departments/{id}/employees` | Paged list of `employee` for that department |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `name` | string | `eq` `in` `ilike` |
| `cost_center` | string | `eq` `in` |
| `business_unit_id` | string | `eq` `in` |
| `head_employee_id` | string | `eq` `in` |

**Sort by:** `name`, `cost_center`, `created_at` — default `created_at`, newest first.

### Employees

People on the books: department, manager, grade, role, pay band and hourly cost rate.

| Endpoint | Returns |
|---|---|
| `GET /employees` | Paged list of `employee` objects |
| `GET /employees/{id}` | One `employee`, or 404 |
| `GET /employees/{id}/expense-claims` | Paged list of `expense_claim` for that employee |
| `GET /employees/{id}/leave-records` | Paged list of `leave_record` for that employee |
| `GET /employees/{id}/user-role-assignments` | Paged list of `user_role_assignment` for that employee |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `code` | string | `eq` `in` |
| `name` | string | `eq` `in` `ilike` |
| `email` | string | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `business_unit_id` | string | `eq` `in` |
| `manager_id` | string | `eq` `in` |
| `grade` | enum: `G1` `G2` `G3` `G4` `G5` `G6` `G7` `G8` | `eq` `in` |
| `pay_band` | enum: `B1` `B2` `B3` `B4` `B5` `B6` | `eq` `in` |
| `role_title` | string | `eq` `in` `ilike` |
| `location` | string | `eq` `in` `ilike` |
| `join_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `exit_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `employment_type` | enum: `full_time` `part_time` `contract` | `eq` `in` |
| `hourly_cost_rate` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `join_date`, `name`, `code`, `grade`, `hourly_cost_rate`, `created_at` — default `join_date`, newest first.

**Notes**

- There is no per-person salary; payroll is reported per department per month under /payroll-runs.

### Bank accounts

The company's own bank accounts, by purpose, with balances and transfer limits.

| Endpoint | Returns |
|---|---|
| `GET /bank-accounts` | Paged list of `bank_account` objects |
| `GET /bank-accounts/{id}` | One `bank_account`, or 404 |
| `GET /bank-accounts/{id}/bank-transactions` | Paged list of `bank_transaction` for that bank_account |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `bank` | string | `eq` `in` `ilike` |
| `ifsc` | string | `eq` `in` |
| `purpose` | enum: `collections` `payroll` `vendor` `branch` `od` | `eq` `in` |
| `business_unit_id` | string | `eq` `in` |
| `statement_format` | enum: `hdfc` `icici` `sbi` `axis` | `eq` `in` |
| `opening_balance` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `bank`, `purpose`, `opening_balance`, `created_at` — default `created_at`, newest first.

### Vendor contracts

Agreed prices, volume tiers, capacity and lead times per vendor and item.

| Endpoint | Returns |
|---|---|
| `GET /vendor-contracts` | Paged list of `vendor_contract` objects |
| `GET /vendor-contracts/{id}` | One `vendor_contract`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `vendor_id` | string | `eq` `in` |
| `item_id` | string | `eq` `in` |
| `contract_price` | number | `eq` `gte` `lte` `gt` `lt` |
| `valid_from` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `valid_to` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `valid_from`, `valid_to`, `contract_price`, `created_at` — default `valid_from`, newest first.

### Purchase orders

Orders raised to vendors, with line items, promised dates and the channel they went through.

| Endpoint | Returns |
|---|---|
| `GET /purchase-orders` | Paged list of `purchase_order` objects |
| `GET /purchase-orders/{id}` | One `purchase_order`, or 404 |
| `GET /purchase-orders/{id}/goods-receipts` | Paged list of `goods_receipt` for that purchase_order |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `status` | enum: `open` `partially_received` `received` `closed` `cancelled` | `eq` `in` |
| `channel` | enum: `catalog` `contract` `off_contract` | `eq` `in` |
| `vendor_id` | string | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `raised_by` | string | `eq` `in` |
| `po_number` | string | `eq` `in` |
| `order_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `promised_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `total_amount` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `order_date`, `promised_date`, `total_amount`, `po_number`, `created_at` — default `order_date`, newest first.

### Goods receipts

What actually arrived against each purchase order, including rejected quantities and why.

| Endpoint | Returns |
|---|---|
| `GET /goods-receipts` | Paged list of `goods_receipt` objects |
| `GET /goods-receipts/{id}` | One `goods_receipt`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `po_id` | string | `eq` `in` |
| `grn_number` | string | `eq` `in` |
| `received_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `received_by` | string | `eq` `in` |

**Sort by:** `received_date`, `grn_number`, `created_at` — default `received_date`, newest first.

### Bank transactions

Bank statement lines for every company account, with the bank's own narration and running balance.

| Endpoint | Returns |
|---|---|
| `GET /bank-transactions` | Paged list of `bank_transaction` objects |
| `GET /bank-transactions/{id}` | One `bank_transaction`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `account_id` | string | `eq` `in` |
| `value_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `posted_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `debit` | number | `eq` `gte` `lte` `gt` `lt` |
| `credit` | number | `eq` `gte` `lte` `gt` `lt` |
| `bank_ref` | string | `eq` `in` |
| `cheque_no` | string | `eq` `in` |
| `counterparty_text` | string | `eq` `in` `ilike` |
| `raw_narration` | string | `eq` `in` `ilike` |

**Sort by:** `value_date`, `posted_date`, `line_no`, `debit`, `credit`, `running_balance` — default `value_date`, newest first.

**Notes**

- raw_narration keeps each bank's own statement format, so parsing it is part of the job.

### Payroll runs

Monthly payroll per department: gross, net and the PF, ESI and TDS deducted.

| Endpoint | Returns |
|---|---|
| `GET /payroll-runs` | Paged list of `payroll_run` objects |
| `GET /payroll-runs/{id}` | One `payroll_run`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `month` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `department_id` | string | `eq` `in` |
| `account_id` | string | `eq` `in` |
| `pay_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `gross` | number | `eq` `gte` `lte` `gt` `lt` |
| `net` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `month`, `pay_date`, `gross`, `net` — default `month`, newest first.

### Statutory dues

GST, TDS, PF, ESI and advance-tax obligations, with due and paid dates and any interest.

| Endpoint | Returns |
|---|---|
| `GET /statutory-dues` | Paged list of `statutory_due` objects |
| `GET /statutory-dues/{id}` | One `statutory_due`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `due_type` | enum: `gstr3b` `tds` `pf` `esi` `advance_tax` | `eq` `in` |
| `period` | string | `eq` `in` |
| `due_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `paid_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `status` | enum: `paid` `overdue` `upcoming` | `eq` `in` |

**Sort by:** `due_date`, `paid_date`, `amount` — default `due_date`, newest first.

### Budgets

Monthly budgets per department and category, with the amount already committed.

| Endpoint | Returns |
|---|---|
| `GET /budgets` | Paged list of `budget` objects |
| `GET /budgets/{id}` | One `budget`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `department_id` | string | `eq` `in` |
| `category` | enum: `payroll` `materials` `rent` `travel` `software` `utilities` `office_supplies` `professional_fees` `marketing` `meals` `other` | `eq` `in` |
| `month` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `committed` | number | `eq` `gte` `lte` `gt` `lt` |
| `remaining` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `month`, `amount`, `committed`, `remaining` — default `month`, newest first.

### Vendor bank accounts

Each vendor's bank account history, with validity dates and verification status.

| Endpoint | Returns |
|---|---|
| `GET /vendor-bank-accounts` | Paged list of `vendor_bank_account` objects |
| `GET /vendor-bank-accounts/{id}` | One `vendor_bank_account`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `vendor_id` | string | `eq` `in` |
| `ifsc` | string | `eq` `in` |
| `account_last4` | string | `eq` `in` |
| `account_fingerprint` | string | `eq` `in` |
| `holder_name` | string | `eq` `in` `ilike` |
| `valid_from` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `valid_to` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `verified` | boolean | `eq` |

**Sort by:** `valid_from`, `valid_to`, `account_last4` — default `valid_from`, newest first.

### Vendor payments

Payments made to vendors: which bills, from which account, to which beneficiary, and who approved them.

| Endpoint | Returns |
|---|---|
| `GET /vendor-payments` | Paged list of `vendor_payment` objects |
| `GET /vendor-payments/{id}` | One `vendor_payment`, or 404 |
| `GET /vendor-payments/{id}/payment-attempts` | Paged list of `payment_attempt` for that vendor_payment |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `payment_number` | string | `eq` `in` `ilike` |
| `vendor_id` | string | `eq` `in` |
| `beneficiary_account_id` | string | `eq` `in` |
| `from_account_id` | string | `eq` `in` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `channel` | enum: `neft` `rtgs` `imps` `upi` `cheque` | `eq` `in` |
| `initiated_by` | string | `eq` `in` |
| `approved_by` | string | `eq` `in` |
| `initiated_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `status` | enum: `success` `failed` `reversed` | `eq` `in` |
| `bank_transaction_id` | string | `eq` `in` |

**Sort by:** `initiated_at`, `amount`, `payment_number` — default `initiated_at`, newest first.

### Approvals

The approval trail for purchase orders, bills, payments, expenses, credit notes and vendor changes.

| Endpoint | Returns |
|---|---|
| `GET /approvals` | Paged list of `approval` objects |
| `GET /approvals/{id}` | One `approval`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `doc_type` | enum: `purchase_order` `purchase_bill` `vendor_payment` `expense` `credit_note` `vendor_master` | `eq` `in` |
| `doc_id` | string | `eq` `in` |
| `level` | number | `eq` `gte` `lte` `gt` `lt` |
| `action` | enum: `approve` `reject` `escalate` | `eq` `in` |
| `actor_id` | string | `eq` `in` |
| `acted_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `threshold_applied` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `acted_at`, `level`, `threshold_applied` — default `acted_at`, newest first.

### Master data changes

Every change to vendor, client, employee and bank-account records: the field, old and new value, and who changed it.

| Endpoint | Returns |
|---|---|
| `GET /master-data-changes` | Paged list of `master_data_change` objects |
| `GET /master-data-changes/{id}` | One `master_data_change`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `entity_type` | enum: `vendor` `client` `employee` `vendor_bank_account` | `eq` `in` |
| `entity_id` | string | `eq` `in` |
| `field` | string | `eq` `in` |
| `changed_by` | string | `eq` `in` |
| `approved_by` | string | `eq` `in` |
| `changed_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `changed_at`, `field` — default `changed_at`, newest first.

### Credit notes

Credit notes issued against invoices, with the reason and approver.

| Endpoint | Returns |
|---|---|
| `GET /credit-notes` | Paged list of `credit_note` objects |
| `GET /credit-notes/{id}` | One `credit_note`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `credit_note_number` | string | `eq` `in` `ilike` |
| `invoice_id` | string | `eq` `in` |
| `client_id` | string | `eq` `in` |
| `note_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `total_amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `reason` | enum: `return` `discount` `refund` `price_difference` | `eq` `in` |
| `approved_by` | string | `eq` `in` |

**Sort by:** `note_date`, `amount`, `total_amount`, `credit_note_number` — default `note_date`, newest first.

### Spend policies

The spend policies in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /spend-policies` | Paged list of `spend_policy` objects |
| `GET /spend-policies/{id}` | One `spend_policy`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `applies_to` | enum: `expense_claim` `card_transaction` `subscription` | `eq` `in` |
| `category` | string | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `grade_min` | string | `eq` `in` |
| `grade_max` | string | `eq` `in` |
| `effective_from` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `effective_to` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `limit_amount` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `effective_from`, `policy_code`, `limit_amount` — default `effective_from`, newest first.

### Leave records

The leave records in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /leave-records` | Paged list of `leave_record` objects |
| `GET /leave-records/{id}` | One `leave_record`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `employee_id` | string | `eq` `in` |
| `leave_type` | enum: `earned` `sick` `casual` `unpaid` `comp_off` | `eq` `in` |
| `status` | enum: `approved` `rejected` `cancelled` `pending` | `eq` `in` |
| `start_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `end_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `days` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `start_date`, `end_date`, `days` — default `start_date`, newest first.

### Expense claims

The expense claims in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /expense-claims` | Paged list of `expense_claim` objects |
| `GET /expense-claims/{id}` | One `expense_claim`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `employee_id` | string | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `category` | enum: `travel_air` `travel_rail` `local_conveyance` `hotel` `meals` `client_entertainment` `telecom` `fuel` `office_supplies` `other` | `eq` `in` |
| `status` | enum: `submitted` `queried` `approved` `rejected` `reimbursed` | `eq` `in` |
| `expense_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `submitted_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `trip_id` | string | `eq` `in` |
| `client_id` | string | `eq` `in` |
| `receipt_number` | string | `eq` `in` |
| `receipt_hash` | string | `eq` `in` |
| `receipt_merchant` | string | `eq` `in` `ilike` |
| `policy_exception` | boolean | `eq` |
| `payroll_run_id` | string | `eq` `in` |

**Sort by:** `expense_date`, `submitted_at`, `amount`, `claim_number` — default `expense_date`, newest first.

### Corporate cards

The corporate cards in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /corporate-cards` | Paged list of `corporate_card` objects |
| `GET /corporate-cards/{id}` | One `corporate_card`, or 404 |
| `GET /corporate-cards/{id}/card-transactions` | Paged list of `card_transaction` for that corporate_card |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `employee_id` | string | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `status` | enum: `active` `blocked` `closed` | `eq` `in` |
| `network` | enum: `visa` `mastercard` `rupay` | `eq` `in` |
| `issued_on` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `per_txn_limit` | number | `eq` `gte` `lte` `gt` `lt` |
| `monthly_limit` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `issued_on`, `monthly_limit` — default `issued_on`, newest first.

### Card transactions

The card transactions in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /card-transactions` | Paged list of `card_transaction` objects |
| `GET /card-transactions/{id}` | One `card_transaction`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `card_id` | string | `eq` `in` |
| `employee_id` | string | `eq` `in` |
| `txn_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `posted_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `mcc` | string | `eq` `in` |
| `mcc_group` | enum: `travel` `lodging` `fuel` `restaurants` `software` `office` `telecom` `retail` `entertainment` `cash` `other` | `eq` `in` |
| `merchant_name` | string | `eq` `in` `ilike` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `auth_status` | enum: `approved` `declined` | `eq` `in` |
| `decline_reason` | enum: `over_txn_limit` `over_monthly_limit` `blocked_mcc` `card_blocked` `outside_hours` | `eq` `in` |
| `subscription_id` | string | `eq` `in` |
| `txn_hour_ist` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `txn_at`, `posted_date`, `amount` — default `txn_at`, newest first.

### Subscriptions

The subscriptions in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /subscriptions` | Paged list of `subscription` objects |
| `GET /subscriptions/{id}` | One `subscription`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `vendor_name` | string | `eq` `in` `ilike` |
| `vendor_id` | string | `eq` `in` |
| `category` | enum: `saas` `cloud` `telecom` `insurance` `maintenance` `rent` `utilities` `professional_services` `media` | `eq` `in` |
| `department_id` | string | `eq` `in` |
| `owner_employee_id` | string | `eq` `in` |
| `billing_cycle` | enum: `monthly` `quarterly` `annual` | `eq` `in` |
| `billing_channel` | enum: `bank` `card` | `eq` `in` |
| `status` | enum: `active` `paused` `cancelled` | `eq` `in` |
| `renewal_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `started_on` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `auto_renew` | boolean | `eq` |
| `current_amount` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `renewal_date`, `started_on`, `current_amount`, `annualised_cost` — default `renewal_date`, newest first.

### Payment channels

The payment channels in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /payment-channels` | Paged list of `payment_channel` objects |
| `GET /payment-channels/{id}` | One `payment_channel`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `channel_code` | enum: `neft` `rtgs` `imps` `upi_payout` `gw_card` `gw_upi` `gw_netbanking` `gw_wallet` | `eq` `in` |
| `direction` | enum: `payout` `collection` | `eq` `in` |
| `fee_model` | enum: `flat` `percent` `percent_plus_flat` `slab` | `eq` `in` |
| `settlement_days` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `effective_from`, `channel_code`, `fee_pct` — default `effective_from`, newest first.

### Payment attempts

The payment attempts in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /payment-attempts` | Paged list of `payment_attempt` objects |
| `GET /payment-attempts/{id}` | One `payment_attempt`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `vendor_payment_id` | string | `eq` `in` |
| `channel_id` | string | `eq` `in` |
| `outcome` | enum: `success` `failed` `timeout` `reversed` | `eq` `in` |
| `failure_code` | enum: `insufficient_funds` `beneficiary_ifsc_invalid` `beneficiary_account_closed` `name_mismatch` `bank_timeout` `limit_exceeded` `cutoff_missed` `duplicate_suspected` | `eq` `in` |
| `failure_stage` | enum: `initiation` `remitter_bank` `beneficiary_bank` | `eq` `in` |
| `next_action` | enum: `none` `retry_same_channel` `retry_alternate_channel` `manual_review` | `eq` `in` |
| `attempted_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `attempt_no` | number | `eq` `gte` `lte` `gt` `lt` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `attempted_at`, `attempt_no`, `amount` — default `attempted_at`, newest first.

### Gateway transactions

The gateway transactions in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /gateway-transactions` | Paged list of `gateway_transaction` objects |
| `GET /gateway-transactions/{id}` | One `gateway_transaction`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `txn_type` | enum: `capture` `refund` `chargeback` `chargeback_reversal` | `eq` `in` |
| `status` | enum: `success` `failed` `pending` | `eq` `in` |
| `channel_id` | string | `eq` `in` |
| `card_scope` | enum: `domestic` `international` | `eq` `in` |
| `settlement_id` | string | `eq` `in` |
| `parent_txn_id` | string | `eq` `in` |
| `gateway_ref` | string | `eq` `in` |
| `order_ref` | string | `eq` `in` |
| `customer_ref` | string | `eq` `in` |
| `bank_rrn` | string | `eq` `in` |
| `txn_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `fee` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `txn_at`, `amount`, `fee` — default `txn_at`, newest first.

### Settlements

The settlements in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /settlements` | Paged list of `settlement` objects |
| `GET /settlements/{id}` | One `settlement`, or 404 |
| `GET /settlements/{id}/gateway-transactions` | Paged list of `gateway_transaction` for that settlement |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `settlement_ref` | string | `eq` `in` |
| `settlement_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `period_start` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `period_end` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `status` | enum: `settled` `on_hold` | `eq` `in` |
| `net_amount` | number | `eq` `gte` `lte` `gt` `lt` |
| `adjustments` | number | `eq` `gte` `lte` `gt` `lt` |
| `payout_account_id` | string | `eq` `in` |

**Sort by:** `settlement_date`, `net_amount`, `gross_amount` — default `settlement_date`, newest first.

### Purchase requisitions

The purchase requisitions in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /purchase-requisitions` | Paged list of `purchase_requisition` objects |
| `GET /purchase-requisitions/{id}` | One `purchase_requisition`, or 404 |
| `GET /purchase-requisitions/{id}/supplier-quotes` | Paged list of `supplier_quote` for that purchase_requisition |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `department_id` | string | `eq` `in` |
| `requested_by` | string | `eq` `in` |
| `item_id` | string | `eq` `in` |
| `status` | enum: `open` `quoted` `ordered` `cancelled` | `eq` `in` |
| `priority` | enum: `normal` `urgent` | `eq` `in` |
| `created_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `target_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `po_id` | string | `eq` `in` |

**Sort by:** `created_date`, `target_date`, `budget_amount` — default `created_date`, newest first.

### Supplier quotes

The supplier quotes in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /supplier-quotes` | Paged list of `supplier_quote` objects |
| `GET /supplier-quotes/{id}` | One `supplier_quote`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `requisition_id` | string | `eq` `in` |
| `vendor_id` | string | `eq` `in` |
| `quote_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `valid_until` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `awarded` | boolean | `eq` |
| `unit_price` | number | `eq` `gte` `lte` `gt` `lt` |
| `lead_time_days` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `quote_date`, `unit_price`, `lead_time_days` — default `quote_date`, newest first.

### Roles

The roles in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /roles` | Paged list of `role` objects |
| `GET /roles/{id}` | One `role`, or 404 |
| `GET /roles/{id}/user-role-assignments` | Paged list of `user_role_assignment` for that role |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `code` | enum: `ap_clerk` `ap_manager` `vendor_master_admin` `treasury_operator` `treasury_approver` `payroll_admin` `procurement_buyer` `procurement_manager` `expense_approver` `finance_controller` `auditor_readonly` `system_admin` | `eq` `in` |
| `is_privileged` | boolean | `eq` |

**Sort by:** `code` — default `code`, newest first.

### Sod rules

The sod rules in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /sod-rules` | Paged list of `sod_rule` objects |
| `GET /sod-rules/{id}` | One `sod_rule`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `rule_code` | string | `eq` `in` |
| `severity` | enum: `high` `medium` | `eq` `in` |
| `permission_a` | string | `eq` `in` |
| `permission_b` | string | `eq` `in` |

**Sort by:** `rule_code` — default `rule_code`, newest first.

### User role assignments

The user role assignments in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /user-role-assignments` | Paged list of `user_role_assignment` objects |
| `GET /user-role-assignments/{id}` | One `user_role_assignment`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `employee_id` | string | `eq` `in` |
| `role_id` | string | `eq` `in` |
| `granted_by` | string | `eq` `in` |
| `granted_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |
| `revoked_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `granted_at`, `revoked_at` — default `granted_at`, newest first.

### Source records

The source records in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /source-records` | Paged list of `source_record` objects |
| `GET /source-records/{id}` | One `source_record`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `source_system` | enum: `invoicing_app` `bank_export` `gateway_report` `procurement_portal` `crm_export` | `eq` `in` |
| `record_type` | enum: `invoice` `receipt` `bank_line` `gateway_txn` `settlement` `vendor` `client` | `eq` `in` |
| `external_id` | string | `eq` `in` |
| `exported_at` | timestamp (YYYY-MM-DD or ISO 8601 with Z/offset) | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `exported_at`, `external_id` — default `exported_at`, newest first.

### Loans

The loans in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /loans` | Paged list of `loan` objects |
| `GET /loans/{id}` | One `loan`, or 404 |
| `GET /loans/{id}/loan-schedules` | Paged list of `loan_schedule` for that loan |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `loan_type` | enum: `term_loan` `cash_credit` | `eq` `in` |
| `lender` | string | `eq` `in` `ilike` |
| `status` | enum: `active` `closed` | `eq` `in` |
| `sanction_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `review_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `outstanding_principal` | number | `eq` `gte` `lte` `gt` `lt` |

**Sort by:** `sanction_date`, `outstanding_principal` — default `sanction_date`, newest first.

### Loan schedules

The loan schedules in your team's books.

| Endpoint | Returns |
|---|---|
| `GET /loan-schedules` | Paged list of `loan_schedule` objects |
| `GET /loan-schedules/{id}` | One `loan_schedule`, or 404 |

**Filters**

| Field | Type | Operators |
|---|---|---|
| `loan_id` | string | `eq` `in` |
| `status` | enum: `paid` `due` `scheduled` | `eq` `in` |
| `due_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `paid_date` | date (YYYY-MM-DD) | `eq` `gte` `lte` `gt` `lt` |
| `instalment_no` | number | `eq` `gte` `lte` `gt` `lt` |
| `total_due` | number | `eq` `gte` `lte` `gt` `lt` |
| `bank_transaction_id` | string | `eq` `in` |

**Sort by:** `due_date`, `instalment_no` — default `due_date`, newest first.

---

*Nova API Reference · generated 2026-09-30 from the live API registry · https://www.aczen.in/nova-api/docs*
