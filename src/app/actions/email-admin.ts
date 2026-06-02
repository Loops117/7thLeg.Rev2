"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CUSTOMER_EMAIL_KINDS, getEmailConfigStatus, type EmailConfigStatus } from "@/lib/email-config";
import { escapeHtml, getResendFromAddress, sendResendHtmlEmail } from "@/lib/resend-email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized.");
  }
}

export type EmailAdminPanelData = {
  status: EmailConfigStatus;
  kinds: typeof CUSTOMER_EMAIL_KINDS;
};

export async function getEmailAdminPanelData(): Promise<EmailAdminPanelData> {
  await requireAdmin();
  return {
    status: getEmailConfigStatus(),
    kinds: CUSTOMER_EMAIL_KINDS,
  };
}

export type SendTestEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export async function sendAdminTestEmail(to: string): Promise<SendTestEmailResult> {
  await requireAdmin();

  const status = getEmailConfigStatus();
  if (!status.configured) {
    return {
      ok: false,
      error:
        "RESEND_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    };
  }

  const recipient = to.trim().toLowerCase();
  const from = getResendFromAddress();
  const subject = "Inverts Oasis — test email";
  const sentAt = new Date().toUTCString();

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem">
      <p style="margin:0 0 1rem;font-size:1.125rem;font-weight:700;color:#2d6a4f">Test email</p>
      <p>This message confirms that <strong>Resend</strong> is connected for your store.</p>
      <ul style="margin:1rem 0;padding-left:1.25rem">
        <li><strong>From:</strong> ${escapeHtml(from)}</li>
        <li><strong>Sent at (UTC):</strong> ${escapeHtml(sentAt)}</li>
      </ul>
      <p style="margin:0;font-size:0.875rem;color:#555">If you received this, customers can get password-reset and giveaway emails when those features send mail.</p>
    </div>
  `.trim();

  const text = `Test email from Inverts Oasis.\n\nFrom: ${from}\nSent at (UTC): ${sentAt}\n\nIf you received this, Resend is working.`;

  const result = await sendResendHtmlEmail({ to: recipient, subject, html, text });
  if (!result.ok) return result;

  revalidatePath("/settings/email");
  return result;
}
