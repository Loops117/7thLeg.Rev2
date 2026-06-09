import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_COMPANY_NAME,
  type GlobalSettingsState,
  type HomePageUrgentState,
  type LabelBuilderAdminState,
  type LabelCartAdminState,
  type LabelFulfillmentAdminState,
  type LabelPreviewWatermarkAdminPayload,
  labelCartAdminDefaults,
  labelFulfillmentAdminDefaults,
  labelPreviewAdminDefaults,
  parseLabelFulfillmentSheetFormat,
  parseLabelPreviewWatermarkKind,
  type LoyaltyProgramState,
  type PaymentGatewaysState,
  type SeoPublicConfig,
  type SeoSettingsState,
  type SiteConfigPublic,
  resolveSiteLinkPreviewText,
  globalSettingsDefaults,
  homePageUrgentDefaults,
  labelBuilderAdminDefaults,
  loyaltyProgramDefaults,
  paymentGatewaysDefaults,
  parseLogoPlacement,
  parseWatermarkPlacement,
} from "@/lib/site-config-types";
import { PUBLIC_DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand-assets";
import { parseSiteBrandingAssets, parseSiteBrandingSource } from "@/lib/site-branding";
import { normalizeStorefrontNavSettings } from "@/lib/storefront-nav-settings";
import { seoSettingsDefaults, type SeoAuditSnapshot } from "@/lib/seo";

export type UrgentHomeNotificationPayload = {
  enabled: boolean;
  title: string;
  body: string;
  revision: number;
};

const fallback: SiteConfigPublic = {
  companyName: DEFAULT_COMPANY_NAME,
  linkPreviewTitle: "",
  linkPreviewDescription: "",
  companyLogoUrl: PUBLIC_DEFAULT_BRAND_LOGO_PATH,
  companyLogoPlacement: "beside",
  headerShowCompanyName: true,
  headerShowCompanyLogo: true,
  productDiagonalBrandOverlay: false,
  watermarkOpacityPercent: 38,
  productDiagonalNameGapPx: 8,
  qrDefaultCenterImageUrl: "",
  labelBuilderEnabled: false,
  labelBuilderNavEnabled: true,
  navShopEnabled: true,
  navShopLabel: "Shop",
  navFeaturedEnabled: true,
  navFeaturedLabel: "Featured",
  navGalleryEnabled: true,
  navGalleryLabel: "Gallery",
  navAboutEnabled: true,
  navAboutLabel: "About",
};

export const getSiteConfig = cache(async function getSiteConfig(): Promise<SiteConfigPublic> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return { ...fallback };
    const rawLogo = typeof row.companyLogoUrl === "string" ? row.companyLogoUrl.trim() : "";
    const rawQrCenter =
      typeof row.qrDefaultCenterImageUrl === "string" ? row.qrDefaultCenterImageUrl.trim() : "";
    const nav = normalizeStorefrontNavSettings(row);
    return {
      companyName: row.companyName,
      linkPreviewTitle: typeof row.siteLinkPreviewTitle === "string" ? row.siteLinkPreviewTitle : "",
      linkPreviewDescription:
        typeof row.siteLinkPreviewDescription === "string" ? row.siteLinkPreviewDescription : "",
      companyLogoUrl: rawLogo.length > 0 ? rawLogo : PUBLIC_DEFAULT_BRAND_LOGO_PATH,
      companyLogoPlacement: parseLogoPlacement(row.companyLogoPlacement),
      headerShowCompanyName: row.headerShowCompanyName ?? true,
      headerShowCompanyLogo: row.headerShowCompanyLogo ?? true,
      productDiagonalBrandOverlay: !!row.productDiagonalBrandOverlay,
      watermarkOpacityPercent: Math.min(100, Math.max(0, row.watermarkOpacityPercent ?? 38)),
      productDiagonalNameGapPx: Math.min(64, Math.max(0, row.productDiagonalNameGapPx ?? 8)),
      qrDefaultCenterImageUrl: rawQrCenter,
      labelBuilderEnabled: !!row.labelBuilderEnabled,
      labelBuilderNavEnabled: row.labelBuilderNavEnabled ?? true,
      navShopEnabled: nav.shop.enabled,
      navShopLabel: nav.shop.label,
      navFeaturedEnabled: nav.featured.enabled,
      navFeaturedLabel: nav.featured.label,
      navGalleryEnabled: nav.gallery.enabled,
      navGalleryLabel: nav.gallery.label,
      navAboutEnabled: nav.about.enabled,
      navAboutLabel: nav.about.label,
    };
  } catch {
    return { ...fallback };
  }
});

