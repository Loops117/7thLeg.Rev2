"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveProductKit, searchProductsForKitPicker } from "@/app/actions/product-kits-mutations";
import type { ProductPickerOption } from "@/lib/product-picker-option";
import { ProductEditorSection } from "@/components/settings/product-editor-section";
import {
  adminFieldsetClass,
  adminListTileClass,
  adminPickerHitClass,
  adminPickerListClass,
} from "@/lib/admin-surface-classes";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  MAX_PRODUCT_KIT_ITEMS,
  MIN_PRODUCT_KIT_ITEMS,
  orderKitItemsWithHostFirst,
} from "@/lib/product-kits-shared";

type KitItemRow = {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string | null;
  variantLabel: string | null;
};

function buildHostKitRow(hostProduct: ProductPickerOption, variantId: string): KitItemRow | null {
  const active = hostProduct.variants.filter((v) => v.active);
  if (active.length === 0) {
    return {
      productId: hostProduct.id,
      productName: hostProduct.name,
      productSlug: hostProduct.slug,
      variantId: null,
      variantLabel: null,
    };
  }
  const v = active.find((x) => x.id === variantId) ?? active[0];
  if (!v) return null;
  return {
    productId: hostProduct.id,
    productName: hostProduct.name,
    productSlug: hostProduct.slug,
    variantId: v.id,
    variantLabel: v.label,
  };
}

