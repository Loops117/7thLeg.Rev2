import { normalizeFontSizePercent } from "@/lib/label-editor/typography";
import {
  getTableColWidthsPx,
  getTableRowHeightsPx,
  scaleTableLayoutToSize,
} from "@/lib/label-editor/table-layout";
import type { LabelBorderConfig } from "@/lib/label-template-border";

/** Label editor persisted document (v1). */

export const LABEL_EDITOR_DOC_VERSION = 1 as const;

export type LabelPaletteTool =
  | "template"
  | "draw"
  | "text"
  | "data"
  | "stickers"
  | "layers"
  | "upload"
  | "saved"
  | "finish"
  | "bag";

/** Optional on all canvas elements (editor-only metadata). */
export type LabelElementLayerMeta = {
  locked?: boolean;
  layerName?: string;
};

export type BrushStyle = "solid" | "dashed" | "dotted";

export type StickerShape = "rect" | "circle" | "triangle" | "star" | "image";

export type LabelTextAlign = "left" | "center" | "right";

export type LabelVerticalAlign = "top" | "middle" | "bottom";

export type LabelTableCellStyle = {
  fontFamily: string;
  /** 0–100 (% of cell height). Legacy docs may store px (>100). */
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: LabelTextAlign;
  verticalAlign: LabelVerticalAlign;
  /** Break long words across lines (default true). */
  wordWrap?: boolean;
  /** Shrink type to fit inside the cell (default false). */
  textFit?: boolean;
};

export type DrawStroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  style: BrushStyle;
  /** Eraser strokes use destination-out when rendered. */
  erase?: boolean;
};

export type DrawMode = "brush" | "eraser";

export type LabelTextElement = LabelElementLayerMeta & {
  id: string;
  kind: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: LabelTextAlign;
  verticalAlign: LabelVerticalAlign;
  /** When set, text is filled from data sheet column per row. */
  dataColumnIndex: number | null;
};

export type LabelStickerElement = LabelElementLayerMeta & {
  id: string;
  kind: "sticker";
  shape: StickerShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
  /** Set when shape is "image". */
  imageUrl?: string;
};

export type LabelStickerAssetOption = {
  id: string;
  name: string;
  imageUrl: string;
};

export type LabelImageElement = LabelElementLayerMeta & {
  id: string;
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  src: string;
};

export type LabelTableElement = LabelElementLayerMeta & {
  id: string;
  kind: "table";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rows: number;
  cols: number;
  showBorder: boolean;
  borderWidth: number;
  borderColor: string;
  /** Row-major cell text (length = rows × cols). */
  cells: string[];
  /** Per-cell data column mapping (length = rows × cols). */
  cellDataColumnIndexes: (number | null)[];
  /** Per-cell typography (length = rows × cols). */
  cellStyles: LabelTableCellStyle[];
  /** Column widths in px (length = cols); defaults to equal splits. */
  colWidthsPx?: number[];
  /** Row heights in px (length = rows); defaults to equal splits. */
  rowHeightsPx?: number[];
};

export type LabelCanvasElement =
  | LabelTextElement
  | LabelStickerElement
  | LabelImageElement
  | LabelTableElement;

export type LabelDataSheet = {
  headers: string[];
  rows: string[][];
};

export type LabelEditorDocument = {
  version: typeof LABEL_EDITOR_DOC_VERSION;
  templateId: string;
  strokes: DrawStroke[];
  elements: LabelCanvasElement[];
  dataSheet: LabelDataSheet | null;
  dataRowIndex: number;
  /** Text element id used for bag/cart line titles: "{save name} - Row # - {field text}". */
  bagNameSourceElementId?: string | null;
};

export type LabelEditorTemplateMeta = {
  id: string;
  name: string;
  canvasWidthPx: number;
  canvasHeightPx: number;
  marginPx: number;
  gridStepPx: number;
  maxElements: number;
  baseLayoutImageUrl: string;
  baseLayoutScalePercent: number;
  baseLayoutRotationDeg: number;
  baseLayoutOpacityPercent: number;
  baseLayoutOffsetXPx: number;
  baseLayoutOffsetYPx: number;
  borderConfig: LabelBorderConfig;
};

export type CustomerLabelUploadItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

export const LABEL_FONT_FAMILIES = [
  "Arial, Helvetica, sans-serif",
  "Georgia, serif",
  "Times New Roman, Times, serif",
  "Courier New, Courier, monospace",
  "Verdana, Geneva, sans-serif",
  "Trebuchet MS, sans-serif",
] as const;

