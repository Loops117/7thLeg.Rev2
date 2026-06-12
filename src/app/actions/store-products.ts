"use server";

import {
  countStorefrontEventProducts,
  countStorefrontProducts,
  getStorefrontEventProductPage,
  getStorefrontProductsPage,
  STORE_PAGE_SIZE,
  type StorefrontProductCard,
} from "@/lib/products-storefront";

export type LoadStorePageResult = {
  ok: true;
  products: StorefrontProductCard[];
  total: number;
  hasMore: boolean;
  pageSize: number;
};

export type LoadStorePageError = { ok: false; error: string };

type Args = {
  skip: number;
  typeSlug: string | null;
  eventId: string | null;
  q: string | null;
  take?: number;
  showOutOfStock?: boolean;
  showInBreeding?: boolean;
};

export async function loadStoreProductPage(
  args: Args,
): Promise<LoadStorePageResult | LoadStorePageError> {
  const take = args.take ?? STORE_PAGE_SIZE;
  const typeSlug = args.typeSlug?.trim() || null;
  const eventId = args.eventId?.trim() || null;
  const q = args.q?.trim() || null;
  const skip = Math.max(0, Math.floor(args.skip));

  try {
    if (eventId) {
      const [total, pack] = await Promise.all([
        countStorefrontEventProducts(eventId, q),
        getStorefrontEventProductPage(eventId, skip, take, q),
      ]);
      if (!pack) {
        return { ok: false, error: "Event not found." };
      }
      const products = pack.products;
      const hasMore = skip + products.length < total;
      return { ok: true, products, total, hasMore, pageSize: take };
    }

    const visibility = {
      showOutOfStock: args.showOutOfStock !== false,
      showInBreeding: args.showInBreeding !== false,
    };
    const [total, products] = await Promise.all([
      countStorefrontProducts(typeSlug, q, visibility),
      getStorefrontProductsPage(skip, take, typeSlug, q, visibility),
    ]);
    const hasMore = skip + products.length < total;
    return { ok: true, products, total, hasMore, pageSize: take };
  } catch (e) {
    console.error("loadStoreProductPage", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not load products." };
  }
}
