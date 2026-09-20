/*
  Finathon registration: validation, write, and the dashboard read.

  All three live together because they must agree on the same field bounds. The
  form validates for a helpful message, the database CHECK constraints validate
  for correctness, and a mismatch between them shows up as a form that accepts
  something the database then rejects with a 500. Keeping the bounds in named
  constants here, mirrored by the migration, is what keeps the two in step.
*/

import { SupabaseWriteError, axeCount, axeInsert, axeSelect } from "@/lib/axe/supabase";

// Reads env and Node crypto through its imports, so it is server-only like
// every other module in this chain.
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/finathon/registrations.ts is server-only and must never reach the browser.",
  );
}

/*
  Field bounds, mirroring the CHECK constraints in
  supabase/migrations/20260918101500_finathon_registration.sql.

  Roll numbers are bounded but NOT pattern-matched. The event is open to every
  college in Telangana and each one numbers its students differently, so a regex
  fitted to MLRIT's scheme would silently reject valid entries from everywhere
  else — a failure the organisers would only discover as an unexplained dip in
  registrations from other colleges.
*/
export const LIMITS = {
  name: { min: 2, max: 80 },
  rollNumber: { min: 4, max: 24 },
  // A UPI UTR is 12 digits, but NEFT/IMPS/RTGS references are longer and some
  // apps prefix theirs. Bounded generously and not pattern-matched, because a
  // reference that fails to match is still the only thread back to the payment.
  utr: { min: 8, max: 30 },
<<<<<<< HEAD
  email: { max: 160 },
  // Ten digits for an Indian mobile, up to sixteen so "+91 98765 43210" still
  // fits once the separators are stripped.
  phone: { min: 10, max: 16 },
} as const;

/*
  The same loose address shape the database CHECK enforces: something, an @,
  something, a dot, something.

  Deliberately not one of the long "RFC-compliant" regexes. Those are either
  wrong or unreadable, and the cost of being strict here is asymmetric — a
  rejected valid address loses a registration, whereas an accepted invalid one
  bounces and gets chased by phone, which is why the phone number is also
  required.
*/
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

=======
} as const;

>>>>>>> ce67e70af6824703c236c65f2105429458946b90
/* Shape stored in, and read back from, the table. */
export type Registration = {
  id: number;
  submitted_at: string;
  team_lead_name: string;
  roll_number: string;
<<<<<<< HEAD
  email: string;
  phone: string;
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  utr: string;
};

/* What the API route accepts from the form, before validation. */
export type RegistrationInput = {
  teamLeadName: unknown;
  rollNumber: unknown;
<<<<<<< HEAD
  email: unknown;
  phone: unknown;
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  utr: unknown;
};

/*
  A validated, normalised submission.

  `field` on the failure branch is what lets the form focus and mark the
  offending input rather than showing one message above the whole thing.
*/
<<<<<<< HEAD
export type ValidatedRegistration = {
  teamLeadName: string;
  rollNumber: string;
  email: string;
  phone: string;
  utr: string;
};

export type RegistrationField = keyof ValidatedRegistration;

export type ValidationResult =
  | { ok: true; value: ValidatedRegistration }
  | { ok: false; field: RegistrationField; message: string };
=======
export type ValidationResult =
  | { ok: true; value: { teamLeadName: string; rollNumber: string; utr: string } }
  | { ok: false; field: "teamLeadName" | "rollNumber" | "utr"; message: string };
>>>>>>> ce67e70af6824703c236c65f2105429458946b90

