"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  getUploadImageSettingsFromDb,
  normalizeCompanyLogoBuffer,
  normalizeWatermarkBuffer,
} from "@/lib/image-upload-normalize";
import { Prisma } from "@/generated/prisma/client";
import { putUploadObject } from "@/lib/app-uploads";
import { prisma } from "@/lib/prisma";
import {
  parseSiteBrandingAssets,
  parseSiteBrandingSource,
  type SiteBrandingAssets,
  type SiteBrandingSource,
} from "@/lib/site-branding";
import {
  deleteSiteBrandingAssetUrls,
  fetchImageBufferFromPublicUrl,
  generateAndUploadSiteBrandingAssets,
} from "@/lib/site-branding-generate";
import {
  type GlobalSettingsState,
  type HomePageUrgentState,
  type LabelBuilderAdminState,
  type LabelCartAdminState,
  type LabelFulfillmentAdminState,
  type LabelPreviewAdminState,
  labelCartAdminDefaults,
  labelFulfillmentAdminDefaults,
  labelPreviewAdminDefaults,
  parseLabelFulfillmentSheetFormat,
  parseLabelPreviewWatermarkKind,
  type LoyaltyProgramState,
  type PaymentGatewaysState,
  parseLogoPlacement,
  parseWatermarkPlacement,
} from "@/lib/site-config-types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

/** Inline defaults for bootstrap — avoid `{ … } as object` (can break Prisma 7 adapter upsert validation). */
const STORE_BOOTSTRAP = {
  storeBannerEnabled: false,
  storeBannerHtml: "",
  storeFeaturedStripEnabled: false,
  storeFeaturedStripConfig: { title: "Featured picks", maxProducts: 8 },
  labelBuilderEnabled: false,
  labelBuilderNavEnabled: true,
  siteBrandingSource: "default",
  labelCartShowSubtotalPreview: true,
  labelCartMergeWithStoreCart: true,
  labelCartMinQuantity: 1,
  labelPreviewMatchProductWatermark: true,
  labelPreviewMatchDiagonalBrand: true,
  labelPreviewProtectInteraction: true,
  labelProductionUnwatermarked: true,
  labelPreviewWatermarkKind: "global",
  labelPreviewWatermarkImageUrl: "",
  labelPreviewWatermarkPlacement: "bottomRight",
  labelPreviewWatermarkOpacityPercent: 38,
  labelPreviewWatermarkScalePercent: 100,
  labelPreviewWatermarkText: "This is a preview",
  labelFulfillmentShowOnOrders: true,
  labelFulfillmentSaveLayouts: true,
  labelFulfillmentAllowReorder: true,
  labelFulfillmentExportPdf: true,
  labelFulfillmentExportRaster: true,
  labelFulfillmentPrintDpi: 300,
  labelFulfillmentSheetFormat: "letter",
  labelFulfillmentSheetMarginMm: 12.7,
  labelFulfillmentLabelGapMm: 2,
  labelFulfillmentPrintTransparentBg: false,
  storeFooterEnabled: false,
  storeFooterHtml: "",
  cardHoverMode: "zoom" as const,
  paymentStripeEnabled: true,
  paymentSquareEnabled: false,
} as const;

function safePublicPath(v: string, maxLen: number): string {
  const t = v.trim();
  if (!t || (!t.startsWith("/uploads/") && !t.startsWith("https://"))) return "";
  return t.slice(0, maxLen);
}

