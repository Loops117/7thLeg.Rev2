"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { EventKind } from "@/generated/prisma/client";
import { cartOwnerWhere, isGuestCheckoutEnabled, requireCartOwner } from "@/lib/cart-owner";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { pricingScopeKeyFromTimedSaleEventId } from "@/lib/checkout-cart-pricing";
import { prisma } from "@/lib/prisma";
import { reconcileCartShippingSelection } from "@/lib/shipping-options-public";
import { isShippingOptionEligibleForOwner } from "@/lib/shipping-eligibility";
import { getOrCreateCart } from "@/lib/store-cart";
import { productAppearsInStock, variantIsPurchasable } from "@/lib/product-stock";

export type CartActionResult = { ok: true } | { ok: false; error: string };

export async function addToCartAction(input: {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** When adding from a TIMED event page / ?event= URL, persists sale pricing rules on this cart row. */
  timedSaleEventId?: string | null;
}): Promise<CartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  const owner = ownerResult.owner;

  const qty = Math.min(99, Math.max(1, Math.floor(input.quantity || 1)));

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { variants: true },
  });
  if (!product || !product.active) {
    return { ok: false, error: "Product not available." };
  }
  if (product.variants.length === 0 && !productAppearsInStock(product)) {
    return { ok: false, error: "This product is out of stock." };
  }

  let variantId: string | null = input.variantId;
  if (product.variants.length === 0) {
    variantId = null;
  } else if (product.variants.length === 1) {
    const v0 = product.variants[0];
    variantId = v0.id;
    if (!variantIsPurchasable(v0)) {
      return { ok: false, error: "That option is unavailable or out of stock." };
    }
  } else {
    if (!variantId || !product.variants.some((v) => v.id === variantId)) {
      return { ok: false, error: "Choose a variant." };
    }
    const v = product.variants.find((x) => x.id === variantId)!;
    if (!variantIsPurchasable(v)) {
      return { ok: false, error: "That option is unavailable or out of stock." };
    }
  }

  const cart = await getOrCreateCart(owner);

  let timedRef = input.timedSaleEventId?.trim() || null;
  if (timedRef) {
    const ev = await prisma.event.findUnique({ where: { id: timedRef }, select: { id: true, kind: true } });
    if (!ev || ev.kind !== EventKind.TIMED) timedRef = null;
  }
  const pricingScopeKey = pricingScopeKeyFromTimedSaleEventId(timedRef);

  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: product.id,
      variantId: variantId ?? null,
      pricingScopeKey,
    },
  });

  const nextQty = (existing?.quantity ?? 0) + qty;
  const vrec =
    product.variants.length === 0
      ? null
      : variantId
        ? (product.variants.find((v) => v.id === variantId) ?? null)
        : null;

  if (product.variants.length === 0) {
    if (!product.unlimitedQuantity && product.quantity < nextQty) {
      return { ok: false, error: "Not enough stock for this quantity." };
    }
  } else if (vrec && !vrec.unlimitedStock && vrec.stock < nextQty) {
    return { ok: false, error: "Not enough stock for this quantity." };
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: variantId ?? undefined,
        quantity: qty,
        timedSaleEventId: timedRef,
        pricingScopeKey,
      },
    });
  }

  await reconcileCartShippingSelection(owner);

  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

export async function addProductKitToCartAction(input: {
  kitId: string;
  timedSaleEventId?: string | null;
}): Promise<CartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  if (isGuestOwner(ownerResult.owner)) {
    return { ok: false, error: "Sign in to add product kits to your cart." };
  }
  const owner = ownerResult.owner;

  const kit = await prisma.productKit.findUnique({
    where: { id: input.kitId },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }],
        include: {
          product: { include: { variants: true } },
        },
      },
    },
  });
  if (!kit?.enabled || kit.items.length < 2) {
    return { ok: false, error: "This kit is not available." };
  }

  let timedRef = input.timedSaleEventId?.trim() || null;
  if (timedRef) {
    const ev = await prisma.event.findUnique({ where: { id: timedRef }, select: { id: true, kind: true } });
    if (!ev || ev.kind !== EventKind.TIMED) timedRef = null;
  }
  const pricingScopeKey = pricingScopeKeyFromTimedSaleEventId(timedRef);
  const instanceId = randomUUID();

  const cart = await getOrCreateCart(owner);

  for (const row of kit.items) {
    const product = row.product;
    if (!product.active) {
      return { ok: false, error: `${product.name} is no longer available.` };
    }

    let variantId: string | null = row.variantId;
    if (product.variants.length === 0) {
      variantId = null;
      if (!productAppearsInStock(product)) {
        return { ok: false, error: `${product.name} is out of stock.` };
      }
    } else {
      if (!variantId || !product.variants.some((v) => v.id === variantId)) {
        return { ok: false, error: `Kit configuration is invalid for ${product.name}.` };
      }
      const v = product.variants.find((x) => x.id === variantId)!;
      if (!variantIsPurchasable(v)) {
        return { ok: false, error: `${product.name} (${v.label}) is out of stock.` };
      }
    }

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
        variantId: variantId ?? null,
        pricingScopeKey,
        productKitInstanceId: instanceId,
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + 1 },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId: variantId ?? undefined,
          quantity: 1,
          timedSaleEventId: timedRef,
          pricingScopeKey,
          productKitInstanceId: instanceId,
          productKitId: kit.id,
        },
      });
    }
  }

  await reconcileCartShippingSelection(owner);
  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

