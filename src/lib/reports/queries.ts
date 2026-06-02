import { OrderStatus } from "@/generated/prisma/client";
import type { ReportDateRange } from "@/lib/reports/date-range";
import {
  buildTimeBuckets,
  bucketIndexForDate,
  emptySeries,
  fillSeriesFromDates,
  type TimeBucket,
} from "@/lib/reports/buckets";
import { prisma } from "@/lib/prisma";

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.ACCEPTED,
  OrderStatus.FULFILLED,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETE,
];

export type ReportLineSeries = {
  buckets: TimeBucket[];
  labels: string[];
  series: { id: string; name: string; values: number[]; color: string }[];
};

export type ReportsBundle = {
  range: ReportDateRange;
  sales: ReportLineSeries & {
    totals: { revenueCents: number; orders: number };
  };
  traffic: ReportLineSeries & {
    totals: { impressions: number; visits: number };
    trackingNote: string;
  };
  labels: ReportLineSeries & {
    totals: { designsSaved: number; labelsOrdered: number; cartAdds: number };
  };
  retention: {
    newCustomers: number;
    returningCustomers: number;
    repeatRatePercent: number;
    avgOrdersPerCustomer: number;
    cohortChart: ReportLineSeries;
  };
  carts: {
    abandonedCarts: number;
    abandonedValueCents: number;
    failedCheckouts: number;
    stalePendingCents: number;
    weeklyAbandoned: ReportLineSeries;
  };
  topProducts: { name: string; quantity: number; revenueCents: number }[];
  signups: ReportLineSeries;
  orderStatus: { status: string; count: number }[];
  revenueSplit: { productsCents: number; labelsCents: number };
  qrCodes: { code: string; name: string; visits: number }[];
};

function lineFromBuckets(
  buckets: TimeBucket[],
  defs: { id: string; name: string; values: number[]; color: string }[],
): ReportLineSeries {
  return {
    buckets,
    labels: buckets.map((b) => b.label),
    series: defs,
  };
}

