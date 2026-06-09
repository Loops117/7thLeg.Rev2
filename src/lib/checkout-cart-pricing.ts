import { EventKind, EventSaleDiscountMode } from "@/generated/prisma/client";
import { cartOwnerWhere, ownerFromCustomerId, type CartOwner } from "@/lib/cart-owner";
import { prisma } from "@/lib/prisma";
import { normalizeVariantSku } from "@/lib/variant-sku";
import { effectiveEventSalePriceCents, isEventActive } from "@/lib/event-pricing";
import { unitCentsForVariantQuantity } from "@/lib/product-price-tiers";
import { productAppearsInStock, variantIsPurchasable } from "@/lib/product-stock";
import { productInEventLinkedCatalog } from "@/lib/event-catalog-scope";
import { computeKitDiscountForCartItems } from "@/lib/product-kits";
import { storefrontDisplayImageUrl } from "@/lib/product-images-public";
import { loadProductTypeIndex } from "@/lib/product-type-tree";

export const CART_PRICING_SCOPE_NONE = "__none__" as const;

export function pricingScopeKeyFromTimedSaleEventId(timedSaleEventId: string | null | undefined): string {
  const t = timedSaleEventId?.trim();
  return t ? t : CART_PRICING_SCOPE_NONE;
}

const timedEventInclude = {
  id: true,
  kind: true,
  startAt: true,
  endAt: true,
  saleDiscountMode: true,
  saleDiscountPercent: true,
  saleDiscountCents: true,
  typeLinks: { select: { typeId: true } },
  productLinks: { select: { productId: true } },
} as const;

const couponEventInclude = {
  ...timedEventInclude,
  couponCode: true,
  couponPickerMeansIncluded: true,
  couponPickProducts: { select: { productId: true } },
} as const;

export type PricedCheckoutLineSnapshot = {
  productId: string;
  variantId: string | null;
  productNameSnap: string;
  variantLabelSnap: string | null;
  variantSkuSnap: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type PricedCartForCustomerRow = PricedCheckoutLineSnapshot & {
  cartItemId: string;
  slug: string;
  imageUrl: string | null;
  baseUnitPriceCents: number;
  productKitInstanceId: string | null;
};

export async function priceCartMerchandiseForOwner(owner: CartOwner): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      cartId: string;
      selectedShippingOptionId: string | null;
      pricedLines: PricedCartForCustomerRow[];
      /** Sum of qty × raw base (unit + variant delta) before timed sale / coupon adjustments. */
      merchandiseListSubtotalCents: number;
      /** Sum after timed sale rules where applicable — before checkout coupon. */
      merchandiseBeforeCouponSubtotalCents: number;
      /** Final payable merchandise subtotal. */
      merchandiseSubtotalCents: number;
      couponDiscountCents: number;
      kitDiscountCents: number;
      kitInstances: { instanceId: string; label: string }[];
      checkoutCouponCodeSnap: string;
      appliedCouponEventId: string | null;
      appliedLoyaltyPoints: number;
    }
