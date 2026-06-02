import type { LabelEditorDocument } from "@/lib/label-editor/document";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { computeLabelImposition, type LabelImpositionResult } from "@/lib/label-print-imposition";
import {
  orderLabelPreviewEntriesForLine,
  type OrderLabelLineRecord,
  type OrderLabelPreviewEntry,
} from "@/lib/order-label-entries";
import type { LabelFulfillmentSheetFormat } from "@/lib/site-config-types";

export type LabelFulfillmentPrintSettings = {
  sheetFormat: LabelFulfillmentSheetFormat;
  sheetMarginMm: number;
  labelGapMm: number;
  printDpi: number;
  printTransparentBackground: boolean;
};

export type LabelPrintInstance = {
  lineId: string;
  entryIndex: number;
  displayName: string;
  doc: LabelEditorDocument;
  template: LabelTemplatePickerOption;
  widthMm: number;
  heightMm: number;
};

export type LabelPrintPlacement = {
  instance: LabelPrintInstance;
  col: number;
  row: number;
};

export type LabelPrintSheetSpec = {
  /** 0-based index across all sheets for this order label line. */
  sheetIndex: number;
  labelWidthMm: number;
  labelHeightMm: number;
  sheetFormat: LabelFulfillmentSheetFormat;
  imposition: LabelImpositionResult;
  placements: LabelPrintPlacement[];
};

function sizeKey(widthMm: number, heightMm: number): string {
  return `${widthMm.toFixed(2)}x${heightMm.toFixed(2)}`;
}

function instancesForEntry(line: OrderLabelLineRecord, entry: OrderLabelPreviewEntry): LabelPrintInstance[] {
  const qty = Math.max(1, Math.floor(entry.quantity || 1));
  const w = entry.template.widthMm;
  const h = entry.template.heightMm;
  return Array.from({ length: qty }, () => ({
    lineId: line.id,
    entryIndex: entry.entryIndex,
    displayName: entry.displayName,
    doc: entry.doc,
    template: entry.template,
    widthMm: w,
    heightMm: h,
  }));
}

/** Pack label copies onto print sheets using admin fulfillment margins and gaps. */
export function buildOrderLabelPrintSheetSpecs(
  line: OrderLabelLineRecord,
  settings: LabelFulfillmentPrintSettings,
): LabelPrintSheetSpec[] {
  const entries = orderLabelPreviewEntriesForLine(line);
  if (!entries?.length) return [];

  const sheetFormat = settings.sheetFormat;

  const bySize = new Map<string, LabelPrintInstance[]>();
  for (const entry of entries) {
    const key = sizeKey(entry.template.widthMm, entry.template.heightMm);
    const list = bySize.get(key) ?? [];
    list.push(...instancesForEntry(line, entry));
    bySize.set(key, list);
  }

  const specs: LabelPrintSheetSpec[] = [];
  let sheetIndex = 0;

  for (const [key, instances] of bySize) {
    const [wStr, hStr] = key.split("x");
    const labelWidthMm = Number.parseFloat(wStr);
    const labelHeightMm = Number.parseFloat(hStr);

    const imposition = computeLabelImposition({
      labelWidthMm,
      labelHeightMm,
      sheetFormat,
      sheetMarginMm: settings.sheetMarginMm,
      labelGapMm: settings.labelGapMm,
    });

    if (imposition.doesNotFit || imposition.labelsPerSheet <= 0) {
      for (const instance of instances) {
        specs.push({
          sheetIndex: sheetIndex++,
          labelWidthMm,
          labelHeightMm,
          sheetFormat,
          imposition,
          placements: [{ instance, col: 0, row: 0 }],
        });
      }
      continue;
    }

    const perSheet = imposition.labelsPerSheet;
    for (let i = 0; i < instances.length; i += perSheet) {
      const chunk = instances.slice(i, i + perSheet);
      const placements: LabelPrintPlacement[] = chunk.map((instance, idx) => ({
        instance,
        col: idx % imposition.columns,
        row: Math.floor(idx / imposition.columns),
      }));
      specs.push({
        sheetIndex: sheetIndex++,
        labelWidthMm,
        labelHeightMm,
        sheetFormat,
        imposition,
        placements,
      });
    }
  }

  return specs;
}

export type OrderPrintSheetFile = {
  filename: string;
  spec: LabelPrintSheetSpec;
  lineDisplayName: string;
};

function slugForFilename(name: string): string {
  return (
    name
      .replace(/[^\w\s.-]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) || "labels"
  );
}

/** All imposition sheets for an order (every label line), with unique filenames for zip export. */
export function buildOrderPrintSheetFiles(
  lines: OrderLabelLineRecord[],
  settings: LabelFulfillmentPrintSettings,
): OrderPrintSheetFile[] {
  const files: OrderPrintSheetFile[] = [];
  let global = 0;
  for (const line of lines) {
    const specs = buildOrderLabelPrintSheetSpecs(line, settings);
    const lineSlug = slugForFilename(line.displayName);
    for (let i = 0; i < specs.length; i++) {
      global++;
      const spec = specs[i]!;
      files.push({
        filename: `sheet-${String(global).padStart(2, "0")}-${lineSlug}-${spec.labelWidthMm}x${spec.labelHeightMm}mm.png`,
        spec,
        lineDisplayName: line.displayName,
      });
    }
  }
  return files;
}

export function countOrderPrintSheets(
  lines: OrderLabelLineRecord[],
  settings: LabelFulfillmentPrintSettings,
): number {
  return buildOrderPrintSheetFiles(lines, settings).length;
}

export function orderLabelSheetFilename(
  lineDisplayName: string,
  sheetIndex: number,
  totalSheets: number,
  labelWidthMm: number,
  labelHeightMm: number,
): string {
  const base =
    lineDisplayName
      .replace(/[^\w\s.-]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 48) || "labels";
  return `${base}-sheet-${sheetIndex + 1}-of-${totalSheets}-${labelWidthMm}x${labelHeightMm}mm.png`;
}
