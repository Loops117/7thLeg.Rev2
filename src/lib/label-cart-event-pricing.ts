import { EventKind, EventSaleDiscountMode } from "@/generated/prisma/client";
import { effectiveEventSalePriceCents, isEventActive } from "@/lib/event-pricing";
import { prisma } from "@/lib/prisma";

const labelDiscountEventSelect = {
  id: true,
  kind: true,
  startAt: true,
  endAt: true,
  saleDiscountMode: true,
  saleDiscountPercent: true,
  saleDiscountCents: true,
  includesLabelMaker: true,
} as const;

type LabelDiscountEvent = {
  id: string;
  kind: EventKind;
  startAt: Date;
  endAt: Date;
  saleDiscountMode: EventSaleDiscountMode;
  saleDiscountPercent: number | null;
  saleDiscountCents: number | null;
  includesLabelMaker: boolean;
};

function discountCentsForSubtotal(subtotalCents: number, event: LabelDiscountEvent): number {
  if (subtotalCents <= 0 || event.saleDiscountMode === EventSaleDiscountMode.NONE) return 0;
  const { priceCents, showSale } = effectiveEventSalePriceCents(
    subtotalCents,
    event.saleDiscountMode,
    event.saleDiscountPercent,
    event.saleDiscountCents,
  );
  if (!showSale) return 0;
  return Math.max(0, subtotalCents - priceCents);
}

function bestTimedLabelDiscountCents(subtotalCents: number, events: LabelDiscountEvent[], now: Date): number {
  let best = 0;
  for (const ev of events) {
    if (ev.kind !== EventKind.TIMED || !ev.includesLabelMaker) continue;
    if (!isEventActive(ev.startAt, ev.endAt, now)) continue;
    best = Math.max(best, discountCentsForSubtotal(subtotalCents, ev));
  }
  return best;
}

export type LabelCartPriceResult = {
  listSubtotalCents: number;
  payableSubtotalCents: number;
  /** All label discounts (timed + coupon). */
  discountCents: number;
  timedDiscountCents: number;
  /** Savings from the cart's applied checkout coupon only. */
  couponDiscountCents: number;
};

/** Applies active timed + checkout coupon rules to stored label line totals. */
export async function priceLabelCartForCustomer(customerId: string): Promise<LabelCartPriceResult> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: {
      appliedCouponEventId: true,
      labelItems: { select: { lineTotalCents: true } },
    },
  });
  if (!cart?.labelItems.length) {
    return {
      listSubtotalCents: 0,
      payableSubtotalCents: 0,
      discountCents: 0,
      timedDiscountCents: 0,
      couponDiscountCents: 0,
    };
  }

  const listSubtotalCents = cart.labelItems.reduce((s, i) => s + i.lineTotalCents, 0);
  if (listSubtotalCents <= 0) {
    return {
      listSubtotalCents: 0,
      payableSubtotalCents: 0,
      discountCents: 0,
      timedDiscountCents: 0,
      couponDiscountCents: 0,
    };
  }

  const now = new Date();
  const timedEvents = await prisma.event.findMany({
    where: {
      kind: EventKind.TIMED,
      includesLabelMaker: true,
      saleDiscountMode: { not: EventSaleDiscountMode.NONE },
    },
    select: labelDiscountEventSelect,
  });

  const timedDiscountCents = bestTimedLabelDiscountCents(listSubtotalCents, timedEvents, now);
  const afterTimedCents = listSubtotalCents - timedDiscountCents;

  let couponDiscountCents = 0;
  const couponId = cart.appliedCouponEventId?.trim();
  if (couponId) {
    const coupon = await prisma.event.findUnique({
      where: { id: couponId },
      select: labelDiscountEventSelect,
    });
    if (
      coupon &&
      coupon.kind === EventKind.COUPON &&
      coupon.includesLabelMaker &&
      coupon.saleDiscountMode !== EventSaleDiscountMode.NONE &&
      isEventActive(coupon.startAt, coupon.endAt, now)
    ) {
      couponDiscountCents = discountCentsForSubtotal(afterTimedCents, coupon);
    }
  }

  const discountCents = timedDiscountCents + couponDiscountCents;
  return {
    listSubtotalCents,
    payableSubtotalCents: Math.max(0, listSubtotalCents - discountCents),
    discountCents,
    timedDiscountCents,
    couponDiscountCents,
  };
}
