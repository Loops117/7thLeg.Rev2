"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

const DRAG_EXPAND_PX = 48;
const DRAG_COLLAPSE_PX = 48;
/** Pointer movement below this counts as a tap on the tab. */
const TAP_PX = 12;

export function LabelEditorMobileBottomSheet({
  expanded,
  onExpandedChange,
  onHeightChange,
  header,
  children,
  className,
  contentMaxHeight,
}: {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onHeightChange: (px: number) => void;
  header: ReactNode;
  children: ReactNode;
  className?: string;
  /** Tailwind max-height value for expanded panel body, e.g. min(72dvh,480px) */
  contentMaxHeight?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startY: number;
    startExpanded: boolean;
    maxAbsDy: number;
    toggledByDrag: boolean;
  } | null>(null);

  const reportHeight = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    onHeightChange(el.offsetHeight);
  }, [onHeightChange]);

  useEffect(() => {
    reportHeight();
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => reportHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, reportHeight]);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startY: e.clientY,
      startExpanded: expanded,
      maxAbsDy: 0,
      toggledByDrag: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    d.maxAbsDy = Math.max(d.maxAbsDy, Math.abs(dy));
    if (!d.startExpanded && dy > DRAG_EXPAND_PX) {
      onExpandedChange(true);
      d.toggledByDrag = true;
    }
    if (d.startExpanded && dy < -DRAG_COLLAPSE_PX) {
      onExpandedChange(false);
      d.toggledByDrag = true;
    }
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    d.maxAbsDy = Math.max(d.maxAbsDy, Math.abs(d.startY - e.clientY));
    if (!d.toggledByDrag && d.maxAbsDy < TAP_PX) {
      onExpandedChange(!d.startExpanded);
    }
    dragRef.current = null;
  };

  return (
    <div
      ref={shellRef}
      className={`absolute bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-palm/20 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom,0px)] md:hidden dark:border-zinc-600 dark:bg-zinc-900 ${className ?? ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
        className="flex w-full shrink-0 cursor-grab touch-none flex-col items-center pt-1.5 pb-0.5 active:cursor-grabbing"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onExpandedChange(!expanded);
          }
        }}
      >
        <span className="h-1 w-10 rounded-full bg-palm/25 dark:bg-zinc-500" />
      </div>
      <div className="shrink-0 border-b border-palm/10 dark:border-zinc-700">{header}</div>
      {expanded ? (
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ maxHeight: contentMaxHeight ?? "min(48dvh, 360px)" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use LabelEditorMobileBottomSheet — kept for existing imports. */
export const LabelEditorMobilePalette = LabelEditorMobileBottomSheet;
