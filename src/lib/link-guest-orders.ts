import { OrderStatus } from "@/generated/prisma/client";
import { cartOwnerWhere, clearGuestCartCookie, type CartOwner } from "@/lib/cart-owner";
import { computePurchaseRewardPoints } from "@/lib/purchase-loyalty-earn";
import { applyCustomerPointsDelta } from "@/lib/loyalty-points";
import { prisma } from "@/lib/prisma";

/** Merge anonymous session cart lines into the signed-in customer cart. */
export async function mergeGuestCartIntoCustomer(
  guestSessionId: string,
  customerId: string,
): Promise<void> {
  const guestCart = await prisma.cart.findUnique({
    where: { sessionId: guestSessionId },
    include: { items: true, labelItems: true },
  });
  if (!guestCart || (guestCart.items.length === 0 && guestCart.labelItems.length === 0)) {
    if (guestCart) await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => {});
    return;
  }

  const customerCart = await prisma.cart.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
    select: { id: true },
  });

  for (const item of guestCart.items) {
    const scopeKey = item.pricingScopeKey ?? "__none__";
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: customerCart.id,
        productId: item.productId,
        variantId: item.variantId,
        pricingScopeKey: scopeKey,
      },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(99, existing.quantity + item.quantity) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: customerCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          timedSaleEventId: item.timedSaleEventId,
          pricingScopeKey: scopeKey,
          productKitInstanceId: item.productKitInstanceId,
        },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  await clearGuestCartCookie();
}

/** Attach paid guest orders to a new account and award any pending loyalty points. */
export async function linkGuestOrdersAndAwardLoyalty(
  customerId: string,
  email: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const site = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { loyaltyEnabled: true, pointsPerDollar: true },
  });

  const orders = await prisma.order.findMany({
    where: {
      customerId: null,
      guestEmail: normalized,
      status: { in: [OrderStatus.PAID, OrderStatus.ACCEPTED, OrderStatus.FULFILLED, OrderStatus.SHIPPED, OrderStatus.COMPLETE] },
      loyaltyEarnAwardedAt: null,
    },
    include: {
      lineItems: { include: { product: { select: { pointsMultiplier: true } } } },
    },
  });

  for (const order of orders) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { customerId },
      });

      if (!site?.loyaltyEnabled || site.pointsPerDollar <= 0) {
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyEarnAwardedAt: new Date() },
        });
        return;
      }

      const earned = computePurchaseRewardPoints(
        order.lineItems.map((li) => ({
          lineTotalCents: li.lineTotalCents,
          pointsMultiplier: li.product.pointsMultiplier,
        })),
        site.pointsPerDollar,
      );

      if (earned > 0) {
        await applyCustomerPointsDelta(
          {
            customerId,
            delta: earned,
            reason: "Purchase rewards (guest order)",
            orderId: order.id,
          },
          tx,
        );
      }

      await tx.order.update({
        where: { id: order.id },
        data: { loyaltyEarnAwardedAt: new Date() },
      });
    });
  }
}

export function isGuestOwner(owner: CartOwner): owner is { type: "guest"; sessionId: string } {
  return owner.type === "guest";
}

function shippingSnapshotFields(contact: import("@/lib/guest-checkout-contact").GuestCheckoutContact) {
  return {
    guestEmail: contact.email,
    guestDisplayName: contact.displayName,
    guestAddressLine1: contact.addressLine1,
    guestAddressLine2: contact.addressLine2 || null,
    guestCity: contact.city,
    guestStateRegion: contact.stateRegion,
    guestPostalCode: contact.postalCode,
    guestCountry: contact.country,
  };
}

/** @deprecated Use orderShippingContactFields */
export function guestOrderContactFields(
  sessionId: string,
  contact: import("@/lib/guest-checkout-contact").GuestCheckoutContact,
) {
  return {
    customerId: null as string | null,
    guestSessionId: sessionId,
    ...shippingSnapshotFields(contact),
  };
}

/** Snapshot confirmed checkout shipping on the order (guest and signed-in). */
export function orderShippingContactFields(
  owner: CartOwner,
  contact: import("@/lib/guest-checkout-contact").GuestCheckoutContact,
) {
  const snap = shippingSnapshotFields(contact);
  if (isGuestOwner(owner)) {
    return { customerId: null as string | null, guestSessionId: owner.sessionId, ...snap };
  }
  return { customerId: owner.customerId, ...snap };
}
