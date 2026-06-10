import { escapeHtml, sendHtmlEmail } from "@/lib/send-email";

export const DEFAULT_REVIEW_REQUEST_SUBJECT = "How was your order?";
export const DEFAULT_REVIEW_REQUEST_BODY = `Hi {{customerName}},

Thanks for your order! We'd love to hear what you think.

Leave a review: {{reviewUrl}}

— {{companyName}}`;

export function applyReviewRequestTemplate(
  tpl: string,
  vars: { customerName: string; reviewUrl: string; companyName: string; orderId: string },
): string {
  return tpl
    .replaceAll("{{customerName}}", vars.customerName)
    .replaceAll("{{reviewUrl}}", vars.reviewUrl)
    .replaceAll("{{companyName}}", vars.companyName)
    .replaceAll("{{orderId}}", vars.orderId);
}

export function buildReviewRequestEmailHtml(body: string, subject: string): { subject: string; html: string } {
  const withBreaks = escapeHtml(body).replace(/\n/g, "<br>\n");
  return {
    subject: subject.slice(0, 300),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">${withBreaks}</body></html>`,
  };
}

export async function sendReviewRequestEmail(input: {
  to: string;
  subject: string;
  body: string;
  customerName: string;
  reviewUrl: string;
  companyName: string;
  orderId: string;
}) {
  const subject = applyReviewRequestTemplate(input.subject, input);
  const body = applyReviewRequestTemplate(input.body, input);
  const { subject: finalSubject, html } = buildReviewRequestEmailHtml(body, subject);
  return sendHtmlEmail({ to: input.to, subject: finalSubject, html });
}
