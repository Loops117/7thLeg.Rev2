import type { LabelEditorTemplateMeta } from "@/lib/label-editor/document";
import { parseLabelBorderConfig } from "@/lib/label-template-border";
import { parsePriceTiersJson, type LabelPriceTier } from "@/lib/label-template-tiers";

export type LabelTemplateDbRow = {
  id: string;
  name: string;
  canvasWidthPx: number;
  canvasHeightPx: number;
  marginPx: number;
  gridStepPx: number;
  maxElements: number;
  baseLayoutImageUrl: string;
  baseLayoutScalePercent: number;
  baseLayoutRotationDeg: number;
  baseLayoutOpacityPercent: number;
  baseLayoutOffsetXPx: number;
  baseLayoutOffsetYPx: number;
  sortOrder: number;
  widthMm: number;
  heightMm: number;
  description: string;
  priceTiersJson: unknown;
  borderConfigJson: unknown;
};

export function labelTemplateRowToMeta(row: LabelTemplateDbRow): LabelEditorTemplateMeta {
  return {
    id: row.id,
    name: row.name,
    canvasWidthPx: row.canvasWidthPx,
    canvasHeightPx: row.canvasHeightPx,
    marginPx: row.marginPx,
    gridStepPx: row.gridStepPx,
    maxElements: row.maxElements,
    baseLayoutImageUrl: row.baseLayoutImageUrl,
    baseLayoutScalePercent: row.baseLayoutScalePercent,
    baseLayoutRotationDeg: row.baseLayoutRotationDeg,
    baseLayoutOpacityPercent: row.baseLayoutOpacityPercent,
    baseLayoutOffsetXPx: row.baseLayoutOffsetXPx,
    baseLayoutOffsetYPx: row.baseLayoutOffsetYPx,
    borderConfig: parseLabelBorderConfig(row.borderConfigJson),
  };
}

export type LabelTemplatePickerOption = LabelEditorTemplateMeta & {
  sortOrder: number;
  widthMm: number;
  heightMm: number;
  description: string;
  priceTiers: LabelPriceTier[];
};

export function labelTemplateRowToPickerOption(row: LabelTemplateDbRow): LabelTemplatePickerOption {
  return {
    ...labelTemplateRowToMeta(row),
    sortOrder: row.sortOrder,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    description: row.description?.trim() ?? "",
    priceTiers: parsePriceTiersJson(row.priceTiersJson),
  };
}
