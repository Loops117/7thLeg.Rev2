import { cache } from "react";
import { OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { shippingRegionIso3166_2 } from "@/lib/shipping-region-iso";

export type ShippingMapCityStat = { name: string; count: number };

export type ShippingMapRegionPayload = {
  orderCount: number;
  cities: ShippingMapCityStat[];
  /** Cities beyond the first five (for “+n more”). */
  moreCities: number;
};

export type ShippingMapStatsPayload = {
  /** Keyed by `iso_3166_2` (e.g. US-CA). */
  regions: Record<string, ShippingMapRegionPayload>;
  /** Max `orderCount` among regions with at least one order (for color scale). */
  maxOrders: number;
};

function titleCaseCity(raw: string): string {
  const t = raw.trim();
  if (!t) return "Unknown city";
  return t
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Paid / fulfilled orders counted on the map (not pending or cancelled). */
const MAP_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.ACCEPTED,
  OrderStatus.FULFILLED,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETE,
];

export const getShippedOrderMapStats = cache(async function getShippedOrderMapStats(): Promise<ShippingMapStatsPayload> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: MAP_ORDER_STATUSES },
      customerId: { not: null },
    },
    select: {
      id: true,
      customer: {
        select: { country: true, stateRegion: true, city: true },
      },
    },
  });

  type Agg = { orderCount: number; cityCounts: Map<string, { count: number; display: string }> };
  const byRegion = new Map<string, Agg>();

  for (const o of orders) {
    const c = o.customer;
    if (!c) continue;
    const key = shippingRegionIso3166_2(c.country, c.stateRegion)?.toUpperCase();
    if (!key) continue;
    const cityRaw = (c.city ?? "").trim() || "(No city)";
    const cityKey = cityRaw.toLowerCase();
    let agg = byRegion.get(key);
    if (!agg) {
      agg = { orderCount: 0, cityCounts: new Map() };
      byRegion.set(key, agg);
    }
    agg.orderCount += 1;
    const cur = agg.cityCounts.get(cityKey);
    if (cur) cur.count += 1;
    else agg.cityCounts.set(cityKey, { count: 1, display: titleCaseCity(cityRaw) });
  }

  let maxOrders = 0;
  const regions: Record<string, ShippingMapRegionPayload> = {};
  for (const [key, agg] of byRegion) {
    maxOrders = Math.max(maxOrders, agg.orderCount);
    const cities = [...agg.cityCounts.entries()]
      .map(([, v]) => ({ name: v.display, count: v.count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const top = cities.slice(0, 5);
    const moreCities = Math.max(0, cities.length - 5);
    regions[key] = { orderCount: agg.orderCount, cities: top, moreCities };
  }

  return { regions, maxOrders };
});
