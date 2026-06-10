import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ORDER_SHIPPED_BODY,
  DEFAULT_ORDER_SHIPPED_SUBJECT,
  loadOrderEmailTemplateVars,
  resolveOrderRecipient,
  sendTemplatedOrderEmail,
} from "@/lib/order-transactional-email";

/** When an order is marked shipped: send “on its way” email when enabled. */
export async function sendOrderShippedEmailIfEnabled(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, orderShippedEmailSentAt: true },
  });
  if (!order || order.status !== "SHIPPED" || order.orderShippedEmailSentAt) return;

  const to = await resolveOrderRecipient(orderId);
  if (!to) return;

  const site = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: {
      orderShippedEmailEnabled: true,
      orderShippedEmailSubject: true,
      orderShippedEmailBody: true,
    },
  });
  if (site && !site.orderShippedEmailEnabled) return;

  const vars = await loadOrderEmailTemplateVars(orderId);
  if (!vars) return;

  const result = await sendTemplatedOrderEmail({
    to,
    subjectTpl: site?.orderShippedEmailSubject ?? DEFAULT_ORDER_SHIPPED_SUBJECT,
    bodyTpl: site?.orderShippedEmailBody ?? DEFAULT_ORDER_SHIPPED_BODY,
    vars,
  });

  if (result.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: { orderShippedEmailSentAt: new Date() },
    });
  } else {
    console.warn("Order shipped email failed:", orderId, result.error);
  }
}
