import { prisma } from "@/lib/prisma";
import { expandProductTypeIdsForFooters } from "@/lib/product-type-tree";

export async function getProductTypeDefaultShippingExclusionIds(typeId: string): Promise<string[]> {
  const rows = await prisma.productTypeDefaultShippingExclusion.findMany({
    where: { typeId },
    select: { shippingOptionId: true },
  });
  return rows.map((r) => r.shippingOptionId);
}

/** Exclusions from assigned types and ancestor types (same expansion as default footers). */
export async function getDefaultShippingExclusionsForProductTypes(
  typeIds: string[],
): Promise<string[]> {
  const expanded = await expandProductTypeIdsForFooters(typeIds);
  if (expanded.length === 0) return [];

  const rows = await prisma.productTypeDefaultShippingExclusion.findMany({
    where: { typeId: { in: expanded } },
    select: { shippingOptionId: true },
  });
  return [...new Set(rows.map((r) => r.shippingOptionId))];
}

export async function syncProductTypeDefaultShippingExclusions(
  typeId: string,
  excludedShippingOptionIds: string[],
): Promise<void> {
  const ids = [...new Set(excludedShippingOptionIds.filter(Boolean))];
  const valid =
    ids.length > 0
      ? await prisma.shippingOption.findMany({ where: { id: { in: ids } }, select: { id: true } })
      : [];
  const validIds = valid.map((r) => r.id);

  await prisma.$transaction(async (tx) => {
    await tx.productTypeDefaultShippingExclusion.deleteMany({ where: { typeId } });
    for (const shippingOptionId of validIds) {
      await tx.productTypeDefaultShippingExclusion.create({
        data: { typeId, shippingOptionId },
      });
    }
  });
}
