"use client";

import { adminTableRowClass } from "@/lib/admin-table-classes";
import { btnSecondarySm } from "@/lib/btn-theme-classes";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProductVariant,
  deleteProductVariant,
  listProductVariantsForAdmin,
  moveProductVariant,
  saveProductVariantRow,
  setProductVariantPriceDisplay,
  type ProductVariantAdminRow,
} from "@/app/actions/product-variants-admin";
import type { VariantPriceDisplay } from "@/lib/product-variant-price-display";
import { hasCustomVariantPickerColors } from "@/lib/variant-picker-style";
import { variantGreenPaletteStyle } from "@/lib/variant-green-palette";
import { ProductPriceTiersEditor } from "@/components/settings/product-price-tiers-editor";
import type { ProductPriceTier } from "@/lib/product-price-tiers";

function centsToUsdInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function VariantEditorRow({
  v,
  basePriceCents,
  sortIndex,
  variantCount,
  onMove,
  onRemove,
  onSaved,
  pending,
}: {
  v: ProductVariantTableRow;
  basePriceCents: number;
  sortIndex: number;
  variantCount: number;
  onMove: (direction: "up" | "down") => void;
  onRemove: (id: string, label: string) => void;
  onSaved: () => void;
  pending: boolean;
}) {
  const listCents = basePriceCents + v.priceDeltaCents;
  const [label, setLabel] = useState(v.label);
  const [listPriceUsd, setListPriceUsd] = useState(centsToUsdInput(listCents));
  const [stock, setStock] = useState(String(v.stock));
  const [unlimitedStock, setUnlimitedStock] = useState(v.unlimitedStock);
  const [active, setActive] = useState(v.active);
  const [shippingUnits, setShippingUnits] = useState(String(v.shippingUnits));
  const [priceTiers, setPriceTiers] = useState<ProductPriceTier[] | null>(v.priceTiers ?? null);
  const [useBulkPricing, setUseBulkPricing] = useState(() => (v.priceTiers?.length ?? 0) > 0);
  const [useCustomPickerColors, setUseCustomPickerColors] = useState(() =>
    hasCustomVariantPickerColors(v),
  );
  const [pickerBgHex, setPickerBgHex] = useState(v.pickerBgHex ?? "#12c705");
  const [pickerFgHex, setPickerFgHex] = useState(v.pickerFgHex ?? "#ffffff");
  const [pickerBorderHex, setPickerBorderHex] = useState(v.pickerBorderHex ?? "#064b02");
  const [msg, setMsg] = useState<string | null>(null);
  const [innerPending, startTransition] = useTransition();

  useEffect(() => {
    const lc = basePriceCents + v.priceDeltaCents;
    setLabel(v.label);
    setListPriceUsd(centsToUsdInput(lc));
    setStock(String(v.stock));
    setUnlimitedStock(v.unlimitedStock);
    setActive(v.active);
    setShippingUnits(String(v.shippingUnits));
    setPriceTiers(v.priceTiers ?? null);
    setUseBulkPricing((v.priceTiers?.length ?? 0) > 0);
    setUseCustomPickerColors(hasCustomVariantPickerColors(v));
    setPickerBgHex(v.pickerBgHex ?? "#12c705");
    setPickerFgHex(v.pickerFgHex ?? "#ffffff");
    setPickerBorderHex(v.pickerBorderHex ?? "#064b02");
  }, [v, basePriceCents]);

  function save() {
    setMsg(null);
    startTransition(async () => {
      try {
        const units = Number.parseInt(shippingUnits, 10);
        if (!Number.isFinite(units) || units < 1 || units > 10) {
          setMsg("Shipping units must be 1–10.");
          return;
        }
        await saveProductVariantRow({
          productId: v.productId,
          variantId: v.id,
          label,
          listPriceUsd,
          stock: Number(stock) || 0,
          unlimitedStock,
          active,
          shippingUnits: units,
          priceTiers: useBulkPricing ? priceTiers : null,
          pickerBgHex: useCustomPickerColors ? pickerBgHex : null,
          pickerFgHex: useCustomPickerColors ? pickerFgHex : null,
          pickerBorderHex: useCustomPickerColors ? pickerBorderHex : null,
        });
        setMsg("Saved.");
        onSaved();
      } catch (ex) {
        setMsg(ex instanceof Error ? ex.message : "Could not save.");
      }
    });
  }

  const busy = pending || innerPending;
  const tierSeedCents = Math.round((Number.parseFloat(listPriceUsd) || 0) * 100);
  const previewStyle = useCustomPickerColors
    ? {
        backgroundColor: pickerBgHex,
        borderColor: pickerBorderHex,
        color: pickerFgHex,
      }
    : variantGreenPaletteStyle(sortIndex, variantCount, true);

  return (
    <>
    <tr className={adminTableRowClass}>
      <td className="px-2 py-2 align-top">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-ink/60">{sortIndex + 1}</span>
          {variantCount > 1 ? (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                disabled={busy || sortIndex === 0}
                onClick={() => onMove("up")}
                className="border border-palm-mid px-1.5 py-0.5 text-xs font-bold text-palm disabled:opacity-35"
                title="Move up"
                aria-label="Move variation up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || sortIndex >= variantCount - 1}
                onClick={() => onMove("down")}
                className="border border-palm-mid px-1.5 py-0.5 text-xs font-bold text-palm disabled:opacity-35"
                title="Move down"
                aria-label="Move variation down"
              >
                ↓
              </button>
            </div>
          ) : null}
        </div>
      </td>
      <td className="px-2 py-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
          className="w-full min-w-[6rem] border border-palm-mid px-1 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={listPriceUsd}
          onChange={(e) => setListPriceUsd(e.target.value)}
          disabled={busy}
          inputMode="decimal"
          className="w-28 border border-palm-mid px-1 py-1 text-sm"
          title="List price (USD) for this variation"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          disabled={busy || unlimitedStock}
          className="w-20 border border-palm-mid px-1 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={unlimitedStock}
          onChange={(e) => setUnlimitedStock(e.target.checked)}
          disabled={busy}
          title="Unlimited stock for this option"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={busy} />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={1}
          max={10}
          value={shippingUnits}
          onChange={(e) => setShippingUnits(e.target.value)}
          disabled={busy}
          className="w-14 border border-palm-mid px-1 py-1 text-sm"
          title="Shipping units (1–10, admin only)"
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className={btnSecondarySm}
          >
            {innerPending ? "…" : "Save"}
          </button>
          {msg ? <span className="text-xs text-lagoon-dark">{msg}</span> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(v.id, v.label)}
            className="text-xs font-bold text-coral hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
    <tr className="border-b border-palm/15 bg-surf/25">
      <td colSpan={8} className="px-3 py-3">
        <p className="text-xs font-bold text-palm">Storefront option button (product page)</p>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-bold text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-palm"
            checked={useCustomPickerColors}
            disabled={busy}
            onChange={(e) => setUseCustomPickerColors(e.target.checked)}
          />
          Custom button colors (otherwise automatic green shades from the logo)
        </label>
        {useCustomPickerColors ? (
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <label className="block text-xs font-bold text-ink">
              Background
              <input
                type="color"
                value={pickerBgHex}
                disabled={busy}
                onChange={(e) => setPickerBgHex(e.target.value)}
                className="mt-1 block h-9 w-14 cursor-pointer rounded border border-palm-mid"
              />
            </label>
            <label className="block text-xs font-bold text-ink">
              Text
              <input
                type="color"
                value={pickerFgHex}
                disabled={busy}
                onChange={(e) => setPickerFgHex(e.target.value)}
                className="mt-1 block h-9 w-14 cursor-pointer rounded border border-palm-mid"
              />
            </label>
            <label className="block text-xs font-bold text-ink">
              Border
              <input
                type="color"
                value={pickerBorderHex}
                disabled={busy}
                onChange={(e) => setPickerBorderHex(e.target.value)}
                className="mt-1 block h-9 w-14 cursor-pointer rounded border border-palm-mid"
              />
            </label>
            <span
              className="rounded border-2 px-3 py-1.5 text-sm font-bold"
              style={previewStyle}
            >
              Preview
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-ink/55">
            Position {sortIndex + 1} of {variantCount} uses darker greens (#12c705 → forest) on the product page.
          </p>
        )}
      </td>
    </tr>
    <tr className="border-b border-palm/15 bg-surf/25">
      <td colSpan={8} className="px-3 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-palm"
            checked={useBulkPricing}
            disabled={busy}
            onChange={(e) => {
              const on = e.target.checked;
              setUseBulkPricing(on);
              if (on && (!priceTiers || priceTiers.length === 0)) {
                setPriceTiers([{ minQty: 1, unitCents: tierSeedCents }]);
              }
            }}
          />
          Bulk quantity pricing for “{label || v.label}”
        </label>
        {useBulkPricing ? (
          <div className="mt-2 max-w-xl">
            <ProductPriceTiersEditor
              tiers={priceTiers ?? [{ minQty: 1, unitCents: tierSeedCents }]}
              onChange={setPriceTiers}
              disabled={busy}
            />
          </div>
        ) : null}
      </td>
    </tr>
    </>
  );
}

export type ProductVariantTableRow = ProductVariantAdminRow & { productId: string };

export function ProductVariantsSection({
  productId,
  basePriceCents,
  variantPriceDisplay: initialVariantPriceDisplay,
  reloadKey = 0,
  initialVariants,
  onVariantsChanged,
  onVariantPriceDisplaySaved,
}: {
  productId: string;
  basePriceCents: number;
  variantPriceDisplay: VariantPriceDisplay;
  reloadKey?: number;
  initialVariants?: ProductVariantAdminRow[];
  onVariantsChanged?: () => void;
  /** Keeps parent editor state in sync after the dedicated save (avoids stale refresh). */
  onVariantPriceDisplaySaved?: (mode: VariantPriceDisplay) => void;
}) {
  const router = useRouter();
  const [variants, setVariants] = useState<ProductVariantTableRow[]>(() =>
    (initialVariants ?? []).map((r) => ({ ...r, productId })),
  );
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [variantPriceDisplay, setVariantPriceDisplay] = useState<VariantPriceDisplay>(
    initialVariantPriceDisplay,
  );
  const [displayMsg, setDisplayMsg] = useState<string | null>(null);

  useEffect(() => {
    setVariantPriceDisplay(initialVariantPriceDisplay);
  }, [initialVariantPriceDisplay]);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const rows = await listProductVariantsForAdmin(productId);
        setVariants(rows.map((r) => ({ ...r, productId })) as ProductVariantTableRow[]);
      } catch {
        setErr("Could not load variations.");
      }
    });
  }, [productId]);

  useEffect(() => {
    load();
  }, [productId, reloadKey, load]);

  function bump() {
    onVariantsChanged?.();
    router.refresh();
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await createProductVariant(productId, label);
        setLabel("");
        bump();
        load();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not add variant.");
      }
    });
  }

  function savePriceDisplay(mode: VariantPriceDisplay) {
    setDisplayMsg(null);
    setVariantPriceDisplay(mode);
    startTransition(async () => {
      try {
        await setProductVariantPriceDisplay(productId, mode);
        setDisplayMsg("Display setting saved.");
        onVariantPriceDisplaySaved?.(mode);
        router.refresh();
      } catch (ex) {
        setVariantPriceDisplay(initialVariantPriceDisplay);
        setErr(ex instanceof Error ? ex.message : "Could not save display setting.");
      }
    });
  }

  function moveVariant(direction: "up" | "down", variantId: string) {
    setErr(null);
    startTransition(async () => {
      try {
        await moveProductVariant(productId, variantId, direction);
        bump();
        load();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not reorder.");
      }
    });
  }

  function remove(id: string, name: string) {
    if (!window.confirm(`Delete variation “${name}”?`)) return;
    setErr(null);
    startTransition(async () => {
      try {
        await deleteProductVariant(id);
        bump();
        load();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not delete.");
      }
    });
  }

  return (
    <section className="mt-0 border-t-0 pt-0">
      <h2 className="text-lg font-black text-palm">Pricing &amp; stock (by variation)</h2>
      <p className="mt-1 text-sm text-ink/70">
        Set <strong>list price (USD)</strong>, quantity, unlimited stock, active state, optional{" "}
        <strong>shipping units</strong> (admin-only, for checkout box sizing), and optional <strong>bulk pricing</strong>
        , <strong>display order</strong>, and optional <strong>storefront button colors</strong> per variation. A single
        row is the whole listing; with multiple rows, the database keeps a base list price and an adjustment per row
        (you only edit the displayed list price in each cell).
      </p>
      {variants.length > 1 ? (
        <div className="mt-4 rounded border border-palm/25 bg-surf/30 p-3">
          <label className="block text-sm font-bold text-ink" htmlFor="variant-price-display">
            Storefront option button price
          </label>
          <p className="mb-2 text-xs text-ink/60">
            What customers see next to each option on the product page (and in quick-add when picking a variation).
          </p>
          <select
            id="variant-price-display"
            value={variantPriceDisplay}
            disabled={pending}
            onChange={(e) => savePriceDisplay(e.target.value === "full" ? "full" : "difference")}
            className="block w-full max-w-md border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value="difference">Price difference (+/− from base list price)</option>
            <option value="full">Full variation price</option>
          </select>
          {displayMsg ? <p className="mt-1 text-xs text-lagoon-dark">{displayMsg}</p> : null}
        </div>
      ) : null}
      {variants.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded border border-palm/20">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b-2 border-palm bg-surf/50 font-bold text-palm">
              <tr>
                <th className="w-12 px-2 py-2">Order</th>
                <th className="px-2 py-2">Label</th>
                <th className="px-2 py-2">List price (USD)</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">∞</th>
                <th className="px-2 py-2">On</th>
                <th className="px-2 py-2" title="Shipping units (1–10, admin only)">
                  Ship
                </th>
                <th className="px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, idx) => (
                <VariantEditorRow
                  key={v.id}
                  v={v}
                  basePriceCents={basePriceCents}
                  sortIndex={idx}
                  variantCount={variants.length}
                  onMove={(direction) => moveVariant(direction, v.id)}
                  onRemove={remove}
                  onSaved={bump}
                  pending={pending}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-sm text-coral">
          No variations — run the latest database migration, or re-save the product to create a default SKU.
        </p>
      )}
      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm font-bold text-ink">
          Add another variation
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 block min-w-[12rem] border-2 border-palm-mid px-2 py-2 text-sm"
            placeholder="e.g. Large / Blue"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !label.trim()}
          className="border-2 border-palm bg-surf px-3 py-2 text-sm font-bold text-palm hover:bg-lagoon/15 disabled:opacity-40"
        >
          Add
        </button>
        {err ? <span className="text-sm text-coral">{err}</span> : null}
      </form>
    </section>
  );
}
