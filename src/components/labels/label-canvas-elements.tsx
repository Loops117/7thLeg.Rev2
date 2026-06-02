"use client";

import { useEffect, useRef, useState } from "react";
import {
  useLabelEditorDispatchOptional,
  useLabelEditorHistoryGestureOptional,
} from "@/components/labels/label-editor-context";
import type {
  LabelEditorDocument,
  LabelImageElement,
  LabelStickerElement,
  LabelTableElement,
  LabelTextElement,
} from "@/lib/label-editor/document";
import {
  flexAlignFromVerticalAlign,
  flexJustifyFromTextAlign,
  getTableCellStyle,
  resolveTableCellContent,
  resolveTextContent,
} from "@/lib/label-editor/document";
import { fitFontSizePx, fontSizePxFromPercent } from "@/lib/label-editor/typography";
import { designDeltaToLocal, type ResizeHandle } from "@/lib/label-editor/element-resize";
import {
  applyColDividerDrag,
  applyRowDividerDrag,
  getTableColWidthsPx,
  getTableRowHeightsPx,
} from "@/lib/label-editor/table-layout";
import { LabelElementResizeHandles } from "@/components/labels/label-element-resize-handles";

const ELEMENT_Z = "absolute z-[15]";

type ElementInteractionProps = {
  selected: boolean;
  /** Editor-only UI (DATA badge, etc.). Off in bag/preview. */
  showEditorChrome?: boolean;
  onSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void;
};

type TableLayoutPatch = Pick<LabelTableElement, "colWidthsPx" | "rowHeightsPx">;

function stopSelect(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function StickerShapeSvg({ shape, fill }: { shape: LabelStickerElement["shape"]; fill: string }) {
  switch (shape) {
    case "circle":
      return <ellipse cx="50" cy="50" rx="48" ry="48" fill={fill} />;
    case "triangle":
      return <polygon points="50,4 96,96 4,96" fill={fill} />;
    case "star":
      return (
        <polygon
          points="50,2 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38"
          fill={fill}
        />
      );
    case "image":
      return null;
    case "rect":
    default:
      return <rect x="4" y="4" width="92" height="92" rx="4" fill={fill} />;
  }
}

export function LabelTextBox({
  el,
  doc,
  selected,
  showEditorChrome = true,
  onSelect,
  onPointerDown,
  onResizeStart,
}: {
  el: LabelTextElement;
  doc: LabelEditorDocument;
} & ElementInteractionProps) {
  const dispatch = useLabelEditorDispatchOptional();
  const [editing, setEditing] = useState(false);
  const display = resolveTextContent(el, doc);
  const fontSizePx = fontSizePxFromPercent(el.fontSize, el.height);
  const verticalAlign = el.verticalAlign ?? "top";
  const textLayoutStyle = {
    justifyContent: flexJustifyFromTextAlign(el.align),
    alignItems: flexAlignFromVerticalAlign(verticalAlign),
  };
  const textStyle = {
    fontFamily: el.fontFamily,
    fontSize: fontSizePx,
    color: el.color,
    fontWeight: el.bold ? 700 : 400,
    fontStyle: el.italic ? "italic" : "normal",
    textDecoration: el.underline ? "underline" : "none",
    textAlign: el.align,
    lineHeight: 1.2,
  } as const;

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const staticPreview = !showEditorChrome && !selected;

  return (
    <div
      role={staticPreview ? undefined : "button"}
      tabIndex={staticPreview ? undefined : 0}
      onPointerDown={
        staticPreview
          ? undefined
          : (e) => {
              stopSelect(e);
              onSelect();
              onPointerDown(e);
            }
      }
      onClick={staticPreview ? undefined : stopSelect}
      onDoubleClick={
        staticPreview
          ? undefined
          : (e) => {
              stopSelect(e);
              if (dispatch && el.dataColumnIndex === null) {
                setEditing(true);
                onSelect();
              }
            }
      }
      className={`${ELEMENT_Z} overflow-hidden border-2 ${
        staticPreview
          ? "pointer-events-none border-transparent"
          : selected
            ? el.locked
              ? "cursor-not-allowed border-blue-500 ring-2 ring-blue-400/80"
              : "cursor-move border-blue-500 ring-2 ring-blue-400/80"
            : el.locked
              ? "cursor-not-allowed border-transparent"
              : "cursor-move border-transparent hover:border-palm/30"
      }`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div className="flex h-full w-full px-1 py-0.5" style={textLayoutStyle}>
        {editing && dispatch && el.dataColumnIndex === null ? (
          <textarea
            autoFocus
            value={el.text}
            onChange={(e) => dispatch({ type: "UPDATE_ELEMENT", id: el.id, patch: { text: e.target.value } })}
            onBlur={() => setEditing(false)}
            onPointerDown={stopSelect}
            onClick={stopSelect}
            className="max-h-full max-w-full min-h-0 min-w-0 flex-1 resize-none border-0 bg-white/90 text-ink outline-none dark:bg-zinc-900/90 dark:text-zinc-100"
            style={textStyle}
          />
        ) : (
          <p className="max-h-full max-w-full min-w-0 break-words pointer-events-none" style={textStyle}>
            {display}
          </p>
        )}
      </div>
      {showEditorChrome && selected && el.dataColumnIndex !== null ? (
        <span className="pointer-events-none absolute right-0 top-0 bg-palm/80 px-1 text-[8px] font-bold text-white">
          DATA
        </span>
      ) : null}
      {selected && onResizeStart ? <LabelElementResizeHandles onResizeStart={onResizeStart} /> : null}
    </div>
  );
}

export function LabelStickerBox({
  el,
  selected,
  onSelect,
  onPointerDown,
  onResizeStart,
}: {
  el: LabelStickerElement;
} & ElementInteractionProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        stopSelect(e);
        onSelect();
        onPointerDown(e);
      }}
      onClick={stopSelect}
      className={`${ELEMENT_Z} ${el.locked ? "cursor-not-allowed" : "cursor-move"} ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "center center",
        opacity: el.opacity / 100,
      }}
    >
      {el.shape === "image" && el.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={el.imageUrl}
          alt=""
          className="pointer-events-none h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <svg viewBox="0 0 100 100" className="pointer-events-none h-full w-full">
          <StickerShapeSvg shape={el.shape} fill={el.fill} />
        </svg>
      )}
      {selected && onResizeStart ? <LabelElementResizeHandles onResizeStart={onResizeStart} /> : null}
    </div>
  );
}

export function LabelImageBox({
  el,
  selected,
  onSelect,
  onPointerDown,
  onResizeStart,
}: {
  el: LabelImageElement;
} & ElementInteractionProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        stopSelect(e);
        onSelect();
        onPointerDown(e);
      }}
      onClick={stopSelect}
      className={`${ELEMENT_Z} ${el.locked ? "cursor-not-allowed" : "cursor-move"} overflow-hidden ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "center center",
        opacity: el.opacity / 100,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={el.src} alt="" className="pointer-events-none h-full w-full object-contain" draggable={false} />
      {selected && onResizeStart ? <LabelElementResizeHandles onResizeStart={onResizeStart} /> : null}
    </div>
  );
}

