/*
  Live, per-team reads for the docs pages: the signed-in team's slice, the
  dataset's as-of date, row counts and one example row per resource.

  WHY LIVE: hand-written example rows drift the moment a worker adds a
  column, and they show every team the same row. Reading the team's own first
  row makes every example accurate and familiar by construction.

  WHY EVERYTHING HERE FAILS SOFT: the docs must render even when the Nova DB
  is down or a migration (e.g. 005's as_of_date) has not landed yet. Every
  function returns null / an empty result instead of throwing, and the pages
  fall back to registry-only content.

  Server-only: it reaches the service-role client through db.ts, whose own
  window guard would crash a client bundle loudly anyway.
*/

// React's per-request memo, so the layout and the page share one lookup.
import { cache } from "react";

// Read surface only; the docs never write.
import { novaRead } from "@/lib/nova/db";
// The session → email lookup the shell already uses.
import { getPortalUser } from "@/lib/nova/portalAuth";
// The same query builder and row shaper the public API uses, so a docs
// example is exactly what /v1 would return for that team.
import { buildListQuery, findSubResource, tagRow, type Resource, RESOURCES } from "@/lib/nova/resources";

// Everything a docs page needs to know about the viewer's team.
export type TeamContext = {
  // The slice this team reads: slot % slice_count, as nova_authenticate_key computes it.
  slice: number;
  // How many distinct slices exist; teams beyond it share an earlier one.
  sliceCount: number;
  // Frozen as-of date (YYYY-MM-DD), or null until 005 adds the column.
  asOfDate: string | null;
};

/*
  The viewer's team context, or null (signed out, DB down, not allowlisted).
  cache(): the resource page calls this once per section; one request should
  cost one pair of reads, not one per call.
*/
export const getTeamContext = cache(async (): Promise<TeamContext | null> => {
  try {
    // The shell has already checked the session, but the docs must not trust
    // that: a null user simply means "no live data".
    const user = await getPortalUser();
    if (user === null) return null;
    // Slot and meta are independent, so read them in parallel.
    const [allowlist, meta] = await Promise.all([
      // Email is URL-encoded: it is the one user-shaped value in this query.
      novaRead<{ slot: number }>("nova_allowlist", `select=slot&email=eq.${encodeURIComponent(user.email)}&limit=1`),
      // select=* rather than naming as_of_date: naming a missing column is a
      // PostgREST 400, and the column only exists after migration 005.
      novaRead<{ slice_count: number; as_of_date?: string | null }>("nova_dataset_meta", "select=*&limit=1"),
    ]);
    // Either row missing means the setup is incomplete; show no live data.
    const slot = allowlist.rows[0]?.slot;
    const sliceCount = meta.rows[0]?.slice_count;
    if (typeof slot !== "number" || typeof sliceCount !== "number" || sliceCount < 1) return null;
    // The modulus is the whole "repeat only once the data runs out" rule (004_team_slices.sql).
    return { slice: slot % sliceCount, sliceCount, asOfDate: meta.rows[0]?.as_of_date ?? null };
  } catch (error) {
    // Logged for the operator; the reader just sees registry-only docs.
    console.error("[nova/docs] team context lookup failed:", error);
    return null;
  }
});

// Runs one slice-pinned list read through the API's own builder; null on any failure.
async function readSlice(
  // Whose view, default sort and allowlist apply.
  resource: Resource,
  // The team's slice.
  slice: number,
  // Optional parent pin, for child routes.
  parent?: { field: string; value: string },
): Promise<{ rows: Record<string, unknown>[]; total: number } | null> {
  try {
    // limit=1 plus count=exact (inside novaRead) gives one row AND the total.
    const built = buildListQuery(resource, new URLSearchParams("limit=1"), slice, parent);
    // A registry bug would surface here; treat it like a failed read.
    if (!built.ok) return null;
    // One read per call; the view is already the API's public shape.
    return await novaRead<Record<string, unknown>>(resource.view, built.query);
  } catch (error) {
    // A resource whose view has not been migrated yet lands here, not in a crash.
    console.error(`[nova/docs] live read of ${resource.view} failed:`, error);
    return null;
  }
}

// The team's first row (in the API's default order), shaped like the API's
// JSON, plus the list total — exactly what `GET /{resource}?limit=1` returns.
// null when the read fails or finds no row.
export async function firstRow(
  // Whose view and default sort apply.
  resource: Resource,
  // The team's slice.
  slice: number,
  // Optional parent pin, for child routes.
  parent?: { field: string; value: string },
): Promise<{ row: Record<string, unknown>; total: number } | null> {
  // Same read as a list call with limit=1.
  const result = await readSlice(resource, slice, parent);
  // tagRow strips slice_no and prepends "object", exactly as /v1 does.
  return result && result.rows[0] ? { row: tagRow(resource, result.rows[0]), total: result.total } : null;
}

// Rows the team sees per core resource, for the Introduction's table.
// ponytail: one count read per resource (10 today); fine for a docs page, cache per slice if it gets hot.
export async function sliceCounts(slice: number): Promise<{ path: string; total: number }[]> {
  // The original nine plus stock movements; Tier 1 resources join once their views exist.
  const targets: { path: string; resource: Resource | undefined }[] = [
    ...["clients", "invoices", "payments", "quotations", "vendors", "purchase-bills", "expenses", "inventory"].map((key) => ({
      path: `/${key}`,
      resource: RESOURCES[key],
    })),
    // Movements are only reachable as a child route, so count them via its resource.
    { path: "/inventory/{id}/movements", resource: findSubResource("inventory", "movements")?.resource },
  ];
  // In parallel: ten small reads should cost one round trip of latency, not ten.
  const results = await Promise.all(
    targets.map(async ({ path, resource }) => {
      // A key missing from the registry is skipped, not guessed at.
      if (resource === undefined) return null;
      // Failed reads are skipped, as briefed: a partial table beats no page.
      const read = await readSlice(resource, slice);
      return read === null ? null : { path, total: read.total };
    }),
  );
  // Drop the skipped ones, keep the order above.
  return results.filter((row): row is { path: string; total: number } => row !== null);
}
