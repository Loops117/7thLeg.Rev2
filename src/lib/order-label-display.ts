import { parseCartLabelBundlePayload } from "@/lib/label-cart-bundle";
import { cartLabelEntryDescription } from "@/lib/label-cart-display";
import {
  orderLabelPreviewEntriesForLine,
  type OrderLabelLineRecord,
} from "@/lib/order-label-entries";

export type OrderCustomLabelBundleEntryLine = {
  displayName: string;
  quantity: number;
  templateName: string;
  dataRowLabel: string | null;
};

export type OrderCustomLabelLineDisplay = {
  id: string;
  displayName: string;
  quantity: number;
  lineTotalCents: number;
  isBundle: boolean;
  bundleEntryLines: OrderCustomLabelBundleEntryLine[];
  templateName: string | null;
  widthMm: number | null;
  heightMm: number | null;
  sheetSummary: string | null;
};

export function orderLabelsSubtotalCents(lines: OrderLabelLineRecord[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
}

export function orderLabelLineToDisplay(line: OrderLabelLineRecord): OrderCustomLabelLineDisplay {
  const entries = orderLabelPreviewEntriesForLine(line);
  const isBundle = !!parseCartLabelBundlePayload(line.documentJson);

  const bundleEntryLines: OrderCustomLabelBundleEntryLine[] =
    entries?.map((e) => ({
      displayName: cartLabelEntryDescription(e.displayName),
      quantity: e.quantity,
      templateName: e.templateName,
      dataRowLabel: e.dataRowLabel,
    })) ?? [];

  const sheetSummary =
    line.labelsPerSheet > 0
      ? `${line.sheetFormat} · ${line.labelsPerSheet} per sheet · ${line.sheetsCount} sheet${line.sheetsCount === 1 ? "" : "s"} · ${line.widthMm}×${line.heightMm} mm`
      : null;

  return {
    id: line.id,
    displayName: cartLabelEntryDescription(line.displayName),
    quantity: line.quantity,
    lineTotalCents: line.lineTotalCents,
    isBundle,
    bundleEntryLines,
    templateName: isBundle ? null : (entries?.[0]?.templateName ?? line.template.name),
    widthMm: isBundle ? null : line.widthMm,
    heightMm: isBundle ? null : line.heightMm,
    sheetSummary: isBundle ? null : sheetSummary,
  };
}