export type UpdateGlobalSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateGlobalSettings(state: GlobalSettingsState): Promise<UpdateGlobalSettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }

  const companyName =
    typeof state.companyName === "string" && state.companyName.trim().length > 0
      ? state.companyName.trim().slice(0, 120)
      : "7th Leg";
  const wRaw = state.watermarkImageUrl?.trim() ?? "";
  const watermarkImageUrl = safePublicPath(wRaw, 500);
  const logoRaw = state.companyLogoUrl?.trim() ?? "";
  const companyLogoUrl = safePublicPath(logoRaw, 500);
  const companyLogoPlacement = parseLogoPlacement(state.companyLogoPlacement);
  const uploadImageMaxEdgePx = Math.min(8192, Math.max(256, Math.floor(Number(state.uploadImageMaxEdgePx) || 2400)));
  const uploadImageJpegQuality = Math.min(100, Math.max(1, Math.floor(Number(state.uploadImageJpegQuality) || 85)));
  const headerShowCompanyName = !!state.headerShowCompanyName;
  const headerShowCompanyLogo = !!state.headerShowCompanyLogo;
  const productDiagonalBrandOverlay = !!state.productDiagonalBrandOverlay;
  const watermarkPlacement = parseWatermarkPlacement(state.watermarkPlacement);
  const watermarkOpacityPercent = Math.min(100, Math.max(0, Math.floor(Number(state.watermarkOpacityPercent) || 0)));
  const productDiagonalNameGapPx = Math.min(64, Math.max(0, Math.floor(Number(state.productDiagonalNameGapPx) || 0)));

  let checkoutTaxRateBps = Math.round(Number(state.checkoutSalesTaxPercent) * 100);
  if (!Number.isFinite(checkoutTaxRateBps) || checkoutTaxRateBps < 0) checkoutTaxRateBps = 0;
  checkoutTaxRateBps = Math.min(999_999, checkoutTaxRateBps);

  const linkPreviewTitle =
    typeof state.linkPreviewTitle === "string" ? state.linkPreviewTitle.trim().slice(0, 120) : "";
  const linkPreviewDescription =
    typeof state.linkPreviewDescription === "string"
      ? state.linkPreviewDescription.trim().slice(0, 300)
      : "";
  const googleMapsApiKey =
    typeof state.googleMapsApiKey === "string" ? state.googleMapsApiKey.trim().slice(0, 200) : "";

  const siteBrandingSource = parseSiteBrandingSource(state.siteBrandingSource);
  const prevBranding = await prisma.siteConfig
    .findUnique({
      where: { id: 1 },
      select: { siteBrandingSource: true, siteBrandingAssets: true },
    })
    .catch(() => null);
  const prevSource = parseSiteBrandingSource(prevBranding?.siteBrandingSource);
  const prevAssets = parseSiteBrandingAssets(prevBranding?.siteBrandingAssets);

  if (siteBrandingSource === "default" && prevAssets) {
    await deleteSiteBrandingAssetUrls(prevAssets);
  }

  try {
    // Minimal upsert avoids Prisma 7 driver-adapter quirks with fat `create` payloads; branding columns follow via SQL.
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName,
        watermarkImageUrl,
        ...STORE_BOOTSTRAP,
      },
      update: {
        companyName,
        watermarkImageUrl,
      },
    });
    await prisma.$executeRaw`
      UPDATE "site_config"
      SET
        "companyLogoUrl" = ${companyLogoUrl},
        "companyLogoPlacement" = ${companyLogoPlacement},
        "uploadImageMaxEdgePx" = ${uploadImageMaxEdgePx},
        "uploadImageJpegQuality" = ${uploadImageJpegQuality},
        "header_show_company_name" = ${headerShowCompanyName},
        "header_show_company_logo" = ${headerShowCompanyLogo},
        "product_diagonal_brand_overlay" = ${productDiagonalBrandOverlay},
        "watermark_placement" = ${watermarkPlacement},
        "watermark_opacity_percent" = ${watermarkOpacityPercent},
        "product_diagonal_name_gap_px" = ${productDiagonalNameGapPx},
        "checkout_tax_rate_bps" = ${checkoutTaxRateBps},
        "site_branding_source" = ${siteBrandingSource},
        "site_link_preview_title" = ${linkPreviewTitle},
        "site_link_preview_description" = ${linkPreviewDescription},
        "google_maps_api_key" = ${googleMapsApiKey}
      WHERE "id" = 1
    `;

    if (siteBrandingSource === "default") {
      await prisma.siteConfig.update({
        where: { id: 1 },
        data: { siteBrandingAssets: Prisma.DbNull },
      });
    }
  } catch (e) {
    console.error("updateGlobalSettings", e);
    const msg = e instanceof Error ? e.message : String(e);
    const missingColumn =
      /Unknown column|column .* does not exist|does not exist in the current database|\bP2022\b|42703/i.test(msg) ||
      /\bP2021\b/.test(msg);
    if (missingColumn) {
      return {
        ok: false,
        error:
          "Could not save — this database is missing newer columns (run `npx prisma migrate deploy` against the DATABASE_URL used by **this deployment** — e.g. production on Vercel — then try again).",
      };
    }
    return { ok: false, error: msg.length > 500 ? `${msg.slice(0, 497)}…` : msg };
  }

  if (
    siteBrandingSource === "companyLogo" &&
    companyLogoUrl &&
    (siteBrandingSource !== prevSource || !parseSiteBrandingAssets(state.siteBrandingAssets))
  ) {
    const regen = await regenerateSiteBrandingFromCompanyLogoInternal();
    if (!regen.ok) return { ok: false, error: regen.error };
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/global", "page");
  revalidatePath("/cart", "page");
  return { ok: true };
}

