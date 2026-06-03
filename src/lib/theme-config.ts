import type { HomePaneConfig } from "@/lib/pane-config";
import { normalizePaneColorHex } from "@/lib/pane-config";

/** Public palette — maps to CSS variables in globals.css / ThemeStyle. */
export type ThemeColors = {
  /** Outer storefront canvas (body, animated background base). */
  siteBg: string;
  /** Main content column & default page surface (`--sand`). */
  sand: string;
  /** Header nav, logo, and account links on the palm bar — not tied to page background. */
  headerFg: string;
  parchment: string;
  palm: string;
  palmMid: string;
  lagoon: string;
  lagoonDark: string;
  coral: string;
  mango: string;
  ink: string;
  surf: string;
  /** Main CTA: shared text + border; background separate. */
  btnMainFg: string;
  btnMainBg: string;
  /** Secondary / toolbar / save / filters (off state). */
  btnSecondaryFg: string;
  btnSecondaryBg: string;
  /** Clear, delete, remove. */
  btnImportantFg: string;
  btnImportantBg: string;
  /** “N pins” badge on gallery thumbnails (home strip + /gallery). Gallery theme only. */
  galleryPinBadgeBg: string;
  galleryPinBadgeFg: string;
};

export type ThemeText = {
  baseFontSizePx: number;
  /** Uses layout-loaded Geist, or system UI stack. */
  bodyFont: "geist" | "system";
  headingFont: "geist" | "system";
};

export type ThemePaneDefaults = {
  paneColorHex: string;
  paneBorderColorHex: string;
  backgroundOpacity: number;
  paneBorderWidthPx: number;
};

/** Storefront shell: main column vs side gutters (customer-facing pages). */
export type ThemeLayout = {
  /** Space outside the main column on each side (shows site background). 0 = full-width column. */
  mainColumnSideGapPx: number;
  /** Left & right border on the main column. */
  mainColumnBorderColorHex: string;
  mainColumnBorderWidthPx: number;
};

/** Store catalog grid cards (/store, carousels, featured strips). */
export type ThemeProductCard = {
  background: string;
  border: string;
  title: string;
  description: string;
  price: string;
  saleTag: string;
  imageArea: string;
  /** Ring color when hover mode is Glow. */
  hoverGlow: string;
};

/** Automatic footer blocks at the bottom of product pages. */
export type ThemeProductFooter = {
  background: string;
  /** 0–100 opacity on the background color. */
  backgroundOpacityPercent: number;
  borderColor: string;
  borderWidthPx: number;
  titleColor: string;
  titleFontSizePx: number;
  bodyColor: string;
  bodyFontSizePx: number;
  linkColor: string;
  /** Divider above the footer section on the product page. */
  sectionBorderColor: string;
  sectionBorderWidthPx: number;
};

/** Top header & bottom footer on customer-facing pages (not cart/admin button accents). */
export type ThemeChrome = {
  headerBg: string;
  /** Company name & logo on the header bar. */
  headerBrandFg: string;
  /** Nav links, Log in, Sign out, account menu — not cart/admin chips. */
  headerNavFg: string;
  headerBorderColorHex: string;
  headerBorderWidthPx: number;
  footerBg: string;
  /** Bold site tagline in the footer. */
  footerBrandFg: string;
  /** Copyright & body copy in the footer. */
  footerFg: string;
  /** Standard text links in the footer. */
  footerLinkFg: string;
  footerBorderColorHex: string;
  footerBorderWidthPx: number;
};

/** One uploaded decor image with spawn settings (merged into background pool; product-pick adds more). */
export type ThemeDecorImageEntry = {
  url: string;
  /** 1–100, relative pick weight (higher = more frequent spawns). */
  weight: number;
  /** When set, this sticker renders above the normal floater layer while visible. */
  alwaysOnTop: boolean;
};

