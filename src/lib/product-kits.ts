import { storefrontDisplayImageUrl } from "@/lib/product-images-public";
import { MIN_PRODUCT_KIT_ITEMS, orderKitItemsWithHostFirst } from "@/lib/product-kits-shared";
import { unitCentsForVariantQuantity } from "@/lib/product-price-tiers";
import { productAppearsInStock, variantIsPurchasable } from "@/lib/product-stock";
import { getEventPriceOverlayForProduct } from "@/lib/products-storefront";
import { prisma } from "@/lib/prisma";

export type ProductKitItemInput = {
  productId: string;
  variantId: string | null;
};

export type StorefrontKitLine = {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string | null;
  variantLabel: string | null;
  unitPriceCents: number;
  imageUrl: string;
  inStock: boolean;
};

export type StorefrontProductKit = {
  id: string;
  hostProductId: string;
  label: string;
  discountCents: number;
  items: StorefrontKitLine[];
  listTotalCents: number;
  kitPriceCents: number;
};

export async function getProductKitAdmin(hostProductId: string) {
  const kit = await prisma.productKit.findUnique({
    where: { hostProductId },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          product: { select: { id: true, name: true, slug: true, active: true } },
          variant: { select: { id: true, label: true, active: true } },
        },
      },
    },
  });
  if (!kit) {
    return {
      enabled: false,
      label: "Kit deal",
      discountCents: 0,
      items: [] as {
        productId: string;
        productName: string;
        productSlug: string;
        variantId: string | null;
        variantLabel: string | null;
      }[],
    };
  }
  return {
    enabled: kit.enabled,
    label: kit.label,
    discountCents: kit.discountCents,
    items: orderKitItemsWithHostFirst(
      hostProductId,
      kit.items.map((row) => ({
        productId: row.productId,
        productName: row.product.name,
        productSlug: row.product.slug,
        variantId: row.variantId,
        variantLabel: row.variant?.label ?? null,
      })),
    ),
  };
}

async function unitPriceForKitItem(
  product: {
    id: string;
    basePriceCents: number;
    onSale: boolean;
    unlimitedQuantity: boolean;
    quantity: number;
    variants: {
      id: string;
      label: string;
      stock: number;
      unlimitedStock: boolean;
      active: boolean;
      priceDeltaCents: number;
      priceTiersJson: unknown;
    }[];
    types: { typeId: string }[];
  },
  variantId: string | null,
  timedSaleEventId: string | null,
): Promise<{ unitPriceCents: number; variantLabel: string | null; inStock: boolean }> {
  const variants = product.variants;
  let variantLabel: string | null = null;
  let inStock = productAppearsInStock(product);

  let fallbackUnit = product.basePriceCents;
  if (variants.length === 0) {
    fallbackUnit = product.basePriceCents;
  } else if (variantId) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) return { unitPriceCents: 0, variantLabel: null, inStock: false };
    variantLabel = v.label;
    fallbackUnit = product.basePriceCents + v.priceDeltaCents;
    inStock = variantIsPurchasable(v);
  } else if (variants.length === 1) {
    const v = variants[0]!;
    variantLabel = v.label;
    fallbackUnit = product.basePriceCents + v.priceDeltaCents;
    inStock = variantIsPurchasable(v);
  }

  const vrec = variantId ? variants.find((x) => x.id === variantId) ?? null : variants.length === 1 ? variants[0]! : null;
  let unit = unitCentsForVariantQuantity(
    variants.length === 0 ? null : vrec?.priceTiersJson,
    fallbackUnit,
    1,
  );

  if (timedSaleEventId) {
    const overlay = await getEventPriceOverlayForProduct(
      timedSaleEventId,
      product.id,
      unit,
      product.onSale,
    );
    if (overlay) unit = overlay.displayPriceCents;
  }

  return { unitPriceCents: unit, variantLabel, inStock };
}

export async function getProductKitForStorefront(
  hostProductId: string,
  timedSaleEventId: string | null = null,
): Promise<StorefrontProductKit | null> {
  const kit = await prisma.productKit.findUnique({
    where: { hostProductId },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePriceCents: true,
              onSale: true,
              active: true,
              quantity: true,
              unlimitedQuantity: true,
              images: {
                orderBy: { sortOrder: "asc" },
                take: 8,
                select: { url: true, watermarkedUrl: true, useWatermarkedPublic: true, variantId: true },
              },
              variants: {
                orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
                select: {
                  id: true,
                  label: true,
                  stock: true,
                  unlimitedStock: true,
                  active: true,
                  priceDeltaCents: true,
                  priceTiersJson: true,
                },
              },
              types: { select: { typeId: true } },
            },
          },
          variant: { select: { id: true, label: true } },
        },
      },
    },
  });

  if (!kit?.enabled || kit.items.length < MIN_PRODUCT_KIT_ITEMS) return null;

  const kitItemRows = orderKitItemsWithHostFirst(hostProductId, kit.items);

  const lines: StorefrontKitLine[] = [];
  let listTotalCents = 0;
  let allInStock = true;

  for (const row of kitItemRows) {
    const p = row.product;
    if (!p.active) return null;

    const priced = await unitPriceForKitItem(p, row.variantId, timedSaleEventId);
    if (!priced.inStock) allInStock = false;

    listTotalCents += priced.unitPriceCents;
    lines.push({
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      variantId: row.variantId,
      variantLabel: priced.variantLabel ?? row.variant?.label ?? null,
      unitPriceCents: priced.unitPriceCents,
      imageUrl: storefrontDisplayImageUrl(p.images, row.variantId),
      inStock: priced.inStock,
    });
  }

  const discountCents = Math.min(Math.max(0, kit.discountCents), Math.max(0, listTotalCents - 1));
  const kitPriceCents = Math.max(0, listTotalCents - discountCents);

  return {
    id: kit.id,
    hostProductId,
    label: kit.label.trim() || "Kit deal",
    discountCents,
    items: lines,
    listTotalCents,
    kitPriceCents,
    ...(allInStock ? {} : {}),
  };
}

