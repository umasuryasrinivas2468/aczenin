/*
  Service-role data access for the /axe analytics pipeline.

  WHY A HAND-ROLLED FETCH CLIENT RATHER THAN @supabase/supabase-js:
  the site does not have that package installed, and adding it would mean
  editing package.json and the lockfile — files owned by another session in
  this working tree. It would also buy almost nothing here: supabase-js is
  itself only a PostgREST client, so it cannot issue GROUP BY either, and every
  dashboard aggregate is computed in Node regardless (see queries.ts). What is
  actually needed is an authenticated HTTP call with the service-role key
  attached, which is ~40 lines of fetch.

  WHY SERVICE ROLE AND NOT THE ANON KEY: the migration enables RLS with zero
  policies and revokes table privileges from anon/authenticated, so the anon key
  can read and write literally nothing on these tables. That is deliberate — the
  anon key ships to every visitor and must be assumed public. service_role
  bypasses RLS, which is why it may only ever run on the server.
*/

// Module-level guard, standing in for the `server-only` package, which is not a
// dependency of this project.
//
// IT IS STRICTLY WEAKER THAN `server-only` AND NOBODY SHOULD ASSUME OTHERWISE:
// `server-only` fails the BUILD the moment a client component imports it, so
// the mistake never reaches a deploy. This check only fires at RUNTIME, in the
// browser, after the bundle containing the service-role key has already been
// shipped to the visitor. It converts a silent key leak into a loud crash,
// which is worth having — but the real protection is that nothing under
// "use client" may import this file. If `server-only` is ever added to the
// project, replace this with it.
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/axe/supabase.ts is server-only and must never reach the browser.",
  );
}

// Read once at module scope so a missing variable fails on first import in a
// cold start, not halfway through a request when a query silently 401s.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The tables this module is allowed to touch, as a union rather than a bare
// string. A typo'd table name would otherwise come back as a PostgREST 404 at
// runtime; this turns it into a compile-time error at the call site.
export type AxeTable =
  | "page_view"
  | "lead_event"
  | "cta_click"
  | "axe_auth_attempt"
  // The one table here that holds personal data rather than anonymised counts.
  // See the header of the migration: every write error from it must go through
  // describeFailure(), because a constraint violation on this table would
  // otherwise put a registrant's real name into a log line.
  | "finathon_registration"
  // The team-registration tables. finathon_team and finathon_participant hold
  // MORE personal data than finathon_registration did — colleges, phone numbers
  // and email addresses for up to five people per team — so the describeFailure
  // discipline above is not optional on these, it is the whole defence.
  | "finathon_team"
  | "finathon_participant"
  // The rate-limit ledger. Holds only a hashed IP and an outcome word, so it is
  // the one table in this group that carries nothing identifying.
  | "finathon_register_attempt";

/*
  A write failure, carrying the SQLSTATE separately from the message.

  The code is exposed as a field because callers need to branch on it — a 23505
  unique violation on a registration means "you have already registered", which
  is a normal outcome to show the person, whereas anything else is a fault. The
  alternative, matching on substrings of the message, breaks the moment
  PostgREST rewords anything.

  What it deliberately does NOT carry is the response body. See describeFailure.
*/
export class SupabaseWriteError extends Error {
  readonly code: string | null;
  // The violated constraint/index name on a 23505, when it could be read out
  // safely. See describeFailure for why this is the only part of `message` kept.
  readonly constraint: string | null;

  constructor(message: string, code: string | null, constraint: string | null = null) {
    super(message);
    this.name = "SupabaseWriteError";
    this.code = code;
    this.constraint = constraint;
  }
}