export async function fetchReportsBundle(range: ReportDateRange): Promise<ReportsBundle> {
  const buckets = buildTimeBuckets(range);
  const { from, to } = range;
  const visitDayEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: PAID_STATUSES },
    },
    select: { createdAt: true, totalCents: true, subtotalCents: true, customerId: true },
  });

  const revenueSeries = emptySeries(buckets);
  const orderCountSeries = emptySeries(buckets);
  let revenueCents = 0;
  for (const o of orders) {
    revenueCents += o.totalCents;
    const i = bucketIndexForDate(buckets, o.createdAt);
    if (i >= 0) {
      revenueSeries[i]! += o.totalCents;
      orderCountSeries[i]! += 1;
    }
  }

  const [impressions, visits] = await Promise.all([
    prisma.analyticsPageImpression.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
    prisma.analyticsPageVisit.findMany({
      where: { visitDay: { gte: from, lte: visitDayEnd } },
      select: { visitDay: true, createdAt: true },
    }),
  ]);

  const impressionSeries = fillSeriesFromDates(
    buckets,
    impressions.map((r) => ({ at: r.createdAt })),
  );
  const visitSeries = fillSeriesFromDates(
    buckets,
    visits.map((r) => ({ at: r.createdAt })),
  );

  const impressionCount = await prisma.analyticsPageImpression.count({
    where: { createdAt: { gte: from, lte: to } },
  });
  const visitCount = visits.length;

  const [designs, orderLabels, cartLabels] = await Promise.all([
    prisma.customerLabelDesign.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
    prisma.orderLabelLine.findMany({
      where: { order: { createdAt: { gte: from, lte: to }, status: { in: PAID_STATUSES } } },
      select: { quantity: true, order: { select: { createdAt: true } } },
    }),
    prisma.cartLabelItem.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, quantity: true },
    }),
  ]);

  const designsSeries = fillSeriesFromDates(
    buckets,
    designs.map((d) => ({ at: d.createdAt })),
  );
  const orderedLabelsSeries = emptySeries(buckets);
  let labelsOrdered = 0;
  for (const row of orderLabels) {
    labelsOrdered += row.quantity;
    const i = bucketIndexForDate(buckets, row.order.createdAt);
    if (i >= 0) orderedLabelsSeries[i]! += row.quantity;
  }
  const cartLabelSeries = fillSeriesFromDates(
    buckets,
    cartLabels.map((c) => ({ at: c.createdAt, value: c.quantity })),
  );

  const newCustomersRows = await prisma.customer.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { createdAt: true, id: true },
  });
  const signupsSeries = fillSeriesFromDates(
    buckets,
    newCustomersRows.map((c) => ({ at: c.createdAt })),
  );

  const customersWithOrders = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: PAID_STATUSES },
      customerId: { not: null },
    },
    _count: { id: true },
  });
  const returningCustomers = customersWithOrders.filter((c) => c._count.id >= 2).length;
  const orderingCustomers = customersWithOrders.length;
  const repeatRatePercent =
    orderingCustomers > 0 ? Math.round((returningCustomers / orderingCustomers) * 1000) / 10 : 0;
  const totalOrdersInPeriod = orders.filter((o) => o.customerId).length;
  const avgOrdersPerCustomer =
    orderingCustomers > 0 ? Math.round((totalOrdersInPeriod / orderingCustomers) * 100) / 100 : 0;

  const cohortBuckets = buildTimeBuckets({ ...range, bucket: "week" });
  const cohortNew = emptySeries(cohortBuckets);
  const cohortReturn = emptySeries(cohortBuckets);
  for (const c of newCustomersRows) {
    const i = bucketIndexForDate(cohortBuckets, c.createdAt);
    if (i >= 0) cohortNew[i]! += 1;
  }
  const priorOrderCounts = await prisma.order.groupBy({
    by: ["customerId"],
    where: { status: { in: PAID_STATUSES }, customerId: { not: null } },
    _count: { id: true },
  });
  const repeatIds = new Set(
    priorOrderCounts.filter((p) => p._count.id >= 2).map((p) => p.customerId!).filter(Boolean),
  );
  const ordersInRange = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: PAID_STATUSES },
      customerId: { not: null },
    },
    select: { customerId: true, createdAt: true },
  });
  const seenReturn = new Set<string>();
  for (const o of ordersInRange) {
    if (!o.customerId || !repeatIds.has(o.customerId)) continue;
    const weekKey = `${o.customerId}:${bucketIndexForDate(cohortBuckets, o.createdAt)}`;
    if (seenReturn.has(weekKey)) continue;
    seenReturn.add(weekKey);
    const i = bucketIndexForDate(cohortBuckets, o.createdAt);
    if (i >= 0) cohortReturn[i]! += 1;
  }

  const staleCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const failedTo = to.getTime() < staleCutoff.getTime() ? to : staleCutoff;

  const [abandonedCartsRaw, failedPending] = await Promise.all([
    prisma.cart.findMany({
      where: {
        updatedAt: { gte: from, lte: to },
        OR: [{ items: { some: {} } }, { labelItems: { some: {} } }],
      },
      select: {
        id: true,
        customerId: true,
        updatedAt: true,
        items: { select: { quantity: true, product: { select: { basePriceCents: true } } } },
        labelItems: { select: { lineTotalCents: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { gte: from, lte: failedTo },
        OR: [{ stripeCheckoutSessionId: { not: null } }, { squarePaymentId: { not: null } }],
      },
      select: { totalCents: true, createdAt: true },
    }),
  ]);

  const cartCustomerIds = [
    ...new Set(abandonedCartsRaw.map((c) => c.customerId).filter((id): id is string => Boolean(id))),
  ];
  const paidOrdersForCartCustomers = cartCustomerIds.length
    ? await prisma.order.findMany({
        where: { customerId: { in: cartCustomerIds }, status: { in: PAID_STATUSES } },
        select: { customerId: true, createdAt: true },
      })
    : [];

  function customerPaidAfterCart(customerId: string, cartUpdatedAt: Date): boolean {
    return paidOrdersForCartCustomers.some(
      (o) => o.customerId === customerId && o.createdAt.getTime() > cartUpdatedAt.getTime(),
    );
  }

  let abandonedCarts = 0;
  let abandonedValueCents = 0;
  const abandonedAtDates: { at: Date }[] = [];
  for (const cart of abandonedCartsRaw) {
    if (cart.customerId && customerPaidAfterCart(cart.customerId, cart.updatedAt)) continue;
    abandonedCarts += 1;
    abandonedAtDates.push({ at: cart.updatedAt });
    for (const li of cart.items) {
      abandonedValueCents += li.quantity * li.product.basePriceCents;
    }
    for (const ll of cart.labelItems) {
      abandonedValueCents += ll.lineTotalCents;
    }
  }
  const abandonedWeekly = fillSeriesFromDates(buckets, abandonedAtDates);

  const statusGroups = await prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: from, lte: to } },
    _count: { id: true },
  });

  const lineItems = await prisma.orderLineItem.findMany({
    where: { order: { createdAt: { gte: from, lte: to }, status: { in: PAID_STATUSES } } },
    select: {
      productNameSnap: true,
      quantity: true,
      lineTotalCents: true,
    },
  });
  const productMap = new Map<string, { quantity: number; revenueCents: number }>();
  for (const li of lineItems) {
    const cur = productMap.get(li.productNameSnap) ?? { quantity: 0, revenueCents: 0 };
    cur.quantity += li.quantity;
    cur.revenueCents += li.lineTotalCents;
    productMap.set(li.productNameSnap, cur);
  }
  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);

  const labelRevenue = await prisma.orderLabelLine.aggregate({
    where: { order: { createdAt: { gte: from, lte: to }, status: { in: PAID_STATUSES } } },
    _sum: { lineTotalCents: true },
  });
  const productRevenue = orders.reduce((s, o) => s + o.subtotalCents, 0);
  const labelsRevenueCents = labelRevenue._sum.lineTotalCents ?? 0;

  const qrCodes = await prisma.qrRedirect.findMany({
    orderBy: { visitCount: "desc" },
    take: 12,
    select: { publicCode: true, name: true, visitCount: true },
  });

  return {
    range,
    sales: {
      ...lineFromBuckets(buckets, [
        { id: "revenue", name: "Revenue ($)", values: revenueSeries.map((c) => c / 100), color: "#2a9d8f" },
        { id: "orders", name: "Orders", values: orderCountSeries, color: "#e76f51" },
      ]),
      totals: { revenueCents, orders: orders.length },
    },
    traffic: {
      ...lineFromBuckets(buckets, [
        { id: "impressions", name: "Impressions", values: impressionSeries, color: "#457b9d" },
        { id: "visits", name: "Visits", values: visitSeries, color: "#e9c46a" },
      ]),
      totals: { impressions: impressionCount, visits: visitCount },
      trackingNote:
        impressionCount === 0 && visitCount === 0
          ? "Traffic tracking started recently — data appears as customers browse the storefront."
          : "Impressions count every page load; visits are unique per browser session per day.",
    },
    labels: {
      ...lineFromBuckets(buckets, [
        { id: "designs", name: "Designs saved", values: designsSeries, color: "#9b5de5" },
        { id: "ordered", name: "Labels ordered (qty)", values: orderedLabelsSeries, color: "#2a9d8f" },
        { id: "cart", name: "Added to cart (qty)", values: cartLabelSeries, color: "#f4a261" },
      ]),
      totals: {
        designsSaved: designs.length,
        labelsOrdered,
        cartAdds: cartLabels.reduce((s, c) => s + c.quantity, 0),
      },
    },
    retention: {
      newCustomers: newCustomersRows.length,
      returningCustomers,
      repeatRatePercent,
      avgOrdersPerCustomer,
      cohortChart: lineFromBuckets(cohortBuckets, [
        { id: "new", name: "New signups", values: cohortNew, color: "#457b9d" },
        { id: "return", name: "Repeat buyers", values: cohortReturn, color: "#2a9d8f" },
      ]),
    },
    carts: {
      abandonedCarts,
      abandonedValueCents,
      failedCheckouts: failedPending.length,
      stalePendingCents: failedPending.reduce((s, o) => s + o.totalCents, 0),
      weeklyAbandoned: lineFromBuckets(buckets, [
        {
          id: "abandoned",
          name: "Abandoned carts",
          values: abandonedWeekly,
          color: "#e76f51",
        },
      ]),
    },
    topProducts,
    signups: lineFromBuckets(buckets, [
      { id: "signups", name: "New accounts", values: signupsSeries, color: "#2a9d8f" },
    ]),
    orderStatus: statusGroups.map((g) => ({ status: g.status, count: g._count.id })),
    revenueSplit: {
      productsCents: Math.max(0, productRevenue - labelsRevenueCents),
      labelsCents: labelsRevenueCents,
    },
    qrCodes: qrCodes.map((q) => ({ code: q.publicCode, name: q.name, visits: q.visitCount })),
  };
}
