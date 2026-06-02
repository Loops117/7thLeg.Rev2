"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import type { OrderStatus, TrackingCarrier } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { adminUpdateOrder } from "@/app/actions/orders-admin";
import { OrderProgressDots } from "@/components/order-progress-dots";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "Pending (unpaid)" },
  { value: "PAID", label: "Paid" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "COMPLETE", label: "Complete" },
  { value: "CANCELLED", label: "Cancelled" },
];

const CARRIER_OPTIONS: { value: TrackingCarrier; label: string }[] = [
  { value: "NONE", label: "— Choose carrier —" },
  { value: "USPS", label: "USPS" },
  { value: "UPS", label: "UPS" },
  { value: "FEDEX", label: "FedEx" },
  { value: "DHL", label: "DHL" },
  { value: "OTHER", label: "Other / custom URL" },
];

export function OrderAdminForm({
  orderId,
  currentStatus,
  currentTrackingNumber,
  currentTrackingCarrier,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  currentTrackingNumber: string;
  currentTrackingCarrier: TrackingCarrier;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<OrderStatus>(currentStatus);
  const [carrier, setCarrier] = useState<TrackingCarrier>(currentTrackingCarrier);
  const [tracking, setTracking] = useState(currentTrackingNumber);

  useEffect(() => {
    setSel(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setTracking(currentTrackingNumber);
  }, [currentTrackingNumber]);

  useEffect(() => {
    setCarrier(currentTrackingCarrier);
  }, [currentTrackingCarrier]);

  const dirty =
    sel !== currentStatus || tracking !== currentTrackingNumber || carrier !== currentTrackingCarrier;

  function save() {
    setErr(null);
    if (!dirty) return;
    startTransition(async () => {
      try {
        await adminUpdateOrder(orderId, {
          status: sel,
          trackingNumber: tracking,
          trackingCarrier: carrier,
        });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not update order.");
      }
    });
  }

  return (
    <div className="rounded border border-palm/25 bg-white/70 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
      <p className="text-xs font-bold uppercase tracking-wide text-palm dark:text-emerald-300">Order &amp; fulfillment</p>
      <div className="mt-2">
        <p className="mb-1 text-[11px] font-medium text-ink/65 dark:text-zinc-400">Customer progress preview</p>
        <OrderProgressDots status={sel} className="w-full" />
      </div>
      <p className="mt-1 text-xs text-ink/65 dark:text-zinc-500">
        Tracking uses the carrier&apos;s tracking site when a supported carrier + number are set. Pick{" "}
        <strong className="text-ink dark:text-zinc-300">Other / custom URL</strong> only if pasting an https tracking
        link.
      </p>

      <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
        Status
        <select
          value={sel}
          disabled={pending}
          onChange={(e) => setSel(e.target.value as OrderStatus)}
          className="mt-1 w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
        Carrier (for tracking link)
        <select
          value={carrier}
          disabled={pending}
          onChange={(e) => setCarrier(e.target.value as TrackingCarrier)}
          className="mt-1 w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {CARRIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
        Tracking number / ID
        <input
          type="text"
          value={tracking}
          disabled={pending}
          onChange={(e) => setTracking(e.target.value)}
          placeholder={
            carrier === "OTHER"
              ? "Paste full https://… tracking URL from the carrier"
              : "Carrier tracking ID (shown to customer)"
          }
          className="mt-1 w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>

      <button
        type="button"
        disabled={pending || !dirty}
        onClick={save}
        className={`mt-4 ${btnSecondaryMd} disabled:opacity-45`}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {err ? <p className="mt-2 text-xs font-medium text-coral">{err}</p> : null}
    </div>
  );
}
