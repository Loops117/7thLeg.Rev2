import {
  countDocumentElements,
  createEmptyDocument,
  type DrawMode,
  type DrawStroke,
  type LabelCanvasElement,
  type LabelDataSheet,
  type LabelEditorDocument,
  type LabelImageElement,
  type LabelStickerElement,
  type LabelTableElement,
  type LabelTextElement,
  newElementId,
} from "@/lib/label-editor/document";
import { cloneDoc } from "@/lib/label-editor/history";
import { isElementLocked, moveElementToIndex, reorderElementInDoc } from "@/lib/label-editor/layers";

export type LabelEditorState = {
  doc: LabelEditorDocument;
  selectedId: string | null;
  activeTool: import("@/lib/label-editor/document").LabelPaletteTool;
  brushColor: string;
  brushWidth: number;
  brushStyle: import("@/lib/label-editor/document").BrushStyle;
  drawMode: DrawMode;
  /** In-progress stroke while drawing */
  currentStroke: DrawStroke | null;
};

export type LabelEditorAction =
  | { type: "SET_DOC"; doc: LabelEditorDocument; skipHistory?: boolean }
  | { type: "SET_TOOL"; tool: LabelEditorState["activeTool"] }
  | { type: "SELECT"; id: string | null }
  | { type: "SET_BRUSH"; color?: string; width?: number; style?: LabelEditorState["brushStyle"] }
  | { type: "SET_DRAW_MODE"; mode: DrawMode }
  | { type: "STROKE_START"; point: { x: number; y: number } }
  | { type: "STROKE_POINT"; point: { x: number; y: number } }
  | { type: "STROKE_END" }
  | { type: "ADD_ELEMENT"; element: LabelCanvasElement }
  | { type: "UPDATE_ELEMENT"; id: string; patch: Partial<LabelCanvasElement> }
  | { type: "DELETE_SELECTED" }
  | { type: "SET_DATA_SHEET"; sheet: LabelDataSheet | null }
  | { type: "UPDATE_DATA_HEADER"; col: number; value: string }
  | { type: "UPDATE_DATA_CELL"; row: number; col: number; value: string }
  | { type: "ADD_DATA_ROW" }
  | { type: "ADD_DATA_COLUMN" }
  | { type: "SET_DATA_ROW"; index: number }
  | { type: "DATA_ROW_PREV" }
  | { type: "DATA_ROW_NEXT" }
  | { type: "CLEAR_DRAWS" }
  | { type: "CLEAR_LABEL" }
  | { type: "SET_BAG_NAME_SOURCE"; elementId: string | null }
  | { type: "REORDER_ELEMENT_LAYER"; id: string; direction: "forward" | "backward" }
  | { type: "MOVE_ELEMENT_LAYER"; id: string; toIndex: number };

export function createInitialEditorState(templateId: string, doc?: LabelEditorDocument): LabelEditorState {
  return {
    doc: doc ?? createEmptyDocument(templateId),
    selectedId: null,
    activeTool: "template",
    brushColor: "#1b4332",
    brushWidth: 4,
    brushStyle: "solid",
    drawMode: "brush",
    currentStroke: null,
  };
}

function updateElementInDoc(
  doc: LabelEditorDocument,
  id: string,
  patch: Partial<LabelCanvasElement>,
): LabelEditorDocument {
  return {
    ...doc,
    elements: doc.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as LabelCanvasElement) : el)),
  };
}

