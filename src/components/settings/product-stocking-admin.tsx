"use client";

import { adminTableRowClass } from "@/lib/admin-table-classes";
import { btnChip, btnChipActive, btnSecondarySm } from "@/lib/btn-theme-classes";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  saveProductStockingRowAction,
  type SaveProductStockingRowInput,
} from "@/app/actions/product-stocking-admin";
import type {
  ProductStockingQuickFilter,
  ProductStockingRow,
  ProductStockingSortKey,
} from "@/lib/product-stocking-types";
import { ProductTypeIndex, type ProductTypeFlat } from "@/lib/product-type-index";

function centsToUsdInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

type RowDraft = {
  productActive: boolean;
  variantActive: boolean;
  listPriceUsd: string;
  stock: string;
  unlimitedStock: boolean;
  shippingUnits: string;
};

function draftFromRow(row: ProductStockingRow): RowDraft {
  return {
    productActive: row.productActive,
    variantActive: row.variantActive,
    listPriceUsd: centsToUsdInput(row.listPriceCents),
    stock: String(row.stock),
    unlimitedStock: row.unlimitedStock,
    shippingUnits: String(row.shippingUnits),
  };
}

function draftsEqual(a: RowDraft, b: RowDraft): boolean {
  return (
    a.productActive === b.productActive &&
    a.variantActive === b.variantActive &&
    a.listPriceUsd === b.listPriceUsd &&
    a.stock === b.stock &&
    a.unlimitedStock === b.unlimitedStock &&
    a.shippingUnits === b.shippingUnits
  );
}

