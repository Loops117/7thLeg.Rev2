import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { OrderStatus } from "@/generated/prisma/client";
import { snapshotCartLabelsToOrder } from "@/lib/order-label-snapshot";
import { prisma } from "@/lib/prisma";

export type FulfillmentContext = {
  stripeSessionId?: string;
  squarePaymentId?: string;
};

/** Finalize inventory, loyalty, cart after payment — idempotent. */
export async function fulfillPaidOrder(orderId: string, ctx: FulfillmentContext): Promise<boolean> {
  const fulfilled = await prisma.$transaction(async (tx): Promise<boolean> => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        lineItems: { include: { product: true } },
      },
    });

    if (!order) return false;
    if (order.status !== OrderStatus.PENDING) return false;

    if (ctx.stripeSessionId) {
      if (
        order.stripeCheckoutSessionId &&
        order.stripeCheckoutSessionId !== ctx.stripeSessionId
      ) {
        console.warn("Fulfillment: Stripe session mismatch", orderId);
        return false;
      }
    }

    if (ctx.squarePaymentId) {
      if (order.squarePaymentId && order.squarePaymentId !== ctx.squarePaymentId) {
        console.warn("Fulfillment: Square payment mismatch", orderId);
        return false;
      }
    }

    for (const li of order.lineItems) {
      if (li.variantId) {
        const v = await tx.productVariant.findUnique({ where: { id: li.variantId } });
        if (v && !v.unlimitedStock) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: { stock: Math.max(0, v.stock - li.quantity) },
          });
        }
      } else {
        const p = await tx.product.findUnique({ where: { id: li.productId } });
        if (p && !p.unlimitedQuantity) {
          await tx.product.update({
            where: { id: p.id },
            data: { quantity: Math.max(0, p.quantity - li.quantity) },
          });
        }
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        ...(ctx.stripeSessionId
          ? { stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? ctx.stripeSessionId }
          : {}),
        ...(ctx.squarePaymentId ? { squarePaymentId: ctx.squarePaymentId } : {}),
      },
    });

    if (order.customerId && order.loyaltyPointsRedeemed > 0) {
      const cust = await tx.customer.findUnique({
        where: { id: order.customerId },
        select: { pointsBalance: true },
      });
      const requested = Math.max(0, Math.floor(order.loyaltyPointsRedeemed));
      const use = Math.min(requested, Math.max(0, cust?.pointsBalance ?? 0));
      if (use > 0) {
        const { applyCustomerPointsDelta } = await import("@/lib/loyalty-points");
        await applyCustomerPointsDelta(
          {
            customerId: order.customerId,
            delta: -use,
            reason: `Points redeemed (${order.id.slice(0, 8)})`,
            orderId: order.id,
          },
          tx,
        );
      }
    }

    const site = await tx.siteConfig.findUnique({ where: { id: 1 } });
    if (site?.loyaltyEnabled && site.pointsPerDollar > 0 && order.customerId) {
      let earned = 0;
      for (const li of order.lineItems) {
        const multRaw = li.product?.pointsMultiplier != null ? Number(li.product.pointsMultiplier) : 1;
        const mult = Number.isFinite(multRaw) && multRaw > 0 ? multRaw : 1;
        const dollars = li.lineTotalCents / 100;
        earned += Math.floor(dollars * site.pointsPerDollar * mult);
      }
      if (earned > 0) {
        const { applyCustomerPointsDelta } = await import("@/lib/loyalty-points");
        await applyCustomerPointsDelta(
          {
            customerId: order.customerId,
            delta: earned,
            reason: "Purchase rewards",
            orderId: order.id,
          },
          tx,
        );
      }
    }

    if (order.customerId) {
      const cartRow = await tx.cart.findUnique({ where: { customerId: order.customerId } });
      if (cartRow) {
        await snapshotCartLabelsToOrder(order.id, cartRow.id, tx);
        await tx.cartItem.deleteMany({ where: { cartId: cartRow.id } });
        await tx.cartLabelItem.deleteMany({ where: { cartId: cartRow.id } });
        await tx.cart.update({
          where: { id: cartRow.id },
          data: { appliedCouponEventId: null, appliedLoyaltyPoints: 0 },
        });
      }
    }

    return true;
  });

  if (fulfilled) {
    revalidatePath("/account");
    revalidatePath("/account/points");
    revalidatePath("/cart");
    revalidatePath("/store");
    revalidatePath("/settings/sales");
    revalidatePath(`/settings/sales/${orderId}`);
  }

  return fulfilled;
}

/** Stripe webhook: session completed → fulfill when paid. */
export async function fulfillStripeCheckoutSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.warn("Stripe checkout.session.completed: missing metadata.orderId");
    return false;
  }

  const paid =
    session.payment_status === "paid" ||
    (session.payment_status === "no_payment_required" && session.status === "complete");
  if (!paid) return false;

  return fulfillPaidOrder(orderId, { stripeSessionId: session.id });
}
