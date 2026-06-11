/** Storefront copy — out of stock (inventory zero). */
export const PRODUCT_OUT_OF_STOCK_LABEL = "Out of Stock";
export const PRODUCT_OUT_OF_STOCK_HINT = "Out of Stock — check back later.";
export const PRODUCT_OUT_OF_STOCK_KIT_SUMMARY = "One or more items: Out of Stock.";
export const PRODUCT_OUT_OF_STOCK_OPTION_SUFFIX = " (Out of Stock)";

/** Storefront copy — admin-marked breeding (not for sale). */
export const PRODUCT_BREEDING_LABEL = "Breeding in Progress";
export const PRODUCT_BREEDING_HINT = "Breeding in Progress — check back later.";
export const PRODUCT_BREEDING_WISHLIST_NOTIFY =
  "We'll notify you when this species is available.";
export const PRODUCT_BREEDING_KIT_SUMMARY = "One or more items: Breeding in Progress.";
export const PRODUCT_BREEDING_OPTION_SUFFIX = " (Breeding in Progress)";

export type ProductBreedingShape = { inBreeding?: boolean | null };

export type ProductStockShape = {
  quantity: number;
  unlimitedQuantity?: boolean | null;
  variants: { active: boolean; unlimitedStock: boolean; stock: number }[];
};

export type ProductAvailability = "available" | "breeding" | "outofstock";

export function productInBreeding(p: ProductBreedingShape): boolean {
  return !!p.inBreeding;
}

export function productUnavailableError(
  productName: string,
  variantLabel?: string,
  inBreeding?: boolean,
): string {
  const label = inBreeding ? PRODUCT_BREEDING_LABEL : PRODUCT_OUT_OF_STOCK_LABEL;
  if (variantLabel) return `${productName} (${variantLabel}): ${label}.`;
  return `${productName}: ${label}.`;
}

export function productUnavailableHint(p: ProductBreedingShape): string {
  return productInBreeding(p) ? PRODUCT_BREEDING_HINT : PRODUCT_OUT_OF_STOCK_HINT;
}

export function productCardUnavailableLabel(p: ProductBreedingShape & ProductStockShape): string | null {
  const status = productAvailability(p);
  if (status === "breeding") return PRODUCT_BREEDING_LABEL;
  if (status === "outofstock") return PRODUCT_OUT_OF_STOCK_LABEL;
  return null;
}

export function kitItemUnavailableLabel(item: { inBreeding?: boolean; inStock: boolean }): string | null {
  if (item.inStock) return null;
  return item.inBreeding ? PRODUCT_BREEDING_LABEL : PRODUCT_OUT_OF_STOCK_LABEL;
}

export function kitUnavailableSummary(items: { inBreeding?: boolean; inStock: boolean }[]): string | null {
  if (items.every((i) => i.inStock)) return null;
  if (items.some((i) => i.inBreeding)) return PRODUCT_BREEDING_KIT_SUMMARY;
  return PRODUCT_OUT_OF_STOCK_KIT_SUMMARY;
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

/** Wishlist: breeding items allow any active option; otherwise same as purchasable. */
export function variantIsWishlistable(
  v: { active: boolean; unlimitedStock: boolean; stock: number },
  inBreeding: boolean,
): boolean {
  if (!v.active) return false;
  if (inBreeding) return true;
  return variantIsPurchasable(v);
}

function productHasPurchasableStock(p: ProductStockShape): boolean {
  if (p.variants.length === 0) {
    return productAppearsInStock(p);
  }
  return p.variants.some(variantIsPurchasable);
}

export function productAvailability(p: ProductBreedingShape & ProductStockShape): ProductAvailability {
  if (productInBreeding(p)) return "breeding";
  if (productHasPurchasableStock(p)) return "available";
  return "outofstock";
}

/** PDP / cart: purchasable when not breeding and stock allows. */
export function productCanPurchase(p: ProductBreedingShape & ProductStockShape): boolean {
  if (productInBreeding(p)) return false;
  return productHasPurchasableStock(p);
}

/** Listing cards: breeding and zero-stock both count as unavailable. */
export function productCardAppearsInStock(p: ProductBreedingShape & ProductStockShape): boolean {
  if (productInBreeding(p)) return false;
  return productHasPurchasableStock(p);
}
