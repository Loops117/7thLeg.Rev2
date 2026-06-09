"use server";

import { revalidatePath } from "next/cache";
import { EventKind } from "@/generated/prisma/client";
import { cartOwnerWhere, requireCartOwner } from "@/lib/cart-owner";
import { isEventActive } from "@/lib/event-pricing";
import { prisma } from "@/lib/prisma";
import { priceCartMerchandiseForOwner } from "@/lib/checkout-cart-pricing";
import { priceLabelCartForCustomer } from "@/lib/label-cart-event-pricing";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { getOrCreateCart } from "@/lib/store-cart";

function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export type CouponCartActionResult =
  | { ok: true; normalizedCode: string; discountCents: number }
  | { ok: false; error: string };

/** Apply checkout coupon stored on Cart (pricing runs in checkout + cart display). */
export async function applyCartCouponAction(codeRaw: string): Promise<CouponCartActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  const owner = ownerResult.owner;

  const code = normalizeCouponCode(codeRaw);
  if (code.length < 2) return { ok: false, error: "Enter a valid promo code." };

  const ev = await prisma.event.findFirst({
    where: {
      kind: EventKind.COUPON,
      couponCode: { equals: code, mode: "insensitive" },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      saleDiscountMode: true,
      couponCode: true,
    },
  });
  if (!ev) return { ok: false, error: "That code wasn’t recognized." };
  if (!isEventActive(ev.startAt, ev.endAt)) return { ok: false, error: "This promo code isn’t active right now." };
  if (ev.saleDiscountMode === "NONE") return { ok: false, error: "This promo code has no discount configured." };

  await getOrCreateCart(owner);

  await prisma.cart.update({
    where: cartOwnerWhere(owner),
    data: { appliedCouponEventId: ev.id },
  });

  const [priced, labelPricing] = await Promise.all([
    priceCartMerchandiseForOwner(owner),
    isGuestOwner(owner)
      ? Promise.resolve({ couponDiscountCents: 0 })
      : priceLabelCartForCustomer(owner.customerId),
  ]);
  const discountCents =
    (priced.ok ? priced.couponDiscountCents : 0) + labelPricing.couponDiscountCents;

  revalidatePath("/cart");
  return { ok: true, normalizedCode: ev.couponCode.trim(), discountCents };
}

export async function clearCartCouponAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };
  await prisma.cart.updateMany({
    where: cartOwnerWhere(ownerResult.owner),
    data: { appliedCouponEventId: null },
  });
  revalidatePath("/cart");
  return { ok: true };
}
