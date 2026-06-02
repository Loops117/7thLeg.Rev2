/** Convert millimeters to pixels at a print DPI (default 300). */
export function mmToPrintPx(mm: number, dpi: number): number {
  return Math.max(1, Math.round((mm * dpi) / 25.4));
}
