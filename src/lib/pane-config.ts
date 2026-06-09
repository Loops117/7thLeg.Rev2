import type { CSSProperties } from "react";
import type { PaneType } from "@/generated/prisma/enums";
import {
  defaultTheatricalElements,
  parseTheatricalElements,
  parseTheatricalStageAspect,
  parseTheatricalStageBgHex,
  parseTheatricalStageMaxHeightPx,
  type TheatricalPaneElement,
  type TheatricalStageAspect,
} from "@/lib/theatrical-pane";

/** Default pane fill; pairs with `backgroundOpacity` */
export const DEFAULT_PANE_COLOR_HEX = "#faf6ef";
/** Matches prior `border-palm-mid` storefront look */
export const DEFAULT_PANE_BORDER_HEX = "#2d6a4f";

/** Social pane row: `platform` selects the icon preset; `url` must be http(s). */
export type SocialPaneLink = {
  platform: string;
  url: string;
  label?: string;
};

/** Stored in Pane.config JSON for home (and later featured/about) panes */
export type HomePaneConfig = {
  /** 0 = fully transparent panel background; 100 = opaque */
  backgroundOpacity: number;
  /** Panel tint color (#rrggbb); combined with opacity for storefront background */
  paneColorHex: string;
  /** Outer border width in px (0 = none) */
  paneBorderWidthPx: number;
  /** Border color (#rrggbb) */
  paneBorderColorHex: string;
  /** Optional heading shown above the pane on the storefront */
  title?: string;

  // PRODUCT_CAROUSEL
  bannerTitle?: string;
  maxItems?: number;
  autoScroll?: boolean;
  /** Which way the strip moves when auto-scroll runs (left = content slides left). */
  carouselScrollDirection?: "left" | "right";
  /** 1 = slowest, 10 = fastest; maps to interval between advances when the real carousel ships. */
  carouselScrollSpeed?: number;
  /** Limit carousel to these product type ids; empty = all types. */
  carouselTypeIds?: string[];

  // CONTENT_DUAL
  leftEnabled?: boolean;
  rightEnabled?: boolean;
  /** When true, `leftHtml` is edited and rendered as raw HTML (tables, embeds, etc.). */
  leftRawHtml?: boolean;
  rightRawHtml?: boolean;
  leftHtml?: string;
  rightHtml?: string;

  // GIVEAWAY / Event block (pane type still GIVEAWAY in DB)
  /** When set, storefront loads this event and shows its catalog scope. */
  eventId?: string;
  giveawayBanner?: string;
  giveawayEndIso?: string;
  giveawayLinkLabel?: string;
  /** CTA href; empty = `/event/{eventId}` when eventId set, else `/featured`. */
  giveawayLinkHref?: string;

  // STORE_BANNER
  /** If true, use the site’s Global → company logo. If false, use `storeBannerLogoUrl` only. */
  storeBannerUseSiteLogo?: boolean;
  /** Replaces the site logo when set (upload or URL). */
  storeBannerLogoUrl?: string;
  /** Max width of the logo (percent of the pane’s inner width, e.g. 40–100). */
  storeBannerLogoMaxWidthPct?: number;
  /** Optional line under the logo (plain text; keep short for layout). */
  storeBannerSubheading?: string;
  /** Up to 6 CTAs. `href` should be a path (e.g. /store) or full URL. */
  storeBannerButtons?: { href: string; label: string; imageUrl?: string }[];
  /** Entrance / idle motion. */
  storeBannerAnimation?: "none" | "float" | "subtle";

  // SOCIAL_LINKS
  /** External profile links (Facebook, Instagram, etc.). */
  socialLinks?: SocialPaneLink[];

  // ART_SUB
  /** Line under the pane title on the storefront. */
  artSubHeading?: string;
  /** Primary button before a file is chosen. */
  artSubChooseButtonLabel?: string;
  /** Submit button after a file is selected. */
  artSubSubmitButtonLabel?: string;
  /** Label while upload is in progress. */
  artSubSubmitPendingLabel?: string;
  /** Clears the selected file. */
  artSubCancelButtonLabel?: string;
  /** Submissions are tagged with this group (shown in admin Customer Art). */
  artGroup?: string;
  /** Show scrolling banner of approved artwork above the upload form. */
  artGalleryEnabled?: boolean;
  /** Which approved submissions appear in the banner. */
  artGalleryScope?: "same_group" | "all_approved" | "selected_groups";
  /** When scope is `selected_groups`, only these art groups (from known groups in admin). */
  artGalleryGroupKeys?: string[];
  artGalleryAutoScroll?: boolean;
  artGalleryScrollDirection?: "left" | "right";
  /** 1 = slowest, 10 = fastest (same scale as product carousel). */
  artGalleryScrollSpeed?: number;
  /** Show artist name under each gallery image on the storefront. */
  artGalleryShowArtistName?: boolean;
  /** Show art group name under each gallery image on the storefront. */
  artGalleryShowArtGroup?: boolean;

  // SUGGESTION_BOX
  /** Line under the pane title on the storefront. */
  suggestionBoxHeading?: string;
  /** How many recently approved suggestions to list in the pane. */
  approvedSuggestionsLimit?: number;

  // THEATRICAL
  theatricalStageAspect?: TheatricalStageAspect;
  /** Stage canvas background (#rrggbb). */
  theatricalStageBgHex?: string;
  /** Cap stage height (px); 0 = scale with pane width only. */
  theatricalStageMaxHeightPx?: number;
  theatricalElements?: TheatricalPaneElement[];
};

