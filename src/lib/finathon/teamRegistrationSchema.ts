/*
  The one validation definition for Finathon team registration.

  Imported by BOTH the client form and the API route, on purpose. The moment
  there are two copies they drift, and the way that drift surfaces is a student
  who has already paid ₹499 getting a generic 500 because the form accepted
  something the database's CHECK constraint rejects. One module, one set of
  bounds, both sides.

  Named `teamRegistration` rather than `registration` because the legacy
  single-row flow in registrations.ts already owns that word — `RegistrationInput`,
  `validateRegistration`, the `finathon_registration` table. Two different shapes
  under one name is how the wrong validator gets imported at 2am.

  EVERY bound here mirrors a CHECK constraint in
  docs/finathon-registration-rework-design.md §4.2. When a bound changes it
  changes in both places in the same commit, or this file starts lying.
*/

import { z } from "zod";

/*
  Bounds as data, not as literals sprinkled through the schema.

  Exported so the form can render "2–80 characters" in a hint without a second
  copy of the number, and so a future reader can diff this block against the DDL
  in one glance rather than reading twelve `.min()` calls.
*/
export const TEAM_LIMITS = {
  // char_length(btrim(team_name)) between 2 and 80
  teamName: { min: 2, max: 80 },
  // char_length(btrim(utr)) between 8 and 30
  utr: { min: 8, max: 30 },
  // char_length(btrim(full_name)) between 2 and 80
  fullName: { min: 2, max: 80 },
  // char_length(btrim(college)) between 2 and 120
  college: { min: 2, max: 120 },
  // char_length(btrim(roll_number)) between 4 and 24
  rollNumber: { min: 4, max: 24 },
  // char_length(email) <= 160
  email: { max: 160 },
} as const;

/*
  Team size, enforced in three places and deliberately so.

  The database function counts members because no row-level CHECK can count
  sibling rows; this schema counts them so the student gets a sentence instead
  of a 500; the form counts them to decide whether "add member" is offered.
  Same two numbers, one definition.
*/
export const TEAM_SIZE = {
  // Additional members beyond the lead. Lead + 2 = 3 total, lead + 4 = 5 total.
  minMembers: 2,
  maxMembers: 4,
  // What a human is told. Derived, so it cannot disagree with the bounds above.
  get label() {
    return `${this.minMembers + 1} to ${this.maxMembers + 1} members including the team lead`;
  },
} as const;

/* The price, in integer paise, matching finathon_team.amount_paise's default.
   Never a float: 499.00 in binary floating point is not 499.00, and a human
   reconciles this figure against a bank statement. */
export const AMOUNT_PAISE = 49900;

/*
  Collapse internal runs of whitespace and strip the ends.

  Postgres's CHECK uses btrim(), which only strips the ends — but a name typed
  as "Ravi   Kumar" should not be stored with three spaces just because the
  database would tolerate it. Trimming harder than the constraint is always
  safe; trimming softer is what produces a row the constraint rejects.
*/
const tidy = (value: string) => value.replace(/\s+/g, " ").trim();

/*
  Reduce anything a student might type into the ten digits the database wants.

  Runs BEFORE validation, not after, because "+91 98765 43210" is a correct
  phone number that fails `^[6-9][0-9]{9}$` purely on formatting. Rejecting it
  would be the form being wrong about reality, which is the most expensive kind
  of validation error — the user cannot tell what to change.
*/
const normalisePhone = (value: string) => {
  // Everything that is not a digit goes: spaces, hyphens, brackets, the + sign.
  const digits = value.replace(/\D/g, "");
  // 91XXXXXXXXXX — the country code typed with or without the plus.
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  // 0XXXXXXXXXX — the old STD-style trunk prefix, still muscle memory for many.
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  // Anything else is handed on unchanged and left for the regex to judge.
  return digits;
};

/*
  A UTR loses ALL whitespace rather than having it collapsed.

  UPI apps render the reference in groups — "1234 5678 9012" — and a copy-paste
  carries the gaps. Storing them would break the match against the bank
  statement, which is the single thing this column exists to support. The
  existing legacy validator already made this call; keeping the same behaviour
  means old and new rows compare equal.
*/
const tidyUtr = (value: string) => value.replace(/\s/g, "").trim();