/*
  Collapses runs of whitespace and trims.

  Not cosmetic. A name pasted from a PDF arrives with non-breaking spaces and
  double spaces, and without this the same person submitting twice produces two
  visually identical rows that the unique index cannot see as duplicates.
*/
function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/*
  Validates and normalises one submission.

  Every branch returns a message written for the person filling the form, not
  for a developer: the API route passes these straight through to the UI.
*/
export function validateRegistration(input: RegistrationInput): ValidationResult {
  // Type-checked rather than coerced. String(undefined) is "undefined", which
  // is nine characters and would pass a minimum-length check.
  if (typeof input.teamLeadName !== "string") {
    return { ok: false, field: "teamLeadName", message: "Enter the team lead's name." };
  }
  if (typeof input.rollNumber !== "string") {
    return { ok: false, field: "rollNumber", message: "Enter the team lead's roll number." };
  }
<<<<<<< HEAD
  if (typeof input.email !== "string") {
    return { ok: false, field: "email", message: "Enter an email address." };
  }
  if (typeof input.phone !== "string") {
    return { ok: false, field: "phone", message: "Enter a phone number." };
  }
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  if (typeof input.utr !== "string") {
    return { ok: false, field: "utr", message: "Enter the UTR from your payment." };
  }

  const teamLeadName = tidy(input.teamLeadName);
  const rollNumber = tidy(input.rollNumber);
<<<<<<< HEAD
  // Lowercased, because addresses are compared and typed case-insensitively in
  // practice and a capitalised entry would otherwise look like a different
  // address to anyone scanning the dashboard.
  const email = tidy(input.email).toLowerCase();
  // Separators stripped entirely. People type "+91 98765-43210", and keeping
  // the punctuation would mean the same number stored three different ways,
  // none of which can be dialled straight from the dashboard.
  const phone = tidy(input.phone).replace(/[\s\-()]/g, "");
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  // Whitespace removed entirely rather than collapsed: UPI apps often render
  // the reference in groups ("1234 5678 9012") and a copy-paste carries the
  // gaps, which would otherwise be stored as part of the value and break the
  // match against the bank statement.
  const utr = tidy(input.utr).replace(/\s/g, "");

  if (teamLeadName.length < LIMITS.name.min || teamLeadName.length > LIMITS.name.max) {
    return {
      ok: false,
      field: "teamLeadName",
      message: `Name must be between ${LIMITS.name.min} and ${LIMITS.name.max} characters.`,
    };
  }

  if (
    rollNumber.length < LIMITS.rollNumber.min ||
    rollNumber.length > LIMITS.rollNumber.max
  ) {
    return {
      ok: false,
      field: "rollNumber",
      message: `Roll number must be between ${LIMITS.rollNumber.min} and ${LIMITS.rollNumber.max} characters.`,
    };
  }

<<<<<<< HEAD
  if (!EMAIL_SHAPE.test(email) || email.length > LIMITS.email.max) {
    return {
      ok: false,
      field: "email",
      message: "That does not look like an email address. Check for a typo.",
    };
  }

  /*
    Digits counted, not characters.

    The length check has to ignore a leading "+", or "+919876543210" measures
    thirteen against a ten-to-sixteen bound and passes for the wrong reason
    while a genuinely short number like "+9198765" also passes. Counting digits
    is what the bound is actually about.
  */
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < LIMITS.phone.min || phoneDigits.length > LIMITS.phone.max) {
    return {
      ok: false,
      field: "phone",
      message: "Enter a valid phone number, including the country code if it is not Indian.",
    };
  }

=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  if (utr.length < LIMITS.utr.min || utr.length > LIMITS.utr.max) {
    return {
      ok: false,
      field: "utr",
      message: `The UTR should be ${LIMITS.utr.min}–${LIMITS.utr.max} characters. Copy it from your payment app.`,
    };
  }

<<<<<<< HEAD
  return { ok: true, value: { teamLeadName, rollNumber, email, phone, utr } };
=======
  return { ok: true, value: { teamLeadName, rollNumber, utr } };
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
}

/*
  The outcome of a write, as a value rather than an exception.

  The duplicate cases are normal events — a team double-submitting, or mistyping
  someone else's UTR — and the route needs to show a different message for each.
  Modelling them as thrown errors would mean the route's catch block could not
  tell "already registered" from "the database is down".
*/
export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "duplicate-roll" | "duplicate-utr" | "error" };