export async function getGlobalSettingsForAdmin(): Promise<GlobalSettingsState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return { ...globalSettingsDefaults };
    const maxEdge = Math.min(8192, Math.max(256, row.uploadImageMaxEdgePx ?? 2400));
    const jpgQ = Math.min(100, Math.max(1, row.uploadImageJpegQuality ?? 85));
    const taxBps = Math.max(0, Math.floor(row.checkoutTaxRateBps ?? 0));
    return {
      companyName: row.companyName?.trim() || globalSettingsDefaults.companyName,
      headerShowCompanyName: row.headerShowCompanyName ?? globalSettingsDefaults.headerShowCompanyName,
      headerShowCompanyLogo: row.headerShowCompanyLogo ?? globalSettingsDefaults.headerShowCompanyLogo,
      productDiagonalBrandOverlay: !!(row.productDiagonalBrandOverlay ?? globalSettingsDefaults.productDiagonalBrandOverlay),
      watermarkPlacement: parseWatermarkPlacement(row.watermarkPlacement),
      watermarkOpacityPercent: Math.min(100, Math.max(0, row.watermarkOpacityPercent ?? 38)),
      productDiagonalNameGapPx: Math.min(64, Math.max(0, row.productDiagonalNameGapPx ?? 8)),
      companyLogoUrl: typeof row.companyLogoUrl === "string" ? row.companyLogoUrl : "",
      companyLogoPlacement: parseLogoPlacement(row.companyLogoPlacement),
      uploadImageMaxEdgePx: maxEdge,
      uploadImageJpegQuality: jpgQ,
      watermarkImageUrl: typeof row.watermarkImageUrl === "string" ? row.watermarkImageUrl : "",
      checkoutSalesTaxPercent: taxBps / 100,
      siteBrandingSource: parseSiteBrandingSource(row.siteBrandingSource),
      siteBrandingAssets: parseSiteBrandingAssets(row.siteBrandingAssets),
      linkPreviewTitle: typeof row.siteLinkPreviewTitle === "string" ? row.siteLinkPreviewTitle : "",
      linkPreviewDescription:
        typeof row.siteLinkPreviewDescription === "string" ? row.siteLinkPreviewDescription : "",
      googleMapsApiKey: typeof row.googleMapsApiKey === "string" ? row.googleMapsApiKey : "",
    };
  } catch {
    return { ...globalSettingsDefaults };
  }
}

/** Resolves Maps JS key for customer address autocomplete (env overrides admin setting). */
export async function getGoogleMapsApiKeyForClient(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  if (fromEnv) return fromEnv;
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { googleMapsApiKey: true },
    });
    return row?.googleMapsApiKey?.trim() ?? "";
  } catch {
    return "";
  }
}

