import type { LabelEditorDocument } from "@/lib/label-editor/document";

const MAX_HISTORY = 50;

export type EditorHistory = {
  past: LabelEditorDocument[];
  future: LabelEditorDocument[];
};

export function createHistory(): EditorHistory {
  return { past: [], future: [] };
}

export function cloneDoc(doc: LabelEditorDocument): LabelEditorDocument {
  return JSON.parse(JSON.stringify(doc)) as LabelEditorDocument;
}

export function pushHistory(history: EditorHistory, doc: LabelEditorDocument): EditorHistory {
  const snap = cloneDoc(doc);
  const past = [...history.past, snap];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, future: [] };
}

export function canUndo(history: EditorHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: EditorHistory): boolean {
  return history.future.length > 0;
}

export function undoHistory(
  history: EditorHistory,
  currentDoc: LabelEditorDocument,
): { history: EditorHistory; doc: LabelEditorDocument } | null {
  if (history.past.length === 0) return null;
  const past = [...history.past];
  const previous = past.pop()!;
  const future = [cloneDoc(currentDoc), ...history.future];
  if (future.length > MAX_HISTORY) future.pop();
  return { history: { past, future }, doc: previous };
}

export function redoHistory(
  history: EditorHistory,
  currentDoc: LabelEditorDocument,
): { history: EditorHistory; doc: LabelEditorDocument } | null {
  if (history.future.length === 0) return null;
  const future = [...history.future];
  const next = future.shift()!;
  const past = [...history.past, cloneDoc(currentDoc)];
  if (past.length > MAX_HISTORY) past.shift();
  return { history: { past, future }, doc: next };
}
