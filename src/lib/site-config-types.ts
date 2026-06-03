import type { SiteBrandingAssets, SiteBrandingSource } from "@/lib/site-branding";

export type { SiteBrandingAssets, SiteBrandingSource };

export const LOGO_PLACEMENTS = ["beside", "above", "center"] as const;
export type CompanyLogoPlacement = (typeof LOGO_PLACEMENTS)[number];
export const WATERMARK_PLACEMENTS = [
  "bottomRight",
  "bottomLeft",
  "topRight",
  "topLeft",
  "center",
  "stretch",
] as const;
export type WatermarkPlacement = (typeof WATERMARK_PLACEMENTS)[number];

export function parseLogoPlacement(s: string | null | undefined): CompanyLogoPlacement {
  if (s === "above" || s === "center" || s === "beside") return s;
  return "beside";
}

export function parseWatermarkPlacement(s: string | null | undefined): WatermarkPlacement {
  if (
    s === "bottomRight" ||
    s === "bottomLeft" ||
    s === "topRight" ||
    s === "topLeft" ||
    s === "center" ||
    s === "stretch"
  ) {
    return s;
  }
  return "bottomRight";
}

export type GlobalSettingsState = {
  companyName: string;
  headerShowCompanyName: boolean;
  headerShowCompanyLogo: boolean;
  productDiagonalBrandOverlay: boolean;
  watermarkPlacement: WatermarkPlacement;
  watermarkOpacityPercent: number;
  productDiagonalNameGapPx: number;
  companyLogoUrl: string;
  companyLogoPlacement: CompanyLogoPlacement;
  uploadImageMaxEdgePx: number;
  uploadImageJpegQuality: number;
  watermarkImageUrl: string;
  /** Merchandise subtotal tax for checkout — display percent (e.g. 8.25 = 8.25%). */
  checkoutSalesTaxPercent: number;
  siteBrandingSource: SiteBrandingSource;
  siteBrandingAssets: SiteBrandingAssets | null;
};

export const globalSettingsDefaults: GlobalSettingsState = {
  companyName: "Inverts Oasis",
  headerShowCompanyName: true,
  headerShowCompanyLogo: true,
  productDiagonalBrandOverlay: false,
  watermarkPlacement: "bottomRight",
  watermarkOpacityPercent: 38,
  productDiagonalNameGapPx: 8,
  companyLogoUrl: "",
  companyLogoPlacement: "beside",
  uploadImageMaxEdgePx: 2400,
  uploadImageJpegQuality: 85,
  watermarkImageUrl: "",
  checkoutSalesTaxPercent: 0,
  siteBrandingSource: "default",
  siteBrandingAssets: null,
};

/** Managed from Settings → Home (not Global). Persists urgent pop-up revision in the database. */
export type HomePageUrgentState = {
  homeUrgentNotificationEnabled: boolean;
  homeUrgentNotificationTitle: string;
  homeUrgentNotificationBody: string;
  homeUrgentNotificationRevision: number;
};

export const homePageUrgentDefaults: HomePageUrgentState = {
  homeUrgentNotificationEnabled: false,
  homeUrgentNotificationTitle: "",
  homeUrgentNotificationBody: "",
  homeUrgentNotificationRevision: 0,
};

export type LoyaltyProgramState = {
  loyaltyEnabled: boolean;
  pointsPerDollar: number;
  /** Whole cents each point is worth when redeemed at checkout (e.g. 10 = $0.10 per point). */
  loyaltyRedemptionCentsPerPoint: number;
};

export const loyaltyProgramDefaults: LoyaltyProgramState = {
  loyaltyEnabled: false,
  pointsPerDollar: 10,
  loyaltyRedemptionCentsPerPoint: 10,
};

export type PaymentGatewaysState = {
  /** Offer Stripe Checkout (requires STRIPE_SECRET_KEY). */
  stripeEnabled: boolean;
  /** Offer Square Web Payments (requires Square env vars). */
  squareEnabled: boolean;
};

export const paymentGatewaysDefaults: PaymentGatewaysState = {
  stripeEnabled: true,
  squareEnabled: false,
};