export const getSeoPublicConfig = cache(async function getSeoPublicConfig(): Promise<SeoPublicConfig> {
  const base = await getSiteConfig();
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        seoIndexingEnabled: true,
        googleSiteVerification: true,
        seoStoreMetaTitle: true,
        seoStoreMetaDescription: true,
      },
    });
    return {
      ...base,
      seoIndexingEnabled: row?.seoIndexingEnabled ?? true,
      googleSiteVerification:
        typeof row?.googleSiteVerification === "string" ? row.googleSiteVerification.trim() : "",
      seoStoreMetaTitle: typeof row?.seoStoreMetaTitle === "string" ? row.seoStoreMetaTitle : "",
      seoStoreMetaDescription:
        typeof row?.seoStoreMetaDescription === "string" ? row.seoStoreMetaDescription : "",
    };
  } catch {
    const defaults = seoSettingsDefaults(base.companyName);
    return {
      ...base,
      seoIndexingEnabled: defaults.seoIndexingEnabled,
      googleSiteVerification: defaults.googleSiteVerification,
      seoStoreMetaTitle: defaults.seoStoreMetaTitle,
      seoStoreMetaDescription: defaults.seoStoreMetaDescription,
    };
  }
});

export async function getSeoSettingsForAdmin(): Promise<SeoSettingsState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return seoSettingsDefaults();
    return {
      companyName: row.companyName?.trim() || DEFAULT_COMPANY_NAME,
      linkPreviewTitle: typeof row.siteLinkPreviewTitle === "string" ? row.siteLinkPreviewTitle : "",
      linkPreviewDescription:
        typeof row.siteLinkPreviewDescription === "string" ? row.siteLinkPreviewDescription : "",
      seoIndexingEnabled: row.seoIndexingEnabled ?? true,
      googleSiteVerification:
        typeof row.googleSiteVerification === "string" ? row.googleSiteVerification.trim() : "",
      seoStoreMetaTitle: typeof row.seoStoreMetaTitle === "string" ? row.seoStoreMetaTitle : "",
      seoStoreMetaDescription:
        typeof row.seoStoreMetaDescription === "string" ? row.seoStoreMetaDescription : "",
    };
  } catch {
    return seoSettingsDefaults();
  }
}

export async function getSeoAuditSnapshot(): Promise<SeoAuditSnapshot> {
  try {
    const [activeProductCount, activeProductsMissingShortDescription, inactiveProductCount] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.product.count({
        where: {
          active: true,
          OR: [{ shortDescription: null }, { shortDescription: "" }],
        },
      }),
      prisma.product.count({ where: { active: false } }),
    ]);
    return { activeProductCount, activeProductsMissingShortDescription, inactiveProductCount };
  } catch {
    return { activeProductCount: 0, activeProductsMissingShortDescription: 0, inactiveProductCount: 0 };
  }
}

export { resolveSiteLinkPreviewText };

export async function getLoyaltyProgramForAdmin(): Promise<LoyaltyProgramState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return { ...loyaltyProgramDefaults };
    return {
      loyaltyEnabled: !!row.loyaltyEnabled,
      pointsPerDollar: Math.min(1000, Math.max(0, row.pointsPerDollar)),
      loyaltyRedemptionCentsPerPoint: Math.min(10_000, Math.max(0, Math.floor(row.loyaltyRedemptionCentsPerPoint ?? 10))),
      guestCheckoutEnabled: row.guestCheckoutEnabled ?? true,
    };
  } catch {
    return { ...loyaltyProgramDefaults };
  }
}

export async function getHomePageUrgentForAdmin(): Promise<HomePageUrgentState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return { ...homePageUrgentDefaults };
    return {
      homeUrgentNotificationEnabled: !!row.homeUrgentNotificationEnabled,
      homeUrgentNotificationTitle:
        typeof row.homeUrgentNotificationTitle === "string" ? row.homeUrgentNotificationTitle : "",
      homeUrgentNotificationBody:
        typeof row.homeUrgentNotificationBody === "string" ? row.homeUrgentNotificationBody : "",
      homeUrgentNotificationRevision: Math.max(0, row.homeUrgentNotificationRevision ?? 0),
    };
  } catch {
    return { ...homePageUrgentDefaults };
  }
}

export async function getPaymentGatewaysForAdmin(): Promise<PaymentGatewaysState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return { ...paymentGatewaysDefaults };
    return {
      stripeEnabled: row.paymentStripeEnabled ?? true,
      squareEnabled: !!row.paymentSquareEnabled,
    };
  } catch {
    return { ...paymentGatewaysDefaults };
  }
}

