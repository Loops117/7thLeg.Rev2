import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      subtotalCents: true,
      totalCents: true,
      stripeCheckoutSessionId: true,
      _count: { select: { lineItems: true, labelLines: true } },
    },
  });
  console.log("Recent orders:");
  for (const o of orders) {
    console.log(
      `${o.createdAt.toISOString()} ${o.status} id=${o.id} products=${o._count.lineItems} labels=${o._count.labelLines} subtotal=${o.subtotalCents}`,
    );
  }
  const total = await prisma.orderLabelLine.count();
  console.log(`\nTotal order_label_lines rows: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
