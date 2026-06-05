/** Shared layout math for product-page related / also-want strips. */

/** Title + price + padding below the square image on strip cards. */
export const REC_STRIP_TEXT_BLOCK_REM = 3.125;

export function recommendationStripCardHeightPx(cardWidthPx: number): number {
  const textPx = REC_STRIP_TEXT_BLOCK_REM * 16;
  return Math.round(cardWidthPx + textPx);
}

/** Padding around the portaled hover preview so ring + blur halos are not clipped. */
export function recommendationStripGlowBleedPx(glowThicknessPx: number): number {
  return Math.ceil(glowThicknessPx * 8 + 40);
}
