"use server";

/*
  Server Actions for /Finathon/axe/26.

  The directive is the first line of the file, not the first line after the
  comment block, because Next requires "use server" to head the module — a
  statement above it turns every export below into an ordinary function that
  silently stops being callable from the form.

  === THE THING THAT IS EASY TO GET WRONG HERE =============================
  A Server Action is a PUBLIC HTTP ENDPOINT. Marking a module "use server"
  compiles every exported function into a POST route addressed by an opaque
  action id, and that id ships to the browser inside the page's own HTML. The
  gate in app/Finathon/axe/26/layout.tsx does NOT protect it: the layout guards
  RENDERING, and an action invocation is not a render. Anyone who has ever seen
  this page — a volunteer whose password was later rotated, or anyone who
  scraped the id from a shared screenshot of the HTML — can replay the POST.

  So EVERY action below re-checks `hasFinathonSession()` as its first statement,
  before it reads its own arguments. That is not belt-and-braces; it is the only
  authorisation these endpoints have. The same rule the page already follows for
  its query ("check before you touch data, not after") applies twice as hard to
  a function that WRITES.
  ==========================================================================
*/

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasFinathonSession } from "@/lib/finathon/gate";
import {
  REVIEW_NOTE_MAX_LENGTH,
  toStatusFilter,
  updateTeamReview,
  type ReviewDecision,
  type ReviewNotice,
} from "./data";
import {
  SEARCH_COOKIE_NAME,
  SEARCH_COOKIE_PATH,
  SEARCH_MAX_LENGTH,
  searchCookieOptions,
} from "./searchState";

// The route these actions revalidate and redirect to. A constant because it
// appears in four places below and a typo in one of them would produce a page
// that updates everywhere except the one path that matters.
const DASHBOARD_PATH = "/Finathon/axe/26";

/*
  Refuses to continue unless the caller holds a valid Finathon session.

  Throws rather than returning false. A caller that forgot to check the return
  value would carry on and write to the database; an exception cannot be
  ignored by omission. The message is generic because it surfaces through the
  error boundary, where it is read by whoever triggered it.
*/
async function requireSession(): Promise<void> {
  // `=== false` is not needed on a plain boolean, but the await is: without it
  // the Promise object is truthy and the guard passes for everyone.
  if ((await hasFinathonSession()) !== true) {
    throw new Error("Not authorised.");
  }
}

/*
  Stores the search text for this reviewer and re-renders the queue.

  POST, not GET — that is the entire point of this function's existence. See the
  header of searchState.ts for what a GET was leaking and where it leaked to.
*/
export async function applySearch(formData: FormData): Promise<void> {
  // First statement, before the form body is read. See the module header.
  await requireSession();

  // FormData.get returns `FormDataEntryValue | null`: a File if the field was a
  // file input, null if absent. Typeof is the only safe narrowing, and with
  // strictNullChecks off TypeScript would not have demanded it.
  const raw = formData.get("q");
  const query = typeof raw === "string" ? raw.trim().slice(0, SEARCH_MAX_LENGTH) : "";

  const store = await cookies();
  // An empty search is a CLEAR, not a cookie holding "". Writing the empty
  // string would leave the cookie in the jar, doing nothing, until it expired —
  // and the Clear button would look like it had failed.
  if (query === "") {
    store.delete({ name: SEARCH_COOKIE_NAME, path: SEARCH_COOKIE_PATH });
  } else {
    store.set(SEARCH_COOKIE_NAME, query, searchCookieOptions());
  }

  // No redirect. The page must keep whatever `?status=` filter the reviewer had
  // open, and re-rendering in place preserves it for free; redirecting would
  // mean reconstructing the URL and getting it wrong on the edge cases.
  revalidatePath(DASHBOARD_PATH);
}

/*
  Drops the stored search.

  A separate action rather than a `value=""` submit button on the same form,
  because a button that relies on overriding another field's value is a
  behaviour nobody can see by reading the markup.
*/
export async function clearSearch(): Promise<void> {
  await requireSession();
  const store = await cookies();
  // The `path` MUST match the one it was set with. A delete at the default path
  // silently no-ops and leaves the original cookie alive — the most common way
  // a working "clear" button appears to do nothing.
  store.delete({ name: SEARCH_COOKIE_NAME, path: SEARCH_COOKIE_PATH });
  revalidatePath(DASHBOARD_PATH);
}

