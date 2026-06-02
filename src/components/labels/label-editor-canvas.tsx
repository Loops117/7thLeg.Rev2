"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LabelElementFloatingToolbar } from "@/components/labels/label-element-floating-toolbar";
import {
  LabelImageBox,
  LabelStickerBox,
  LabelTableBox,
  LabelTextBox,
} from "@/components/labels/label-canvas-elements";
import { LabelBorderSvg } from "@/components/labels/label-border-svg";
import { LabelPreviewOverlay } from "@/components/labels/label-preview-overlay";
import { useLabelCanvasZoom } from "@/components/labels/use-label-canvas-zoom";
import { clampBorderConfigToCanvas } from "@/lib/label-template-border";
import { useDesignCoords, useLabelEditor } from "@/components/labels/label-editor-context";
import { btnSecondarySm } from "@/lib/btn-theme-classes";
import { editableRegionPx } from "@/lib/label-template-canvas";
import { renderStrokesOnCanvas } from "@/lib/label-editor/draw-canvas";
import {
  clampPointToEditableRegion,
  editableBounds,
  isPointInEditableRegion,
} from "@/lib/label-editor/editable-region";
import {
  designDeltaToLocal,
  resizeElementRect,
  type ResizeHandle,
} from "@/lib/label-editor/element-resize";
import { patchTableElementSize, type LabelCanvasElement } from "@/lib/label-editor/document";
import { isElementLocked } from "@/lib/label-editor/layers";