/*
  Email, deliberately permissive: one @, a dot after it, no whitespace.

  A strict RFC 5322 regex rejects addresses that real universities really issue.
  The only claims worth enforcing here are the ones that make the value usable
  at all — anything stricter trades a support email for a validation error.
  This is character-for-character the CHECK constraint in §4.2.
*/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* Indian mobile: ten digits, first one 6-9. Applied after normalisePhone, so by
   here any +91 or punctuation the student typed is already gone. */
const PHONE_PATTERN = /^[6-9][0-9]{9}$/;

/*
  One human on a team — the lead included.

  The lead is not a different shape from a member; §4.1 of the design doc puts
  every person in one table with an is_lead flag precisely so that "one student,
  one team" is a single unique index instead of a trigger spanning two tables.
  The schema mirrors that: one participant shape, used for both.
*/
export const participantSchema = z.object({
  fullName: z
    // Coerced through tidy() before any length check, so "  Ravi  " is measured
    // at 4 characters the way Postgres's btrim() will measure it.
    .string({ required_error: "Enter this person's full name." })
    .transform(tidy)
    .pipe(
      z
        .string()
        .min(TEAM_LIMITS.fullName.min, `Name must be at least ${TEAM_LIMITS.fullName.min} characters.`)
        .max(TEAM_LIMITS.fullName.max, `Name must be ${TEAM_LIMITS.fullName.max} characters or fewer.`),
    ),

  college: z
    .string({ required_error: "Enter this person's college." })
    .transform(tidy)
    .pipe(
      z
        .string()
        .min(TEAM_LIMITS.college.min, `College must be at least ${TEAM_LIMITS.college.min} characters.`)
        .max(TEAM_LIMITS.college.max, `College must be ${TEAM_LIMITS.college.max} characters or fewer.`),
    ),

  rollNumber: z
    // No pattern, deliberately. Colleges invent roll-number formats and any
    // regex here would reject a real student. Length is the only honest claim.
    .string({ required_error: "Enter this person's roll number." })
    .transform(tidy)
    .pipe(
      z
        .string()
        .min(TEAM_LIMITS.rollNumber.min, `Roll number must be at least ${TEAM_LIMITS.rollNumber.min} characters.`)
        .max(TEAM_LIMITS.rollNumber.max, `Roll number must be ${TEAM_LIMITS.rollNumber.max} characters or fewer.`),
    ),

  phone: z
    .string({ required_error: "Enter this person's phone number." })
    .transform(normalisePhone)
    .pipe(z.string().regex(PHONE_PATTERN, "Enter a 10-digit Indian mobile number.")),

  email: z
    // Lowercased as well as trimmed: addresses are case-insensitive in practice,
    // and storing mixed case makes a later duplicate check miss.
    .string({ required_error: "Enter this person's email address." })
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .string()
        .max(TEAM_LIMITS.email.max, `Email must be ${TEAM_LIMITS.email.max} characters or fewer.`)
        .regex(EMAIL_PATTERN, "Enter a valid email address."),
    ),
});

/* The validated shape of one person, inferred rather than hand-written so it
   cannot fall out of step with the schema above. */
export type Participant = z.infer<typeof participantSchema>;