function StockingEditorRow({
  row,
  pending,
  onSaved,
}: {
  row: ProductStockingRow;
  pending: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<RowDraft>(() => draftFromRow(row));
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [innerPending, startTransition] = useTransition();

  const baseline = draftFromRow(row);
  const dirty = !draftsEqual(draft, baseline);
  const busy = pending || innerPending;

  useEffect(() => {
    setDraft(draftFromRow(row));
    setMsg(null);
    setErr(null);
  }, [row]);

  function save() {
    setMsg(null);
    setErr(null);
    const units = Number.parseInt(draft.shippingUnits, 10);
    if (!Number.isFinite(units) || units < 1 || units > 10) {
      setErr("Ship units must be 1–10.");
      return;
    }
    const stock = Math.max(0, Math.floor(Number(draft.stock) || 0));

    const payload: SaveProductStockingRowInput = {
      productId: row.productId,
      variantId: row.variantId,
      variantLabel: row.variantLabel,
      productActive: draft.productActive,
      variantActive: draft.variantActive,
      listPriceUsd: draft.listPriceUsd,
      stock,
      unlimitedStock: draft.unlimitedStock,
      shippingUnits: units,
    };

    startTransition(async () => {
      const result = await saveProductStockingRowAction(payload);
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setMsg("Saved.");
      onSaved();
    });
  }

  function resetRow() {
    setDraft(draftFromRow(row));
    setMsg(null);
    setErr(null);
  }

  const liveOnStore = row.productActive && row.variantActive;

  return (
    <tr className={`${adminTableRowClass} align-top`}>
      <td className="px-2 py-2">
        <div className="min-w-[8rem] font-medium text-ink">{row.productName}</div>
        <div className="font-mono text-[10px] text-ink/55">{row.productSlug}</div>
        {!liveOnStore ? (
          <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide text-coral">
            Hidden on store
          </span>
        ) : null}
      </td>
      <td className="px-2 py-2 whitespace-nowrap text-ink/85">
        {row.variantCount > 1 ? row.variantLabel : <span className="text-ink/45">—</span>}
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={draft.productActive}
          disabled={busy}
          title="Listing visible on store"
          onChange={(e) => setDraft((d) => ({ ...d, productActive: e.target.checked }))}
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={draft.variantActive}
          disabled={busy}
          title="Option enabled for purchase"
          onChange={(e) => setDraft((d) => ({ ...d, variantActive: e.target.checked }))}
        />
      </td>
      <td className="px-2 py-2">
        <input
          value={draft.listPriceUsd}
          onChange={(e) => setDraft((d) => ({ ...d, listPriceUsd: e.target.value }))}
          disabled={busy}
          inputMode="decimal"
          className="w-24 border border-palm-mid px-1 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          value={draft.stock}
          onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
          disabled={busy || draft.unlimitedStock}
          className="w-20 border border-palm-mid px-1 py-1 text-sm disabled:bg-ink/10"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={draft.unlimitedStock}
          disabled={busy}
          title="Unlimited / made to order"
          onChange={(e) => setDraft((d) => ({ ...d, unlimitedStock: e.target.checked }))}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={1}
          max={10}
          value={draft.shippingUnits}
          onChange={(e) => setDraft((d) => ({ ...d, shippingUnits: e.target.value }))}
          disabled={busy}
          className="w-14 border border-palm-mid px-1 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || !dirty} onClick={save} className={btnSecondarySm}>
            {innerPending ? "…" : "Save"}
          </button>
          {dirty ? (
            <button
              type="button"
              disabled={busy}
              onClick={resetRow}
              className="text-[11px] font-bold text-ink/60 underline"
            >
              Reset
            </button>
          ) : null}
          {msg ? <span className="text-xs text-lagoon-dark">{msg}</span> : null}
          {err ? <span className="text-xs text-coral">{err}</span> : null}
        </div>
      </td>
    </tr>
  );
}

function sortRows(
  rows: ProductStockingRow[],
  key: ProductStockingSortKey,
  dir: "asc" | "desc",
): ProductStockingRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "productName":
        cmp = a.productName.localeCompare(b.productName) || a.variantLabel.localeCompare(b.variantLabel);
        break;
      case "variantLabel":
        cmp = a.variantLabel.localeCompare(b.variantLabel) || a.productName.localeCompare(b.productName);
        break;
      case "price":
        cmp = a.listPriceCents - b.listPriceCents;
        break;
      case "stock":
        cmp = (a.unlimitedStock ? 1_000_000 : a.stock) - (b.unlimitedStock ? 1_000_000 : b.stock);
        break;
      case "shippingUnits":
        cmp = a.shippingUnits - b.shippingUnits;
        break;
      case "listingOn":
        cmp = Number(a.productActive) - Number(b.productActive);
        break;
      case "optionOn":
        cmp = Number(a.variantActive) - Number(b.variantActive);
        break;
      default:
        cmp = 0;
    }
    return cmp * mul;
  });
}

