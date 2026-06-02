import type { PublicEventForStorefront, StorefrontProductCard } from "@/lib/products-storefront";

/** Data passed from HomePaneStack into HomePaneBlock for event (GIVEAWAY) panes. */
export type EventBlockPayload = {
  event: PublicEventForStorefront;
  products: StorefrontProductCard[];
};
