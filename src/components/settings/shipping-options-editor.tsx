"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  adminCreateShippingOption,
  adminDeleteShippingOption,
  adminUpdateShippingOption,
} from "@/app/actions/shipping-options-admin";
import { formatPriceUsd } from "@/lib/product-slug";

export type ShippingOptionAdminRow = {
  id: string;
  label: string;
  description: string;
  priceCents: number;
  maxShippingUnits: number;
  sortOrder: number;
  active: boolean;
};

function centsToUsdInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseUsdToCents(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function OptionCard({ row }: { row: ShippingOptionAdminRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paneOpen, setPaneOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [label, setLabel] = useState(row.label);
  const [description, setDescription] = useState(row.description);
  const [priceStr, setPriceStr] = useState(() => centsToUsdInput(row.priceCents));
  const [maxShippingUnits, setMaxShippingUnits] = useState(String(row.maxShippingUnits));
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder));
  const [active, setActive] = useState(row.active);

  useEffect(() => {
    setLabel(row.label);
    setDescription(row.description);
    setPriceStr(centsToUsdInput(row.priceCents));
    setMaxShippingUnits(String(row.maxShippingUnits));
    setSortOrder(String(row.sortOrder));
    setActive(row.active);
  }, [row.label, row.description, row.priceCents, row.maxShippingUnits, row.sortOrder, row.active, row.id]);

  function save() {
    setMsg("");
    const cents = parseUsdToCents(priceStr);
    if (cents === null) {
      setMsg("Enter a valid price.");
      return;
    }
    const ord = Number.parseInt(sortOrder, 10);
    const maxUnits = Number.parseInt(maxShippingUnits, 10);
    if (!Number.isFinite(maxUnits) || maxUnits < 1) {
      setMsg("Enter a valid max shipping units (1 or more).");
      return;
    }
    startTransition(async () => {
      const r = await adminUpdateShippingOption(row.id, {
        label,
        description,
        priceCents: cents,
        maxShippingUnits: maxUnits,
        sortOrder: Number.isFinite(ord) ? ord : 0,
        active,
      });
      setMsg(r.ok ? "Saved." : r.error);
      if (r.ok) {
        setPaneOpen(false);
        router.refresh();
      }
    });
  }

  function del() {
    if (!confirm(`Delete shipping option “${row.label.replace(/"/g, "'") || row.id.slice(0, 8)}”?`)) return;
    setMsg("");
    startTransition(async () => {
      const r = await adminDeleteShippingOption(row.id);
      setMsg(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  }

  const previewPrice = parseUsdToCents(priceStr);

  return (
    <li className="rounded border border-palm/25 bg-white/95 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/40 [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
      <details
        open={paneOpen}
        onToggle={(e) => setPaneOpen((e.target as HTMLDetailsElement).open)}
        className="overflow-hidden rounded"
      >
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/5">
          <span className="flex min-w-0 flex-wrap items-center gap-2 font-bold text-ink dark:text-zinc-100">
            <span aria-hidden className="text-zinc-500 dark:text-zinc-400">{paneOpen ? "▼" : "▶"}</span>
            <span className="truncate">{label.trim() ? label : "Untitled"}</span>
          </span>
          <span className="shrink-0 text-xs font-medium text-ink/70 dark:text-zinc-400">
            {previewPrice !== null ? formatPriceUsd(previewPrice) : formatPriceUsd(row.priceCents)}
            {" · "}
            {maxShippingUnits.trim() || row.maxShippingUnits} units
            {" · "}
            {active ? "Active" : "Inactive"}
          </span>
        </summary>
        <div className="grid gap-3 border-t border-palm/20 px-4 pb-4 pt-4 sm:grid-cols-2 dark:border-zinc-600">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Label</span>
          <input
            className="border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
            Price (USD)
          </span>
          <input
            inputMode="decimal"
            className="border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
            Max shipping units
          </span>
          <input
            type="number"
            min={1}
            className="border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={maxShippingUnits}
            onChange={(e) => setMaxShippingUnits(e.target.value)}
            disabled={pending}
          />
          <span className="text-[11px] text-ink/60 dark:text-zinc-500">
            Total units from the cart must fit in this box.
          </span>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
            Description / notes (customers)
          </span>
          <textarea
            rows={2}
            className="border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Sort order</span>
          <input
            type="number"
            className="border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 pt-7">
          <input
            type="checkbox"
            className="h-4 w-4 border-palm accent-palm dark:border-zinc-500"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={pending}
          />
          <span className="text-sm font-bold text-ink dark:text-zinc-200">Active (shown at checkout)</span>
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="button"
            disabled={pending}
            className={btnSecondaryMd}
            onClick={save}
          >
            Save changes
          </button>
          <button
            type="button"
            disabled={pending}
            className="text-xs font-bold text-coral underline disabled:opacity-50"
            onClick={del}
          >
            Delete
          </button>
        </div>
        {msg ? <p className="text-xs text-ink/80 sm:col-span-2 dark:text-zinc-400">{msg}</p> : null}
        <p className="font-mono text-[10px] text-ink/45 sm:col-span-2 dark:text-zinc-600">{row.id}</p>
        </div>
      </details>
    </li>
  );
}

function AddShippingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState(false);

  function add() {
    setMsg("");
    startTransition(async () => {
      const r = await adminCreateShippingOption({
        label: "Standard shipping",
        description: "",
        priceCents: 500,
        maxShippingUnits: 10,
        sortOrder: 0,
        active: true,
      });
      setMsg(r.ok ? "" : r.error);
      if (r.ok) {
        setExpanded(false);
        router.refresh();
      }
    });
  }

  if (!expanded) {
    return (
      <button
        type="button"
        disabled={pending}
        className="rounded border-2 border-dashed border-palm/40 px-4 py-3 text-sm font-bold text-palm hover:bg-black/5 dark:border-zinc-600 dark:text-emerald-200 dark:hover:bg-zinc-800/80"
        onClick={() => setExpanded(true)}
      >
        + Add shipping option
      </button>
    );
  }

  return (
    <div className="rounded border border-palm/30 bg-white/80 p-4 dark:border-zinc-600 dark:bg-zinc-900/30">
      <p className="text-sm text-ink/80 dark:text-zinc-300">
        Adds a starter row (label “Standard shipping”, price <strong>$5.00</strong>). Edit labels and amounts after it
        appears.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className={btnSecondaryMd}
          onClick={add}
        >
          Create default option
        </button>
        <button
          type="button"
          disabled={pending}
          className="text-xs font-bold text-ink underline dark:text-zinc-300"
          onClick={() => {
            setExpanded(false);
            setMsg("");
          }}
        >
          Cancel
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-coral">{msg}</p> : null}
    </div>
  );
}

export function ShippingOptionsEditor({ initial }: { initial: ShippingOptionAdminRow[] }) {
  return (
    <div className="space-y-6">
      {initial.length === 0 ? (
        <p className="rounded border border-palm/20 bg-white/70 px-4 py-3 text-sm text-ink/80 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
          No shipping options yet. Checkout won’t charge shipping until you create at least one active option below.
        </p>
      ) : (
        <ul className="space-y-4">
          {initial.map((row) => (
            <OptionCard key={row.id} row={row} />
          ))}
        </ul>
      )}
      <AddShippingForm />
    </div>
  );
}