export function LabelTableBox({
  el,
  doc,
  selected,
  showEditorChrome = true,
  onTableLayoutChange,
  onSelect,
  onPointerDown,
  onResizeStart,
}: {
  el: LabelTableElement;
  doc: LabelEditorDocument;
  onTableLayoutChange?: (patch: TableLayoutPatch) => void;
} & ElementInteractionProps) {
  const historyGesture = useLabelEditorHistoryGestureOptional();
  const tableRef = useRef<HTMLDivElement>(null);
  const dividerDragRef = useRef<{
    type: "col" | "row";
    index: number;
    startClientX: number;
    startClientY: number;
    origColWidths: number[];
    origRowHeights: number[];
  } | null>(null);

  const rows = Math.max(1, el.rows);
  const cols = Math.max(1, el.cols);
  const colWidths = getTableColWidthsPx(el);
  const rowHeights = getTableRowHeightsPx(el);
  const mapped = el.cellDataColumnIndexes?.some((c) => c !== null) ?? false;

  const localDeltaFromPointer = (e: React.PointerEvent, startX: number, startY: number) => {
    const root = tableRef.current;
    if (!root) return { localDx: 0, localDy: 0 };
    const rect = root.getBoundingClientRect();
    const w = root.offsetWidth || 1;
    const h = root.offsetHeight || 1;
    const dx = ((e.clientX - startX) / rect.width) * w;
    const dy = ((e.clientY - startY) / rect.height) * h;
    return designDeltaToLocal(dx, dy, el.rotation);
  };

  const colOffset = (throughCol: number) =>
    colWidths.slice(0, throughCol + 1).reduce((sum, w) => sum + w, 0);
  const rowOffset = (throughRow: number) =>
    rowHeights.slice(0, throughRow + 1).reduce((sum, h) => sum + h, 0);

  const dividerHistoryStartedRef = useRef(false);

  const onTablePointerMove = (e: React.PointerEvent) => {
    const d = dividerDragRef.current;
    if (!d) return;
    if (!dividerHistoryStartedRef.current) {
      historyGesture?.beginHistoryGesture();
      dividerHistoryStartedRef.current = true;
    }
    const { localDx, localDy } = localDeltaFromPointer(e, d.startClientX, d.startClientY);
    if (!onTableLayoutChange) return;
    if (d.type === "col") {
      onTableLayoutChange({
        colWidthsPx: applyColDividerDrag(d.origColWidths, d.index, localDx, el.width),
      });
    } else {
      onTableLayoutChange({
        rowHeightsPx: applyRowDividerDrag(d.origRowHeights, d.index, localDy, el.height),
      });
    }
  };

  const endDividerDrag = () => {
    if (dividerHistoryStartedRef.current) {
      historyGesture?.endHistoryGesture();
      dividerHistoryStartedRef.current = false;
    }
    dividerDragRef.current = null;
  };

  const startColDivider = (index: number, e: React.PointerEvent) => {
    stopSelect(e);
    dividerDragRef.current = {
      type: "col",
      index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origColWidths: [...colWidths],
      origRowHeights: [],
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const startRowDivider = (index: number, e: React.PointerEvent) => {
    stopSelect(e);
    dividerDragRef.current = {
      type: "row",
      index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origColWidths: [],
      origRowHeights: [...rowHeights],
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <div
      ref={tableRef}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        stopSelect(e);
        onSelect();
        onPointerDown(e);
      }}
      onPointerMove={onTablePointerMove}
      onPointerUp={endDividerDrag}
      onPointerCancel={endDividerDrag}
      onClick={stopSelect}
      className={`${ELEMENT_Z} ${el.locked ? "cursor-not-allowed" : "cursor-move"} overflow-hidden ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
          gridTemplateRows: rowHeights.map((h) => `${h}px`).join(" "),
          border: el.showBorder ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const cellW = colWidths[col] ?? el.width / cols;
          const cellH = rowHeights[row] ?? el.height / rows;
          const showRight = el.showBorder && col < cols - 1;
          const showBottom = el.showBorder && row < rows - 1;
          const cellStyle = getTableCellStyle(el, i);
          const content = resolveTableCellContent(i, el, doc);
          let fontSizePx = fontSizePxFromPercent(cellStyle.fontSize, cellH);
          if (cellStyle.textFit) {
            fontSizePx = fitFontSizePx(content, cellW, cellH, fontSizePx);
          }
          const wrap = cellStyle.wordWrap !== false;
          return (
            <div
              key={i}
              className="flex overflow-hidden px-0.5 py-0.5"
              style={{
                justifyContent: flexJustifyFromTextAlign(cellStyle.align),
                alignItems: flexAlignFromVerticalAlign(cellStyle.verticalAlign),
                borderRight: showRight ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
                borderBottom: showBottom ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
              }}
            >
              <span
                className={`pointer-events-none max-w-full leading-tight ${
                  wrap ? "break-words whitespace-pre-wrap" : "truncate whitespace-nowrap"
                }`}
                style={{
                  fontFamily: cellStyle.fontFamily,
                  fontSize: fontSizePx,
                  color: cellStyle.color,
                  fontWeight: cellStyle.bold ? 700 : 400,
                  fontStyle: cellStyle.italic ? "italic" : "normal",
                  textDecoration: cellStyle.underline ? "underline" : "none",
                  textAlign: cellStyle.align,
                }}
              >
                {content}
              </span>
            </div>
          );
        })}
      </div>
      {selected
        ? Array.from({ length: Math.max(0, cols - 1) }, (_, i) => (
            <div
              key={`col-div-${i}`}
              role="separator"
              aria-orientation="vertical"
              className="absolute z-20 touch-none"
              style={{
                left: colOffset(i) - 3,
                top: 0,
                width: 6,
                height: "100%",
                cursor: "col-resize",
              }}
              onPointerDown={(e) => startColDivider(i, e)}
            />
          ))
        : null}
      {selected
        ? Array.from({ length: Math.max(0, rows - 1) }, (_, i) => (
            <div
              key={`row-div-${i}`}
              role="separator"
              aria-orientation="horizontal"
              className="absolute z-20 touch-none"
              style={{
                top: rowOffset(i) - 3,
                left: 0,
                height: 6,
                width: "100%",
                cursor: "row-resize",
              }}
              onPointerDown={(e) => startRowDivider(i, e)}
            />
          ))
        : null}
      {showEditorChrome && selected && mapped ? (
        <span className="pointer-events-none absolute right-0 top-0 z-30 bg-palm/80 px-1 text-[8px] font-bold text-white">
          DATA
        </span>
      ) : null}
      {selected && onResizeStart ? <LabelElementResizeHandles onResizeStart={onResizeStart} /> : null}
    </div>
  );
}
