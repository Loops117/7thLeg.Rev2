"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { addProductToWishlist } from "@/app/actions/wishlist";
import { variantIsWishlistable } from "@/lib/product-stock";
import { btnChip, btnChipActive, btnMainSm, btnSecondarySm } from "@/lib/btn-theme-classes";
import {
  variantOptionPriceLabel,
  type VariantPriceDisplay,
} from "@/lib/product-variant-price-display";

export type QuickWishlistVariant = {
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
  productSlug: string;
  basePriceCents: number;
  variants: QuickWishlistVariant[];
  inBreeding?: boolean;
  timedSaleEventId?: string | null;
  variantPriceDisplay?: VariantPriceDisplay;
  compact?: boolean;
  pickerMode?: "dropdown" | "card-overlay";
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

export function ProductQuickWishlistButton({
  productId,
  productName,
  productSlug,
  basePriceCents,
  variants,
  inBreeding = true,
  timedSaleEventId,
  variantPriceDisplay = "difference",
  compact = false,
  pickerMode = "dropdown",
  overlayHostRef,
  className = "",
}: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const [addedFlash, setAddedFlash] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eligible = variants.filter((v) => variantIsWishlistable(v, inBreeding));
  const needsPicker = eligible.length > 1;
  const cardOverlay = pickerMode === "card-overlay";
  const hostOverlayActive = cardOverlay && !!(pickerOpen || addedFlash);
  const hostRect = useOverlayHostRect(overlayHostRef, hostOverlayActive);
  const productPath = `/product/${productSlug}`;

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

  if (eligible.length === 0 && variants.length > 0) return null;

  const flashAdded = () => {
    setAddedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setAddedFlash(false), ADDED_FLASH_MS);
  };

  const unitPriceForVariant = (variantId: string | null) => {
    if (!variantId) return basePriceCents;
    const v = variants.find((row) => row.id === variantId);
    return basePriceCents + (v?.priceDeltaCents ?? 0);
  };

  const addWithVariant = (variantId: string | null) => {
    setError("");
    startTransition(async () => {
      try {
        await addProductToWishlist({
          productId,
          variantId,
          unitPriceCentsAtAdd: unitPriceForVariant(variantId),
          timedSaleEventIdAtAdd: timedSaleEventId ?? null,
          storefrontProductPath: productPath,
        });
        setPickerOpen(false);
        flashAdded();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save to wishlist.");
      }
    });
  };

  const onQuickWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addedFlash || status === "loading") return;

    if (!session?.user || session.user.role !== "customer") {
      router.push(`/login?callbackUrl=${encodeURIComponent(productPath)}`);
      return;
    }

    if (needsPicker) {
      setPickedId(eligible[0]?.id ?? "");
      setPickerOpen(true);
      return;
    }
    addWithVariant(eligible.length === 1 ? eligible[0].id : null);
  };

  const btnClass = compact ? `${btnSecondarySm} font-black shadow` : btnMainSm;

  const addedClass = compact
    ? "rounded border-2 border-emerald-700 bg-emerald-600 px-2 py-1 text-[10px] font-black text-white shadow"
    : "rounded border-2 border-emerald-700 bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow";

  const pickerBody = (
    <>
      <p className="text-xs font-black text-palm">Choose option</p>
      <p className="mt-0.5 line-clamp-2 text-[10px] text-ink/60">{productName}</p>
      <ul className={`mt-2 space-y-1 overflow-y-auto ${cardOverlay ? "max-h-48" : "max-h-40"}`}>
        {eligible.map((v) => {
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
              <span className="text-sm font-black text-white sm:text-base">Added to wishlist</span>
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
            Added to wishlist
          </span>
        ) : !addedFlash || !cardOverlay ? (
          <button type="button" disabled={pending} className={btnClass} onClick={onQuickWishlist}>
            {pending ? "…" : compact ? "+ Wishlist" : "Add to wishlist"}
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