async function persistSiteBrandingAssets(
  source: SiteBrandingSource,
  assets: SiteBrandingAssets | null,
): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: "7th Leg",
      loyaltyEnabled: false,
      pointsPerDollar: 10,
      ...STORE_BOOTSTRAP,
      siteBrandingSource: source,
      siteBrandingAssets: assets ?? Prisma.DbNull,
    },
    update: {
      siteBrandingSource: source,
      siteBrandingAssets: assets ?? Prisma.DbNull,
    },
  });
}

type BrandingActionResult = { ok: true; assets: SiteBrandingAssets } | { ok: false; error: string };

async function regenerateSiteBrandingFromCompanyLogoInternal(): Promise<BrandingActionResult> {
  const row = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { companyLogoUrl: true, siteBrandingAssets: true },
  });
  const logoUrl = row?.companyLogoUrl?.trim() ?? "";
  if (!logoUrl) {
    return { ok: false, error: "Upload a company logo first, or choose another icon source." };
  }
  try {
    const buf = await fetchImageBufferFromPublicUrl(logoUrl);
    const prev = parseSiteBrandingAssets(row?.siteBrandingAssets);
    await deleteSiteBrandingAssetUrls(prev);
    const assets = await generateAndUploadSiteBrandingAssets(buf);
    await persistSiteBrandingAssets("companyLogo", assets);
    return { ok: true, assets };
  } catch (e) {
    console.error("regenerateSiteBrandingFromCompanyLogo", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate icons." };
  }
}

export type UpdateHomeUrgentResult = { ok: true; revision: number } | { ok: false; error: string };

/** Home-only pop-up; revision bumps when enabled state or copy changes. */
export async function updateHomeUrgentNotification(
  draft: Pick<
    HomePageUrgentState,
    "homeUrgentNotificationEnabled" | "homeUrgentNotificationTitle" | "homeUrgentNotificationBody"
  >,
): Promise<UpdateHomeUrgentResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const nTitle = (draft.homeUrgentNotificationTitle ?? "").trim().slice(0, 200);
  const nBody = (draft.homeUrgentNotificationBody ?? "").trim().slice(0, 8000);
  const nEnabled = !!draft.homeUrgentNotificationEnabled;

  const prevUrgent = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: {
      homeUrgentNotificationEnabled: true,
      homeUrgentNotificationTitle: true,
      homeUrgentNotificationBody: true,
      homeUrgentNotificationRevision: true,
    },
  });
  const pe = prevUrgent?.homeUrgentNotificationEnabled ?? false;
  const pt = prevUrgent?.homeUrgentNotificationTitle ?? "";
  const pb = prevUrgent?.homeUrgentNotificationBody ?? "";
  const prevR = prevUrgent?.homeUrgentNotificationRevision ?? 0;
  const urgentChanged =
    prevUrgent == null
      ? nEnabled || nTitle !== "" || nBody !== ""
      : nEnabled !== pe || nTitle !== pt || nBody !== pb;
  const nextRevision = urgentChanged ? prevR + 1 : prevR;

  await prisma.$executeRaw`
    UPDATE "site_config"
    SET
      "homeUrgentNotificationEnabled" = ${nEnabled},
      "homeUrgentNotificationTitle" = ${nTitle},
      "homeUrgentNotificationBody" = ${nBody},
      "homeUrgentNotificationRevision" = ${nextRevision}
    WHERE "id" = 1
  `;

  revalidatePath("/", "layout");
  revalidatePath("/settings/home", "page");
  return { ok: true, revision: nextRevision };
}

export type UpdatePaymentGatewaysResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persist payment toggles with raw SQL so saves still work even if the generated client or Prisma typings
 * are briefly out of sync with the deployed schema (same pattern as urgent-home fields via executeRaw elsewhere).
 */
export async function updatePaymentGatewaysSettings(state: PaymentGatewaysState): Promise<UpdatePaymentGatewaysResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { ok: false, error: "Sign in again with an admin account to change payment settings." };
  }

  const paymentStripeEnabled = !!state.stripeEnabled;
  const paymentSquareEnabled = !!state.squareEnabled;

  try {
    const rowExists = await prisma.siteConfig.findUnique({ where: { id: 1 }, select: { id: true } });
    if (!rowExists) {
      return {
        ok: false,
        error:
          'Missing site configuration row. Visit Global settings and save once, or run `npx prisma migrate deploy`; `site_config` must have row id = 1.',
      };
    }

    await prisma.$executeRaw`
      UPDATE "site_config"
      SET
        "payment_stripe_enabled" = ${paymentStripeEnabled},
        "payment_square_enabled" = ${paymentSquareEnabled}
      WHERE "id" = 1
    `;

    revalidatePath("/settings/payments", "page");
    revalidatePath("/cart", "page");
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (e) {
    console.error("updatePaymentGatewaysSettings", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (/payment_stripe_enabled|payment_square_enabled|does not exist|Unknown column/i.test(msg)) {
      return {
        ok: false,
        error:
          "Database is missing the payment columns for this deployment. Apply migrations (e.g. run `npx prisma migrate deploy`).",
      };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}

export async function updateLoyaltyProgramSettings(state: LoyaltyProgramState) {
  await requireAdmin();
  const loyaltyEnabled = !!state.loyaltyEnabled;
  const pointsPerDollar = Math.min(1000, Math.max(0, Math.floor(Number(state.pointsPerDollar) || 0)));
  const loyaltyRedemptionCentsPerPoint = Math.min(
    10_000,
    Math.max(0, Math.floor(Number(state.loyaltyRedemptionCentsPerPoint) || 0)),
  );
  const guestCheckoutEnabled = !!state.guestCheckoutEnabled;
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: "7th Leg",
      loyaltyEnabled,
      pointsPerDollar,
      loyaltyRedemptionCentsPerPoint,
      guestCheckoutEnabled,
      ...STORE_BOOTSTRAP,
    },
    update: { loyaltyEnabled, pointsPerDollar, loyaltyRedemptionCentsPerPoint, guestCheckoutEnabled },
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings/loyalty", "page");
}

export type UpdateLabelBuilderResult = { ok: true } | { ok: false; error: string };

export type UpdateLabelCartSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateLabelCartSettings(state: LabelCartAdminState): Promise<UpdateLabelCartSettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }

  const showSubtotalPreview = !!state.showSubtotalPreview;
  const mergeWithStoreCart = !!state.mergeWithStoreCart;
  const minQuantity = Math.min(9999, Math.max(1, Math.round(Number(state.minQuantity) || 1)));

  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        loyaltyRedemptionCentsPerPoint: 10,
        ...STORE_BOOTSTRAP,
        labelCartShowSubtotalPreview: showSubtotalPreview,
        labelCartMergeWithStoreCart: mergeWithStoreCart,
        labelCartMinQuantity: minQuantity,
      },
      update: {
        labelCartShowSubtotalPreview: showSubtotalPreview,
        labelCartMergeWithStoreCart: mergeWithStoreCart,
        labelCartMinQuantity: minQuantity,
      },
    });
    revalidatePath("/settings/labels", "page");
    revalidatePath("/labels", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateLabelCartSettings", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (/label_cart_|does not exist|Unknown column/i.test(msg)) {
      return {
        ok: false,
        error: "Database is missing label cart settings columns. Run `npx prisma migrate deploy`.",
      };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}