export async function getUrgentHomeNotificationPayload(): Promise<UrgentHomeNotificationPayload> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) {
      return { enabled: false, title: "", body: "", revision: 0 };
    }
    return {
      enabled: !!row.homeUrgentNotificationEnabled,
      title: typeof row.homeUrgentNotificationTitle === "string" ? row.homeUrgentNotificationTitle : "",
      body: typeof row.homeUrgentNotificationBody === "string" ? row.homeUrgentNotificationBody : "",
      revision: Math.max(0, row.homeUrgentNotificationRevision ?? 0),
    };
  } catch {
    return { enabled: false, title: "", body: "", revision: 0 };
  }
}

export async function getLabelBuilderForAdmin(): Promise<LabelBuilderAdminState> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { labelBuilderEnabled: true, labelBuilderNavEnabled: true },
    });
    if (!row) return { ...labelBuilderAdminDefaults };
    return {
      labelBuilderEnabled: !!row.labelBuilderEnabled,
      labelBuilderNavEnabled: row.labelBuilderNavEnabled ?? true,
    };
  } catch {
    return { ...labelBuilderAdminDefaults };
  }
}

export async function getLabelCartSettingsForAdmin(): Promise<LabelCartAdminState> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        labelCartShowSubtotalPreview: true,
        labelCartMergeWithStoreCart: true,
        labelCartMinQuantity: true,
      },
    });
    if (!row) return { ...labelCartAdminDefaults };
    const minQuantity = Math.min(9999, Math.max(1, Math.round(row.labelCartMinQuantity ?? 1)));
    return {
      showSubtotalPreview: row.labelCartShowSubtotalPreview ?? true,
      mergeWithStoreCart: row.labelCartMergeWithStoreCart ?? true,
      minQuantity,
    };
  } catch {
    return { ...labelCartAdminDefaults };
  }
}

