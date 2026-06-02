"use client";

import { ProductDiagonalBrandOverlay } from "@/components/store/product-diagonal-brand-overlay";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import {
  labelPreviewProtectionClassNames,
  labelWatermarkImageStyle,
  labelWatermarkTextStyle,
} from "@/lib/label-preview-watermark";

export function LabelPreviewOverlay({
  config,
  className = "",
}: {
  config: LabelBuilderPublicConfig;
  className?: string;
}) {
  const p = config.preview;
  const showDiagonal =
    p.matchDiagonalBrand && p.productDiagonalBrandOverlay && p.companyName.trim().length > 0;
  const showImage = p.watermarkKind === "global" || p.watermarkKind === "custom";
  const imageUrl = showImage ? p.watermarkImageUrl : null;
  const showText = p.watermarkKind === "text" && p.watermarkText.trim().length > 0;

  const protection = labelPreviewProtectionClassNames(p.protectPreviewInteraction);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${protection} ${className}`}
      aria-hidden
    >
      {showDiagonal ? (
        <ProductDiagonalBrandOverlay
          brandName={p.companyName}
          spacingPx={p.productDiagonalNameGapPx}
          opacityPercent={p.globalWatermarkOpacityPercent}
        />
      ) : null}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={labelWatermarkImageStyle(
            p.watermarkPlacement,
            p.watermarkOpacityPercent,
            p.watermarkScalePercent,
          )}
        />
      ) : null}
      {showText ? (
        <div className="absolute inset-0 overflow-hidden">
          <p
            style={labelWatermarkTextStyle(
              p.watermarkPlacement,
              p.watermarkOpacityPercent,
              p.watermarkScalePercent,
            )}
          >
            {p.watermarkText.trim()}
          </p>
        </div>
      ) : null}
    </div>
  );
}
