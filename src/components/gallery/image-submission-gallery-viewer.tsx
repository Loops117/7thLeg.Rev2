"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const taggedProducts = useMemo(() => dedupeTaggedPins(pins), [pins]);

  useEffect(() => {
    setHidePins(false);
    setHighlightKey(null);
  }, [item.id]);

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
        className="gallery-viewer-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 shadow-2xl"
        style={{ ["--gallery-pin-highlight" as string]: pinAppearance.highlightColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gallery-viewer-panel-border flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
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
          <div className="gallery-viewer-panel-border border-b px-4 py-2">
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

        <div className="gallery-viewer-image-bg min-h-0 flex-1 overflow-auto p-4">
          <ImageSubmissionPinsOverlay
            imageUrl={item.imageUrl}
            alt={`Photo submitted by ${item.submitterName}`}
            pins={pins}
            pinAppearance={pinAppearance}
            interactive
            showPins={!hidePins}
            highlightKey={highlightKey}
            onHighlightKeyChange={setHighlightKey}
            className="mx-auto w-fit max-w-full"
            imgClassName="gallery-viewer-image-frame mx-auto max-h-[70vh] w-auto max-w-full rounded border object-contain"
            maxHeight="70vh"
          />
        </div>

        {taggedProducts.length > 0 ? (
          <div className="gallery-viewer-panel-border border-t px-4 py-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-palm">Tagged products</h3>
            <ul className="mt-2 space-y-2">
              {taggedProducts.map((pin) => {
                const rowKey = storefrontPinHighlightKey(pin);
                const isActive = pinMatchesActiveProduct(pin, activeProductSlug);
                const isHighlighted = highlightKey === rowKey;
                return (
                  <li key={rowKey}>
                    <Link
                      href={productUrlForPin(pin.productSlug, pin.variantId)}
                      aria-current={isActive ? "page" : undefined}
                      onMouseEnter={() => setHighlightKey(rowKey)}
                      onMouseLeave={() => setHighlightKey(null)}
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