export async function getLabelPreviewWatermarkForAdmin(): Promise<LabelPreviewWatermarkAdminPayload> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        companyName: true,
        watermarkImageUrl: true,
        watermarkPlacement: true,
        watermarkOpacityPercent: true,
        productDiagonalBrandOverlay: true,
        productDiagonalNameGapPx: true,
        labelPreviewMatchProductWatermark: true,
        labelPreviewMatchDiagonalBrand: true,
        labelPreviewProtectInteraction: true,
        labelProductionUnwatermarked: true,
        labelPreviewWatermarkKind: true,
        labelPreviewWatermarkImageUrl: true,
        labelPreviewWatermarkPlacement: true,
        labelPreviewWatermarkOpacityPercent: true,
        labelPreviewWatermarkScalePercent: true,
        labelPreviewWatermarkText: true,
      },
    });
    if (!row) {
      return {
        settings: { ...labelPreviewAdminDefaults },
        global: {
          companyName: globalSettingsDefaults.companyName,
          watermarkImageUrl: "",
          watermarkPlacement: globalSettingsDefaults.watermarkPlacement,
          watermarkOpacityPercent: globalSettingsDefaults.watermarkOpacityPercent,
          productDiagonalBrandOverlay: globalSettingsDefaults.productDiagonalBrandOverlay,
          productDiagonalNameGapPx: globalSettingsDefaults.productDiagonalNameGapPx,
        },
      };
    }

    let watermarkKind = parseLabelPreviewWatermarkKind(row.labelPreviewWatermarkKind);
    if (watermarkKind === "global" && row.labelPreviewMatchProductWatermark === false) {
      watermarkKind = "off";
    }

    const watermarkOpacityPercent = Math.min(
      100,
      Math.max(0, row.labelPreviewWatermarkOpacityPercent ?? row.watermarkOpacityPercent ?? 38),
    );
    const watermarkScalePercent = Math.min(
      300,
      Math.max(25, row.labelPreviewWatermarkScalePercent ?? 100),
    );

    return {
      settings: {
        matchProductWatermark: watermarkKind === "global",
        watermarkKind,
        watermarkImageUrl:
          typeof row.labelPreviewWatermarkImageUrl === "string" ? row.labelPreviewWatermarkImageUrl.trim() : "",
        watermarkPlacement: parseWatermarkPlacement(
          row.labelPreviewWatermarkPlacement ?? row.watermarkPlacement,
        ),
        watermarkOpacityPercent,
        watermarkScalePercent,
        watermarkText:
          (typeof row.labelPreviewWatermarkText === "string" && row.labelPreviewWatermarkText.trim()) ||
          labelPreviewAdminDefaults.watermarkText,
        matchDiagonalBrand: row.labelPreviewMatchDiagonalBrand ?? true,
        protectPreviewInteraction: row.labelPreviewProtectInteraction ?? true,
        productionUnwatermarked: row.labelProductionUnwatermarked ?? true,
      },
      global: {
        companyName: row.companyName?.trim() || globalSettingsDefaults.companyName,
        watermarkImageUrl: typeof row.watermarkImageUrl === "string" ? row.watermarkImageUrl.trim() : "",
        watermarkPlacement: parseWatermarkPlacement(row.watermarkPlacement),
        watermarkOpacityPercent: Math.min(100, Math.max(0, row.watermarkOpacityPercent ?? 38)),
        productDiagonalBrandOverlay: !!row.productDiagonalBrandOverlay,
        productDiagonalNameGapPx: Math.min(64, Math.max(0, row.productDiagonalNameGapPx ?? 8)),
      },
    };
  } catch {
    return {
      settings: { ...labelPreviewAdminDefaults },
      global: {
        companyName: globalSettingsDefaults.companyName,
        watermarkImageUrl: "",
        watermarkPlacement: globalSettingsDefaults.watermarkPlacement,
        watermarkOpacityPercent: globalSettingsDefaults.watermarkOpacityPercent,
        productDiagonalBrandOverlay: globalSettingsDefaults.productDiagonalBrandOverlay,
        productDiagonalNameGapPx: globalSettingsDefaults.productDiagonalNameGapPx,
      },
    };
  }
}

export async function getLabelFulfillmentSettingsForAdmin(): Promise<LabelFulfillmentAdminState> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        labelFulfillmentShowOnOrders: true,
        labelFulfillmentSaveLayouts: true,
        labelFulfillmentAllowReorder: true,
        labelFulfillmentExportPdf: true,
        labelFulfillmentExportRaster: true,
        labelFulfillmentPrintDpi: true,
        labelFulfillmentSheetFormat: true,
        labelFulfillmentSheetMarginMm: true,
        labelFulfillmentLabelGapMm: true,
        labelFulfillmentPrintTransparentBg: true,
      },
    });
    if (!row) return { ...labelFulfillmentAdminDefaults };

    const printDpi = Math.min(600, Math.max(150, Math.round(row.labelFulfillmentPrintDpi ?? 300)));
    const sheetMarginMm = Math.min(40, Math.max(0, Number(row.labelFulfillmentSheetMarginMm ?? 12.7)));
    const labelGapMm = Math.min(20, Math.max(0, Number(row.labelFulfillmentLabelGapMm ?? 2)));

    return {
      showOnOrders: row.labelFulfillmentShowOnOrders ?? true,
      saveCustomerLayouts: row.labelFulfillmentSaveLayouts ?? true,
      allowReorder: row.labelFulfillmentAllowReorder ?? true,
      exportPdf: row.labelFulfillmentExportPdf ?? true,
      exportRaster: row.labelFulfillmentExportRaster ?? true,
      printDpi,
      sheetFormat: parseLabelFulfillmentSheetFormat(row.labelFulfillmentSheetFormat),
      sheetMarginMm,
      labelGapMm,
      printTransparentBackground: row.labelFulfillmentPrintTransparentBg ?? false,
    };
  } catch {
    return { ...labelFulfillmentAdminDefaults };
  }
}
