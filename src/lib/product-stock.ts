/** Storefront copy when quantity is zero (product cards, PDP, cart errors). */
export const PRODUCT_UNAVAILABLE_LABEL = "Breeding in Progress";
export const PRODUCT_UNAVAILABLE_HINT = "Breeding in Progress — check back later.";
export const PRODUCT_UNAVAILABLE_KIT_SUMMARY = "One or more items: Breeding in Progress.";
export const PRODUCT_UNAVAILABLE_OPTION_SUFFIX = " (Breeding in Progress)";

export function productUnavailableError(productName: string, variantLabel?: string): string {
  if (variantLabel) return `${productName} (${variantLabel}): ${PRODUCT_UNAVAILABLE_LABEL}.`;
  return `${productName}: ${PRODUCT_UNAVAILABLE_LABEL}.`;
}

/** Storefront / cards: in stock when unlimited or quantity &gt; 0. */
export function productAppearsInStock(p: {
  quantity: number;
  unlimitedQuantity?: boolean | null;
}): boolean {
  return !!p.unlimitedQuantity || p.quantity > 0;
}

export function variantIsPurchasable(v: {
  active: boolean;
  unlimitedStock: boolean;
  stock: number;
}): boolean {
  return v.active && (v.unlimitedStock || v.stock > 0);
}

/** When the product has no variants, uses product-level stock. When it has variants, at least one purchasable variant must exist. */
export function productCanPurchase(p: {
  quantity: number;
  unlimitedQuantity?: boolean | null;
  variants: { active: boolean; unlimitedStock: boolean; stock: number }[];
}): boolean {
  if (p.variants.length === 0) {
    return productAppearsInStock(p);
  }
  return p.variants.some(variantIsPurchasable);
}

/** Listing cards: if the product has variants, any purchasable variant counts as in stock. */
export function productCardAppearsInStock(p: {
  quantity: number;
  unlimitedQuantity?: boolean | null;
  variants: { active: boolean; unlimitedStock: boolean; stock: number }[];
}): boolean {
  if (p.variants.length === 0) return productAppearsInStock(p);
  return p.variants.some(variantIsPurchasable);
}
