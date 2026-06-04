/** Storefront / catalog list price from product base + variations (sort order). */

export type ProductListPriceVariant = {
  priceDeltaCents: number;
  sortOrder?: number;
};

/** List price for the primary (first) variation — matches default variation in admin. */
export function productListPriceCents(
  basePriceCents: number,
  variants: ProductListPriceVariant[] | null | undefined,
): number {
  if (!variants?.length) return basePriceCents;
  const ordered = [...variants].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || 0,
  );
  return basePriceCents + (ordered[0]?.priceDeltaCents ?? 0);
}