const DEFAULT_BG = 92;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Accepts #rgb or #rrggbb (case-insensitive). Returns normalized #rrggbb or null. */
export function normalizePaneColorHex(input: string): string | null {
  let h = input.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const [, r, g, b] = h;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizePaneColorHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

/** Merge theme defaults when creating a new pane (from SiteConfig.themeConfig). */
export function defaultPaneConfigWithTheme(type: PaneType, themePartial?: Partial<HomePaneConfig>): HomePaneConfig {
  const base = defaultPaneConfig(type);
  if (!themePartial) return base;
  return {
    ...base,
    ...themePartial,
    paneColorHex: normalizePaneColorHex(themePartial.paneColorHex ?? "") ?? base.paneColorHex,
    paneBorderColorHex: normalizePaneColorHex(themePartial.paneBorderColorHex ?? "") ?? base.paneBorderColorHex,
    backgroundOpacity:
      typeof themePartial.backgroundOpacity === "number"
        ? clamp(themePartial.backgroundOpacity, 0, 100)
        : base.backgroundOpacity,
    paneBorderWidthPx:
      typeof themePartial.paneBorderWidthPx === "number"
        ? clamp(Math.round(themePartial.paneBorderWidthPx), 0, 24)
        : base.paneBorderWidthPx,
  };
}

export function defaultPaneConfig(type: PaneType): HomePaneConfig {
  const base: HomePaneConfig = {
    backgroundOpacity: DEFAULT_BG,
    paneColorHex: DEFAULT_PANE_COLOR_HEX,
    paneBorderWidthPx: 4,
    paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
    title: "",
    carouselTypeIds: [],
    leftEnabled: true,
    rightEnabled: true,
    leftHtml: "<p>Left column</p>",
    rightHtml: "<p>Right column</p>",
    bannerTitle: "Featured",
    maxItems: 12,
    autoScroll: false,
    giveawayBanner: "Giveaway",
    giveawayEndIso: "",
    giveawayLinkLabel: "See featured",
  };
  if (type === "PRODUCT_CAROUSEL") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "",
      bannerTitle: "Products",
      maxItems: 12,
      autoScroll: false,
      carouselScrollDirection: "left",
      carouselScrollSpeed: 5,
      carouselTypeIds: [],
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "CONTENT_DUAL") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "",
      carouselTypeIds: [],
      leftEnabled: true,
      rightEnabled: true,
      leftRawHtml: false,
      rightRawHtml: false,
      leftHtml: "<p>Left column content (HTML)</p>",
      rightHtml: "<p>Right column content (HTML)</p>",
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "STORE_BANNER") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "",
      carouselTypeIds: [],
      storeBannerUseSiteLogo: true,
      storeBannerLogoUrl: "",
      storeBannerLogoMaxWidthPct: 72,
      storeBannerSubheading: "",
      storeBannerButtons: [
        { href: "/store", label: "Shop", imageUrl: "" },
        { href: "/about", label: "About", imageUrl: "" },
      ],
      storeBannerAnimation: "subtle",
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "SOCIAL_LINKS") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "Follow us",
      carouselTypeIds: [],
      socialLinks: [
        { platform: "FACEBOOK", url: "", label: "Facebook" },
        { platform: "INSTAGRAM", url: "", label: "Instagram" },
      ],
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "ORDER_SHIPPING_MAP") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "Where we've shipped",
      carouselTypeIds: [],
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "ART_SUB") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "Share your art",
      carouselTypeIds: [],
      artSubHeading: "Upload your finished coloring page as an image.",
      artSubChooseButtonLabel: "Choose artwork",
      artSubSubmitButtonLabel: "Submit artwork",
      artSubSubmitPendingLabel: "Uploading…",
      artSubCancelButtonLabel: "Cancel",
      artGroup: "Coloring",
      artGalleryEnabled: true,
      artGalleryScope: "same_group",
      artGalleryGroupKeys: [],
      artGalleryAutoScroll: true,
      artGalleryScrollDirection: "left",
      artGalleryScrollSpeed: 5,
      artGalleryShowArtistName: true,
      artGalleryShowArtGroup: true,
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "SUGGESTION_BOX") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "Suggest a species",
      carouselTypeIds: [],
      suggestionBoxHeading: "Tell us which species or design you would like to see next.",
      approvedSuggestionsLimit: 8,
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  if (type === "THEATRICAL") {
    return {
      backgroundOpacity: DEFAULT_BG,
      paneColorHex: DEFAULT_PANE_COLOR_HEX,
      paneBorderWidthPx: 4,
      paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
      title: "",
      carouselTypeIds: [],
      theatricalStageAspect: "16:9",
      theatricalStageBgHex: parseTheatricalStageBgHex(undefined),
      theatricalStageMaxHeightPx: parseTheatricalStageMaxHeightPx(undefined),
      theatricalElements: defaultTheatricalElements(),
      eventId: "",
      giveawayLinkHref: "",
    };
  }
  return {
    backgroundOpacity: DEFAULT_BG,
    paneColorHex: DEFAULT_PANE_COLOR_HEX,
    paneBorderWidthPx: 4,
    paneBorderColorHex: DEFAULT_PANE_BORDER_HEX,
    title: "",
    carouselTypeIds: [],
    giveawayBanner: "Giveaway",
    giveawayEndIso: "",
    giveawayLinkLabel: "Shop featured",
    eventId: "",
    giveawayLinkHref: "",
  };
}