/*
  Approves or rejects one team.

  Structured as validate → write → redirect, with the redirect OUTSIDE any
  try/catch. Next implements `redirect()` by throwing a control-flow signal, so
  calling it inside a `try` means the catch block swallows the navigation and
  the reviewer sees nothing happen.
*/
export async function reviewTeam(formData: FormData): Promise<void> {
  await requireSession();

  // Read back so the redirect returns the reviewer to the tab they were on
  // instead of dumping them into the default view after every decision.
  // Whitelisted by toStatusFilter, so it is safe to interpolate below.
  const statusFilter = toStatusFilter(formData.get("statusFilter"));

  const rawId = formData.get("teamId");
  // Number() and not parseInt(): parseInt("12abc") is 12, which would let a
  // malformed field address a real row. Number("12abc") is NaN.
  const teamId = Number(rawId);

  const rawDecision = formData.get("decision");
  // Compared against the two literals rather than cast. The value reaches a
  // CHECK-constrained column, and a cast would only move the rejection from
  // here to a PostgREST 400 that carries the bad value in its error body.
  const decision: ReviewDecision | null =
    rawDecision === "approved" || rawDecision === "rejected" ? rawDecision : null;

  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim() : "";

  // A bad id or decision is a tampered or stale form, not a reviewer mistake,
  // so it gets the same generic notice as a failure rather than its own copy.
  if (!Number.isInteger(teamId) || teamId <= 0 || decision === null) {
    finishReview(statusFilter, "failed");
  }

  // Checked here as well as by `maxLength` on the textarea, because maxLength is
  // a browser courtesy: it is absent from a curl request and removable in
  // DevTools. Without this the over-long note reaches the CHECK constraint, and
  // PostgREST's error body would then echo the note's text into the log.
  if (note.length > REVIEW_NOTE_MAX_LENGTH) {
    finishReview(statusFilter, "note-too-long");
  }

  const result = await updateTeamReview(
    teamId,
    decision,
    // null, not "", for an omitted note — so the column distinguishes "no note
    // was written" from "a note was written and it was empty".
    note === "" ? null : note,
  );

  // `=== false` and never `!result.ok`. This repo runs with strictNullChecks
  // off, and TypeScript will NOT narrow a discriminated union through
  // truthiness under that setting — `!result.ok` compiles but leaves `result`
  // as the full union, so `result.reason` below would be a silent `any`.
  if (result.ok === false) {
    // 'stale' and 'failed' say different things to the reviewer: one means
    // "someone else already handled this", the other means "try again".
    finishReview(statusFilter, result.reason === "not-updated" ? "stale" : "failed");
  }

  // Reached only on success, because every branch above ends in a redirect.
  finishReview(statusFilter, decision === "approved" ? "approved" : "rejected");
}

/*
  Revalidates the queue and navigates back to it with a notice code.

  Extracted because it is the tail of five separate branches above, and the one
  thing that must be identical in all five is that `revalidatePath` runs BEFORE
  `redirect` — the redirect throws, so anything after it is dead code.

  Returns `never`, which is what tells TypeScript the callers' branches
  terminate. Without it, the compiler would believe execution continues past
  each `finishReview(...)` call and the narrowing on `decision` would be lost.
*/
function finishReview(statusFilter: string, notice: ReviewNotice): never {
  // Discards the cached RSC payload for this route so the redirect lands on
  // freshly queried rows rather than the pre-review snapshot the router held.
  revalidatePath(DASHBOARD_PATH);
  // Both values are from closed unions — `statusFilter` through toStatusFilter,
  // `notice` through the ReviewNotice type — so nothing attacker-chosen reaches
  // the URL. encodeURIComponent is belt-and-braces against a future value
  // gaining a character that means something in a query string.
  redirect(
    `${DASHBOARD_PATH}?status=${encodeURIComponent(statusFilter)}` +
      `&notice=${encodeURIComponent(notice)}`,
  );
}
