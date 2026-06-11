"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/store-cart";
import { ProductBulkPricingTable } from "@/components/product-bulk-pricing-table";
import { btnMainLg } from "@/lib/btn-theme-classes";
import {
  parseProductPriceTiersJson,
  productLineSubtotalCents,
  productTierBreakdownAtQuantity,
  productUnitCentsDisplay,
} from "@/lib/product-price-tiers-storefront";
import { PRODUCT_OUT_OF_STOCK_OPTION_SUFFIX } from "@/lib/product-stock";
import { formatPriceUsd } from "@/lib/product-slug";

type VariantOpt = {
  id: string;
  label: string;
  stock: number;
  unlimitedStock: boolean;
  active: boolean;
};

type Props = {
  productId: string;
  productUnlimited: boolean;
  variants: VariantOpt[];
  canPurchase: boolean;
  /** Shown when `canPurchase` is false (breeding vs out of stock). */
  unavailableHint?: string;
  /** TIMED storefront `?event=` id — persists event sale pricing on the cart row. */
  timedSaleEventId?: string | null;
  /** When set, variant selection is controlled by parent (e.g. product page gallery). */
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  /** Bulk tiers for the selected variation (null = list price only). */
  priceTiersJson?: unknown;
  /** Catalogue unit price before bulk tiers (base + variant delta). */
  listUnitCents: number;
  /** Max purchasable quantity (stock cap or 99). */
  maxQuantity: number;
};

function variantOk(v: VariantOpt): boolean {
  return v.active && (v.unlimitedStock || v.stock > 0);
}

export function AddToCartButton({
  productId,
  productUnlimited: _productUnlimited,
  variants,
  canPurchase,
  unavailableHint = "Out of Stock — check back later.",
  timedSaleEventId,
  selectedVariantId: controlledVariantId,
  onVariantSelect,
  quantity,
  onQuantityChange,
  priceTiersJson,
  listUnitCents,
  maxQuantity,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [internalVariant, setInternalVariant] = useState("");

  const variantValue =
    controlledVariantId !== undefined ? controlledVariantId : internalVariant;
  const setVariantValue = onVariantSelect ?? setInternalVariant;

  const tiers = parseProductPriceTiersJson(priceTiersJson);
  const hasBulk = (tiers?.length ?? 0) > 0;
  const tierRows = hasBulk ? productTierBreakdownAtQuantity(priceTiersJson, quantity) : [];
  const unitAtQty = productUnitCentsDisplay(priceTiersJson, listUnitCents, quantity);
  const lineAtQty = productLineSubtotalCents(priceTiersJson, listUnitCents, quantity);

  const qtyMax = Math.max(1, Math.min(99, maxQuantity));

  useEffect(() => {
    const ok = variants.filter(variantOk);
    if (ok.length === 1 && controlledVariantId === undefined) {
      setInternalVariant(ok[0].id);
    }
  }, [variants, controlledVariantId]);

  useEffect(() => {
    if (quantity > qtyMax) onQuantityChange(qtyMax);
  }, [quantity, qtyMax, onQuantityChange]);

  if (!canPurchase) {
    return (
      <p className="mt-6 text-sm font-medium text-coral">{unavailableHint}</p>
    );
  }

  const selectable = variants.filter(variantOk);
  const needsChoice = selectable.length > 1 && controlledVariantId === undefined;

  function clampQty(n: number) {
    return Math.min(qtyMax, Math.max(1, Math.floor(n) || 1));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (variants.length > 0) {
      if (selectable.length === 0) {
        setError("No options available.");
        return;
      }
      if (needsChoice && !variantValue) {
        setError("Choose an option.");
        return;
      }
    }
    let vid: string | null = null;
    if (variants.length === 0) {
      vid = null;
    } else if (selectable.length === 1) {
      vid = selectable[0].id;
    } else if (controlledVariantId !== undefined) {
      vid = controlledVariantId || null;
    } else {
      vid = variantValue || null;
    }
    startTransition(async () => {
      const res = await addToCartAction({
        productId,
        variantId: vid,
        quantity: clampQty(quantity),
        timedSaleEventId: timedSaleEventId ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 border-t border-palm/15 pt-6">
      {needsChoice ? (
        <label className="block text-sm font-bold text-ink">
          Option
          <select
            value={variantValue}
            onChange={(e) => setVariantValue(e.target.value)}
            required
            className="mt-1 w-full max-w-xs border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink"
          >
            <option value="">Select…</option>
            {selectable.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
                {!v.unlimitedStock && v.stock <= 0 ? PRODUCT_OUT_OF_STOCK_OPTION_SUFFIX : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {hasBulk ? <ProductBulkPricingTable rows={tierRows} /> : null}

      {hasBulk || quantity > 1 ? (
        <p className="mt-3 text-sm text-ink/80">
          <span className="font-bold text-ink">{unitAtQty}</span> each at qty {quantity}
          {quantity > 1 ? (
            <span className="text-ink/65">
              {" "}
              · {formatPriceUsd(lineAtQty)} total
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-bold text-ink">
          Qty
          <input
            type="number"
            min={1}
            max={qtyMax}
            value={quantity}
            disabled={pending}
            onChange={(e) => onQuantityChange(clampQty(Number(e.target.value)))}
            className="mt-1 block w-20 border-2 border-palm-mid bg-white px-2 py-2 text-center text-base"
          />
        </label>
        <button type="submit" disabled={pending} className={btnMainLg}>
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm font-medium text-coral">{error}</p> : null}
      <p className="mt-2 text-xs text-ink/60">Requires a customer account — you’ll be prompted to sign in if needed.</p>
    </form>
  );
}
