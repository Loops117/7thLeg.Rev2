"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type RecommendationPickerHit = { id: string; name: string; slug: string };

export async function searchProductsForRecommendationPicker(
  query: string,
  excludeProductId?: string | null,
): Promise<RecommendationPickerHit[] | { error: string }> {
  try {
    await requireAdmin();
    const q = query.trim();
    const exclude = excludeProductId?.trim();
    const rows = await prisma.product.findMany({
      where: {
        ...(exclude ? { id: { not: exclude } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 30,
      select: { id: true, name: true, slug: true },
    });
    return rows;
  } catch (e) {
    console.error("searchProductsForRecommendationPicker", e);
    return { error: "Could not search products." };
  }
}

export type SaveProductRecommendationsResult = { ok: true } | { ok: false; error: string };

export async function saveProductRecommendations(input: {
  productId: string;
  relatedProductIds: string[];
  youMayAlsoWantProductIds: string[];
}): Promise<SaveProductRecommendationsResult> {
  try {
    await requireAdmin();
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, slug: true },
    });
    if (!product) {
      return { ok: false, error: "Product not found." };
    }

    const { syncProductRecommendations } = await import("@/lib/product-recommendations");
    await syncProductRecommendations(product.id, {
      relatedProductIds: input.relatedProductIds,
      youMayAlsoWantProductIds: input.youMayAlsoWantProductIds,
    });

    revalidatePath("/settings/products");
    revalidatePath(`/product/${product.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("saveProductRecommendations", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}
