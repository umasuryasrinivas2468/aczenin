/*
  Finathon registration confirmation email, sent through Zoho Mail SMTP from
  team@aczen.in.

  Sent only AFTER the registration row is committed, and never allowed to fail
  the registration: a student who has paid and been saved must not see an error
  because an SMTP server was slow. The route schedules this with next/server's
  after(), so the response goes out first and the mail follows.

  The HTML design lives in mailTemplates.ts and is chosen by
  FINATHON_MAIL_TEMPLATE.
*/

import nodemailer from "nodemailer";

import {
  isMailTemplateName,
  renderMailHtml,
  renderMailText,
  type MailData,
} from "@/lib/finathon/mailTemplates";
import { AMOUNT_PAISE, type TeamRegistration } from "@/lib/finathon/teamRegistrationSchema";

// Same server-only guard as the rest of the finathon chain. The SMTP password is
// read in this module and must never reach a client bundle.
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/finathon/confirmationMail.ts is server-only and must never reach the browser.",
  );
}

/*
  Zoho SMTP settings.

  smtp.zoho.in is the India data centre, which is where an aczen.in org account
  lives; set ZOHO_SMTP_HOST=smtp.zoho.com if the account is on the US centre.
  Port 465 is implicit TLS, so the password never crosses the wire in clear.
  ZOHO_SMTP_PASSWORD should be a Zoho APP-SPECIFIC password, not the mailbox
  login — with 2FA on, the login password is refused by SMTP anyway.
*/
const SMTP_HOST = process.env.ZOHO_SMTP_HOST || "smtp.zoho.in";
const SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465);
const SMTP_USER = process.env.ZOHO_SMTP_USER || "team@aczen.in";
const SMTP_PASSWORD = process.env.ZOHO_SMTP_PASSWORD;

// An unknown or missing name falls back to "classic" rather than failing: a
// typo in a Vercel setting must not stop confirmations going out.
const requestedTemplate = process.env.FINATHON_MAIL_TEMPLATE?.trim().toLowerCase();
const TEMPLATE = isMailTemplateName(requestedTemplate) ? requestedTemplate : "classic";

// Zoho rejects a From that differs from the authenticated mailbox, so the
// sender is derived from the SMTP user rather than configured separately.
const FROM = `"Finathon 2026 · Aczen" <${SMTP_USER}>`;

function toMailData(submission: TeamRegistration, publicId: string): MailData {
  const person = (p: TeamRegistration["lead"]) => ({
    fullName: p.fullName,
    rollNumber: p.rollNumber,
    college: p.college,
  });
  return {
    teamName: submission.teamName,
    publicId,
    amount: `₹${(AMOUNT_PAISE / 100).toFixed(0)}`,
    utr: submission.utr,
    lead: person(submission.lead),
    members: submission.members.map(person),
  };
}

/*
  Sends the confirmation to the lead, with every member on CC so the whole team
  has the registration ID.

  Never throws. Missing configuration and SMTP failures are logged and swallowed,
  because the registration is already committed by the time this runs. Only the
  error's code and SMTP response code are logged — nodemailer's messages and
  error objects can carry the recipient list, which is students' addresses.
*/
export async function sendRegistrationConfirmation(
  submission: TeamRegistration,
  publicId: string,
): Promise<void> {
  if (!SMTP_PASSWORD) {
    console.error("[finathon/mail] ZOHO_SMTP_PASSWORD is not set; confirmation email skipped.");
    return;
  }

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      // Bounded so a hung SMTP server cannot hold the function open until the
      // platform kills it.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    const leadEmail = submission.lead.email;
    // De-duplicated case-insensitively: two members sharing an address, or a
    // member reusing the lead's, would otherwise get the mail twice.
    const cc = [...new Set(submission.members.map((m) => m.email.toLowerCase()))].filter(
      (email) => email !== leadEmail.toLowerCase(),
    );

    const data = toMailData(submission, publicId);

    await transport.sendMail({
      from: FROM,
      to: leadEmail,
      cc,
      replyTo: SMTP_USER,
      subject: `Finathon 2026: registration received — ${submission.teamName}`,
      text: renderMailText(data),
      html: renderMailHtml(TEMPLATE, data),
    });
  } catch (error) {
    // e.g. EAUTH (bad app password), ETIMEDOUT, EENVELOPE, with 535/550 etc.
    const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown };
    console.error(
      "[finathon/mail] confirmation email failed:",
      typeof code === "string" ? code : "unknown",
      typeof responseCode === "number" ? responseCode : "",
    );
  }
}
