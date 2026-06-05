"use client";

import { useMemo, useState } from "react";
import { CustomerSuppliedGalleryThumb } from "@/components/product/customer-supplied-gallery-thumb";
import { ImageSubmissionGalleryViewer } from "@/components/gallery/image-submission-gallery-viewer";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import type { CustomerSuppliedImageRow } from "@/lib/image-submission-hotspots";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";
import type { StoreRecommendationCardConfig } from "@/lib/store-settings-shared";

function toGalleryItem(img: CustomerSuppliedImageRow): ApprovedArtGalleryItem {
  return {
    id: img.submissionId,
    imageUrl: img.imageUrl,
    artGroup: "",
    submitterName: img.artistName,
  };
}

export function CustomerSuppliedProductImages({
  images,
  pinsBySubmissionId,
  pinAppearance,
  productSlug,
  recommendationCardConfig,
}: {
  images: CustomerSuppliedImageRow[];
  pinsBySubmissionId: Record<string, StorefrontImagePin[]>;
  pinAppearance: ImageSubmissionPinAppearance;
  productSlug: string;
  /** From Settings → Store → Product cards (shared with related / also-want strips). */
  recommendationCardConfig: StoreRecommendationCardConfig;
}) {
  const [viewerItem, setViewerItem] = useState<ApprovedArtGalleryItem | null>(null);
  const galleryItems = useMemo(() => images.map(toGalleryItem), [images]);
  const viewerPins = viewerItem ? (pinsBySubmissionId[viewerItem.id] ?? []) : [];

  if (images.length === 0) return null;

  return (
    <section className="mt-10 border-t-2 border-palm/20 pt-8" aria-labelledby="customer-supplied-images-heading">
      <h2 id="customer-supplied-images-heading" className="text-lg font-black text-palm">
        Customer supplied product images
      </h2>
      <p className="mt-1 text-sm text-ink/75">Photos from our community that feature this product.</p>
      <ul className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        {galleryItems.map((item) => {
          const thumbPins = pinsBySubmissionId[item.id] ?? [];
          return (
            <CustomerSuppliedGalleryThumb
              key={item.id}
              item={item}
              pinCount={thumbPins.length}
              onOpen={() => setViewerItem(item)}
              cardWidthPx={recommendationCardConfig.cardWidthPx}
              hoverGlowHex={recommendationCardConfig.hoverGlowHex}
              hoverGlowThicknessPx={recommendationCardConfig.hoverGlowThicknessPx}
              hoverZoomPercent={recommendationCardConfig.hoverZoomPercent}
            />
          );
        })}
      </ul>

      {viewerItem ? (
        <ImageSubmissionGalleryViewer
          item={viewerItem}
          pins={viewerPins}
          pinAppearance={pinAppearance}
          activeProductSlug={productSlug}
          onClose={() => setViewerItem(null)}
          titleId="product-supplied-gallery-viewer-title"
        />
      ) : null}
    </section>
  );
}
