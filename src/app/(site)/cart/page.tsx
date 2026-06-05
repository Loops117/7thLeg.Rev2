import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { CartView } from "@/components/cart-view";
import { getCartPaymentAvailability } from "@/lib/cart-payment-availability";
import {
  ensureCartShippingSelection,
  getCartEligibleShippingOptionsForCustomer,
  getCartShippingUnitsTotal,
} from "@/lib/shipping-options-public";
import { prisma } from "@/lib/prisma";
import { getLabelBuilderPublicConfig } from "@/lib/label-builder-public";
import { priceLabelCartForCustomer } from "@/lib/label-cart-event-pricing";
import { checkoutHasActiveFreeShipping } from "@/lib/checkout-shipping";
import { getCartLabelLinesForCustomer, getCartPricingForCartPage } from "@/lib/store-cart";
import { getLoyaltyProgramForAdmin } from "@/lib/site-config";
import { maxRedeemablePointsForCart } from "@/lib/loyalty-redemption-preview";

type Props = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function CartPage({ searchParams }: Props) {
  const { checkout } = await searchParams;
  const cancelledCheckout = checkout === "cancelled";
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">Cart</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          Sign in with a customer account to save your cart across devices.{" "}
          <Link href="/login?callbackUrl=/cart" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            create an account
          </Link>
          .
        </p>
      </div>
    );
  }

  if (session.user.role === "admin") {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">Cart</h1>
        <p className="mt-6 text-ink/80">
          You’re signed in as an admin. The storefront cart is for customer accounts — use a separate browser profile or
          log out and sign in as a customer to test the cart.{" "}
          <Link href="/settings/sales" className="font-bold text-lagoon-dark underline">
            Open admin
          </Link>
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-3xl font-black text-palm">Cart</h1>
        <p className="mt-6 text-ink/80">Unable to load cart for this session.</p>
      </div>
    );
  }

  const [cartPack, labelLines, labelPricing, freeShippingActive, payments, taxCfg, loyaltyProgram, customerPts, labelBuilderPublicConfig] =
    await Promise.all([
      getCartPricingForCartPage(session.user.id),
      getCartLabelLinesForCustomer(session.user.id),
      priceLabelCartForCustomer(session.user.id),
      checkoutHasActiveFreeShipping(session.user.id),
      getCartPaymentAvailability(),
      prisma.siteConfig.findUnique({ where: { id: 1 }, select: { checkoutTaxRateBps: true } }),
      getLoyaltyProgramForAdmin(),
      prisma.customer.findUnique({ where: { id: session.user.id }, select: { pointsBalance: true } }),
      getLabelBuilderPublicConfig(),
    ]);
  const checkoutTaxRateBps = taxCfg?.checkoutTaxRateBps ?? 0;
  const lines = cartPack.empty ? [] : cartPack.lines;
  const productSubtotalCents = cartPack.empty ? 0 : cartPack.merchandiseSubtotalCents;
  const labelSubtotalCents = labelPricing.payableSubtotalCents;
  const labelCouponDiscountCents = labelPricing.couponDiscountCents;
  const subtotalCents = productSubtotalCents + labelSubtotalCents;
  const cpp = Math.max(0, Math.floor(loyaltyProgram.loyaltyRedemptionCentsPerPoint || 0));
  const loyaltyEnabled = !!loyaltyProgram.loyaltyEnabled && cpp > 0;
  const balance = Math.max(0, customerPts?.pointsBalance ?? 0);
  const maxPoints = loyaltyEnabled
    ? maxRedeemablePointsForCart({
        loyaltyProgramEnabled: true,
        redemptionCentsPerPoint: cpp,
        customerPointsBalance: balance,
        merchandiseSubtotalCents: subtotalCents,
      })
    : 0;
  const hasCartItems = !cartPack.empty || labelLines.length > 0;
  const loyaltyPreview =
    hasCartItems && loyaltyEnabled && balance > 0
      ? {
          centsPerPoint: cpp,
          pointsBalance: balance,
          maxPoints,
          appliedPoints: cartPack.empty ? 0 : cartPack.appliedLoyaltyPoints,
        }
      : null;
  const merchandiseListSubtotalCents = cartPack.empty ? 0 : cartPack.merchandiseListSubtotalCents;
  const merchandiseBeforeCouponSubtotalCents = cartPack.empty
    ? 0
    : cartPack.merchandiseBeforeCouponSubtotalCents;
  const couponDiscountCents = cartPack.empty ? 0 : cartPack.couponDiscountCents;
  const kitDiscountCents = cartPack.empty ? 0 : cartPack.kitDiscountCents;
  const appliedCouponCode = cartPack.empty ? null : cartPack.appliedCouponCode;
  const timedEventSavingsCents = cartPack.empty
    ? 0
    : Math.max(0, merchandiseListSubtotalCents - merchandiseBeforeCouponSubtotalCents);

  let shippingOptions: Awaited<ReturnType<typeof getCartEligibleShippingOptionsForCustomer>> = [];
  let selectedShippingOptionId: string | null = null;
  let cartShippingUnitsTotal = 0;
  let shippingRequiredButUnavailable = false;

  if (lines.length > 0 || labelLines.length > 0) {
    const [eligible, unitsTotal, activeCount] = await Promise.all([
      getCartEligibleShippingOptionsForCustomer(session.user.id),
      getCartShippingUnitsTotal(session.user.id),
      prisma.shippingOption.count({ where: { active: true } }),
    ]);
    shippingOptions = eligible;
    cartShippingUnitsTotal = unitsTotal;
    shippingRequiredButUnavailable = lines.length > 0 && activeCount > 0 && eligible.length === 0;
    selectedShippingOptionId = await ensureCartShippingSelection(session.user.id, shippingOptions);
  }

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">Cart</h1>
      {cancelledCheckout ? (
        <p className="mt-4 rounded border border-palm-mid bg-sand px-4 py-3 text-sm text-ink/85">
          Checkout was cancelled — your cart is unchanged. You can try again anytime.
        </p>
      ) : null}
      <CartView
        lines={lines}
        labelLines={labelLines}
        subtotalCents={subtotalCents}
        productSubtotalCents={productSubtotalCents}
        labelCouponDiscountCents={labelCouponDiscountCents}
        merchandiseListSubtotalCents={merchandiseListSubtotalCents}
        timedEventSavingsCents={timedEventSavingsCents}
        couponDiscountCents={couponDiscountCents}
        kitDiscountCents={kitDiscountCents}
        appliedCouponCode={appliedCouponCode}
        checkoutTaxRateBps={checkoutTaxRateBps}
        payments={payments}
        shippingOptions={shippingOptions}
        selectedShippingOptionId={selectedShippingOptionId}
        cartShippingUnitsTotal={cartShippingUnitsTotal}
        shippingRequiredButUnavailable={shippingRequiredButUnavailable}
        loyaltyPreview={loyaltyPreview}
        labelBuilderPublicConfig={labelBuilderPublicConfig}
        freeShippingActive={freeShippingActive}
      />
    </div>
  );
}