export function parseHomePaneConfig(raw: unknown, type: PaneType): HomePaneConfig {
  const defaults = defaultPaneConfig(type);
  if (!raw || typeof raw !== "object") return defaults;
  const o = raw as Record<string, unknown>;

  const bgRaw = o.backgroundOpacity;
  const backgroundOpacity =
    typeof bgRaw === "number" && !Number.isNaN(bgRaw) ? clamp(bgRaw, 0, 100) : defaults.backgroundOpacity;

  const colorRaw = o.paneColorHex;
  let paneColorHex = defaults.paneColorHex;
  if (typeof colorRaw === "string") {
    const n = normalizePaneColorHex(colorRaw);
    if (n) paneColorHex = n;
  }

  const bwRaw = o.paneBorderWidthPx;
  const paneBorderWidthPx =
    typeof bwRaw === "number" && !Number.isNaN(bwRaw)
      ? clamp(Math.round(bwRaw), 0, 24)
      : defaults.paneBorderWidthPx;

  const borderColorRaw = o.paneBorderColorHex;
  let paneBorderColorHex = defaults.paneBorderColorHex;
  if (typeof borderColorRaw === "string") {
    const n = normalizePaneColorHex(borderColorRaw);
    if (n) paneBorderColorHex = n;
  }

  return {
    ...defaults,
    backgroundOpacity,
    paneColorHex,
    paneBorderWidthPx,
    paneBorderColorHex,
    title: typeof o.title === "string" ? o.title : defaults.title,
    bannerTitle: typeof o.bannerTitle === "string" ? o.bannerTitle : defaults.bannerTitle,
    maxItems: typeof o.maxItems === "number" ? clamp(Math.floor(o.maxItems), 1, 100) : defaults.maxItems,
    autoScroll: typeof o.autoScroll === "boolean" ? o.autoScroll : defaults.autoScroll,
    carouselScrollDirection:
      o.carouselScrollDirection === "right" ? "right" : o.carouselScrollDirection === "left" ? "left" : defaults.carouselScrollDirection,
    carouselScrollSpeed:
      typeof o.carouselScrollSpeed === "number" && !Number.isNaN(o.carouselScrollSpeed)
        ? clamp(Math.round(o.carouselScrollSpeed), 1, 10)
        : defaults.carouselScrollSpeed,
    carouselTypeIds: Array.isArray(o.carouselTypeIds)
      ? o.carouselTypeIds.filter((x): x is string => typeof x === "string" && x.length > 0)
      : defaults.carouselTypeIds ?? [],
    leftEnabled: typeof o.leftEnabled === "boolean" ? o.leftEnabled : defaults.leftEnabled,
    rightEnabled: typeof o.rightEnabled === "boolean" ? o.rightEnabled : defaults.rightEnabled,
    leftRawHtml: typeof o.leftRawHtml === "boolean" ? o.leftRawHtml : defaults.leftRawHtml,
    rightRawHtml: typeof o.rightRawHtml === "boolean" ? o.rightRawHtml : defaults.rightRawHtml,
    leftHtml: typeof o.leftHtml === "string" ? o.leftHtml : defaults.leftHtml,
    rightHtml: typeof o.rightHtml === "string" ? o.rightHtml : defaults.rightHtml,
    eventId: typeof o.eventId === "string" ? o.eventId : (defaults.eventId ?? ""),
    giveawayBanner: typeof o.giveawayBanner === "string" ? o.giveawayBanner : defaults.giveawayBanner,
    giveawayEndIso: typeof o.giveawayEndIso === "string" ? o.giveawayEndIso : defaults.giveawayEndIso,
    giveawayLinkLabel: typeof o.giveawayLinkLabel === "string" ? o.giveawayLinkLabel : defaults.giveawayLinkLabel,
    giveawayLinkHref:
      typeof o.giveawayLinkHref === "string" ? o.giveawayLinkHref : (defaults.giveawayLinkHref ?? ""),

    storeBannerUseSiteLogo:
      typeof o.storeBannerUseSiteLogo === "boolean" ? o.storeBannerUseSiteLogo : defaults.storeBannerUseSiteLogo,
    storeBannerLogoUrl: typeof o.storeBannerLogoUrl === "string" ? o.storeBannerLogoUrl : (defaults.storeBannerLogoUrl ?? ""),
    storeBannerLogoMaxWidthPct:
      typeof o.storeBannerLogoMaxWidthPct === "number" && !Number.isNaN(o.storeBannerLogoMaxWidthPct)
        ? clamp(Math.round(o.storeBannerLogoMaxWidthPct), 15, 100)
        : (defaults.storeBannerLogoMaxWidthPct ?? 72),
    storeBannerSubheading: typeof o.storeBannerSubheading === "string" ? o.storeBannerSubheading : (defaults.storeBannerSubheading ?? ""),
    storeBannerButtons: Array.isArray(o.storeBannerButtons)
      ? o.storeBannerButtons
          .filter(
            (b): b is { href: string; label: string; imageUrl?: string } =>
              b != null && typeof b === "object" && typeof (b as { href: unknown }).href === "string",
          )
          .map((b) => ({
            href: String(b.href).trim().slice(0, 2000) || "/",
            label: typeof b.label === "string" ? b.label.slice(0, 120) : "Link",
            imageUrl: typeof b.imageUrl === "string" && b.imageUrl.trim() ? b.imageUrl.trim().slice(0, 2000) : undefined,
          }))
          .slice(0, 6)
      : (defaults.storeBannerButtons ?? []),
    storeBannerAnimation:
      o.storeBannerAnimation === "none" || o.storeBannerAnimation === "float" || o.storeBannerAnimation === "subtle"
        ? o.storeBannerAnimation
        : (defaults.storeBannerAnimation ?? "subtle"),

    socialLinks: Array.isArray(o.socialLinks)
      ? o.socialLinks
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((row) => {
            const platform = typeof row.platform === "string" ? row.platform.trim().slice(0, 40) : "WEBSITE";
            const url = typeof row.url === "string" ? row.url.trim().slice(0, 2000) : "";
            const label = typeof row.label === "string" ? row.label.trim().slice(0, 80) : "";
            return { platform: platform || "WEBSITE", url, label: label || undefined };
          })
          .filter((l) => l.url.length > 0)
          .slice(0, 12)
      : (defaults.socialLinks ?? []),

    artSubHeading:
      typeof o.artSubHeading === "string" ? o.artSubHeading.slice(0, 500) : (defaults.artSubHeading ?? ""),
    artSubChooseButtonLabel:
      typeof o.artSubChooseButtonLabel === "string"
        ? o.artSubChooseButtonLabel.trim().slice(0, 80) || (defaults.artSubChooseButtonLabel ?? "Choose artwork")
        : (defaults.artSubChooseButtonLabel ?? "Choose artwork"),
    artSubSubmitButtonLabel:
      typeof o.artSubSubmitButtonLabel === "string"
        ? o.artSubSubmitButtonLabel.trim().slice(0, 80) || (defaults.artSubSubmitButtonLabel ?? "Submit artwork")
        : (defaults.artSubSubmitButtonLabel ?? "Submit artwork"),
    artSubSubmitPendingLabel:
      typeof o.artSubSubmitPendingLabel === "string"
        ? o.artSubSubmitPendingLabel.trim().slice(0, 80) || (defaults.artSubSubmitPendingLabel ?? "Uploading…")
        : (defaults.artSubSubmitPendingLabel ?? "Uploading…"),
    artSubCancelButtonLabel:
      typeof o.artSubCancelButtonLabel === "string"
        ? o.artSubCancelButtonLabel.trim().slice(0, 80) || (defaults.artSubCancelButtonLabel ?? "Cancel")
        : (defaults.artSubCancelButtonLabel ?? "Cancel"),
    artGroup: typeof o.artGroup === "string" ? normalizeArtGroupKey(o.artGroup) ?? "" : (defaults.artGroup ?? ""),
    artGalleryEnabled:
      typeof o.artGalleryEnabled === "boolean" ? o.artGalleryEnabled : (defaults.artGalleryEnabled ?? true),
    artGalleryScope:
      o.artGalleryScope === "all_approved" || o.artGalleryScope === "selected_groups"
        ? o.artGalleryScope
        : o.artGalleryScope === "same_group"
          ? "same_group"
          : (defaults.artGalleryScope ?? "same_group"),
    artGalleryGroupKeys: Array.isArray(o.artGalleryGroupKeys)
      ? o.artGalleryGroupKeys
          .filter((x): x is string => typeof x === "string")
          .map((x) => normalizeArtGroupKey(x))
          .filter((x): x is string => !!x)
          .slice(0, 24)
      : (defaults.artGalleryGroupKeys ?? []),
    artGalleryAutoScroll:
      typeof o.artGalleryAutoScroll === "boolean" ? o.artGalleryAutoScroll : (defaults.artGalleryAutoScroll ?? true),
    artGalleryScrollDirection:
      o.artGalleryScrollDirection === "right" ? "right" : (defaults.artGalleryScrollDirection ?? "left"),
    artGalleryScrollSpeed:
      typeof o.artGalleryScrollSpeed === "number" && !Number.isNaN(o.artGalleryScrollSpeed)
        ? clamp(Math.round(o.artGalleryScrollSpeed), 1, 10)
        : (defaults.artGalleryScrollSpeed ?? 5),
    artGalleryShowArtistName:
      typeof o.artGalleryShowArtistName === "boolean"
        ? o.artGalleryShowArtistName
        : (defaults.artGalleryShowArtistName ?? true),
    artGalleryShowArtGroup:
      typeof o.artGalleryShowArtGroup === "boolean" ? o.artGalleryShowArtGroup : (defaults.artGalleryShowArtGroup ?? true),

    suggestionBoxHeading:
      typeof o.suggestionBoxHeading === "string"
        ? o.suggestionBoxHeading.slice(0, 500)
        : (defaults.suggestionBoxHeading ?? ""),
    approvedSuggestionsLimit:
      typeof o.approvedSuggestionsLimit === "number" && !Number.isNaN(o.approvedSuggestionsLimit)
        ? clamp(Math.round(o.approvedSuggestionsLimit), 0, 50)
        : (defaults.approvedSuggestionsLimit ?? 8),

    theatricalStageAspect: parseTheatricalStageAspect(o.theatricalStageAspect ?? defaults.theatricalStageAspect),
    theatricalStageBgHex: parseTheatricalStageBgHex(o.theatricalStageBgHex ?? defaults.theatricalStageBgHex),
    theatricalStageMaxHeightPx: parseTheatricalStageMaxHeightPx(
      o.theatricalStageMaxHeightPx ?? defaults.theatricalStageMaxHeightPx,
    ),
    theatricalElements: parseTheatricalElements(o.theatricalElements ?? defaults.theatricalElements),
  };
}