export type KitDiscountResult = {
  kitDiscountCents: number;
  /** instanceId → discount applied */
  instances: { instanceId: string; kitId: string; label: string; discountCents: number }[];
};

type CartItemKitRef = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  productKitInstanceId: string | null;
  productKitId: string | null;
};

/** Sum kit bundle discounts for complete kit instances in the cart. */
export async function computeKitDiscountForCartItems(
  cartItems: CartItemKitRef[],
): Promise<KitDiscountResult> {
  const instanceIds = [
    ...new Set(
      cartItems.map((i) => i.productKitInstanceId).filter((x): x is string => Boolean(x?.trim())),
    ),
  ];
  if (instanceIds.length === 0) {
    return { kitDiscountCents: 0, instances: [] };
  }

  const kits = await prisma.productKit.findMany({
    where: { id: { in: [...new Set(cartItems.map((i) => i.productKitId).filter(Boolean) as string[])] } },
    include: {
      items: { select: { productId: true, variantId: true } },
    },
  });
  const kitById = new Map(kits.map((k) => [k.id, k]));

  const instances: KitDiscountResult["instances"] = [];
  let kitDiscountCents = 0;

  for (const instanceId of instanceIds) {
    const lines = cartItems.filter((i) => i.productKitInstanceId === instanceId);
    const kitId = lines[0]?.productKitId;
    if (!kitId) continue;
    const kit = kitById.get(kitId);
    if (!kit?.enabled || kit.items.length < MIN_PRODUCT_KIT_ITEMS) continue;

    const required = kit.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
    }));

    const complete = required.every((req) =>
      lines.some(
        (line) =>
          line.productId === req.productId &&
          (line.variantId ?? null) === (req.variantId ?? null) &&
          line.quantity >= 1,
      ),
    );

    if (!complete) continue;

    const discount = Math.max(0, kit.discountCents);
    kitDiscountCents += discount;
    instances.push({
      instanceId,
      kitId: kit.id,
      label: kit.label,
      discountCents: discount,
    });
  }

  return { kitDiscountCents, instances };
}

export async function syncProductKit(
  hostProductId: string,
  input: {
    enabled: boolean;
    label: string;
    discountCents: number;
    items: ProductKitItemInput[];
  },
): Promise<void> {
  const label = input.label.trim() || "Kit deal";
  const discountCents = Math.max(0, Math.floor(input.discountCents || 0));

  const normalized: ProductKitItemInput[] = [];
  const seen = new Set<string>();
  for (const row of input.items) {
    const key = `${row.productId}:${row.variantId ?? ""}`;
    if (!row.productId || seen.has(key)) continue;
    seen.add(key);
    normalized.push({ productId: row.productId, variantId: row.variantId });
    if (normalized.length >= 12) break;
  }

  if (!input.enabled || normalized.length < MIN_PRODUCT_KIT_ITEMS) {
    await prisma.productKit.deleteMany({ where: { hostProductId } });
    return;
  }

  const productIds = [...new Set(normalized.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: { select: { id: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const validItems: ProductKitItemInput[] = [];
  for (const row of normalized) {
    const p = productById.get(row.productId);
    if (!p) continue;
    if (p.variants.length === 0) {
      validItems.push({ productId: row.productId, variantId: null });
    } else if (row.variantId && p.variants.some((v) => v.id === row.variantId)) {
      validItems.push({ productId: row.productId, variantId: row.variantId });
    }
  }

  const orderedItems = orderKitItemsWithHostFirst(hostProductId, validItems);

  if (orderedItems.length < MIN_PRODUCT_KIT_ITEMS) {
    await prisma.productKit.deleteMany({ where: { hostProductId } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const kit = await tx.productKit.upsert({
      where: { hostProductId },
      create: { hostProductId, label, discountCents, enabled: true },
      update: { label, discountCents, enabled: true },
    });
    await tx.productKitItem.deleteMany({ where: { kitId: kit.id } });
    for (let i = 0; i < orderedItems.length; i++) {
      const item = orderedItems[i]!;
      await tx.productKitItem.create({
        data: {
          kitId: kit.id,
          productId: item.productId,
          variantId: item.variantId,
          sortOrder: i,
        },
      });
    }
  });
}
