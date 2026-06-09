"use server";

import { revalidatePath } from "next/cache";
import { createFreshPendingCheckoutOrder } from "@/lib/checkout-create-pending-order";
import { orderBelongsToOwner } from "@/lib/checkout-order-owner";
import { requireCheckoutSession } from "@/lib/checkout-session";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { fulfillPaidOrder } from "@/lib/fulfill-paid-order";
import { prisma } from "@/lib/prisma";

export type CompleteFreeCheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/** Completes a $0 order without Stripe/Square — marks paid and clears the cart. */
export async function completeFreeCheckoutAction(): Promise<CompleteFreeCheckoutResult> {
  const ctx = await requireCheckoutSession();
  if (!ctx.ok) return ctx;

  const created = await createFreshPendingCheckoutOrder(ctx.owner, {
    shippingContact: ctx.shippingContact,
  });
  if (!created.ok) return created;

  const order = await prisma.order.findUnique({
    where: { id: created.orderId },
    select: { id: true, totalCents: true, customerId: true, guestSessionId: true },
  });
  if (!order || !orderBelongsToOwner(order, ctx.owner)) {
    await prisma.order.delete({ where: { id: created.orderId } }).catch(() => {});
    return { ok: false, error: "Could not verify your order." };
  }

  if (order.totalCents > 0) {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    return { ok: false, error: "This order total is not zero — use card checkout instead." };
  }

  const fulfilled = await fulfillPaidOrder(order.id, {});
  if (!fulfilled) {
    return { ok: false, error: "Could not complete your order. Try again." };
  }

  revalidatePath("/cart");
  revalidatePath("/account");

  const guestQs = isGuestOwner(ctx.owner) ? "&guest=1" : "";
  return { ok: true, redirectUrl: `/cart/success?order=${order.id}${guestQs}` };
}
