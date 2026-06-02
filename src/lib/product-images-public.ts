/** Card / listing: choose public URL (watermarked when configured). */
export type StorefrontImageRow = {
  url: string;
  watermarkedUrl?: string | null;
  useWatermarkedPublic?: boolean | null;
  variantId: string | null;
};

export function storefrontImageUrl(row: StorefrontImageRow): string {
  if (row.useWatermarkedPublic && row.watermarkedUrl) return row.watermarkedUrl;
  return row.url;
}

/** Card / listing: prefer images marked for all variants (`variantId` null), else first by order. */
export function pickPrimaryProductImage(images: StorefrontImageRow[]): string | undefined {
  const general = images.filter((i) => i.variantId == null);
  const list = general.length > 0 ? general : images;
  const first = list[0];
  return first ? storefrontImageUrl(first) : undefined;
}

export type ProductGalleryImageRow = StorefrontImageRow & {
  id: string;
  sortOrder: number;
};

export function sortProductGalleryImages<T extends { sortOrder: number }>(images: T[]): T[] {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Product page thumbnails: every image (including variation-specific), sorted. */
export function productPageGalleryAll(images: ProductGalleryImageRow[]): ProductGalleryImageRow[] {
  return sortProductGalleryImages(images);
}

/**
 * When the customer picks a variation, prefer that variation's image in the hero.
 * Falls back to the first general ("All") image, then the first image overall.
 */
export function productPagePreferredImageIndex(
  all: ProductGalleryImageRow[],
  selectedVariantId: string,
  hasVariants: boolean,
): number {
  if (all.length === 0) return 0;
  if (!hasVariants || !selectedVariantId) {
    const general = all.findIndex((i) => i.variantId == null);
    return general >= 0 ? general : 0;
  }
  const forVariant = all.findIndex((i) => i.variantId === selectedVariantId);
  if (forVariant >= 0) return forVariant;
  const general = all.findIndex((i) => i.variantId == null);
  return general >= 0 ? general : 0;
}

export function displayImageName(row: { originalFilename: string; url: string }): string {
  const o = row.originalFilename?.trim();
  if (o) return o;
  try {
    const u = row.url;
    const last = u.split("/").pop() || u;
    return last.split("?")[0] || "Image";
  } catch {
    return "Image";
  }
}
