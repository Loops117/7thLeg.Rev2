import { priceCartMerchandiseForCustomer, type PricedCartForCustomerRow } from "@/lib/checkout-cart-pricing";
import { priceLabelCartForCustomer, type LabelCartPriceResult } from "@/lib/label-cart-event-pricing";
import { prisma } from "@/lib/prisma";

export type CheckoutMerchandiseTotals = {
  cartId: string;
  selectedShippingOptionId: string | null;
  appliedLoyaltyPoints: number;
  productLines: PricedCartForCustomerRow[];
  labelPricing: LabelCartPriceResult;
  productPayableCents: number;
  labelPayableCents: number;
  combinedPayableCents: number;
  checkoutCouponCodeSnap: string;
  /** Product + label savings from the applied checkout coupon. */
  checkoutCouponDiscountCents: number;
};

export async function computeCheckoutMerchandiseTotals(
  customerId: string,
): Promise<{ ok: true; totals: CheckoutMerchandiseTotals } | { ok: false; error: string }> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: {
      id: true,
      selectedShippingOptionId: true,
      appliedLoyaltyPoints: true,
      items: { select: { id: true } },
      labelItems: { select: { id: true } },
    },
  });
  if (!cart || (cart.items.length === 0 && cart.labelItems.length === 0)) {
    return { ok: false, error: "Your cart is empty." };
  }

  const [priced, labelPricing] = await Promise.all([
    cart.items.length > 0 ? priceCartMerchandiseForCustomer(customerId) : Promise.resolve(null),
    priceLabelCartForCustomer(customerId),
  ]);

  if (cart.items.length > 0) {
    if (!priced?.ok) return priced ?? { ok: false, error: "Your cart is empty." };
  }

  const productPayableCents = priced?.ok ? priced.merchandiseSubtotalCents : 0;
  const labelPayableCents = labelPricing.payableSubtotalCents;
  const combinedPayableCents = productPayableCents + labelPayableCents;

  if (combinedPayableCents < 0) {
    return { ok: false, error: "Invalid cart total." };
  }

  return {
    ok: true,
    totals: {
      cartId: cart.id,
      selectedShippingOptionId:
        priced?.ok ? priced.selectedShippingOptionId : cart.selectedShippingOptionId,
      appliedLoyaltyPoints: priced?.ok ? priced.appliedLoyaltyPoints : cart.appliedLoyaltyPoints,
      productLines: priced?.ok ? priced.pricedLines : [],
      labelPricing,
      productPayableCents,
      labelPayableCents,
      combinedPayableCents,
      checkoutCouponCodeSnap: priced?.ok ? priced.checkoutCouponCodeSnap.trim() : "",
      checkoutCouponDiscountCents:
        (priced?.ok ? priced.couponDiscountCents : 0) + labelPricing.couponDiscountCents,
    },
  };
}