export type ThemeBackgroundExtras = {
  /** Uploaded or static paths under /uploads/theme/ — shown as decorative tiles. */
  decorImageUrls: string[];
  /** Optional structured list; when present, drives weight + on-top. Legacy clients only set decorImageUrls. */
  decorImageEntries?: ThemeDecorImageEntry[];
};

export type SiteThemeConfigBlob = {
  colors?: Partial<ThemeColors>;
  text?: Partial<ThemeText>;
  layout?: Partial<ThemeLayout>;
  chrome?: Partial<ThemeChrome>;
  paneDefaults?: Partial<ThemePaneDefaults>;
  background?: Partial<ThemeBackgroundExtras>;
  storefront?: {
    productCard?: Partial<ThemeProductCard>;
    productFooter?: Partial<ThemeProductFooter>;
  };
};

export const BUILTIN_COLORS: ThemeColors = {
  siteBg: "#faf6ef",
  sand: "#faf6ef",
  headerFg: "#faf6ef",
  parchment: "#f4efe4",
  palm: "#1b4332",
  palmMid: "#2d6a4f",
  lagoon: "#2a9d8f",
  lagoonDark: "#1d7a6e",
  coral: "#e76f51",
  mango: "#f4a261",
  ink: "#2c2416",
  surf: "#cfe8e4",
  btnMainFg: "#faf6ef",
  btnMainBg: "#1b4332",
  btnSecondaryFg: "#1b4332",
  btnSecondaryBg: "#ffffff",
  btnImportantFg: "#000000",
  btnImportantBg: "#e76f51",
  galleryPinBadgeBg: "#1b4332",
  galleryPinBadgeFg: "#faf6ef",
};

export const BUILTIN_TEXT: ThemeText = {
  baseFontSizePx: 16,
  bodyFont: "geist",
  headingFont: "geist",
};

export const BUILTIN_PANE_DEFAULTS: ThemePaneDefaults = {
  paneColorHex: "#faf6ef",
  paneBorderColorHex: "#2d6a4f",
  backgroundOpacity: 92,
  paneBorderWidthPx: 4,
};

export const BUILTIN_LAYOUT: ThemeLayout = {
  mainColumnSideGapPx: 0,
  mainColumnBorderColorHex: "#2d6a4f",
  mainColumnBorderWidthPx: 4,
};

export const BUILTIN_PRODUCT_CARD: ThemeProductCard = {
  background: "#ffffff",
  border: "#2d6a4f",
  title: "#1b4332",
  description: "#2c2416",
  price: "#2c2416",
  saleTag: "#e76f51",
  imageArea: "#cfe8e4",
  hoverGlow: "#2a9d8f",
};

export const BUILTIN_PRODUCT_FOOTER: ThemeProductFooter = {
  background: "#ffffff",
  backgroundOpacityPercent: 70,
  borderColor: "#1b4332",
  borderWidthPx: 2,
  titleColor: "#1b4332",
  titleFontSizePx: 18,
  bodyColor: "#2c2416",
  bodyFontSizePx: 16,
  linkColor: "#1d7a6e",
  sectionBorderColor: "#1b4332",
  sectionBorderWidthPx: 4,
};

export const BUILTIN_CHROME: ThemeChrome = {
  headerBg: "#1b4332",
  headerBrandFg: "#faf6ef",
  headerNavFg: "#faf6ef",
  headerBorderColorHex: "#2d6a4f",
  headerBorderWidthPx: 4,
  footerBg: "#f4efe4",
  footerBrandFg: "#1b4332",
  footerFg: "#2c2416",
  footerLinkFg: "#1d7a6e",
  footerBorderColorHex: "#1b4332",
  footerBorderWidthPx: 4,
};

