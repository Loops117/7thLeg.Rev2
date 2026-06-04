import { prisma } from "@/lib/prisma";
import {
  MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION,
  type ProductRecommendationLists,
} from "@/lib/product-recommendations-shared";
import { expandProductTypeIdsForFooters } from "@/lib/product-type-tree";

const KIND_RELATED = "RELATED" as const;
const KIND_YOU_MAY_ALSO_WANT = "YOU_MAY_ALSO_WANT" as const;

function appendUnique(
  out: string[],
  seen: Set<string>,
  id: string,
  hostProductId: string | null,
): void {
  if (!id || (hostProductId && id === hostProductId) || seen.has(id)) return;
  if (out.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION) return;
  seen.add(id);
  out.push(id);
}

/** Type defaults first, then product-specific; deduped; capped per section. */
export function mergeRecommendationLists(
  typeDefaults: ProductRecommendationLists,
  productSpecific: ProductRecommendationLists,
  hostProductId: string,
): ProductRecommendationLists {
  const seenRelated = new Set<string>();
  const seenAlso = new Set<string>();
  const relatedProductIds: string[] = [];
  const youMayAlsoWantProductIds: string[] = [];

  for (const id of typeDefaults.relatedProductIds) {
    appendUnique(relatedProductIds, seenRelated, id, hostProductId);
  }
  for (const id of productSpecific.relatedProductIds) {
    appendUnique(relatedProductIds, seenRelated, id, hostProductId);
  }
  for (const id of typeDefaults.youMayAlsoWantProductIds) {
    appendUnique(youMayAlsoWantProductIds, seenAlso, id, hostProductId);
  }
  for (const id of productSpecific.youMayAlsoWantProductIds) {
    appendUnique(youMayAlsoWantProductIds, seenAlso, id, hostProductId);
  }

  return { relatedProductIds, youMayAlsoWantProductIds };
}

export async function getProductTypeDefaultRecommendationIds(
  typeId: string,
): Promise<ProductRecommendationLists> {
  const rows = await prisma.productTypeDefaultRecommendation.findMany({
    where: { typeId },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    select: { relatedProductId: true, kind: true },
  });

  const relatedProductIds: string[] = [];
  const youMayAlsoWantProductIds: string[] = [];
  for (const row of rows) {
    if (row.kind === KIND_RELATED) {
      relatedProductIds.push(row.relatedProductId);
    } else {
      youMayAlsoWantProductIds.push(row.relatedProductId);
    }
  }
  return { relatedProductIds, youMayAlsoWantProductIds };
}

/** Defaults from this type and ancestor types (same expansion as default footers). */
export async function getTypeDefaultRecommendationIdsForProductTypes(
  typeIds: string[],
): Promise<ProductRecommendationLists> {
  const expanded = await expandProductTypeIdsForFooters(typeIds);
  if (expanded.length === 0) {
    return { relatedProductIds: [], youMayAlsoWantProductIds: [] };
  }

  const rows = await prisma.productTypeDefaultRecommendation.findMany({
    where: { typeId: { in: expanded } },
    select: { typeId: true, relatedProductId: true, kind: true, sortOrder: true },
  });

  const byType = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byType.get(row.typeId) ?? [];
    list.push(row);
    byType.set(row.typeId, list);
  }

  const relatedProductIds: string[] = [];
  const youMayAlsoWantProductIds: string[] = [];
  const seenRelated = new Set<string>();
  const seenAlso = new Set<string>();

  for (const typeId of expanded) {
    const forType = (byType.get(typeId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    for (const row of forType) {
      if (row.kind === KIND_RELATED) {
        appendUnique(relatedProductIds, seenRelated, row.relatedProductId, null);
      } else {
        appendUnique(youMayAlsoWantProductIds, seenAlso, row.relatedProductId, null);
      }
    }
  }

  return { relatedProductIds, youMayAlsoWantProductIds };
}

export async function syncProductTypeDefaultRecommendations(
  typeId: string,
  lists: ProductRecommendationLists,
): Promise<void> {
  const relatedIds = lists.relatedProductIds.filter(Boolean);
  const alsoIds = lists.youMayAlsoWantProductIds.filter(Boolean);
  const allIds = [...new Set([...relatedIds, ...alsoIds])];

  const valid =
    allIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: allIds } }, select: { id: true } })
      : [];
  const validSet = new Set(valid.map((p) => p.id));
  const relatedFiltered = relatedIds.filter((id) => validSet.has(id));
  const alsoFiltered = alsoIds.filter((id) => validSet.has(id));

  await prisma.$transaction(async (tx) => {
    await tx.productTypeDefaultRecommendation.deleteMany({ where: { typeId } });
    for (let i = 0; i < relatedFiltered.length; i++) {
      await tx.productTypeDefaultRecommendation.create({
        data: {
          typeId,
          relatedProductId: relatedFiltered[i]!,
          kind: KIND_RELATED,
          sortOrder: i,
        },
      });
    }
    for (let i = 0; i < alsoFiltered.length; i++) {
      await tx.productTypeDefaultRecommendation.create({
        data: {
          typeId,
          relatedProductId: alsoFiltered[i]!,
          kind: KIND_YOU_MAY_ALSO_WANT,
          sortOrder: i,
        },
      });
    }
  });
}
