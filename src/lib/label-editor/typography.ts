/** Font size stored as 0–100 (% of container height). Values >100 are legacy px. */
export function normalizeFontSizePercent(value: number, legacyRefPx = 24): number {
  if (!Number.isFinite(value)) return 50;
  if (value > 100) {
    return Math.min(100, Math.max(1, Math.round((value / legacyRefPx) * 100)));
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function fontSizePxFromPercent(percent: number, containerPx: number, minPx = 6): number {
  const p = normalizeFontSizePercent(percent, containerPx || 24);
  if (p <= 0) return minPx;
  const h = Math.max(1, containerPx);
  return Math.max(minPx, (p / 100) * h);
}

/** Shrink font so single-line text fits cell bounds (used when textFit is on). */
export function fitFontSizePx(
  text: string,
  cellWidthPx: number,
  cellHeightPx: number,
  maxPx: number,
): number {
  const len = Math.max(1, text.length);
  const pad = 4;
  const byWidth = (Math.max(1, cellWidthPx) - pad) / (len * 0.52);
  const byHeight = Math.max(1, cellHeightPx) * 0.88;
  return Math.max(6, Math.min(maxPx, byWidth, byHeight));
}

export function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

export function pxFromPercent(percent: number, totalPx: number): number {
  const p = Math.min(100, Math.max(0, percent));
  return Math.max(1, Math.round((p / 100) * totalPx));
}

/** Normalize #rgb / named colors for <input type="color"> (needs #rrggbb). */
export function colorInputValue(color: string, fallback = "#1b4332"): string {
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    const r = c[1]!;
    const g = c[2]!;
    const b = c[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}
