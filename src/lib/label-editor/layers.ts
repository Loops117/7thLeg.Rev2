import type { LabelCanvasElement, LabelEditorDocument } from "@/lib/label-editor/document";

export function defaultLayerName(el: LabelCanvasElement): string {
  const custom = el.layerName?.trim();
  if (custom) return custom;
  switch (el.kind) {
    case "text":
      return el.dataColumnIndex !== null ? "Data text" : "Text";
    case "sticker":
      return el.shape === "image" ? "Image sticker" : `${el.shape} sticker`;
    case "image":
      return "Image";
    case "table":
      return "Table";
    default:
      return "Layer";
  }
}

/** Front-to-back order for the layers panel (top of list = drawn on top). */
export function layersFrontToBack(doc: LabelEditorDocument): LabelCanvasElement[] {
  return [...doc.elements].reverse();
}

export function reorderElementInDoc(
  doc: LabelEditorDocument,
  id: string,
  direction: "forward" | "backward",
): LabelEditorDocument {
  const elements = [...doc.elements];
  const index = elements.findIndex((e) => e.id === id);
  if (index < 0) return doc;
  const swapWith = direction === "forward" ? index + 1 : index - 1;
  if (swapWith < 0 || swapWith >= elements.length) return doc;
  [elements[index], elements[swapWith]] = [elements[swapWith], elements[index]];
  return { ...doc, elements };
}

export function moveElementToIndex(
  doc: LabelEditorDocument,
  id: string,
  toIndex: number,
): LabelEditorDocument {
  const elements = [...doc.elements];
  const from = elements.findIndex((e) => e.id === id);
  if (from < 0) return doc;
  const clamped = Math.max(0, Math.min(elements.length - 1, toIndex));
  if (from === clamped) return doc;
  const [item] = elements.splice(from, 1);
  elements.splice(clamped, 0, item);
  return { ...doc, elements };
}

export function isElementLocked(el: LabelCanvasElement | null | undefined): boolean {
  return el?.locked === true;
}
