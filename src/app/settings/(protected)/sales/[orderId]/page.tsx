import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderAdminForm } from "@/components/settings/order-admin-form";
import { OrderLabelProductTableRows } from "@/components/order-label-product-table-rows";
import { OrderPickChecklist } from "@/components/settings/order-pick-checklist";
import { OrderLabelsPrintDownload } from "@/components/settings/order-labels-print-download";
import { orderLabelPrintSheetsZipFilenameForOrder } from "@/lib/order-label-print-zip";
import { orderLabelLineToDisplay } from "@/lib/order-label-display";
import { OrderMissingLabelsNotice } from "@/components/settings/order-missing-labels-notice";
import { getLabelFulfillmentRuntimeSettings } from "@/lib/label-fulfillment-print-settings";
import { orderLikelyMissingLabelArchive } from "@/lib/order-likely-had-labels";
import type { OrderLabelLineRecord } from "@/lib/order-label-entries";
import { prisma } from "@/lib/prisma";
import { formatPriceUsd } from "@/lib/product-slug";
import { cartLabelEntryDescription } from "@/lib/label-cart-display";
import { trackingUrlForCarrier } from "@/lib/tracking-url";

function parseAdminPickChecks(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k === "string" && typeof v === "boolean") out[k] = v;
  }
  return out;
}

