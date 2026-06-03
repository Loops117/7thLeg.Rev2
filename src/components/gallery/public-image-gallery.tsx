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

export function PublicImageGallery({
  items,
  pageTitle,
  pinsBySubmissionId = {},
  pinAppearance,
}: {
  items: ApprovedArtGalleryItem[];
  pageTitle: string;
  pinsBySubmissionId?: Record<string, StorefrontImagePin[]>;
  pinAppearance: ImageSubmissionPinAppearance;
}) {
  const [viewerItem, setViewerItem] = useState<ApprovedArtGalleryItem | null>(null);
  const [hidePins, setHidePins] = useState(true);
  const viewerPins = viewerItem ? (pinsBySubmissionId[viewerItem.id] ?? []) : [];
  const taggedProducts = useMemo(() => dedupeTaggedPins(viewerPins), [viewerPins]);

  useEffect(() => {
    if (!viewerItem) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerItem(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerItem]);

  useEffect(() => {
    if (viewerItem) setHidePins(true);
  }, [viewerItem?.id]);

  if (items.length === 0) {
    return (
      <div className="gallery-empty-state rounded-xl border-2 border-dashed p-10 text-center">
        <p className="text-lg font-bold text-palm">No images yet</p>
        <p className="mt-2 max-w-md mx-auto text-sm text-ink/75">
          Approved customer photos will appear here. Check back soon, or submit your own from an image upload section on
          the home page.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-bold text-lagoon-dark underline">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => {
          const thumbPins = pinsBySubmissionId[item.id] ?? [];
          return (
            <figure
              key={item.id}
              className="gallery-thumb-card flex flex-col overflow-hidden rounded-lg border-2 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setViewerItem(item)}
                className="gallery-thumb-image-bg group relative aspect-[4/5] w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon"
                aria-label={`View photo by ${item.artistName}${thumbPins.length > 0 ? `, ${thumbPins.length} shoppable items` : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-full w-full object-contain p-1 transition group-hover:opacity-90"
                  loading="lazy"
                />
                {thumbPins.length > 0 ? (
                  <span className="pointer-events-none absolute bottom-1 right-1 z-20 rounded bg-palm/90 px-1.5 py-0.5 text-[10px] font-bold text-[var(--btn-main-fg)]">
                    {thumbPins.length} pin{thumbPins.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </button>
              <figcaption className="gallery-thumb-caption-border border-t px-2 py-2 text-center">
                <p className="truncate text-xs font-bold text-ink">{item.artistName}</p>
                <p className="truncate text-[10px] text-ink/50">{item.artGroup}</p>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {viewerItem ? (
        <div
          className="gallery-viewer-scrim fixed inset-0 z-[110] flex items-end justify-center p-2 sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setViewerItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-gallery-viewer-title"
            className="gallery-viewer-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gallery-viewer-panel-border flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
              <div>
                <h2 id="public-gallery-viewer-title" className="text-sm font-black text-palm">
                  {viewerItem.artistName}
                </h2>
                <p className="text-xs text-ink/65">
                  {viewerItem.artGroup} · {pageTitle}
                </p>
              </div>
              <button type="button" onClick={() => setViewerItem(null)} className={btnSecondaryMd}>
                Close
              </button>
            </div>

            {viewerPins.length > 0 ? (
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
                imageUrl={viewerItem.imageUrl}
                alt={`Photo by ${viewerItem.artistName}`}
                pins={viewerPins}
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
      ) : null}
    </>
  );
}
