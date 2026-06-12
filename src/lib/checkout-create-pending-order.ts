import { OrderStatus } from "@/generated/prisma/client";
import { type CartOwner } from "@/lib/cart-owner";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { computeCheckoutMerchandiseTotals } from "@/lib/checkout-merchandise-totals";
import { checkoutHasActiveFreeShipping } from "@/lib/checkout-shipping";
import { shippingCentsAfterEventDiscount } from "@/lib/checkout-shipping-display";
import { taxCentsFromSubtotal } from "@/lib/checkout-tax";
import type { GuestCheckoutContact } from "@/lib/guest-checkout-contact";
import { orderShippingContactFields } from "@/lib/link-guest-orders";
import { applyLoyaltyDiscountToPendingLineCreates } from "@/lib/loyalty-line-discount";
import { planLoyaltyRedemptionForCheckout } from "@/lib/loyalty-redemption-preview";
import { snapshotCartLabelsToOrder } from "@/lib/order-label-snapshot";
import { prisma } from "@/lib/prisma";
import { getEligibleShippingOptionsForOwner, loadCartShippingLines } from "@/lib/shipping-eligibility";

/**
 * Drop abandoned checkout placeholders: pending orders still unpaid and not linked to Stripe/Square completion.
 */
export async function purgeAbandonedCheckoutOrders(owner: CartOwner): Promise<void> {
  const base = {
    status: OrderStatus.PENDING,
    stripeCheckoutSessionId: null,
    squarePaymentId: null,
  };
  if (owner.type === "customer") {
    await prisma.order.deleteMany({
      where: { ...base, customerId: owner.customerId },
    });
    return;
  }
  await prisma.order.deleteMany({
    where: { ...base, customerId: null, guestSessionId: owner.sessionId },
  });
}

export type CreatePendingCheckoutOrderOpts = {
  shippingContact: GuestCheckoutContact;
};

/**
 * Build a Stripe/Square-compatible pending cart order with line snapshots. Validates stock.
 * Includes product lines and a single custom-labels line when the cart has label items.
 */
