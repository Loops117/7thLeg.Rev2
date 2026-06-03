export type StorefrontNavLinkId = "shop" | "featured" | "gallery" | "about";

export type StorefrontNavLinkState = {
  enabled: boolean;
  label: string;
};

export type StorefrontNavSettings = Record<StorefrontNavLinkId, StorefrontNavLinkState>;

export const STOREFRONT_NAV_LINK_DEFAULTS: StorefrontNavSettings = {
  shop: { enabled: true, label: "Shop" },
  featured: { enabled: true, label: "Featured" },
  gallery: { enabled: true, label: "Gallery" },
  about: { enabled: true, label: "About" },
};

export const MAX_STOREFRONT_NAV_LABEL_LEN = 32;

export function trimStorefrontNavLabel(raw: string, fallback: string): string {
  const t = raw.trim().slice(0, MAX_STOREFRONT_NAV_LABEL_LEN);
  return t.length > 0 ? t : fallback;
}