export async function setCartItemQuantityAction(lineId: string, quantity: number): Promise<CartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  const owner = ownerResult.owner;

  const qty = Math.min(99, Math.max(0, Math.floor(quantity)));
  const line = await prisma.cartItem.findFirst({
    where: { id: lineId, cart: cartOwnerWhere(owner) },
  });
  if (!line) return { ok: false, error: "Line not found." };

  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: lineId } });
    const remaining = await prisma.cartItem.count({ where: { cart: cartOwnerWhere(owner) } });
    if (remaining === 0) {
      await prisma.cart.update({
        where: cartOwnerWhere(owner),
        data: { appliedLoyaltyPoints: 0 },
      });
    }
  } else {
    const lineFull = await prisma.cartItem.findFirst({
      where: { id: lineId, cart: cartOwnerWhere(owner) },
      include: { product: { include: { variants: true } } },
    });
    if (!lineFull) return { ok: false, error: "Line not found." };
    const p = lineFull.product;
    const vid = lineFull.variantId;
    const vrec =
      p.variants.length === 0 ? null : vid ? (p.variants.find((v) => v.id === vid) ?? null) : null;
    if (p.variants.length === 0) {
      if (!p.unlimitedQuantity && p.quantity < qty) {
        return { ok: false, error: "Not enough stock for this quantity." };
      }
    } else if (vrec && !vrec.unlimitedStock && vrec.stock < qty) {
      return { ok: false, error: "Not enough stock for this quantity." };
    }
    await prisma.cartItem.update({ where: { id: lineId }, data: { quantity: qty } });
  }

  await reconcileCartShippingSelection(owner);

  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

export async function removeCartLineAction(lineId: string): Promise<CartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  const owner = ownerResult.owner;

  const line = await prisma.cartItem.findFirst({
    where: { id: lineId, cart: cartOwnerWhere(owner) },
  });
  if (!line) return { ok: false, error: "Line not found." };

  await prisma.cartItem.delete({ where: { id: lineId } });
  const remaining = await prisma.cartItem.count({ where: { cart: cartOwnerWhere(owner) } });
  if (remaining === 0) {
    await prisma.cart.update({
      where: cartOwnerWhere(owner),
      data: { appliedLoyaltyPoints: 0 },
    });
  }
  await reconcileCartShippingSelection(owner);

  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

export async function setCartShippingOptionAction(shippingOptionId: string): Promise<CartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  const owner = ownerResult.owner;

  const id = shippingOptionId.trim();
  if (!id) return { ok: false, error: "Invalid shipping option." };

  const eligible = await isShippingOptionEligibleForOwner(owner, id);
  if (!eligible) {
    return { ok: false, error: "That shipping option doesn’t fit this cart." };
  }

  await getOrCreateCart(owner);
  await prisma.cart.update({
    where: cartOwnerWhere(owner),
    data: { selectedShippingOptionId: id },
  });

  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

export async function setCartAppliedLoyaltyPointsAction(points: number): Promise<CartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  if (isGuestOwner(ownerResult.owner)) {
    return { ok: false, error: "Sign in to redeem loyalty points." };
  }
  const owner = ownerResult.owner;

  const n = Math.max(0, Math.min(10_000_000, Math.floor(Number(points) || 0)));
  await getOrCreateCart(owner);
  await prisma.cart.update({
    where: cartOwnerWhere(owner),
    data: { appliedLoyaltyPoints: n },
  });

  revalidatePath("/cart");
  revalidatePath("/");
  return { ok: true };
}

/** Whether anonymous shoppers can use the cart without signing in. */
export async function getGuestCheckoutEnabledAction(): Promise<boolean> {
  return isGuestCheckoutEnabled();
}
