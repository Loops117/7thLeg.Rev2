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
                className="account-order-card [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
              >
                <details className="group">
                  <summary className="account-order-card__summary">
                    <span className="font-bold" style={{ color: "var(--product-card-title)" }}>
                      <span
                        aria-hidden
                        className="account-panel__muted mr-2 inline-block text-xs transition-transform select-none group-open:rotate-90"
                      >
                        ▶
                      </span>
                      {o.createdAt.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wide">{o.status}</span>
                    <span className="text-sm font-black" style={{ color: "var(--product-card-title)" }}>
                      {formatPriceUsd(o.totalCents)}
                    </span>
                  </summary>
                  <div className="account-order-card__body">
                    <OrderProgressBar status={o.status} />
                    <p className="account-panel__muted font-mono text-[11px]">
                      Order id: <span className="break-all">{o.id}</span>
                    </p>
                    <dl className="account-order-card__totals">
                      <div className="flex justify-between gap-4">
                        <dt>Subtotal</dt>
                        <dd>{formatPriceUsd(o.subtotalCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Tax</dt>
                        <dd>{formatPriceUsd(o.taxCents)}</dd>
                      </div>
                      {snap ? (
                        <div className="flex justify-between gap-4">
                          <dt>Shipping method</dt>
                          <dd className="max-w-[60%] text-right font-semibold">{snap}</dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-4">
                        <dt>Shipping</dt>
                        <dd>{formatPriceUsd(o.shippingCents)}</dd>
                      </div>
                      <div
                        className="flex justify-between gap-4 border-t pt-2"
                        style={{ borderColor: "color-mix(in srgb, var(--product-card-border) 24%, transparent)" }}
                      >
                        <dt className="font-black" style={{ color: "var(--product-card-title)" }}>
                          Total paid
                        </dt>
                        <dd className="font-black" style={{ color: "var(--product-card-title)" }}>
                          {formatPriceUsd(o.totalCents)}
                        </dd>
                      </div>
                    </dl>

                    {track ? (
                      <div
                        className="mt-3 rounded border px-3 py-2"
                        style={{
                          borderColor: "color-mix(in srgb, var(--product-card-border) 32%, transparent)",
                          backgroundColor: "color-mix(in srgb, var(--lagoon) 10%, var(--product-card-bg) 90%)",
                        }}
                      >
                        <p className="account-panel__dt">Tracking</p>
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
                          <p className="account-panel__dd mt-1 break-all font-mono text-sm">{track}</p>
                        )}
                        <p className="account-panel__muted mt-2 break-all font-mono text-[11px]">
                          {o.trackingCarrier !== "NONE" ? `${o.trackingCarrier}: ` : ""}
                          {track}
                        </p>
                      </div>
                    ) : null}

                    <table className="account-order-card__table">
                      <thead>
                        <tr>
                          <th className="pb-2 pr-2">Items</th>
                          <th className="pb-2 pr-2 text-right">Qty</th>
                          <th className="pb-2 pr-2 text-right">Each</th>
                          <th className="pb-2 text-right">Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.lineItems.map((li) => (
                          <tr key={li.id}>
                            <td className="py-2 pr-2">
                              <span className="font-semibold">{li.productNameSnap}</span>
                              {li.variantLabelSnap ? (
                                <span className="account-panel__muted ml-1 text-xs">({li.variantLabelSnap})</span>
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
                            <td className="py-2 text-right font-bold tabular-nums" style={{ color: "var(--product-card-title)" }}>
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
