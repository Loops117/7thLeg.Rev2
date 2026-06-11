"use server";

import {
  countStorefrontInBreedingProducts,
  getStorefrontInBreedingProductsPage,
  STORE_PAGE_SIZE,
  type StorefrontProductCard,
} from "@/lib/products-storefront";

export type LoadInBreedingPageResult = {
  ok: true;
  products: StorefrontProductCard[];
  total: number;
  hasMore: boolean;
  pageSize: number;
};

export type LoadInBreedingPageError = { ok: false; error: string };

export async function loadInBreedingProductPage(args: {
  skip: number;
  typeSlug: string | null;
  eventId: string | null;
  q: string | null;
  take?: number;
}): Promise<LoadInBreedingPageResult | LoadInBreedingPageError> {
  const take = args.take ?? STORE_PAGE_SIZE;
  const typeSlug = args.typeSlug?.trim() || null;
  const q = args.q?.trim() || null;
  const skip = Math.max(0, Math.floor(args.skip));

  try {
    const [total, products] = await Promise.all([
      countStorefrontInBreedingProducts(typeSlug, q),
      getStorefrontInBreedingProductsPage(skip, take, typeSlug, q),
    ]);
    const hasMore = skip + products.length < total;
    return { ok: true, products, total, hasMore, pageSize: take };
  } catch (e) {
    console.error("loadInBreedingProductPage", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not load products." };
  }
}
