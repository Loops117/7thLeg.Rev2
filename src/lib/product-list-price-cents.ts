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

/** First variation by sort order (storefront queries already order variants). */
export function storefrontDefaultVariantLabel(
  variants: { label: string }[] | null | undefined,
): string | null {
  const label = variants?.[0]?.label?.trim();
  return label || null;
}
