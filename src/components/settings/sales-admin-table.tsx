"use client";

import Link from "next/link";
import type { OrderStatus } from "@/generated/prisma/client";
import { Fragment, useMemo, useState, useTransition } from "react";
import { adminBulkUpdateOrderStatus, adminSetOrderArchived } from "@/app/actions/orders-admin";
import { OrderProgressDots } from "@/components/order-progress-dots";
import { cartLabelEntryDescription } from "@/lib/label-cart-display";
import { formatPriceUsd } from "@/lib/product-slug";
import { btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";

type SalesOrderRow = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  createdAtIso: string;
  stripeCheckoutSessionId: string | null;
  squarePaymentId: string | null;
  checkoutCouponDiscountCents: number;
  loyaltyPointsRedeemed: number;
  loyaltyRedemptionDiscountCents: number;
  loyaltyRedemptionCentsPerPointSnap: number;
  customer: {
    email: string;
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateRegion: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  guestEmail: string | null;
  guestDisplayName: string | null;
  guestCity: string | null;
  guestStateRegion: string | null;
  guestPostalCode: string | null;
  guestCountry: string | null;
  lineItemsCount: number;
  labelLinesCount: number;
  labelLinesPreview: Array<{
    displayName: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  labelSubtotalCents: number;
  lineItemsPreview: Array<{
    id: string;
    productNameSnap: string;
    variantLabelSnap: string | null;
    variantSkuSnap: string | null;
    quantity: number;
  }>;
  likelyMissingLabelArchive: boolean;
  archivedAtIso: string | null;
};

type Props = {
  orders: SalesOrderRow[];
  emptyMessage: string;
};

function statusBadge(status: OrderStatus) {
  switch (status) {
    case "COMPLETE":
      return "border-emerald-600/50 bg-emerald-950/40 text-emerald-100";
    case "PAID":
      return "border-lagoon/50 bg-teal-900/30 text-teal-200";
    case "ACCEPTED":
      return "border-sky-600/45 bg-sky-950/35 text-sky-100";
    case "FULFILLED":
      return "border-palm-mid/50 bg-green-900/35 text-green-100";
    case "SHIPPED":
      return "border-violet-600/45 bg-violet-950/40 text-violet-100";
    case "CANCELLED":
      return "border-coral/40 bg-red-950/40 text-red-200";
    default:
      return "border-amber-600/45 bg-amber-950/40 text-amber-100";
  }
}

function customerName(customer: NonNullable<SalesOrderRow["customer"]>) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return customer.displayName?.trim() || fullName || customer.email;
}

function customerLocationLine(customer: NonNullable<SalesOrderRow["customer"]>) {
  const cityState = [customer.city, customer.stateRegion].filter(Boolean).join(", ").trim();
  const parts = [cityState, customer.country?.trim(), customer.postalCode?.trim()].filter(Boolean);
  return parts.length ? parts.join(". ") : null;
}

function paymentKind(order: SalesOrderRow): "stripe" | "square" | "none" {
  if (order.stripeCheckoutSessionId) return "stripe";
  if (order.squarePaymentId) return "square";
  return "none";
}

const ACTIVE_DEFAULT = "ACTIVE";

const BULK_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PAID", label: "Paid" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "COMPLETE", label: "Complete" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "PENDING", label: "Pending (unpaid)" },
];

