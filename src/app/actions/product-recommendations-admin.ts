"use server";

import { auth } from "@/auth";
import { getProductRecommendationIds } from "@/lib/product-recommendations";
import { getTypeDefaultRecommendationIdsForProductTypes } from "@/lib/product-type-recommendation-defaults";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type RecommendationPickerHit = { id: string; name: string; slug: string };

export async function resolveRecommendationPickerHits(
  orderedIds: string[],
): Promise<RecommendationPickerHit[]> {
  if (orderedIds.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return orderedIds.map((id) => byId.get(id)).filter((p): p is RecommendationPickerHit => !!p);
}

export async function getProductRecommendationsForAdmin(productId: string): Promise<{
  related: RecommendationPickerHit[];
  youMayAlsoWant: RecommendationPickerHit[];
  fromTypes: {
    related: RecommendationPickerHit[];
    youMayAlsoWant: RecommendationPickerHit[];
  };
}> {
  await requireAdmin();
  const [lists, typeRows] = await Promise.all([
    getProductRecommendationIds(productId),
    prisma.productOnType.findMany({ where: { productId }, select: { typeId: true } }),
  ]);
  const typeLists = await getTypeDefaultRecommendationIdsForProductTypes(
    typeRows.map((t) => t.typeId),
  );

  const [related, youMayAlsoWant, fromTypesRelated, fromTypesAlso] = await Promise.all([
    resolveRecommendationPickerHits(lists.relatedProductIds),
    resolveRecommendationPickerHits(lists.youMayAlsoWantProductIds),
    resolveRecommendationPickerHits(typeLists.relatedProductIds),
    resolveRecommendationPickerHits(typeLists.youMayAlsoWantProductIds),
  ]);

  return {
    related,
    youMayAlsoWant,
    fromTypes: { related: fromTypesRelated, youMayAlsoWant: fromTypesAlso },
  };
}
