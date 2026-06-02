"use client";

import { ReportDateRangeBar } from "@/components/settings/reports/report-date-range-bar";
import { ReportLineChart } from "@/components/settings/reports/report-line-chart";
import type { ReportsBundle } from "@/lib/reports/queries";
import { formatPriceUsd } from "@/lib/product-slug";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-palm/20 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-900/50">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/55 dark:text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-palm dark:text-emerald-300">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-ink/60 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded border-2 border-palm/20 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/30 sm:p-5">
      <h2 className="text-lg font-black text-palm dark:text-emerald-300">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ReportsDashboard({ data }: { data: ReportsBundle }) {
  const { range } = data;

  return (
    <div className="space-y-6">
      <ReportDateRangeBar range={range} />

      <nav className="flex flex-wrap gap-2 text-xs font-bold">
        {[
          ["sales", "Sales"],
          ["traffic", "Traffic"],
          ["labels", "Labels"],
          ["retention", "Retention"],
          ["carts", "Carts"],
          ["products", "Top products"],
          ["more", "More"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded border border-palm/25 px-2 py-1 text-palm hover:bg-lagoon/10 dark:border-zinc-600 dark:text-zinc-200"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="sales"
        title="Sales"
        description="Paid and fulfilled orders (excludes pending and cancelled). Revenue uses order total including tax and shipping."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <StatCard label="Revenue" value={formatPriceUsd(data.sales.totals.revenueCents)} />
          <StatCard label="Orders" value={String(data.sales.totals.orders)} />
        </div>
        <ReportLineChart data={data.sales} dollarAxis />
      </Section>

      <Section
        id="traffic"
        title="Impressions & visits"
        description={data.traffic.trackingNote}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <StatCard label="Impressions" value={data.traffic.totals.impressions.toLocaleString()} />
          <StatCard label="Visits" value={data.traffic.totals.visits.toLocaleString()} />
        </div>
        <ReportLineChart data={data.traffic} />
      </Section>

      <Section
        id="labels"
        title="Labels created"
        description="Saved designs, label lines on paid orders, and label rows added to carts."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Designs saved" value={String(data.labels.totals.designsSaved)} />
          <StatCard label="Labels ordered (qty)" value={String(data.labels.totals.labelsOrdered)} />
          <StatCard label="Added to cart (qty)" value={String(data.labels.totals.cartAdds)} />
        </div>
        <ReportLineChart data={data.labels} />
      </Section>

      <Section
        id="retention"
        title="Customer retention"
        description="Signups and customers with more than one paid order in the selected period."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="New accounts" value={String(data.retention.newCustomers)} />
          <StatCard
            label="Repeat buyers"
            value={String(data.retention.returningCustomers)}
            hint="Customers with 2+ paid orders in range"
          />
          <StatCard label="Repeat rate" value={`${data.retention.repeatRatePercent}%`} />
          <StatCard label="Avg orders / buyer" value={String(data.retention.avgOrdersPerCustomer)} />
        </div>
        <p className="mb-2 text-xs font-bold text-ink/70 dark:text-zinc-400">Weekly signups vs repeat buyers</p>
        <ReportLineChart data={data.retention.cohortChart} />
      </Section>

      <Section
        id="carts"
        title="Abandoned & failed carts"
        description="Carts with items that were not followed by a paid order (logged-in customers). Failed checkouts are pending orders older than 1 hour with a payment session started."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Abandoned carts" value={String(data.carts.abandonedCarts)} />
          <StatCard
            label="Est. cart value"
            value={formatPriceUsd(data.carts.abandonedValueCents)}
            hint="List prices; not checkout-priced"
          />
          <StatCard label="Failed checkouts" value={String(data.carts.failedCheckouts)} />
          <StatCard label="Failed checkout value" value={formatPriceUsd(data.carts.stalePendingCents)} />
        </div>
        <ReportLineChart data={data.carts.weeklyAbandoned} />
      </Section>

      <Section id="products" title="Top products" description="By merchandise line revenue in the selected range.">
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-ink/65">No product sales in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="border-b-2 border-palm/30 font-bold text-palm">
                <tr>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((row) => (
                  <tr key={row.name} className="border-b border-palm/10">
                    <td className="px-2 py-2 font-medium">{row.name}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{row.quantity}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-bold">
                      {formatPriceUsd(row.revenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div id="more" className="grid gap-6 lg:grid-cols-2">
        <Section id="signups" title="New customer signups">
          <ReportLineChart data={data.signups} />
        </Section>

        <Section
          id="revenue-split"
          title="Revenue mix"
          description="Merchandise subtotal vs custom label line revenue on paid orders."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Products" value={formatPriceUsd(data.revenueSplit.productsCents)} />
            <StatCard label="Custom labels" value={formatPriceUsd(data.revenueSplit.labelsCents)} />
          </div>
        </Section>

        <Section id="order-status" title="Orders by status" description="All orders created in range, any status.">
          <ul className="space-y-2 text-sm">
            {data.orderStatus.map((row) => (
              <li key={row.status} className="flex justify-between gap-2 border-b border-palm/10 py-1">
                <span className="font-bold text-ink dark:text-zinc-200">{row.status}</span>
                <span className="tabular-nums font-bold text-palm">{row.count}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="qr"
          title="QR code scans"
          description="Lifetime scan totals per code (not filtered by date — historical aggregate)."
        >
          {data.qrCodes.length === 0 ? (
            <p className="text-sm text-ink/65">No QR codes configured.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.qrCodes.map((q) => (
                <li key={q.code} className="flex justify-between gap-2">
                  <span>
                    <span className="font-mono font-bold">{q.code}</span>
                    <span className="ml-2 text-ink/65">{q.name}</span>
                  </span>
                  <span className="tabular-nums font-bold">{q.visits.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
