import type { TrackingCarrier } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { trackingCarrierLabel } from "@/lib/order-display";
import { formatPriceUsd } from "@/lib/product-slug";
import { escapeHtml, sendHtmlEmail } from "@/lib/send-email";
import { DEFAULT_COMPANY_NAME } from "@/lib/site-config-types";
import { trackingUrlForCarrier } from "@/lib/tracking-url";

export const DEFAULT_ORDER_CONFIRMATION_SUBJECT = "Order confirmed — {{companyName}}";
export const DEFAULT_ORDER_CONFIRMATION_BODY = `Hi {{customerName}},

Thanks for your order! We've received your payment.

Order {{orderShortId}}
{{orderItems}}

Total: {{orderTotal}}

View your order: {{orderUrl}}

— {{companyName}}`;

export const DEFAULT_ORDER_SHIPPED_SUBJECT = "Your order is on its way — {{companyName}}";
export const DEFAULT_ORDER_SHIPPED_BODY = `Hi {{customerName}},

Good news — your order {{orderShortId}} has shipped!

{{orderItems}}

{{trackingLine}}

View your order: {{orderUrl}}

— {{companyName}}`;

export type OrderEmailTemplateVars = {
  customerName: string;
  companyName: string;
  orderId: string;
  orderShortId: string;
  orderTotal: string;
  orderItems: string;
  orderUrl: string;
  trackingNumber: string;
  trackingUrl: string;
  trackingLine: string;
  shippingLabel: string;
};

export type OrderEmailSettingsState = {
  orderConfirmationEmailEnabled: boolean;
  orderConfirmationEmailSubject: string;
  orderConfirmationEmailBody: string;
  orderShippedEmailEnabled: boolean;
  orderShippedEmailSubject: string;
  orderShippedEmailBody: string;
};

export const orderEmailSettingsDefaults: OrderEmailSettingsState = {
  orderConfirmationEmailEnabled: true,
  orderConfirmationEmailSubject: DEFAULT_ORDER_CONFIRMATION_SUBJECT,
  orderConfirmationEmailBody: DEFAULT_ORDER_CONFIRMATION_BODY,
  orderShippedEmailEnabled: true,
  orderShippedEmailSubject: DEFAULT_ORDER_SHIPPED_SUBJECT,
  orderShippedEmailBody: DEFAULT_ORDER_SHIPPED_BODY,
};

export function applyOrderEmailTemplate(tpl: string, vars: OrderEmailTemplateVars): string {
  return tpl
    .replaceAll("{{customerName}}", vars.customerName)
    .replaceAll("{{companyName}}", vars.companyName)
    .replaceAll("{{orderId}}", vars.orderId)
    .replaceAll("{{orderShortId}}", vars.orderShortId)
    .replaceAll("{{orderTotal}}", vars.orderTotal)
    .replaceAll("{{orderItems}}", vars.orderItems)
    .replaceAll("{{orderUrl}}", vars.orderUrl)
    .replaceAll("{{trackingNumber}}", vars.trackingNumber)
    .replaceAll("{{trackingUrl}}", vars.trackingUrl)
    .replaceAll("{{trackingLine}}", vars.trackingLine)
    .replaceAll("{{shippingLabel}}", vars.shippingLabel);
}

export function buildOrderEmailHtml(body: string, subject: string): { subject: string; html: string; text: string } {
  const finalSubject = subject.slice(0, 300);
  const withBreaks = escapeHtml(body).replace(/\n/g, "<br>\n");
  return {
    subject: finalSubject,
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:36rem">${withBreaks}</body></html>`,
    text: body,
  };
}

function formatOrderItemsLine(
  lineItems: {
    quantity: number;
    productNameSnap: string;
    variantLabelSnap: string | null;
    lineTotalCents: number;
  }[],
): string {
  if (lineItems.length === 0) return "(No items)";
  return lineItems
    .map((li) => {
      const name = li.variantLabelSnap?.trim()
        ? `${li.productNameSnap} (${li.variantLabelSnap})`
        : li.productNameSnap;
      return `${li.quantity}× ${name} — ${formatPriceUsd(li.lineTotalCents)}`;
    })
    .join("\n");
}

function buildTrackingLine(trackingNumber: string, trackingUrl: string, carrier: TrackingCarrier): string {
  const num = trackingNumber.trim();
  if (!num) return "";
  const carrierLabel = trackingCarrierLabel(carrier);
  if (trackingUrl) {
    return carrierLabel
      ? `Track your package (${carrierLabel}): ${trackingUrl}`
      : `Track your package: ${trackingUrl}`;
  }
  return carrierLabel ? `Tracking (${carrierLabel}): ${num}` : `Tracking: ${num}`;
}

function resolveCustomerName(
  customer: { firstName: string | null; displayName: string | null; email: string } | null,
  guestEmail: string | null,
): string {
  if (customer) {
    const fromParts = customer.firstName?.trim();
    if (fromParts) return fromParts;
    if (customer.displayName?.trim()) return customer.displayName.trim();
    const emailLocal = customer.email.split("@")[0]?.trim();
    if (emailLocal) return emailLocal;
  }
  const guest = guestEmail?.trim();
  if (guest) {
    const local = guest.split("@")[0]?.trim();
    if (local) return local;
  }
  return "there";
}

function resolveRecipientEmail(
  customer: { email: string } | null,
  guestEmail: string | null,
): string | null {
  const fromCustomer = customer?.email?.trim().toLowerCase();
  if (fromCustomer) return fromCustomer;
  const guest = guestEmail?.trim().toLowerCase();
  if (guest && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest)) return guest;
  return null;
}

export async function loadOrderEmailTemplateVars(orderId: string): Promise<OrderEmailTemplateVars | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true, firstName: true, displayName: true } },
      lineItems: {
        orderBy: { id: "asc" },
        select: {
          quantity: true,
          productNameSnap: true,
          variantLabelSnap: true,
          lineTotalCents: true,
        },
      },
    },
  });
  if (!order) return null;

  const site = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { companyName: true },
  });
  const companyName = site?.companyName?.trim() || DEFAULT_COMPANY_NAME;
  const origin = getPublicAppOrigin();
  const trackingNumber = order.trackingNumber?.trim() ?? "";
  const trackingUrl = trackingUrlForCarrier(order.trackingCarrier, trackingNumber) ?? "";

  return {
    customerName: resolveCustomerName(order.customer, order.guestEmail),
    companyName,
    orderId: order.id,
    orderShortId: order.id.slice(0, 8),
    orderTotal: formatPriceUsd(order.totalCents),
    orderItems: formatOrderItemsLine(order.lineItems),
    orderUrl: `${origin}/account/orders`,
    trackingNumber,
    trackingUrl,
    trackingLine: buildTrackingLine(trackingNumber, trackingUrl, order.trackingCarrier),
    shippingLabel: order.shippingLabelSnap?.trim() || "",
  };
}

export async function sendTemplatedOrderEmail(input: {
  to: string;
  subjectTpl: string;
  bodyTpl: string;
  vars: OrderEmailTemplateVars;
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const subject = applyOrderEmailTemplate(input.subjectTpl, input.vars);
  const body = applyOrderEmailTemplate(input.bodyTpl, input.vars);
  const { subject: finalSubject, html, text } = buildOrderEmailHtml(body, subject);
  return sendHtmlEmail({ to: input.to, subject: finalSubject, html, text });
}

export async function resolveOrderRecipient(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      guestEmail: true,
      customer: { select: { email: true } },
    },
  });
  if (!order) return null;
  return resolveRecipientEmail(order.customer, order.guestEmail);
}
