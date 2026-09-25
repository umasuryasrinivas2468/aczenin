/*
  Data access for /Finathon/axe/26 — the Finathon team review dashboard.

  === WHAT IS HERE AND WHAT IS BORROWED ====================================
  Every Supabase call this page makes goes through src/lib/axe/supabase.ts, with
  ONE exception. The reads use `axeSelect`, where they inherit its row cap, its
  `cache: "no-store"` and — most importantly — its error scrubber, which keeps a
  registrant's name out of the runtime log. The screenshot links use its
  `storageSignedUrl`.

  The exception is the review write. That client exposes SELECT, INSERT, COUNT,
  RPC and three Storage calls, but no UPDATE, and marking a team approved is an
  UPDATE. It is written here rather than added there because that file belongs
  to another worker this session. It copies the same discipline line for line:
  both auth headers, `cache: "no-store"`, and a failure described by status code
  alone with the response body never read. WHEN src/lib/axe/supabase.ts NEXT
  CHANGES, an `axeUpdate` belongs in it and `updateTeamReview` should call it.
  ==========================================================================
*/

import { axeSelect, storageSignedUrl } from "@/lib/axe/supabase";
import { PAYMENTS_BUCKET } from "@/lib/finathon/teamRegistrations";

// Same runtime-only guard every module in this chain carries. Strictly weaker
// than the `server-only` package — it fires in the browser after the bundle
// holding the service-role key has already shipped — but it converts a silent
// key leak into a loud crash, and nothing under "use client" may import this.
if (typeof window !== "undefined") {
  throw new Error(
    "app/Finathon/axe/26/data.ts is server-only and must never reach the browser.",
  );
}

/*
  Signed-URL lifetime, in seconds.

  Sixty seconds because the URL is a bearer token: anyone holding it can fetch
  the screenshot without a session. A minute is long enough for the reviewer's
  browser to load the image it was minted for and far too short to be pasted
  into a chat and still work when someone else clicks it.
*/
const SIGNED_URL_TTL_SECONDS = 60;

/*
  The status values §4.2 allows on finathon_team.

  A union rather than `string` so a typo in an action ("aproved") is a compile
  error here instead of a CHECK-constraint 400 from PostgREST at review time.
*/
export type TeamStatus = "pending" | "approved" | "rejected" | "legacy";

/*
  The two statuses this dashboard is allowed to WRITE.

  Narrower than TeamStatus on purpose: 'pending' is set by the registration
  route and 'legacy' by the backfill in §4.4. Neither is a review outcome, and
  typing them out of the decision parameter means no action can accidentally
  push a reviewed team back into the queue or relabel a historical row.
*/
export type ReviewDecision = "approved" | "rejected";

/*
  The review note's ceiling, mirroring the CHECK constraint in §4.2
  (`char_length(review_note) <= 500`).

  Named here and enforced in the action rather than left to the database for the
  same reason registrations.ts keeps its LIMITS object: when the form and the
  constraint disagree, the mismatch surfaces as a 400 from PostgREST that reads
  like a server fault instead of the over-long input it actually is.
*/
export const REVIEW_NOTE_MAX_LENGTH = 500;

/*
  What the queue can be filtered to.

  'all' is not a status — it is the absence of a filter — which is exactly why
  it is modelled here beside the four real ones rather than as `undefined`.
  A named 'all' means every code path has a value to switch on, and the default
  is chosen in one place instead of being implied by a missing parameter.
*/
export type StatusFilter = TeamStatus | "all";

/*
  The filter values, in the order the tab strip shows them.

  'pending' first and used as the default: "what still needs review" is the job
  this dashboard exists to do, and a queue that opens on everything ever
  submitted makes the reviewer do the filtering by eye on every visit.
*/
export const STATUS_FILTERS: StatusFilter[] = [
  "pending",
  "approved",
  "rejected",
  "legacy",
  "all",
];

