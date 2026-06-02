import type { EventKind, EventSaleDiscountMode } from "@/generated/prisma/client";

export function isEventActive(startAt: Date, endAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= startAt.getTime() && now.getTime() <= endAt.getTime();
}

/** Storefront display for one line item under an event (timed sale rules only). */
export function eventDisplayPriceForBase(
  event: {
    kind: EventKind;
    startAt: Date;
    endAt: Date;
    saleDiscountMode: EventSaleDiscountMode;
    saleDiscountPercent: number | null;
    saleDiscountCents: number | null;
  },
  basePriceCents: number,
  onSaleDb: boolean,
): { displayPriceCents: number; displaySale: boolean } {
  if (
    event.kind !== "TIMED" ||
    !isEventActive(event.startAt, event.endAt) ||
    event.saleDiscountMode === "NONE"
  ) {
    return { displayPriceCents: basePriceCents, displaySale: onSaleDb };
  }
  const { priceCents, showSale } = effectiveEventSalePriceCents(
    basePriceCents,
    event.saleDiscountMode,
    event.saleDiscountPercent,
    event.saleDiscountCents,
  );
  if (!showSale) {
    return { displayPriceCents: basePriceCents, displaySale: onSaleDb };
  }
  return { displayPriceCents: priceCents, displaySale: true };
}

export function effectiveEventSalePriceCents(
  basePriceCents: number,
  mode: EventSaleDiscountMode,
  percent: number | null,
  fixedCents: number | null,
): { priceCents: number; showSale: boolean } {
  if (mode === "NONE") {
    return { priceCents: basePriceCents, showSale: false };
  }
  if (mode === "PERCENT" && percent != null) {
    const p = Math.min(100, Math.max(0, Math.floor(percent)));
    const next = Math.round((basePriceCents * (100 - p)) / 100);
    return { priceCents: Math.max(0, next), showSale: p > 0 };
  }
  if (mode === "FIXED_CENTS" && fixedCents != null) {
    const off = Math.max(0, Math.floor(fixedCents));
    return { priceCents: Math.max(0, basePriceCents - off), showSale: off > 0 && basePriceCents > 0 };
  }
  return { priceCents: basePriceCents, showSale: false };
}
