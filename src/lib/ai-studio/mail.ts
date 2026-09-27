/*
  Alert and notification email for AI Studio, over the same Zoho SMTP account
  the Finathon mails use. Never throws: an alert that fails to send must not
  fail the request or cron run that triggered it. Only error codes are logged
  — nodemailer errors can carry recipient addresses.
*/

import nodemailer from "nodemailer";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/mail.ts is server-only and must never reach the browser.");
}

const SMTP_HOST = process.env.ZOHO_SMTP_HOST || "smtp.zoho.in";
const SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465);
const SMTP_USER = process.env.ZOHO_SMTP_USER || "team@aczen.in";
const SMTP_PASSWORD = process.env.ZOHO_SMTP_PASSWORD;

export function adminAlertRecipients(): string[] {
  return (process.env.AI_STUDIO_ALERT_EMAIL || SMTP_USER)
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendStudioMail(to: string[], subject: string, lines: string[]): Promise<boolean> {
  if (!SMTP_PASSWORD) {
    console.error("[ai-studio/mail] ZOHO_SMTP_PASSWORD is not set; mail skipped.");
    return false;
  }
  if (to.length === 0) return false;

  const html = `<!doctype html><html><body style="margin:0;background:#f7f7f8;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #eceef2">
<tr><td style="padding:24px 28px;border-bottom:1px solid #eceef2">
<span style="font-weight:700;font-size:18px;color:#0a5cf5">Aczen</span>
<span style="font-weight:500;font-size:18px;color:#1f2937"> AI Studio</span></td></tr>
<tr><td style="padding:24px 28px;color:#1f2937;font-size:14px;line-height:1.6">
${lines.map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`).join("")}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #eceef2;color:#6b7280;font-size:12px">
Sent automatically by Aczen AI Studio · aczen.in/ai-studio</td></tr>
</table></td></tr></table></body></html>`;

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({
      from: `"Aczen AI Studio" <${SMTP_USER}>`,
      to,
      replyTo: SMTP_USER,
      subject: `[Aczen AI Studio] ${subject}`,
      text: lines.join("\n\n"),
      html,
    });
    return true;
  } catch (error) {
    const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown };
    console.error(
      "[ai-studio/mail] send failed:",
      typeof code === "string" ? code : "unknown",
      typeof responseCode === "number" ? responseCode : "",
    );
    return false;
  }
}
