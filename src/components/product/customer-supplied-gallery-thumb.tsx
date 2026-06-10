"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import { recommendationStripGlowBleedPx } from "@/lib/recommendation-strip-layout";

type PreviewAnchor = {
  cx: number;
  cy: number;
  outerWidth: number;
  outerHeight: number;
};

function anchorFromCardRect(
  rect: DOMRect,
  hoverScale: number,
  glowThicknessPx: number,
): PreviewAnchor {
  const glowPad = recommendationStripGlowBleedPx(glowThicknessPx);
  const scaledW = rect.width * hoverScale;
  const scaledH = rect.height * hoverScale;
  const outerWidth = scaledW + glowPad * 2;
  const outerHeight = scaledH + glowPad * 2;
  let cx = rect.left + rect.width / 2;
  let cy = rect.top + rect.height / 2;
  const edgePad = 8;
  const halfW = outerWidth / 2;
  const halfH = outerHeight / 2;
  cx = Math.min(window.innerWidth - halfW - edgePad, Math.max(halfW + edgePad, cx));
  cy = Math.min(window.innerHeight - halfH - edgePad, Math.max(halfH + edgePad, cy));
  return { cx, cy, outerWidth, outerHeight };
}

/** Gallery art thumbs use a 4:5 image area plus the card border. */
function galleryArtThumbHeightPx(cardWidthPx: number): number {
  return Math.round(cardWidthPx * 1.25 + 4);
}

function ThumbFigure({
  item,
  pinCount,
  cardWidthPx,
  baseHeightPx,
  preview = false,
}: {
  item: ApprovedArtGalleryItem;
  pinCount: number;
  cardWidthPx: number;
  baseHeightPx: number;
  preview?: boolean;
}) {
  const image = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt=""
        className="h-full w-full object-contain p-1"
        loading="lazy"
        draggable={false}
      />
      {pinCount > 0 ? (
        <span className="gallery-pin-count-badge pointer-events-none absolute bottom-1 right-1 z-20 rounded px-1.5 py-0.5 text-[10px] font-bold">
          {pinCount} pin{pinCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </>
  );

  return (
    <figure
      className={`gallery-thumb-card shrink-0 rounded-lg border-2 shadow-sm ${
        preview ? "customer-supplied-hover-preview__card overflow-visible" : "overflow-hidden"
      }`}
      style={{ width: cardWidthPx, height: baseHeightPx }}
    >
      <div
        className="gallery-thumb-image-bg relative h-full w-full"
        aria-hidden={preview || undefined}
      >
        {image}
      </div>
    </figure>
  );
}

export function CustomerSuppliedGalleryThumb({
  item,
  pinCount,
  onOpen,
  cardWidthPx,
  hoverGlowHex = "#2a9d8f",
  hoverGlowThicknessPx = 4,
  hoverZoomPercent = 125,
}: {
  item: ApprovedArtGalleryItem;
  pinCount: number;
  onOpen: () => void;
  cardWidthPx: number;
  hoverGlowHex?: string;
  hoverGlowThicknessPx?: number;
  hoverZoomPercent?: number;
}) {
  const previewId = useId();
  const itemRef = useRef<HTMLLIElement>(null);
  const [hoverAnchor, setHoverAnchor] = useState<PreviewAnchor | null>(null);

  const hoverScale = hoverZoomPercent / 100;
  const baseHeightPx = galleryArtThumbHeightPx(cardWidthPx);

  const measureAnchor = useCallback(() => {
    const el = itemRef.current;
    if (!el) return null;
    return anchorFromCardRect(el.getBoundingClientRect(), hoverScale, hoverGlowThicknessPx);
  }, [hoverScale, hoverGlowThicknessPx]);

  useEffect(() => {
    if (!hoverAnchor) return;
    const onScroll = () => setHoverAnchor(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [hoverAnchor]);

  const preview =
    hoverAnchor && typeof document !== "undefined"
      ? createPortal(
          <div
            id={previewId}
            role="presentation"
            className="product-recommendation-hover-preview pointer-events-none fixed z-[200]"
            style={
              {
                left: hoverAnchor.cx,
                top: hoverAnchor.cy,
                width: hoverAnchor.outerWidth,
                height: hoverAnchor.outerHeight,
                transform: "translate(-50%, -50%)",
                "--rec-hover-glow": hoverGlowHex,
                "--rec-glow-ring-px": `${hoverGlowThicknessPx}px`,
                "--rec-hover-zoom-scale": hoverScale,
              } as CSSProperties
            }
          >
            <div
              className="product-recommendation-hover-preview__card product-recommendation-hover-preview__card--uniform-scale"
              style={
                {
                  width: cardWidthPx,
                  height: baseHeightPx,
                } as CSSProperties
              }
            >
              <ThumbFigure
                item={item}
                pinCount={pinCount}
                cardWidthPx={cardWidthPx}
                baseHeightPx={baseHeightPx}
                preview
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <li
        ref={itemRef}
        role="button"
        tabIndex={0}
        className="shrink-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon"
        aria-label={`View photo${pinCount > 0 ? `, ${pinCount} shoppable items` : ""}`}
        onClick={() => {
          setHoverAnchor(null);
          onOpen();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setHoverAnchor(null);
          onOpen();
        }}
        onMouseEnter={() => {
          const next = measureAnchor();
          if (next) setHoverAnchor(next);
        }}
        onMouseLeave={() => setHoverAnchor(null)}
      >
        <div className={hoverAnchor ? "invisible" : undefined} aria-hidden={Boolean(hoverAnchor)}>
          <ThumbFigure
            item={item}
            pinCount={pinCount}
            cardWidthPx={cardWidthPx}
            baseHeightPx={baseHeightPx}
          />
        </div>
      </li>
      {preview}
    </>
  );
}
