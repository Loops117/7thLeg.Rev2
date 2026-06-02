import { getEventPriceOverlayForProduct } from "@/lib/products-storefront";

type ProductPriceFields = {
  id: string;
  basePriceCents: number;
  onSale: boolean;
};

/**
 * Current storefront unit price for a wishlist line (timed event from when added, if still applicable) + variant delta.
 */
export async function computeWishlistCurrentUnitPrice(
  product: ProductPriceFields,
  variantDeltaCents: number,
  timedSaleEventIdAtAdd: string | null | undefined,
): Promise<{ currentUnitCents: number; showSaleNow: boolean }> {
  let baseDisplay = product.basePriceCents;
  let showSale = product.onSale;
  const tid = timedSaleEventIdAtAdd?.trim();
  if (tid) {
    const overlay = await getEventPriceOverlayForProduct(tid, product.id, product.basePriceCents, product.onSale);
    if (overlay) {
      baseDisplay = overlay.displayPriceCents;
      showSale = overlay.displaySale;
    }
  }
  return { currentUnitCents: baseDisplay + variantDeltaCents, showSaleNow: showSale };
}
