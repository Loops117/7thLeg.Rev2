/** Resend email configuration — env overrides admin settings in site_config. */

import { prisma } from "@/lib/prisma";

export type EmailConfigStatus = {
  configured: boolean;
  fromAddress: string;
  usingDefaultFrom: boolean;
  apiKeyHint: string | null;
  environment: string | null;
  apiKeySource: "env" | "database" | "none";
  fromSource: "env" | "database" | "default";
};

export type EmailSettingsState = {
  resendApiKey: string;
  emailFromAddress: string;
};

export const emailSettingsDefaults: EmailSettingsState = {
  resendApiKey: "",
  emailFromAddress: "",
};

export type CustomerEmailKind = {
  id: string;
  name: string;
  description: string;
  requiresResend: boolean;
};

export const CUSTOMER_EMAIL_KINDS: CustomerEmailKind[] = [
  {
    id: "password-reset",
    name: "Password reset",
    description: "Sent when a customer requests a reset link from the forgot-password page.",
    requiresResend: true,
  },
  {
    id: "giveaway-winner",
    name: "Giveaway winner",
    description:
      "Sent when an admin draws giveaway winners and “Send email on draw” is enabled on that event (Events settings).",
    requiresResend: true,
  },
];

const DEFAULT_FROM = "onboarding@resend.dev";

function maskApiKey(key: string | null | undefined): string | null {
  const k = key?.trim();
  if (!k) return null;
  if (k.length <= 10) return "(set)";
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}

async function readEmailSettingsFromDb(): Promise<EmailSettingsState> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { resendApiKey: true, emailFromAddress: true },
    });
    return {
      resendApiKey: typeof row?.resendApiKey === "string" ? row.resendApiKey : "",
      emailFromAddress: typeof row?.emailFromAddress === "string" ? row.emailFromAddress : "",
    };
  } catch {
    return { ...emailSettingsDefaults };
  }
}

/** Resolved credentials used when sending mail (env wins over database). */
export async function resolveResendConfig(): Promise<{
  apiKey: string | null;
  from: string;
}> {
  const envKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const envFrom = process.env.EMAIL_FROM?.trim() ?? "";
  const db = await readEmailSettingsFromDb();
  const dbKey = db.resendApiKey.trim();
  const dbFrom = db.emailFromAddress.trim();

  const apiKey = envKey || dbKey || null;
  const from = envFrom || dbFrom || DEFAULT_FROM;

  return { apiKey, from };
}

export async function getEmailSettingsForAdmin(): Promise<EmailSettingsState> {
  return readEmailSettingsFromDb();
}

export async function getEmailConfigStatus(): Promise<EmailConfigStatus> {
  const envKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const envFrom = process.env.EMAIL_FROM?.trim() ?? "";
  const db = await readEmailSettingsFromDb();
  const dbKey = db.resendApiKey.trim();
  const dbFrom = db.emailFromAddress.trim();

  const apiKey = envKey || dbKey || null;
  const from = envFrom || dbFrom || DEFAULT_FROM;

  let apiKeySource: EmailConfigStatus["apiKeySource"] = "none";
  if (envKey) apiKeySource = "env";
  else if (dbKey) apiKeySource = "database";

  let fromSource: EmailConfigStatus["fromSource"] = "default";
  if (envFrom) fromSource = "env";
  else if (dbFrom) fromSource = "database";

  return {
    configured: Boolean(apiKey),
    fromAddress: from,
    usingDefaultFrom: fromSource === "default",
    apiKeyHint: maskApiKey(apiKey),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    apiKeySource,
    fromSource,
  };
}
