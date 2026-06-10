/** Shared email settings types/constants (safe for client components). */

export const DEFAULT_SMTP_HOST = "smtp.office365.com";
export const DEFAULT_SMTP_PORT = 587;

export type EmailConfigStatus = {
  configured: boolean;
  fromAddress: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPasswordSet: boolean;
  credentialSource: "env" | "database" | "none";
  fromSource: "env" | "database" | "smtp_user";
  environment: string | null;
};

export type EmailSettingsState = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  /** Empty on load; leave blank on save to keep the stored password. */
  smtpPassword: string;
  emailFromAddress: string;
  smtpPasswordSet: boolean;
};

export const emailSettingsDefaults: EmailSettingsState = {
  smtpHost: DEFAULT_SMTP_HOST,
  smtpPort: DEFAULT_SMTP_PORT,
  smtpUser: "",
  smtpPassword: "",
  emailFromAddress: "",
  smtpPasswordSet: false,
};

export type CustomerEmailKind = {
  id: string;
  name: string;
  description: string;
  requiresEmail: boolean;
};

export const CUSTOMER_EMAIL_KINDS: CustomerEmailKind[] = [
  {
    id: "password-reset",
    name: "Password reset",
    description: "Sent when a customer requests a reset link from the forgot-password page.",
    requiresEmail: true,
  },
  {
    id: "giveaway-winner",
    name: "Giveaway winner",
    description:
      "Sent when an admin draws giveaway winners and “Send email on draw” is enabled on that event (Events settings).",
    requiresEmail: true,
  },
  {
    id: "review-request",
    name: "Review request",
    description:
      "Sent after a paid order is fulfilled when “Send review request email” is enabled in Settings → Reviews.",
    requiresEmail: true,
  },
];

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};
