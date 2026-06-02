import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  labelPreviewAdminDefaults,
  parseLabelPreviewWatermarkKind,
  parseWatermarkPlacement,
  type LabelPreviewWatermarkKind,
  type WatermarkPlacement,
} from "@/lib/site-config-types";
import { resolveLabelPreviewWatermarkImageUrl } from "@/lib/label-preview-watermark";

export type LabelBuilderPublicConfig = {
  labelCartShowSubtotalPreview: boolean;
  labelCartMinQuantity: number;
  preview: {
    watermarkKind: LabelPreviewWatermarkKind;
    watermarkImageUrl: string | null;
    watermarkPlacement: WatermarkPlacement;
    watermarkOpacityPercent: number;
    watermarkScalePercent: number;
    watermarkText: string;
    matchDiagonalBrand: boolean;
    protectPreviewInteraction: boolean;
    companyName: string;
    globalWatermarkImageUrl: string;
    productDiagonalBrandOverlay: boolean;
    productDiagonalNameGapPx: number;
    globalWatermarkOpacityPercent: number;
  };
};

export const getLabelBuilderPublicConfig = cache(async function getLabelBuilderPublicConfig(): Promise<LabelBuilderPublicConfig> {
  const defaults: LabelBuilderPublicConfig = {
    labelCartShowSubtotalPreview: true,
    labelCartMinQuantity: 1,
    preview: {
      watermarkKind: "global",
      watermarkImageUrl: null,
      watermarkPlacement: "bottomRight",
      watermarkOpacityPercent: 38,
      watermarkScalePercent: 100,
      watermarkText: labelPreviewAdminDefaults.watermarkText,
      matchDiagonalBrand: true,
      protectPreviewInteraction: true,
      companyName: "Shop",
      globalWatermarkImageUrl: "",
      productDiagonalBrandOverlay: false,
      productDiagonalNameGapPx: 8,
      globalWatermarkOpacityPercent: 38,
    },
  };

  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return defaults;

    let watermarkKind = parseLabelPreviewWatermarkKind(row.labelPreviewWatermarkKind);
    if (watermarkKind === "global" && row.labelPreviewMatchProductWatermark === false) {
      watermarkKind = "off";
    }

    const globalUrl = typeof row.watermarkImageUrl === "string" ? row.watermarkImageUrl.trim() : "";
    const customUrl =
      typeof row.labelPreviewWatermarkImageUrl === "string" ? row.labelPreviewWatermarkImageUrl.trim() : "";

    return {
      labelCartShowSubtotalPreview: row.labelCartShowSubtotalPreview ?? true,
      labelCartMinQuantity: Math.min(9999, Math.max(1, row.labelCartMinQuantity ?? 1)),
      preview: {
        watermarkKind,
        watermarkImageUrl: resolveLabelPreviewWatermarkImageUrl(watermarkKind, globalUrl, customUrl),
        watermarkPlacement: parseWatermarkPlacement(
          row.labelPreviewWatermarkPlacement ?? row.watermarkPlacement,
        ),
        watermarkOpacityPercent: Math.min(
          100,
          Math.max(0, row.labelPreviewWatermarkOpacityPercent ?? row.watermarkOpacityPercent ?? 38),
        ),
        watermarkScalePercent: Math.min(300, Math.max(25, row.labelPreviewWatermarkScalePercent ?? 100)),
        watermarkText:
          (typeof row.labelPreviewWatermarkText === "string" && row.labelPreviewWatermarkText.trim()) ||
          labelPreviewAdminDefaults.watermarkText,
        matchDiagonalBrand: row.labelPreviewMatchDiagonalBrand ?? true,
        protectPreviewInteraction: row.labelPreviewProtectInteraction ?? true,
        companyName: row.companyName?.trim() || "Shop",
        globalWatermarkImageUrl: globalUrl,
        productDiagonalBrandOverlay: !!row.productDiagonalBrandOverlay,
        productDiagonalNameGapPx: Math.min(64, Math.max(0, row.productDiagonalNameGapPx ?? 8)),
        globalWatermarkOpacityPercent: Math.min(100, Math.max(0, row.watermarkOpacityPercent ?? 38)),
      },
    };
  } catch {
    return defaults;
  }
});