/*
  Step 1 of the form: who is registering.

  Kept separate from the payment fields because the form validates this half on
  its own before letting the student move to the payment step. Asking someone to
  fix a typo in member 3's email *after* they have paid is the flow this split
  exists to prevent.
*/
export const teamDetailsSchema = z
  .object({
    teamName: z
      .string({ required_error: "Enter a team name." })
      .transform(tidy)
      .pipe(
        z
          .string()
          .min(TEAM_LIMITS.teamName.min, `Team name must be at least ${TEAM_LIMITS.teamName.min} characters.`)
          .max(TEAM_LIMITS.teamName.max, `Team name must be ${TEAM_LIMITS.teamName.max} characters or fewer.`),
      ),

    /* The lead is a participant. Same shape, flagged by position rather than by
       carrying a parallel set of lead_* fields. */
    lead: participantSchema,

    /* The other 2-4 people. Array bounds here are the client-side half of the
       same rule the database function raises check_violation for. */
    members: z
      .array(participantSchema)
      .min(TEAM_SIZE.minMembers, `A team needs ${TEAM_SIZE.label}.`)
      .max(TEAM_SIZE.maxMembers, `A team needs ${TEAM_SIZE.label}.`),
  })
  /*
    "One student, one team" is a unique index on upper(btrim(roll_number)) in the
    database. That index also catches duplicates WITHIN a single submission — but
    only as a 23505 after the insert has been attempted, which reaches the student
    as an opaque failure on a page where they have already paid.

    Catching it here turns that into a message pointing at the offending field.
    superRefine rather than refine because it can attach the error to a path,
    which is what lets react-hook-form highlight the right input.
  */
  .superRefine((value, ctx) => {
    // Every roll number in the submission, lead first, in field order.
    const rolls = [value.lead.rollNumber, ...value.members.map((m) => m.rollNumber)];
    // Compared case- and whitespace-insensitively, matching upper(btrim(...)).
    const seen = new Map<string, number>();

    rolls.forEach((roll, index) => {
      const key = roll.toUpperCase();
      // Already claimed by an earlier person in this same team.
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This roll number is already used by another member of this team.",
          // index 0 is the lead; 1..4 map onto members[0..3].
          path: index === 0 ? ["lead", "rollNumber"] : ["members", index - 1, "rollNumber"],
        });
        return;
      }
      seen.set(key, index);
    });
  });

/* The validated shape of step 1. */
export type TeamDetails = z.infer<typeof teamDetailsSchema>;

/*
  Step 2: the payment evidence.

  The screenshot itself is NOT validated here. A File object does not exist on
  the server and a Buffer does not exist in the browser, so a shared schema
  cannot describe it without one side importing a type it has no runtime for.
  The file is checked where its bytes actually are — magic-byte sniffing in the
  API route, an accept filter plus a size check in the form.
*/
export const paymentSchema = z.object({
  utr: z
    .string({ required_error: "Enter the UTR from your payment." })
    .transform(tidyUtr)
    .pipe(
      z
        .string()
        .min(
          TEAM_LIMITS.utr.min,
          `The UTR should be ${TEAM_LIMITS.utr.min}–${TEAM_LIMITS.utr.max} characters. Copy it from your payment app.`,
        )
        .max(
          TEAM_LIMITS.utr.max,
          `The UTR should be ${TEAM_LIMITS.utr.min}–${TEAM_LIMITS.utr.max} characters. Copy it from your payment app.`,
        ),
    ),
});

/* The validated shape of step 2. */
export type Payment = z.infer<typeof paymentSchema>;

/*
  What the API route parses: both steps at once.

  The form posts everything in one request — step 1 never touches the network —
  so the server validates the whole thing as a unit. This is the authoritative
  copy. The client-side checks are a convenience for honest users and no
  obstacle whatsoever to curl, which is why every rule above runs again here.
*/
export const teamRegistrationSchema = teamDetailsSchema.and(paymentSchema);

/* The full validated submission. */
export type TeamRegistration = z.infer<typeof teamRegistrationSchema>;

/*
  Flatten a zod error into the { field, message } pair the existing routes and
  form already speak.

  Returning the FIRST issue rather than all of them is deliberate: the form
  shows one message against one field and scrolls to it, and a route that
  returned twelve messages would still only have one place to put them.

  `issues[0]` is read defensively even though a failed parse always has at least
  one issue — under `strictNullChecks: false` TypeScript will not warn about the
  undefined case, so the guard has to be written by hand or not exist at all.
*/
export function firstIssue(error: z.ZodError): { field: string; message: string } {
  const issue = error.issues[0];
  // No issues on a failed parse should be impossible; say something useful anyway.
  if (!issue) return { field: "form", message: "Check the form and try again." };
  // "members.2.email" — a dotted path the form maps straight onto its field ids.
  return { field: issue.path.join("."), message: issue.message };
}