/*
  Builds the PostgREST endpoint for a table.

  Kept private and centralised so the `/rest/v1/` prefix appears exactly once:
  the single most likely way to break every query at once is to get that path
  wrong in one of five copy-pasted call sites.
*/
function endpoint(table: AxeTable, search?: string): string {
  // Fail closed with a named error rather than fetching "undefined/rest/v1/...",
  // which produces a confusing DNS failure several layers down the stack.
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set; /axe cannot query Supabase.");
  }
  // Trailing slashes on the env var are a common paste artefact and would
  // produce a double slash that PostgREST rejects, so normalise here.
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/rest/v1/${table}${search ? `?${search}` : ""}`;
}

/*
  The auth headers every call needs.

  PostgREST wants the key in BOTH `apikey` and `Authorization` — the former is
  what the Supabase gateway routes on, the latter is what Postgres derives the
  role from. Sending only one of them fails in a way that reads like a
  permissions bug rather than a missing header.
*/
function authHeaders(): Record<string, string> {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; /axe cannot query Supabase.");
  }
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

/*
  SELECT rows from a table.

  `params` is a PostgREST query string fragment (select=, order=, and filters
  such as `occurred_at=gte.2026-01-01`). It is passed through rather than
  wrapped in a query builder because the dashboard issues exactly two distinct
  reads; a builder would be more code than the thing it abstracts.
*/
export async function axeSelect<T>(
  table: AxeTable,
  params: string,
  // Row ceiling. PostgREST defaults to 1000 rows unless a Range header says
  // otherwise, so without this the dashboard would quietly under-report the
  // moment the site passes a thousand pageviews in the window — the worst class
  // of analytics bug, because the chart still looks plausible.
  limit = 50_000,
): Promise<T[]> {
  const response = await fetch(endpoint(table, params), {
    method: "GET",
    headers: {
      ...authHeaders(),
      // Range is how PostgREST expresses LIMIT. Inclusive, hence limit - 1.
      Range: `0-${limit - 1}`,
    },
    // Analytics must never be served from a cached response: a dashboard that
    // shows yesterday's numbers with today's timestamp is worse than no
    // dashboard, because it is believed.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error((await describeFailure("select", table, response)).message);
  }

  return (await response.json()) as T[];
}

/*
  Builds a diagnosable error message that CANNOT carry row data.

  === WHY NOT JUST INTERPOLATE THE RESPONSE BODY ===========================
  The obvious version — `${response.status}: ${await response.text()}` — leaks
  identifiers into the runtime log, and it took an audit to notice.

  PostgREST forwards Postgres' own `message` and `details` fields untouched, and
  on a CHECK, NOT NULL or unique violation Postgres puts THE OFFENDING ROW'S
  VALUES in them: "Failing row contains (…)", "Key (visitor_hash)=(3f2a…)
  already exists". The rows being inserted here contain visitor_hash and, on the
  auth table, ip_hash. So a constraint failure would write a per-visitor
  identifier — and in the ip_hash case a STABLE, non-rotating per-IP identifier
  — straight into a log line that outlives the request.

  That would defeat the entire privacy design, which rests on nothing
  identifying ever being written down outside the hashed column itself.

  So only PostgREST's `code` and `hint` are extracted. `code` is a fixed
  SQLSTATE ("23505", "42703") and `hint` is generated prose about the schema;
  neither can contain a row value. That is enough to tell a bad column from a
  constraint violation from an auth failure, which is all a log needs to do.
  ==========================================================================
*/
async function describeFailure(
  operation: string,
  // Widened from AxeTable to string so the RPC and storage helpers below can
  // reuse this exact scrubbing. They are not tables, but they return the same
  // PostgREST-shaped error body, and a second copy of this logic is how one of
  // the two copies ends up leaking a row value after a future edit.
  table: string,
  response: Response,
  // Returns the SQLSTATE alongside the message rather than only the prose,
  // so a caller can branch on a unique violation without re-parsing the text.
): Promise<{ message: string; code: string | null; constraint: string | null }> {
  // The base message, which is always safe: status codes and our own table
  // names carry nothing about any visitor.
  const base = `Supabase ${operation} on ${table} failed (${response.status})`;
  try {
    // Read as text then parse, rather than response.json(): a non-JSON error
    // body (an HTML gateway page from the platform, say) would make .json()
    // throw and mask the real status behind a parse error.
    const parsed = JSON.parse(await response.text()) as {
      code?: unknown;
      hint?: unknown;
      message?: unknown;
    };
    // Whitelisted by name, never spread. A spread would pick up `message` and
    // `details` — the two fields this whole function exists to exclude — the
    // moment PostgREST changed its response shape.
    const code = typeof parsed.code === "string" ? parsed.code : null;
    const hint = typeof parsed.hint === "string" ? parsed.hint : null;
    // The one exception to "never read message": on a 23505 Postgres puts only
    // the constraint NAME in `message` (the row values go in `details`). The
    // match is anchored and the capture limited to identifier characters, so
    // anything other than that exact fixed sentence yields null, not text.
    const constraintMatch =
      code === "23505" && typeof parsed.message === "string"
        ? /^duplicate key value violates unique constraint "([a-z0-9_]{1,63})"$/.exec(parsed.message)
        : null;
    const constraint = constraintMatch ? constraintMatch[1] : null;
    return {
      message: `${base}${code ? ` [${code}]` : ""}${constraint ? ` on ${constraint}` : ""}${hint ? ` hint: ${hint}` : ""}`,
      code,
      constraint,
    };
  } catch {
    // An unparseable body tells us nothing safe, so nothing is added. The
    // status alone still distinguishes 401 from 404 from 500.
    return { message: base, code: null, constraint: null };
  }
}

/*
  INSERT one row.

  Returns nothing by design: every caller is a fire-and-forget collector that
  has no use for the inserted row, and `Prefer: return=minimal` saves PostgREST
  the round trip of serialising it back.
*/
export async function axeInsert(
  table: AxeTable,
  row: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(endpoint(table), {
    method: "POST",
    headers: {
      ...authHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    /*
      Routed through describeFailure rather than interpolating the body.

      The previous form was `${response.status}: ${await response.text()}`, and
      it was the exact leak the describeFailure comment above was written about
      — it just had not been applied here. On a constraint violation PostgREST
      forwards Postgres' `message` and `details` verbatim, and those contain the
      offending row: "Failing row contains (…)", "Key (utr)=(…) already exists".

      With finathon_registration in the union that is no longer a hashed
      identifier, it is a registrant's name and their payment reference going
      into a runtime log that outlives the request. Only the SQLSTATE and the
      schema-generated hint survive this path, and neither can carry a value.
    */
    const failure = await describeFailure("insert", table, response);
    throw new SupabaseWriteError(failure.message, failure.code);
  }
}

/*
  COUNT rows matching a filter, without transferring any of them.

  Uses HEAD plus `Prefer: count=exact`, which makes Postgres do the counting and
  returns the total in the Content-Range header. The alternative — selecting the
  rows and reading `.length` — moves the entire result set over the wire to
  produce a single integer, and silently caps at the Range limit.
*/
export async function axeCount(table: AxeTable, params: string): Promise<number> {
  const response = await fetch(endpoint(table, `${params}&select=id`), {
    method: "HEAD",
    headers: {
      ...authHeaders(),
      Prefer: "count=exact",
      // Ask for a zero-length window: the count comes from the header, so even
      // one row of payload would be wasted bandwidth.
      Range: "0-0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase count on ${table} failed (${response.status}).`);
  }

  // Content-Range looks like "0-0/1234"; the total is what follows the slash.
  const contentRange = response.headers.get("content-range") ?? "";
  const total = Number(contentRange.split("/")[1]);
  // A missing or unparseable header means the count is unknown, and reporting
  // NaN up the stack would render as "NaN" on a tile. Zero is also wrong, but
  // it is at least a number the caller can reason about; the thrown errors
  // above already cover the cases that actually matter.
  return Number.isFinite(total) ? total : 0;
}