export const DEFAULT_TABLE_CELL_STYLE: LabelTableCellStyle = {
  fontFamily: LABEL_FONT_FAMILIES[0],
  fontSize: 40,
  color: "#1a1a1a",
  bold: false,
  italic: false,
  underline: false,
  align: "center",
  verticalAlign: "middle",
  wordWrap: true,
  textFit: false,
};

export function defaultTableCellStyle(overrides?: Partial<LabelTableCellStyle>): LabelTableCellStyle {
  return { ...DEFAULT_TABLE_CELL_STYLE, ...overrides };
}

export const LABEL_FONT_FAMILY_LABELS: Record<(typeof LABEL_FONT_FAMILIES)[number], string> = {
  "Arial, Helvetica, sans-serif": "Arial",
  "Georgia, serif": "Georgia",
  "Times New Roman, Times, serif": "Times",
  "Courier New, Courier, monospace": "Courier",
  "Verdana, Geneva, sans-serif": "Verdana",
  "Trebuchet MS, sans-serif": "Trebuchet",
};

export function newElementId(): string {
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyDocument(templateId: string): LabelEditorDocument {
  return {
    version: LABEL_EDITOR_DOC_VERSION,
    templateId,
    strokes: [],
    elements: [],
    dataSheet: null,
    dataRowIndex: 0,
    bagNameSourceElementId: null,
  };
}

export function countDocumentElements(doc: LabelEditorDocument): number {
  const drawSlot = doc.strokes.length > 0 ? 1 : 0;
  return doc.elements.length + drawSlot;
}

export function parseLabelEditorDocument(raw: unknown, templateId: string): LabelEditorDocument {
  if (!raw || typeof raw !== "object") return createEmptyDocument(templateId);
  const o = raw as Record<string, unknown>;
  if (o.version !== LABEL_EDITOR_DOC_VERSION) return createEmptyDocument(templateId);

  const strokes = Array.isArray(o.strokes) ? (o.strokes as DrawStroke[]) : [];
  const rawElements = Array.isArray(o.elements) ? (o.elements as LabelCanvasElement[]) : [];
  const elements = rawElements.map((el) => {
    if (el.kind === "table") return normalizeTableElement(el);
    if (el.kind === "text") return normalizeTextElement(el);
    return el;
  });
  let dataSheet: LabelDataSheet | null = null;
  if (o.dataSheet && typeof o.dataSheet === "object") {
    const ds = o.dataSheet as LabelDataSheet;
    if (Array.isArray(ds.headers) && Array.isArray(ds.rows)) {
      dataSheet = {
        headers: ds.headers.map(String),
        rows: ds.rows.map((r) => (Array.isArray(r) ? r.map(String) : [])),
      };
    }
  }
  const dataRowIndex = Math.max(0, Math.floor(Number(o.dataRowIndex) || 0));
  const bagNameSourceElementId =
    typeof o.bagNameSourceElementId === "string" && o.bagNameSourceElementId.trim()
      ? o.bagNameSourceElementId.trim()
      : null;

  return {
    version: LABEL_EDITOR_DOC_VERSION,
    templateId: typeof o.templateId === "string" ? o.templateId : templateId,
    strokes,
    elements,
    dataSheet,
    dataRowIndex,
    bagNameSourceElementId,
  };
}

export function resolveTextContent(el: LabelTextElement, doc: LabelEditorDocument): string {
  if (el.dataColumnIndex === null || !doc.dataSheet) return el.text;
  const row = doc.dataSheet.rows[doc.dataRowIndex];
  if (!row) return el.text;
  const v = row[el.dataColumnIndex];
  return v !== undefined && v !== "" ? v : el.text;
}

function legacyTableStyle(el: LabelTableElement): Partial<LabelTableCellStyle> {
  const legacy = el as LabelTableElement & { fontSize?: number; color?: string };
  const patch: Partial<LabelTableCellStyle> = {};
  if (typeof legacy.fontSize === "number") patch.fontSize = legacy.fontSize;
  if (typeof legacy.color === "string") patch.color = legacy.color;
  return patch;
}

function parseVerticalAlign(v: unknown, fallback: LabelVerticalAlign): LabelVerticalAlign {
  return v === "top" || v === "middle" || v === "bottom" ? v : fallback;
}

export function flexJustifyFromTextAlign(align: LabelTextAlign): string {
  switch (align) {
    case "center":
      return "center";
    case "right":
      return "flex-end";
    default:
      return "flex-start";
  }
}

export function flexAlignFromVerticalAlign(vertical: LabelVerticalAlign): string {
  switch (vertical) {
    case "top":
      return "flex-start";
    case "bottom":
      return "flex-end";
    default:
      return "center";
  }
}

export function normalizeTextElement(el: LabelTextElement): LabelTextElement {
  return {
    ...el,
    fontSize: normalizeFontSizePercent(el.fontSize, Math.max(12, el.height || 36)),
    verticalAlign: parseVerticalAlign(el.verticalAlign, "top"),
  };
}

function normalizeCellStyle(style: LabelTableCellStyle, cellHeightPx: number): LabelTableCellStyle {
  return {
    ...style,
    fontSize: normalizeFontSizePercent(style.fontSize, Math.max(12, cellHeightPx)),
    verticalAlign: parseVerticalAlign(style.verticalAlign, "middle"),
    wordWrap: style.wordWrap !== false,
    textFit: style.textFit === true,
  };
}

export function normalizeTableElement(el: LabelTableElement): LabelTableElement {
  const rows = Math.max(1, el.rows);
  const cols = Math.max(1, el.cols);
  const cells = resizeTableCells(el.cells ?? [], el.rows, el.cols, rows, cols);
  const cellDataColumnIndexes = resizeTableCellMappings(
    el.cellDataColumnIndexes ?? [],
    el.rows,
    el.cols,
    rows,
    cols,
  );
  const fallback = defaultTableCellStyle(legacyTableStyle(el));
  const cellStyles = resizeTableCellStyles(el.cellStyles ?? [], el.rows, el.cols, rows, cols, fallback);
  const colWidthsPx = getTableColWidthsPx({ ...el, rows, cols });
  const rowHeightsPx = getTableRowHeightsPx({ ...el, rows, cols });
  return {
    ...el,
    rows,
    cols,
    cells,
    cellDataColumnIndexes,
    colWidthsPx,
    rowHeightsPx,
    cellStyles: cellStyles.map((s, i) => {
      const row = Math.floor(i / cols);
      const cellH = Math.max(8, rowHeightsPx[row] ?? el.height / rows);
      return normalizeCellStyle(s, cellH);
    }),
  };
}

export function getTableCellStyle(el: LabelTableElement, cellIndex: number): LabelTableCellStyle {
  const rows = Math.max(1, el.rows);
  const cols = Math.max(1, el.cols);
  const row = Math.floor(cellIndex / cols);
  const rowHeights = getTableRowHeightsPx(el);
  const cellH = Math.max(8, rowHeights[row] ?? el.height / rows);
  const base = el.cellStyles?.[cellIndex] ?? defaultTableCellStyle(legacyTableStyle(el));
  return normalizeCellStyle(base, cellH);
}

export function resolveTableCellContent(
  cellIndex: number,
  el: LabelTableElement,
  doc: LabelEditorDocument,
): string {
  const colIdx = el.cellDataColumnIndexes?.[cellIndex] ?? null;
  if (colIdx === null || !doc.dataSheet) return el.cells[cellIndex] ?? "";
  const row = doc.dataSheet.rows[doc.dataRowIndex];
  if (!row) return el.cells[cellIndex] ?? "";
  const v = row[colIdx];
  return v !== undefined && v !== "" ? v : (el.cells[cellIndex] ?? "");
}

/** Simple CSV parse (handles quoted fields). */
export function parseCsvToDataSheet(csv: string): LabelDataSheet | null {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const parseRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if ((c === "," || c === "\t") && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

export function defaultTextElement(inset: number, cw: number, ch: number): LabelTextElement {
  const w = Math.min(200, Math.max(80, cw - inset * 2 - 40));
  return {
    id: newElementId(),
    kind: "text",
    x: inset + 20,
    y: inset + 20,
    width: w,
    height: 36,
    rotation: 0,
    text: "Text",
    fontFamily: LABEL_FONT_FAMILIES[0],
    fontSize: 50,
    color: "#1a1a1a",
    bold: false,
    italic: false,
    underline: false,
    align: "left",
    verticalAlign: "top",
    dataColumnIndex: null,
  };
}

export function defaultDataTextElement(
  inset: number,
  columnIndex: number,
  header: string,
): LabelTextElement {
  const el = defaultTextElement(inset, 400, 300);
  el.text = header || `Column ${columnIndex + 1}`;
  el.dataColumnIndex = columnIndex;
  return el;
}

export function defaultStickerElement(inset: number, shape: StickerShape): LabelStickerElement {
  return {
    id: newElementId(),
    kind: "sticker",
    shape,
    x: inset + 40,
    y: inset + 40,
    width: 80,
    height: shape === "circle" ? 80 : 70,
    rotation: 0,
    fill: "#2d6a4f",
    opacity: 100,
  };
}

export function defaultImageStickerElement(inset: number, imageUrl: string, name?: string): LabelStickerElement {
  void name;
  return {
    id: newElementId(),
    kind: "sticker",
    shape: "image",
    imageUrl,
    x: inset + 36,
    y: inset + 36,
    width: 72,
    height: 72,
    rotation: 0,
    fill: "#2d6a4f",
    opacity: 100,
  };
}

export function defaultImageElement(inset: number, src: string): LabelImageElement {
  return {
    id: newElementId(),
    kind: "image",
    x: inset + 30,
    y: inset + 30,
    width: 120,
    height: 120,
    rotation: 0,
    opacity: 100,
    src,
  };
}

export function resizeTableCells(
  cells: string[],
  oldRows: number,
  oldCols: number,
  newRows: number,
  newCols: number,
): string[] {
  const r = Math.max(1, Math.min(12, newRows));
  const c = Math.max(1, Math.min(12, newCols));
  const or = Math.max(1, oldRows);
  const oc = Math.max(1, oldCols);
  const next: string[] = [];
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      const prev = row < or && col < oc ? cells[row * oc + col] : "";
      next.push(prev ?? "");
    }
  }
  return next;
}

export function resizeTableCellStyles(
  styles: LabelTableCellStyle[],
  oldRows: number,
  oldCols: number,
  newRows: number,
  newCols: number,
  fallback: LabelTableCellStyle = DEFAULT_TABLE_CELL_STYLE,
): LabelTableCellStyle[] {
  const r = Math.max(1, Math.min(12, newRows));
  const c = Math.max(1, Math.min(12, newCols));
  const or = Math.max(1, oldRows);
  const oc = Math.max(1, oldCols);
  const next: LabelTableCellStyle[] = [];
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      const prev =
        row < or && col < oc && styles[row * oc + col]
          ? styles[row * oc + col]
          : { ...fallback };
      next.push({ ...prev });
    }
  }
  return next;
}

