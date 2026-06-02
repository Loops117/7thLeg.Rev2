import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import {
  resolveTextContent,
  type LabelEditorDocument,
  type LabelTextElement,
} from "@/lib/label-editor/document";
import { isTextElement } from "@/lib/label-editor/reducer";

export function findBagNameSourceTextElement(
  doc: LabelEditorDocument,
): LabelTextElement | null {
  const id = doc.bagNameSourceElementId;
  if (!id) return null;
  const el = doc.elements.find((e) => e.id === id);
  return el && isTextElement(el) ? el : null;
}

export function bagItemRowLabel(item: LabelBagItem): string | null {
  if (item.dataRowLabel?.trim()) return item.dataRowLabel.trim();
  const sheet = item.document.dataSheet;
  if (sheet && sheet.rows.length > 0) {
    return `Row ${item.document.dataRowIndex + 1}`;
  }
  return null;
}

/** Builds bag/cart line title from saved name, optional row, and name-source text field. */
export function formatBagLabelDisplayName(input: {
  savedDesignName: string | null | undefined;
  templateName: string;
  rowLabel: string | null;
  nameFieldText: string;
}): string {
  const saved = input.savedDesignName?.trim() || input.templateName;
  const text = input.nameFieldText.trim() || "(empty)";
  if (input.rowLabel) return `${saved} - ${input.rowLabel} - ${text}`;
  return `${saved} - ${text}`;
}

export function bagItemDisplayName(item: LabelBagItem): string {
  const source = findBagNameSourceTextElement(item.document);
  if (source) {
    return formatBagLabelDisplayName({
      savedDesignName: item.savedDesignName,
      templateName: item.templateName,
      rowLabel: bagItemRowLabel(item),
      nameFieldText: resolveTextContent(source, item.document),
    });
  }
  const base = item.savedDesignName?.trim() || item.templateName;
  if (item.dataRowLabel) return `${base} · ${item.dataRowLabel}`;
  return base;
}

export function previewBagLabelDisplayName(input: {
  designName: string;
  templateName: string;
  doc: LabelEditorDocument;
  sourceElementId: string;
}): string {
  const el = input.doc.elements.find((e) => e.id === input.sourceElementId);
  if (!el || !isTextElement(el)) return "";
  const rowLabel =
    input.doc.dataSheet && input.doc.dataSheet.rows.length > 0
      ? `Row ${input.doc.dataRowIndex + 1}`
      : null;
  return formatBagLabelDisplayName({
    savedDesignName: input.designName.trim() || null,
    templateName: input.templateName,
    rowLabel,
    nameFieldText: resolveTextContent(el, input.doc),
  });
}
