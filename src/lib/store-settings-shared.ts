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

export type StoreSettingsState = {
  storeBannerEnabled: boolean;
  storeBannerHtml: string;
  storeFeaturedStripEnabled: boolean;
  storeFeaturedStripConfig: StoreFeaturedStripConfig;
  storeProductCardConfig: StoreProductCardConfig;
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
  storeFooterEnabled: false,
  storeFooterHtml: "",
  cardHoverMode: "zoom",
});
