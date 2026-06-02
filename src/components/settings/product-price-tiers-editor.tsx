"use client";

import type { ProductPriceTier } from "@/lib/product-price-tiers";

function centsToUsdInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function usdInputToCents(raw: string): number {
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function ProductPriceTiersEditor({
  tiers,
  onChange,
  disabled,
}: {
  tiers: ProductPriceTier[];
  onChange: (tiers: ProductPriceTier[]) => void;
  disabled?: boolean;
}) {
  const rows = tiers.length > 0 ? tiers : [{ minQty: 1, unitCents: 0 }];

  const setRow = (index: number, patch: Partial<ProductPriceTier>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    const minQty = (last?.minQty ?? 1) + 1;
    onChange([...rows, { minQty, unitCents: last?.unitCents ?? 0 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/60 dark:text-zinc-400">
        Bulk unit price for this variation (same as label tiers). At quantity N, the matching tier unit price applies to
        the whole line.
      </p>
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-ink">
            Min qty
            <input
              type="number"
              min={1}
              disabled={disabled}
              value={row.minQty}
              onChange={(e) => setRow(idx, { minQty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
              className="mt-0.5 w-20 border-2 border-palm/30 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="text-xs font-bold text-ink">
            Unit price (USD)
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={centsToUsdInput(row.unitCents)}
              onChange={(e) => setRow(idx, { unitCents: usdInputToCents(e.target.value) })}
              className="mt-0.5 w-28 border-2 border-palm/30 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          {rows.length > 1 ? (
            <button
              type="button"
              disabled={disabled}
              className="mb-0.5 text-xs font-bold text-coral underline"
              onClick={() => removeRow(idx)}
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        disabled={disabled || rows.length >= 12}
        className="text-xs font-bold text-palm underline disabled:opacity-50"
        onClick={addRow}
      >
        + Add tier
      </button>
    </div>
  );
}
