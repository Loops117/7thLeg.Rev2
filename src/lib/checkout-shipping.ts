import { EventKind } from "@/generated/prisma/client";
import { isEventActive } from "@/lib/event-pricing";
import { prisma } from "@/lib/prisma";

/** True when an active timed event or applied coupon grants free shipping. */
export async function checkoutHasActiveFreeShipping(customerId: string): Promise<boolean> {
  const now = new Date();
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: { appliedCouponEventId: true },
  });

  if (cart?.appliedCouponEventId?.trim()) {
    const coupon = await prisma.event.findUnique({
      where: { id: cart.appliedCouponEventId.trim() },
      select: {
        kind: true,
        includesFreeShipping: true,
        startAt: true,
        endAt: true,
      },
    });
    if (
      coupon?.kind === EventKind.COUPON &&
      coupon.includesFreeShipping &&
      isEventActive(coupon.startAt, coupon.endAt, now)
    ) {
      return true;
    }
  }

  const timedRows = await prisma.event.findMany({
    where: { kind: EventKind.TIMED, includesFreeShipping: true },
    select: { startAt: true, endAt: true },
  });
  return timedRows.some((ev) => isEventActive(ev.startAt, ev.endAt, now));
}