/*
  Narrows an untrusted string to a StatusFilter.

  Both the query string and a form field can carry anything. Whitelisting on the
  way in means the value is safe to put back into a redirect URL and safe to
  compare against row data, without either site having to re-check it.
*/
export function toStatusFilter(value: unknown): StatusFilter {
  // typeof first: `includes` on a non-string is harmless, but the cast that
  // follows would otherwise hand a number to the rest of the page.
  if (typeof value === "string" && STATUS_FILTERS.includes(value as StatusFilter)) {
    return value as StatusFilter;
  }
  // Anything unrecognised falls back to the default view rather than to 'all'.
  // Failing open to "show me everything" would be the wrong direction for a
  // page whose rows are people's payment records.
  return "pending";
}

/* One member of a team, exactly as §4.2 stores them. */
export type Participant = {
  // Included so React has a stable key; position alone would collide across
  // teams once rows are flattened for rendering.
  id: number;
  // The flag that makes "exactly one lead per team" a partial unique index
  // rather than a trigger — see §4.1. Drives the "Lead" marker in the roster.
  is_lead: boolean;
  // 0 for the lead, 1..4 for members. The display order the doc specifies.
  position: number;
  full_name: string;
  college: string;
  roll_number: string;
  phone: string;
  email: string;
};

/* One team plus its roster, as the embedded PostgREST select returns it. */
export type Team = {
  id: number;
  // The unguessable public handle for a team (§4.2). A bigint id would let
  // anyone who saw one admin URL enumerate the rest by decrementing it.
  public_id: string;
  submitted_at: string;
  updated_at: string;
  team_name: string;
  // Integer paise, never a float — the value is reconciled against a bank
  // statement by a human and 499.00 is not 499.00 in binary floating point.
  amount_paise: number;
  utr: string;
  // Nullable by design: legacy rows have no screenshot. Every read of it must
  // assume null, which is the whole reason the old `matches()` guard was a bug.
  screenshot_path: string | null;
  status: TeamStatus;
  reviewed_at: string | null;
  review_note: string | null;
  // The embedded resource. PostgREST returns it as a nested array; it can come
  // back empty if a team somehow has no participants, so nothing may index it.
  finathon_participant: Participant[];
};

/*
  The columns selected, written out rather than `select=*`.

  Explicit for the same reason listRegistrations() is: ip_hash exists on this
  table and is stored for rate limiting only. Naming the columns means the
  hashed identifier cannot reach the page even by accident — the "enforce it in
  the query, not in the rendering" rule the rest of /axe follows.
*/
const TEAM_COLUMNS = [
  "id",
  "public_id",
  "submitted_at",
  "updated_at",
  "team_name",
  "amount_paise",
  "utr",
  "screenshot_path",
  "status",
  "reviewed_at",
  "review_note",
  // The embedded resource. PostgREST resolves this through the foreign key
  // declared in §4.2, which is why no join syntax is needed or possible here.
  "finathon_participant(id,is_lead,position,full_name,college,roll_number,phone,email)",
].join(",");

/*
  Every team, newest first, each with its roster attached.

  ONE QUERY, NOT TWO. The obvious alternative — fetch teams, then fetch
  participants for those ids — costs a second round trip and re-introduces the
  N+1 the embedded select exists to avoid. It would also open a window where a
  team registered between the two calls has no roster on screen.

  EVERYTHING IS FETCHED AND FILTERED IN NODE, which is the opposite of the rule
  /axe/leads follows. The reason is data volume: this is one row per team for
  one event — hundreds, not millions — and the status tiles need counts across
  ALL statuses, so the unfiltered set has to be in memory regardless. Filtering
  in the query would then require a second round trip to rebuild the counts.
*/
export async function listTeams(limit = 2_000): Promise<Team[]> {
  // Delegated to the shared client so this read inherits its Range cap, its
  // no-store fetch and its scrubbed error path rather than reimplementing all
  // three slightly differently.
  return axeSelect<Team>(
    // A member of the client's own AxeTable union, so a typo here is a compile
    // error rather than a PostgREST 404 discovered at review time.
    "finathon_team",
    `select=${TEAM_COLUMNS}&order=submitted_at.desc`,
    limit,
  );
}

/*
  The prefix every team code carries: ACZCGP-AIM-26 followed by a
  three-digit serial, e.g. ACZCGP-AIM-26001.
*/
export const TEAM_CODE_PREFIX = "ACZCGP-AIM-26";

