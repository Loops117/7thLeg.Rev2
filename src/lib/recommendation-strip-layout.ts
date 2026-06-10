/** Shared layout math for product-page related / also-want strips. */

/** Title + price + padding below the square image on strip cards (incl. border slack). */
export const REC_STRIP_TEXT_BLOCK_REM = 4.375;

export function recommendationStripTextBlockPx(): number {
  return Math.round(REC_STRIP_TEXT_BLOCK_REM * 16);
}

export function recommendationStripCardHeightPx(cardWidthPx: number): number {
  return Math.round(cardWidthPx + recommendationStripTextBlockPx());
}

/** Hover preview: enlarged square image, text block stays base size (font unchanged). */
export function recommendationStripPreviewHeightPx(cardWidthPx: number, hoverScale: number): number {
  const imagePx = Math.round(cardWidthPx * hoverScale);
  return imagePx + recommendationStripTextBlockPx();
}

/** Padding around the portaled hover preview so ring + blur halos are not clipped. */
export function recommendationStripGlowBleedPx(glowThicknessPx: number): number {
  return Math.ceil(glowThicknessPx * 8 + 40);
}
