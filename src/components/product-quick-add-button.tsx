"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { addToCartAction } from "@/app/actions/store-cart";
import { variantIsPurchasable } from "@/lib/product-stock";
import { btnChip, btnChipActive, btnMainMd, btnMainSm, btnSecondarySm } from "@/lib/btn-theme-classes";
import {
  variantOptionPriceLabel,
  type VariantPriceDisplay,
} from "@/lib/product-variant-price-display";

export type QuickAddVariant = {
  id: string;
  label: string;
  stock: number;
  unlimitedStock: boolean;
  active: boolean;
  priceDeltaCents: number;
};

type Props = {
  productId: string;
  productName: string;
  basePriceCents: number;
  variants: QuickAddVariant[];
  canPurchase: boolean;
  timedSaleEventId?: string | null;
  variantPriceDisplay?: VariantPriceDisplay;
  /** Compact icon on product cards vs full button on PDP. */
  compact?: boolean;
  /** Dropdown under button (PDP) vs full-card overlay (store grid). */
  pickerMode?: "dropdown" | "card-overlay";
  /** When `card-overlay`, overlays cover this element (the product card). */
  overlayHostRef?: RefObject<HTMLElement | null>;
  className?: string;
};

const ADDED_FLASH_MS = 1800;

function useOverlayHostRect(
  hostRef: RefObject<HTMLElement | null> | undefined,
  active: boolean,
): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active || !hostRef?.current) {
      setRect(null);
      return;
    }
    const el = hostRef.current;
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [hostRef, active]);

  return rect;
}

function fixedHostStyle(rect: DOMRect): React.CSSProperties {
  return {
    position: "fixed",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: 60,
  };
}

export function ProductQuickAddButton({
  productId,
  productName,
  basePriceCents,
  variants,
  canPurchase,
  timedSaleEventId,
  variantPriceDisplay = "difference",
  compact = false,
  pickerMode = "dropdown",
  overlayHostRef,
  className = "",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const [addedFlash, setAddedFlash] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const purchasable = variants.filter(variantIsPurchasable);
  const needsPicker = purchasable.length > 1;
  const cardOverlay = pickerMode === "card-overlay";
  const hostOverlayActive = cardOverlay && !!(pickerOpen || addedFlash);
  const hostRect = useOverlayHostRect(overlayHostRef, hostOverlayActive);

  useEffect(() => {
    if (!pickerOpen || cardOverlay) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen, cardOverlay]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  if (!canPurchase || purchasable.length === 0) return null;

  const flashAdded = () => {
    setAddedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setAddedFlash(false), ADDED_FLASH_MS);
  };

  const addWithVariant = (variantId: string | null) => {
    setError("");
    startTransition(async () => {
      const res = await addToCartAction({
        productId,
        variantId,
        quantity: 1,
        timedSaleEventId: timedSaleEventId ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPickerOpen(false);
      flashAdded();
      router.refresh();
    });
  };

  const onQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addedFlash) return;
    if (needsPicker) {
      setPickedId(purchasable[0]?.id ?? "");
      setPickerOpen(true);
      return;
    }
    addWithVariant(purchasable.length === 1 ? purchasable[0].id : null);
  };

  const btnClass = compact ? `${btnMainSm} font-black shadow` : btnMainMd;

  const addedClass = compact
    ? "rounded border-2 border-emerald-700 bg-emerald-600 px-2 py-1 text-[10px] font-black text-white shadow"
    : "rounded border-2 border-emerald-700 bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow";

  const pickerBody = (
    <>
      <p className="text-xs font-black text-palm">Choose option</p>
      <p className="mt-0.5 line-clamp-2 text-[10px] text-ink/60">{productName}</p>
      <ul className={`mt-2 space-y-1 overflow-y-auto ${cardOverlay ? "max-h-48" : "max-h-40"}`}>
        {purchasable.map((v) => {
          const priceLabel = variantOptionPriceLabel(
            variantPriceDisplay,
            basePriceCents,
            v.priceDeltaCents,
          );
          return (
            <li key={v.id}>
              <button
                type="button"
                className={`w-full text-left text-xs font-bold ${pickedId === v.id ? btnChipActive : btnChip}`}
                onClick={() => setPickedId(v.id)}
              >
                {v.label}
                {priceLabel ? (
                  <span className="ml-1 font-normal text-ink/70">· {priceLabel}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={`flex-1 ${btnSecondarySm}`}
          onClick={() => setPickerOpen(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || !pickedId}
          className={`flex-1 ${btnMainSm}`}
          onClick={() => addWithVariant(pickedId)}
        >
          {pending ? "…" : "Add"}
        </button>
      </div>
    </>
  );

  const cardPortal =
    cardOverlay && hostRect && typeof document !== "undefined"
      ? createPortal(
          addedFlash ? (
            <div
              style={fixedHostStyle(hostRect)}
              className="flex items-center justify-center rounded border-2 border-emerald-800 bg-emerald-600 px-3 text-center shadow-lg"
              aria-live="polite"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-black text-white sm:text-base">Added to cart</span>
            </div>
          ) : pickerOpen && needsPicker ? (
            <div
              role="dialog"
              aria-modal="true"
              style={fixedHostStyle(hostRect)}
              className="flex flex-col justify-center rounded border-2 border-palm bg-white/98 p-3 shadow-xl dark:bg-zinc-900/98"
              onClick={(e) => e.stopPropagation()}
            >
              {pickerBody}
            </div>
          ) : null,
          document.body,
        )
      : null;

  return (
    <>
      {cardPortal}
      <div ref={wrapRef} className={className} onClick={(e) => e.stopPropagation()}>
        {addedFlash && !cardOverlay ? (
          <span className={addedClass} aria-live="polite">
            Added to cart
          </span>
        ) : !addedFlash || !cardOverlay ? (
          <button type="button" disabled={pending} className={btnClass} onClick={onQuickAdd}>
            {pending ? "…" : compact ? "+ Cart" : "Quick add"}
          </button>
        ) : null}

        {error ? <p className="mt-1 max-w-[12rem] text-[10px] font-bold text-coral">{error}</p> : null}

        {pickerOpen && needsPicker && !cardOverlay ? (
          <div
            role="dialog"
            aria-modal="true"
            className="absolute right-0 z-30 mt-1 w-56 rounded border-2 border-palm bg-white p-3 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {pickerBody}
          </div>
        ) : null}
      </div>
    </>
  );
}

