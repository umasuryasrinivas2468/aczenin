"use client";

/*
  The Finathon registration form.

  Three fields and a payment step, in the order a team actually does them: they
  pay first, then record who paid and what the transaction reference was. The QR
  therefore sits ABOVE the UTR field rather than beside the submit button —
  asking for a reference number before showing what to pay produces a form
  people abandon and come back to, losing whatever they had typed.

  A client component because it posts with fetch and swaps to a success panel in
  place. The alternative — a plain <form action> and a redirect to a thank-you
  route — would lose the typed values on every validation failure, which on a
  form carrying a payment reference is the difference between a retry and a
  support email.
*/

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";

/* Where a team goes after their payment is recorded. Devnovate is where the
   event itself is run; this form only captures the payment and the roster. */
const DEVNOVATE_URL = "https://devnovate.co/event/finthon-2o";

/* The payment QR, as a file in public/. Rendered through next/image for the
   automatic sizing and lazy behaviour; it is a static asset, not user content. */
const QR_IMAGE_SRC = "/images/finathon/payment-qr.png";

/* Shown beside the QR. A figure the person can check against what their app
   offers to send is the difference between a correct payment and a support
   thread about a wrong amount. */
const AMOUNT_LABEL = "₹499 per team";

<<<<<<< HEAD
type FieldName = "teamLeadName" | "rollNumber" | "email" | "phone" | "utr";
=======
type FieldName = "teamLeadName" | "rollNumber" | "utr";
>>>>>>> ce67e70af6824703c236c65f2105429458946b90

