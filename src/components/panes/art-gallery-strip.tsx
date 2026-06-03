"use client";

import { useEffect, useRef, useState } from "react";
import { GalleryArtThumb } from "@/components/gallery/gallery-art-thumb";
import { ImageSubmissionGalleryViewer } from "@/components/gallery/image-submission-gallery-viewer";
import { HorizontalScrollRegion } from "@/components/ui/horizontal-scroll-region";
import { carouselAutoScrollIntervalMs } from "@/lib/pane-config";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";

export function ArtGalleryStrip({
  items,
  autoScroll,
  direction,
  speed1to10,
  pinsBySubmissionId = {},
  pinAppearance,
}: {
  items: ApprovedArtGalleryItem[];
  autoScroll: boolean;
  direction: "left" | "right";
  speed1to10: number;
  pinsBySubmissionId?: Record<string, StorefrontImagePin[]>;
  pinAppearance: ImageSubmissionPinAppearance;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRowRef = useRef<HTMLDivElement>(null);
  const [centerWhenFits, setCenterWhenFits] = useState(false);
  const [viewerItem, setViewerItem] = useState<ApprovedArtGalleryItem | null>(null);

  const itemKey = items.map((i) => i.id).join(",");
  const scrollPaused = viewerItem != null;
  const viewerPins = viewerItem ? (pinsBySubmissionId[viewerItem.id] ?? []) : [];

  useEffect(() => {
    if (!autoScroll || scrollPaused || items.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;

    const step = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if (direction === "left") {
        if (el.scrollLeft >= max - 2) el.scrollTo({ left: 0, behavior: "auto" });
        else el.scrollBy({ left: 220, behavior: "smooth" });
      } else {
        if (el.scrollLeft <= 2) el.scrollTo({ left: max, behavior: "auto" });
        else el.scrollBy({ left: -220, behavior: "smooth" });
      }
    };

    const intervalMs = carouselAutoScrollIntervalMs(speed1to10);
    const id = window.setInterval(step, intervalMs);
    return () => window.clearInterval(id);
  }, [autoScroll, direction, items.length, scrollPaused, speed1to10]);

  useEffect(() => {
    const el = scrollRef.current;
    const row = innerRowRef.current;
    if (!el) return;
    const scrollEl = el;
    function measure() {
      setCenterWhenFits(scrollEl.scrollWidth <= scrollEl.clientWidth + 2);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (row) ro.observe(row);
    return () => ro.disconnect();
  }, [itemKey]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-palm-mid">
          Community gallery ·{" "}
          <a href="/gallery" className="text-lagoon-dark underline hover:text-palm">
            View all
          </a>
        </p>
        <HorizontalScrollRegion ref={scrollRef} scrollClassName="-mx-1">
          <div
            ref={innerRowRef}
            className={`flex items-stretch gap-3 pb-2 pt-1 ${centerWhenFits ? "justify-center" : "justify-start"}`}
          >
            {items.map((item) => {
              const pinCount = (pinsBySubmissionId[item.id] ?? []).length;
              return (
                <GalleryArtThumb
                  key={item.id}
                  item={item}
                  pinCount={pinCount}
                  onOpen={() => setViewerItem(item)}
                  compact
                />
              );
            })}
          </div>
        </HorizontalScrollRegion>
      </div>

      {viewerItem ? (
        <ImageSubmissionGalleryViewer
          item={viewerItem}
          pins={viewerPins}
          pinAppearance={pinAppearance}
          onClose={() => setViewerItem(null)}
          titleId="art-pane-gallery-viewer-title"
        />
      ) : null}
    </>
  );
}