/*
  ============================================================================
  RPC and Storage — added for Finathon team registration.

  Both speak to the same Supabase project with the same service-role key, so
  they live here rather than in a second client that would need its own copy of
  the URL normalisation, the auth headers and the error scrubbing.
  ============================================================================
*/

/*
  Calls a Postgres function through PostgREST.

  WHY AN RPC AT ALL: PostgREST cannot span a transaction across two tables.
  Registering a team means one insert into finathon_team and three-to-five into
  finathon_participant, and doing that as separate HTTP calls leaves an orphaned
  team with no members whenever call two fails. "The network blipped
  mid-registration" is exactly the case that must not corrupt an entry somebody
  paid ₹499 for. One function call, one transaction, all or nothing.

  Returns the function's return value. The SQLSTATE is preserved on failure so
  the caller can tell a 23505 unique violation — a normal outcome worth showing
  the student — from an actual fault.
*/
export async function axeRpc<T>(
  functionName: string,
  payload: Record<string, unknown>,
): Promise<T> {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set; cannot call Supabase RPC.");
  }
  const base = SUPABASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${base}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
    // A registration write must never be served from, or written to, a cache.
    cache: "no-store",
  });

  if (!response.ok) {
    // Same scrubbing as every other write path. A CHECK violation raised inside
    // the function would otherwise put the offending row — names, phone numbers,
    // email addresses — into a log line that outlives the request.
    const failure = await describeFailure("rpc", functionName, response);
    throw new SupabaseWriteError(failure.message, failure.code, failure.constraint);
  }

  return (await response.json()) as T;
}

