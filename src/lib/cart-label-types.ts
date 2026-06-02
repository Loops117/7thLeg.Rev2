import type { LabelEditorDocument } from "@/lib/label-editor/document";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";

export type CartLabelBundleLineEntry = {
  displayName: string;
  quantity: number;
  templateName: string;
  dataRowLabel: string | null;
  doc: LabelEditorDocument;
  template: LabelTemplatePickerOption;
};

export type CartLabelLineView = {
  id: string;
  displayName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  isBundle: boolean;
  bundleEntries?: CartLabelBundleLineEntry[];
  legacyPreviewEntry?: CartLabelBundleLineEntry;
  dataRowLabel?: string | null;
  widthMm?: number;
  heightMm?: number;
  sheetsCount?: number;
  labelsPerSheet?: number;
  templateName?: string;
};