export function ProductStockingAdmin({
  initialRows,
  filterTypes,
  typeHierarchy,
}: {
  initialRows: ProductStockingRow[];
  filterTypes: { id: string; pathLabel: string }[];
  typeHierarchy: ProductTypeFlat[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<ProductStockingQuickFilter>("all");
  const [typeFilterId, setTypeFilterId] = useState("");
  const [sortKey, setSortKey] = useState<ProductStockingSortKey>("productName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pending, startTransition] = useTransition();

  const typeFilterIndex = useMemo(() => new ProductTypeIndex(typeHierarchy), [typeHierarchy]);
  const typeFilterMatchIds = useMemo(() => {
    if (!typeFilterId) return null;
    return new Set(typeFilterIndex.descendantsOf(typeFilterId));
  }, [typeFilterId, typeFilterIndex]);

  const filteredRows = useMemo(() => {
    let list = initialRows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.productSlug.toLowerCase().includes(q) ||
          r.variantLabel.toLowerCase().includes(q),
      );
    }
    if (quickFilter === "active") {
      list = list.filter((r) => r.productActive && r.variantActive);
    }
    if (quickFilter === "inactive") {
      list = list.filter((r) => !r.productActive || !r.variantActive);
    }
    if (quickFilter === "featured") list = list.filter((r) => r.productFeatured);
    if (quickFilter === "sale") list = list.filter((r) => r.productOnSale);
    if (quickFilter === "outofstock") {
      list = list.filter((r) => !r.unlimitedStock && r.stock <= 0);
    }
    if (typeFilterMatchIds) {
      list = list.filter((r) => r.typeIds.some((tid) => typeFilterMatchIds.has(tid)));
    }
    return sortRows(list, sortKey, sortDir);
  }, [initialRows, search, quickFilter, typeFilterMatchIds, sortKey, sortDir]);

  function filterBtn(id: ProductStockingQuickFilter, label: string) {
    const active = quickFilter === id;
    return (
      <button
        type="button"
        className={active ? btnChipActive : btnChip}
        onClick={() => setQuickFilter(id)}
      >
        {label}
      </button>
    );
  }

  function toggleSort(key: ProductStockingSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: ProductStockingSortKey) {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function headerBtn(label: string, key: ProductStockingSortKey) {
    return (
      <button
        type="button"
        className="font-bold text-palm hover:underline dark:text-emerald-200"
        onClick={() => toggleSort(key)}
      >
        {label}
        {sortIndicator(key)}
      </button>
    );
  }

  function afterSave() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink">
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name, slug, or option label…"
            className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm"
          />
        </label>
        {filterTypes.length > 0 ? (
          <label className="block w-full min-w-[10rem] text-sm font-bold text-ink lg:max-w-xs">
            Product type
            <select
              value={typeFilterId}
              onChange={(e) => setTypeFilterId(e.target.value)}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            >
              <option value="">All types</option>
              {filterTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.pathLabel}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterBtn("all", "All")}
        {filterBtn("active", "Active on store")}
        {filterBtn("inactive", "Inactive / hidden")}
        {filterBtn("featured", "Featured")}
        {filterBtn("sale", "On sale")}
        {filterBtn("outofstock", "Out of stock")}
      </div>

      <p className="text-sm text-ink/70">
        {filteredRows.length} row{filteredRows.length === 1 ? "" : "s"}
        {filteredRows.length !== initialRows.length
          ? ` (of ${initialRows.length} variations)`
          : ` — ${initialRows.length} variation${initialRows.length === 1 ? "" : "s"} total`}
        . Edit fields and click <strong>Save</strong> on each row.{" "}
        <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
          Full catalog editor
        </Link>
      </p>

      {initialRows.length === 0 ? (
        <p className="text-sm text-ink/70">No products yet. Add items in the catalog first.</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-ink/70">Nothing matches these filters.</p>
      ) : (
        <div className="max-h-[calc(100dvh-12rem)] overflow-auto rounded border-2 border-palm dark:border-zinc-600">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b-2 border-palm bg-surf/95 font-bold backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-800">
              <tr>
                <th className="px-2 py-2">{headerBtn("Product", "productName")}</th>
                <th className="px-2 py-2">{headerBtn("Option", "variantLabel")}</th>
                <th className="px-2 py-2 text-center" title="Listing visible on store">
                  {headerBtn("Listing", "listingOn")}
                </th>
                <th className="px-2 py-2 text-center" title="Option enabled for purchase">
                  {headerBtn("Enabled", "optionOn")}
                </th>
                <th className="px-2 py-2">{headerBtn("Price (USD)", "price")}</th>
                <th className="px-2 py-2">{headerBtn("Qty", "stock")}</th>
                <th className="px-2 py-2 text-center" title="Unlimited stock">
                  ∞
                </th>
                <th className="px-2 py-2">{headerBtn("Ship", "shippingUnits")}</th>
                <th className="px-2 py-2 w-32"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <StockingEditorRow
                  key={row.variantId}
                  row={row}
                  pending={pending}
                  onSaved={afterSave}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink/55">
        <strong>Listing</strong> = whole product visible on the store. <strong>Enabled</strong> = this option can be
        purchased. <strong>Ship</strong> = shipping units for checkout box sizing (1–10).
      </p>
    </div>
  );
}