export default function RegistrationForm() {
  const [teamLeadName, setTeamLeadName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
<<<<<<< HEAD
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  const [utr, setUtr] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which input the server blamed, so the message can sit against that field
  // instead of floating above the whole form.
  const [errorField, setErrorField] = useState<FieldName | null>(null);

  // Focused after a field-specific rejection. Without this the person has to
  // find the offending input themselves on a form they have already scrolled
  // past, which on a phone means scrolling back up blind.
  const refs = {
    teamLeadName: useRef<HTMLInputElement>(null),
    rollNumber: useRef<HTMLInputElement>(null),
<<<<<<< HEAD
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
    utr: useRef<HTMLInputElement>(null),
  };

  // Whether the QR file has actually been added. An <Image> pointing at a
  // missing file renders as a broken icon next to the words "scan to pay",
  // which is worse than an honest placeholder.
  const [qrMissing, setQrMissing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrorField(null);

    try {
      const response = await fetch("/api/finathon/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< HEAD
        body: JSON.stringify({ teamLeadName, rollNumber, email, phone, utr }),
=======
        body: JSON.stringify({ teamLeadName, rollNumber, utr }),
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; field?: FieldName }
        | null;

      if (response.ok && body?.ok) {
<<<<<<< HEAD
        /*
          Saved, so hand the team straight on to Devnovate.

          The success panel is still rendered underneath rather than skipped,
          for three cases the redirect does not cover: a browser that blocks
          the navigation, a connection that drops between the save and the
          hop, and the person who presses Back. Any of those without a panel
          would leave someone who has just paid staring at a form again, with
          no confirmation their UTR was recorded.

          setSubmitted BEFORE the navigation, so the panel is already the
          committed state if the browser comes back to this page.
        */
        setSubmitted(true);
        // assign(), not replace(): Back should return here, to the confirmation
        // that the payment was recorded, rather than skipping past it to the
        // empty form.
        window.location.assign(DEVNOVATE_URL);
=======
        setSubmitted(true);
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
        return;
      }

      setError(body?.error ?? "Could not save your registration. Please try again.");
      if (body?.field) {
        setErrorField(body.field);
        // Focused after the state update rather than inside it, so React has
        // re-rendered the error before the field is announced to a screen
        // reader that follows focus.
        requestAnimationFrame(() => refs[body.field as FieldName].current?.focus());
      }
    } catch {
      // Network failure, distinct from a rejected submission: retrying helps
      // here, and the person has not lost what they typed.
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------------
     Success. Rendered INSTEAD of the form, not below it — leaving a filled
     form on screen after a successful submit invites a second submission
     that the duplicate check would then reject with a scary message.
     --------------------------------------------------------------------- */
  if (submitted) {
    return (
      <div
        // role="status" so the swap is announced rather than silently replacing
        // the form for anyone not watching the screen.
        role="status"
        className="border-t-2 pt-8"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        <p className="fin-meta">Registration recorded</p>
        <h2 className="fin-serif fin-h2 mt-3">You&rsquo;re in, {teamLeadName.split(" ")[0]}.</h2>
        <p className="fin-body mt-4">
<<<<<<< HEAD
          We have your details and your payment reference. Taking you to Devnovate now, where
          problem statements and submissions are handled — if nothing happens, use the button
          below.
        </p>

        {/* No target="_blank". The redirect above navigates this tab, so the
            button is the same journey by hand rather than a second one in a
            new tab. */}
        <a className="fin-cta mt-8" href={DEVNOVATE_URL} rel="noreferrer noopener">
=======
          We have your payment reference. One last step: complete your team&rsquo;s entry on
          Devnovate, which is where problem statements and submissions are handled.
        </p>

        <a
          className="fin-cta mt-8"
          href={DEVNOVATE_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
          Continue on Devnovate
        </a>

        <p className="fin-meta mt-6">
          Keep your UTR until the event. It is how we match your payment if anything is queried.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
     The form.
     --------------------------------------------------------------------- */
  return (
    <form onSubmit={handleSubmit} className="border-t-2 pt-8" style={{ borderColor: "var(--rule-strong)" }}>
      {/* --- Step one: who is registering ---------------------------------- */}
      <fieldset disabled={submitting} className="border-0 p-0">
        <legend className="fin-meta">Step one &middot; Team lead</legend>

        <Field
          id="team-lead-name"
          label="Team lead name"
          hint="The person we contact about this team."
          value={teamLeadName}
          onChange={setTeamLeadName}
          inputRef={refs.teamLeadName}
          invalid={errorField === "teamLeadName"}
          autoComplete="name"
          required
        />

        <Field
          id="roll-number"
          label="Roll number"
          hint="The team lead's college roll number."
          value={rollNumber}
          onChange={setRollNumber}
          inputRef={refs.rollNumber}
          invalid={errorField === "rollNumber"}
          // Off: a roll number is not a field the browser has a sensible
          // remembered value for, and an autofilled email here is a wasted
          // round trip through the duplicate check.
          autoComplete="off"
          // Uppercase display only — the server normalises and the unique index
          // compares case-insensitively, so this is purely so the person sees
          // the value in the form their college writes it.
          className="uppercase"
          required
        />

<<<<<<< HEAD
        <Field
          id="email"
          label="Email"
          hint="Where the shortlist and offer letters go. Use one you check."
          value={email}
          onChange={setEmail}
          inputRef={refs.email}
          invalid={errorField === "email"}
          type="email"
          autoComplete="email"
          required
        />

        <Field
          id="phone"
          label="Phone"
          hint="For day-of logistics — judging calls, venue changes."
          value={phone}
          onChange={setPhone}
          inputRef={refs.phone}
          invalid={errorField === "phone"}
          type="tel"
          autoComplete="tel"
          required
        />

=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
        {/* --- Step two: pay ---------------------------------------------- */}
        <div className="mt-12">
          {/* A <p>, not a second <legend>: a legend is only valid as the FIRST
              child of a fieldset, and the one above already holds that slot.
              Nesting more of them is invalid HTML that some screen readers
              announce as an empty group. */}
          <p className="fin-meta">Step two &middot; Pay</p>

          <div className="mt-5 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
            <div
              className="flex h-48 w-48 items-center justify-center border p-2"
              style={{ borderColor: "var(--rule-strong)", background: "var(--paper)" }}
            >
              {qrMissing ? (
                // The honest placeholder. Says exactly what is missing, so the
                // organisers see it on their own page rather than hearing about
                // it from a student who could not pay.
                <span className="fin-meta px-3 text-center" style={{ color: "var(--ink-faint)" }}>
                  Payment QR not uploaded yet
                </span>
              ) : (
                <Image
                  src={QR_IMAGE_SRC}
                  alt={`UPI payment QR code for Finathon registration, ${AMOUNT_LABEL}`}
                  width={176}
                  height={176}
                  // Not lazy: it is above the fold of the step that matters and
                  // a QR that fades in late is one people scroll past.
                  priority
                  onError={() => setQrMissing(true)}
                />
              )}
            </div>

            <div>
              <p className="fin-serif text-2xl">{AMOUNT_LABEL}</p>
              <p className="fin-body mt-3">
                Scan with any UPI app and pay the exact amount. After paying, copy the UTR —
                your app may label it &ldquo;UTR&rdquo;, &ldquo;transaction ID&rdquo; or
                &ldquo;reference number&rdquo; — and paste it below.
              </p>
              <p className="fin-meta mt-4">One payment per team, not per member</p>
            </div>
          </div>
        </div>

        {/* --- Step three: the reference ----------------------------------- */}
        <div className="mt-12">
          <p className="fin-meta">Step three &middot; Confirm the payment</p>

          <Field
            id="utr"
            label="UTR / transaction reference"
            hint="12 digits for most UPI apps. This is how we match your payment."
            value={utr}
            onChange={setUtr}
            inputRef={refs.utr}
            invalid={errorField === "utr"}
            autoComplete="off"
            // inputMode rather than type="number": a UTR can carry letters on
            // some rails, and type="number" would also add spinner arrows and
            // silently drop a leading zero.
            inputMode="numeric"
            required
          />
        </div>
      </fieldset>

      {/* A single error region, placed just above the button where the eye
          lands after a failed submit. Field-level marking happens through the
          invalid prop; this carries the words. */}
      {error ? (
        <p role="alert" className="mt-8 text-sm" style={{ color: "#b3261e" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="fin-cta mt-8"
        // Empty fields are blocked here rather than round-tripped: a submission
        // that cannot possibly succeed should not spend one of the five the
        // rate limiter allows this network in an hour.
        disabled={
<<<<<<< HEAD
          submitting ||
          !teamLeadName.trim() ||
          !rollNumber.trim() ||
          !email.trim() ||
          !phone.trim() ||
          !utr.trim()
=======
          submitting || !teamLeadName.trim() || !rollNumber.trim() || !utr.trim()
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
        }
      >
        {submitting ? "Saving…" : "Register now"}
      </button>

      <p className="fin-meta mt-6">
<<<<<<< HEAD
        We store your name, roll number, email, phone and UTR to confirm your entry, reach you
        about the event, and reconcile payment. Nothing else.
=======
        We store your name, roll number and UTR to confirm your entry and reconcile payment.
        Nothing else.
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
      </p>
    </form>
  );
}

/*
  One labelled input.

  Extracted because the three fields are otherwise identical down to the error
  wiring — aria-invalid, the hint's id in aria-describedby, and the rule that
  turns red. Written once, they cannot drift into three slightly different
  accessibility behaviours.
*/
function Field({
  id,
  label,
  hint,
  value,
  onChange,
  inputRef,
  invalid,
  autoComplete,
  inputMode,
<<<<<<< HEAD
  // "email" and "tel" are what make a phone show the right keyboard and let the
  // browser offer a saved address. Defaulted to "text" rather than made
  // required, because most fields here genuinely are text.
  type = "text",
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  className = "",
  required,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  invalid: boolean;
  autoComplete: string;
  inputMode?: "numeric" | "text";
<<<<<<< HEAD
  type?: "text" | "email" | "tel";
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
  className?: string;
  required?: boolean;
}) {
  const hintId = `${id}-hint`;

  return (
    <div className="mt-6 grid gap-1.5 sm:grid-cols-[14rem_1fr] sm:gap-8">
      {/* A real <label>, bound by htmlFor. The ledger layout puts it in the
          gutter, which is where every other label on this page sits. */}
      <label htmlFor={id} className="fin-meta pt-3">
        {label}
      </label>

      <div>
        <input
          id={id}
          ref={inputRef}
<<<<<<< HEAD
          type={type}
=======
>>>>>>> ce67e70af6824703c236c65f2105429458946b90
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          // Announced to assistive tech, not just coloured. Colour alone fails
          // anyone who cannot distinguish it.
          aria-invalid={invalid || undefined}
          aria-describedby={hintId}
          className={`w-full border-b bg-transparent py-2 text-lg outline-none ${className}`}
          style={{
            // The ruled line thickens and reddens on error, which reads as a
            // correction on a ledger rather than as a web form validation box.
            borderColor: invalid ? "#b3261e" : "var(--rule-strong)",
            color: "var(--ink)",
          }}
        />
        <p id={hintId} className="mt-1.5 text-sm" style={{ color: "var(--ink-faint)" }}>
          {hint}
        </p>
      </div>
    </div>
  );
}
