"use server";

import type { ProductMediaAdmin } from "@/app/actions/product-images-admin";
import { getProductRecommendationsForAdmin } from "@/app/actions/product-recommendations-admin";
import { auth } from "@/auth";
import type { ProductCatalogEditPayload } from "@/lib/product-catalog-edit-types";
import { getProductKitAdmin } from "@/lib/product-kits";
import { parseProductPriceTiersJson } from "@/lib/product-price-tiers";
import { parseVariantPriceDisplay } from "@/lib/product-variant-price-display";
import type { ProductEditInitial } from "@/lib/products-admin-types";
import { prisma } from "@/lib/prisma";
import { normalizeVariantSku } from "@/lib/variant-sku";

export type { ProductCatalogEditPayload } from "@/lib/product-catalog-edit-types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

export async function getProductCatalogEditPayload(id: string): Promise<ProductCatalogEditPayload | null> {
  await requireAdmin();
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      types: { select: { typeId: true } },
      footers: { select: { footerId: true } },
      shippingOptionExclusions: { select: { shippingOptionId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: {
          id: true,
          label: true,
          sku: true,
          description: true,
          sortOrder: true,
          stock: true,
          unlimitedStock: true,
          active: true,
          priceDeltaCents: true,
          priceTiersJson: true,
          pickerBgHex: true,
          pickerFgHex: true,
          pickerBorderHex: true,
          shippingUnits: true,
        },
      },
    },
  });
  if (!product) return null;
  const saleIso = product.saleEndsAt?.toISOString() ?? "";
  const initial: ProductEditInitial = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    description: product.description,
    basePriceCents: product.basePriceCents,
    quantity: product.quantity,
    unlimitedQuantity: product.unlimitedQuantity,
    active: product.active,
    featured: product.featured,
    onSale: product.onSale,
    inBreeding: product.inBreeding,
    speciesAutoAdd: product.speciesAutoAdd,
    speciesListSpecies: product.speciesListSpecies,
    speciesListInsectType: product.speciesListInsectType,
    speciesListMorphName: product.speciesListMorphName,
    speciesListCommonName: product.speciesListCommonName,
    speciesListSource: product.speciesListSource,
    saleEndsAt: saleIso.slice(0, 16),
    typeIds: product.types.map((t) => t.typeId),
    footerIds: product.footers.map((f) => f.footerId),
    variantPriceDisplay: parseVariantPriceDisplay(product.variantPriceDisplay),
    excludedShippingOptionIds: product.shippingOptionExclusions.map((row) => row.shippingOptionId),
  };
  const media: ProductMediaAdmin = {
    images: product.images.map((im) => ({
      id: im.id,
      url: im.url,
      watermarkedUrl: im.watermarkedUrl,
      useWatermarkedPublic: im.useWatermarkedPublic,
      originalFilename: im.originalFilename,
      sortOrder: im.sortOrder,
      variantId: im.variantId,
    })),
    variants: product.variants.map((r) => ({
      id: r.id,
      label: r.label,
      sku: normalizeVariantSku(r.sku),
      description: r.description ?? "",
      sortOrder: r.sortOrder,
      stock: r.stock,
      unlimitedStock: r.unlimitedStock,
      active: r.active,
      priceDeltaCents: r.priceDeltaCents,
      priceTiers: parseProductPriceTiersJson(r.priceTiersJson),
      pickerBgHex: r.pickerBgHex,
      pickerFgHex: r.pickerFgHex,
      pickerBorderHex: r.pickerBorderHex,
      shippingUnits: r.shippingUnits,
    })),
  };
  const [recommendations, kit] = await Promise.all([
    getProductRecommendationsForAdmin(product.id),
    getProductKitAdmin(product.id),
  ]);
  return { initial, media, recommendations, kit };
}
