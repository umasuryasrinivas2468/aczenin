"use client";

/*
  The Finathon team registration form — two steps, one submission.

  Step one (team name, the lead, and 2-4 more people) lives entirely in React
  state and never touches the network. Step two (the QR, a payment screenshot
  and the UTR) posts EVERYTHING at once as a single multipart request.

  Why one submission rather than "save the team, then attach the payment": the
  server can then write the team, its participants and the payment inside one
  database transaction. No draft rows, no half-registered teams, nothing for an
  organiser to reconcile by hand at midnight. The cost is real and is paid
  here — closing the tab at step two would lose step one — so step one is
  mirrored into sessionStorage on every keystroke and cleared on success. The
  file and the UTR are deliberately NOT mirrored: a payment reference sitting in
  a shared machine's browser storage is a liability, and a File cannot be
  serialised anyway.

  This replaces RegistrationForm.tsx, which stays on disk unused until the API
  route it talks to is retired.
*/

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  FieldErrors,
  FieldPath,
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form";

import {
  AMOUNT_PAISE,
  REGISTRATION_CLOSES_AT,
  TEAM_LIMITS,
  TEAM_SIZE,
  registrationIsClosed,
  teamDetailsSchema,
  teamRegistrationSchema,
  type Participant,
  type Payment,
  type TeamDetails,
} from "@/lib/finathon/teamRegistrationSchema";

/* ---------------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------------ */

/* Where a team goes after their payment is recorded. Devnovate runs the event
   itself; this form only captures the roster and the money. */
const DEVNOVATE_URL = "https://devnovate.co/event/finthon-2o";

/* The payment QR as a static file. The .jpg, not the .png sitting beside it:
   the jpg is the 640x640 square that renders undistorted in the frame below. */
const QR_IMAGE_SRC = "/images/finathon/payment-qr.jpg";

/* Rendered inside a 13rem frame with 0.75rem of padding on each side, so the
   image's own box is 184px. Stated rather than left to CSS because next/image
   needs intrinsic dimensions to reserve the space and avoid a layout shift. */
const QR_RENDER_PX = 184;

/*
  The price, printed from the same integer the database stores.

  Derived rather than typed as "₹499" so the two can never disagree, and
  computed without toLocaleString because this component is server-rendered
  first: a locale-dependent string is the classic source of a hydration
  mismatch when the server's ICU data differs from the browser's.
*/
const AMOUNT_LABEL =
  AMOUNT_PAISE % 100 === 0
    ? `₹${AMOUNT_PAISE / 100}`
    : `₹${(AMOUNT_PAISE / 100).toFixed(2)}`;

/*
  What the screenshot may be.

  The same three types the storage bucket declares in its allowed_mime_types.
  Checked here so a student learns immediately instead of after a 5 MB upload,
  and checked again server-side by sniffing magic bytes — because this list is
  the browser's opinion of the file, which any caller can simply lie about.
*/
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* The bucket's file_size_limit, restated. 5 MB in bytes, written as the
   multiplication so the number is checkable at a glance. */
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

/* The `accept` attribute for the file picker. Built from the list above so a
   type added to one is added to both; a picker that offers a file the code then
   rejects is a worse experience than no filter at all. */
const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

/*
  The sessionStorage key for the step-one draft.

  Versioned. When the field set changes, the suffix changes too, and an old
  draft is simply not found rather than being restored into a form that no
  longer has those fields.
*/
const DRAFT_KEY = "finathon:team-draft:v1";

/* ---------------------------------------------------------------------------
   Types
   ------------------------------------------------------------------------ */

/*
  Everything the form holds, which is step one plus the UTR.

  The screenshot is absent on purpose: a File exists in the browser and not on
  the server, so the shared schema cannot describe it without one side
  importing a type it has no runtime for. It lives in its own useState below.
*/
type RegistrationValues = TeamDetails & Payment;

/* One row of the participant field table. `as const` below turns `key` into a
   union of the five literal names, which is what lets `register()` build a
   valid path from it without a cast. */
type ParticipantFieldKey = keyof Participant;

/*
  Where a participant's fields live in the form's value tree.

  Either the single lead, or one slot in the members array. Typed as a template
  literal so `${basePath}.${key}` resolves to a real field path rather than to
  `string`, which react-hook-form would reject.
*/
type ParticipantPath = "lead" | `members.${number}`;

/* ---------------------------------------------------------------------------
   Field table
   ------------------------------------------------------------------------ */

/*
  The five fields every person has, declared once as data.

  Five people times five fields is twenty-five inputs. Written out by hand they
  would drift — one missing hint, one wrong inputMode — and the drift would only
  show up on somebody's phone. As a table, a change lands on all five people.
*/
const PARTICIPANT_FIELDS = [
  {
    key: "fullName",
    label: "Full name",
    hint: "As it should appear on the certificate.",
    // Only ever applied to the lead; see the autoComplete note in Person below.
    autoComplete: "name",
    inputMode: "text",
  },
  {
    key: "college",
    label: "College",
    // "Not an abbreviation" because organisers sort by this string later, and
    // MLRIT, M.L.R.I.T and MLR Institute of Technology sort as three colleges.
    hint: "Full institution name, not an abbreviation.",
    autoComplete: "organization",
    inputMode: "text",
  },
  {
    key: "rollNumber",
    label: "Roll number",
    // The bound comes from the schema, so the hint cannot outlive the rule.
    hint: `${TEAM_LIMITS.rollNumber.min}-${TEAM_LIMITS.rollNumber.max} characters. One person may only be on one team.`,
    // Never autofilled: no browser has a sensible remembered value for this,
    // and an autofilled email here would be checked against the duplicate index.
    autoComplete: "off",
    inputMode: "text",
  },
  {
    key: "phone",
    label: "Phone",
    hint: "10-digit mobile. +91, spaces and hyphens are fine.",
    autoComplete: "tel",
    // tel, not numeric: the tel keypad includes + and the separators the hint
    // just promised are acceptable, and the schema strips them before checking.
    inputMode: "tel",
  },
  {
    key: "email",
    label: "Email",
    // Says who the address is for, because on a five-person form the natural
    // reading of a bare "Email" label is "the lead's, again".
    hint: "Where confirmation for this person is sent.",
    autoComplete: "email",
    // The email keypad puts @ and . on the first layer, which is the whole
    // reason to name the mode rather than leaving it as text.
    inputMode: "email",
  },
] as const;

