/**
 * Transactional email via Microsoft 365 SMTP (GoDaddy Essentials).
 * Configure in Settings → Email, or with SMTP_HOST / SMTP_USER / SMTP_PASS / EMAIL_FROM env vars.
 */

import nodemailer from "nodemailer";
import { resolveSmtpConfig } from "@/lib/email-config";

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

function formatSmtpError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/smtpclientauthentication is disabled|smtp_auth_disabled/i.test(msg)) {
    return `${msg} — SMTP AUTH is turned off for this mailbox in GoDaddy/Microsoft. Enable it under Email & Office → Manage mailbox → Advanced Settings → SMTP Authentication (ON), then retry. See https://www.godaddy.com/help/enable-smtp-authentication-40981`;
  }
  if (/535|authentication|invalid login|auth/i.test(msg)) {
    return `${msg} — Check the mailbox email and password in Settings → Email. For Microsoft 365 with MFA, use an app password.`;
  }
  if (/550|553|sender|from/i.test(msg)) {
    return `${msg} — The From address must match your Microsoft mailbox (or an approved alias).`;
  }
  return msg.length > 400 ? `${msg.slice(0, 397)}…` : msg;
}

export async function sendHtmlEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const config = await resolveSmtpConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Email is not configured. Add your Microsoft mailbox and password in Settings → Email, or set SMTP_USER and SMTP_PASS in the server environment.",
    };
  }

  const to = opts.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "Invalid recipient email address." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error("[send-email]", e);
    return { ok: false, error: formatSmtpError(e) };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
