"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveProductVariantRow } from "@/app/actions/product-variants-admin";
import type { ProductStockingRow } from "@/lib/product-stocking-types";
import { prisma } from "@/lib/prisma";
import { clampShippingUnits } from "@/lib/shipping-units";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function getProductStockingRowsForAdmin(): Promise<ProductStockingRow[]> {
  await requireAdmin();

  const products = await prisma.product.findMany({
    orderBy: [{ name: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      featured: true,
      onSale: true,
      basePriceCents: true,
      types: { select: { typeId: true } },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: {
          id: true,
          label: true,
          stock: true,
          unlimitedStock: true,
          active: true,
          priceDeltaCents: true,
          shippingUnits: true,
        },
      },
    },
  });

  const rows: ProductStockingRow[] = [];
  for (const product of products) {
    const typeIds = product.types.map((t) => t.typeId);
    const variantCount = product.variants.length;
    for (const variant of product.variants) {
      rows.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productActive: product.active,
        productFeatured: product.featured,
        productOnSale: product.onSale,
        typeIds,
        variantId: variant.id,
        variantLabel: variant.label,
        variantCount,
        basePriceCents: product.basePriceCents,
        listPriceCents: product.basePriceCents + variant.priceDeltaCents,
        stock: variant.stock,
        unlimitedStock: variant.unlimitedStock,
        variantActive: variant.active,
        shippingUnits: variant.shippingUnits,
      });
    }
  }

  return rows;
}

export type SaveProductStockingRowInput = {
  productId: string;
  variantId: string;
  variantLabel: string;
  productActive: boolean;
  variantActive: boolean;
  listPriceUsd: string;
  stock: number;
  unlimitedStock: boolean;
  shippingUnits: number;
};

export async function saveProductStockingRowAction(
  input: SaveProductStockingRowInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();

    const shippingUnits = clampShippingUnits(input.shippingUnits);

    await saveProductVariantRow({
      productId: input.productId,
      variantId: input.variantId,
      label: input.variantLabel.trim() || "Default",
      listPriceUsd: input.listPriceUsd,
      stock: input.stock,
      unlimitedStock: input.unlimitedStock,
      active: input.variantActive,
      shippingUnits,
    });

    await prisma.product.update({
      where: { id: input.productId },
      data: { active: !!input.productActive },
    });

    revalidatePath("/settings/products/stocking");
    revalidatePath("/settings/products");
    revalidatePath("/store");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save row." };
  }
}
