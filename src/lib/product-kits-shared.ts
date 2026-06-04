/** Minimum products in a kit combo (admin + storefront). */
export const MIN_PRODUCT_KIT_ITEMS = 2;

/** Maximum line items in one kit. */
export const MAX_PRODUCT_KIT_ITEMS = 12;

/** Host product lines always sort first (storefront + admin). */
export function orderKitItemsWithHostFirst<T extends { productId: string }>(
  hostProductId: string,
  items: T[],
): T[] {
  const host = items.filter((i) => i.productId === hostProductId);
  const rest = items.filter((i) => i.productId !== hostProductId);
  return [...host, ...rest];
}
