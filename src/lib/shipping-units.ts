/** Admin-only shipping size units per product (1 = smallest, 10 = largest). */
export const SHIPPING_UNITS_MIN = 1;
export const SHIPPING_UNITS_MAX = 10;

export function clampShippingUnits(raw: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return SHIPPING_UNITS_MIN;
  return Math.min(SHIPPING_UNITS_MAX, Math.max(SHIPPING_UNITS_MIN, n));
}

export function clampMaxShippingUnitsForOption(raw: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(1000, n);
}
