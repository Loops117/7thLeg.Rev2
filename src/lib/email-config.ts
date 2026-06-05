/** Microsoft 365 SMTP email configuration — env overrides admin settings in site_config. */

import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_EMAIL_KINDS,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  type CustomerEmailKind,
  type EmailConfigStatus,
  type EmailSettingsState,
  type ResolvedSmtpConfig,
  emailSettingsDefaults,
} from "@/lib/email-settings-types";

export {
  CUSTOMER_EMAIL_KINDS,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  type CustomerEmailKind,
  type EmailConfigStatus,
  type EmailSettingsState,
  type ResolvedSmtpConfig,
  emailSettingsDefaults,
};

type DbEmailRow = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  emailFromAddress: string;
};

function readEnvSmtp(): Partial<ResolvedSmtpConfig> {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const port = portRaw ? Number(portRaw) : undefined;
  return {
    host: host || undefined,
    port: port && Number.isFinite(port) ? Math.round(port) : undefined,
    user: user || undefined,
    pass: pass || undefined,
    from: from || undefined,
  };
}

async function readEmailSettingsFromDb(): Promise<DbEmailRow> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassword: true,
        emailFromAddress: true,
      },
    });
    return {
      smtpHost:
        typeof row?.smtpHost === "string" && row.smtpHost.trim()
          ? row.smtpHost.trim()
          : DEFAULT_SMTP_HOST,
      smtpPort: Math.min(65535, Math.max(1, Math.round(row?.smtpPort ?? DEFAULT_SMTP_PORT))),
      smtpUser: typeof row?.smtpUser === "string" ? row.smtpUser.trim() : "",
      smtpPassword: typeof row?.smtpPassword === "string" ? row.smtpPassword : "",
      emailFromAddress: typeof row?.emailFromAddress === "string" ? row.emailFromAddress.trim() : "",
    };
  } catch {
    return {
      smtpHost: DEFAULT_SMTP_HOST,
      smtpPort: DEFAULT_SMTP_PORT,
      smtpUser: "",
      smtpPassword: "",
      emailFromAddress: "",
    };
  }
}

function resolveFromAddress(
  envFrom: string | undefined,
  dbFrom: string,
  smtpUser: string,
): { from: string; source: EmailConfigStatus["fromSource"] } {
  if (envFrom) return { from: envFrom, source: "env" };
  if (dbFrom) return { from: dbFrom, source: "database" };
  if (smtpUser) return { from: smtpUser, source: "smtp_user" };
  return { from: "", source: "smtp_user" };
}

/** Resolved credentials used when sending mail (env wins over database). */
export async function resolveSmtpConfig(): Promise<ResolvedSmtpConfig | null> {
  const env = readEnvSmtp();
  const db = await readEmailSettingsFromDb();

  const host = env.host || db.smtpHost || DEFAULT_SMTP_HOST;
  const port = env.port || db.smtpPort || DEFAULT_SMTP_PORT;
  const user = env.user || db.smtpUser || "";
  const pass = env.pass || db.smtpPassword || "";
  const { from } = resolveFromAddress(env.from, db.emailFromAddress, user);

  if (!user || !pass) return null;

  return {
    host,
    port,
    user,
    pass,
    from: from || user,
  };
}

export async function getEmailSettingsForAdmin(): Promise<EmailSettingsState> {
  const db = await readEmailSettingsFromDb();
  return {
    smtpHost: db.smtpHost,
    smtpPort: db.smtpPort,
    smtpUser: db.smtpUser,
    smtpPassword: "",
    emailFromAddress: db.emailFromAddress,
    smtpPasswordSet: db.smtpPassword.length > 0,
  };
}

export async function getEmailConfigStatus(): Promise<EmailConfigStatus> {
  const env = readEnvSmtp();
  const db = await readEmailSettingsFromDb();

  const host = env.host || db.smtpHost || DEFAULT_SMTP_HOST;
  const port = env.port || db.smtpPort || DEFAULT_SMTP_PORT;
  const user = env.user || db.smtpUser || "";
  const pass = env.pass || db.smtpPassword || "";
  const { from, source } = resolveFromAddress(env.from, db.emailFromAddress, user);

  const configured = Boolean(user && pass);

  return {
    configured,
    fromAddress: from || user,
    smtpHost: host,
    smtpPort: port,
    smtpUser: user,
    smtpPasswordSet: Boolean(pass),
    credentialSource: configured
      ? env.user && env.pass
        ? "env"
        : "database"
      : env.user || env.pass
        ? "env"
        : "none",
    fromSource: source,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
  };
}
