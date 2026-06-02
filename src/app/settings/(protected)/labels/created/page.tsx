import Link from "next/link";
import { Suspense } from "react";
import { CreatedLabelsGallery } from "@/components/settings/created-labels-gallery";
import { CreatedLabelsToolbar } from "@/components/settings/created-labels-toolbar";
import { formatCustomerFullName } from "@/lib/customer-display-name";
import { getLabelBuilderPublicConfig } from "@/lib/label-builder-public";
import { createdLabelsSearchWhere, formatAdminDate } from "@/lib/created-labels-admin";
import { buildCreatedLabelsGalleryItems } from "@/lib/created-labels-gallery";
import { labelTemplateRowToPickerOption } from "@/lib/label-editor/template-meta";
import { formatPriceUsd } from "@/lib/product-slug";
import { prisma } from "@/lib/prisma";

const LIST_LIMIT = 500;

type Props = { searchParams: Promise<{ q?: string }> };

function customerLabel(c: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
} | null): { id: string | null; label: string; email: string } {
  if (!c) return { id: null, label: "Guest / unknown", email: "—" };
  const name = formatCustomerFullName(c);
  return {
    id: c.id,
    label: name || c.email,
    email: c.email,
  };
}

export default async function SettingsCreatedLabelsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { designWhere, cartWhere, orderWhere } = createdLabelsSearchWhere(q);

  const [savedDesigns, cartLabels, customerBags, orderLabels, templates, counts, publicConfig] =
    await Promise.all([
    prisma.customerLabelDesign.findMany({
      where: designWhere,
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true, displayName: true },
        },
        template: { select: { id: true, name: true, widthMm: true, heightMm: true, active: true } },
        folder: { select: { name: true } },
      },
    }),
    prisma.cartLabelItem.findMany({
      where: cartWhere,
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      include: {
        template: { select: { id: true, name: true, widthMm: true, heightMm: true } },
        cart: {
          include: {
            customer: {
              select: { id: true, email: true, firstName: true, lastName: true, displayName: true },
            },
          },
        },
      },
    }),
    prisma.customerLabelBag.findMany({
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
      include: {
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true, displayName: true },
        },
      },
    }),
    prisma.orderLabelLine.findMany({
      where: orderWhere,
      orderBy: { order: { createdAt: "desc" } },
      take: LIST_LIMIT,
      include: {
        template: { select: { id: true, name: true, widthMm: true, heightMm: true } },
        order: {
          select: {
            id: true,
            createdAt: true,
            customer: {
              select: { id: true, email: true, firstName: true, lastName: true, displayName: true },
            },
          },
        },
      },
    }),
    prisma.labelTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            customerDesigns: true,
            cartLines: true,
            orderLines: true,
          },
        },
      },
    }),
    Promise.all([
      prisma.customerLabelDesign.count({ where: designWhere }),
      prisma.cartLabelItem.count({ where: cartWhere }),
      prisma.orderLabelLine.count({ where: orderWhere }),
    ]),
    getLabelBuilderPublicConfig(),
  ]);

  const [savedTotal, cartTotal, orderTotal] = counts;
  const templateMap = new Map(templates.map((t) => [t.id, labelTemplateRowToPickerOption(t)]));
  const { items: galleryItems, skipped: gallerySkipped } = buildCreatedLabelsGalleryItems(
    savedDesigns,
    cartLabels,
    customerBags.map((b) => ({
      customerId: b.customerId,
      itemsJson: b.itemsJson,
      customer: b.customer,
    })),
    templateMap,
    q,
  );

  return (
    <div className="max-w-6xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:text-emerald-300">
        Created labels
      </h1>
      <p className="mt-4 max-w-3xl text-ink/80 dark:text-zinc-400">
        All customer label work: saved editor designs, labels in carts (not yet ordered), and labels on orders.
        Label templates are the formats you define under{" "}
        <Link href="/settings/labels" className="font-bold text-palm underline dark:text-emerald-300">
          Overview
        </Link>
        .
      </p>

      <div className="mt-6">
        <Suspense fallback={<p className="text-xs text-ink/50">Loading search…</p>}>
          <CreatedLabelsToolbar initialQ={q} />
        </Suspense>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Label previews</h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-zinc-500">
          Grouped by customer. Label selection (bag), saved library designs, and cart lines (bundles expanded). Does
          not include order snapshots.
        </p>
        <CreatedLabelsGallery
          items={galleryItems}
          publicConfig={publicConfig}
          skipped={gallerySkipped}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">
          Saved designs
          <span className="ml-2 text-sm font-bold text-ink/50 dark:text-zinc-500">
            {savedDesigns.length}
            {savedTotal > savedDesigns.length ? ` of ${savedTotal}` : ""}
          </span>
        </h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-zinc-500">
          Labels customers saved in the editor (account library). Not the same as a completed purchase.
        </p>
        <div className="mt-3 overflow-x-auto rounded border-2 border-palm/20 dark:border-zinc-600">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="bg-surf/80 text-[10px] font-black uppercase text-palm/80 dark:bg-zinc-800 dark:text-emerald-300/90">
              <tr>
                <th className="px-3 py-2">Label name</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Folder</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palm/10 dark:divide-zinc-700">
              {savedDesigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-ink/50">
                    No saved designs{q ? " match your search" : ""}.
                  </td>
                </tr>
              ) : (
                savedDesigns.map((d) => {
                  const cust = customerLabel(d.customer);
                  return (
                    <tr key={d.id} className="bg-white dark:bg-zinc-900/40">
                      <td className="px-3 py-2 font-bold text-ink dark:text-zinc-100">{d.name}</td>
                      <td className="px-3 py-2">
                        {cust.id ? (
                          <Link
                            href={`/settings/customers/${encodeURIComponent(cust.id)}/wishlist`}
                            className="font-bold text-palm underline dark:text-emerald-300"
                          >
                            {cust.label}
                          </Link>
                        ) : (
                          cust.label
                        )}
                        <span className="block text-[10px] text-ink/50">{cust.email}</span>
                      </td>
                      <td className="px-3 py-2">
                        {d.template.name}
                        <span className="block text-[10px] text-ink/50">
                          {d.template.widthMm}×{d.template.heightMm} mm
                          {!d.template.active ? " · inactive" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2">{d.folder?.name ?? "Unfiled"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-ink/70">{formatAdminDate(d.updatedAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">
          Labels in carts
          <span className="ml-2 text-sm font-bold text-ink/50 dark:text-zinc-500">
            {cartLabels.length}
            {cartTotal > cartLabels.length ? ` of ${cartTotal}` : ""}
          </span>
        </h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-zinc-500">
          Custom labels added to a cart or bag but not necessarily purchased yet.
        </p>
        <div className="mt-3 overflow-x-auto rounded border-2 border-palm/20 dark:border-zinc-600">
          <table className="w-full min-w-[44rem] text-left text-xs">
            <thead className="bg-surf/80 text-[10px] font-black uppercase text-palm/80 dark:bg-zinc-800 dark:text-emerald-300/90">
              <tr>
                <th className="px-3 py-2">Display name</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Qty / sheets</th>
                <th className="px-3 py-2">Line total</th>
                <th className="px-3 py-2">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palm/10 dark:divide-zinc-700">
              {cartLabels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-ink/50">
                    No cart labels{q ? " match your search" : ""}.
                  </td>
                </tr>
              ) : (
                cartLabels.map((line) => {
                  const cust = customerLabel(line.cart.customer);
                  return (
                    <tr key={line.id} className="bg-white dark:bg-zinc-900/40">
                      <td className="px-3 py-2 font-bold text-ink dark:text-zinc-100">{line.displayName}</td>
                      <td className="px-3 py-2">
                        {cust.id ? (
                          <Link
                            href={`/settings/customers/${encodeURIComponent(cust.id)}/wishlist`}
                            className="font-bold text-palm underline dark:text-emerald-300"
                          >
                            {cust.label}
                          </Link>
                        ) : (
                          <span title={line.cart.sessionId ?? undefined}>Guest cart</span>
                        )}
                        <span className="block text-[10px] text-ink/50">{cust.email}</span>
                      </td>
                      <td className="px-3 py-2">
                        {line.template.name}
                        <span className="block text-[10px] text-ink/50">
                          {line.template.widthMm}×{line.template.heightMm} mm
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {line.quantity} label{line.quantity === 1 ? "" : "s"} · {line.sheetsCount} sheet
                        {line.sheetsCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-3 py-2">{formatPriceUsd(line.lineTotalCents)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-ink/70">
                        {formatAdminDate(line.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">
          Labels on orders
          <span className="ml-2 text-sm font-bold text-ink/50 dark:text-zinc-500">
            {orderLabels.length}
            {orderTotal > orderLabels.length ? ` of ${orderTotal}` : ""}
          </span>
        </h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-zinc-500">Purchased custom label lines (order snapshots).</p>
        <div className="mt-3 overflow-x-auto rounded border-2 border-palm/20 dark:border-zinc-600">
          <table className="w-full min-w-[44rem] text-left text-xs">
            <thead className="bg-surf/80 text-[10px] font-black uppercase text-palm/80 dark:bg-zinc-800 dark:text-emerald-300/90">
              <tr>
                <th className="px-3 py-2">Display name</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Qty / sheets</th>
                <th className="px-3 py-2">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palm/10 dark:divide-zinc-700">
              {orderLabels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-ink/50">
                    No order labels{q ? " match your search" : ""}.
                  </td>
                </tr>
              ) : (
                orderLabels.map((line) => {
                  const cust = customerLabel(line.order.customer);
                  return (
                    <tr key={line.id} className="bg-white dark:bg-zinc-900/40">
                      <td className="px-3 py-2 font-bold text-ink dark:text-zinc-100">{line.displayName}</td>
                      <td className="px-3 py-2">
                        {cust.id ? (
                          <Link
                            href={`/settings/customers/${encodeURIComponent(cust.id)}/wishlist`}
                            className="font-bold text-palm underline dark:text-emerald-300"
                          >
                            {cust.label}
                          </Link>
                        ) : (
                          cust.label
                        )}
                        <span className="block text-[10px] text-ink/50">{cust.email}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/settings/sales/${line.order.id}`}
                          className="font-bold text-palm underline dark:text-emerald-300"
                        >
                          View order
                        </Link>
                        <span className="block text-[10px] text-ink/50">{formatAdminDate(line.order.createdAt)}</span>
                      </td>
                      <td className="px-3 py-2">
                        {line.template.name}
                        <span className="block text-[10px] text-ink/50">
                          {line.template.widthMm}×{line.template.heightMm} mm
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {line.quantity} · {line.sheetsCount} sheet{line.sheetsCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-3 py-2">{formatPriceUsd(line.lineTotalCents)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">
          Label templates
          <span className="ml-2 text-sm font-bold text-ink/50 dark:text-zinc-500">{templates.length}</span>
        </h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-zinc-500">
          Formats available in the label editor. Edit templates on the{" "}
          <Link href="/settings/labels" className="font-bold underline">
            Labels overview
          </Link>
          .
        </p>
        <div className="mt-3 overflow-x-auto rounded border-2 border-palm/20 dark:border-zinc-600">
          <table className="w-full min-w-[36rem] text-left text-xs">
            <thead className="bg-surf/80 text-[10px] font-black uppercase text-palm/80 dark:bg-zinc-800 dark:text-emerald-300/90">
              <tr>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Saved designs</th>
                <th className="px-3 py-2">In carts</th>
                <th className="px-3 py-2">On orders</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palm/10 dark:divide-zinc-700">
              {templates.map((t) => (
                <tr key={t.id} className="bg-white dark:bg-zinc-900/40">
                  <td className="px-3 py-2 font-bold text-ink dark:text-zinc-100">{t.name}</td>
                  <td className="px-3 py-2">
                    {t.widthMm}×{t.heightMm} mm
                  </td>
                  <td className="px-3 py-2">{t.active ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2">{t._count.customerDesigns}</td>
                  <td className="px-3 py-2">{t._count.cartLines}</td>
                  <td className="px-3 py-2">{t._count.orderLines}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-ink/70">{formatAdminDate(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
