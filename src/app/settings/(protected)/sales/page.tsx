import Link from "next/link";
import { SalesAdminTable } from "@/components/settings/sales-admin-table";
import { orderLikelyMissingLabelArchive } from "@/lib/order-likely-had-labels";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ customer?: string }> };

export default async function SettingsSalesPage({ searchParams }: Props) {
  const { customer: rawCustomerId } = await searchParams;
  const customerId = rawCustomerId?.trim() || null;

  let filterEmail: string | null = null;
  if (customerId) {
    const cus = await prisma.customer.findUnique({ where: { id: customerId }, select: { email: true } });
    filterEmail = cus?.email ?? null;
  }

  const orders = await prisma.order.findMany({
    where: customerId ? { customerId } : {},
    orderBy: { createdAt: "desc" },
    take: 250,
    select: {
      id: true,
      status: true,
      totalCents: true,
      subtotalCents: true,
      labelMerchandiseCentsSnap: true,
      taxCents: true,
      shippingCents: true,
      createdAt: true,
      archivedAt: true,
      stripeCheckoutSessionId: true,
      squarePaymentId: true,
      checkoutCouponDiscountCents: true,
      loyaltyPointsRedeemed: true,
      loyaltyRedemptionDiscountCents: true,
      loyaltyRedemptionCentsPerPointSnap: true,
      customer: {
        select: {
          email: true,
          id: true,
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
      },
      lineItems: {
        orderBy: { id: "asc" },
        take: 5,
        select: {
          id: true,
          productNameSnap: true,
          variantLabelSnap: true,
          variantSkuSnap: true,
          quantity: true,
          lineTotalCents: true,
        },
      },
      _count: { select: { lineItems: true, labelLines: true } },
      labelLines: {
        select: { quantity: true, displayName: true, lineTotalCents: true, unitCents: true },
      },
    },
  });
  const rows = orders.map((o) => {
    const labelTotalQuantity = o.labelLines.reduce((s, row) => s + row.quantity, 0);
    const labelLinesPreview = o.labelLines.map((row) => ({
      displayName: row.displayName,
      quantity: row.quantity,
      lineTotalCents: row.lineTotalCents,
    }));
    const productLineTotalCents = o.lineItems.reduce((s, li) => s + li.lineTotalCents, 0);
    return {
    id: o.id,
    status: o.status,
    totalCents: o.totalCents,
    subtotalCents: o.subtotalCents,
    taxCents: o.taxCents,
    shippingCents: o.shippingCents,
    createdAtIso: o.createdAt.toISOString(),
    archivedAtIso: o.archivedAt?.toISOString() ?? null,
    stripeCheckoutSessionId: o.stripeCheckoutSessionId,
    squarePaymentId: o.squarePaymentId,
    checkoutCouponDiscountCents: o.checkoutCouponDiscountCents,
    loyaltyPointsRedeemed: o.loyaltyPointsRedeemed,
    loyaltyRedemptionDiscountCents: o.loyaltyRedemptionDiscountCents,
    loyaltyRedemptionCentsPerPointSnap: o.loyaltyRedemptionCentsPerPointSnap,
    customer: o.customer,
    lineItemsCount: o._count.lineItems,
    labelLinesCount: o._count.labelLines,
    labelTotalQuantity,
    labelLinesPreview,
    labelSubtotalCents: o.labelLines.reduce((s, row) => s + row.lineTotalCents, 0),
    lineItemsPreview: o.lineItems,
    likelyMissingLabelArchive:
      o._count.labelLines === 0 &&
      orderLikelyMissingLabelArchive({
        labelLineCount: o._count.labelLines,
        labelMerchandiseCentsSnap: o.labelMerchandiseCentsSnap,
      }),
    };
  });

  return (
    <div className="max-w-6xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:border-zinc-600 dark:text-emerald-200">
        Sales
      </h1>
      <p className="mt-4 max-w-2xl text-ink/80 dark:text-zinc-400">
        Checkout orders (newest first{orders.length === 250 ? ", first 250 shown" : ""}). Open <strong className="text-ink dark:text-zinc-200">View</strong> for line items and Stripe / Square references. Updating status tracks fulfillment locally — it does not issue refunds.
      </p>
      {customerId ? (
        <p className="mt-3 rounded border border-palm/25 bg-surf/50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
          Showing orders linked to{" "}
          <span className="font-mono">{filterEmail || `customer id ${customerId.slice(0, 8)}…`}</span>.{" "}
          <Link href="/settings/sales" className="font-bold text-lagoon-dark underline dark:text-emerald-300">
            Clear filter → all sales
          </Link>
        </p>
      ) : null}

      <div className="mt-8">
        <SalesAdminTable
          orders={rows}
          emptyMessage={customerId ? "No orders for this customer." : "No orders yet. Completed checkouts appear here once customers pay."}
        />
      </div>
    </div>
  );
}
