import { parseCartLabelBundlePayload } from "@/lib/label-cart-bundle";
import type { CartLabelBundleLineEntry } from "@/lib/cart-label-types";
import { cartLabelEntryDescription } from "@/lib/label-cart-display";
import { LABEL_EDITOR_DOC_VERSION, parseLabelEditorDocument } from "@/lib/label-editor/document";
import { labelTemplateRowToPickerOption, type LabelTemplateDbRow } from "@/lib/label-editor/template-meta";

export type OrderLabelLineRecord = {
  id: string;
  displayName: string;
  quantity: number;
  unitCents: number;
  lineTotalCents: number;
  documentJson: unknown;
  templateId: string;
  dataRowLabel: string | null;
  widthMm: number;
  heightMm: number;
  labelsPerSheet: number;
  sheetsCount: number;
  sheetFormat: string;
  template: LabelTemplateDbRow;
};

export type OrderLabelPreviewEntry = CartLabelBundleLineEntry & {
  /** Index within the parent order label line (for print export URLs). */
  entryIndex: number;
};

export function orderLabelPreviewEntriesForLine(line: OrderLabelLineRecord): OrderLabelPreviewEntry[] | null {
  const bundle = parseCartLabelBundlePayload(line.documentJson);
  if (bundle) {
    return bundle.entries.map((e, entryIndex) => ({
      entryIndex,
      displayName: e.displayName,
      quantity: e.quantity,
      templateName: e.templateName,
      dataRowLabel: e.dataRowLabel,
      doc: e.document,
      template: {
        ...e.templateMeta,
        sortOrder: 0,
        widthMm: e.widthMm,
        heightMm: e.heightMm,
        description: "",
        priceTiers: [],
      },
    }));
  }

  const legacyDoc = parseLabelEditorDocument(line.documentJson, line.templateId);
  if (legacyDoc.version !== LABEL_EDITOR_DOC_VERSION) return null;

  return [
    {
      entryIndex: 0,
      displayName: line.displayName,
      quantity: line.quantity,
      templateName: line.template.name,
      dataRowLabel: line.dataRowLabel,
      doc: legacyDoc,
      template: labelTemplateRowToPickerOption(line.template),
    },
  ];
}

export function orderLabelLineSummary(line: OrderLabelLineRecord): {
  id: string;
  displayName: string;
  quantity: number;
  lineTotalCents: number;
  entrySummaries: Array<{ displayName: string; quantity: number; templateName: string }>;
} {
  const entries = orderLabelPreviewEntriesForLine(line);
  return {
    id: line.id,
    displayName: cartLabelEntryDescription(line.displayName),
    quantity: line.quantity,
    lineTotalCents: line.lineTotalCents,
    entrySummaries:
      entries?.map((e) => ({
        displayName: cartLabelEntryDescription(e.displayName),
        quantity: e.quantity,
        templateName: e.templateName,
      })) ?? [],
  };
}
