"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  parseProductPriceTiersJson,
  priceTiersJsonForDb,
  type ProductPriceTier,
} from "@/lib/product-price-tiers";
import { normalizePaneColorHex } from "@/lib/pane-config";
import { parsePriceToCents } from "@/lib/product-slug";
import {
  parseVariantPriceDisplay,
  type VariantPriceDisplay,
} from "@/lib/product-variant-price-display";
import { hasCustomVariantPickerColors } from "@/lib/variant-picker-style";

const variantOrderBy = [{ sortOrder: "asc" as const }, { label: "asc" as const }];

function normalizePickerHex(input: string | null | undefined): string | null {
  if (input == null || !String(input).trim()) return null;
  return normalizePaneColorHex(String(input).trim());
}

function pickerColorsForDb(input: {
  pickerBgHex?: string | null;
  pickerFgHex?: string | null;
  pickerBorderHex?: string | null;
}): { pickerBgHex: string | null; pickerFgHex: string | null; pickerBorderHex: string | null } {
  const bg = normalizePickerHex(input.pickerBgHex);
  const fg = normalizePickerHex(input.pickerFgHex);
  const border = normalizePickerHex(input.pickerBorderHex);
  if (!bg && !fg && !border) {
    return { pickerBgHex: null, pickerFgHex: null, pickerBorderHex: null };
  }
  if (!hasCustomVariantPickerColors({ pickerBgHex: bg, pickerFgHex: fg, pickerBorderHex: border })) {
    throw new Error("Set background, text, and border colors together, or clear all for default green shades.");
  }
  return { pickerBgHex: bg, pickerFgHex: fg, pickerBorderHex: border };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

export type ProductVariantAdminRow = {
  id: string;
  label: string;
  sortOrder: number;
  stock: number;
  unlimitedStock: boolean;
  active: boolean;
  priceDeltaCents: number;
  priceTiers: ProductPriceTier[] | null;
  pickerBgHex: string | null;
  pickerFgHex: string | null;
  pickerBorderHex: string | null;
};

async function revalidateProduct(productId: string) {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!p) return;
  revalidatePath("/settings/products", "page");
  revalidatePath(`/settings/products/${productId}/edit`);
  revalidatePath(`/product/${p.slug}`);
  revalidatePath("/store");
}

export async function listProductVariantsForAdmin(productId: string): Promise<ProductVariantAdminRow[]> {
  await requireAdmin();
  const rows = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: variantOrderBy,
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
    },
  });
  return rows.map((r) => ({
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
  }));
}

export async function createProductVariant(productId: string, label: string) {
  await requireAdmin();
  const l = label.trim();
  if (!l) throw new Error("Label is required");
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new Error("Product not found");
  const maxSort = await prisma.productVariant.aggregate({
    where: { productId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  await prisma.productVariant.create({
    data: {
      productId,
      label: l,
      sortOrder,
      stock: 0,
      priceDeltaCents: 0,
      unlimitedStock: false,
      active: true,
    },
  });
  await revalidateProduct(productId);
}

export async function setProductVariantPriceDisplay(
  productId: string,
  display: VariantPriceDisplay,
): Promise<void> {
  await requireAdmin();
  const mode = parseVariantPriceDisplay(display);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new Error("Product not found");
  await prisma.product.update({
    where: { id: productId },
    data: { variantPriceDisplay: mode },
  });
  await revalidateProduct(productId);
}

export async function moveProductVariant(productId: string, variantId: string, direction: "up" | "down") {
  await requireAdmin();
  const rows = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: variantOrderBy,
    select: { id: true, sortOrder: true },
  });
  const idx = rows.findIndex((r) => r.id === variantId);
  if (idx < 0) throw new Error("Variation not found");
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return;

  const a = rows[idx]!;
  const b = rows[swapIdx]!;
  await prisma.$transaction([
    prisma.productVariant.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.productVariant.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  await revalidateProduct(productId);
}

export async function updateProductVariant(
  variantId: string,
  patch: Partial<Pick<ProductVariantAdminRow, "label" | "stock" | "unlimitedStock" | "active" | "priceDeltaCents">>,
) {
  await requireAdmin();
  const v = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true },
  });
  if (!v) throw new Error("Variant not found");

  const data: {
    label?: string;
    stock?: number;
    unlimitedStock?: boolean;
    active?: boolean;
    priceDeltaCents?: number;
  } = {};

  if (patch.label !== undefined) {
    const l = patch.label.trim();
    if (!l) throw new Error("Label is required");
    data.label = l;
  }
  if (patch.stock !== undefined) {
    data.stock = Math.max(0, Math.floor(Number(patch.stock) || 0));
  }
  if (patch.unlimitedStock !== undefined) data.unlimitedStock = !!patch.unlimitedStock;
  if (patch.active !== undefined) data.active = !!patch.active;
  if (patch.priceDeltaCents !== undefined) {
    data.priceDeltaCents = Math.floor(Number(patch.priceDeltaCents) || 0);
  }

  if (Object.keys(data).length === 0) return;

  await prisma.productVariant.update({
    where: { id: variantId },
    data,
  });
  await revalidateProduct(v.productId);
}

