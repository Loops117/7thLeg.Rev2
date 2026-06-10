/**
 * Send an order confirmation email for a customer/order.
 *
 *   npx tsx scripts/send-order-email.ts RyanHubb8989@gmail.com
 *   npx tsx scripts/send-order-email.ts RyanHubb8989@gmail.com --shipped
 *   npx tsx scripts/send-order-email.ts <orderId>
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { sendOrderConfirmationEmailIfEnabled } from "../src/lib/send-order-confirmation-email";
import { sendOrderShippedEmailIfEnabled } from "../src/lib/send-order-shipped-email";

async function main() {
  const arg = process.argv[2]?.trim();
  const shipped = process.argv.includes("--shipped");

  if (!arg) {
    console.error("Usage: npx tsx scripts/send-order-email.ts <email|orderId> [--shipped]");
    process.exit(1);
  }

  let orderId: string | null = null;

  if (arg.includes("@")) {
    const email = arg.toLowerCase();
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ customer: { email } }, { guestEmail: email }],
        status: { in: ["PAID", "ACCEPTED", "FULFILLED", "SHIPPED", "COMPLETE"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, totalCents: true },
    });
    if (!order) {
      console.error(`No paid order found for ${email}`);
      process.exit(1);
    }
    orderId = order.id;
    console.log(`Using order ${order.id} (${order.status}, $${(order.totalCents / 100).toFixed(2)})`);
  } else {
    const order = await prisma.order.findUnique({ where: { id: arg }, select: { id: true } });
    if (!order) {
      console.error(`Order not found: ${arg}`);
      process.exit(1);
    }
    orderId = order.id;
  }

  // Allow re-send for testing
  await prisma.order.update({
    where: { id: orderId },
    data: shipped ? { orderShippedEmailSentAt: null } : { orderConfirmationEmailSentAt: null },
  });

  if (shipped) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED" },
    });
    await sendOrderShippedEmailIfEnabled(orderId);
    console.log("Shipped email send attempted.");
  } else {
    await sendOrderConfirmationEmailIfEnabled(orderId);
    console.log("Order confirmation email send attempted.");
  }

  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderConfirmationEmailSentAt: true,
      orderShippedEmailSentAt: true,
      customer: { select: { email: true } },
      guestEmail: true,
    },
  });
  console.log("Recipient:", updated?.customer?.email ?? updated?.guestEmail);
  console.log(
    shipped ? "orderShippedEmailSentAt:" : "orderConfirmationEmailSentAt:",
    shipped ? updated?.orderShippedEmailSentAt : updated?.orderConfirmationEmailSentAt,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