export function resizeTableCellMappings(
  mappings: (number | null)[],
  oldRows: number,
  oldCols: number,
  newRows: number,
  newCols: number,
): (number | null)[] {
  const r = Math.max(1, Math.min(12, newRows));
  const c = Math.max(1, Math.min(12, newCols));
  const or = Math.max(1, oldRows);
  const oc = Math.max(1, oldCols);
  const next: (number | null)[] = [];
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      const prev = row < or && col < oc ? (mappings[row * oc + col] ?? null) : null;
      next.push(prev);
    }
  }
  return next;
}

export function defaultTableElement(inset: number, rows = 2, cols = 2): LabelTableElement {
  const r = Math.max(1, Math.min(12, rows));
  const c = Math.max(1, Math.min(12, cols));
  return {
    id: newElementId(),
    kind: "table",
    x: inset + 24,
    y: inset + 48,
    width: Math.max(100, c * 56),
    height: Math.max(60, r * 28),
    rotation: 0,
    rows: r,
    cols: c,
    showBorder: true,
    borderWidth: 1,
    borderColor: "#1b4332",
    cells: Array.from({ length: r * c }, (_, i) => `Cell ${i + 1}`),
    cellDataColumnIndexes: Array.from({ length: r * c }, () => null),
    cellStyles: Array.from({ length: r * c }, () => defaultTableCellStyle()),
    colWidthsPx: Array.from({ length: c }, () => Math.max(100, c * 56) / c),
    rowHeightsPx: Array.from({ length: r }, () => Math.max(60, r * 28) / r),
  };
}

/** When table outer size changes, keep custom row/column proportions. */
export function patchTableElementSize(
  el: LabelTableElement,
  width: number,
  height: number,
): Partial<LabelTableElement> {
  return { width, height, ...scaleTableLayoutToSize(el, width, height) };
}
