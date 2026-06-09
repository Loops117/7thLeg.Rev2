"use server";

import { revalidatePath } from "next/cache";
import { createFreshPendingCheckoutOrder } from "@/lib/checkout-create-pending-order";
import { orderBelongsToOwner } from "@/lib/checkout-order-owner";
import { requireCheckoutSession } from "@/lib/checkout-session";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { prisma } from "@/lib/prisma";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/** Stripe.node v22+ types `stripe.checkout` as the Checkout resource instance; SessionCreateParams lives on the callable create() args. */
type StripeCheckoutSessionsCreateParams = NonNullable<
  Parameters<Stripe["checkout"]["sessions"]["create"]>[0]
>;
type StripeCheckoutLineItemParam = NonNullable<
  NonNullable<StripeCheckoutSessionsCreateParams["line_items"]>
>[number];

export type BeginStripeCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function beginStripeCheckoutAction(): Promise<BeginStripeCheckoutResult> {
  const ctx = await requireCheckoutSession();
  if (!ctx.ok) return ctx;

  const siteCfg = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { paymentStripeEnabled: true },
  });
  if (!siteCfg?.paymentStripeEnabled) {
    return { ok: false, error: "Stripe checkout is disabled for this store." };
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return { ok: false, error: "Payments are not configured (missing STRIPE_SECRET_KEY)." };
  }

  const created = await createFreshPendingCheckoutOrder(ctx.owner, {
    shippingContact: ctx.shippingContact,
  });
  if (!created.ok) return created;

  const orderPreview = await prisma.order.findUnique({
    where: { id: created.orderId },
    select: { totalCents: true, customerId: true, guestSessionId: true },
  });
  if (!orderPreview || !orderBelongsToOwner(orderPreview, ctx.owner)) {
    return { ok: false, error: "Could not verify your order." };
  }
  if (orderPreview.totalCents <= 0) {
    await prisma.order.delete({ where: { id: created.orderId } }).catch(() => {});
    return {
      ok: false,
      error: "This order total is $0.00 — use Complete order on the cart page instead of card checkout.",
    };
  }

  const labelPayableCents = created.labelPayableCents;
  const orderId = created.orderId;
  let orderRows;
  try {
    orderRows = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lineItems: true },
    });
    if (!orderRows || (orderRows.lineItems.length === 0 && labelPayableCents <= 0)) {
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
      return { ok: false, error: "Cart could not be loaded for checkout." };
    }
  } catch {
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    return { ok: false, error: "Could not start checkout. Try again." };
  }

  const stripe = getStripe();
  const origin = getPublicAppOrigin();

  const stripeName = (li: {
    productNameSnap: string;
    variantLabelSnap: string | null;
  }) =>
    `${li.productNameSnap}${li.variantLabelSnap ? ` (${li.variantLabelSnap})` : ""}`.slice(0, 248);

  const shippingStripeName = ((): string => {
    const snap = orderRows.shippingLabelSnap?.trim();
    const base = snap ? `Shipping — ${snap}` : "Shipping";
    return base.slice(0, 248);
  })();

  const productLineItems: StripeCheckoutLineItemParam[] = orderRows.lineItems.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: "usd",
      unit_amount: l.unitPriceCents,
      product_data: {
        name: stripeName(l),
        metadata: {
          productId: l.productId,
          variantId: l.variantId ?? "",
        },
      },
    },
  }));

  if (labelPayableCents > 0) {
    productLineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: labelPayableCents,
        product_data: {
          name: "Custom labels",
          metadata: { kind: "labels" },
        },
      },
    });
  }

  const stripeExtras: StripeCheckoutLineItemParam[] = [];
  if (orderRows.shippingCents > 0) {
    stripeExtras.push({
      quantity: 1 as const,
      price_data: {
        currency: "usd" as const,
        unit_amount: orderRows.shippingCents,
        product_data: {
          name: shippingStripeName,
          metadata: { kind: "shipping" },
        },
      },
    });
  }
  if (orderRows.taxCents > 0) {
    stripeExtras.push({
      quantity: 1 as const,
      price_data: {
        currency: "usd" as const,
        unit_amount: orderRows.taxCents,
        product_data: {
          name: "Sales tax".slice(0, 248),
          metadata: { kind: "tax" },
        },
      },
    });
  }

  const lineItemsStripe =
    stripeExtras.length > 0
      ? ([...productLineItems, ...stripeExtras] as StripeCheckoutLineItemParam[])
      : ([...productLineItems] as StripeCheckoutLineItemParam[]);

  const metadata: Record<string, string> = { orderId };
  if (ctx.owner.type === "customer") {
    metadata.customerId = ctx.owner.customerId;
  } else {
    metadata.guestSessionId = ctx.owner.sessionId;
  }

  let checkoutUrl: string;
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: ctx.checkoutEmail,
      line_items: lineItemsStripe,
      success_url: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}${isGuestOwner(ctx.owner) ? "&guest=1" : ""}`,
      cancel_url: `${origin}/cart?checkout=cancelled`,
      metadata,
      payment_intent_data: {
        metadata,
      },
    });

    const url = checkoutSession.url;
    if (!checkoutSession.id || !url) {
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
      return { ok: false, error: "Payment provider returned an incomplete session." };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { stripeCheckoutSessionId: checkoutSession.id },
    });

    checkoutUrl = url;
  } catch (e) {
    console.error("Stripe Checkout session creation failed:", e);
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    return { ok: false, error: "Could not reach the payment provider. Try again shortly." };
  }

  revalidatePath("/account");
  revalidatePath("/cart");

  return { ok: true, url: checkoutUrl };
}