/*
  Assigns each team its code, keyed by team id.

  Derived rather than stored: the serial is the team's position in submission
  order (oldest = 001), so it needs no migration and is the same on the page
  and in the export. Ties on submitted_at fall back to id so two teams that
  registered in the same millisecond still get a stable order.
*/
export function assignTeamCodes(teams: Team[]): Map<number, string> {
  const ordered = teams.slice().sort((a, b) => {
    const gap = Date.parse(a.submitted_at) - Date.parse(b.submitted_at);
    return Number.isNaN(gap) || gap === 0 ? a.id - b.id : gap;
  });
  const codes = new Map<number, string>();
  ordered.forEach((team, index) => {
    codes.set(team.id, `${TEAM_CODE_PREFIX}${String(index + 1).padStart(3, "0")}`);
  });
  return codes;
}

/*
  Sorts a roster: lead first, then members by position.

  Sorted in Node rather than with PostgREST's embedded `order=` because the
  order of an EMBEDDED resource is the part of PostgREST's query grammar most
  likely to be silently ignored on a version bump — and a roster that renders in
  arbitrary order looks like a data bug to the person reviewing it. One
  comparator here cannot be silently ignored.

  Returns a NEW array. Sorting in place would mutate the object the caller is
  also rendering from, which is how a "why did the order change" bug starts.
*/
export function sortRoster(participants: Participant[]): Participant[] {
  // Defensive default: the embedded array is absent, not empty, if PostgREST
  // ever fails to resolve the relationship, and `.slice()` on undefined throws.
  const roster = Array.isArray(participants) ? participants.slice() : [];
  return roster.sort((a, b) => {
    // `=== true` rather than truthiness: with strictNullChecks off a null
    // boolean is a real possibility here, and `b.is_lead - a.is_lead` on nulls
    // sorts as zero, silently burying the lead in the middle of the list.
    const leadGap = Number(b.is_lead === true) - Number(a.is_lead === true);
    // Lead-ness decided it; no need to compare positions.
    if (leadGap !== 0) {
      return leadGap;
    }
    // A missing position sorts last rather than first, so a null cannot
    // impersonate the lead's position 0.
    const left = typeof a.position === "number" ? a.position : 99;
    const right = typeof b.position === "number" ? b.position : 99;
    return left - right;
  });
}

/*
  Normalises whatever is in screenshot_path into a bucket-relative object key.

  §5 specifies `teams/<uuid>/payment.<ext>`, bucket-relative, and
  `uploadPaymentScreenshot` in src/lib/finathon/teamRegistrations.ts writes
  exactly that today. This page does not own that writer. If it ever gains a
  leading slash or the bucket name as a prefix, the signing call 404s and the
  reviewer sees "no screenshot" for a team that uploaded one — a silent failure
  that looks like missing data rather than a path bug. Normalising here costs
  two replaces and removes a whole class of cross-module mismatch.
*/
function toObjectKey(path: string | null): string | null {
  // Null and empty are the legacy case, which legitimately has no screenshot.
  if (typeof path !== "string" || path.trim() === "") {
    return null;
  }
  // Leading slashes first: `/finathon-payments/teams/...` must lose both.
  const trimmed = path.trim().replace(/^\/+/, "");
  // Then the bucket prefix, if the writer included it. The signing endpoint
  // already names the bucket in its URL, so repeating it here would produce
  // `finathon-payments/finathon-payments/teams/...`.
  return trimmed.replace(new RegExp(`^${PAYMENTS_BUCKET}/+`), "");
}

