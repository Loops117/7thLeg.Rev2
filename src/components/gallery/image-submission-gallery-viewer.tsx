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
  type StorefrontImagePin,
} from "@/lib/image-submission-pins-storefront";
import { formatPriceUsd } from "@/lib/product-slug";

function dedupeTaggedPins(pins: StorefrontImagePin[]): StorefrontImagePin[] {
  const seen = new Set<string>();
  const out: StorefrontImagePin[] = [];
  for (const pin of pins) {
    const key = `${pin.productSlug}:${pin.variantId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pin);
  }
  return out;
}

export function ImageSubmissionGalleryViewer({
  item,
  pins,
  pinAppearance,
  onClose,
  titleId = "image-submission-gallery-viewer-title",
}: {
  item: ApprovedArtGalleryItem;
  pins: StorefrontImagePin[];
  pinAppearance: ImageSubmissionPinAppearance;
  onClose: () => void;
  titleId?: string;
}) {
  const [hidePins, setHidePins] = useState(false);
  const taggedProducts = useMemo(() => dedupeTaggedPins(pins), [pins]);

  useEffect(() => {
    setHidePins(false);
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
            className="mx-auto w-fit max-w-full"
            imgClassName="gallery-viewer-image-frame mx-auto max-h-[70vh] w-auto max-w-full rounded border object-contain"
            maxHeight="70vh"
          />
        </div>

        {taggedProducts.length > 0 ? (
          <div className="gallery-viewer-panel-border border-t px-4 py-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-palm">Tagged products</h3>
            <ul className="mt-2 space-y-2">
              {taggedProducts.map((pin) => (
                <li key={`${pin.productSlug}:${pin.variantId ?? ""}`}>
                  <Link
                    href={productUrlForPin(pin.productSlug, pin.variantId)}
                    className="gallery-tagged-row flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded border px-3 py-2 text-sm transition"
                  >
                    <span className="min-w-0">
                      <span className="block font-black text-palm">{pinVariationDisplayName(pin)}</span>
                      <span className="block text-xs font-medium text-ink/70">{pin.productName}</span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-[color:var(--gallery-price)]">
                      {formatPriceUsd(pin.priceCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