export function LabelEditorCanvas({
  onCanvasInteract,
  bottomInsetPx = 0,
}: {
  onCanvasInteract?: () => void;
  bottomInsetPx?: number;
} = {}) {
  const { state, dispatch, template, publicConfig, beginHistoryGesture, endHistoryGesture } =
    useLabelEditor();
  const viewportRef = useRef<HTMLDivElement>(null);
  const designRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cw = template.canvasWidthPx;
  const ch = template.canvasHeightPx;
  const { inset, widthPx: editW, heightPx: editH } = editableRegionPx(cw, ch, template.marginPx);
  const {
    scale,
    userScalePercent,
    zoomIn,
    zoomOut,
    zoomFit,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useLabelCanvasZoom(cw, ch, viewportRef);
  const toDesign = useDesignCoords(designRef);
  const borderConfig = clampBorderConfigToCanvas(template.borderConfig, cw, ch);

  const dataRows = state.doc.dataSheet?.rows.length ?? 0;
  const showDataNav = dataRows > 0;

  const clampPoint = useCallback(
    (x: number, y: number) => clampPointToEditableRegion(x, y, cw, ch, inset),
    [cw, ch, inset],
  );

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const gestureHistoryStartedRef = useRef(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const resizeRef = useRef<{
    id: string;
    handle: ResizeHandle;
    startDesignX: number;
    startDesignY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    rotation: number;
  } | null>(null);

  const editBounds = editableBounds(cw, ch, inset);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    renderStrokesOnCanvas(ctx, state.doc.strokes, state.currentStroke, {
      x: inset,
      y: inset,
      width: editW,
      height: editH,
    });
  }, [cw, ch, inset, editW, editH, state.doc.strokes, state.currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const pointerToClampedDesign = (clientX: number, clientY: number) => {
    const p = toDesign(clientX, clientY);
    return clampPoint(p.x, p.y);
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (state.activeTool !== "draw") return;
    const p = pointerToClampedDesign(e.clientX, e.clientY);
    if (!isPointInEditableRegion(p.x, p.y, cw, ch, inset)) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dispatch({ type: "STROKE_START", point: p });
    dispatch({ type: "SELECT", id: null });
  };

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (state.activeTool !== "draw" || !state.currentStroke) return;
    const p = pointerToClampedDesign(e.clientX, e.clientY);
    dispatch({ type: "STROKE_POINT", point: p });
    redraw();
  };

  const onCanvasPointerUp = () => {
    if (state.activeTool === "draw" && state.currentStroke) {
      dispatch({ type: "STROKE_END" });
    }
  };

  const ensureGestureHistory = () => {
    if (gestureHistoryStartedRef.current) return;
    beginHistoryGesture();
    gestureHistoryStartedRef.current = true;
  };

  const startDrag = (id: string, e: React.PointerEvent) => {
    const el = state.doc.elements.find((x) => x.id === id);
    if (!el || isElementLocked(el)) return;
    resizeRef.current = null;
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const startResize = (id: string, handle: ResizeHandle, e: React.PointerEvent) => {
    const el = state.doc.elements.find((x) => x.id === id);
    if (!el || isElementLocked(el)) return;
    dragRef.current = null;
    const p = toDesign(e.clientX, e.clientY);
    resizeRef.current = {
      id,
      handle,
      startDesignX: p.x,
      startDesignY: p.y,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      rotation: el.rotation,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const startViewportPan = (e: React.PointerEvent) => {
    if (state.activeTool === "draw") return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDesignPointerMove = (e: React.PointerEvent) => {
    if (state.activeTool === "draw" && state.currentStroke) {
      onCanvasPointerMove(e);
      return;
    }
    const p = panRef.current;
    if (p) {
      setPan({
        x: p.origX + (e.clientX - p.startX),
        y: p.origY + (e.clientY - p.startY),
      });
      return;
    }
    const r = resizeRef.current;
    if (r) {
      ensureGestureHistory();
      const p = toDesign(e.clientX, e.clientY);
      const dx = p.x - r.startDesignX;
      const dy = p.y - r.startDesignY;
      const { localDx, localDy } = designDeltaToLocal(dx, dy, r.rotation);
      const next = resizeElementRect(
        r.handle,
        { x: r.origX, y: r.origY, width: r.origW, height: r.origH },
        localDx,
        localDy,
        editBounds,
      );
      const resized = state.doc.elements.find((x) => x.id === r.id);
      const sizePatch =
        resized?.kind === "table"
          ? patchTableElementSize(resized, next.width, next.height)
          : { width: next.width, height: next.height };
      dispatch({
        type: "UPDATE_ELEMENT",
        id: r.id,
        patch: { x: next.x, y: next.y, ...sizePatch },
      });
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    ensureGestureHistory();
    const el = designRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = el.offsetWidth || 1;
    const h = el.offsetHeight || 1;
    const dx = ((e.clientX - d.startX) / rect.width) * w;
    const dy = ((e.clientY - d.startY) / rect.height) * h;
    dispatch({
      type: "UPDATE_ELEMENT",
      id: d.id,
      patch: { x: d.origX + dx, y: d.origY + dy },
    });
  };

  const onDesignPointerUp = () => {
    dragRef.current = null;
    resizeRef.current = null;
    panRef.current = null;
    if (gestureHistoryStartedRef.current) {
      endHistoryGesture();
      gestureHistoryStartedRef.current = false;
    }
    onCanvasPointerUp();
  };

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    if (state.activeTool !== "draw") dispatch({ type: "SELECT", id: null });
  };

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col bg-zinc-200/80 dark:bg-zinc-950"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="z-30 flex shrink-0 items-center justify-center gap-1 border-b border-palm/15 bg-white/95 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/95">
        <button
          type="button"
          aria-label="Zoom out"
          className={`min-h-9 min-w-9 px-2 text-lg font-black ${btnSecondarySm}`}
          onClick={zoomOut}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset zoom to fit"
          className={`min-h-9 min-w-[3.25rem] px-2 text-[10px] font-bold ${btnSecondarySm}`}
          onClick={zoomFit}
        >
          {userScalePercent}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          className={`min-h-9 min-w-9 px-2 text-lg font-black ${btnSecondarySm}`}
          onClick={zoomIn}
        >
          +
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 w-full overflow-hidden"
        style={{ paddingBottom: bottomInsetPx > 0 ? bottomInsetPx : undefined }}
      >
      {showDataNav ? (
        <>
          <button
            type="button"
            aria-label="Previous data row"
            className={`absolute left-1 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/95 px-2 py-4 text-lg font-black shadow-md sm:left-2 sm:px-3 sm:py-6 dark:bg-zinc-900 ${btnSecondarySm}`}
            onClick={() => dispatch({ type: "DATA_ROW_PREV" })}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next data row"
            className={`absolute right-1 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/95 px-2 py-4 text-lg font-black shadow-md sm:right-2 sm:px-3 sm:py-6 dark:bg-zinc-900 ${btnSecondarySm}`}
            onClick={() => dispatch({ type: "DATA_ROW_NEXT" })}
          >
            ›
          </button>
          <p className="absolute bottom-2 left-1/2 z-30 max-w-[90%] -translate-x-1/2 truncate rounded bg-ink/75 px-2 py-1 text-[10px] font-bold text-white sm:bottom-3 sm:px-3 sm:text-xs">
            Data row {state.doc.dataRowIndex + 1} of {dataRows}
          </p>
        </>
      ) : null}

      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden touch-none"
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          onCanvasInteract?.();
          startViewportPan(e);
        }}
        onPointerMove={onDesignPointerMove}
        onPointerUp={onDesignPointerUp}
        onPointerLeave={onDesignPointerUp}
      >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
          <div
            ref={designRef}
            className="relative shrink-0 bg-white shadow-xl"
            style={{
              width: cw,
              height: ch,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
            onPointerDown={(e) => {
              onCanvasInteract?.();
              onBackgroundPointerDown(e);
            }}
            onPointerMove={onDesignPointerMove}
            onPointerUp={onDesignPointerUp}
            onPointerLeave={onDesignPointerUp}
          >
            {template.baseLayoutImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.baseLayoutImageUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                style={{
                  opacity: template.baseLayoutOpacityPercent / 100,
                  transform: `translate(${template.baseLayoutOffsetXPx}px, ${template.baseLayoutOffsetYPx}px) scale(${template.baseLayoutScalePercent / 100}) rotate(${template.baseLayoutRotationDeg}deg)`,
                }}
              />
            ) : null}

            <LabelBorderSvg canvasWidthPx={cw} canvasHeightPx={ch} config={borderConfig} />

            <div
              className="pointer-events-none absolute z-[4] border border-dashed border-red-400/80"
              style={{ left: inset, top: inset, right: inset, bottom: inset }}
              aria-hidden
            />

            <canvas
              ref={canvasRef}
              width={cw}
              height={ch}
              className={`absolute inset-0 touch-none ${
                state.activeTool === "draw" ? "z-10 cursor-crosshair" : "z-[5] pointer-events-none"
              }`}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
            />

            {state.doc.elements.map((el: LabelCanvasElement) => {
              const selected = state.selectedId === el.id;
              const drag = (e: React.PointerEvent) => startDrag(el.id, e);
              const resize = (handle: ResizeHandle, e: React.PointerEvent) =>
                startResize(el.id, handle, e);
              const select = () => dispatch({ type: "SELECT", id: el.id });
              const resizeProp = selected && !isElementLocked(el) ? resize : undefined;
              if (el.kind === "text") {
                return (
                  <LabelTextBox
                    key={el.id}
                    el={el}
                    doc={state.doc}
                    selected={selected}
                    onSelect={select}
                    onPointerDown={drag}
                    onResizeStart={resizeProp}
                  />
                );
              }
              if (el.kind === "sticker") {
                return (
                  <LabelStickerBox
                    key={el.id}
                    el={el}
                    selected={selected}
                    onSelect={select}
                    onPointerDown={drag}
                    onResizeStart={resizeProp}
                  />
                );
              }
              if (el.kind === "table") {
                return (
                  <LabelTableBox
                    key={el.id}
                    el={el}
                    doc={state.doc}
                    selected={selected}
                    onSelect={select}
                    onPointerDown={drag}
                    onResizeStart={resizeProp}
                    onTableLayoutChange={(patch) =>
                      dispatch({ type: "UPDATE_ELEMENT", id: el.id, patch })
                    }
                  />
                );
              }
              return (
                <LabelImageBox
                  key={el.id}
                  el={el}
                  selected={selected}
                  onSelect={select}
                  onPointerDown={drag}
                  onResizeStart={resizeProp}
                />
              );
            })}

            <LabelPreviewOverlay config={publicConfig} />
          </div>
          </div>
        <LabelElementFloatingToolbar
          designRef={designRef}
          viewportRef={viewportRef}
          scale={scale}
          panX={pan.x}
          panY={pan.y}
        />
      </div>
      </div>
    </div>
  );
}

