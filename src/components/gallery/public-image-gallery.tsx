"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GalleryArtThumb } from "@/components/gallery/gallery-art-thumb";
import { ImageSubmissionGalleryViewer } from "@/components/gallery/image-submission-gallery-viewer";
import {
  submissionMatchesProductSearch,
  uniqueTaggedProductNames,
} from "@/lib/gallery-product-search";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";

export function PublicImageGallery({
  items,
  pinsBySubmissionId = {},
  pinAppearance,
}: {
  items: ApprovedArtGalleryItem[];
  pinsBySubmissionId?: Record<string, StorefrontImagePin[]>;
  pinAppearance: ImageSubmissionPinAppearance;
}) {
  const [viewerItem, setViewerItem] = useState<ApprovedArtGalleryItem | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const productHints = useMemo(() => uniqueTaggedProductNames(pinsBySubmissionId), [pinsBySubmissionId]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        submissionMatchesProductSearch(pinsBySubmissionId[item.id], productSearch),
      ),
    [items, pinsBySubmissionId, productSearch],
  );

  const viewerPins = viewerItem ? (pinsBySubmissionId[viewerItem.id] ?? []) : [];

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
      <div className="mb-6 max-w-xl">
        <label htmlFor="gallery-product-search" className="block text-sm font-bold text-ink">
          Search by product
        </label>
        <input
          id="gallery-product-search"
          type="search"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Product name…"
          list="gallery-product-search-hints"
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-sm text-ink"
        />
        <datalist id="gallery-product-search-hints">
          {productHints.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-ink/60">
          Shows photos that have a shoppable pin for a matching product. Clear the field to see all images.
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <div className="gallery-empty-state rounded-xl border-2 border-dashed p-8 text-center">
          <p className="font-bold text-palm">No matching photos</p>
          <p className="mt-2 text-sm text-ink/75">
            No approved images are tagged with a product matching &ldquo;{productSearch.trim()}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setProductSearch("")}
            className="mt-4 text-sm font-bold text-lagoon-dark underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filteredItems.map((item) => {
            const thumbPins = pinsBySubmissionId[item.id] ?? [];
            return (
              <GalleryArtThumb
                key={item.id}
                item={item}
                pinCount={thumbPins.length}
                onOpen={() => setViewerItem(item)}
              />
            );
          })}
        </div>
      )}

      {viewerItem ? (
        <ImageSubmissionGalleryViewer
          item={viewerItem}
          pins={viewerPins}
          pinAppearance={pinAppearance}
          onClose={() => setViewerItem(null)}
          titleId="public-gallery-viewer-title"
        />
      ) : null}
    </>
  );
}
