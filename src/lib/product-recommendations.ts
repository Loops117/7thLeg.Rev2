import { prisma } from "@/lib/prisma";

const RECOMMENDATION_KIND_RELATED = "RELATED" as const;
const RECOMMENDATION_KIND_YOU_MAY_ALSO_WANT = "YOU_MAY_ALSO_WANT" as const;
import {
  MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION,
  type ProductRecommendationLists,
} from "@/lib/product-recommendations-shared";
import {
  getTypeDefaultRecommendationIdsForProductTypes,
  mergeRecommendationLists,
} from "@/lib/product-type-recommendation-defaults";

export type { ProductRecommendationLists } from "@/lib/product-recommendations-shared";
import {
  getEventPriceOverlayForProduct,
  storefrontProductSelect,
  type StorefrontProductCard,
} from "@/lib/products-storefront";

export async function getProductRecommendationIds(productId: string): Promise<ProductRecommendationLists> {
  const rows = await prisma.productRecommendation.findMany({
    where: { productId },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    select: { relatedProductId: true, kind: true },
  });

  const relatedProductIds: string[] = [];
  const youMayAlsoWantProductIds: string[] = [];
  for (const row of rows) {
    if (row.kind === RECOMMENDATION_KIND_RELATED) {
      relatedProductIds.push(row.relatedProductId);
    } else {
      youMayAlsoWantProductIds.push(row.relatedProductId);
    }
  }
  return { relatedProductIds, youMayAlsoWantProductIds };
}

function uniqueIdsPreserveOrder(ids: string[], excludeProductId: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || id === excludeProductId || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION) break;
  }
  return out;
}

export async function syncProductRecommendations(
  productId: string,
  lists: ProductRecommendationLists,
): Promise<void> {
  const relatedIds = uniqueIdsPreserveOrder(lists.relatedProductIds, productId);
  const alsoWantIds = uniqueIdsPreserveOrder(lists.youMayAlsoWantProductIds, productId);
  const allIds = [...new Set([...relatedIds, ...alsoWantIds])];

  const valid =
    allIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: allIds } }, select: { id: true } })
      : [];
  const validSet = new Set(valid.map((p) => p.id));
  const relatedFiltered = relatedIds.filter((id) => validSet.has(id));
  const alsoFiltered = alsoWantIds.filter((id) => validSet.has(id));

  await prisma.$transaction(async (tx) => {
    await tx.productRecommendation.deleteMany({ where: { productId } });
    for (let i = 0; i < relatedFiltered.length; i++) {
      await tx.productRecommendation.create({
        data: {
          productId,
          relatedProductId: relatedFiltered[i]!,
          kind: RECOMMENDATION_KIND_RELATED,
          sortOrder: i,
        },
      });
    }
    for (let i = 0; i < alsoFiltered.length; i++) {
      await tx.productRecommendation.create({
        data: {
          productId,
          relatedProductId: alsoFiltered[i]!,
          kind: RECOMMENDATION_KIND_YOU_MAY_ALSO_WANT,
          sortOrder: i,
        },
      });
    }
  });
}

async function loadStorefrontCardsInOrder(
  orderedIds: string[],
  eventId: string | null,
): Promise<StorefrontProductCard[]> {
  if (orderedIds.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: orderedIds }, active: true },
    select: storefrontProductSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const out: StorefrontProductCard[] = [];
  for (const id of orderedIds) {
    const base = byId.get(id);
    if (!base) continue;
    let card: StorefrontProductCard = { ...base };
    if (eventId) {
      const overlay = await getEventPriceOverlayForProduct(
        eventId,
        base.id,
        base.basePriceCents,
        base.onSale,
      );
      if (overlay) {
        card = {
          ...card,
          displayPriceCents: overlay.displayPriceCents,
          displaySale: overlay.displaySale,
        };
      }
    }
    out.push(card);
  }
  return out;
}

export async function getEffectiveProductRecommendationIds(
  productId: string,
): Promise<ProductRecommendationLists> {
  const [productLists, typeRows] = await Promise.all([
    getProductRecommendationIds(productId),
    prisma.productOnType.findMany({
      where: { productId },
      select: { typeId: true },
    }),
  ]);
  const typeDefaults = await getTypeDefaultRecommendationIdsForProductTypes(
    typeRows.map((t) => t.typeId),
  );
  return mergeRecommendationLists(typeDefaults, productLists, productId);
}

export async function getProductRecommendationsForStorefront(
  productId: string,
  eventId: string | null = null,
): Promise<{ related: StorefrontProductCard[]; youMayAlsoWant: StorefrontProductCard[] }> {
  const lists = await getEffectiveProductRecommendationIds(productId);
  const [related, youMayAlsoWant] = await Promise.all([
    loadStorefrontCardsInOrder(lists.relatedProductIds, eventId),
    loadStorefrontCardsInOrder(lists.youMayAlsoWantProductIds, eventId),
  ]);
  return { related, youMayAlsoWant };
}