export type UpdateLabelPreviewSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateLabelPreviewSettings(
  state: LabelPreviewAdminState,
): Promise<UpdateLabelPreviewSettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }

  const watermarkKind = parseLabelPreviewWatermarkKind(state.watermarkKind);
  const matchProductWatermark = watermarkKind === "global";
  const matchDiagonalBrand = !!state.matchDiagonalBrand;
  const protectPreviewInteraction = !!state.protectPreviewInteraction;
  const productionUnwatermarked = !!state.productionUnwatermarked;
  const watermarkImageUrl = safePublicPath(state.watermarkImageUrl?.trim() ?? "", 500);
  const watermarkPlacement = parseWatermarkPlacement(state.watermarkPlacement);
  const watermarkOpacityPercent = Math.min(
    100,
    Math.max(0, Math.floor(Number(state.watermarkOpacityPercent) || 0)),
  );
  const watermarkScalePercent = Math.min(300, Math.max(25, Math.round(Number(state.watermarkScalePercent) || 100)));
  const watermarkText = (state.watermarkText?.trim() || "This is a preview").slice(0, 120);

  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        loyaltyRedemptionCentsPerPoint: 10,
        ...STORE_BOOTSTRAP,
        labelPreviewMatchProductWatermark: matchProductWatermark,
        labelPreviewMatchDiagonalBrand: matchDiagonalBrand,
        labelPreviewProtectInteraction: protectPreviewInteraction,
        labelProductionUnwatermarked: productionUnwatermarked,
        labelPreviewWatermarkKind: watermarkKind,
        labelPreviewWatermarkImageUrl: watermarkImageUrl,
        labelPreviewWatermarkPlacement: watermarkPlacement,
        labelPreviewWatermarkOpacityPercent: watermarkOpacityPercent,
        labelPreviewWatermarkScalePercent: watermarkScalePercent,
        labelPreviewWatermarkText: watermarkText,
      },
      update: {
        labelPreviewMatchProductWatermark: matchProductWatermark,
        labelPreviewMatchDiagonalBrand: matchDiagonalBrand,
        labelPreviewProtectInteraction: protectPreviewInteraction,
        labelProductionUnwatermarked: productionUnwatermarked,
        labelPreviewWatermarkKind: watermarkKind,
        labelPreviewWatermarkImageUrl: watermarkImageUrl,
        labelPreviewWatermarkPlacement: watermarkPlacement,
        labelPreviewWatermarkOpacityPercent: watermarkOpacityPercent,
        labelPreviewWatermarkScalePercent: watermarkScalePercent,
        labelPreviewWatermarkText: watermarkText,
      },
    });
    revalidatePath("/settings/labels", "page");
    revalidatePath("/labels", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateLabelPreviewSettings", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (/label_preview_|label_production_|does not exist|Unknown column/i.test(msg)) {
      return {
        ok: false,
        error: "Database is missing label preview columns. Run `npx prisma migrate deploy`.",
      };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}

export type UploadLabelPreviewWatermarkResult = { ok: true; url: string } | { ok: false; error: string };

