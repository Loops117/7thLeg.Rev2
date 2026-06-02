/**
 * Shared Resend send — configure with `RESEND_API_KEY` and `EMAIL_FROM` in the environment.
 */

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export function getResendFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev";
}

export async function sendResendHtmlEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return { ok: false, error: "RESEND_API_KEY is not set in the server environment." };
  }

  const to = opts.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "Invalid recipient email address." };
  }

  const from = getResendFromAddress();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Resend ${res.status}: ${raw.slice(0, 300)}` };
    }

    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { id?: string };
      messageId = parsed.id;
    } catch {
      /* ignore */
    }

    return { ok: true, messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
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