export async function createFreshPendingCheckoutOrder(
  owner: CartOwner,
  opts?: CreatePendingCheckoutOrderOpts,
): Promise<{ ok: true; orderId: string; labelPayableCents: number } | { ok: false; error: string }> {
  if (!opts?.shippingContact) {
    return { ok: false, error: "Save your shipping address on the cart page before checkout." };
  }

  const packed = await computeCheckoutMerchandiseTotals(owner);
  if (!packed.ok) return packed;

  const { totals } = packed;
  const lineCreates = totals.productLines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    productNameSnap: l.productNameSnap,
    variantLabelSnap: l.variantLabelSnap,
    variantSkuSnap: l.variantSkuSnap,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    lineTotalCents: l.lineTotalCents,
    addToSpeciesList: l.addToSpeciesList,
  }));

  const [eligibleShippingOpts, siteCfg, cartShippingLines] = await Promise.all([
    getEligibleShippingOptionsForOwner(owner),
    prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { checkoutTaxRateBps: true, loyaltyEnabled: true, loyaltyRedemptionCentsPerPoint: true },
    }),
    loadCartShippingLines(owner),
  ]);

  const customerRow =
    owner.type === "customer"
      ? await prisma.customer.findUnique({
          where: { id: owner.customerId },
          select: { pointsBalance: true },
        })
      : null;

  const merchBeforeLoyalty = totals.combinedPayableCents;

  const cppSnap = Math.max(0, Math.floor(siteCfg?.loyaltyRedemptionCentsPerPoint ?? 0));

  const plan =
    owner.type === "customer"
      ? planLoyaltyRedemptionForCheckout({
          loyaltyProgramEnabled: !!siteCfg?.loyaltyEnabled,
          redemptionCentsPerPoint: cppSnap,
          customerPointsBalance: customerRow?.pointsBalance ?? 0,
          appliedLoyaltyPointsRequested: totals.appliedLoyaltyPoints,
          merchandiseSubtotalCents: merchBeforeLoyalty,
        })
      : null;

  let finalLineCreates = lineCreates;
  let loyaltyPointsRedeemed = 0;
  let loyaltyRedemptionDiscountCents = 0;
  let loyaltyRedemptionCentsPerPointSnap = 0;

  if (plan && cppSnap > 0 && plan.pointsToRedeem > 0 && plan.discountCents >= cppSnap && lineCreates.length > 0) {
    const adj = applyLoyaltyDiscountToPendingLineCreates(lineCreates, plan.discountCents);
    const pts = Math.floor(adj.discountAppliedCents / cppSnap);
    if (pts > 0 && adj.discountAppliedCents >= cppSnap) {
      finalLineCreates = adj.lines;
      loyaltyPointsRedeemed = pts;
      loyaltyRedemptionDiscountCents = adj.discountAppliedCents;
      loyaltyRedemptionCentsPerPointSnap = cppSnap;
    }
  }

  let subtotalCents =
    finalLineCreates.reduce((s, l) => s + l.lineTotalCents, 0) +
    totals.labelPayableCents -
    Math.max(0, totals.kitDiscountCents);
  if (subtotalCents < 0) return { ok: false, error: "Invalid cart total." };

  let shippingCents = 0;
  let shippingOptionId: string | null = null;
  let shippingLabelSnap = "";

  const freeShipping = await checkoutHasActiveFreeShipping(owner);

  const activeShippingCount = await prisma.shippingOption.count({ where: { active: true } });

  if (activeShippingCount > 0) {
    if (cartShippingLines.length > 0 && eligibleShippingOpts.length === 0) {
      return {
        ok: false,
        error: "No shipping method fits this cart. Remove items or contact the store.",
      };
    }

    const sel = totals.selectedShippingOptionId;
    const picked = sel ? eligibleShippingOpts.find((o) => o.id === sel) : null;
    if (!picked) {
      return { ok: false, error: "Choose a shipping method before checkout." };
    }
    shippingCents = shippingCentsAfterEventDiscount(picked.priceCents, freeShipping);
    shippingOptionId = picked.id;
    shippingLabelSnap = freeShipping ? `${picked.label} (free shipping)` : picked.label;
  }

  const taxCents = taxCentsFromSubtotal(subtotalCents, siteCfg?.checkoutTaxRateBps ?? 0);
  const totalCents = subtotalCents + shippingCents + taxCents;

  if (totalCents < 0) {
    return { ok: false, error: "Invalid cart total." };
  }

  await purgeAbandonedCheckoutOrders(owner);

  const orderIdentity = orderShippingContactFields(owner, opts.shippingContact);

  try {
    const orderId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          ...orderIdentity,
          status: OrderStatus.PENDING,
          subtotalCents,
          taxCents,
          shippingCents,
          shippingOptionId,
          shippingLabelSnap,
          totalCents,
          checkoutCouponCodeSnap: totals.checkoutCouponCodeSnap,
          checkoutCouponDiscountCents: totals.checkoutCouponDiscountCents,
          kitDiscountCents: totals.kitDiscountCents,
          loyaltyPointsRedeemed,
          loyaltyRedemptionDiscountCents,
          loyaltyRedemptionCentsPerPointSnap,
          labelMerchandiseCentsSnap: totals.labelPayableCents,
          lineItems: finalLineCreates.length > 0 ? { create: finalLineCreates } : undefined,
        },
        select: { id: true },
      });
      if (!isGuestOwner(owner)) {
        const labelCount = await snapshotCartLabelsToOrder(order.id, totals.cartId, tx);
        if (totals.labelPayableCents > 0 && labelCount === 0) {
          console.warn(
            "Checkout: cart had label payable cents but no cart label rows were snapshotted",
            { orderId: order.id, cartId: totals.cartId, labelPayableCents: totals.labelPayableCents },
          );
        }
      }
      return order.id;
    });
    return { ok: true, orderId, labelPayableCents: totals.labelPayableCents };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}