/* ---------------------------------------------------------------------------
   Marks — an icon always travels with an error, never colour alone
   ------------------------------------------------------------------------ */

/*
  The problem mark: a triangle.

  A distinct SHAPE from the round note mark below, so the difference between a
  warning and a remark survives greyscale, a monochrome display and every form
  of colour blindness. aria-hidden because the sentence beside it already says
  what happened; announcing "warning triangle" first would only delay it.
*/
function MarkAlert() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      {/* Drawn with currentColor so one component serves the error red in a
          field message and the same red in the form-level notice. */}
      <path
        d="M8 1.5 15 14.5H1L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* The stem and the dot of the exclamation, as two strokes rather than a
          glyph, so no font substitution can change the mark's shape. */}
      <path d="M8 6.2v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

/* The remark mark: a circle. Used for the neutral banded notice, where the
   message is information rather than a failure. */
function MarkNote() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Field
   ------------------------------------------------------------------------ */

/*
  One labelled input: label in the gutter, ruled underline, hint beneath.

  Exactly the layout the previous form used, extracted so that twenty-six
  inputs cannot each grow their own slightly different accessibility wiring.
  Everything that distinguishes a valid field from an invalid one — the
  aria-invalid flag, the describedby list, the thickened rule — is decided in
  this one place.
*/
function Field({
  id,
  label,
  hint,
  error,
  registration,
  autoComplete,
  inputMode,
  uppercase,
}: {
  // Used for htmlFor and to derive the hint's and error's own ids.
  id: string;
  label: string;
  hint: string;
  // Absent when the field is fine; the message itself when it is not.
  error?: string;
  // The spread from react-hook-form's register(): name, ref, onChange, onBlur.
  registration: UseFormRegisterReturn;
  autoComplete: string;
  inputMode: "text" | "tel" | "email" | "numeric";
  // Roll numbers are shown uppercased because that is how colleges write them.
  uppercase?: boolean;
}) {
  // Derived rather than passed, so a caller cannot wire a hint to the wrong id.
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    /* The ledger row: a fixed label gutter beside a fluid content column at
       tablet width and up, stacked below it. 14rem matches the gutter the rest
       of the page uses, so labels here line up with labels everywhere else. */
    <div className="mt-6 grid gap-1.5 sm:grid-cols-[14rem_1fr] sm:gap-8">
      {/* A real <label> bound by htmlFor, never a placeholder: placeholder text
          disappears the moment someone starts typing, which is exactly when a
          person filling their fourth teammate's details needs it most. */}
      <label htmlFor={id} className="fin-meta pt-3">
        {label}
      </label>

      <div>
        <input
          id={id}
          // The registration spread must come before any prop it could set, or
          // a later duplicate would silently replace RHF's own ref or onChange.
          {...registration}
          autoComplete={autoComplete}
          inputMode={inputMode}
          // aria-invalid is both the announcement and the CSS hook for the red
          // rule, so the two cannot be applied independently of each other.
          aria-invalid={error ? "true" : undefined}
          // The hint is always described; the error joins it only when present.
          // Order matters: a screen reader reads the list left to right, and
          // "what went wrong" is more urgent than "what this field is for".
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          className={`fin-field-rule ${uppercase ? "uppercase" : ""}`}
        />

        {/* The hint sits under the rule where a ledger prints its column note.
            Rendered always, so the layout does not jump when an error appears
            and then is fixed. */}
        <p id={hintId} className="fin-field-hint">
          {hint}
        </p>

        {/* The error, with its mark. Not wrapped in a live region of its own:
            twenty-six live regions would talk over each other. The form-level
            region announces that something failed; focus then lands here and
            aria-describedby reads this out. */}
        {error ? (
          <p id={errorId} className="fin-field-error">
            <MarkAlert />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Person — the five fields for one participant
   ------------------------------------------------------------------------ */

/*
  Renders one person's five inputs against a base path in the value tree.

  Takes the errors for THIS person rather than the whole error object, so the
  component cannot accidentally read member 2's message into member 3's field.
*/
function Person({
  basePath,
  errors,
  register,
  isLead,
}: {
  basePath: ParticipantPath;
  // Undefined when this person has no errors at all, which is the common case.
  errors: FieldErrors<Participant> | undefined;
  register: UseFormRegister<RegistrationValues>;
  isLead: boolean;
}) {
  return (
    <>
      {PARTICIPANT_FIELDS.map((field) => {
        // "lead.fullName", "members.2.email" — the same dotted path zod reports
        // in issue.path, which is what lets a server error be mapped onto the
        // right input with no translation table in between.
        const name = `${basePath}.${field.key}` as FieldPath<RegistrationValues>;

        return (
          <Field
            key={name}
            // Dots are legal in an id but awkward in a CSS selector, so the
            // path is hyphenated. Deterministic, so it is stable across renders
            // and readable in devtools.
            id={`fin-${name.replace(/\./g, "-")}`}
            label={field.label}
            hint={field.hint}
            // The message for this exact field, or undefined. The index is the
            // literal key, so TypeScript resolves it against Participant.
            error={errors?.[field.key]?.message}
            registration={register(name)}
            /*
              Autofill is offered to the LEAD only.

              The person at the keyboard is the lead, so the browser's
              remembered name, phone and email are right for that block and
              wrong for every other. Left on, autofill would cheerfully put the
              lead's own email into all four teammates — and the schema's
              duplicate-roll check would not catch it, because an email is not
              a roll number. Turning it off for members is the fix.
            */
            autoComplete={isLead ? field.autoComplete : "off"}
            inputMode={field.inputMode}
            uppercase={field.key === "rollNumber"}
          />
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Draft persistence
   ------------------------------------------------------------------------ */

/* An empty person, used for the initial form values and for each member added
   after mount. Every key present, because react-hook-form treats a missing key
   and an empty string differently when it decides whether a field is dirty. */
function emptyParticipant(): Participant {
  return { fullName: "", college: "", rollNumber: "", phone: "", email: "" };
}

/* Anything that is not a string becomes an empty one. Draft data comes back
   from storage as `unknown`, and a number where a string belongs would make
   React switch the input between controlled and uncontrolled mid-session. */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/* Rebuild one person from untrusted JSON, key by key. Never a spread: a spread
   would carry whatever else the stored object happened to hold into form state,
   and from there into the request body. */
function participantFromDraft(value: unknown): Participant {
  // A null or a string where an object belongs yields a blank person rather
  // than a crash on property access.
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    fullName: asString(source.fullName),
    college: asString(source.college),
    rollNumber: asString(source.rollNumber),
    phone: asString(source.phone),
    email: asString(source.email),
  };
}

/*
  Read the step-one draft back, or null if there is nothing usable.

  Every step is guarded. sessionStorage throws outright in a browser with
  storage blocked, JSON.parse throws on a truncated write, and the shape may be
  from a version of this form that no longer exists. A student who has lost
  their draft is mildly annoyed; a student who meets a blank white page because
  restoring it threw is gone.
*/
function readDraft(): TeamDetails | null {
  let raw: string | null = null;

  try {
    raw = window.sessionStorage.getItem(DRAFT_KEY);
  } catch {
    // Storage disabled or partitioned. The form still works, just without the
    // safety net, which is the correct degradation.
    return null;
  }

  // Nothing saved yet — the ordinary first-visit case, not an error.
  if (!raw) return null;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  // A draft that is not an object cannot be read field by field.
  if (!parsed || typeof parsed !== "object") return null;
  const source = parsed as Record<string, unknown>;

  // Members must be a list; anything else falls back to the empty two.
  const storedMembers = Array.isArray(source.members) ? source.members : [];
  // Clamped to the schema's own bounds, so a hand-edited draft claiming nine
  // members cannot render nine blocks the form would then refuse to submit.
  const members = storedMembers
    .slice(0, TEAM_SIZE.maxMembers)
    .map((member) => participantFromDraft(member));

  // Topped up to the minimum, so the form always opens with the smallest legal
  // team rather than with a list the Next button would immediately reject.
  while (members.length < TEAM_SIZE.minMembers) members.push(emptyParticipant());

  return {
    teamName: asString(source.teamName),
    lead: participantFromDraft(source.lead),
    members,
  };
}

/* ---------------------------------------------------------------------------
   The form
   ------------------------------------------------------------------------ */

export default function TeamRegistrationForm() {
  /* Which half is on screen. A union of two words rather than a number,
     because `step === "payment"` cannot be misread the way `step === 2` can. */
  const [step, setStep] = useState<"team" | "payment">("team");

  /* The screenshot, held outside react-hook-form. A File is not JSON, is not
     in the shared schema, and must never reach sessionStorage — keeping it in
     its own state makes all three of those true by construction. */
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  /* A blob: URL for the thumbnail. Held in state rather than derived during
     render because creating one is a side effect that leaks memory until it
     is revoked. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* In flight. Drives the CTA's aria-disabled state and the guard that stops
     a second submission from being sent while the first is still open. */
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* The team's reference, returned by the server on success. Shown so the
     student has something to quote in an email if anything is queried. */
  const [publicId, setPublicId] = useState<string | null>(null);

  /* The form-level message: a rejected submission, a network failure, or a
     bound that was reached. `tone` picks the mark and the rule colour. */
  const [notice, setNotice] = useState<{ tone: "note" | "error"; text: string } | null>(null);

  /* Whether the QR file failed to load. An <Image> pointing at a missing file
     renders a broken-image icon next to the words "scan to pay", which is
     worse than saying plainly that it is not there. */
  const [qrMissing, setQrMissing] = useState(false);

  /*
    Whether the deadline has passed.

    Starts false and is corrected in an effect, rather than being read during
    render. This component is server-rendered, and this page has no dynamic
    data, so Next renders it once at BUILD time — a deadline evaluated there
    would be frozen at whenever the site was last deployed. Worse, a value that
    differs between the server's render and the browser's first render is a
    hydration mismatch, which React resolves by throwing the subtree away.
    Assuming "open" and correcting after mount is the only version that is both
    truthful and hydration-safe; the submit path is guarded separately so the
    one frame before the effect runs cannot actually send anything.
  */
  const [closed, setClosed] = useState(false);

  /* Focused when the step changes, so a keyboard or screen-reader user is put
     at the top of the new content instead of being left on a button that has
     just been replaced. */
  // Typed as a <legend>, which is what each step's heading actually is: the
  // fieldset's first child, and so the only element that may carry it.
  const stepHeadingRef = useRef<HTMLLegendElement>(null);

  /* The file input, focused when the screenshot is what is wrong. It is not a
     react-hook-form field, so setFocus cannot reach it. */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* True once the first render has happened. Without it the step-change effect
     below would fire on mount and steal focus from the top of the page. */
  const mountedRef = useRef(false);

  /* Destructured rather than kept as one `form` object, so every capability
     this component uses is listed in one place and an unused one is visible. */
  const {
    // Binds an input to a path: name, ref, onChange, onBlur in one spread.
    register,
    // Wraps the submit handler in the resolver, and focuses the first error.
    handleSubmit,
    // Reads the current values without subscribing to them, which is what step
    // one's validation needs — it runs on a button press, not on every render.
    getValues,
    // Places a message against a field: used for zod issues on step one and
    // for whatever the server blames on step two.
    setError,
    // Wipes the previous attempt's messages so a fixed field stops being red.
    clearErrors,
    // Moves focus to a field by path. The accessibility requirement that a
    // failed validation must land the person ON the problem.
    setFocus,
    // Re-seeds the entire form, field array included, when a draft is restored.
    reset,
    // Subscribed to for the sessionStorage mirror.
    watch,
    // The handle useFieldArray needs to manage the members list.
    control,
    // The only piece of formState read, so React only re-renders for this one.
    formState: { errors },
  } = useForm<RegistrationValues>({
    /*
      The resolver validates the WHOLE submission, both steps at once.

      That is only ever run by handleSubmit, which only fires on step two, so
      the UTR rule never trips while someone is still typing names. Step one's
      Next button validates against teamDetailsSchema directly instead — see
      goToPayment below.
    */
    resolver: zodResolver(teamRegistrationSchema),
    // Nothing is validated until the person asks for it. Marking a field red
    // while they are still typing their first character is scolding, not help.
    mode: "onSubmit",
    // After a failed attempt the rules change: now that they know what is
    // wrong, clearing the error the moment they leave a fixed field is useful.
    reValidateMode: "onBlur",
    defaultValues: {
      teamName: "",
      lead: emptyParticipant(),
      // Opens at the smallest legal team: a lead plus two, which is three.
      members: [emptyParticipant(), emptyParticipant()],
      utr: "",
    },
  });

  /* The members list. useFieldArray owns the add and remove operations, which
     is what keeps each row's React key stable — a plain array plus an index key
     would carry a removed member's typed value into the row below it. */
  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  /* Derived once, used by both the controls and their guards, so the button's
     appearance and the handler's behaviour cannot disagree. */
  const atMaxMembers = fields.length >= TEAM_SIZE.maxMembers;
  const atMinMembers = fields.length <= TEAM_SIZE.minMembers;

  /* -------------------------------------------------------------------------
     Draft: restore on mount, mirror on change, clear on success
     ---------------------------------------------------------------------- */

  /*
    Restored in an effect rather than in useState's initialiser.

    This component is server-rendered first, and window does not exist there.
    Reading storage during render would either crash the server render or
    produce markup that disagrees with the client's — a hydration mismatch that
    React resolves by throwing the whole subtree away.
  */
  /* The clock, read once the browser is the one asking. Deliberately not on an
     interval: a form that swaps itself out from under someone mid-keystroke at
     23:59:59 is worse than one that lets them submit and be told no by the
     server, which is the authority on the deadline anyway. */
  useEffect(() => {
    setClosed(registrationIsClosed());
  }, []);

  useEffect(() => {
    const draft = readDraft();
    // Nothing to restore; leave the defaults alone.
    if (!draft) return;
    // reset() rather than setValue per field: it re-seeds the members field
    // array too, which setValue on "members" does not reliably do.
    reset({ ...draft, utr: "" });

    /*
      Announced only if the draft actually carried something.

      A draft is written on the first keystroke, so somebody who typed one
      letter and reloaded has a technically-restored but visibly empty form —
      and telling them their answers are back when the page still looks blank
      reads as a bug. Checked against the JSON rather than field by field, which
      would need updating every time a field is added.
    */
    const everyTypedValue = [
      draft.teamName,
      // Object.values rather than the five names spelled out, so a field added
      // to Participant is covered here without anyone remembering to come back.
      ...Object.values(draft.lead),
      ...draft.members.flatMap((member) => Object.values(member)),
    ];
    if (everyTypedValue.some((value) => value.trim().length > 0)) {
      setNotice({ tone: "note", text: "Your earlier answers on this device have been restored." });
    }
  }, [reset]);

  /*
    Mirror step one into sessionStorage on every change.

    watch's subscription form, not the `watch()` return value: the latter
    re-renders the whole form on every keystroke of every one of twenty-six
    inputs, and with this many fields that is visible typing lag on a phone.
  */
  useEffect(() => {
    const subscription = watch((values) => {
      try {
        window.sessionStorage.setItem(
          DRAFT_KEY,
          // Written field by field, so the UTR cannot be swept in by a later
          // refactor that adds it to the form's value tree.
          JSON.stringify({
            teamName: values.teamName,
            lead: values.lead,
            members: values.members,
          }),
        );
      } catch {
        // A full or disabled store is not worth interrupting anyone over.
      }
    });
    // Unsubscribed on unmount, or the callback outlives the component.
    return () => subscription.unsubscribe();
  }, [watch]);

  /* -------------------------------------------------------------------------
     Focus management
     ---------------------------------------------------------------------- */

  /* Move focus to the new step's heading after a step change — but not on the
     first render, when nothing has changed and the person is at the top of the
     page reading the introduction. */
  useEffect(() => {
    if (mountedRef.current === false) {
      mountedRef.current = true;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  /* The preview URL owns a blob in memory until it is revoked. Returning the
     revoke from an effect keyed on the URL cleans up the PREVIOUS one whenever
     a new file is chosen, and the last one on unmount. */
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  /* -------------------------------------------------------------------------
     Members
     ---------------------------------------------------------------------- */

  /*
    Add a member, up to four beyond the lead.

    Guarded rather than natively disabled: the button stays in the tab order at
    the cap so somebody who cannot find a fifth slot can land on it and be told
    why, instead of meeting a control that is simply not there.
  */
  function addMember() {
    if (atMaxMembers) {
      setNotice({ tone: "note", text: `A team is ${TEAM_SIZE.label}. That is the maximum.` });
      return;
    }
    append(emptyParticipant());
    // Any previous bound message is now stale.
    setNotice(null);
  }

  /* Remove one member, down to two beyond the lead. Same guard, same reason. */
  function removeMember(index: number) {
    if (atMinMembers) {
      setNotice({ tone: "note", text: `A team is ${TEAM_SIZE.label}. That is the minimum.` });
      return;
    }
    remove(index);
    setNotice(null);
  }

  /* -------------------------------------------------------------------------
     The screenshot
     ---------------------------------------------------------------------- */

  /*
    Take the chosen file, or explain why it cannot be taken.

    Both checks exist to save a wasted upload, not to secure anything: `accept`
    is a filter the picker may ignore, and the reported MIME type is whatever
    the client says it is. The server sniffs magic bytes for the real answer.
  */
  function onScreenshotChange(event: React.ChangeEvent<HTMLInputElement>) {
    // files is null when the picker was cancelled; index 0 because the input
    // is single-file.
    const file = event.target.files?.[0] ?? null;

    // Cancelled. Clear everything rather than silently keeping the old file,
    // which would leave the thumbnail disagreeing with the control beside it.
    if (!file) {
      setScreenshot(null);
      setPreviewUrl(null);
      setScreenshotError(null);
      return;
    }

    if (ACCEPTED_IMAGE_TYPES.includes(file.type) === false) {
      // Names the formats rather than saying "invalid file": a person holding a
      // PDF receipt needs to know a screenshot is wanted, not that they failed.
      setScreenshotError("Choose a JPG, PNG or WEBP image. A screenshot from your payment app works.");
      setScreenshot(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      // The actual size is quoted, so the person can tell how far over they are
      // rather than guessing at what "too large" means.
      setScreenshotError(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB — a screenshot is usually well under it.`,
      );
      setScreenshot(null);
      setPreviewUrl(null);
      return;
    }

    setScreenshot(file);
    // A new object URL each time; the effect above revokes the one it replaces.
    setPreviewUrl(URL.createObjectURL(file));
    setScreenshotError(null);
  }

  /* Whether a usable screenshot is present, setting the message if not. Split
     out because both the valid and invalid submit paths need to run it, so the
     file error appears alongside the field errors rather than after them. */
  function screenshotIsReady(): boolean {
    if (!screenshot) {
      setScreenshotError("Add a screenshot of your payment.");
      return false;
    }
    return true;
  }

  /* -------------------------------------------------------------------------
     Step one -> step two
     ---------------------------------------------------------------------- */

  /*
    Validate step one and advance.

    teamDetailsSchema directly, not the form's resolver: the resolver covers
    both steps, and running it here would reject a perfectly good team for not
    having typed a UTR they have not been shown the QR for yet.
  */
  function goToPayment() {
    // Last attempt's errors go first, or a field fixed since then stays red.
    clearErrors();

    const parsed = teamDetailsSchema.safeParse(getValues());

    /*
      `=== false`, never `!parsed.success`.

      This project compiles with strictNullChecks off, and under that setting
      TypeScript will not narrow a discriminated union through the truthiness of
      its discriminant — only through an explicit comparison. Written the short
      way, `parsed.error` below is a compile error, and the tempting fix is a
      cast that silences the checker on the success branch too.
    */
    if (parsed.success === false) {
      parsed.error.issues.forEach((issue) => {
        // "lead.rollNumber", "members.1.email" — zod's path is already
        // react-hook-form's path syntax, so joining is the whole translation.
        // The cast narrows string to FieldPath, which TypeScript cannot infer
        // from a runtime join; it asserts nothing about the value.
        const path = issue.path.join(".") as FieldPath<RegistrationValues>;
        setError(path, { type: "schema", message: issue.message });
      });

      // Issues come back in the schema's own key order, which is the order the
      // fields are rendered in, so the first issue is the first one on screen.
      const first = parsed.error.issues[0];
      if (first) {
        // Focus lands on the field, whose aria-describedby then reads the
        // message out. Without this the person is left at the bottom of a
        // twenty-six field form with no idea where the problem is.
        setFocus(first.path.join(".") as FieldPath<RegistrationValues>);
      }

      // The count, so somebody who cannot see the red rules still learns how
      // much is wrong before they start hunting.
      setNotice({
        tone: "error",
        text:
          parsed.error.issues.length === 1
            ? "One answer needs fixing before you can pay."
            : `${parsed.error.issues.length} answers need fixing before you can pay.`,
      });
      return;
    }

    setNotice(null);
    setStep("payment");
  }

  /* -------------------------------------------------------------------------
     Submission
     ---------------------------------------------------------------------- */

  /*
    Everything, in one multipart request.

    Field names are the contract with POST /api/finathon/register: a `payload`
    part holding the JSON that teamRegistrationSchema parses, and a `screenshot`
    part holding the bytes. JSON in a part rather than twenty-six flat form
    fields, because the route would otherwise have to reassemble `members.2.email`
    back into a nested object before it could hand anything to the schema.
  */
  const submitEverything = handleSubmit(
    // The valid path. `values` is what the schema RETURNED, not what was typed:
    // phones stripped to ten digits, emails lowercased, whitespace collapsed.
    // Posting the parsed values means the server re-derives exactly the same
    // thing, so its checks cannot disagree with the ones just shown.
    async (values) => {
      // The file is outside the schema, so its check is separate and last.
      if (screenshotIsReady() === false) {
        fileInputRef.current?.focus();
        return;
      }

      setSubmitting(true);
      setNotice(null);

      try {
        const body = new FormData();
        // The whole validated submission as one JSON part.
        body.append("payload", JSON.stringify(values));
        // The filename is passed explicitly so the server can read an extension
        // for the storage object's path without inventing one.
        body.append("screenshot", screenshot, screenshot.name);

        const response = await fetch("/api/finathon/register", {
          method: "POST",
          // No Content-Type header: the browser must set it itself so it can
          // append the multipart boundary. Setting it by hand produces a body
          // the server cannot parse.
          body,
        });

        // A non-JSON body — an HTML error page from a proxy, say — must not
        // throw here and lose the status code we are about to branch on.
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; publicId?: string; error?: string; field?: string }
          | null;

        if (response.ok && result?.ok) {
          // The draft has served its purpose and is now a copy of personal
          // data sitting on what may be a shared machine.
          try {
            window.sessionStorage.removeItem(DRAFT_KEY);
          } catch {
            // Never worth failing a successful registration over.
          }
          setPublicId(result.publicId ?? null);
          setSubmitted(true);
          return;
        }

        /*
          The server names the field it rejected as a dotted path — "utr",
          "lead.email", "members.2.rollNumber", "screenshot" — so the message
          can sit against that input instead of floating above everything.
        */
        if (result?.field === "screenshot") {
          // Not a react-hook-form field, so it takes the file input's own error
          // slot and its own ref. This is the magic-byte rejection arriving:
          // the client only ever saw the MIME type the browser reported.
          setScreenshotError(result.error ?? "That file was not accepted. Try the screenshot again.");
          requestAnimationFrame(() => fileInputRef.current?.focus());
        } else if (result?.field) {
          const path = result.field as FieldPath<RegistrationValues>;
          setError(path, { type: "server", message: result.error ?? "Check this answer." });

          // A rejected step-one field cannot be focused from step two, because
          // it is not on screen. Going back is the only honest response — and
          // it is the case that matters most, since it happens after payment.
          if (result.field !== "utr") {
            setStep("team");
          }
          /*
            After the step swap has painted, so the target exists.

            A whole-section path such as "members" has no input to focus and
            this is a no-op — which is the right outcome, because the step
            change has already put focus on the step heading and the notice
            below carries the server's sentence.
          */
          requestAnimationFrame(() => setFocus(path));
        }

        setNotice({
          tone: "error",
          // Verbatim. Every message the route returns is already written for a
          // student; paraphrasing it here would only make it vaguer.
          text: result?.error ?? "Could not save your registration. Please try again.",
        });

        // 403 covers both a failed same-origin check and a passed deadline.
        // Only the clock can tell them apart, and if registration really has
        // closed the form should stop inviting anyone to pay.
        if (response.status === 403) setClosed(registrationIsClosed());
      } catch {
        /*
          A network failure, which is NOT the same as a rejection.

          Deliberately does not claim nothing was sent: fetch also rejects when
          the connection drops while the response is being read, by which point
          the registration may already be written. Saying "nothing has been
          sent" on a payment form would be a guess presented as a fact, and the
          person acting on it would pay twice. Retrying is safe because the
          server rejects a duplicate UTR with a message that says so — which is
          exactly what this copy points at.
        */
        setNotice({
          tone: "error",
          text: "Could not reach the server. Try submitting again — do not pay a second time; if the first attempt did go through, the repeat will be refused as a duplicate.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    // The invalid path. Its only job is to make the screenshot's error appear
    // in the same pass as the field errors, rather than one attempt later.
    () => {
      screenshotIsReady();
      setNotice({ tone: "error", text: "Check the highlighted answers and try again." });
    },
  );

  /*
    The form's one submit entry point, dispatching by step.

    Kept as a real form submit rather than two onClick handlers so that pressing
    Enter inside any field does the expected thing on both steps — which on a
    phone is the only way many people ever advance a form.
  */
  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The guard the CTA's aria-disabled state is describing. A natively
    // disabled button would enforce this too, but would also vanish from the
    // tab order and from screen-reader element lists while it did.
    if (submitting) return;
    /*
      The deadline, guarded on the action rather than only on the render.

      `closed` is corrected by an effect after mount, so there is one frame in
      which a late visitor sees a live form. Checking the clock here as well
      means that frame cannot be used to send anything — and it closes the
      longer window where someone left the tab open across the deadline.
    */
    if (registrationIsClosed()) {
      setClosed(true);
      return;
    }
    if (step === "team") {
      goToPayment();
      return;
    }
    // Not awaited: the handler is fire-and-forget and owns its own error paths.
    void submitEverything();
  }

  /* -------------------------------------------------------------------------
     Success — rendered INSTEAD of the form
     ---------------------------------------------------------------------- */

  /* Replacing the form rather than appending below it, so a filled form is
     never left on screen inviting a second submission that the duplicate check
     would then reject with an alarming message. */
  if (submitted) {
    // The lead's first name, for a line that sounds like it was written to a
    // person. getValues, not a state copy, so it cannot drift.
    const leadFirstName = getValues("lead.fullName").split(" ")[0];

    return (
      <div role="status" className="border-t-2 pt-8" style={{ borderColor: "var(--rule-strong)" }}>
        <p className="fin-meta">Registration recorded</p>
        <h2 className="fin-serif fin-h2 mt-3">You&rsquo;re in, {leadFirstName}.</h2>
        <p className="fin-body mt-4">
          We have your team, your payment reference and your screenshot. One last step:
          complete your team&rsquo;s entry on Devnovate, where problem statements and
          submissions are handled.
        </p>

        {/* Only when the server sent one. A reference line that says "null" is
            worse than no reference line. */}
        {publicId ? (
          <p className="fin-meta mt-6">Reference {publicId}</p>
        ) : null}

        <a className="fin-cta mt-8" href={DEVNOVATE_URL} target="_blank" rel="noreferrer noopener">
          Continue on Devnovate
        </a>

        <p className="fin-meta mt-6">
          Keep your UTR until the event. It is how we match your payment if anything is queried.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------------------------------
     Closed — rendered INSTEAD of the form, and after the success panel
     ---------------------------------------------------------------------- */

  /*
    Placed below the `submitted` branch on purpose: a team that registered at
    23:59:58 and watched the clock tick over should still be told they are in,
    not told they are late. Above the form, because a page that shows a QR and
    a submit button to somebody whose submission the server will refuse with a
    403 has invited them to pay ₹499 for nothing.
  */
  if (closed) {
    return (
      /* role="status" so the swap is announced rather than silently replacing
         the form for anyone who is not watching the screen. */
      <div role="status" className="border-t-2 pt-8" style={{ borderColor: "var(--rule-strong)" }}>
        {/* The same heavy-rule-then-label opening as the success panel, so the
            two terminal states read as the same kind of document. */}
        <p className="fin-meta">Registration closed</p>
        <h2 className="fin-serif fin-h2 mt-3">Entries are closed.</h2>
        <p className="fin-body mt-4">
          {/* The date is stated, not just the fact: somebody who thought they
              had until the 30th needs to know which date they missed. */}
          Registration for Finathon 2026 closed on{" "}
          {/* Formatted here and not at module scope: this branch only ever
              renders in the browser, so a locale-dependent string cannot
              disagree with a server render that never happens. */}
          {REGISTRATION_CLOSES_AT.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Nothing on this page will accept a payment now, so please do not send one.
        </p>
        {/* A closed door with no way through is where support tickets come
            from. The one group this page genuinely owes an answer to — people
            who paid in time and heard nothing — gets an address and is told
            exactly what to put in the message. */}
        <p className="fin-body mt-4">
          If you registered and paid before the deadline and have not heard back, email{" "}
          <a href="mailto:finathon@aczen.in" className="underline">
            finathon@aczen.in
          </a>{" "}
          with your UTR.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------------------------------
     The form
     ---------------------------------------------------------------------- */

  return (
    /* noValidate turns off the browser's own bubbles. They cannot be styled,
       they appear one at a time, and they would compete with the messages this
       form places against each field. */
    <form onSubmit={onFormSubmit} noValidate>
      {/*
        The step header: a ruled two-cell account header.

        Not a progress bar. The page's whole visual language is a printed
        statement, and a statement has a header naming its parts, not a meter
        showing how much of itself has elapsed. The same information reaches
        assistive tech through aria-current on the live cell.
      */}
      {/* role="list" restored explicitly: Safari strips list semantics from any
          list whose list-style is none, which is exactly what .fin-steps does,
          and the count — "2 items" — is half the information here. */}
      <ol className="fin-steps" role="list" aria-label="Registration steps">
        <li className="fin-step" aria-current={step === "team" ? "step" : undefined}>
          <span className="fin-step-no">01</span>
          <span className="fin-step-body">
            <span className="fin-meta">Team details</span>
            {/* A word, not a tick: colour and glyphs are never the only signal. */}
            <span className="fin-step-state">{step === "team" ? "Now" : "Done"}</span>
          </span>
        </li>
        <li className="fin-step" aria-current={step === "payment" ? "step" : undefined}>
          <span className="fin-step-no">02</span>
          <span className="fin-step-body">
            <span className="fin-meta">Payment</span>
            <span className="fin-step-state">{step === "payment" ? "Now" : "Next"}</span>
          </span>
        </li>
      </ol>

      {/* ---------------------------------------------------------------- */}
      {/* Step one                                                          */}
      {/* ---------------------------------------------------------------- */}
      {step === "team" ? (
        /* Natively disabled while in flight so nothing can be edited between
           the values being read and the response arriving. Short-lived, and
           unlike the CTA there is no question a person needs to ask a field. */
        <fieldset disabled={submitting} className="border-0 p-0">
          {/* The step's own heading, and the only <legend> this fieldset may
              have — a legend is valid solely as the FIRST child of its
              fieldset. tabIndex -1 makes it a focus target without putting it
              in the tab order. */}
          <legend className="fin-meta pt-8" ref={stepHeadingRef} tabIndex={-1}>
            Step one &middot; Who is registering
          </legend>

          <Field
            id="fin-teamName"
            label="Team name"
            hint={`${TEAM_LIMITS.teamName.min}-${TEAM_LIMITS.teamName.max} characters. This is what appears on the leaderboard.`}
            error={errors.teamName?.message}
            registration={register("teamName")}
            autoComplete="off"
            inputMode="text"
          />

          {/* Each person is a nested fieldset with its own legend. Valid HTML —
              the rule constrains a legend's position within ITS fieldset, not
              nesting — and it is what gives a screen reader the context that
              tells five identical "Full name" labels apart. */}
          <fieldset className="fin-lineitem">
            <legend className="fin-lineitem-legend">
              <span className="fin-lineitem-head">
                <span className="fin-meta">Team lead &middot; you</span>
              </span>
            </legend>
            <Person basePath="lead" errors={errors.lead} register={register} isLead />
          </fieldset>

          {fields.map((field, index) => (
            // field.id, never the index: useFieldArray's id survives a removal
            // from the middle of the list, so React does not shift the row
            // below up into the removed row's DOM node with its typed value.
            <fieldset key={field.id} className="fin-lineitem">
              <legend className="fin-lineitem-legend">
                <span className="fin-lineitem-head">
                  {/* Numbered because this genuinely is a sequence — the
                      database stores each participant's position. */}
                  <span className="fin-meta">Member {index + 2}</span>
                  <button
                    type="button"
                    className="fin-rowaction"
                    // Reachable at the floor, so the reason can be given.
                    aria-disabled={atMinMembers ? "true" : undefined}
                    onClick={() => removeMember(index)}
                  >
                    Remove
                  </button>
                </span>
              </legend>
              <Person
                basePath={`members.${index}`}
                // Indexed into the members error array, which is sparse: only
                // members with problems have an entry.
                errors={errors.members?.[index]}
                register={register}
                isLead={false}
              />
            </fieldset>
          ))}

          {/* The add control and the rule it obeys, side by side. Stating the
              bound next to the button means nobody has to press it to find out. */}
          <div className="mt-8 flex flex-wrap items-baseline gap-4">
            <button
              type="button"
              className="fin-rowaction"
              aria-disabled={atMaxMembers ? "true" : undefined}
              onClick={addMember}
            >
              Add a member
            </button>
            <span className="fin-field-hint" style={{ marginTop: 0 }}>
              {/* Derived from the schema's own numbers, so the sentence cannot
                  outlive the rule it describes. */}
              A team is {TEAM_SIZE.label}. You have {fields.length + 1}.
            </span>
          </div>
        </fieldset>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Step two                                                          */}
      {/* ---------------------------------------------------------------- */}
      {step === "payment" ? (
        <fieldset disabled={submitting} className="border-0 p-0">
          <legend className="fin-meta pt-8" ref={stepHeadingRef} tabIndex={-1}>
            Step two &middot; Pay and confirm
          </legend>

          {/* The QR before the fields, in the order a team actually does this:
              they pay first, then record what the payment was. Asking for a
              reference before showing what to pay is how a form gets abandoned. */}
          <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="fin-qr">
              {qrMissing ? (
                /* The honest placeholder. Says exactly what is missing, so the
                   organisers see it on their own page rather than hearing about
                   it from a student who could not pay. */
                <span className="fin-meta px-3 text-center" style={{ color: "var(--ink-faint)" }}>
                  Payment QR not uploaded yet
                </span>
              ) : (
                <Image
                  src={QR_IMAGE_SRC}
                  // The amount is in the alt text: somebody reading this aloud
                  // needs the figure, not just the fact that a code exists.
                  alt={`UPI payment QR code for Finathon registration, ${AMOUNT_LABEL} per team`}
                  width={QR_RENDER_PX}
                  height={QR_RENDER_PX}
                  // Not lazy. It is the whole point of the step, and a QR that
                  // fades in late is one people scroll past.
                  priority
                  onError={() => setQrMissing(true)}
                />
              )}
            </div>

            <div>
              {/* Serif and large: the one number on this page a person will
                  check against what their app offers to send. */}
              <p className="fin-serif text-2xl">{AMOUNT_LABEL} per team</p>
              <p className="fin-body mt-3">
                Scan with any UPI app and pay the exact amount. Then screenshot the
                confirmation and copy the UTR — your app may label it &ldquo;UTR&rdquo;,
                &ldquo;transaction ID&rdquo; or &ldquo;reference number&rdquo;.
              </p>
              <p className="fin-meta mt-4">One payment per team, not per member</p>
            </div>
          </div>

          {/* The screenshot. Laid out on the same label-gutter grid as every
              text field, so the payment step reads as part of the same document
              rather than as a differently-built upload widget. */}
          <div className="mt-10 grid gap-1.5 sm:grid-cols-[14rem_1fr] sm:gap-8">
            <label htmlFor="fin-screenshot" className="fin-meta pt-3">
              Payment screenshot
            </label>

            <div>
              <input
                id="fin-screenshot"
                ref={fileInputRef}
                type="file"
                className="fin-file"
                // A hint to the picker, not a guarantee: it narrows what most
                // people see without being something the code can rely on.
                accept={ACCEPT_ATTRIBUTE}
                onChange={onScreenshotChange}
                aria-invalid={screenshotError ? "true" : undefined}
                aria-describedby={
                  screenshotError ? "fin-screenshot-error fin-screenshot-hint" : "fin-screenshot-hint"
                }
              />

              <p id="fin-screenshot-hint" className="fin-field-hint">
                JPG, PNG or WEBP, up to 5 MB. The confirmation screen from your UPI app.
              </p>

              {/* The chosen file, named and sized, so the person can tell at a
                  glance that the picker took what they meant it to. */}
              {screenshot ? (
                <p className="fin-field-hint">
                  {screenshot.name} &middot; {(screenshot.size / 1024).toFixed(0)} KB
                </p>
              ) : null}

              {screenshotError ? (
                <p id="fin-screenshot-error" className="fin-field-error">
                  <MarkAlert />
                  <span>{screenshotError}</span>
                </p>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element -- a blob:
                  URL has no dimensions next/image can read and no origin its
                  optimiser can fetch; a plain img is the correct element here. */}
              {previewUrl ? (
                <img
                  src={previewUrl}
                  // Describes its job, not its contents, because the contents
                  // are a file the person just chose and already knows.
                  alt="Preview of the payment screenshot you selected"
                  className="fin-filepreview"
                />
              ) : null}
            </div>
          </div>

          <Field
            id="fin-utr"
            label="UTR reference"
            hint={`${TEAM_LIMITS.utr.min}-${TEAM_LIMITS.utr.max} characters, usually 12 digits. Spaces are removed automatically.`}
            error={errors.utr?.message}
            registration={register("utr")}
            autoComplete="off"
            // numeric, not type="number": a UTR carries letters on some rails,
            // and type="number" would add spinner arrows and eat a leading zero.
            inputMode="numeric"
          />
        </fieldset>
      ) : null}

      {/*
        The form-level message.

        role="status" is implicitly aria-live="polite", so it is announced after
        whatever the screen reader is currently saying rather than cutting it
        off. Rendered in a container that is always in the DOM — a live region
        that appears at the same moment as its text is frequently missed,
        because the browser has not yet told the screen reader to watch it.
      */}
      <div role="status" aria-live="polite">
        {notice ? (
          <p className={`fin-notice ${notice.tone === "error" ? "fin-notice-error" : ""}`}>
            {/* Different SHAPES, not just different colours: a triangle for a
                problem, a circle for a remark. */}
            {notice.tone === "error" ? <MarkAlert /> : <MarkNote />}
            <span>{notice.text}</span>
          </p>
        ) : null}
      </div>

      {/* The step's controls. Back first in the DOM so the tab order runs
          backwards-then-forwards, matching their left-to-right position. */}
      <div className="mt-8 flex flex-wrap items-center gap-6">
        {step === "payment" ? (
          <button
            type="button"
            className="fin-cta-ghost"
            // Outside the disabled fieldset, so it needs its own in-flight
            // guard — and aria-disabled rather than the attribute, for the same
            // reason as the CTA beside it.
            aria-disabled={submitting ? "true" : undefined}
            // Nothing is validated on the way back: someone returning to fix a
            // name should not be stopped by the UTR they have not typed yet.
            onClick={() => {
              if (submitting) return;
              setStep("team");
            }}
          >
            Back to team details
          </button>
        ) : null}

        <button
          type="submit"
          className="fin-cta"
          /*
            aria-disabled, never the `disabled` attribute.

            The designed dashed state in finathon.css keys off this attribute
            and never fired before, because the old button was natively
            disabled. The accessibility half matters more: a natively disabled
            button is removed from the tab order and from most screen readers'
            element lists, so somebody who cannot proceed also cannot reach the
            control to find out why. The actual guard is in onFormSubmit.
          */
          aria-disabled={submitting ? "true" : undefined}
        >
          {step === "team" ? "Next — payment" : submitting ? "Sending…" : "Complete registration"}
        </button>
      </div>

      <p className="fin-meta mt-6">
        We store your team&rsquo;s names, colleges, roll numbers, contact details, UTR and
        payment screenshot to confirm your entry and reconcile payment. Nothing else.
      </p>
    </form>
  );
}
