/*
  HTML designs for the Finathon confirmation email.

  Picked at runtime by FINATHON_MAIL_TEMPLATE ("classic" | "minimal" | "ticket"),
  so the look can be switched in Vercel without a code change. Anything else, or
  unset, falls back to "classic".

  Kept free of imports and runtime-only syntax on purpose: this file is also
  rendered by scripts/preview-finathon-mail.mjs to produce the side-by-side
  preview, straight from the same source the live email uses.

  Email clients are not browsers. Everything is tables and inline styles, no
  <style> blocks, no flex/grid, no web fonts — Gmail and Outlook strip or ignore
  all of those.
*/

export type MailPerson = { fullName: string; rollNumber: string; college: string };

/*
  Which email this is. "received" goes out on registration, while payment is
  still being checked; "approved" goes out when a reviewer approves the team on
  /Finathon/axe/26. Same designs, different wording.
*/
export type MailKind = "received" | "approved";

export type MailData = {
  kind: MailKind;
  teamName: string;
  publicId: string;
  amount: string;
  utr: string;
  lead: MailPerson;
  members: MailPerson[];
};

export const MAIL_TEMPLATE_NAMES = ["classic", "minimal", "ticket"] as const;
export type MailTemplateName = (typeof MAIL_TEMPLATE_NAMES)[number];

// Brand palette: orange primary, blue accent. Nothing else.
const ORANGE = "#ff914d";
const BLUE = "#2e77ff";

/* Names and team names are typed by students and go into HTML. Escaped, always. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function roster(data: MailData): { label: string; person: MailPerson }[] {
  return [
    { label: "Lead", person: data.lead },
    ...data.members.map((person, i) => ({ label: `Member ${i + 1}`, person })),
  ];
}

/* The wording that changes between the two emails, kept in one place so the
   three designs cannot drift apart on what they tell the team. */
function copy(data: MailData) {
  const lead = escapeHtml(data.lead.fullName);
  const team = `<strong>${escapeHtml(data.teamName)}</strong>`;
  const payment = `${escapeHtml(data.amount)} payment (UTR <span style="font-family:monospace">${escapeHtml(data.utr)}</span>)`;
  if (data.kind === "approved") {
    return {
      headline: "Finathon 2026 — you're confirmed",
      body: `Your payment has been verified and team ${team} is confirmed for Finathon 2026. See you at the event!`,
      letter: `Good news: your ${payment} has been verified, and ${team} is confirmed for Finathon 2026. See you at the event!`,
      badge: "CONFIRMED",
      ticketIntro: `Hi ${lead} — payment verified. Your team is in. Keep this pass handy.`,
    };
  }
  return {
    headline: "Finathon 2026 — registration received",
    body: `We've received the registration for team ${team}. Your payment is now being verified — you'll hear from us once the organisers have matched it.`,
    letter: `Thanks for registering ${team} for Finathon 2026. We've got your ${payment} and are verifying it now. We'll write again once it's confirmed.`,
    badge: "PAYMENT UNDER REVIEW",
    ticketIntro: `Hi ${lead} — your team is in the queue. Here's your pass while we verify the payment.`,
  };
}

/* Subject line for either email. */
export function mailSubject(data: MailData): string {
  return data.kind === "approved"
    ? `Finathon 2026: you're confirmed — ${data.teamName}`
    : `Finathon 2026: registration received — ${data.teamName}`;
}

function shell(background: string, inner: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${background};font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${background};padding:24px 12px">
    <tr><td align="center">${inner}</td></tr>
  </table>
</body></html>`;
}

/* Orange header band, details table, roster under a blue rule. The original. */
function classic(data: MailData): string {
  const rows = roster(data)
    .map(
      ({ label, person }) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;white-space:nowrap">${label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>${escapeHtml(person.fullName)}</strong><br>
            <span style="color:#666;font-size:13px">${escapeHtml(person.rollNumber)} · ${escapeHtml(person.college)}</span></td>
        </tr>`,
    )
    .join("");

  return shell(
    "#f6f7f9",
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="background:${ORANGE};padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold">${copy(data).headline}</td></tr>
        <tr><td style="padding:24px">
          <p style="margin:0 0 16px">Hi ${escapeHtml(data.lead.fullName)},</p>
          <p style="margin:0 0 16px">${copy(data).body}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;font-size:14px">
            <tr><td style="padding:4px 0;color:#666;width:140px">Registration ID</td><td style="padding:4px 0;font-family:monospace">${escapeHtml(data.publicId)}</td></tr>
            <tr><td style="padding:4px 0;color:#666">Amount</td><td style="padding:4px 0">${escapeHtml(data.amount)}</td></tr>
            <tr><td style="padding:4px 0;color:#666">UTR</td><td style="padding:4px 0;font-family:monospace">${escapeHtml(data.utr)}</td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-top:2px solid ${BLUE}">${rows}
          </table>
          <p style="margin:20px 0 0;font-size:14px;color:#444">If anything above is wrong, just reply to this email.</p>
          <p style="margin:16px 0 0;font-size:14px">— Team Finathon, <span style="color:${BLUE}">Aczen</span></p>
        </td></tr>
      </table>`,
  );
}

/* A plain letter. No band, no card — reads like a person wrote it, which also
   tends to land in Primary rather than Promotions in Gmail. */
function minimal(data: MailData): string {
  const people = roster(data)
    .map(
      ({ label, person }) =>
        `<tr><td style="padding:3px 0;color:#777;width:90px;vertical-align:top">${label}</td>
             <td style="padding:3px 0">${escapeHtml(person.fullName)} <span style="color:#777">· ${escapeHtml(person.rollNumber)}</span></td></tr>`,
    )
    .join("");

  return shell(
    "#ffffff",
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;text-align:left;font-size:15px;line-height:1.6">
        <tr><td style="padding:0 0 20px;border-bottom:3px solid ${ORANGE};font-size:13px;letter-spacing:1px;color:#777">FINATHON 2026</td></tr>
        <tr><td style="padding:24px 0 0">
          <p style="margin:0 0 14px">Hi ${escapeHtml(data.lead.fullName)},</p>
          <p style="margin:0 0 14px">${copy(data).letter}</p>
          <p style="margin:0 0 6px;color:#777;font-size:13px">Your registration ID</p>
          <p style="margin:0 0 20px;font-family:monospace;font-size:15px;color:${BLUE}">${escapeHtml(data.publicId)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin:0 0 20px">${people}</table>
          <p style="margin:0 0 14px">Spotted a mistake? Just reply to this email.</p>
          <p style="margin:0">Team Finathon<br><span style="color:#777">Aczen</span></p>
        </td></tr>
      </table>`,
  );
}

