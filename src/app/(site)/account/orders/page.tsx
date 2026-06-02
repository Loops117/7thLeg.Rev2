import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { OrderProgressBar } from "@/components/order-progress-bar";
import { OrderLabelProductTableRows } from "@/components/order-label-product-table-rows";
import { getLabelFulfillmentRuntimeSettings } from "@/lib/label-fulfillment-print-settings";
import { orderLabelLineToDisplay } from "@/lib/order-label-display";
import type { OrderLabelLineRecord } from "@/lib/order-label-entries";
import { trackingCarrierLabel } from "@/lib/order-display";
import { trackingUrlForCarrier } from "@/lib/tracking-url";
import { prisma } from "@/lib/prisma";
import { btnMainMd } from "@/lib/btn-theme-classes";
import { formatPriceUsd } from "@/lib/product-slug";

export default async function AccountOrdersPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Orders</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/orders" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            create an account
          </Link>{" "}
          to see your orders.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Orders</h1>
        <p className="mt-6 text-ink/80">Order history is available on a customer account.</p>
      </div>
    );
  }

  const [customer, labelFulfillment] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: session.user.id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            status: true,
            createdAt: true,
            subtotalCents: true,
            taxCents: true,
            shippingCents: true,
            totalCents: true,
            shippingLabelSnap: true,
            trackingNumber: true,
            trackingCarrier: true,
            lineItems: {
              orderBy: { id: "asc" },
              select: {
                id: true,
                productNameSnap: true,
                variantLabelSnap: true,
                quantity: true,
                unitPriceCents: true,
                lineTotalCents: true,
                product: { select: { slug: true } },
              },
            },
            labelLines: {
              orderBy: { sortOrder: "asc" },
              include: { template: true },
            },
          },
        },
      },
    }),
    getLabelFulfillmentRuntimeSettings(),
  ]);

  if (!customer) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Orders</h1>
        <p className="mt-6 text-ink/80">We couldn’t load your profile. Try signing out and back in.</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Orders</h1>
      <p className="mt-4 max-w-3xl text-sm text-ink/70">
        Expand an order to see line items, prices, and shipping. Tracking appears here when the store adds it.
      </p>
      {customer.orders.length === 0 ? (
        <p className="mt-6 text-ink/75">No orders yet. When you complete a purchase, it will show up here.</p>
      ) : (
        <ul className="mt-6 max-w-3xl space-y-2">
          {customer.orders.map((o) => {
            const snap = (o.shippingLabelSnap ?? "").trim();
            const track = (o.trackingNumber ?? "").trim();
            const trackHref = trackingUrlForCarrier(o.trackingCarrier, track);
            const carrierName = trackingCarrierLabel(o.trackingCarrier);
            const labelLineRecords: OrderLabelLineRecord[] = o.labelLines.map((row) => ({
              id: row.id,
              displayName: row.displayName,
              quantity: row.quantity,
              unitCents: row.unitCents,
              lineTotalCents: row.lineTotalCents,
              documentJson: row.documentJson,
              templateId: row.templateId,
              dataRowLabel: row.dataRowLabel,
              widthMm: row.widthMm,
              heightMm: row.heightMm,
              labelsPerSheet: row.labelsPerSheet,
              sheetsCount: row.sheetsCount,
              sheetFormat: row.sheetFormat,
              template: row.template,
            }));
            const showLabels = labelFulfillment.showOnOrders && labelLineRecords.length > 0;
            const labelDisplayLines = showLabels ? labelLineRecords.map(orderLabelLineToDisplay) : [];
            return (
              <li
                key={o.id}
                className="overflow-hidden rounded border border-palm/25 bg-white/90 shadow-sm [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
              >
                <details className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-black/[0.03]">
                    <span className="font-bold text-palm">
                      <span
                        aria-hidden
                        className="mr-2 inline-block text-xs text-ink/50 transition-transform select-none group-open:rotate-90"
                      >
                        ▶
                      </span>
                      {o.createdAt.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wide text-ink/80">{o.status}</span>
                    <span className="text-sm font-black text-ink">{formatPriceUsd(o.totalCents)}</span>
                  </summary>
                  <div className="border-t border-palm/15 px-4 py-4 text-sm [&_tbody_tr:nth-child(odd)]:bg-surf/30">
                    <OrderProgressBar status={o.status} />
                    <p className="font-mono text-[11px] text-ink/55">
                      Order id: <span className="break-all">{o.id}</span>
                    </p>
                    <dl className="mt-3 grid gap-1 rounded border border-palm/15 bg-white/70 p-3">
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink/65">Subtotal</dt>
                        <dd className="font-bold text-ink">{formatPriceUsd(o.subtotalCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink/65">Tax</dt>
                        <dd className="font-bold text-ink">{formatPriceUsd(o.taxCents)}</dd>
                      </div>
                      {snap ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-ink/65">Shipping method</dt>
                          <dd className="max-w-[60%] text-right font-semibold text-ink">{snap}</dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink/65">Shipping</dt>
                        <dd className="font-bold text-ink">{formatPriceUsd(o.shippingCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-palm/15 pt-2">
                        <dt className="font-black text-palm">Total paid</dt>
                        <dd className="font-black text-ink">{formatPriceUsd(o.totalCents)}</dd>
                      </div>
                    </dl>

                    {track ? (
                      <div className="mt-3 rounded border border-palm/20 bg-lagoon-dark/10 px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-palm-mid">Tracking</p>
                        {trackHref ? (
                          <a
                            href={trackHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-2 ${btnMainMd}`}
                          >
                            {carrierName ? `Track on ${carrierName}` : "Track shipment"}
                          </a>
                        ) : (
                          <p className="mt-1 break-all font-mono text-sm text-ink">{track}</p>
                        )}
                        <p className="mt-2 break-all font-mono text-[11px] text-ink/70">
                          {o.trackingCarrier !== "NONE" ? `${o.trackingCarrier}: ` : ""}
                          {track}
                        </p>
                      </div>
                    ) : null}

                    <table className="mt-4 w-full min-w-[16rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-palm/30 text-xs font-bold uppercase tracking-wide text-palm-mid">
                          <th className="pb-2 pr-2">Items</th>
                          <th className="pb-2 pr-2 text-right">Qty</th>
                          <th className="pb-2 pr-2 text-right">Each</th>
                          <th className="pb-2 text-right">Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.lineItems.map((li) => (
                          <tr key={li.id} className="border-b border-palm/10">
                            <td className="py-2 pr-2">
                              <span className="font-semibold text-ink">{li.productNameSnap}</span>
                              {li.variantLabelSnap ? (
                                <span className="ml-1 text-xs text-ink/65">({li.variantLabelSnap})</span>
                              ) : null}
                              {li.product?.slug ? (
                                <>
                                  {" "}
                                  <Link
                                    href={`/product/${li.product.slug}`}
                                    className="text-xs font-medium text-lagoon-dark underline"
                                  >
                                    View
                                  </Link>
                                </>
                              ) : null}
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">{li.quantity}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{formatPriceUsd(li.unitPriceCents)}</td>
                            <td className="py-2 text-right font-bold tabular-nums">
                              {formatPriceUsd(li.lineTotalCents)}
                            </td>
                          </tr>
                        ))}
                        {showLabels ? (
                          <OrderLabelProductTableRows
                            displayLines={labelDisplayLines}
                            records={labelLineRecords}
                            variant="account"
                          />
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-sm text-ink/70">
        <Link href="/cart" className="font-bold text-lagoon-dark underline">
          View your cart
        </Link>
      </p>
    </div>
  );
}
