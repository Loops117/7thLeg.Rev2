import { prisma } from "@/lib/prisma";
import {
  STOREFRONT_NAV_LINK_DEFAULTS,
  trimStorefrontNavLabel,
  type StorefrontNavSettings,
} from "@/lib/storefront-nav-settings-shared";

export type {
  StorefrontNavLinkId,
  StorefrontNavLinkState,
  StorefrontNavSettings,
} from "@/lib/storefront-nav-settings-shared";

export { STOREFRONT_NAV_LINK_DEFAULTS } from "@/lib/storefront-nav-settings-shared";

export function normalizeStorefrontNavSettings(row: {
  navShopEnabled?: boolean | null;
  navShopLabel?: string | null;
  navFeaturedEnabled?: boolean | null;
  navFeaturedLabel?: string | null;
  navAboutEnabled?: boolean | null;
  navAboutLabel?: string | null;
  navGalleryEnabled?: boolean | null;
  navGalleryLabel?: string | null;
} | null): StorefrontNavSettings {
  const d = STOREFRONT_NAV_LINK_DEFAULTS;
  if (!row) {
    return {
      shop: { ...d.shop },
      featured: { ...d.featured },
      gallery: { ...d.gallery },
      about: { ...d.about },
    };
  }
  return {
    shop: {
      enabled: row.navShopEnabled ?? d.shop.enabled,
      label: trimStorefrontNavLabel(row.navShopLabel ?? "", d.shop.label),
    },
    featured: {
      enabled: row.navFeaturedEnabled ?? d.featured.enabled,
      label: trimStorefrontNavLabel(row.navFeaturedLabel ?? "", d.featured.label),
    },
    gallery: {
      enabled: row.navGalleryEnabled ?? d.gallery.enabled,
      label: trimStorefrontNavLabel(row.navGalleryLabel ?? "", d.gallery.label),
    },
    about: {
      enabled: row.navAboutEnabled ?? d.about.enabled,
      label: trimStorefrontNavLabel(row.navAboutLabel ?? "", d.about.label),
    },
  };
}

const navSelect = {
  navShopEnabled: true,
  navShopLabel: true,
  navFeaturedEnabled: true,
  navFeaturedLabel: true,
  navAboutEnabled: true,
  navAboutLabel: true,
  navGalleryEnabled: true,
  navGalleryLabel: true,
} as const;

export async function getStorefrontNavSettings(): Promise<StorefrontNavSettings> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: navSelect,
    });
    return normalizeStorefrontNavSettings(row);
  } catch {
    return {
      shop: { ...STOREFRONT_NAV_LINK_DEFAULTS.shop },
      featured: { ...STOREFRONT_NAV_LINK_DEFAULTS.featured },
      gallery: { ...STOREFRONT_NAV_LINK_DEFAULTS.gallery },
      about: { ...STOREFRONT_NAV_LINK_DEFAULTS.about },
    };
  }
}

export function storefrontNavPrismaData(nav: StorefrontNavSettings) {
  return {
    navShopEnabled: nav.shop.enabled,
    navShopLabel: trimStorefrontNavLabel(nav.shop.label, STOREFRONT_NAV_LINK_DEFAULTS.shop.label),
    navFeaturedEnabled: nav.featured.enabled,
    navFeaturedLabel: trimStorefrontNavLabel(
      nav.featured.label,
      STOREFRONT_NAV_LINK_DEFAULTS.featured.label,
    ),
    navGalleryEnabled: nav.gallery.enabled,
    navGalleryLabel: trimStorefrontNavLabel(nav.gallery.label, STOREFRONT_NAV_LINK_DEFAULTS.gallery.label),
    navAboutEnabled: nav.about.enabled,
    navAboutLabel: trimStorefrontNavLabel(nav.about.label, STOREFRONT_NAV_LINK_DEFAULTS.about.label),
  };
}
