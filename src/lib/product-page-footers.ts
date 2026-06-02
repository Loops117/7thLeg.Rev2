import { expandProductTypeIdsForFooters } from "@/lib/product-type-tree";
import { prisma } from "@/lib/prisma";

export type ProductFooterBlock = { id: string; title: string; html: string };

/** Type defaults first, then product-specific footers; duplicates removed. */
export async function getFootersForProduct(
  productId: string,
  typeIds: string[],
): Promise<ProductFooterBlock[]> {
  const expandedTypeIds = await expandProductTypeIdsForFooters(typeIds);

  if (expandedTypeIds.length === 0) {
    const explicit = await prisma.productOnFooter.findMany({
      where: { productId },
      include: { footer: true },
    });
    return explicit.map((e) => e.footer);
  }

  const [defaults, explicit] = await Promise.all([
    prisma.productTypeDefaultFooter.findMany({
      where: { typeId: { in: expandedTypeIds } },
      include: { footer: true },
    }),
    prisma.productOnFooter.findMany({
      where: { productId },
      include: { footer: true },
    }),
  ]);

  const seen = new Set<string>();
  const out: ProductFooterBlock[] = [];

  for (const row of defaults) {
    if (!seen.has(row.footerId)) {
      seen.add(row.footerId);
      out.push(row.footer);
    }
  }
  for (const row of explicit) {
    if (!seen.has(row.footerId)) {
      seen.add(row.footerId);
      out.push(row.footer);
    }
  }

  return out;
}
