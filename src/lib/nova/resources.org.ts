/*
  Nova org resources — Tier 1 (docs/nova-tier1-build-contract.md §5 Org).
  Owned by the org worker; merged into the registry by resources.ts.
  Column names are exactly the nova_*_v view columns in
  supabase/nova/005_org_and_ground_truth.sql. nova_ground_truth is deliberately
  absent: it is the judges' answer key and must have no API path (§7).
*/

// Shared types and field shorthands; fields.ts imports nothing, so no cycle.
import { code, date, number, oneOf, text, type Resource } from "./fields.ts";

// Employees, defined once so the top-level list and the department child route
// share the same filters and cannot drift apart.
const EMPLOYEES: Resource = {
  // Singular object tag, as every other resource uses.
  object: "employee",
  // The read view, never the table (design §4.2 layer 3).
  view: "nova_employees_v",
  filters: {
    // Exact code lookup, e.g. EMP-0042.
    code: code,
    // Name search is the first thing an HR integration does.
    name: text,
    // Email is an identifier, so exact or one-of only.
    email: code,
    // Org-chart filters: by department, unit or manager.
    department_id: code,
    business_unit_id: code,
    manager_id: code,
    // G1–G8, the values the table CHECK allows.
    grade: oneOf(["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]),
    // B1–B6, the values the table CHECK allows.
    pay_band: oneOf(["B1", "B2", "B3", "B4", "B5", "B6"]),
    // Title search ("manager", "buyer").
    role_title: text,
    // City, free text.
    location: text,
    // Tenure questions are date ranges.
    join_date: date,
    exit_date: date,
    // The three CHECK values.
    employment_type: oneOf(["full_time", "part_time", "contract"]),
    // Cost analytics filters on rate ranges.
    hourly_cost_rate: number,
  },
  // Joining order is the natural default for a staff list.
  sort: ["join_date", "name", "code", "grade", "hourly_cost_rate", "created_at"],
  defaultSort: "join_date",
};

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const ORG_RESOURCES: Record<string, Resource> = {
  // GET /business-units
  "business-units": {
    object: "business_unit",
    view: "nova_business_units_v",
    // Few rows per team; type and name are all anyone filters on.
    filters: { name: text, type: oneOf(["branch", "product_line"]), city: text },
    sort: ["name", "created_at"],
    // No business date, so newest-created first like clients.
    defaultSort: "created_at",
  },
  // GET /departments
  departments: {
    object: "department",
    view: "nova_departments_v",
    filters: {
      name: text,
      // Cost-centre codes are matched exactly.
      cost_center: code,
      business_unit_id: code,
      head_employee_id: code,
    },
    sort: ["name", "cost_center", "created_at"],
    defaultSort: "created_at",
  },
  // GET /employees
  employees: EMPLOYEES,
  // GET /bank-accounts
  "bank-accounts": {
    object: "bank_account",
    view: "nova_bank_accounts_v",
    filters: {
      bank: text,
      ifsc: code,
      // The five CHECK values.
      purpose: oneOf(["collections", "payroll", "vendor", "branch", "od"]),
      business_unit_id: code,
      // Which statement layout the account's transactions use.
      statement_format: oneOf(["hdfc", "icici", "sbi", "axis"]),
      opening_balance: number,
    },
    sort: ["bank", "purpose", "opening_balance", "created_at"],
    defaultSort: "created_at",
  },
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const ORG_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // GET /departments/{id}/employees (contract §5 child routes).
  "departments/employees": { resource: EMPLOYEES, parentField: "department_id" },
};
