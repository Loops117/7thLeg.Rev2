"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEmailConfigStatus, getEmailSettingsForAdmin } from "@/lib/email-config";
import {
  CUSTOMER_EMAIL_KINDS,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  type EmailConfigStatus,
  type EmailSettingsState,
} from "@/lib/email-settings-types";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendHtmlEmail } from "@/lib/send-email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized.");
  }
}

export type EmailAdminPanelData = {
  status: EmailConfigStatus;
  settings: EmailSettingsState;
  kinds: typeof CUSTOMER_EMAIL_KINDS;
  envOverrides: {
    smtp: boolean;
    emailFrom: boolean;
  };
};

export async function getEmailAdminPanelData(): Promise<EmailAdminPanelData> {
  await requireAdmin();
  const [status, settings] = await Promise.all([getEmailConfigStatus(), getEmailSettingsForAdmin()]);
  const env = process.env;
  return {
    status,
    settings,
    kinds: CUSTOMER_EMAIL_KINDS,
    envOverrides: {
      smtp: Boolean(
        env.SMTP_USER?.trim() || env.SMTP_PASS?.trim() || env.SMTP_HOST?.trim() || env.SMTP_PORT?.trim(),
      ),
      emailFrom: Boolean(env.EMAIL_FROM?.trim()),
    },
  };
}

export type UpdateEmailSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateEmailSettings(state: EmailSettingsState): Promise<UpdateEmailSettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }

  const smtpHost =
    typeof state.smtpHost === "string" && state.smtpHost.trim()
      ? state.smtpHost.trim().slice(0, 200)
      : DEFAULT_SMTP_HOST;
  const smtpPort = Math.min(65535, Math.max(1, Math.round(Number(state.smtpPort) || DEFAULT_SMTP_PORT)));
  const smtpUser = typeof state.smtpUser === "string" ? state.smtpUser.trim().slice(0, 200) : "";
  const emailFromAddress =
    typeof state.emailFromAddress === "string" ? state.emailFromAddress.trim().slice(0, 200) : "";
  const newPassword =
    typeof state.smtpPassword === "string" ? state.smtpPassword.trim().slice(0, 200) : "";

  try {
    const existing = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { smtpPassword: true },
    });
    const smtpPassword = newPassword || existing?.smtpPassword || "";

    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "Inverts Oasis",
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        emailFromAddress,
      },
      update: {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        emailFromAddress,
      },
    });
    revalidatePath("/settings/email", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateEmailSettings", e);
    const msg = e instanceof Error ? e.message : String(e);
    const missingColumn =
      /Unknown column|column .* does not exist|does not exist in the current database|\bP2022\b|42703/i.test(msg) ||
      /\bP2021\b/.test(msg);
    if (missingColumn) {
      return {
        ok: false,
        error:
          "Could not save — this database is missing newer columns (run `npx prisma migrate deploy`, then try again).",
      };
    }
    return { ok: false, error: msg.length > 500 ? `${msg.slice(0, 497)}…` : msg };
  }
}

export type SendTestEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export async function sendAdminTestEmail(to: string): Promise<SendTestEmailResult> {
  await requireAdmin();

  const status = await getEmailConfigStatus();
  if (!status.configured) {
    return {
      ok: false,
      error:
        "SMTP is not connected. Add your Microsoft mailbox email and password below (or set SMTP_USER / SMTP_PASS in Vercel), then save and try again.",
    };
  }

  const recipient = to.trim().toLowerCase();
  const from = status.fromAddress;
  const subject = "Inverts Oasis — test email";
  const sentAt = new Date().toUTCString();

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem">
      <p style="margin:0 0 1rem;font-size:1.125rem;font-weight:700;color:#2d6a4f">Test email</p>
      <p>This message confirms that <strong>Microsoft 365 SMTP</strong> is connected for your store.</p>
      <ul style="margin:1rem 0;padding-left:1.25rem">
        <li><strong>From:</strong> ${escapeHtml(from)}</li>
        <li><strong>SMTP host:</strong> ${escapeHtml(status.smtpHost)}</li>
        <li><strong>Sent at (UTC):</strong> ${escapeHtml(sentAt)}</li>
      </ul>
      <p style="margin:0;font-size:0.875rem;color:#555">If you received this, customers can get password-reset and giveaway emails when those features send mail.</p>
    </div>
  `.trim();

  const text = `Test email from Inverts Oasis.\n\nFrom: ${from}\nSMTP: ${status.smtpHost}\nSent at (UTC): ${sentAt}\n\nIf you received this, email is working.`;

  const result = await sendHtmlEmail({ to: recipient, subject, html, text });
  if (!result.ok) return result;

  revalidatePath("/settings/email");
  return result;
}