/*
  Uploads bytes to a PRIVATE storage bucket, server-side only.

  WHY THE SERVER AND NOT THE BROWSER: a direct browser upload would require
  granting `anon` INSERT on storage.objects, which would make it the ONLY
  anonymously writable surface in a database where every single table is
  deny-by-default with zero policies. Routing the bytes through here also means
  size, MIME and magic-byte checks all happen BEFORE anything is persisted.

  `upsert` is left off deliberately: each team's object path contains its own
  uuid, so a collision means something is wrong and should fail loudly rather
  than silently overwrite another team's payment evidence.
*/
export async function storageUpload(
  bucket: string,
  objectPath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set; cannot upload to Supabase Storage.");
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; cannot upload to Supabase Storage.");
  }
  const base = SUPABASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${base}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      // The REAL content type, determined by sniffing magic bytes upstream —
      // never the one the client claimed in its multipart part header.
      "Content-Type": contentType,
      // Refuse rather than replace if the path somehow already exists.
      "x-upsert": "false",
    },
    // Uint8Array is an accepted BodyInit; no base64 round trip, so a 5 MB file
    // does not become a 6.7 MB string in memory on the way through.
    body: bytes as unknown as BodyInit,
    cache: "no-store",
  });

  if (!response.ok) {
    const failure = await describeFailure("storage upload", bucket, response);
    throw new SupabaseWriteError(failure.message, failure.code);
  }
}

/*
  Deletes one object from a bucket.

  Exists for exactly one caller: the API route's compensating action. The bucket
  write happens BEFORE the database insert, because a row pointing at a missing
  file is worse than a file with no row. When the insert then fails, this undoes
  the upload in the same request so the bucket does not accumulate orphans.

  Swallows its own failure at the call site rather than here — a failed cleanup
  must not turn a handled error into an unhandled one.
*/
export async function storageDelete(bucket: string, objectPath: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase env not configured; cannot delete from Storage.");
  }
  const base = SUPABASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${base}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const failure = await describeFailure("storage delete", bucket, response);
    throw new SupabaseWriteError(failure.message, failure.code);
  }
}

/*
  Mints a short-lived signed URL for one private object.

  Used by the admin dashboard to show a payment screenshot without ever making
  the bucket public and without the browser holding a Supabase key.

  SIXTY SECONDS, not an hour: the URL is generated fresh on every page render,
  so a short life costs nothing, and a URL that leaks through a screenshot, a
  shared screen or a browser history is useless a minute later.

  The URL serves from supabase.co rather than aczen.in, which is deliberate and
  worth keeping: a crafted polyglot file — valid JPEG header, HTML payload —
  cannot execute script in the site's own origin even if it somehow slipped past
  the magic-byte check.
*/
export async function storageSignedUrl(
  bucket: string,
  objectPath: string,
  expiresInSeconds = 60,
): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase env not configured; cannot sign a Storage URL.");
  }
  const base = SUPABASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${base}/storage/v1/object/sign/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
    cache: "no-store",
  });

  if (!response.ok) {
    const failure = await describeFailure("storage sign", bucket, response);
    throw new SupabaseWriteError(failure.message, failure.code);
  }

  // Storage returns { signedURL: "/object/sign/<bucket>/<path>?token=..." } —
  // a RELATIVE path, which is the detail that makes a naive implementation
  // render a broken image. It has to be joined onto the storage origin.
  const parsed = (await response.json()) as { signedURL?: unknown };
  if (typeof parsed.signedURL !== "string") {
    throw new Error("Supabase Storage returned no signedURL.");
  }
  return `${base}/storage/v1${parsed.signedURL.replace(/^\/+/, "/")}`;
}
