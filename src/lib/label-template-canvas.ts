import type { LabelBorderConfig } from "@/lib/label-template-border";

export type LabelTemplatePreviewLayout = {
  canvasWidthPx: number;
  canvasHeightPx: number;
  marginPx: number;
  border: LabelBorderConfig;
};

export const LABEL_TEMPLATE_DESIGN_DPI = 300;

/** Print-accurate design canvas in pixels at fixed DPI (used for editor + export). */
export function labelCanvasPxFromMm(widthMm: number, heightMm: number): { widthPx: number; heightPx: number } {
  const wm = Math.max(1, Math.round(widthMm));
  const hm = Math.max(1, Math.round(heightMm));
  const widthPx = Math.max(1, Math.round((wm / 25.4) * LABEL_TEMPLATE_DESIGN_DPI));
  const heightPx = Math.max(1, Math.round((hm / 25.4) * LABEL_TEMPLATE_DESIGN_DPI));
  return { widthPx, heightPx };
}

/** Inner editable region (customer content) — inset from full label by non-editable margin. */
export function editableRegionPx(
  canvasWidthPx: number,
  canvasHeightPx: number,
  marginPx: number,
): { widthPx: number; heightPx: number; inset: number } {
  const m = Math.max(0, Math.round(marginPx));
  const cw = Math.max(1, canvasWidthPx);
  const ch = Math.max(1, canvasHeightPx);
  const inset = Math.min(m, Math.floor(Math.min(cw, ch) / 2) - 1);
  const safeInset = Math.max(0, inset);
  const w = Math.max(1, cw - 2 * safeInset);
  const h = Math.max(1, ch - 2 * safeInset);
  return { widthPx: w, heightPx: h, inset: safeInset };
}

/** Snap grid derived from canvas size and margin (no manual pixel canvas). */
export function autoGridStepPx(canvasWidthPx: number, canvasHeightPx: number, marginPx: number): number {
  const { widthPx: ew, heightPx: eh } = editableRegionPx(canvasWidthPx, canvasHeightPx, marginPx);
  const base = Math.min(ew, eh);
  const step = Math.round(base / 72);
  return Math.max(4, Math.min(48, Math.max(step, Math.ceil(marginPx / 2) || 4)));
}

/** @deprecated Prefer labelCanvasPxFromMm */
export function derivedEditorCanvasHeightPx(canvasWidthPx: number, widthMm: number, heightMm: number): number {
  void canvasWidthPx;
  return labelCanvasPxFromMm(widthMm, heightMm).heightPx;
}
