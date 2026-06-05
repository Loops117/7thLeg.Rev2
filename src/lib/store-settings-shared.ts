/** Client-safe store settings types and parsers (no Prisma). */

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export type StoreFeaturedStripConfig = {
  title: string;
  maxProducts: number;
};

const DEFAULT_STRIP: StoreFeaturedStripConfig = {
  title: "Featured picks",
  maxProducts: 8,
};

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

export type StoreProductCardConfig = {
  cardWidthPx: number;
};

export const STORE_CARD_WIDTH_PRESETS = [
  { id: "sm", label: "Small", cardWidthPx: 140 },
  { id: "md", label: "Medium", cardWidthPx: 176 },
  { id: "lg", label: "Large", cardWidthPx: 208 },
  { id: "xl", label: "Extra large", cardWidthPx: 240 },
] as const;

const DEFAULT_PRODUCT_CARD: StoreProductCardConfig = {
  cardWidthPx: STORE_CARD_WIDTH_PRESETS[1].cardWidthPx,
};

export function parseStoreProductCardConfig(raw: unknown): StoreProductCardConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PRODUCT_CARD };
  const o = raw as Record<string, unknown>;
  const w = o.cardWidthPx;
  const cardWidthPx =
    typeof w === "number" && !Number.isNaN(w) ? clamp(Math.floor(w), 120, 320) : DEFAULT_PRODUCT_CARD.cardWidthPx;
  return { cardWidthPx };
}

export type StoreRecommendationCardConfig = {
  cardWidthPx: number;
};

/** Product page related / also-want horizontal strips (mini cards). */
export const RECOMMENDATION_CARD_WIDTH_PRESETS = [
  { id: "xs", label: "Extra small", cardWidthPx: 72 },
  { id: "sm", label: "Small", cardWidthPx: 88 },
  { id: "md", label: "Medium", cardWidthPx: 100 },
  { id: "lg", label: "Large", cardWidthPx: 120 },
  { id: "xl", label: "Extra large", cardWidthPx: 144 },
] as const;

const DEFAULT_RECOMMENDATION_CARD: StoreRecommendationCardConfig = {
  cardWidthPx: RECOMMENDATION_CARD_WIDTH_PRESETS[1].cardWidthPx,
};

export function parseStoreRecommendationCardConfig(raw: unknown): StoreRecommendationCardConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_RECOMMENDATION_CARD };
  const o = raw as Record<string, unknown>;
  const w = o.cardWidthPx;
  const cardWidthPx =
    typeof w === "number" && !Number.isNaN(w)
      ? clamp(Math.floor(w), 56, 200)
      : DEFAULT_RECOMMENDATION_CARD.cardWidthPx;
  return { cardWidthPx };
}

export type StoreSettingsState = {
  storeBannerEnabled: boolean;
  storeBannerHtml: string;
  storeFeaturedStripEnabled: boolean;
  storeFeaturedStripConfig: StoreFeaturedStripConfig;
  storeProductCardConfig: StoreProductCardConfig;
  storeRecommendationCardConfig: StoreRecommendationCardConfig;
  storeFooterEnabled: boolean;
  storeFooterHtml: string;
  cardHoverMode: "zoom" | "glow";
};

export const defaultStoreSettingsState = (): StoreSettingsState => ({
  storeBannerEnabled: false,
  storeBannerHtml: "",
  storeFeaturedStripEnabled: false,
  storeFeaturedStripConfig: { ...DEFAULT_STRIP },
  storeProductCardConfig: { ...DEFAULT_PRODUCT_CARD },
  storeRecommendationCardConfig: { ...DEFAULT_RECOMMENDATION_CARD },
  storeFooterEnabled: false,
  storeFooterHtml: "",
  cardHoverMode: "zoom",
});