export async function deleteProductVariant(variantId: string) {
  await requireAdmin();
  const v = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true },
  });
  if (!v) return;
  const count = await prisma.productVariant.count({ where: { productId: v.productId } });
  if (count <= 1) {
    throw new Error("Every product needs at least one variation. Add another before removing this one.");
  }
  await prisma.productVariant.delete({ where: { id: variantId } });
  await revalidateProduct(v.productId);
}

/** One table row: list price (USD), stock, bulk tiers, etc. */
export async function saveProductVariantRow(input: {
  productId: string;
  variantId: string;
  label: string;
  listPriceUsd: string;
  stock: number;
  unlimitedStock: boolean;
  active: boolean;
  priceTiers?: ProductPriceTier[] | null;
  pickerBgHex?: string | null;
  pickerFgHex?: string | null;
  pickerBorderHex?: string | null;
}): Promise<void> {
  await requireAdmin();
  const listCents = parsePriceToCents(input.listPriceUsd);
  if (listCents === null) {
    throw new Error("Enter a valid list price (e.g. 12.99).");
  }
  const label = input.label.trim();
  if (!label) throw new Error("Label is required.");

  let tiersJson;
  try {
    tiersJson = priceTiersJsonForDb(input.priceTiers);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Invalid bulk pricing tiers.");
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, basePriceCents: true },
  });
  if (!product) throw new Error("Product not found");

  const v = await prisma.productVariant.findFirst({
    where: { id: input.variantId, productId: input.productId },
  });
  if (!v) throw new Error("Variation not found");

  const n = await prisma.productVariant.count({ where: { productId: input.productId } });
  const stock = input.unlimitedStock ? 0 : Math.max(0, Math.floor(Number(input.stock) || 0));
  const picker = pickerColorsForDb(input);

  if (n === 1) {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { basePriceCents: listCents, quantity: 0, unlimitedQuantity: false },
      }),
      prisma.productVariant.update({
        where: { id: input.variantId },
        data: {
          label,
          priceDeltaCents: 0,
          stock,
          unlimitedStock: input.unlimitedStock,
          active: input.active,
          priceTiersJson: tiersJson,
          ...picker,
        },
      }),
    ]);
  } else {
    const delta = listCents - product.basePriceCents;
    await prisma.productVariant.update({
      where: { id: input.variantId },
      data: {
        label,
        priceDeltaCents: delta,
        stock,
        unlimitedStock: input.unlimitedStock,
        active: input.active,
        priceTiersJson: tiersJson,
        ...picker,
      },
    });
  }
  await revalidateProduct(input.productId);
}
