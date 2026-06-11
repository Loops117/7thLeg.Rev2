/** Client-safe in-breeding page settings (mirrors store page layout controls). */

import {
  parseFeaturedStripConfig,
  parseStoreProductCardConfig,
  STORE_CARD_WIDTH_PRESETS,
  type StoreFeaturedStripConfig,
  type StoreProductCardConfig,
} from "@/lib/store-settings-shared";

export type InBreedingPageSettingsState = {
  pageTitle: string;
  pageEnabled: boolean;
  bannerEnabled: boolean;
  bannerHtml: string;
  featuredStripEnabled: boolean;
  featuredStripConfig: StoreFeaturedStripConfig;
  productCardConfig: StoreProductCardConfig;
  footerEnabled: boolean;
  footerHtml: string;
};

export const IN_BREEDING_PAGE_TITLE_DEFAULT = "In Breeding";

export function defaultInBreedingPageSettingsState(): InBreedingPageSettingsState {
  return {
    pageTitle: IN_BREEDING_PAGE_TITLE_DEFAULT,
    pageEnabled: true,
    bannerEnabled: false,
    bannerHtml: "",
    featuredStripEnabled: false,
    featuredStripConfig: { title: "Featured breeding", maxProducts: 8 },
    productCardConfig: { cardWidthPx: STORE_CARD_WIDTH_PRESETS[1].cardWidthPx },
    footerEnabled: false,
    footerHtml: "",
  };
}

export function parseInBreedingPageSettings(row: {
  inBreedingPageTitle?: string | null;
  inBreedingPageEnabled?: boolean | null;
  inBreedingBannerEnabled?: boolean | null;
  inBreedingBannerHtml?: string | null;
  inBreedingFeaturedStripEnabled?: boolean | null;
  inBreedingFeaturedStripConfig?: unknown;
  inBreedingProductCardConfig?: unknown;
  inBreedingFooterEnabled?: boolean | null;
  inBreedingFooterHtml?: string | null;
} | null): InBreedingPageSettingsState {
  const d = defaultInBreedingPageSettingsState();
  if (!row) return d;
  const title = row.inBreedingPageTitle?.trim();
  return {
    pageTitle: title && title.length > 0 ? title.slice(0, 120) : d.pageTitle,
    pageEnabled: row.inBreedingPageEnabled ?? d.pageEnabled,
    bannerEnabled: !!row.inBreedingBannerEnabled,
    bannerHtml: row.inBreedingBannerHtml ?? "",
    featuredStripEnabled: !!row.inBreedingFeaturedStripEnabled,
    featuredStripConfig: parseFeaturedStripConfig(row.inBreedingFeaturedStripConfig),
    productCardConfig: parseStoreProductCardConfig(row.inBreedingProductCardConfig),
    footerEnabled: !!row.inBreedingFooterEnabled,
    footerHtml: row.inBreedingFooterHtml ?? "",
  };
}