export type SiteConfigPublic = {
  companyName: string;
  companyLogoUrl: string;
  companyLogoPlacement: CompanyLogoPlacement;
  headerShowCompanyName: boolean;
  headerShowCompanyLogo: boolean;
  productDiagonalBrandOverlay: boolean;
  watermarkOpacityPercent: number;
  productDiagonalNameGapPx: number;
  /** Default center image for QR PNGs (optional). */
  qrDefaultCenterImageUrl: string;
  /** Public `/labels` route (Settings → Labels). */
  labelBuilderEnabled: boolean;
  /** Labels link in main header (only when label builder is enabled). */
  labelBuilderNavEnabled: boolean;
  navShopEnabled: boolean;
  navShopLabel: string;
  navFeaturedEnabled: boolean;
  navFeaturedLabel: string;
  navGalleryEnabled: boolean;
  navGalleryLabel: string;
  navAboutEnabled: boolean;
  navAboutLabel: string;
};

export type LabelBuilderAdminState = {
  labelBuilderEnabled: boolean;
  labelBuilderNavEnabled: boolean;
};

export const labelBuilderAdminDefaults: LabelBuilderAdminState = {
  labelBuilderEnabled: false,
  labelBuilderNavEnabled: true,
};

export type LabelCartAdminState = {
  showSubtotalPreview: boolean;
  mergeWithStoreCart: boolean;
  minQuantity: number;
};

export const labelCartAdminDefaults: LabelCartAdminState = {
  showSubtotalPreview: true,
  mergeWithStoreCart: true,
  minQuantity: 1,
};

export const LABEL_PREVIEW_WATERMARK_KINDS = ["global", "custom", "text", "off"] as const;
export type LabelPreviewWatermarkKind = (typeof LABEL_PREVIEW_WATERMARK_KINDS)[number];

export function parseLabelPreviewWatermarkKind(s: string | null | undefined): LabelPreviewWatermarkKind {
  if (s === "custom" || s === "text" || s === "off") return s;
  return "global";
}

export type LabelPreviewAdminState = {
  /** @deprecated Synced from watermarkKind === "global" for legacy column. */
  matchProductWatermark: boolean;
  watermarkKind: LabelPreviewWatermarkKind;
  watermarkImageUrl: string;
  watermarkPlacement: WatermarkPlacement;
  watermarkOpacityPercent: number;
  watermarkScalePercent: number;
  watermarkText: string;
  matchDiagonalBrand: boolean;
  protectPreviewInteraction: boolean;
  productionUnwatermarked: boolean;
};

export const labelPreviewAdminDefaults: LabelPreviewAdminState = {
  matchProductWatermark: true,
  watermarkKind: "global",
  watermarkImageUrl: "",
  watermarkPlacement: "bottomRight",
  watermarkOpacityPercent: 38,
  watermarkScalePercent: 100,
  watermarkText: "This is a preview",
  matchDiagonalBrand: true,
  protectPreviewInteraction: true,
  productionUnwatermarked: true,
};

/** Global watermark fields used when label previews mirror product anti-theft. */
export type LabelPreviewGlobalSnapshot = {
  companyName: string;
  watermarkImageUrl: string;
  watermarkPlacement: WatermarkPlacement;
  watermarkOpacityPercent: number;
  productDiagonalBrandOverlay: boolean;
  productDiagonalNameGapPx: number;
};

export type LabelPreviewWatermarkAdminPayload = {
  settings: LabelPreviewAdminState;
  global: LabelPreviewGlobalSnapshot;
};

export const LABEL_FULFILLMENT_SHEET_FORMATS = ["letter", "a4"] as const;
export type LabelFulfillmentSheetFormat = (typeof LABEL_FULFILLMENT_SHEET_FORMATS)[number];

export function parseLabelFulfillmentSheetFormat(s: string | null | undefined): LabelFulfillmentSheetFormat {
  return s === "a4" ? "a4" : "letter";
}

export type LabelFulfillmentAdminState = {
  showOnOrders: boolean;
  saveCustomerLayouts: boolean;
  allowReorder: boolean;
  exportPdf: boolean;
  exportRaster: boolean;
  printDpi: number;
  sheetFormat: LabelFulfillmentSheetFormat;
  sheetMarginMm: number;
  labelGapMm: number;
  printTransparentBackground: boolean;
};

export const labelFulfillmentAdminDefaults: LabelFulfillmentAdminState = {
  showOnOrders: true,
  saveCustomerLayouts: true,
  allowReorder: true,
  exportPdf: true,
  exportRaster: true,
  printDpi: 300,
  sheetFormat: "letter",
  sheetMarginMm: 12.7,
  labelGapMm: 2,
  printTransparentBackground: false,
};
