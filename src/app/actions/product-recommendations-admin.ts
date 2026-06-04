"use server";

import { auth } from "@/auth";
import { getProductRecommendationIds } from "@/lib/product-recommendations";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type RecommendationPickerHit = { id: string; name: string; slug: string };

export async function getProductRecommendationsForAdmin(productId: string): Promise<{
  related: RecommendationPickerHit[];
  youMayAlsoWant: RecommendationPickerHit[];
}> {
  await requireAdmin();
  const lists = await getProductRecommendationIds(productId);
  const allIds = [...lists.relatedProductIds, ...lists.youMayAlsoWantProductIds];
  if (allIds.length === 0) {
    return { related: [], youMayAlsoWant: [] };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: allIds } },
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const related = lists.relatedProductIds
    .map((id) => byId.get(id))
    .filter((p): p is RecommendationPickerHit => !!p);
  const youMayAlsoWant = lists.youMayAlsoWantProductIds
    .map((id) => byId.get(id))
    .filter((p): p is RecommendationPickerHit => !!p);

  return { related, youMayAlsoWant };
}
