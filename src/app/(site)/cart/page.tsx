import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { CartView } from "@/components/cart-view";
import { GuestCheckoutContactPanel } from "@/components/guest-checkout-contact-panel";
import { GuestPointsUpsell } from "@/components/guest-points-upsell";
import { isGuestCheckoutEnabled, readCartOwner } from "@/lib/cart-owner";
import { getCartPaymentAvailability } from "@/lib/cart-payment-availability";
import {
  ensureCartShippingSelection,
  getCartEligibleShippingOptionsForOwner,
  getCartShippingUnitsTotal,
} from "@/lib/shipping-options-public";
import { prisma } from "@/lib/prisma";
import { getLabelBuilderPublicConfig } from "@/lib/label-builder-public";
import { priceLabelCartForCustomer } from "@/lib/label-cart-event-pricing";
import { checkoutHasActiveFreeShipping } from "@/lib/checkout-shipping";
import { getCartLabelLinesForCustomer, getCartPricingForCartPage } from "@/lib/store-cart";
import { getLoyaltyProgramForAdmin } from "@/lib/site-config";
import { maxRedeemablePointsForCart } from "@/lib/loyalty-redemption-preview";
import {
  contactFromCustomerProfile,
  hasCompleteShippingContact,
  readGuestCheckoutContactCookie,
} from "@/lib/guest-checkout-contact";
import { computePurchaseRewardPoints } from "@/lib/purchase-loyalty-earn";

