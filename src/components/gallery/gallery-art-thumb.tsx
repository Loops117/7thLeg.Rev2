"use client";

import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";

export function GalleryArtThumb({
  item,
  pinCount,
  onOpen,
  compact = false,
  size = "default",
}: {
  item: ApprovedArtGalleryItem;
  pinCount: number;
  onOpen: () => void;
  /** @deprecated Prefer `size="compact"`. */
  compact?: boolean;
  size?: "default" | "compact" | "small";
}) {
  const resolvedSize = compact ? "compact" : size;
  const widthClass =
    resolvedSize === "small"
      ? "w-20 shrink-0 sm:w-24"
      : resolvedSize === "compact"
        ? "w-36 shrink-0 sm:w-44"
        : "";

  return (
    <figure
      className={`gallery-thumb-card overflow-hidden rounded-lg border-2 shadow-sm ${widthClass}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="gallery-thumb-image-bg group relative aspect-[4/5] w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon"
        aria-label={`View photo${pinCount > 0 ? `, ${pinCount} shoppable items` : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          className="h-full w-full object-contain p-1 transition group-hover:opacity-90"
          loading="lazy"
        />
        {pinCount > 0 ? (
          <span className="gallery-pin-count-badge pointer-events-none absolute bottom-1 right-1 z-20 rounded px-1.5 py-0.5 text-[10px] font-bold">
            {pinCount} pin{pinCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </button>
    </figure>
  );
}
