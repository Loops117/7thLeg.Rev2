"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const USER_SCALE_MIN = 0.25;
const USER_SCALE_MAX = 4;

/** Horizontal gutter inside the canvas at 100% zoom (small inset from viewport edges). */
export const LABEL_CANVAS_GUTTER_X_PX = 20;

/** Default zoom multiplier at load and when pressing Fit. */
export const LABEL_EDITOR_DEFAULT_ZOOM = 1;

export function useLabelCanvasZoom(
  canvasWidthPx: number,
  canvasHeightPx: number,
  viewportRef: RefObject<HTMLDivElement | null>,
) {
  const [fitScale, setFitScale] = useState(0.4);
  const [userScale, setUserScale] = useState(LABEL_EDITOR_DEFAULT_ZOOM);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const recomputeFit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const mobile = el.clientWidth < 768;
    const padLeft = mobile ? 12 : LABEL_CANVAS_GUTTER_X_PX;
    const padRight = mobile ? 12 : LABEL_CANVAS_GUTTER_X_PX;
    const padY = mobile ? 16 : 24;
    const vw = Math.max(40, el.clientWidth - padLeft - padRight);
    const vh = Math.max(40, el.clientHeight - padY * 2);
    setFitScale(Math.min(vw / canvasWidthPx, vh / canvasHeightPx));
  }, [canvasWidthPx, canvasHeightPx, viewportRef]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(recomputeFit);
    });
    ro.observe(el);
    recomputeFit();
    return () => ro.disconnect();
  }, [recomputeFit, viewportRef]);

  useEffect(() => {
    setUserScale(LABEL_EDITOR_DEFAULT_ZOOM);
    recomputeFit();
  }, [canvasWidthPx, canvasHeightPx, recomputeFit]);

  const scale = fitScale * userScale;

  const zoomIn = useCallback(() => {
    setUserScale((s) => Math.min(USER_SCALE_MAX, s * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setUserScale((s) => Math.max(USER_SCALE_MIN, s / 1.2));
  }, []);

  const zoomFit = useCallback(() => setUserScale(LABEL_EDITOR_DEFAULT_ZOOM), []);

  /** Scroll up zooms in, scroll down zooms out (smooth for trackpads). */
  const zoomWheel = useCallback((deltaY: number) => {
    if (deltaY === 0) return;
    setUserScale((s) => {
      const factor = Math.exp(-deltaY * 0.0012);
      return Math.min(USER_SCALE_MAX, Math.max(USER_SCALE_MIN, s * factor));
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoomWheel(e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewportRef, zoomWheel]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchRef.current = { dist, scale: userScale };
      }
    },
    [userScale],
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = dist / pinchRef.current.dist;
    const next = pinchRef.current.scale * ratio;
    setUserScale(Math.min(USER_SCALE_MAX, Math.max(USER_SCALE_MIN, next)));
  }, []);

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  return {
    scale,
    fitScale,
    userScalePercent: Math.round(userScale * 100),
    zoomIn,
    zoomOut,
    zoomFit,
    zoomWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