type Props = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function CartPage({ searchParams }: Props) {
  const { checkout } = await searchParams;
  const cancelledCheckout = checkout === "cancelled";
  const session = await readAuthSession().catch(() => null);

  if (session?.user?.role === "admin") {
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

  const [owner, guestCheckoutEnabled] = await Promise.all([readCartOwner(), isGuestCheckoutEnabled()]);
  const isAnonymousVisitor = !session?.user || session.user.role !== "customer";

  if (!owner) {
    if (guestCheckoutEnabled && isAnonymousVisitor) {
      const [payments, labelBuilderPublicConfig] = await Promise.all([
        getCartPaymentAvailability(),
        getLabelBuilderPublicConfig(),
      ]);
      return (
        <div className="p-6 sm:p-10">
          <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">Cart</h1>
          <p className="mt-4 max-w-2xl text-sm text-ink/80">
            Your cart is empty. Add products from the{" "}
            <Link href="/store" className="font-bold text-lagoon-dark underline">
              store
            </Link>
            , or{" "}
            <Link href="/login?callbackUrl=/cart" className="font-bold text-lagoon-dark underline">
              sign in
            </Link>{" "}
            for labels, kits, and loyalty points.
          </p>
          <CartView
            lines={[]}
            labelLines={[]}
            subtotalCents={0}
            merchandiseListSubtotalCents={0}
            timedEventSavingsCents={0}
            couponDiscountCents={0}
            appliedCouponCode={null}
            checkoutTaxRateBps={0}
            payments={payments}
            shippingOptions={[]}
            selectedShippingOptionId={null}
            loyaltyPreview={null}
            labelBuilderPublicConfig={labelBuilderPublicConfig}
            guestMode
            shippingContactComplete={false}
          />
        </div>
      );
    }

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

  const isGuest = owner.type === "guest";
  const customerId = owner.type === "customer" ? owner.customerId : null;

  const [
    cartPack,
    labelLines,
    labelPricing,
    freeShippingActive,
    payments,
    taxCfg,
    loyaltyProgram,
    customerProfile,
    labelBuilderPublicConfig,
    savedShippingContact,
  ] = await Promise.all([
    getCartPricingForCartPage(owner),
    customerId ? getCartLabelLinesForCustomer(customerId) : Promise.resolve([]),
    customerId
      ? priceLabelCartForCustomer(customerId)
      : Promise.resolve({
          payableSubtotalCents: 0,
          couponDiscountCents: 0,
        }),
    checkoutHasActiveFreeShipping(owner),
    getCartPaymentAvailability(),
    prisma.siteConfig.findUnique({ where: { id: 1 }, select: { checkoutTaxRateBps: true } }),
    getLoyaltyProgramForAdmin(),
    customerId
      ? prisma.customer.findUnique({
          where: { id: customerId },
          select: {
            pointsBalance: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            stateRegion: true,
            postalCode: true,
            country: true,
          },
        })
      : Promise.resolve(null),
    getLabelBuilderPublicConfig(),
    readGuestCheckoutContactCookie(),
  ]);
  const initialShipping =
    savedShippingContact ??
    (customerProfile ? contactFromCustomerProfile(customerProfile) : null);
  const shippingContactComplete = hasCompleteShippingContact(savedShippingContact);

  const checkoutTaxRateBps = taxCfg?.checkoutTaxRateBps ?? 0;
  const lines = cartPack.empty ? [] : cartPack.lines;
  const productSubtotalCents = cartPack.empty ? 0 : cartPack.merchandiseSubtotalCents;
  const labelSubtotalCents = labelPricing.payableSubtotalCents;
  const labelCouponDiscountCents = "couponDiscountCents" in labelPricing ? labelPricing.couponDiscountCents : 0;
  const subtotalCents = productSubtotalCents + labelSubtotalCents;
  const cpp = Math.max(0, Math.floor(loyaltyProgram.loyaltyRedemptionCentsPerPoint || 0));
  const loyaltyEnabled = !isGuest && !!loyaltyProgram.loyaltyEnabled && cpp > 0;
  const balance = Math.max(0, customerProfile?.pointsBalance ?? 0);
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

  let projectedGuestPoints = 0;
  if (isGuest && loyaltyProgram.loyaltyEnabled && loyaltyProgram.pointsPerDollar > 0 && lines.length > 0) {
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, pointsMultiplier: true },
    });
    const multById = new Map(products.map((p) => [p.id, p.pointsMultiplier]));
    projectedGuestPoints = computePurchaseRewardPoints(
      lines.map((l) => ({
        lineTotalCents: l.lineTotalCents,
        pointsMultiplier: multById.get(l.productId),
      })),
      loyaltyProgram.pointsPerDollar,
    );
  }

  let shippingOptions: Awaited<ReturnType<typeof getCartEligibleShippingOptionsForOwner>> = [];
  let selectedShippingOptionId: string | null = null;
  let cartShippingUnitsTotal = 0;
  let shippingRequiredButUnavailable = false;

  if (lines.length > 0 || labelLines.length > 0) {
    const [eligible, unitsTotal, activeCount] = await Promise.all([
      getCartEligibleShippingOptionsForOwner(owner),
      getCartShippingUnitsTotal(owner),
      prisma.shippingOption.count({ where: { active: true } }),
    ]);
    shippingOptions = eligible;
    cartShippingUnitsTotal = unitsTotal;
    shippingRequiredButUnavailable = lines.length > 0 && activeCount > 0 && eligible.length === 0;
    selectedShippingOptionId = await ensureCartShippingSelection(owner, shippingOptions);
  }

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">Cart</h1>
      {isGuest ? (
        <p className="mt-4 max-w-2xl text-sm text-ink/80">
          Checking out as a guest — products only.{" "}
          <Link href="/login?callbackUrl=/cart" className="font-bold text-lagoon-dark underline">
            Sign in
          </Link>{" "}
          for labels, kits, and loyalty points.
        </p>
      ) : null}
      {cancelledCheckout ? (
        <p className="mt-4 rounded border border-palm-mid bg-sand px-4 py-3 text-sm text-ink/85">
          Checkout was cancelled — your cart is unchanged. You can try again anytime.
        </p>
      ) : null}
      {isGuest && projectedGuestPoints > 0 ? (
        <div className="mt-4">
          <GuestPointsUpsell
            projectedPoints={projectedGuestPoints}
            pointsPerDollar={loyaltyProgram.pointsPerDollar}
          />
        </div>
      ) : null}
      {hasCartItems ? (
        <div className="mt-4">
          <GuestCheckoutContactPanel
            initialContact={initialShipping}
            guestMode={isGuest}
            accountEmail={customerProfile?.email ?? null}
            contactSaved={shippingContactComplete}
          />
        </div>
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
        guestMode={isGuest}
        shippingContactComplete={shippingContactComplete}
      />
    </div>
  );
}
