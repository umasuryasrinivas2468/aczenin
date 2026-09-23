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

import { axeSelect } from "@/lib/axe/supabase";
import {
  isMailTemplateName,
  mailSubject,
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

const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

/*
  Sends one team email to the lead, with every member on CC so the whole team
  has the registration ID.

  Never throws. Missing configuration and SMTP failures are logged and swallowed,
  because the registration (or the review) is already committed by the time this
  runs. Only the error's code and SMTP response code are logged — nodemailer's
  messages and error objects can carry the recipient list, which is students'
  addresses.
*/
async function sendTeamMail(
  data: MailData,
  leadEmail: string,
  memberEmails: string[],
): Promise<void> {
  if (!SMTP_PASSWORD) {
    console.error(`[finathon/mail] ZOHO_SMTP_PASSWORD is not set; ${data.kind} email skipped.`);
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

    // De-duplicated case-insensitively: two members sharing an address, or a
    // member reusing the lead's, would otherwise get the mail twice.
    const cc = [...new Set(memberEmails.map((email) => email.toLowerCase()))].filter(
      (email) => email !== leadEmail.toLowerCase(),
    );

    await transport.sendMail({
      from: FROM,
      to: leadEmail,
      cc,
      replyTo: SMTP_USER,
      subject: mailSubject(data),
      text: renderMailText(data),
      html: renderMailHtml(TEMPLATE, data),
    });
  } catch (error) {
    // e.g. EAUTH (bad app password), ETIMEDOUT, EENVELOPE, with 535/550 etc.
    const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown };
    console.error(
      `[finathon/mail] ${data.kind} email failed:`,
      typeof code === "string" ? code : "unknown",
      typeof responseCode === "number" ? responseCode : "",
    );
  }
}

/* "Registration received", sent by the register route straight after a save. */
export async function sendRegistrationConfirmation(
  submission: TeamRegistration,
  publicId: string,
): Promise<void> {
  const person = (p: TeamRegistration["lead"]) => ({
    fullName: p.fullName,
    rollNumber: p.rollNumber,
    college: p.college,
  });
  await sendTeamMail(
    {
      kind: "received",
      teamName: submission.teamName,
      publicId,
      amount: rupees(AMOUNT_PAISE),
      utr: submission.utr,
      lead: person(submission.lead),
      members: submission.members.map(person),
    },
    submission.lead.email,
    submission.members.map((member) => member.email),
  );
}

type StoredTeam = {
  team_name: string;
  public_id: string;
  amount_paise: number;
  utr: string;
  finathon_participant: {
    is_lead: boolean;
    position: number;
    full_name: string;
    college: string;
    roll_number: string;
    email: string;
  }[];
};

/*
  "You're confirmed", sent when a reviewer approves a team on /Finathon/axe/26.

  Takes only the team id and reads the rest back, because the review form
  carries nothing but the id — and the stored row, not anything a form posted,
  is what the team registered with. Never throws, like sendTeamMail.
*/
export async function sendApprovalEmail(teamId: number): Promise<void> {
  try {
    const [team] = await axeSelect<StoredTeam>(
      "finathon_team",
      `id=eq.${encodeURIComponent(String(teamId))}` +
        "&select=team_name,public_id,amount_paise,utr," +
        "finathon_participant(is_lead,position,full_name,college,roll_number,email)",
      1,
    );
    const people = Array.isArray(team?.finathon_participant)
      ? team.finathon_participant.slice().sort((a, b) => a.position - b.position)
      : [];
    const lead = people.find((p) => p.is_lead === true);
    // No row, or a team with no lead (a legacy copy, say): nobody to write to.
    if (!team || !lead) {
      console.error(`[finathon/mail] approval email skipped: team ${teamId} has no lead on record.`);
      return;
    }
    const members = people.filter((p) => p !== lead);
    const person = (p: StoredTeam["finathon_participant"][number]) => ({
      fullName: p.full_name,
      rollNumber: p.roll_number,
      college: p.college,
    });

    await sendTeamMail(
      {
        kind: "approved",
        teamName: team.team_name,
        publicId: team.public_id,
        amount: rupees(team.amount_paise),
        utr: team.utr,
        lead: person(lead),
        members: members.map(person),
      },
      lead.email,
      members.map((member) => member.email),
    );
  } catch (error) {
    // The id is an integer, not a person, so it is safe to log. The error comes
    // from the shared client and is already scrubbed of row data.
    console.error(`[finathon/mail] approval email failed for team ${teamId}:`, error);
  }
}
