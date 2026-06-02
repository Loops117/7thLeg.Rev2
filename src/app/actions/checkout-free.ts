"use server";

import { revalidatePath } from "next/cache";
import { auth as readAuthSession } from "@/auth";
import { createFreshPendingCheckoutOrder } from "@/lib/checkout-create-pending-order";
import { fulfillPaidOrder } from "@/lib/fulfill-paid-order";
import { prisma } from "@/lib/prisma";

export type CompleteFreeCheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/** Completes a $0 order without Stripe/Square — marks paid and clears the cart. */
export async function completeFreeCheckoutAction(): Promise<CompleteFreeCheckoutResult> {
  const session = await readAuthSession();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { ok: false, error: "Sign in to check out." };
  }
  const customerId = session.user.id;

  const created = await createFreshPendingCheckoutOrder(customerId);
  if (!created.ok) return created;

  const order = await prisma.order.findUnique({
    where: { id: created.orderId },
    select: { id: true, totalCents: true, customerId: true },
  });
  if (!order || order.customerId !== customerId) {
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

  return { ok: true, redirectUrl: `/cart/success?order=${order.id}` };
}
