"use server";

import { revalidatePath } from "next/cache";
import type { ProductMediaAdmin } from "@/app/actions/product-images-admin";
import { auth } from "@/auth";
import type { ProductEditInitial } from "@/lib/products-admin-types";
import { parseProductPriceTiersJson } from "@/lib/product-price-tiers";
import { loadProductTypeIndex } from "@/lib/product-type-tree";
import { prisma } from "@/lib/prisma";
import { parseVariantPriceDisplay } from "@/lib/product-variant-price-display";
import { parsePriceToCents, slugifyProductName } from "@/lib/product-slug";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

/** Products should be tagged with leaf types only; non-leaves are dropped. */
async function validLeafTypeIds(typeIds: string[]): Promise<string[]> {
  if (typeIds.length === 0) return [];
  const index = await loadProductTypeIndex();
  const found = await prisma.productType.findMany({
    where: { id: { in: typeIds } },
    select: { id: true },
  });
  return found.map((t) => t.id).filter((id) => index.isLeaf(id));
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  for (;;) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export type CreateProductInput = {
  name: string;
  slug?: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  quantity: number;
  unlimitedQuantity: boolean;
  active: boolean;
  featured: boolean;
  onSale: boolean;
  saleEndsAt?: string;
  typeIds: string[];
  /** Extra automatic footers attached to this product (in addition to type defaults). */
  footerIds: string[];
  variantPriceDisplay?: "full" | "difference";
  excludedShippingOptionIds?: string[];
};

export type CreateProductResult =
  | { ok: true; slug: string; id: string }
  | { ok: false; error: string };

export async function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  const basePriceCents = parsePriceToCents(input.basePrice);
  if (basePriceCents === null) {
    return { ok: false, error: "Enter a valid price (e.g. 12.99)." };
  }

  const quantity = input.unlimitedQuantity
    ? 0
    : Number.isFinite(input.quantity)
      ? Math.max(0, Math.floor(input.quantity))
      : 0;

  const slugBase = input.slug?.trim()
    ? slugifyProductName(input.slug.trim())
    : slugifyProductName(name);
  if (!slugBase) {
    return { ok: false, error: "Could not build a URL slug — add a name or slug." };
  }
  const slug = await uniqueSlug(slugBase);

  let saleEndsAt: Date | null = null;
  if (input.onSale && input.saleEndsAt?.trim()) {
    const d = new Date(input.saleEndsAt);
    if (!Number.isNaN(d.getTime())) saleEndsAt = d;
  }

  const typeIds = Array.isArray(input.typeIds) ? [...new Set(input.typeIds.filter(Boolean))] : [];
  const validTypeIds = await validLeafTypeIds(typeIds);

  const footerIds = Array.isArray(input.footerIds) ? [...new Set(input.footerIds.filter(Boolean))] : [];
  let validFooterIds: string[] = [];
  if (footerIds.length > 0) {
    const found = await prisma.automaticFooter.findMany({
      where: { id: { in: footerIds } },
      select: { id: true },
    });
    validFooterIds = found.map((f) => f.id);
  }

  const excludedIds = Array.isArray(input.excludedShippingOptionIds)
    ? [...new Set(input.excludedShippingOptionIds.filter(Boolean))]
    : [];
  let validExcludedShippingOptionIds: string[] = [];
  if (excludedIds.length > 0) {
    const found = await prisma.shippingOption.findMany({
      where: { id: { in: excludedIds } },
      select: { id: true },
    });
    validExcludedShippingOptionIds = found.map((o) => o.id);
  }

  let newProductId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          slug,
          shortDescription: input.shortDescription?.trim() || null,
          description: input.description?.trim() ?? "",
          basePriceCents,
          /// Inventory lives on the default variation row.
          quantity: 0,
          unlimitedQuantity: false,
          active: input.active !== false,
          featured: !!input.featured,
          onSale: !!input.onSale,
          saleEndsAt,
          variantPriceDisplay: parseVariantPriceDisplay(input.variantPriceDisplay),
        },
      });
      newProductId = product.id;

      await tx.productVariant.create({
        data: {
          productId: product.id,
          label: "Default",
          stock: quantity,
          unlimitedStock: !!input.unlimitedQuantity,
          active: true,
          priceDeltaCents: 0,
        },
      });

      for (const typeId of validTypeIds) {
        await tx.productOnType.create({
          data: { productId: product.id, typeId },
        });
      }

      for (const footerId of validFooterIds) {
        await tx.productOnFooter.create({
          data: { productId: product.id, footerId },
        });
      }

      for (const shippingOptionId of validExcludedShippingOptionIds) {
        await tx.productShippingOptionExclusion.create({
          data: { productId: product.id, shippingOptionId },
        });
      }
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not save product (duplicate slug or database error)." };
  }

  revalidatePath("/store");
  revalidatePath("/settings/products");
  revalidatePath("/cart");
  revalidatePath(`/product/${slug}`);
  return { ok: true, slug, id: newProductId };
}

export type UpdateProductInput = {
  id: string;
  name: string;
  slug?: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  quantity: number;
  unlimitedQuantity: boolean;
  active: boolean;
  featured: boolean;
  onSale: boolean;
  saleEndsAt?: string;
  typeIds: string[];
  footerIds: string[];
  variantPriceDisplay?: "full" | "difference";
  excludedShippingOptionIds?: string[];
};

