/** Client-safe shipping display helpers (no server imports). */
export function shippingCentsAfterEventDiscount(
  listShippingCents: number,
  freeShipping: boolean,
): number {
  if (freeShipping) return 0;
  return Math.max(0, listShippingCents);
}
