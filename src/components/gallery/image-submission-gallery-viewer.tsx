"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageSubmissionPinsOverlay } from "@/components/gallery/image-submission-pins-overlay";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import {
  pinVariationDisplayName,
  productUrlForPin,
  storefrontPinHighlightKey,
  type StorefrontImagePin,
} from "@/lib/image-submission-pins-storefront";
import { formatPriceUsd } from "@/lib/product-slug";

function dedupeTaggedPins(pins: StorefrontImagePin[]): StorefrontImagePin[] {
  const seen = new Set<string>();
  const out: StorefrontImagePin[] = [];
  for (const pin of pins) {
    const key = storefrontPinHighlightKey(pin);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pin);
  }
  return out;
}

function pinMatchesActiveProduct(pin: StorefrontImagePin, activeProductSlug: string | null | undefined): boolean {
  if (!activeProductSlug?.trim()) return false;
  return pin.productSlug === activeProductSlug.trim();
}

const TAGGED_SWIPE_THRESHOLD_PX = 40;
const TAGGED_MOBILE_SECTION_HEIGHT = "34vh";

function TaggedProductRows({
  taggedProducts,
  activeProductSlug,
  highlightKey,
  onHighlightKeyChange,
}: {
  taggedProducts: StorefrontImagePin[];
  activeProductSlug: string | null;
  highlightKey: string | null;
  onHighlightKeyChange: (key: string | null) => void;
}) {
  return (
    <ul className="space-y-2">
      {taggedProducts.map((pin) => {
        const rowKey = storefrontPinHighlightKey(pin);
        const isActive = pinMatchesActiveProduct(pin, activeProductSlug);
        const isHighlighted = highlightKey === rowKey;
        return (
          <li key={rowKey}>
            <Link
              href={productUrlForPin(pin.productSlug, pin.variantId)}
              aria-current={isActive ? "page" : undefined}
              onMouseEnter={() => onHighlightKeyChange(rowKey)}
              onMouseLeave={() => onHighlightKeyChange(null)}
              className={`gallery-tagged-row flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded border px-3 py-2 text-sm transition ${
                isActive ? "gallery-tagged-row-active" : ""
              } ${isHighlighted ? "gallery-tagged-row-highlighted" : ""}`}
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-palm">{pinVariationDisplayName(pin)}</span>
                  {isActive ? (
                    <span className="gallery-tagged-active-badge rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                      Active
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs font-medium text-ink/70">{pin.productName}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-[color:var(--gallery-price)]">
                {formatPriceUsd(pin.priceCents)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ImageSubmissionGalleryViewer({
  item,
  pins,
  pinAppearance,
  onClose,
  titleId = "image-submission-gallery-viewer-title",
  activeProductSlug = null,
}: {
  item: ApprovedArtGalleryItem;
  pins: StorefrontImagePin[];
  pinAppearance: ImageSubmissionPinAppearance;
  onClose: () => void;
  titleId?: string;
  /** When set (e.g. product page), tagged rows for this product show Active + highlight. */
  activeProductSlug?: string | null;
}) {
  const [hidePins, setHidePins] = useState(false);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [taggedOpen, setTaggedOpen] = useState(false);
  const taggedTouchRef = useRef({ startY: 0, didSwipe: false });
  const taggedProducts = useMemo(() => dedupeTaggedPins(pins), [pins]);
  const hasTaggedProducts = taggedProducts.length > 0;

  useEffect(() => {
    setHidePins(false);
    setHighlightKey(null);
    setTaggedOpen(false);
  }, [item.id]);

  function onTaggedTouchStart(e: React.TouchEvent) {
    taggedTouchRef.current = { startY: e.touches[0]?.clientY ?? 0, didSwipe: false };
  }

  function onTaggedTouchMove(e: React.TouchEvent) {
    const startY = taggedTouchRef.current.startY;
    const currentY = e.touches[0]?.clientY ?? startY;
    if (Math.abs(currentY - startY) > 8) {
      taggedTouchRef.current.didSwipe = true;
    }
  }

  function onTaggedTouchEnd(e: React.TouchEvent) {
    const startY = taggedTouchRef.current.startY;
    const endY = e.changedTouches[0]?.clientY ?? startY;
    const deltaY = endY - startY;
    if (deltaY <= -TAGGED_SWIPE_THRESHOLD_PX) {
      setTaggedOpen(true);
      taggedTouchRef.current.didSwipe = true;
      return;
    }
    if (deltaY >= TAGGED_SWIPE_THRESHOLD_PX) {
      setTaggedOpen(false);
      taggedTouchRef.current.didSwipe = true;
    }
  }

  function onTaggedHeaderClick() {
    if (taggedTouchRef.current.didSwipe) {
      taggedTouchRef.current.didSwipe = false;
      return;
    }
    setTaggedOpen((open) => !open);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="gallery-viewer-scrim fixed inset-0 z-[110] flex items-end justify-center p-2 sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="gallery-viewer-panel flex h-[92vh] max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 shadow-2xl sm:h-auto sm:max-h-[92vh]"
        style={
          {
            ["--gallery-pin-highlight" as string]: pinAppearance.highlightColor,
            ["--gallery-viewer-tagged-mobile-h" as string]: hasTaggedProducts
              ? TAGGED_MOBILE_SECTION_HEIGHT
              : "0px",
          } as React.CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gallery-viewer-panel-border flex shrink-0 flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
          <div>
            <p id={titleId} className="text-sm text-ink">
              <span className="font-bold">Submitted by:</span>{" "}
              <span className="font-black text-palm">{item.submitterName}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className={btnSecondaryMd}>
            Close
          </button>
        </div>

        {pins.length > 0 ? (
          <div className="gallery-viewer-panel-border shrink-0 border-b px-4 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={hidePins}
                onChange={(e) => setHidePins(e.target.checked)}
                className="h-4 w-4 accent-palm"
              />
              Hide product pins
            </label>
          </div>
        ) : null}

        <div className="gallery-viewer-image-bg flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
          <ImageSubmissionPinsOverlay
            imageUrl={item.imageUrl}
            alt={`Photo submitted by ${item.submitterName}`}
            pins={pins}
            pinAppearance={pinAppearance}
            interactive
            showPins={!hidePins}
            highlightKey={highlightKey}
            onHighlightKeyChange={setHighlightKey}
            className="mx-auto"
            imgClassName="gallery-viewer-image-frame max-h-full w-auto max-w-full rounded border object-contain sm:max-h-[70vh]"
          />
        </div>

        {hasTaggedProducts ? (
          <div className="gallery-viewer-panel-border flex shrink-0 flex-col border-t max-sm:h-[var(--gallery-viewer-tagged-mobile-h)] sm:shrink-0">
            <button
              type="button"
              className="gallery-viewer-tagged-toggle flex w-full shrink-0 flex-col items-stretch px-4 py-3 text-left sm:hidden"
              aria-expanded={taggedOpen}
              aria-controls="gallery-viewer-tagged-products"
              onClick={onTaggedHeaderClick}
              onTouchStart={onTaggedTouchStart}
              onTouchMove={onTaggedTouchMove}
              onTouchEnd={onTaggedTouchEnd}
            >
              <span
                className="gallery-viewer-tagged-handle mx-auto mb-2 h-1 w-10 shrink-0 rounded-full"
                aria-hidden
              />
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-palm">
                  Tagged products ({taggedProducts.length})
                </span>
                <span className="text-xs font-bold text-ink/60" aria-hidden>
                  {taggedOpen ? "▾" : "▴"}
                </span>
              </span>
              <span className="mt-0.5 text-[11px] text-ink/55">
                {taggedOpen ? "Swipe down or tap to hide" : "Tap or swipe up to show"}
              </span>
            </button>

            <div className="hidden shrink-0 px-4 pt-3 sm:block">
              <h3 className="text-xs font-black uppercase tracking-wide text-palm">Tagged products</h3>
            </div>

            <div
              id="gallery-viewer-tagged-products"
              className={`min-h-0 flex-1 overflow-y-auto px-4 pb-3 sm:mt-2 sm:!pointer-events-auto sm:!opacity-100 sm:block sm:max-h-none sm:overflow-visible ${
                taggedOpen ? "max-sm:opacity-100" : "max-sm:pointer-events-none max-sm:opacity-0"
              }`}
            >
              <TaggedProductRows
                taggedProducts={taggedProducts}
                activeProductSlug={activeProductSlug}
                highlightKey={highlightKey}
                onHighlightKeyChange={setHighlightKey}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