export type UpdateProductResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function updateProduct(input: UpdateProductInput): Promise<UpdateProductResult> {
  await requireAdmin();

  const existing = await prisma.product.findUnique({
    where: { id: input.id },
    select: { id: true, slug: true, _count: { select: { variants: true } } },
  });
  if (!existing) {
    return { ok: false, error: "Product not found." };
  }
  const hasVariants = existing._count.variants > 0;

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  let basePriceCents: number | null = null;
  let quantity: number = 0;
  if (!hasVariants) {
    basePriceCents = parsePriceToCents(input.basePrice);
    if (basePriceCents === null) {
      return { ok: false, error: "Enter a valid price (e.g. 12.99)." };
    }
    quantity = input.unlimitedQuantity
      ? 0
      : Number.isFinite(input.quantity)
        ? Math.max(0, Math.floor(input.quantity))
        : 0;
  }

  let slug = existing.slug;
  if (input.slug?.trim()) {
    const want = slugifyProductName(input.slug.trim());
    if (want && want !== existing.slug) {
      slug = await uniqueSlug(want);
    }
  }

  let saleEndsAt: Date | null = null;
  if (input.onSale && input.saleEndsAt?.trim()) {
    const d = new Date(input.saleEndsAt);
    if (!Number.isNaN(d.getTime())) saleEndsAt = d;
  }

  const typeIds = Array.isArray(input.typeIds) ? [...new Set(input.typeIds.filter(Boolean))] : [];
  const validTypeIds = await validLeafTypeIds(typeIds);

  const footerIds = Array.isArray(input.footerIds) ? [...new Set(input.footerIds.filter(Boolean))] : [];
  let validFooterIds: string[] = [];
  if (footerIds.length > 0) {
    const found = await prisma.automaticFooter.findMany({
      where: { id: { in: footerIds } },
      select: { id: true },
    });
    validFooterIds = found.map((f) => f.id);
  }

  const excludedIds = Array.isArray(input.excludedShippingOptionIds)
    ? [...new Set(input.excludedShippingOptionIds.filter(Boolean))]
    : [];
  let validExcludedShippingOptionIds: string[] = [];
  if (excludedIds.length > 0) {
    const found = await prisma.shippingOption.findMany({
      where: { id: { in: excludedIds } },
      select: { id: true },
    });
    validExcludedShippingOptionIds = found.map((o) => o.id);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: input.id },
        data: {
          name,
          slug,
          shortDescription: input.shortDescription?.trim() || null,
          description: input.description?.trim() ?? "",
          ...(hasVariants
            ? {}
            : {
                basePriceCents: basePriceCents!,
                quantity,
                unlimitedQuantity: !!input.unlimitedQuantity,
              }),
          active: !!input.active,
          featured: !!input.featured,
          onSale: !!input.onSale,
          saleEndsAt: input.onSale ? saleEndsAt : null,
          ...(input.variantPriceDisplay !== undefined
            ? { variantPriceDisplay: parseVariantPriceDisplay(input.variantPriceDisplay) }
            : {}),
        },
      });

      await tx.productOnType.deleteMany({ where: { productId: input.id } });
      for (const typeId of validTypeIds) {
        await tx.productOnType.create({ data: { productId: input.id, typeId } });
      }

      await tx.productOnFooter.deleteMany({ where: { productId: input.id } });
      for (const footerId of validFooterIds) {
        await tx.productOnFooter.create({ data: { productId: input.id, footerId } });
      }

      await tx.productShippingOptionExclusion.deleteMany({ where: { productId: input.id } });
      for (const shippingOptionId of validExcludedShippingOptionIds) {
        await tx.productShippingOptionExclusion.create({
          data: { productId: input.id, shippingOptionId },
        });
      }
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not update product." };
  }

  revalidatePath("/store");
  revalidatePath("/settings/products");
  revalidatePath("/cart");
  revalidatePath(`/settings/products/${input.id}/edit`);
  revalidatePath(`/product/${existing.slug}`);
  if (slug !== existing.slug) {
    revalidatePath(`/product/${slug}`);
  }
  return { ok: true, slug };
}

export async function quickRestockProduct(productId: string, delta: number) {
  await requireAdmin();
  const d = Math.floor(Number(delta));
  if (!Number.isFinite(d) || d === 0) return;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  });
  if (!product) return;

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, stock: true, unlimitedStock: true },
  });

  if (variants.length === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { quantity: { increment: d } },
    });
  } else {
    const target = variants[0]!;
    if (target.unlimitedStock) return;
    await prisma.productVariant.update({
      where: { id: target.id },
      data: { stock: { increment: d } },
    });
  }

  revalidatePath("/store");
  revalidatePath("/settings/products");
  revalidatePath(`/product/${product.slug}`);
}

export async function setProductActive(productId: string, active: boolean) {
  await requireAdmin();
  await prisma.product.update({
    where: { id: productId },
    data: { active: !!active },
  });
  revalidatePath("/store");
  revalidatePath("/settings/products");
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (p) revalidatePath(`/product/${p.slug}`);
}

export type DeleteProductResult = { ok: true } | { ok: false; error: string };

/** Hard delete. Blocked if any order line references the product (DB RESTRICT). */
export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
  try {
    await requireAdmin();
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, slug: true } });
    if (!p) {
      return { ok: false, error: "Product not found." };
    }
    const lineCount = await prisma.orderLineItem.count({ where: { productId } });
    if (lineCount > 0) {
      return {
        ok: false,
        error:
          "This product is on one or more orders. Remove it from the catalog by deactivating it instead, or contact support to archive orders first.",
      };
    }
    await prisma.product.delete({ where: { id: p.id } });
    revalidatePath("/store");
    revalidatePath("/settings/products");
    revalidatePath(`/product/${p.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("deleteProduct", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete product." };
  }
}

export type ProductCatalogEditPayload = {
  initial: ProductEditInitial;
  media: ProductMediaAdmin;
};

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
  return { initial, media };
}