export function ProductKitEditor({
  hostProductId,
  hostProduct,
  initial,
}: {
  hostProductId: string;
  hostProduct: ProductPickerOption;
  initial: {
    enabled: boolean;
    label: string;
    discountCents: number;
    items: KitItemRow[];
  };
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [label, setLabel] = useState(initial.label);
  const [discountDollars, setDiscountDollars] = useState((initial.discountCents / 100).toFixed(2));
  const [items, setItems] = useState<KitItemRow[]>(() =>
    orderKitItemsWithHostFirst(hostProductId, initial.items),
  );
  const [hostVariantId, setHostVariantId] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductPickerOption[]>([]);
  const [pickProduct, setPickProduct] = useState<ProductPickerOption | null>(null);
  const [pickVariantId, setPickVariantId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hostActiveVariants = useMemo(
    () => hostProduct.variants.filter((v) => v.active),
    [hostProduct.variants],
  );

  const hostLine = useMemo(
    () => items.find((i) => i.productId === hostProductId) ?? null,
    [items, hostProductId],
  );

  const otherItems = useMemo(
    () => items.filter((i) => i.productId !== hostProductId),
    [items, hostProductId],
  );

  useEffect(() => {
    setEnabled(initial.enabled);
    setLabel(initial.label);
    setDiscountDollars((initial.discountCents / 100).toFixed(2));
    const ordered = orderKitItemsWithHostFirst(hostProductId, initial.items);
    setItems(ordered);
    const existingHost = ordered.find((i) => i.productId === hostProductId);
    if (existingHost?.variantId) {
      setHostVariantId(existingHost.variantId);
    } else if (hostActiveVariants[0]) {
      setHostVariantId(hostActiveVariants[0].id);
    } else {
      setHostVariantId("");
    }
  }, [hostProductId, initial, hostActiveVariants]);

  useEffect(() => {
    const q = query.trim();
    if (!q || pickProduct) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void searchProductsForKitPicker(q).then((r) => {
        if (cancelled) return;
        if (Array.isArray(r)) setHits(r.filter((p) => p.id !== hostProductId));
        else setHits([]);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, hostProductId, pickProduct]);

  function setHostAsFirst() {
    const row = buildHostKitRow(hostProduct, hostVariantId);
    if (!row) return;
    setItems([row, ...otherItems]);
    setErr(null);
  }

  function addOtherItem() {
    if (!pickProduct || pickProduct.id === hostProductId) return;
    const variants = pickProduct.variants.filter((v) => v.active);
    let variantId: string | null = null;
    let variantLabel: string | null = null;
    if (variants.length > 0) {
      const v = variants.find((x) => x.id === pickVariantId) ?? variants[0];
      if (!v) return;
      variantId = v.id;
      variantLabel = v.label;
    }
    const key = `${pickProduct.id}:${variantId ?? ""}`;
    if (otherItems.some((i) => `${i.productId}:${i.variantId ?? ""}` === key)) return;
    const hostPart = hostLine ? [hostLine] : [];
    if (hostPart.length + otherItems.length >= MAX_PRODUCT_KIT_ITEMS) return;
    setItems([...hostPart, ...otherItems, {
      productId: pickProduct.id,
      productName: pickProduct.name,
      productSlug: pickProduct.slug,
      variantId,
      variantLabel,
    }]);
    setPickProduct(null);
    setPickVariantId("");
    setQuery("");
    setHits([]);
  }

  function save() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const r = await saveProductKit({
        hostProductId,
        enabled,
        label,
        discountDollars,
        items: orderKitItemsWithHostFirst(
          hostProductId,
          items.map((i) => ({ productId: i.productId, variantId: i.variantId })),
        ),
      });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setMsg("Kit saved.");
    });
  }

  const kitReady = enabled && items.length >= MIN_PRODUCT_KIT_ITEMS;
  const otherCount = Math.max(0, items.length - (items.some((i) => i.productId === hostProductId) ? 1 : 0));

  return (
    <ProductEditorSection
      title="Kit combo"
      status={kitReady ? "active" : enabled ? "inactive" : "empty"}
      statusLabel={kitReady ? "On storefront" : enabled ? "Incomplete" : "Off"}
      meta={
        enabled
          ? `${items.length} item${items.length === 1 ? "" : "s"}${otherCount > 0 ? ` (+${otherCount} add-ons)` : ""} · $${discountDollars} off`
          : "Bundle discount for Add kit to cart"
      }
    >
      <p className="max-w-2xl text-xs text-ink/65 dark:text-zinc-400">
        The <strong>first</strong> item in the kit is always a variation of this product. Add other products below.
        Discount applies when all lines are in the cart from <strong>Add kit to cart</strong>.
      </p>

      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-palm"
        />
        Enable kit on storefront
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          Section title
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            placeholder="Kit deal"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Discount when buying full kit ($)
          <input
            type="text"
            inputMode="decimal"
            value={discountDollars}
            onChange={(e) => setDiscountDollars(e.target.value)}
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            placeholder="5.00"
          />
        </label>
      </div>

      <fieldset className="rounded border-2 border-palm/30 bg-parchment/40 px-3 py-3 dark:border-zinc-600 dark:bg-zinc-900/30">
        <legend className="px-1 text-sm font-bold text-palm dark:text-emerald-300">1. This product (first in kit)</legend>
        <p className="text-xs text-ink/60">{hostProduct.name}</p>
        {hostActiveVariants.length > 0 ? (
          <label className="mt-2 block text-xs font-bold text-ink">
            Variation
            <select
              value={hostVariantId || hostActiveVariants[0]!.id}
              onChange={(e) => setHostVariantId(e.target.value)}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            >
              {hostActiveVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-2 text-xs text-ink/60">No variations — uses base product.</p>
        )}
        <button type="button" disabled={pending} onClick={setHostAsFirst} className={`mt-2 ${btnSecondaryMd}`}>
          {hostLine ? "Update first item" : "Set as first kit item"}
        </button>
        {hostLine ? (
          <p className="mt-2 text-xs text-lagoon-dark">
            First item: {hostLine.variantLabel ?? hostLine.productName}
          </p>
        ) : (
          <p className="mt-2 text-xs text-coral">Required when the kit is enabled.</p>
        )}
      </fieldset>

      <fieldset className={adminFieldsetClass}>
        <legend className="px-1 text-sm font-bold text-ink dark:text-zinc-100">Additional kit items</legend>

        {otherItems.length > 0 ? (
          <ol className="mt-2 space-y-2">
            {otherItems.map((item, idx) => (
              <li
                key={`${item.productId}:${item.variantId ?? ""}`}
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${adminListTileClass}`}
              >
                <span>
                  <span className="font-bold text-ink/50">{idx + 2}.</span> {item.productName}
                  {item.variantLabel ? (
                    <span className="text-ink/70"> — {item.variantLabel}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    setItems((prev) =>
                      orderKitItemsWithHostFirst(hostProductId, prev).filter(
                        (x) =>
                          !(
                            x.productId === item.productId && x.variantId === item.variantId
                          ),
                      ),
                    )
                  }
                  className="text-xs font-bold text-coral underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-ink/55">No additional items yet.</p>
        )}

        {!pickProduct ? (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={pending || items.length >= MAX_PRODUCT_KIT_ITEMS}
              placeholder="Search other products…"
              className="mt-3 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            />
            {hits.length > 0 ? (
              <ul className={`mt-2 max-h-48 ${adminPickerListClass}`}>
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPickProduct(h);
                        const active = h.variants.filter((v) => v.active);
                        setPickVariantId(active[0]?.id ?? "");
                      }}
                      className={adminPickerHitClass}
                    >
                      {h.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-bold text-palm">{pickProduct.name}</p>
            {pickProduct.variants.filter((v) => v.active).length > 0 ? (
              <label className="block text-xs font-bold text-ink">
                Variation
                <select
                  value={pickVariantId}
                  onChange={(e) => setPickVariantId(e.target.value)}
                  className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                >
                  {pickProduct.variants
                    .filter((v) => v.active)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <p className="text-xs text-ink/60">No variations — adds as base product.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addOtherItem} className={btnSecondaryMd}>
                Add to kit
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickProduct(null);
                  setPickVariantId("");
                }}
                className="text-sm font-bold text-ink underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-ink/55">
          Need at least {MIN_PRODUCT_KIT_ITEMS} items total when enabled (this product + one more). Max{" "}
          {MAX_PRODUCT_KIT_ITEMS}.
        </p>
      </fieldset>

      <button type="button" disabled={pending} onClick={save} className={btnSecondaryMd}>
        {pending ? "Saving…" : "Save kit"}
      </button>
      {msg ? <p className="text-sm text-lagoon-dark">{msg}</p> : null}
      {err ? <p className="text-sm text-coral">{err}</p> : null}
    </ProductEditorSection>
  );
}
