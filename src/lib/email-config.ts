/** Read-only view of Resend env configuration (secrets stay server-side). */

export type EmailConfigStatus = {
  configured: boolean;
  fromAddress: string;
  usingDefaultFrom: boolean;
  apiKeyHint: string | null;
  environment: string | null;
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

export function getEmailConfigStatus(): EmailConfigStatus {
  const key = process.env.RESEND_API_KEY?.trim();
  const fromEnv = process.env.EMAIL_FROM?.trim();
  const usingDefaultFrom = !fromEnv;
  const fromAddress = fromEnv ?? "onboarding@resend.dev";

  return {
    configured: Boolean(key),
    fromAddress,
    usingDefaultFrom,
    apiKeyHint: key && key.length > 10 ? `${key.slice(0, 7)}…${key.slice(-4)}` : key ? "(set)" : null,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
  };
}