export function labelEditorReducer(state: LabelEditorState, action: LabelEditorAction): LabelEditorState {
  switch (action.type) {
    case "SET_DOC":
      return { ...state, doc: action.doc, selectedId: null, currentStroke: null };
    case "SET_TOOL":
      return { ...state, activeTool: action.tool, currentStroke: null };
    case "SELECT":
      return { ...state, selectedId: action.id };
    case "SET_BRUSH":
      return {
        ...state,
        brushColor: action.color ?? state.brushColor,
        brushWidth: action.width ?? state.brushWidth,
        brushStyle: action.style ?? state.brushStyle,
      };
    case "SET_DRAW_MODE":
      return { ...state, drawMode: action.mode, currentStroke: null };
    case "STROKE_START": {
      const erase = state.drawMode === "eraser";
      const stroke: DrawStroke = {
        id: newElementId(),
        points: [action.point],
        color: erase ? "#000000" : state.brushColor,
        width: erase ? Math.max(state.brushWidth, 8) : state.brushWidth,
        style: state.brushStyle,
        erase,
      };
      return { ...state, currentStroke: stroke };
    }
    case "STROKE_POINT": {
      if (!state.currentStroke) return state;
      return {
        ...state,
        currentStroke: {
          ...state.currentStroke,
          points: [...state.currentStroke.points, action.point],
        },
      };
    }
    case "STROKE_END": {
      if (!state.currentStroke || state.currentStroke.points.length < 2) {
        return { ...state, currentStroke: null };
      }
      return {
        ...state,
        currentStroke: null,
        doc: {
          ...state.doc,
          strokes: [...state.doc.strokes, state.currentStroke],
        },
      };
    }
    case "ADD_ELEMENT":
      return {
        ...state,
        doc: { ...state.doc, elements: [...state.doc.elements, action.element] },
        selectedId: action.element.id,
      };
    case "UPDATE_ELEMENT":
      return {
        ...state,
        doc: updateElementInDoc(state.doc, action.id, action.patch),
      };
    case "SET_BAG_NAME_SOURCE":
      return {
        ...state,
        doc: { ...state.doc, bagNameSourceElementId: action.elementId },
      };
    case "DELETE_SELECTED": {
      if (!state.selectedId) return state;
      const id = state.selectedId;
      const selectedEl = state.doc.elements.find((e) => e.id === id);
      if (selectedEl && isElementLocked(selectedEl)) return state;
      const inElements = state.doc.elements.some((e) => e.id === id);
      if (inElements) {
        const nextElements = state.doc.elements.filter((e) => e.id !== id);
        return {
          ...state,
          selectedId: null,
          doc: {
            ...state.doc,
            elements: nextElements,
            bagNameSourceElementId:
              state.doc.bagNameSourceElementId === id ? null : state.doc.bagNameSourceElementId,
          },
        };
      }
      return {
        ...state,
        selectedId: null,
        doc: { ...state.doc, strokes: state.doc.strokes.filter((s) => s.id !== id) },
      };
    }
    case "SET_DATA_SHEET": {
      const rows = action.sheet?.rows.length ?? 0;
      return {
        ...state,
        doc: {
          ...state.doc,
          dataSheet: action.sheet,
          dataRowIndex: rows > 0 ? Math.min(state.doc.dataRowIndex, rows - 1) : 0,
        },
      };
    }
    case "UPDATE_DATA_HEADER": {
      const sheet = state.doc.dataSheet;
      if (!sheet || action.col < 0 || action.col >= sheet.headers.length) return state;
      const headers = [...sheet.headers];
      headers[action.col] = action.value;
      return { ...state, doc: { ...state.doc, dataSheet: { ...sheet, headers } } };
    }
    case "UPDATE_DATA_CELL": {
      const sheet = state.doc.dataSheet;
      if (!sheet || action.row < 0 || action.row >= sheet.rows.length) return state;
      if (action.col < 0 || action.col >= sheet.headers.length) return state;
      const rows = sheet.rows.map((r, i) => {
        if (i !== action.row) return r;
        const next = [...r];
        while (next.length < sheet.headers.length) next.push("");
        next[action.col] = action.value;
        return next;
      });
      return { ...state, doc: { ...state.doc, dataSheet: { ...sheet, rows } } };
    }
    case "ADD_DATA_ROW": {
      const sheet = state.doc.dataSheet;
      if (!sheet) return state;
      const empty = Array.from({ length: sheet.headers.length }, () => "");
      return {
        ...state,
        doc: { ...state.doc, dataSheet: { ...sheet, rows: [...sheet.rows, empty] } },
      };
    }
    case "ADD_DATA_COLUMN": {
      const sheet = state.doc.dataSheet;
      if (!sheet) return state;
      const n = sheet.headers.length + 1;
      const headers = [...sheet.headers, `Column ${n}`];
      const rows = sheet.rows.map((r) => [...r, ""]);
      return { ...state, doc: { ...state.doc, dataSheet: { headers, rows } } };
    }
    case "SET_DATA_ROW": {
      const max = Math.max(0, (state.doc.dataSheet?.rows.length ?? 1) - 1);
      return {
        ...state,
        doc: { ...state.doc, dataRowIndex: Math.min(max, Math.max(0, action.index)) },
      };
    }
    case "DATA_ROW_PREV": {
      const max = state.doc.dataSheet?.rows.length ?? 0;
      if (max === 0) return state;
      const next = state.doc.dataRowIndex <= 0 ? max - 1 : state.doc.dataRowIndex - 1;
      return { ...state, doc: { ...state.doc, dataRowIndex: next } };
    }
    case "DATA_ROW_NEXT": {
      const max = state.doc.dataSheet?.rows.length ?? 0;
      if (max === 0) return state;
      const next = state.doc.dataRowIndex >= max - 1 ? 0 : state.doc.dataRowIndex + 1;
      return { ...state, doc: { ...state.doc, dataRowIndex: next } };
    }
    case "CLEAR_DRAWS":
      return { ...state, doc: { ...state.doc, strokes: [] }, currentStroke: null };
    case "CLEAR_LABEL":
      return {
        ...state,
        doc: createEmptyDocument(state.doc.templateId),
        selectedId: null,
        currentStroke: null,
      };
    case "REORDER_ELEMENT_LAYER":
      return {
        ...state,
        doc: reorderElementInDoc(state.doc, action.id, action.direction),
      };
    case "MOVE_ELEMENT_LAYER":
      return {
        ...state,
        doc: moveElementToIndex(state.doc, action.id, action.toIndex),
      };
    default:
      return state;
  }
}