/* An event pass: blue ticket with a torn-edge divider and the registration ID
   as the "admit" code. The most eye-catching of the three. */
function ticket(data: MailData): string {
  const people = roster(data)
    .map(
      ({ label, person }) => `
        <tr>
          <td style="padding:6px 0;color:#c9dbff;font-size:12px;width:80px;vertical-align:top;text-transform:uppercase;letter-spacing:1px">${label}</td>
          <td style="padding:6px 0;color:#ffffff;font-size:14px">${escapeHtml(person.fullName)}<br>
            <span style="color:#c9dbff;font-size:12px">${escapeHtml(person.rollNumber)} · ${escapeHtml(person.college)}</span></td>
        </tr>`,
    )
    .join("");

  return shell(
    "#eef3ff",
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="padding:0 0 16px;text-align:left;font-size:15px;color:#1a1a1a">
          ${copy(data).ticketIntro}
        </td></tr>
        <tr><td style="background:${BLUE};border-radius:14px 14px 0 0;padding:24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:13px;letter-spacing:2px">FINATHON 2026</td>
              <td align="right"><span style="background:${ORANGE};color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;padding:5px 10px;border-radius:20px">${copy(data).badge}</span></td>
            </tr>
            <tr><td colspan="2" style="padding:18px 0 4px;color:#ffffff;font-size:26px;font-weight:bold">${escapeHtml(data.teamName)}</td></tr>
            <tr><td colspan="2" style="padding:0 0 12px;color:#c9dbff;font-size:13px">${escapeHtml(data.amount)} · UTR <span style="font-family:monospace">${escapeHtml(data.utr)}</span></td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #5b95ff;margin-top:6px">${people}</table>
        </td></tr>
        <tr><td style="background:#ffffff;border:2px dashed ${BLUE};border-top:0;border-radius:0 0 14px 14px;padding:18px 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#777;font-size:12px;letter-spacing:1px">REGISTRATION ID</td>
            </tr>
            <tr><td style="padding:4px 0 0;font-family:monospace;font-size:15px;color:#1a1a1a;word-break:break-all">${escapeHtml(data.publicId)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 0 0;text-align:left;font-size:14px;color:#444">
          Anything wrong? Reply to this email. — Team Finathon, <span style="color:${ORANGE};font-weight:bold">Aczen</span>
        </td></tr>
      </table>`,
  );
}

const RENDERERS: Record<MailTemplateName, (data: MailData) => string> = { classic, minimal, ticket };

export function isMailTemplateName(value: string | undefined): value is MailTemplateName {
  return (MAIL_TEMPLATE_NAMES as readonly string[]).includes(value ?? "");
}

export function renderMailHtml(name: MailTemplateName, data: MailData): string {
  return RENDERERS[name](data);
}

/* The plain-text part. One version for all designs — it is what screen readers
   and text-only clients show, and there is no design to choose there. */
export function renderMailText(data: MailData): string {
  const people = roster(data)
    .map(({ label, person }) => `  ${label}: ${person.fullName} (${person.rollNumber}, ${person.college})`)
    .join("\n");

  const opening =
    data.kind === "approved"
      ? [
          `Your payment has been verified and team "${data.teamName}" is confirmed`,
          "for Finathon 2026. See you at the event!",
        ]
      : [
          `We've received the Finathon 2026 registration for team "${data.teamName}".`,
          "",
          "Your payment is now being verified. You'll hear from us once the organisers",
          "have matched it against the bank statement.",
        ];

  return [
    `Hi ${data.lead.fullName},`,
    "",
    ...opening,
    "",
    `Registration ID: ${data.publicId}`,
    `Amount: ${data.amount}`,
    `UTR: ${data.utr}`,
    "",
    "Team:",
    people,
    "",
    "If anything above is wrong, just reply to this email.",
    "",
    "— Team Finathon, Aczen",
  ].join("\n");
}
