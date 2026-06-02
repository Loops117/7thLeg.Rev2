/**
 * Whether `productId` is in an event catalog defined by union of linked types and explicit products.
 * Event types match products tagged on the type or any descendant (e.g. Live Inverts includes Cubaris sp.).
 */
export function productInEventLinkedCatalog(
  productId: string,
  productTypeIds: readonly string[],
  eventTypeIdsExpanded: readonly string[],
  eventProductIds: readonly string[],
): boolean {
  if (eventProductIds.includes(productId)) return true;
  if (eventTypeIdsExpanded.length === 0 && eventProductIds.length === 0) return false;
  return productTypeIds.some((tid) => eventTypeIdsExpanded.includes(tid));
}