/** Actions that mutate the design document (for undo snapshots). */
export function shouldPushHistory(action: LabelEditorAction): boolean {
  switch (action.type) {
    case "STROKE_END":
    case "ADD_ELEMENT":
    case "UPDATE_ELEMENT":
    case "DELETE_SELECTED":
    case "SET_DATA_SHEET":
    case "UPDATE_DATA_HEADER":
    case "UPDATE_DATA_CELL":
    case "ADD_DATA_ROW":
    case "ADD_DATA_COLUMN":
    case "CLEAR_DRAWS":
    case "CLEAR_LABEL":
    case "SET_BAG_NAME_SOURCE":
    case "REORDER_ELEMENT_LAYER":
    case "MOVE_ELEMENT_LAYER":
      return true;
    case "SET_DOC":
      return !action.skipHistory;
    default:
      return false;
  }
}

export function canAddElement(doc: LabelEditorDocument, maxElements: number): boolean {
  return countDocumentElements(doc) < maxElements;
}

export function getSelectedElement(
  state: LabelEditorState,
): LabelCanvasElement | DrawStroke | null {
  if (!state.selectedId) return null;
  const el = state.doc.elements.find((e) => e.id === state.selectedId);
  if (el) return el;
  return state.doc.strokes.find((s) => s.id === state.selectedId) ?? null;
}

export function isTextElement(el: unknown): el is LabelTextElement {
  return !!el && typeof el === "object" && (el as LabelTextElement).kind === "text";
}

export function isStickerElement(el: unknown): el is LabelStickerElement {
  return !!el && typeof el === "object" && (el as LabelStickerElement).kind === "sticker";
}

export function isImageElement(el: unknown): el is LabelImageElement {
  return !!el && typeof el === "object" && (el as LabelImageElement).kind === "image";
}

export function isTableElement(el: unknown): el is LabelTableElement {
  return !!el && typeof el === "object" && (el as LabelTableElement).kind === "table";
}

export { cloneDoc };
