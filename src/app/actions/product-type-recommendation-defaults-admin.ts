"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { RecommendationPickerHit } from "@/app/actions/product-recommendations-admin";
import { resolveRecommendationPickerHits } from "@/app/actions/product-recommendations-admin";
import type { ProductRecommendationLists } from "@/lib/product-recommendations-shared";
import {
  getProductTypeDefaultRecommendationIds,
  syncProductTypeDefaultRecommendations,
} from "@/lib/product-type-recommendation-defaults";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

async function revalidateAfterTypeDefaults(typeId: string) {
  revalidatePath("/settings/products/types");
  revalidatePath(`/settings/products/types/${typeId}/edit`);

  const products = await prisma.productOnType.findMany({
    where: { typeId },
    select: { product: { select: { slug: true } } },
  });
  for (const row of products) {
    revalidatePath(`/product/${row.product.slug}`);
  }
  revalidatePath("/settings/products");
}

export async function getProductTypeDefaultRecommendationsForAdmin(typeId: string): Promise<{
  related: RecommendationPickerHit[];
  youMayAlsoWant: RecommendationPickerHit[];
}> {
  await requireAdmin();
  const lists = await getProductTypeDefaultRecommendationIds(typeId);
  const [related, youMayAlsoWant] = await Promise.all([
    resolveRecommendationPickerHits(lists.relatedProductIds),
    resolveRecommendationPickerHits(lists.youMayAlsoWantProductIds),
  ]);
  return { related, youMayAlsoWant };
}

export type SaveProductTypeRecommendationDefaultsResult = { ok: true } | { ok: false; error: string };

export async function saveProductTypeDefaultRecommendations(input: {
  typeId: string;
  relatedProductIds: string[];
  youMayAlsoWantProductIds: string[];
}): Promise<SaveProductTypeRecommendationDefaultsResult> {
  try {
    await requireAdmin();
    const type = await prisma.productType.findUnique({
      where: { id: input.typeId },
      select: { id: true },
    });
    if (!type) {
      return { ok: false, error: "Type not found." };
    }

    const lists: ProductRecommendationLists = {
      relatedProductIds: input.relatedProductIds,
      youMayAlsoWantProductIds: input.youMayAlsoWantProductIds,
    };
    await syncProductTypeDefaultRecommendations(type.id, lists);
    await revalidateAfterTypeDefaults(type.id);
    return { ok: true };
  } catch (e) {
    console.error("saveProductTypeDefaultRecommendations", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}