// SQLSTATE for unique_violation. Named because "23505" in a conditional is
// unreadable three months later.
const UNIQUE_VIOLATION = "23505";

/*
  Inserts one registration.

  WHICH duplicate was hit cannot be read from the error, because the safe error
  path deliberately strips everything that would say so — the constraint name
  arrives inside Postgres' `details`, the field that carries the offending row's
  values with it. So on a 23505 the two unique indexes are probed with counts
  instead. Two extra reads on a rare path is a fair price for never putting a
  registrant's name in a log.
*/
<<<<<<< HEAD
export async function saveRegistration(
  value: ValidatedRegistration & { ipHash: string },
): Promise<SaveResult> {
=======
export async function saveRegistration(value: {
  teamLeadName: string;
  rollNumber: string;
  utr: string;
  ipHash: string;
}): Promise<SaveResult> {
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  try {
    await axeInsert("finathon_registration", {
      team_lead_name: value.teamLeadName,
      roll_number: value.rollNumber,
<<<<<<< HEAD
      email: value.email,
      phone: value.phone,
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
      utr: value.utr,
      ip_hash: value.ipHash,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof SupabaseWriteError && error.code === UNIQUE_VIOLATION) {
      // Roll number first: if a team resubmits the whole form unchanged, both
      // indexes are violated, and "you have already registered" is the more
      // useful of the two messages.
      if (await rollNumberExists(value.rollNumber)) {
        return { ok: false, reason: "duplicate-roll" };
      }
      return { ok: false, reason: "duplicate-utr" };
    }

    // Logged, not rethrown. The route turns this into a generic message; the
    // detail belongs in the runtime log where only an operator sees it, and
    // SupabaseWriteError is already scrubbed of row values by construction.
    console.error("[finathon/register] insert failed:", error);
    return { ok: false, reason: "error" };
  }
}

/*
  PostgREST filter value escaping.

  A value containing a comma or a parenthesis would otherwise be read as filter
  SYNTAX rather than as data — PostgREST splits `or=(a.eq.1,b.eq.2)` on exactly
  those characters. Double-quoting the value and escaping any embedded quote is
  how PostgREST expects a literal to be passed, and a name like
  O'Brien, or a pasted value with a stray comma, otherwise produces a 400 that
  looks like a server fault rather than the bad input it is.
*/
function quoteFilterValue(value: string): string {
  return `"${value.replace(/["\\]/g, (match) => `\\${match}`)}"`;
}

/* True when this roll number is already registered, compared case-insensitively
   to match the unique index, which is on upper(btrim(...)). */
async function rollNumberExists(rollNumber: string): Promise<boolean> {
  const count = await axeCount(
    "finathon_registration",
    `roll_number=ilike.${quoteFilterValue(rollNumber)}`,
  );
  return count > 0;
}

/*
  Counts registrations already submitted from one hashed IP inside a window.

  The rate limit for the public form. It reads the table rather than an
  in-process counter for the same reason the /axe limiter does: serverless
  instances share no memory, so a Map resets on every cold start and an attacker
  spreading submissions across instances would never trip it.
*/
export async function recentSubmissionCount(
  ipHash: string,
  windowMs: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  return axeCount(
    "finathon_registration",
    `ip_hash=eq.${ipHash}&submitted_at=gte.${since}`,
  );
}

/*
  Every registration, newest first, for the dashboard.

  ip_hash is deliberately NOT selected. It is stored for rate limiting and
  nothing else, it is meaningless to a person reading the table, and leaving it
  out of the query means it cannot reach the page even by accident — the same
  "enforce it in the query, not in the rendering" rule the /axe pages follow.
*/
export async function listRegistrations(limit = 2_000): Promise<Registration[]> {
  return axeSelect<Registration>(
    "finathon_registration",
<<<<<<< HEAD
    "select=id,submitted_at,team_lead_name,roll_number,email,phone,utr&order=submitted_at.desc",
=======
    "select=id,submitted_at,team_lead_name,roll_number,utr&order=submitted_at.desc",
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
    limit,
  );
}
