import { prisma } from "@/lib/prisma";
import {
  defaultStoreSettingsState,
  parseFeaturedStripConfig,
  parseStoreProductCardConfig,
  type StoreSettingsState,
} from "@/lib/store-settings-shared";

export type {
  StoreFeaturedStripConfig,
  StoreProductCardConfig,
  StoreSettingsState,
} from "@/lib/store-settings-shared";

export {
  defaultStoreSettingsState,
  parseFeaturedStripConfig,
  parseStoreProductCardConfig,
  STORE_CARD_WIDTH_PRESETS,
} from "@/lib/store-settings-shared";

export async function getStoreSettings(): Promise<StoreSettingsState> {
  const defaults = defaultStoreSettingsState();
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        storeBannerEnabled: true,
        storeBannerHtml: true,
        storeFeaturedStripEnabled: true,
        storeFeaturedStripConfig: true,
        storeProductCardConfig: true,
        storeFooterEnabled: true,
        storeFooterHtml: true,
        cardHoverMode: true,
      },
    });
    if (!row) return defaults;
    const mode = row.cardHoverMode === "glow" ? "glow" : "zoom";
    return {
      storeBannerEnabled: row.storeBannerEnabled,
      storeBannerHtml: row.storeBannerHtml,
      storeFeaturedStripEnabled: row.storeFeaturedStripEnabled,
      storeFeaturedStripConfig: parseFeaturedStripConfig(row.storeFeaturedStripConfig),
      storeProductCardConfig: parseStoreProductCardConfig(row.storeProductCardConfig),
      storeFooterEnabled: row.storeFooterEnabled,
      storeFooterHtml: row.storeFooterHtml,
      cardHoverMode: mode,
    };
  } catch {
    return defaults;
  }
}