export function SalesAdminTable({ orders, emptyMessage }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ACTIVE_DEFAULT);
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [archivePending, startArchiveTransition] = useTransition();
  const [bulkPending, startBulkTransition] = useTransition();

  const statuses = useMemo(() => Array.from(new Set(orders.map((o) => o.status))).sort(), [orders]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = orders.filter((o) => {
      const isArchived = Boolean(o.archivedAtIso);
      if (!showArchived && isArchived) return false;
      if (showArchived && !isArchived) return false;
      if (statusFilter === ACTIVE_DEFAULT) {
        if (o.status === "COMPLETE" || o.status === "CANCELLED") return false;
      } else if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (paymentFilter !== "ALL" && paymentKind(o) !== paymentFilter.toLowerCase()) return false;
      if (!q) return true;

      const address = o.customer
        ? [o.customer.city, o.customer.stateRegion, o.customer.country, o.customer.postalCode].filter(Boolean).join(" ").toLowerCase()
        : [o.guestCity, o.guestStateRegion, o.guestCountry, o.guestPostalCode].filter(Boolean).join(" ").toLowerCase();
      const haystack = [
        o.id,
        o.status,
        o.customer ? customerName(o.customer) : o.guestDisplayName ?? "",
        o.customer?.email ?? o.guestEmail ?? "",
        o.customer?.id ?? "",
        o.stripeCheckoutSessionId ?? "",
        o.squarePaymentId ?? "",
        address,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "DATE_ASC":
          return new Date(a.createdAtIso).getTime() - new Date(b.createdAtIso).getTime();
        case "TOTAL_DESC":
          return b.totalCents - a.totalCents;
        case "TOTAL_ASC":
          return a.totalCents - b.totalCents;
        case "STATUS_ASC":
          return a.status.localeCompare(b.status);
        case "DATE_DESC":
        default:
          return new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime();
      }
    });

    return filtered;
  }, [orders, paymentFilter, search, showArchived, sortBy, statusFilter]);

  function clearControls() {
    setSearch("");
    setStatusFilter(ACTIVE_DEFAULT);
    setPaymentFilter("ALL");
    setShowArchived(false);
    setSortBy("DATE_DESC");
    setExpandedRowId(null);
    setSelectedIds(new Set());
    setBulkMenuOpen(false);
  }

  const visibleIds = useMemo(() => filteredAndSorted.map((o) => o.id), [filteredAndSorted]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const applyBulkStatus = (status: OrderStatus) => {
    if (status === "CANCELLED" && !window.confirm(`Set ${selectedIds.size} order(s) to Cancelled?`)) {
      return;
    }
    setBulkMsg("");
    setBulkMenuOpen(false);
    startBulkTransition(async () => {
      const r = await adminBulkUpdateOrderStatus([...selectedIds], status);
      if (!r.ok) {
        setBulkMsg(r.error);
        return;
      }
      setBulkMsg(`Updated ${r.updated} order(s) to ${status}.`);
      setSelectedIds(new Set());
    });
  };

  const toggleArchive = (orderId: string, archived: boolean) => {
    startArchiveTransition(() => {
      void adminSetOrderArchived(orderId, archived);
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded border border-palm/25 bg-surf/40 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order id, customer, location, payment id..."
            className="w-full rounded border border-palm/30 bg-white px-3 py-2 text-sm text-ink outline-none ring-lagoon/30 focus:ring dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-palm/30 bg-white px-3 py-2 text-sm text-ink outline-none ring-lagoon/30 focus:ring dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value={ACTIVE_DEFAULT}>Open (hide complete & cancelled)</option>
            <option value="ALL">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded border border-palm/30 bg-white px-3 py-2 text-sm text-ink outline-none ring-lagoon/30 focus:ring dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ALL">All payments</option>
            <option value="STRIPE">Stripe</option>
            <option value="SQUARE">Square</option>
            <option value="NONE">None</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded border border-palm/30 bg-white px-3 py-2 text-sm text-ink outline-none ring-lagoon/30 focus:ring dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="DATE_DESC">Newest first</option>
            <option value="DATE_ASC">Oldest first</option>
            <option value="TOTAL_DESC">Total: high to low</option>
            <option value="TOTAL_ASC">Total: low to high</option>
            <option value="STATUS_ASC">Status: A-Z</option>
          </select>
          <label className="flex items-center gap-2 self-center text-sm font-bold text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 accent-palm"
            />
            Archived only
          </label>
          <button
            type="button"
            onClick={clearControls}
            className={btnSecondaryMd}
          >
            Clear
          </button>
        </div>
      </div>

      {someSelected ? (
        <div className="flex flex-wrap items-center gap-3 rounded border-2 border-palm bg-palm/10 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-950/30">
          <span className="text-sm font-bold text-palm dark:text-emerald-200">
            {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <div className="relative">
            <button
              type="button"
              className={btnSecondarySm}
              onClick={() => setBulkMenuOpen((o) => !o)}
            >
              Set status ▾
            </button>
            {bulkMenuOpen ? (
              <ul className="absolute left-0 top-full z-20 mt-1 min-w-[12rem] rounded border-2 border-palm bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
                {BULK_STATUS_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm font-bold hover:bg-surf dark:hover:bg-zinc-800"
                      onClick={() => applyBulkStatus(opt.value)}
                      disabled={bulkPending}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            className="text-sm font-bold text-ink/70 underline dark:text-zinc-300"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
          {bulkMsg ? <span className="text-xs font-bold text-palm">{bulkMsg}</span> : null}
        </div>
      ) : null}

      <div className="admin-table-shell overflow-x-auto rounded border border-palm/25 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900/40">
        <table className="admin-striped w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-palm/30">
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all visible orders"
                  className="h-4 w-4 accent-palm"
                />
              </th>
              <th className="px-3 py-3 font-bold">Date</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 font-bold">Customer</th>
              <th className="px-3 py-3 font-bold text-right">Total</th>
              <th className="px-3 py-3 font-bold text-right">Items</th>
              <th className="px-3 py-3 font-bold">Payment</th>
              <th className="px-3 py-3 font-bold text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr className="admin-empty-row border-b border-palm/15">
                <td colSpan={8} className="px-3 py-8 text-center text-ink/60 dark:text-zinc-500">
                  {orders.length === 0 ? emptyMessage : "No results match your filters."}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((o) => {
                const isExpanded = expandedRowId === o.id;
                const locationLine = o.customer ? customerLocationLine(o.customer) : null;
                return (
                  <Fragment key={o.id}>
                    <tr
                      className={`border-b border-palm/15 transition ${isExpanded ? "bg-surf/45 dark:bg-zinc-900/50" : ""} ${selectedIds.has(o.id) ? "bg-palm/5 dark:bg-emerald-950/20" : ""}`}
                    >
                      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          aria-label={`Select order ${o.id}`}
                          className="h-4 w-4 accent-palm"
                        />
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2.5 cursor-pointer"
                        onClick={() => setExpandedRowId(isExpanded ? null : o.id)}
                      >
                        <span className="mr-2 inline-block text-xs text-ink/55 dark:text-zinc-500">{isExpanded ? "▾" : "▸"}</span>
                        <span className="text-ink/90 dark:text-zinc-200">{new Date(o.createdAtIso).toLocaleDateString()}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="inline-flex flex-col items-start">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${statusBadge(o.status)}`}
                          >
                            {o.status}
                          </span>
                          <OrderProgressDots status={o.status} className="mt-1" />
                        </div>
                      </td>
                      <td className="max-w-[280px] px-3 py-2.5">
                        {o.customer?.email ? (
                          <>
                            <span className="block truncate text-[15px] font-black leading-tight text-ink dark:text-zinc-100" title={customerName(o.customer)}>
                              {customerName(o.customer)}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[12px] text-ink/90 dark:text-zinc-300" title={o.customer.email}>
                              {o.customer.email}
                            </span>
                            {locationLine ? (
                              <span className="mt-0.5 block text-[11px] leading-tight text-ink/70 dark:text-zinc-400">{locationLine}</span>
                            ) : (
                              <span className="mt-0.5 block text-[11px] text-ink/50 dark:text-zinc-500">No saved location</span>
                            )}
                          </>
                        ) : o.guestEmail ? (
                          <>
                            <span className="block truncate text-[15px] font-black leading-tight text-ink dark:text-zinc-100">
                              {o.guestDisplayName?.trim() || "Guest"}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[12px] text-ink/90 dark:text-zinc-300">
                              {o.guestEmail}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-ink/55 dark:text-zinc-500">Guest checkout</span>
                          </>
                        ) : (
                          <span className="text-ink/60 dark:text-zinc-500">Guest / no account link</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-ink dark:text-zinc-100">
                        {formatPriceUsd(o.totalCents)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right dark:text-zinc-200">
                        {o.lineItemsCount + o.labelLinesCount}
                        {o.labelLinesCount > 0 ? (
                          <span className="mt-0.5 block text-[10px] font-normal text-ink/55 dark:text-zinc-500">
                            {o.labelLinesCount} label{o.labelLinesCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[200px] px-3 py-2.5">
                        {o.stripeCheckoutSessionId ? (
                          <span className="font-mono text-[11px] text-ink/80 dark:text-zinc-400" title={o.stripeCheckoutSessionId}>
                            Stripe cs_…
                          </span>
                        ) : null}
                        {o.squarePaymentId ? (
                          <span className="mt-1 block font-mono text-[11px] text-ink/80 dark:text-zinc-400" title={o.squarePaymentId}>
                            Square …
                          </span>
                        ) : null}
                        {!o.stripeCheckoutSessionId && !o.squarePaymentId ? (
                          <span className="text-xs text-ink/50 dark:text-zinc-500">—</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold">
                        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/settings/sales/${o.id}`}
                            className="text-lagoon-dark underline hover:no-underline dark:text-emerald-300"
                          >
                            View →
                          </Link>
                          <button
                            type="button"
                            disabled={archivePending}
                            className="text-[10px] font-bold text-ink/55 underline hover:text-coral disabled:opacity-50 dark:text-zinc-400"
                            onClick={() => toggleArchive(o.id, !o.archivedAtIso)}
                          >
                            {o.archivedAtIso ? "Unarchive" : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b border-palm/15 bg-surf/30 dark:bg-zinc-900/30">
                        <td colSpan={8} className="px-3 pb-3 pt-1">
                          <div className="grid gap-2 text-xs text-ink/80 dark:text-zinc-300 sm:grid-cols-5">
                            <div>
                              <span className="font-bold text-ink dark:text-zinc-100">Order:</span> {o.id}
                            </div>
                            <div>
                              <span className="font-bold text-ink dark:text-zinc-100">Subtotal:</span> {formatPriceUsd(o.subtotalCents)}
                            </div>
                            <div>
                              <span className="font-bold text-ink dark:text-zinc-100">Tax:</span> {formatPriceUsd(o.taxCents)}
                            </div>
                            <div>
                              <span className="font-bold text-ink dark:text-zinc-100">Shipping:</span> {formatPriceUsd(o.shippingCents)}
                            </div>
                            <div>
                              <span className="font-bold text-ink dark:text-zinc-100">Payment:</span>{" "}
                              {o.stripeCheckoutSessionId ? "Stripe" : o.squarePaymentId ? "Square" : "None"}
                            </div>
                          </div>
                          {o.checkoutCouponDiscountCents > 0 || o.loyaltyPointsRedeemed > 0 ? (
                            <div className="mt-2 space-y-1 text-xs text-ink/80 dark:text-zinc-300">
                              {o.checkoutCouponDiscountCents > 0 ? (
                                <p>
                                  <span className="font-bold text-ink dark:text-zinc-100">Promo (merchandise):</span> −
                                  {formatPriceUsd(o.checkoutCouponDiscountCents)}
                                </p>
                              ) : null}
                              {o.loyaltyPointsRedeemed > 0 ? (
                                <p>
                                  <span className="font-bold text-ink dark:text-zinc-100">Loyalty:</span>{" "}
                                  {o.loyaltyPointsRedeemed} pts → −{formatPriceUsd(o.loyaltyRedemptionDiscountCents)}{" "}
                                  merchandise
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="mt-3">
                            <p className="mb-1 text-xs font-bold text-ink dark:text-zinc-100">Items</p>
                            <ul className="space-y-1 text-xs text-ink/80 dark:text-zinc-300">
                              {o.lineItemsPreview.map((li) => (
                                <li key={li.id} className="truncate">
                                  <span className="font-bold">{li.quantity}x</span>{" "}
                                  <span>
                                    {li.productNameSnap}
                                    {li.variantLabelSnap ? <span className="text-ink/60 dark:text-zinc-500"> ({li.variantLabelSnap})</span> : null}
                                    {li.variantSkuSnap ? (
                                      <span className="font-mono text-ink/55 dark:text-zinc-500"> · {li.variantSkuSnap}</span>
                                    ) : null}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {o.lineItemsCount > o.lineItemsPreview.length ? (
                              <p className="mt-1 text-[11px] text-ink/60 dark:text-zinc-500">
                                +{o.lineItemsCount - o.lineItemsPreview.length} more product line(s)
                              </p>
                            ) : null}
                          </div>
                          {o.likelyMissingLabelArchive ? (
                            <p className="mt-3 rounded border border-amber-600/35 bg-amber-950/20 px-2 py-1.5 text-[11px] text-amber-100 dark:border-amber-500/30 dark:text-amber-50">
                              Custom labels were not archived on this order (checkout before label saving was enabled).
                              Open order detail for more info.
                            </p>
                          ) : null}
                          {o.labelLinesPreview.length > 0 ? (
                            <>
                              {o.labelLinesPreview.map((line, idx) => (
                                <li key={`label-${o.id}-${idx}`} className="truncate">
                                  <span className="font-bold">{line.quantity}x</span>{" "}
                                  <span>{cartLabelEntryDescription(line.displayName)}</span>
                                </li>
                              ))}
                              <li className="font-bold text-ink dark:text-zinc-200">
                                Custom labels subtotal: {formatPriceUsd(o.labelSubtotalCents)}
                              </li>
                            </>
                          ) : null}
                          <div className="mt-3">
                            <Link
                              href={`/settings/sales/${o.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-block rounded border border-palm/35 bg-white px-2.5 py-1 text-xs font-bold text-lagoon-dark underline hover:no-underline dark:border-zinc-600 dark:bg-zinc-950 dark:text-emerald-300"
                            >
                              View more →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
