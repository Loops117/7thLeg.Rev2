/** Sales tax on merchandise subtotal. `bps` = basis points (725 = 7.25%). */
export function taxCentsFromSubtotal(subtotalCents: number, taxRateBps: number): number {
  const bps = Math.max(0, Math.min(999_999, Math.floor(taxRateBps)));
  if (subtotalCents <= 0 || bps === 0) return 0;
  return Math.round((subtotalCents * bps) / 10_000);
}