function customerAddressLines(customer: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
}) {
  const cityState = [customer.city, customer.stateRegion].filter(Boolean).join(", ").trim();
  const parts = [
    customer.addressLine1,
    customer.addressLine2,
    [cityState, customer.postalCode].filter(Boolean).join(" "),
    customer.country,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  return parts;
}

type Props = { params: Promise<{ orderId: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const [order, labelPrintSettings] = await Promise.all([
    prisma.order.findUnique({
    where: { id: orderId.trim() },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
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
        include: {
          product: { select: { id: true, slug: true } },
        },
      },
      labelLines: {
        orderBy: { sortOrder: "asc" },
        include: { template: true },
      },
    },
  }),
    getLabelFulfillmentRuntimeSettings(),
  ]);

  if (!order) {
    notFound();
  }

  const labelLineRecords: OrderLabelLineRecord[] = order.labelLines.map((row) => ({
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

  const name =
    order.customer?.displayName?.trim() ||
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ").trim() ||
    null;
  const customerAddress = order.customer ? customerAddressLines(order.customer) : [];
  const customerHeading = name || order.customer?.email || "Guest";
  const productLineTotalCents = order.lineItems.reduce((s, li) => s + li.lineTotalCents, 0);
  const pickChecks = parseAdminPickChecks(order.adminPickChecksJson);
  const pickLines = [
    ...order.lineItems.map((li) => ({
      key: `li:${li.id}`,
      label: `${li.productNameSnap}${li.variantLabelSnap ? ` (${li.variantLabelSnap})` : ""}`,
      quantity: li.quantity,
      kind: "product" as const,
    })),
    ...order.labelLines.map((ll) => ({
      key: `label:${ll.id}`,
      label: cartLabelEntryDescription(ll.displayName),
      quantity: ll.quantity,
      kind: "label" as const,
    })),
  ];

  const showMissingLabelsNotice =
    labelLineRecords.length === 0 &&
    orderLikelyMissingLabelArchive({
      labelLineCount: labelLineRecords.length,
      labelMerchandiseCentsSnap: order.labelMerchandiseCentsSnap,
    });

  return (
    <div className="max-w-4xl space-y-8">
      <p className="text-sm font-medium">
        <Link href="/settings/sales" className="font-bold text-lagoon-dark underline">
          ← Sales
        </Link>
      </p>

      <header className="border-b-4 border-palm pb-3 dark:border-zinc-600">
        <h1 className="text-2xl font-black text-palm dark:text-emerald-200">Order detail</h1>
        <p className="mt-2 font-mono text-[13px] text-ink/70 dark:text-zinc-400">{order.id}</p>
        <p className="mt-1 text-sm text-ink/75 dark:text-zinc-200">{order.createdAt.toLocaleString()}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border-2 border-palm/20 bg-white/80 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
          <h2 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Customer</h2>
          {order.customer ? (
            <>
              <p className="mt-2 text-lg font-black leading-tight text-ink dark:text-zinc-100">{customerHeading}</p>
              {name ? (
                <p className="mt-1 font-mono text-sm text-ink/90 dark:text-zinc-300">{order.customer.email}</p>
              ) : null}
              {customerAddress.length > 0 ? (
                <div className="mt-2 space-y-0.5">
                  {customerAddress.map((line) => (
                    <p key={`${order.id}-${line}`} className="text-sm text-ink/80 dark:text-zinc-300">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink/60 dark:text-zinc-500">No saved address</p>
              )}
              <p className="mt-2">
                <Link href={`/settings/sales?customer=${order.customer.id}`} className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300">
                  View customer's other orders
                </Link>
              </p>
              <p className="mt-3 text-[11px] text-ink/55 dark:text-zinc-500">{order.customer.id}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/65 dark:text-zinc-400">No linked customer record (checkout guest).</p>
          )}
        </div>

        <OrderAdminForm
          orderId={order.id}
          currentStatus={order.status}
          currentTrackingNumber={order.trackingNumber ?? ""}
          currentTrackingCarrier={order.trackingCarrier}
        />
      </div>

      {(order.trackingNumber ?? "").trim() ? (
        <div className="rounded border-2 border-palm/20 bg-white/80 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
          <h2 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
            Tracking (customer-facing)
          </h2>
          <p className="mt-1 text-xs text-ink/65 dark:text-zinc-500">
            Carrier: <span className="font-bold text-ink dark:text-zinc-300">{order.trackingCarrier}</span>
          </p>
          <p className="mt-2 break-all font-mono text-sm text-ink dark:text-zinc-200">{order.trackingNumber.trim()}</p>
          {(() => {
            const href = trackingUrlForCarrier(order.trackingCarrier, order.trackingNumber ?? "");
            return href ? (
              <p className="mt-3">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-lagoon-dark underline dark:text-emerald-300"
                >
                  Open carrier tracking preview →
                </a>
              </p>
            ) : null;
          })()}
        </div>
      ) : null}

      <div className="rounded border-2 border-palm/20 bg-white/80 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
        <h2 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Totals</h2>
        <dl className="mt-3 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/70 dark:text-zinc-400">Subtotal</dt>
            <dd className="font-bold text-ink dark:text-zinc-100">{formatPriceUsd(order.subtotalCents)}</dd>
          </div>
          {order.checkoutCouponDiscountCents > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/70 dark:text-zinc-400">Promo discount (merchandise)</dt>
              <dd className="font-bold text-lagoon-dark dark:text-emerald-300">
                −{formatPriceUsd(order.checkoutCouponDiscountCents)}
              </dd>
            </div>
          ) : null}
          {order.loyaltyPointsRedeemed > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/70 dark:text-zinc-400">Loyalty points redeemed</dt>
              <dd className="text-right font-bold text-ink dark:text-zinc-100">
                {order.loyaltyPointsRedeemed} pts
                {order.loyaltyRedemptionCentsPerPointSnap > 0 ? (
                  <span className="block text-xs font-normal text-ink/65 dark:text-zinc-500">
                    @ {formatPriceUsd(order.loyaltyRedemptionCentsPerPointSnap)} per point → −
                    {formatPriceUsd(order.loyaltyRedemptionDiscountCents)} merchandise
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-ink/70 dark:text-zinc-400">Tax</dt>
            <dd className="font-bold text-ink dark:text-zinc-100">{formatPriceUsd(order.taxCents)}</dd>
          </div>
          {(order.shippingLabelSnap ?? "").trim() ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink/70 dark:text-zinc-400">Shipping method</dt>
              <dd className="text-right font-bold text-ink dark:text-zinc-100">{order.shippingLabelSnap}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-ink/70 dark:text-zinc-400">Shipping</dt>
            <dd className="font-bold text-ink dark:text-zinc-100">{formatPriceUsd(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-palm/20 pt-2 dark:border-zinc-600">
            <dt className="font-black text-palm dark:text-emerald-200">Total</dt>
            <dd className="font-black text-ink dark:text-zinc-100">{formatPriceUsd(order.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded border-2 border-palm/20 bg-white/80 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
        <h2 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Payment references</h2>
        {order.stripeCheckoutSessionId ? (
          <p className="mt-2 font-mono text-xs break-all text-ink dark:text-zinc-200">
            <span className="font-bold text-ink dark:text-zinc-300">Stripe Checkout Session: </span>
            {order.stripeCheckoutSessionId}
          </p>
        ) : null}
        {order.squarePaymentId ? (
          <p className="mt-2 font-mono text-xs break-all text-ink dark:text-zinc-200">
            <span className="font-bold text-ink dark:text-zinc-300">Square payment: </span>
            {order.squarePaymentId}
          </p>
        ) : null}
        {!order.stripeCheckoutSessionId && !order.squarePaymentId ? (
          <p className="mt-2 text-sm text-ink/60 dark:text-zinc-500">No external payment id recorded (pending or legacy).</p>
        ) : null}
      </div>

      {showMissingLabelsNotice ? <OrderMissingLabelsNotice /> : null}

      <OrderPickChecklist orderId={order.id} lines={pickLines} initialChecks={pickChecks} />

      <div>
        <h2 className="mb-3 text-lg font-black text-palm dark:text-emerald-200">Line items</h2>
        <div className="admin-table-shell overflow-x-auto rounded border border-palm/25 bg-white shadow-sm">
          <table className="admin-striped w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm/30">
                <th className="px-3 py-2 font-bold">Item</th>
                <th className="px-3 py-2 font-bold text-right">Qty</th>
                <th className="px-3 py-2 font-bold text-right">Unit</th>
                <th className="px-3 py-2 font-bold text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.map((li) => (
                <tr key={li.id} className="border-b border-palm/15">
                  <td className="px-3 py-2.5">
                    <span className="font-bold text-ink dark:text-zinc-100">{li.productNameSnap}</span>
                    {li.variantLabelSnap ? (
                      <span className="ml-2 text-xs text-ink/70 dark:text-zinc-400">({li.variantLabelSnap})</span>
                    ) : null}
                    {li.product ? (
                      <>
                        {" "}
                        <Link className="text-xs font-medium text-lagoon-dark underline" href={`/product/${li.product.slug}`}>
                          Store
                        </Link>
                        {" · "}
                        <Link
                          className="text-xs font-medium text-lagoon-dark underline"
                          href={`/settings/products/${li.product.id}/edit`}
                        >
                          Edit product
                        </Link>
                      </>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">{li.quantity}</td>
                  <td className="px-3 py-2.5 text-right">{formatPriceUsd(li.unitPriceCents)}</td>
                  <td className="px-3 py-2.5 text-right font-bold">{formatPriceUsd(li.lineTotalCents)}</td>
                </tr>
              ))}
              {labelLineRecords.length > 0 ? (
                <OrderLabelProductTableRows
                  displayLines={labelLineRecords.map(orderLabelLineToDisplay)}
                  records={labelLineRecords}
                  variant="admin"
                />
              ) : null}
            </tbody>
          </table>
          {labelLineRecords.length > 0 ? (
            <div className="px-3 pb-3">
              <OrderLabelsPrintDownload
                orderId={order.id}
                lines={labelLineRecords}
                printSettings={labelPrintSettings}
                downloadFilename={orderLabelPrintSheetsZipFilenameForOrder(order.customer, order.createdAt)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
