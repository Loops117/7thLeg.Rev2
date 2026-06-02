"use server";

import { revalidatePath } from "next/cache";
import { auth as readAuthSession } from "@/auth";
import { EventKind } from "@/generated/prisma/client";
import { isEventActive } from "@/lib/event-pricing";
import { prisma } from "@/lib/prisma";
import { priceCartMerchandiseForCustomer } from "@/lib/checkout-cart-pricing";
import { priceLabelCartForCustomer } from "@/lib/label-cart-event-pricing";
import { getOrCreateCart } from "@/lib/store-cart";

async function customerId(): Promise<string | null> {
  const session = await readAuthSession();
  if (session?.user?.role !== "customer" || !session.user.id) return null;
  return session.user.id;
}

function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export type CouponCartActionResult =
  | { ok: true; normalizedCode: string; discountCents: number }
  | { ok: false; error: string };

/** Apply checkout coupon stored on Cart (pricing runs in checkout + cart display). */
export async function applyCartCouponAction(codeRaw: string): Promise<CouponCartActionResult> {
  const cid = await customerId();
  if (!cid) return { ok: false, error: "Sign in to apply a code." };

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

  await getOrCreateCart(cid);

  await prisma.cart.update({
    where: { customerId: cid },
    data: { appliedCouponEventId: ev.id },
  });

  const [priced, labelPricing] = await Promise.all([
    priceCartMerchandiseForCustomer(cid),
    priceLabelCartForCustomer(cid),
  ]);
  const discountCents =
    (priced.ok ? priced.couponDiscountCents : 0) + labelPricing.couponDiscountCents;

  revalidatePath("/cart");
  return { ok: true, normalizedCode: ev.couponCode.trim(), discountCents };
}

export async function clearCartCouponAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const cid = await customerId();
  if (!cid) return { ok: false, error: "Sign in required." };
  await prisma.cart.updateMany({
    where: { customerId: cid },
    data: { appliedCouponEventId: null },
  });
  revalidatePath("/cart");
  return { ok: true };
}
