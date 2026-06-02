import type { LabelEditorDocument } from "@/lib/label-editor/document";
import { parseLabelEditorDocument } from "@/lib/label-editor/document";

const KEY_PREFIX = "lemons-label-draft";

function storageKey(templateId: string): string {
  return `${KEY_PREFIX}:${templateId}`;
}

export type LabelEditorDraftMeta = {
  templateId: string;
  doc: LabelEditorDocument;
  savedAt: string;
  designName: string;
};

function readDraftPayload(templateId: string): {
  doc: LabelEditorDocument;
  savedAt: string;
  designName: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(templateId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      doc?: unknown;
      templateId?: string;
      savedAt?: string;
      designName?: string;
    };
    if (!parsed?.doc || parsed.templateId !== templateId) return null;
    return {
      doc: parseLabelEditorDocument(parsed.doc, templateId),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      designName: typeof parsed.designName === "string" ? parsed.designName.trim() : "Draft",
    };
  } catch {
    return null;
  }
}

export function readLabelEditorDraft(templateId: string): LabelEditorDocument | null {
  return readDraftPayload(templateId)?.doc ?? null;
}

export function readLabelEditorDraftMeta(templateId: string): LabelEditorDraftMeta | null {
  const payload = readDraftPayload(templateId);
  if (!payload) return null;
  return {
    templateId,
    doc: payload.doc,
    savedAt: payload.savedAt,
    designName: payload.designName || "Draft",
  };
}

export function writeLabelEditorDraft(
  templateId: string,
  doc: LabelEditorDocument,
  designName?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(templateId),
      JSON.stringify({
        templateId,
        doc,
        savedAt: new Date().toISOString(),
        designName: designName?.trim().slice(0, 120) || "Draft",
      }),
    );
  } catch {
    /* quota */
  }
}

export function clearLabelEditorDraft(templateId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(templateId));
  } catch {
    /* ignore */
  }
}
