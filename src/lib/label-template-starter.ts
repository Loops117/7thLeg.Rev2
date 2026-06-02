import {
  createEmptyDocument,
  parseLabelEditorDocument,
  type LabelEditorDocument,
} from "@/lib/label-editor/document";
import { cloneDocument } from "@/lib/label-editor/label-bag";

/** Load admin premade layout for a template, or empty doc. */
export function parseLabelTemplateStarterDocument(
  raw: unknown,
  templateId: string,
): LabelEditorDocument | null {
  if (raw == null) return null;
  try {
    const doc = parseLabelEditorDocument(raw, templateId);
    if (doc.elements.length === 0 && doc.strokes.length === 0 && !doc.dataSheet) {
      return null;
    }
    return doc;
  } catch {
    return null;
  }
}

/** Fresh copy for customer editor (avoids shared element ids across sessions). */
export function customerStarterDocumentFromTemplate(
  raw: unknown,
  templateId: string,
): LabelEditorDocument {
  const parsed = parseLabelTemplateStarterDocument(raw, templateId);
  if (!parsed) return createEmptyDocument(templateId);
  const cloned = cloneDocument(parsed);
  cloned.templateId = templateId;
  return cloned;
}

export function templateHasStarterLayout(raw: unknown, templateId: string): boolean {
  return parseLabelTemplateStarterDocument(raw, templateId) !== null;
}
