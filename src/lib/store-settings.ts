import { prisma } from "@/lib/prisma";

/** `site_config.store_featured_strip_config` JSON */
export type StoreFeaturedStripConfig = {
  title: string;
  maxProducts: number;
};

const DEFAULT_STRIP: StoreFeaturedStripConfig = {
  title: "Featured picks",
  maxProducts: 8,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function parseFeaturedStripConfig(raw: unknown): StoreFeaturedStripConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STRIP };
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : DEFAULT_STRIP.title;
  const maxRaw = o.maxProducts;
  const maxProducts =
    typeof maxRaw === "number" && !Number.isNaN(maxRaw)
      ? clamp(Math.floor(maxRaw), 1, 48)
      : DEFAULT_STRIP.maxProducts;
  return { title, maxProducts };
}

export type StoreSettingsState = {
  storeBannerEnabled: boolean;
  storeBannerHtml: string;
  storeFeaturedStripEnabled: boolean;
  storeFeaturedStripConfig: StoreFeaturedStripConfig;
  storeFooterEnabled: boolean;
  storeFooterHtml: string;
  cardHoverMode: "zoom" | "glow";
};

export const defaultStoreSettingsState = (): StoreSettingsState => ({
  storeBannerEnabled: false,
  storeBannerHtml: "",
  storeFeaturedStripEnabled: false,
  storeFeaturedStripConfig: { ...DEFAULT_STRIP },
  storeFooterEnabled: false,
  storeFooterHtml: "",
  cardHoverMode: "zoom",
});

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
      storeFooterEnabled: row.storeFooterEnabled,
      storeFooterHtml: row.storeFooterHtml,
      cardHoverMode: mode,
    };
  } catch {
    return defaults;
  }
}
