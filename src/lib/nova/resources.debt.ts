/*
  Nova debt resources — Tier 2 pack 2d debt (docs/nova-tier2-build-contract.md).
  Owned by ONE builder; merged into the registry by resources.ts.
  Pre-wired EMPTY on 2026-09-29 so the builder fills only this file and never
  edits resources.ts (write-ownership partitioning). Column names must be
  exactly the nova_*_v view columns in supabase/nova/013_debt.sql; slice_no is never
  listed (the translator refuses it and resources.check.ts asserts it).
*/

// Types only for now; the builder adds field shorthands (code, date, …) from
// ./fields.ts as it needs them. fields.ts imports nothing, so no cycle.
import type { Resource } from "./fields.ts";

// URL segment → resource. Keys must not clash with any other domain (resources.ts throws).
export const DEBT_RESOURCES: Record<string, Resource> = {
  // Filled by the debt builder with the keys in contract §4.
};

// "<parent segment>/<child segment>" → child list pinned to the parent's id.
export const DEBT_SUB_RESOURCES: Record<string, { resource: Resource; parentField: string }> = {
  // Filled by the debt builder with the child routes in contract §4.
};