export type ResolvedPublicTheme = {
  colors: ThemeColors;
  text: ThemeText;
  layout: ThemeLayout;
  chrome: ThemeChrome;
  productCard: ThemeProductCard;
  productFooter: ThemeProductFooter;
  paneDefaults: ThemePaneDefaults;
  decorImageUrls: string[];
  /** Normalized from entries or from legacy `decorImageUrls` (equal weight). */
  decorImageEntries: ThemeDecorImageEntry[];
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function parseThemeConfigBlob(raw: unknown): SiteThemeConfigBlob {
  if (!raw || typeof raw !== "object") return {};
  return raw as SiteThemeConfigBlob;
}

function normalizeHex(input: string | undefined, fallback: string): string {
  if (!input || typeof input !== "string") return fallback;
  return normalizePaneColorHex(input) ?? fallback;
}

export function mergeThemeBlob(raw: unknown): ResolvedPublicTheme {
  const o = parseThemeConfigBlob(raw);
  const c = o.colors ?? {};
  const legacySand = normalizeHex(c.sand, BUILTIN_COLORS.sand);
  const colors: ThemeColors = {
    siteBg: normalizeHex(c.siteBg, legacySand),
    sand: legacySand,
    headerFg: normalizeHex(c.headerFg, BUILTIN_COLORS.headerFg),
    parchment: normalizeHex(c.parchment, BUILTIN_COLORS.parchment),
    palm: normalizeHex(c.palm, BUILTIN_COLORS.palm),
    palmMid: normalizeHex(c.palmMid, BUILTIN_COLORS.palmMid),
    lagoon: normalizeHex(c.lagoon, BUILTIN_COLORS.lagoon),
    lagoonDark: normalizeHex(c.lagoonDark, BUILTIN_COLORS.lagoonDark),
    coral: normalizeHex(c.coral, BUILTIN_COLORS.coral),
    mango: normalizeHex(c.mango, BUILTIN_COLORS.mango),
    ink: normalizeHex(c.ink, BUILTIN_COLORS.ink),
    surf: normalizeHex(c.surf, BUILTIN_COLORS.surf),
    btnMainFg: normalizeHex(c.btnMainFg, BUILTIN_COLORS.btnMainFg),
    btnMainBg: normalizeHex(c.btnMainBg, BUILTIN_COLORS.btnMainBg),
    btnSecondaryFg: normalizeHex(c.btnSecondaryFg, BUILTIN_COLORS.btnSecondaryFg),
    btnSecondaryBg: normalizeHex(c.btnSecondaryBg, BUILTIN_COLORS.btnSecondaryBg),
    btnImportantFg: normalizeHex(c.btnImportantFg, BUILTIN_COLORS.btnImportantFg),
    btnImportantBg: normalizeHex(c.btnImportantBg, BUILTIN_COLORS.btnImportantBg),
    galleryPinBadgeBg: normalizeHex(
      c.galleryPinBadgeBg,
      normalizeHex(c.palm, BUILTIN_COLORS.galleryPinBadgeBg),
    ),
    galleryPinBadgeFg: normalizeHex(
      c.galleryPinBadgeFg,
      normalizeHex(c.btnMainFg, BUILTIN_COLORS.galleryPinBadgeFg),
    ),
  };
  const t = o.text ?? {};
  const baseFontSizePx =
    typeof t.baseFontSizePx === "number" && !Number.isNaN(t.baseFontSizePx)
      ? clamp(Math.round(t.baseFontSizePx), 14, 22)
      : BUILTIN_TEXT.baseFontSizePx;
  const bodyFont = t.bodyFont === "system" ? "system" : "geist";
  const headingFont = t.headingFont === "system" ? "system" : "geist";
  const ly = o.layout ?? {};
  const legacyPaneGap =
    typeof (o.paneDefaults as { panePaddingX?: number } | undefined)?.panePaddingX === "number"
      ? (o.paneDefaults as { panePaddingX: number }).panePaddingX
      : undefined;
  const layout: ThemeLayout = {
    mainColumnSideGapPx:
      typeof ly.mainColumnSideGapPx === "number" && !Number.isNaN(ly.mainColumnSideGapPx)
        ? clamp(Math.round(ly.mainColumnSideGapPx), 0, 320)
        : typeof legacyPaneGap === "number" && !Number.isNaN(legacyPaneGap)
          ? clamp(Math.round(legacyPaneGap), 0, 320)
          : BUILTIN_LAYOUT.mainColumnSideGapPx,
    mainColumnBorderColorHex: normalizeHex(
      ly.mainColumnBorderColorHex,
      BUILTIN_LAYOUT.mainColumnBorderColorHex,
    ),
    mainColumnBorderWidthPx:
      typeof ly.mainColumnBorderWidthPx === "number" && !Number.isNaN(ly.mainColumnBorderWidthPx)
        ? clamp(Math.round(ly.mainColumnBorderWidthPx), 0, 24)
        : BUILTIN_LAYOUT.mainColumnBorderWidthPx,
  };
  const ch = o.chrome ?? {};
  const chrome: ThemeChrome = {
    headerBg: normalizeHex(ch.headerBg, colors.palm),
    headerBrandFg: normalizeHex(ch.headerBrandFg, colors.headerFg),
    headerNavFg: normalizeHex(ch.headerNavFg, colors.headerFg),
    headerBorderColorHex: normalizeHex(ch.headerBorderColorHex, colors.palmMid),
    headerBorderWidthPx:
      typeof ch.headerBorderWidthPx === "number" && !Number.isNaN(ch.headerBorderWidthPx)
        ? clamp(Math.round(ch.headerBorderWidthPx), 0, 24)
        : BUILTIN_CHROME.headerBorderWidthPx,
    footerBg: normalizeHex(ch.footerBg, colors.parchment),
    footerBrandFg: normalizeHex(ch.footerBrandFg, colors.palm),
    footerFg: normalizeHex(ch.footerFg, colors.ink),
    footerLinkFg: normalizeHex(ch.footerLinkFg, colors.lagoonDark),
    footerBorderColorHex: normalizeHex(ch.footerBorderColorHex, colors.palm),
    footerBorderWidthPx:
      typeof ch.footerBorderWidthPx === "number" && !Number.isNaN(ch.footerBorderWidthPx)
        ? clamp(Math.round(ch.footerBorderWidthPx), 0, 24)
        : BUILTIN_CHROME.footerBorderWidthPx,
  };
  const pc = o.storefront?.productCard ?? {};
  const productCard: ThemeProductCard = {
    background: normalizeHex(pc.background, BUILTIN_PRODUCT_CARD.background),
    border: normalizeHex(pc.border, colors.palmMid),
    title: normalizeHex(pc.title, colors.palm),
    description: normalizeHex(pc.description, colors.ink),
    price: normalizeHex(pc.price, colors.ink),
    saleTag: normalizeHex(pc.saleTag, colors.coral),
    imageArea: normalizeHex(pc.imageArea, colors.surf),
    hoverGlow: normalizeHex(pc.hoverGlow, colors.lagoon),
  };
  const pf = o.storefront?.productFooter ?? {};
  const productFooter: ThemeProductFooter = {
    background: normalizeHex(pf.background, BUILTIN_PRODUCT_FOOTER.background),
    backgroundOpacityPercent:
      typeof pf.backgroundOpacityPercent === "number" && !Number.isNaN(pf.backgroundOpacityPercent)
        ? clamp(Math.round(pf.backgroundOpacityPercent), 0, 100)
        : BUILTIN_PRODUCT_FOOTER.backgroundOpacityPercent,
    borderColor: normalizeHex(pf.borderColor, colors.palm),
    borderWidthPx:
      typeof pf.borderWidthPx === "number" && !Number.isNaN(pf.borderWidthPx)
        ? clamp(Math.round(pf.borderWidthPx), 0, 24)
        : BUILTIN_PRODUCT_FOOTER.borderWidthPx,
    titleColor: normalizeHex(pf.titleColor, colors.palm),
    titleFontSizePx:
      typeof pf.titleFontSizePx === "number" && !Number.isNaN(pf.titleFontSizePx)
        ? clamp(Math.round(pf.titleFontSizePx), 12, 32)
        : BUILTIN_PRODUCT_FOOTER.titleFontSizePx,
    bodyColor: normalizeHex(pf.bodyColor, colors.ink),
    bodyFontSizePx:
      typeof pf.bodyFontSizePx === "number" && !Number.isNaN(pf.bodyFontSizePx)
        ? clamp(Math.round(pf.bodyFontSizePx), 12, 24)
        : BUILTIN_PRODUCT_FOOTER.bodyFontSizePx,
    linkColor: normalizeHex(pf.linkColor, colors.lagoonDark),
    sectionBorderColor: normalizeHex(pf.sectionBorderColor, colors.palm),
    sectionBorderWidthPx:
      typeof pf.sectionBorderWidthPx === "number" && !Number.isNaN(pf.sectionBorderWidthPx)
        ? clamp(Math.round(pf.sectionBorderWidthPx), 0, 24)
        : BUILTIN_PRODUCT_FOOTER.sectionBorderWidthPx,
  };
  const pd = o.paneDefaults ?? {};
  const paneDefaults: ThemePaneDefaults = {
    paneColorHex: normalizeHex(pd.paneColorHex, BUILTIN_PANE_DEFAULTS.paneColorHex),
    paneBorderColorHex: normalizeHex(pd.paneBorderColorHex, BUILTIN_PANE_DEFAULTS.paneBorderColorHex),
    backgroundOpacity:
      typeof pd.backgroundOpacity === "number" && !Number.isNaN(pd.backgroundOpacity)
        ? clamp(Math.round(pd.backgroundOpacity), 0, 100)
        : BUILTIN_PANE_DEFAULTS.backgroundOpacity,
    paneBorderWidthPx:
      typeof pd.paneBorderWidthPx === "number" && !Number.isNaN(pd.paneBorderWidthPx)
        ? clamp(Math.round(pd.paneBorderWidthPx), 0, 24)
        : BUILTIN_PANE_DEFAULTS.paneBorderWidthPx,
  };
  const decorRaw = o.background?.decorImageUrls;
  const decorImageUrls = Array.isArray(decorRaw)
    ? decorRaw.filter(
        (u): u is string => typeof u === "string" && (u.startsWith("/") || u.startsWith("https://")),
      )
    : [];
  const entriesRaw = o.background?.decorImageEntries;
  const decorImageEntries: ThemeDecorImageEntry[] = Array.isArray(entriesRaw)
    ? entriesRaw
        .filter(
          (e): e is { url: string; weight: number; alwaysOnTop: boolean } =>
            e != null && typeof e === "object" && "url" in (e as object) && typeof (e as { url: unknown }).url === "string",
        )
        .map((e) => {
          const url = (e as { url: string }).url;
          if (!url || (!url.startsWith("/") && !url.startsWith("https://"))) {
            return null;
          }
          const w = (e as { weight?: unknown }).weight;
          const weight =
            typeof w === "number" && !Number.isNaN(w) ? clamp(Math.round(w), 1, 100) : 50;
          return {
            url,
            weight,
            alwaysOnTop: Boolean((e as { alwaysOnTop?: unknown }).alwaysOnTop),
          };
        })
        .filter((x): x is ThemeDecorImageEntry => x != null)
    : decorImageUrls.map((u) => ({ url: u, weight: 50, alwaysOnTop: false }));
  return {
    colors: { ...colors, headerFg: chrome.headerBrandFg },
    text: { baseFontSizePx, bodyFont, headingFont },
    layout,
    chrome,
    productCard,
    productFooter,
    paneDefaults,
    decorImageUrls,
    decorImageEntries: decorImageEntries.length > 0 ? decorImageEntries : decorImageUrls.map((u) => ({ url: u, weight: 50, alwaysOnTop: false })),
  };
}

/** CSS custom properties for product-page footer blocks (inherits to descendants). */
export function productFooterCssVariables(
  footer: ThemeProductFooter,
): Record<string, string> {
  return {
    "--product-footer-bg": footer.background,
    "--product-footer-bg-opacity": String(footer.backgroundOpacityPercent / 100),
    "--product-footer-bg-opacity-pct": `${footer.backgroundOpacityPercent}%`,
    "--product-footer-border": footer.borderColor,
    "--product-footer-border-width": `${footer.borderWidthPx}px`,
    "--product-footer-title": footer.titleColor,
    "--product-footer-title-size": `${footer.titleFontSizePx}px`,
    "--product-footer-body": footer.bodyColor,
    "--product-footer-body-size": `${footer.bodyFontSizePx}px`,
    "--product-footer-link": footer.linkColor,
    "--product-footer-section-border": footer.sectionBorderColor,
    "--product-footer-section-border-width": `${footer.sectionBorderWidthPx}px`,
  };
}

export function themePaneDefaultsForNewPane(merged: ResolvedPublicTheme): Partial<HomePaneConfig> {
  return {
    paneColorHex: merged.paneDefaults.paneColorHex,
    paneBorderColorHex: merged.paneDefaults.paneBorderColorHex,
    backgroundOpacity: merged.paneDefaults.backgroundOpacity,
    paneBorderWidthPx: merged.paneDefaults.paneBorderWidthPx,
  };
}

function fontStack(kind: "geist" | "system"): string {
  if (kind === "system") {
    return 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
  return "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif";
}

/** Inline CSS for :root variables + base typography (storefront + settings chrome that doesn’t opt out). */
export function buildThemeCss(theme: ResolvedPublicTheme): string {
  const { colors, text, layout, chrome, productCard, productFooter } = theme;
  const bodyFf = fontStack(text.bodyFont);
  const headFf = fontStack(text.headingFont);
  return `
:root {
  --site-bg: ${colors.siteBg};
  --sand: ${colors.sand};
  --header-fg: ${chrome.headerBrandFg};
  --header-bg: ${chrome.headerBg};
  --header-brand-fg: ${chrome.headerBrandFg};
  --header-nav-fg: ${chrome.headerNavFg};
  --header-border-color: ${chrome.headerBorderColorHex};
  --header-border-width: ${chrome.headerBorderWidthPx}px;
  --footer-bg: ${chrome.footerBg};
  --footer-brand-fg: ${chrome.footerBrandFg};
  --footer-fg: ${chrome.footerFg};
  --footer-link-fg: ${chrome.footerLinkFg};
  --footer-border-color: ${chrome.footerBorderColorHex};
  --footer-border-width: ${chrome.footerBorderWidthPx}px;
  --main-column-side-gap: ${layout.mainColumnSideGapPx}px;
  --main-column-border-color: ${layout.mainColumnBorderColorHex};
  --main-column-border-width: ${layout.mainColumnBorderWidthPx}px;
  --parchment: ${colors.parchment};
  --palm: ${colors.palm};
  --palm-mid: ${colors.palmMid};
  --lagoon: ${colors.lagoon};
  --lagoon-dark: ${colors.lagoonDark};
  --coral: ${colors.coral};
  --mango: ${colors.mango};
  --ink: ${colors.ink};
  --surf: ${colors.surf};
  --btn-main-fg: ${colors.btnMainFg};
  --btn-main-bg: ${colors.btnMainBg};
  --btn-secondary-fg: ${colors.btnSecondaryFg};
  --btn-secondary-bg: ${colors.btnSecondaryBg};
  --btn-important-fg: ${colors.btnImportantFg};
  --btn-important-bg: ${colors.btnImportantBg};
  --product-card-bg: ${productCard.background};
  --product-card-border: ${productCard.border};
  --product-card-title: ${productCard.title};
  --product-card-description: ${productCard.description};
  --product-card-price: ${productCard.price};
  --product-card-sale: ${productCard.saleTag};
  --product-card-image-bg: ${productCard.imageArea};
  --product-card-hover-glow: ${productCard.hoverGlow};
  --product-footer-bg: ${productFooter.background};
  --product-footer-bg-opacity: ${productFooter.backgroundOpacityPercent / 100};
  --product-footer-bg-opacity-pct: ${productFooter.backgroundOpacityPercent}%;
  --product-footer-border: ${productFooter.borderColor};
  --product-footer-border-width: ${productFooter.borderWidthPx}px;
  --product-footer-title: ${productFooter.titleColor};
  --product-footer-title-size: ${productFooter.titleFontSizePx}px;
  --product-footer-body: ${productFooter.bodyColor};
  --product-footer-body-size: ${productFooter.bodyFontSizePx}px;
  --product-footer-link: ${productFooter.linkColor};
  --product-footer-section-border: ${productFooter.sectionBorderColor};
  --product-footer-section-border-width: ${productFooter.sectionBorderWidthPx}px;
  --gallery-image-bg: ${productCard.imageArea};
  --gallery-card-bg: ${productCard.background};
  --gallery-panel-bg: ${colors.parchment};
  --gallery-heading: ${colors.palm};
  --gallery-body: ${colors.ink};
  --gallery-link: ${colors.lagoonDark};
  --gallery-row-fill: ${colors.surf};
  --gallery-price: ${productCard.price};
  --gallery-border: ${colors.palmMid};
  --gallery-scrim: ${colors.ink};
  --gallery-pin-badge-bg: ${colors.galleryPinBadgeBg};
  --gallery-pin-badge-fg: ${colors.galleryPinBadgeFg};
  --color-background: var(--sand);
  --color-foreground: var(--ink);
}
html { font-size: ${text.baseFontSizePx}px; }
body {
  font-family: ${bodyFf};
  background: var(--site-bg);
  color: var(--ink);
}
h1, h2, h3, h4, .font-black { font-family: ${headFf}; }
`;
}

export type BgSandOverlayMode = "solid" | "diagonal" | "store_name" | "store_name_continuous";

export function parseBgSandOverlayMode(raw: unknown): BgSandOverlayMode {
  if (raw === "solid") return "solid";
  if (raw === "store_name") return "store_name";
  if (raw === "store_name_continuous") return "store_name_continuous";
  return "diagonal";
}

export function parseBgProductIdsJson(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const ids = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  return ids.length > 0 ? ids : null;
}

export type DecorTileForClient = {
  url: string;
  weight: number;
  alwaysOnTop: boolean;
};

export type RootLayoutThemePayload = {
  themeCss: string;
  bgEnabled: boolean;
  bgMaxImages: number;
  bgSpawnIntervalMs: number;
  /** 0–100: anti-theft overlay opacity — full-screen layer drawn on top of floating stickers. */
  bgOpacityPercent: number;
  /** `solid` = flat sand; `diagonal` = line texture; `store_name*` = company name (Global) as SVG text — sparse vs continuous band. */
  bgSandOverlayMode: BgSandOverlayMode;
  /** Trimmed name for the store-name overlay; from `site_config.companyName`. */
  storeWatermarkName: string;
  /** Store-name font size (px); from `site_config` (one value for both scattered + continuous). */
  storeWatermarkFontPx: number;
  /** Extra spacing: between scattered name instances, between repeated names, and between continuous diagonal lines. */
  storeWatermarkNameGapPx: number;
  /** 0–100: sticker image opacity — only the floating decor art (layer below the anti-theft overlay). */
  bgImageOpacityPercent: number;
  /** Percent of 4rem base; random per tile in [min, max] */
  bgTileScaleMin: number;
  bgTileScaleMax: number;
  /** Inclusive min/max degrees for random sticker rotation (from Theme → Background). */
  bgStickerRotMinDeg: number;
  bgStickerRotMaxDeg: number;
  /** @deprecated use decorTileEntries; kept for older callers */
  decorTileUrls: string[];
  decorTileEntries: DecorTileForClient[];
};
