export type StorefrontImagePin = {
  id: string;
  productSlug: string;
  productName: string;
  variantId: string | null;
  variantLabel: string | null;
  /** Storefront unit price (base + variant delta). */
  priceCents: number;
  xPercent: number;
  yPercent: number;
};

/** First line of gallery pin tooltip. */
export function pinVariationDisplayName(pin: { productName: string; variantLabel: string | null }): string {
  const v = pin.variantLabel?.trim();
  return v && v.length > 0 ? v : pin.productName;
}

/** Tooltip / aria label: variation when mapped, otherwise product name. */
export function pinHoverLabel(pin: { productName: string; variantLabel: string | null }): string {
  return pinVariationDisplayName(pin);
}

export function productUrlForPin(slug: string, variantId: string | null, eventId?: string | null): string {
  const params = new URLSearchParams();
  if (eventId?.trim()) params.set("event", eventId.trim());
  if (variantId?.trim()) params.set("variant", variantId.trim());
  const q = params.toString();
  return `/product/${slug}${q ? `?${q}` : ""}`;
}
