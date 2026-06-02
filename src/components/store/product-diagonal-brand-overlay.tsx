"use client";

import { useMemo } from "react";
import { getStoreNameContinuousTile } from "@/lib/store-name-watermark";

/** Diagonal repeating store-name band (matches background watermark continuous tile style). */
export function ProductDiagonalBrandOverlay({
  brandName,
  opacityPercent = 38,
  spacingPx = 8,
}: {
  brandName: string;
  /** 0-100 shared with watermark opacity. */
  opacityPercent?: number;
  /** 0-64 spacing between diagonal lines. */
  spacingPx?: number;
}) {
  const tile = useMemo(
    () => getStoreNameContinuousTile(brandName.trim() || "Shop", 13, Math.max(0, Math.min(64, spacingPx))),
    [brandName, spacingPx],
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{
        opacity: Math.min(0.9, Math.max(0, opacityPercent / 100)),
        backgroundImage: `url("${tile.dataUrl}")`,
        backgroundSize: `${tile.width}px ${tile.height}px`,
      }}
    />
  );
}
