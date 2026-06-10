import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ORDER_CONFIRMATION_BODY,
  DEFAULT_ORDER_CONFIRMATION_SUBJECT,
  loadOrderEmailTemplateVars,
  resolveOrderRecipient,
  sendTemplatedOrderEmail,
} from "@/lib/order-transactional-email";

/** After payment fulfillment: send order confirmation when enabled. */
export async function sendOrderConfirmationEmailIfEnabled(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderConfirmationEmailSentAt: true },
  });
  if (!order || order.orderConfirmationEmailSentAt) return;

  const to = await resolveOrderRecipient(orderId);
  if (!to) return;

  const site = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: {
      orderConfirmationEmailEnabled: true,
      orderConfirmationEmailSubject: true,
      orderConfirmationEmailBody: true,
    },
  });
  if (site && !site.orderConfirmationEmailEnabled) return;

  const vars = await loadOrderEmailTemplateVars(orderId);
  if (!vars) return;

  const result = await sendTemplatedOrderEmail({
    to,
    subjectTpl: site?.orderConfirmationEmailSubject ?? DEFAULT_ORDER_CONFIRMATION_SUBJECT,
    bodyTpl: site?.orderConfirmationEmailBody ?? DEFAULT_ORDER_CONFIRMATION_BODY,
    vars,
  });

  if (result.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: { orderConfirmationEmailSentAt: new Date() },
    });
  } else {
    console.warn("Order confirmation email failed:", orderId, result.error);
  }
}
