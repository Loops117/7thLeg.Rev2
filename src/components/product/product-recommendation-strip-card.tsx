"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { StoreProductCard } from "@/components/store/store-product-card";
import {
  recommendationStripCardHeightPx,
  recommendationStripGlowBleedPx,
  recommendationStripPreviewHeightPx,
} from "@/lib/recommendation-strip-layout";
import type { ProductBackSource } from "@/lib/product-back-nav";
import type { StorefrontProductCard } from "@/lib/products-storefront";

type PreviewAnchor = {
  cx: number;
  cy: number;
  outerWidth: number;
  outerHeight: number;
};

function anchorFromCardRect(
  rect: DOMRect,
  cardWidthPx: number,
  hoverScale: number,
  glowThicknessPx: number,
): PreviewAnchor {
  const glowPad = recommendationStripGlowBleedPx(glowThicknessPx);
  const scaledW = Math.round(cardWidthPx * hoverScale);
  const scaledH = recommendationStripPreviewHeightPx(cardWidthPx, hoverScale);
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

type SharedCardProps = {
  eventId?: string | null;
  productBackFrom?: ProductBackSource | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
};

export function ProductRecommendationStripCard({
  product,
  cardWidthPx,
  hoverGlowHex = "#2a9d8f",
  hoverGlowThicknessPx = 4,
  hoverZoomPercent = 125,
  eventId = null,
  productBackFrom = null,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
}: {
  product: StorefrontProductCard;
  cardWidthPx: number;
  hoverGlowHex?: string;
  hoverGlowThicknessPx?: number;
  hoverZoomPercent?: number;
} & SharedCardProps) {
  const previewId = useId();
  const itemRef = useRef<HTMLLIElement>(null);
  const [hovering, setHovering] = useState(false);
  const [anchor, setAnchor] = useState<PreviewAnchor | null>(null);

  const hoverScale = hoverZoomPercent / 100;
  const baseHeightPx = recommendationStripCardHeightPx(cardWidthPx);
  const previewWidthPx = Math.round(cardWidthPx * hoverScale);
  const previewHeightPx = recommendationStripPreviewHeightPx(cardWidthPx, hoverScale);

  const cardProps = {
    product,
    compact: true as const,
    mini: true as const,
    recommendationStrip: true as const,
    fillImage: true as const,
    eventId,
    productFrom: productBackFrom,
    productDiagonalBrandName,
    productDiagonalNameGapPx,
    watermarkOpacityPercent,
  };

  const measureAnchor = useCallback(() => {
    const el = itemRef.current;
    if (!el) return;
    setAnchor(anchorFromCardRect(el.getBoundingClientRect(), cardWidthPx, hoverScale, hoverGlowThicknessPx));
  }, [cardWidthPx, hoverScale, hoverGlowThicknessPx]);

  useEffect(() => {
    if (!hovering) return;
    const onScroll = () => setHovering(false);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [hovering]);

  const preview =
    hovering && anchor && typeof document !== "undefined"
      ? createPortal(
          <div
            id={previewId}
            role="presentation"
            className="product-recommendation-hover-preview pointer-events-none fixed z-[200]"
            style={
              {
                left: anchor.cx,
                top: anchor.cy,
                width: anchor.outerWidth,
                height: anchor.outerHeight,
                transform: "translate(-50%, -50%)",
                "--rec-hover-glow": hoverGlowHex,
                "--rec-glow-ring-px": `${hoverGlowThicknessPx}px`,
              } as CSSProperties
            }
          >
            <div
              className="product-recommendation-hover-preview__card"
              style={
                {
                  width: previewWidthPx,
                  height: previewHeightPx,
                } as CSSProperties
              }
            >
              <StoreProductCard {...cardProps} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <li
        ref={itemRef}
        className="product-recommendation-strip__item shrink-0"
        style={
          {
            "--product-recommendation-card-width": `${cardWidthPx}px`,
            "--product-recommendation-card-height": `${baseHeightPx}px`,
          } as CSSProperties
        }
        onMouseEnter={() => {
          measureAnchor();
          setHovering(true);
        }}
        onMouseLeave={() => {
          setHovering(false);
          setAnchor(null);
        }}
      >
        <div className={hovering ? "opacity-0" : undefined} aria-hidden={hovering}>
          <StoreProductCard {...cardProps} />
        </div>
      </li>
      {preview}
    </>
  );
}
