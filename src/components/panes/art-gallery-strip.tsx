"use client";

import { useEffect, useRef, useState } from "react";
import { HorizontalScrollRegion } from "@/components/ui/horizontal-scroll-region";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { carouselAutoScrollIntervalMs } from "@/lib/pane-config";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";

export function ArtGalleryStrip({
  items,
  autoScroll,
  direction,
  speed1to10,
  showArtistName,
  showArtGroup,
}: {
  items: ApprovedArtGalleryItem[];
  autoScroll: boolean;
  direction: "left" | "right";
  speed1to10: number;
  showArtistName: boolean;
  showArtGroup: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRowRef = useRef<HTMLDivElement>(null);
  const [centerWhenFits, setCenterWhenFits] = useState(false);
  const [viewerItem, setViewerItem] = useState<ApprovedArtGalleryItem | null>(null);

  const itemKey = items.map((i) => i.id).join(",");
  const showCaption = showArtistName || showArtGroup;
  const scrollPaused = viewerItem != null;

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

  useEffect(() => {
    if (!viewerItem) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerItem(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerItem]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-palm-mid">Community gallery</p>
        <HorizontalScrollRegion ref={scrollRef} scrollClassName="-mx-1">
          <div
            ref={innerRowRef}
            className={`flex items-stretch gap-3 pb-2 pt-1 ${centerWhenFits ? "justify-center" : "justify-start"}`}
          >
            {items.map((item) => (
              <figure
                key={item.id}
                className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-palm/20 bg-white/80 shadow-sm sm:w-44"
              >
                <button
                  type="button"
                  onClick={() => setViewerItem(item)}
                  className="group relative aspect-[4/5] w-full cursor-zoom-in bg-zinc-100 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon-dark"
                  aria-label={`View artwork by ${item.artistName}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-contain p-1 transition group-hover:opacity-90"
                    loading="lazy"
                  />
                </button>
                {showCaption ? (
                  <figcaption className="border-t border-palm/10 px-2 py-1.5 text-center">
                    {showArtistName ? (
                      <p className="truncate text-[11px] font-bold text-ink">{item.artistName}</p>
                    ) : null}
                    {showArtGroup ? (
                      <p className={`truncate text-[10px] text-ink/50 ${showArtistName ? "" : "text-[11px] font-bold text-ink"}`}>
                        {item.artGroup}
                      </p>
                    ) : null}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </HorizontalScrollRegion>
      </div>

      {viewerItem ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/55 p-2 sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setViewerItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="art-gallery-viewer-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-palm bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-palm/15 px-4 py-3">
              <div>
                <h2 id="art-gallery-viewer-title" className="text-sm font-black text-palm">
                  {viewerItem.artistName}
                </h2>
                {showArtGroup ? (
                  <p className="text-xs text-ink/65">{viewerItem.artGroup}</p>
                ) : null}
              </div>
              <button type="button" onClick={() => setViewerItem(null)} className={btnSecondaryMd}>
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-zinc-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewerItem.imageUrl}
                alt={`Artwork by ${viewerItem.artistName}`}
                className="mx-auto max-h-[70vh] w-auto max-w-full rounded border border-palm/20 object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
