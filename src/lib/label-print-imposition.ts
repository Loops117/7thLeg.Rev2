import type { LabelFulfillmentSheetFormat } from "@/lib/site-config-types";

const SHEET_MM: Record<LabelFulfillmentSheetFormat, { widthMm: number; heightMm: number; label: string }> = {
  letter: { widthMm: 215.9, heightMm: 279.4, label: "US Letter (8.5×11 in)" },
  a4: { widthMm: 210, heightMm: 297, label: "A4" },
};

export type LabelImpositionInput = {
  labelWidthMm: number;
  labelHeightMm: number;
  sheetFormat: LabelFulfillmentSheetFormat;
  sheetMarginMm: number;
  labelGapMm: number;
};

export type LabelImpositionResult = {
  sheetLabel: string;
  sheetWidthMm: number;
  sheetHeightMm: number;
  usableWidthMm: number;
  usableHeightMm: number;
  columns: number;
  rows: number;
  labelsPerSheet: number;
  /** True when label is larger than printable area on at least one axis. */
  doesNotFit: boolean;
};

function fitCount(usableMm: number, labelMm: number, gapMm: number): number {
  if (labelMm <= 0 || usableMm <= 0) return 0;
  if (labelMm > usableMm) return 0;
  return Math.max(0, Math.floor((usableMm + gapMm) / (labelMm + gapMm)));
}

export function computeLabelImposition(input: LabelImpositionInput): LabelImpositionResult {
  const sheet = SHEET_MM[input.sheetFormat];
  const margin = Math.max(0, input.sheetMarginMm);
  const gap = Math.max(0, input.labelGapMm);
  const labelW = Math.max(0.1, input.labelWidthMm);
  const labelH = Math.max(0.1, input.labelHeightMm);

  const usableWidthMm = Math.max(0, sheet.widthMm - margin * 2);
  const usableHeightMm = Math.max(0, sheet.heightMm - margin * 2);

  const columns = fitCount(usableWidthMm, labelW, gap);
  const rows = fitCount(usableHeightMm, labelH, gap);

  return {
    sheetLabel: sheet.label,
    sheetWidthMm: sheet.widthMm,
    sheetHeightMm: sheet.heightMm,
    usableWidthMm,
    usableHeightMm,
    columns,
    rows,
    labelsPerSheet: columns * rows,
    doesNotFit: columns === 0 || rows === 0,
  };
}

export function labelFulfillmentSheetFormatLabel(format: LabelFulfillmentSheetFormat): string {
  return SHEET_MM[format].label;
}
