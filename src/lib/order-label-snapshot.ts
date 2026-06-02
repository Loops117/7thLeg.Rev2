import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

function snapshotRows(
  orderId: string,
  items: Array<{
    templateId: string;
    savedDesignId: string | null;
    displayName: string;
    documentJson: unknown;
    quantity: number;
    unitCents: number;
    lineTotalCents: number;
    dataRowLabel: string | null;
    widthMm: number;
    heightMm: number;
    labelsPerSheet: number;
    sheetsCount: number;
    sheetFormat: string;
  }>,
) {
  return items.map((row, sortOrder) => ({
    orderId,
    templateId: row.templateId,
    savedDesignId: row.savedDesignId,
    displayName: row.displayName,
    documentJson: row.documentJson as Prisma.InputJsonValue,
    quantity: row.quantity,
    unitCents: row.unitCents,
    lineTotalCents: row.lineTotalCents,
    dataRowLabel: row.dataRowLabel,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    labelsPerSheet: row.labelsPerSheet,
    sheetsCount: row.sheetsCount,
    sheetFormat: row.sheetFormat,
    sortOrder,
  }));
}

/** Copy cart label lines onto an order. Skips when the order already has label snapshots. */
export async function snapshotCartLabelsToOrder(
  orderId: string,
  cartId: string,
  db: DbClient = prisma,
): Promise<number> {
  const existing = await db.orderLabelLine.count({ where: { orderId } });
  if (existing > 0) return existing;

  const items = await db.cartLabelItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
  });
  if (items.length === 0) return 0;

  await db.orderLabelLine.createMany({
    data: snapshotRows(orderId, items),
  });
  return items.length;
}
