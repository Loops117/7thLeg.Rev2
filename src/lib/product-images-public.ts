/** Shown when a product has no uploaded images (Supabase public asset). */
export const PRODUCT_IMAGE_PLACEHOLDER_URL =
  "https://qtfzfijqelkkmyxwvazx.supabase.co/storage/v1/object/public/Image%20Upload/ImageComingSoon.png";

export function hasProductImages(images: StorefrontImageRow[]): boolean {
  return images.length > 0;
}

export function withProductImagePlaceholder(url: string | null | undefined): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : PRODUCT_IMAGE_PLACEHOLDER_URL;
}

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

/** Prefer the image assigned to `variantId`, then general / primary listing image. */
export function pickStorefrontImageForVariant(
  images: StorefrontImageRow[],
  variantId: string | null,
): string | undefined {
  if (variantId) {
    const forVariant = images.find((i) => i.variantId === variantId);
    if (forVariant) return storefrontImageUrl(forVariant);
  }
  return pickPrimaryProductImage(images);
}

/** Storefront listing / cart / kit: real image when present, else placeholder. */
export function storefrontDisplayImageUrl(
  images: StorefrontImageRow[],
  variantId?: string | null,
): string {
  const picked =
    variantId != null
      ? pickStorefrontImageForVariant(images, variantId)
      : pickPrimaryProductImage(images);
  return withProductImagePlaceholder(picked);
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