/** Trim art group key for pane config and submissions (max 80 chars). */
export function normalizeArtGroupKey(input: string): string | null {
  const t = input.trim().slice(0, 80);
  return t.length > 0 ? t : null;
}

/** Milliseconds between auto-advance ticks; `carouselScrollSpeed` is 1 (slow) … 10 (fast). */
export function carouselAutoScrollIntervalMs(speed1to10: number): number {
  const s = clamp(Math.round(speed1to10), 1, 10);
  return Math.round(1200 + (11 - s) * 860);
}

/** Pane fill: `paneColorHex` at `opacityPercent` (0–100). */
export function paneBackgroundStyle(opacityPercent: number, paneColorHex: string = DEFAULT_PANE_COLOR_HEX): CSSProperties {
  const a = clamp(opacityPercent, 0, 100) / 100;
  const rgb = hexToRgb(paneColorHex) ?? hexToRgb(DEFAULT_PANE_COLOR_HEX)!;
  return { backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})` };
}

/** Storefront pane surface: background + optional solid border. */
export function paneSectionSurfaceStyle(cfg: {
  backgroundOpacity: number;
  paneColorHex: string;
  paneBorderWidthPx: number;
  paneBorderColorHex: string;
}): CSSProperties {
  const bg = paneBackgroundStyle(cfg.backgroundOpacity, cfg.paneColorHex);
  const w = clamp(cfg.paneBorderWidthPx, 0, 24);
  const borderColor = normalizePaneColorHex(cfg.paneBorderColorHex) ?? DEFAULT_PANE_BORDER_HEX;
  return {
    ...bg,
    borderWidth: w,
    borderStyle: w > 0 ? "solid" : "none",
    borderColor: w > 0 ? borderColor : "transparent",
  };
}