/** Upload a label-only preview watermark image (Settings → Labels → Previews). */
export async function uploadLabelPreviewWatermark(
  formData: FormData,
): Promise<UploadLabelPreviewWatermarkResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > WM_MAX) {
      return { ok: false, error: "Watermark must be 4MB or smaller." };
    }
    if (!WM_TYPES.has(file.type)) {
      return { ok: false, error: "Use PNG, WebP, JPEG, or GIF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeWatermarkBuffer(buf, file.type, settings);
    const name = `label-watermark-${randomUUID()}.${norm.ext}`;
    const key = `uploads/site/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        ...STORE_BOOTSTRAP,
        labelPreviewWatermarkImageUrl: url,
        labelPreviewWatermarkKind: "custom",
        labelPreviewMatchProductWatermark: false,
      },
      update: {
        labelPreviewWatermarkImageUrl: url,
        labelPreviewWatermarkKind: "custom",
        labelPreviewMatchProductWatermark: false,
      },
    });

    revalidatePath("/settings/labels", "page");
    revalidatePath("/labels", "page");
    return { ok: true, url };
  } catch (e) {
    console.error("uploadLabelPreviewWatermark", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export type UpdateLabelFulfillmentSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateLabelFulfillmentSettings(
  state: LabelFulfillmentAdminState,
): Promise<UpdateLabelFulfillmentSettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }

  const showOnOrders = !!state.showOnOrders;
  const saveCustomerLayouts = !!state.saveCustomerLayouts;
  const allowReorder = !!state.allowReorder;
  const exportPdf = !!state.exportPdf;
  const exportRaster = !!state.exportRaster;
  const printDpi = Math.min(600, Math.max(150, Math.round(Number(state.printDpi) || 300)));
  const sheetFormat = parseLabelFulfillmentSheetFormat(state.sheetFormat);
  const sheetMarginMm = Math.min(40, Math.max(0, Number(state.sheetMarginMm) || 0));
  const labelGapMm = Math.min(20, Math.max(0, Number(state.labelGapMm) || 0));
  const printTransparentBackground = !!state.printTransparentBackground;

  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        loyaltyRedemptionCentsPerPoint: 10,
        ...STORE_BOOTSTRAP,
        labelFulfillmentShowOnOrders: showOnOrders,
        labelFulfillmentSaveLayouts: saveCustomerLayouts,
        labelFulfillmentAllowReorder: allowReorder,
        labelFulfillmentExportPdf: exportPdf,
        labelFulfillmentExportRaster: exportRaster,
        labelFulfillmentPrintDpi: printDpi,
        labelFulfillmentSheetFormat: sheetFormat,
        labelFulfillmentSheetMarginMm: sheetMarginMm,
        labelFulfillmentLabelGapMm: labelGapMm,
        labelFulfillmentPrintTransparentBg: printTransparentBackground,
      },
      update: {
        labelFulfillmentShowOnOrders: showOnOrders,
        labelFulfillmentSaveLayouts: saveCustomerLayouts,
        labelFulfillmentAllowReorder: allowReorder,
        labelFulfillmentExportPdf: exportPdf,
        labelFulfillmentExportRaster: exportRaster,
        labelFulfillmentPrintDpi: printDpi,
        labelFulfillmentSheetFormat: sheetFormat,
        labelFulfillmentSheetMarginMm: sheetMarginMm,
        labelFulfillmentLabelGapMm: labelGapMm,
        labelFulfillmentPrintTransparentBg: printTransparentBackground,
      },
    });
    revalidatePath("/settings/labels", "page");
    revalidatePath("/settings/sales", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateLabelFulfillmentSettings", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (/label_fulfillment_|does not exist|Unknown column/i.test(msg)) {
      return {
        ok: false,
        error: "Database is missing label fulfillment columns. Run `npx prisma migrate deploy`.",
      };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}

export async function updateLabelBuilderSettings(state: LabelBuilderAdminState): Promise<UpdateLabelBuilderResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }
  const labelBuilderEnabled = !!state.labelBuilderEnabled;
  const labelBuilderNavEnabled = !!state.labelBuilderNavEnabled;
  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        loyaltyRedemptionCentsPerPoint: 10,
        ...STORE_BOOTSTRAP,
        labelBuilderEnabled,
        labelBuilderNavEnabled,
      },
      update: { labelBuilderEnabled, labelBuilderNavEnabled },
    });
    revalidatePath("/", "layout");
    revalidatePath("/labels", "page");
    revalidatePath("/settings/labels", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateLabelBuilderSettings", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (/label_builder_|does not exist|Unknown column/i.test(msg)) {
      return {
        ok: false,
        error:
          "Database is missing label builder columns. Apply migrations (e.g. run `npx prisma migrate deploy`).",
      };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}

const WM_MAX = 4 * 1024 * 1024;
const WM_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/gif"]);

export type UploadWatermarkResult = { ok: true; url: string } | { ok: false; error: string };

/** Upload a PNG/WebP/JPEG to use as the site-wide watermark for product images. */
export async function uploadSiteWatermark(formData: FormData): Promise<UploadWatermarkResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > WM_MAX) {
      return { ok: false, error: "Watermark must be 4MB or smaller." };
    }
    if (!WM_TYPES.has(file.type)) {
      return { ok: false, error: "Use PNG, WebP, JPEG, or GIF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeWatermarkBuffer(buf, file.type, settings);
    const name = `watermark-${randomUUID()}.${norm.ext}`;
    const key = `uploads/site/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        watermarkImageUrl: url,
        ...STORE_BOOTSTRAP,
      },
      update: { watermarkImageUrl: url },
    });

    revalidatePath("/", "layout");
    revalidatePath("/settings/global", "page");
    return { ok: true, url };
  } catch (e) {
    console.error("uploadSiteWatermark", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

const LOGO_MAX = 4 * 1024 * 1024;
const LOGO_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/gif", "image/avif"]);

export type UploadCompanyLogoResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadCompanyLogo(formData: FormData): Promise<UploadCompanyLogoResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > LOGO_MAX) {
      return { ok: false, error: "Logo must be 4MB or smaller." };
    }
    if (!LOGO_TYPES.has(file.type)) {
      return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeCompanyLogoBuffer(buf, file.type, settings);
    const name = `logo-${randomUUID()}.${norm.ext}`;
    const key = `uploads/site/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        ...STORE_BOOTSTRAP,
      },
      update: {},
    });
    await prisma.$executeRaw`UPDATE "site_config" SET "companyLogoUrl" = ${url} WHERE "id" = 1`;

    const brandingRow = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { siteBrandingSource: true },
    });
    if (parseSiteBrandingSource(brandingRow?.siteBrandingSource) === "companyLogo") {
      await regenerateSiteBrandingFromCompanyLogoInternal();
    }

    revalidatePath("/", "layout");
    revalidatePath("/settings/global", "page");
    return { ok: true, url };
  } catch (e) {
    console.error("uploadCompanyLogo", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export type UploadSiteBrandingResult =
  | { ok: true; assets: SiteBrandingAssets }
  | { ok: false; error: string };

export async function uploadSiteBrandingImage(formData: FormData): Promise<UploadSiteBrandingResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > LOGO_MAX) {
      return { ok: false, error: "Image must be 4MB or smaller." };
    }
    if (!LOGO_TYPES.has(file.type)) {
      return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { siteBrandingAssets: true },
    });
    const prev = parseSiteBrandingAssets(row?.siteBrandingAssets);
    await deleteSiteBrandingAssetUrls(prev);
    const assets = await generateAndUploadSiteBrandingAssets(buf);
    await persistSiteBrandingAssets("custom", assets);
    revalidatePath("/", "layout");
    revalidatePath("/settings/global", "page");
    return { ok: true, assets };
  } catch (e) {
    console.error("uploadSiteBrandingImage", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function regenerateSiteBrandingFromCompanyLogo(): Promise<BrandingActionResult> {
  try {
    await requireAdmin();
    const r = await regenerateSiteBrandingFromCompanyLogoInternal();
    if (r.ok) {
      revalidatePath("/", "layout");
      revalidatePath("/settings/global", "page");
    }
    return r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized." };
  }
}
