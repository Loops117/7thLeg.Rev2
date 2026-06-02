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