> {
  const cart = await prisma.cart.findUnique({
    where: cartOwnerWhere(owner),
    select: {
      id: true,
      selectedShippingOptionId: true,
      appliedCouponEventId: true,
      appliedLoyaltyPoints: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true,
          timedSaleEventId: true,
          productKitInstanceId: true,
          productKitId: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePriceCents: true,
              active: true,
              quantity: true,
              unlimitedQuantity: true,
              images: {
                orderBy: { sortOrder: "asc" },
                select: {
                  url: true,
                  watermarkedUrl: true,
                  useWatermarkedPublic: true,
                  variantId: true,
                },
              },
              variants: true,
              types: { select: { typeId: true } },
            },
          },
          variant: true,
        },
      },
    },
  });
  if (!cart?.items.length) return { ok: false, error: "Your cart is empty." };

  const timedIds = [
    ...new Set(
      cart.items.map((i) => i.timedSaleEventId).filter((x): x is string => Boolean(x?.trim())),
    ),
  ];
  const timedEvents =
    timedIds.length > 0
      ? await prisma.event.findMany({
          where: { id: { in: timedIds } },
          select: timedEventInclude,
        })
      : [];
  const timedById = new Map(timedEvents.map((e) => [e.id, e] as const));

  let couponEvent: (typeof timedEvents[number] & {
    couponCode: string;
    couponPickerMeansIncluded: boolean;
    couponPickProducts: { productId: string }[];
  }) | null = null;
  if (cart.appliedCouponEventId?.trim()) {
    couponEvent = await prisma.event.findUnique({
      where: { id: cart.appliedCouponEventId.trim() },
      select: couponEventInclude,
    });
  }

  let couponDiscountCents = 0;
  let checkoutCouponCodeSnap = "";
  let appliedCouponEventId: string | null = cart.appliedCouponEventId?.trim() || null;

  const couponLooksValid =
    couponEvent &&
    couponEvent.kind === EventKind.COUPON &&
    isEventActive(couponEvent.startAt, couponEvent.endAt) &&
    couponEvent.saleDiscountMode !== EventSaleDiscountMode.NONE;

  if (cart.appliedCouponEventId?.trim() && !couponLooksValid) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { appliedCouponEventId: null },
    });
    couponEvent = null;
    appliedCouponEventId = null;
  }

  if (couponLooksValid && couponEvent) {
    checkoutCouponCodeSnap = couponEvent.couponCode.trim();
  }

  const typeIndex = await loadProductTypeIndex();

  const pricedLines: PricedCartForCustomerRow[] = [];
  let merchandiseListSubtotalCents = 0;
  let merchandiseBeforeCouponSubtotalCents = 0;

  for (const line of cart.items) {
    const p = line.product;
    if (!p.active) return { ok: false, error: `${p.name} is no longer available.` };

    const variants = p.variants;
    let variantId: string | null = line.variantId;

    if (variants.length === 0) {
      if (!productAppearsInStock(p)) return { ok: false, error: `${p.name} is out of stock.` };
      variantId = null;
    } else if (variants.length === 1) {
      const v0 = variants[0];
      variantId = v0.id;
      if (!variantIsPurchasable(v0)) return { ok: false, error: `${p.name} is out of stock.` };
    } else {
      const v = line.variant;
      if (!variantId || !v || !variants.some((x) => x.id === variantId)) {
        return { ok: false, error: `Please update your cart: ${p.name} needs a valid option.` };
      }
      if (!variantIsPurchasable(v)) {
        return { ok: false, error: `${p.name} (${v.label}) is out of stock.` };
      }
    }

    const vrec =
      variants.length === 0 ? null : variantId ? (variants.find((x) => x.id === variantId) ?? null) : null;

    const qty = line.quantity;
    const fallbackUnit =
      variants.length === 0 ? p.basePriceCents : p.basePriceCents + (vrec?.priceDeltaCents ?? 0);
    const baseUnitPriceCents = unitCentsForVariantQuantity(
      variants.length === 0 ? null : vrec?.priceTiersJson,
      fallbackUnit,
      qty,
    );
    if (variants.length === 0) {
      if (!p.unlimitedQuantity && p.quantity < qty) {
        return { ok: false, error: `Not enough stock for ${p.name}.` };
      }
    } else if (vrec) {
      if (!vrec.unlimitedStock && vrec.stock < qty) {
        return { ok: false, error: `Not enough stock for ${p.name}.` };
      }
    }

    const productTypeIds = p.types.map((t) => t.typeId);

    const timedEv = line.timedSaleEventId ? timedById.get(line.timedSaleEventId) ?? null : null;
    let unitAfterTimed = baseUnitPriceCents;
    if (timedEv && timedEv.kind === EventKind.TIMED && timedEv.saleDiscountMode !== EventSaleDiscountMode.NONE) {
      if (isEventActive(timedEv.startAt, timedEv.endAt)) {
        const typeIds = typeIndex.expandWithDescendants(timedEv.typeLinks.map((t) => t.typeId));
        const prodIds = timedEv.productLinks.map((x) => x.productId);
        const inTimed = productInEventLinkedCatalog(p.id, productTypeIds, typeIds, prodIds);
        if (inTimed) {
          const { priceCents, showSale } = effectiveEventSalePriceCents(
            baseUnitPriceCents,
            timedEv.saleDiscountMode,
            timedEv.saleDiscountPercent,
            timedEv.saleDiscountCents,
          );
          if (showSale) unitAfterTimed = priceCents;
        }
      }
    }

    let unitFinal = unitAfterTimed;

    if (couponLooksValid && couponEvent && couponEvent.kind === EventKind.COUPON) {
      const typeIds = typeIndex.expandWithDescendants(couponEvent.typeLinks.map((t) => t.typeId));
      const prodIds = couponEvent.productLinks.map((x) => x.productId);
      const inCouponCatalog = productInEventLinkedCatalog(p.id, productTypeIds, typeIds, prodIds);
      const pickIds = new Set(couponEvent.couponPickProducts.map((x) => x.productId));
      const inPicker = pickIds.has(p.id);

      let eligible = false;
      if (inCouponCatalog) {
        if (!couponEvent.couponPickerMeansIncluded) {
          eligible = !inPicker;
        } else {
          eligible = inPicker;
        }
      }

      if (eligible) {
        const { priceCents, showSale } = effectiveEventSalePriceCents(
          unitAfterTimed,
          couponEvent.saleDiscountMode,
          couponEvent.saleDiscountPercent,
          couponEvent.saleDiscountCents,
        );
        if (showSale) unitFinal = priceCents;
      }
    }

    const variantLabelSnap = vrec?.label ?? null;
    const variantSkuSnap = normalizeVariantSku(vrec?.sku ?? line.variant?.sku);

    merchandiseListSubtotalCents += baseUnitPriceCents * qty;
    merchandiseBeforeCouponSubtotalCents += unitAfterTimed * qty;
    couponDiscountCents += Math.max(0, unitAfterTimed - unitFinal) * qty;

    pricedLines.push({
      cartItemId: line.id,
      productId: p.id,
      slug: p.slug,
      imageUrl: storefrontDisplayImageUrl(p.images, variantId),
      variantId,
      productNameSnap: p.name,
      variantLabelSnap,
      variantSkuSnap,
      quantity: qty,
      unitPriceCents: unitFinal,
      lineTotalCents: unitFinal * qty,
      baseUnitPriceCents,
      productKitInstanceId: line.productKitInstanceId,
    });
  }

  const linesSubtotalCents = pricedLines.reduce((s, l) => s + l.lineTotalCents, 0);
  const kitDiscount = await computeKitDiscountForCartItems(
    cart.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      productKitInstanceId: i.productKitInstanceId,
      productKitId: i.productKitId,
    })),
  );
  const kitDiscountCents = Math.min(kitDiscount.kitDiscountCents, linesSubtotalCents);
  const merchandiseSubtotalCents = Math.max(0, linesSubtotalCents - kitDiscountCents);

  return {
    ok: true,
    cartId: cart.id,
    selectedShippingOptionId: cart.selectedShippingOptionId,
    pricedLines,
    merchandiseListSubtotalCents,
    merchandiseBeforeCouponSubtotalCents,
    merchandiseSubtotalCents,
    couponDiscountCents,
    kitDiscountCents,
    kitInstances: kitDiscount.instances.map((i) => ({
      instanceId: i.instanceId,
      label: i.label,
    })),
    checkoutCouponCodeSnap,
    appliedCouponEventId,
    appliedLoyaltyPoints: Math.max(0, Math.floor(Number(cart.appliedLoyaltyPoints) || 0)),
  };
}

export async function priceCartMerchandiseForCustomer(customerId: string) {
  return priceCartMerchandiseForOwner(ownerFromCustomerId(customerId));
}