/*
  Builds the Supabase base URL and the service-role headers.

  Duplicated from src/lib/axe/supabase.ts, where the originals are module
  private, for the ONE call this page makes that the shared client cannot
  express — the review UPDATE. Kept to a single function so the duplication is
  one findable block rather than the same two headers copy-pasted about.

  Both variables are read at call time and checked, not assumed: fetching
  "undefined/rest/v1/..." produces a DNS error several layers down that reads
  like a network fault rather than the missing-config bug it is.
*/
function supabaseCall(): { base: string; headers: Record<string, string> } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Fail closed and loudly. The error boundary turns this into one sentence on
  // screen, so the detail here is for the server log only.
  if (!url || !key) {
    throw new Error("Supabase is not configured; /Finathon/axe/26 cannot load.");
  }
  return {
    // Trailing slashes are a common paste artefact in env vars and would
    // produce a double slash that the Supabase gateway rejects.
    base: url.replace(/\/+$/, ""),
    headers: {
      // PostgREST wants the key in BOTH headers: `apikey` is what the Supabase
      // gateway routes on, `Authorization` is what Postgres derives the role
      // from. One without the other fails in a way that reads like a
      // permissions bug rather than a missing header.
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

/*
  Mints short-lived signed URLs for a set of screenshot paths.

  === WHY SIGNED URLS AND NOT A PROXY ROUTE ===============================
  Serving the bytes through our own /api route would put an attacker-supplied
  file on the aczen.in origin. A polyglot — a file that is a valid JPEG header
  AND valid HTML — would then execute script in the site's own origin, with
  access to the site's cookies. A supabase.co URL cannot: it is a different
  origin, so the same-origin policy contains anything that slips past the
  upload's magic-byte check. The cross-origin URL is the security control, not
  a limitation to work around (§5).
  ==========================================================================

  Signing is delegated to `storageSignedUrl` in the shared client rather than
  reimplemented, so the service-role key is handled in exactly one place and the
  relative-path join that Storage responses require is not written twice.

  Returns a Map keyed by the ORIGINAL screenshot_path, so callers look up by the
  value they already hold rather than by the normalised key they never saw.
*/
export async function signScreenshotUrls(
  paths: (string | null)[],
): Promise<Map<string, string>> {
  // Deduplicated before any request is made, so a page showing forty rows that
  // somehow share three screenshots asks for three signatures, not forty.
  const wanted = new Map<string, string>();
  for (const path of paths) {
    const key = toObjectKey(path);
    // Legacy rows and unparseable paths are skipped rather than signed: they
    // legitimately have no object, and asking Storage for one would turn a
    // normal "this team predates screenshots" case into a logged failure.
    if (key !== null) {
      wanted.set(key, path as string);
    }
  }

  const result = new Map<string, string>();
  // Nothing to sign — returning early avoids spinning up promises that would
  // all resolve to nothing.
  if (wanted.size === 0) {
    return result;
  }

  /*
    CONCURRENT, NOT SEQUENTIAL. Storage signs one object per call, so a queue of
    forty screenshots is forty round trips; awaited in a loop that is forty
    latencies stacked end to end inside a single server render, which is how a
    dashboard starts timing out on the busiest day of the event. Settling them
    together makes it one latency.

    allSettled and not all: `Promise.all` rejects on the FIRST failure and
    discards every URL that had already succeeded, so one deleted object would
    blank out every screenshot link on the page.
  */
  const settled = await Promise.allSettled(
    Array.from(wanted.keys()).map((key) =>
      // The TTL is passed explicitly rather than left to the helper's default,
      // so the sixty seconds this page's UI promises the reviewer is stated
      // where that promise is made.
      storageSignedUrl(PAYMENTS_BUCKET, key, SIGNED_URL_TTL_SECONDS).then((url) => ({
        key,
        url,
      })),
    ),
  );

  for (const outcome of settled) {
    // A rejected signature is logged and skipped: one missing screenshot must
    // not take down the queue, because the reviewer can still read the UTR and
    // the amount and still make a decision without the image.
    if (outcome.status === "rejected") {
      // The reason is a SupabaseWriteError from the shared client, already
      // scrubbed of any response body — a Storage error body echoes the object
      // path, which is the unguessable folder the screenshot lives in.
      console.error("[finathon/admin] signing a screenshot failed:", outcome.reason);
      continue;
    }
    // Looked up by the key that was signed, to recover the original column
    // value the caller will search the Map by.
    const original = wanted.get(outcome.value.key);
    // typeof rather than truthiness, because with strictNullChecks off a
    // missing Map entry is `undefined` and would be set as a key of that type.
    if (typeof original === "string") {
      result.set(original, outcome.value.url);
    }
  }
  return result;
}

/*
  The outcome of a review write, as a value rather than an exception.

  "Nothing was updated" is a NORMAL event here, not a fault: it happens when two
  volunteers open the queue and one approves a team the other is still looking
  at. Modelling it as a thrown error would make the caller's catch block unable
  to tell a stale page from a database outage.
*/
export type ReviewResult =
  | { ok: true }
  | { ok: false; reason: "not-updated" | "error" };

/*
  The URL-safe projection of a review outcome.

  === WHY A CODE IN THE URL AND NOT THE MESSAGE ITSELF =====================
  The review action redirects when it finishes, and the banner it wants to show
  has to survive that redirect. Putting the SENTENCE in the query string would
  make the page a reflected-text renderer: anyone could hand a volunteer
  `?notice=Approved.%20Now%20email%20the%20UTR%20to...` and the dashboard would
  print it in its own voice. Putting a CODE there cannot do that — an unknown
  code renders nothing, and every sentence on screen is one written in this
  repo.

  It also keeps the redirect free of PII, which is the whole point of the other
  half of this rewrite: a status filter and an enum code are safe in a URL in a
  way a student's name never is.
  ==========================================================================

  Lives beside ReviewResult rather than in the page because the two must stay in
  step: every `reason` above needs a code here, and splitting them across files
  is how one gains a case the other does not handle.
*/
export type ReviewNotice =
  | "approved"
  | "rejected"
  | "note-too-long"
  | "stale"
  | "failed";

/*
  Marks one team approved or rejected.

  === THE FILTER IS THE CONCURRENCY CONTROL ================================
  `status=in.(pending,approved,rejected)` is not decoration. It excludes
  'legacy' rows — teams backfilled from the old finathon_registration table in
  §4.4, which have no payment to verify and must never acquire a review — and it
  means the write is expressed as a condition rather than a blind overwrite.
  PostgREST reports how many rows matched, so a request that changed nothing
  comes back distinguishable from one that changed a row, which is what makes
  the stale-page case above detectable at all.
  ==========================================================================
*/
export async function updateTeamReview(
  teamId: number,
  decision: ReviewDecision,
  // Already length-checked by the caller. Null rather than "" when absent, so
  // the column reads as "no note given" rather than "a note that says nothing".
  note: string | null,
): Promise<ReviewResult> {
  const { base, headers } = supabaseCall();
  // Computed once and reused for both columns so `reviewed_at` and `updated_at`
  // cannot differ by a few milliseconds and imply two separate edits.
  const now = new Date().toISOString();

  try {
    const response = await fetch(
      // `select=id` narrows what PostgREST returns to a single integer. Without
      // it, `return=representation` sends the whole row back — team name, UTR,
      // ip_hash — into a variable we would then have to be careful never to
      // log. Not fetching it is stronger than remembering not to print it.
      `${base}/rest/v1/finathon_team?id=eq.${encodeURIComponent(String(teamId))}` +
        `&status=in.(pending,approved,rejected)&select=id`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          // representation, not minimal: the returned array's LENGTH is how
          // "did this match a row" is answered without a second query.
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: decision,
          reviewed_at: now,
          // Written on every review so the column means "last touched", which
          // is what an audit trail needs it to mean.
          updated_at: now,
          review_note: note,
        }),
        cache: "no-store",
      },
    );

    // Status code only. A CHECK violation on review_note would put the note's
    // text into PostgREST's `details` field, and a note can quote a student's
    // message — exactly the row data that must not reach a log line.
    if (!response.ok) {
      console.error(
        `[finathon/admin] review patch failed (${response.status}) for team ${teamId}`,
      );
      return { ok: false, reason: "error" };
    }

    const rows = (await response.json()) as { id: number }[];
    // Zero rows means the id was wrong or the team is 'legacy'. Either way the
    // reviewer's page is out of date, and saying so beats a silent success.
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, reason: "not-updated" };
    }
    return { ok: true };
  } catch (error) {
    // The team id is safe to log — it is an integer, not a person. The error
    // object is ours and carries no response body.
    console.error(`[finathon/admin] review patch threw for team ${teamId}:`, error);
    return { ok: false, reason: "error" };
  }
}
