"use client";

import { useLayoutEffect, useState } from "react";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import { isElementLocked } from "@/lib/label-editor/layers";
import {
  getSelectedElement,
  isImageElement,
  isStickerElement,
  isTableElement,
  isTextElement,
} from "@/lib/label-editor/reducer";
import { btnImportantSm, btnSecondarySm } from "@/lib/btn-theme-classes";

type Props = {
  designRef: React.RefObject<HTMLDivElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  panX: number;
  panY: number;
};

export function LabelElementFloatingToolbar({ designRef, viewportRef, scale, panX, panY }: Props) {
  const { state, dispatch } = useLabelEditor();
  const selected = getSelectedElement(state);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const element =
    selected &&
    (isTextElement(selected) ||
      isStickerElement(selected) ||
      isImageElement(selected) ||
      isTableElement(selected))
      ? selected
      : null;

  useLayoutEffect(() => {
    if (!element || !designRef.current || !viewportRef.current) {
      setPos(null);
      return;
    }
    const update = () => {
      const design = designRef.current;
      const viewport = viewportRef.current;
      if (!design || !viewport) return;
      const designRect = design.getBoundingClientRect();
      const vpRect = viewport.getBoundingClientRect();
      const cx = element.x + element.width / 2;
      const bottomY = element.y + element.height;
      const gapPx = 8;
      const screenX = designRect.left + cx * scale;
      const screenY = designRect.top + bottomY * scale + gapPx;
      setPos({
        left: screenX - vpRect.left,
        top: screenY - vpRect.top,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(designRef.current);
    ro.observe(viewportRef.current);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
    };
  }, [element, designRef, viewportRef, scale, panX, panY]);

  if (!element || !pos) return null;

  const locked = isElementLocked(element);
  const backIndex = state.doc.elements.findIndex((e) => e.id === element.id);
  const canForward = backIndex < state.doc.elements.length - 1;
  const canBackward = backIndex > 0;

  return (
    <div
      className="pointer-events-none absolute z-40 flex -translate-x-1/2 justify-center"
      style={{ left: pos.left, top: Math.max(4, pos.top) }}
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-blue-400/60 bg-white/95 px-1 py-0.5 shadow-lg backdrop-blur-sm dark:border-blue-500/50 dark:bg-zinc-900/95">
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${btnSecondarySm}`}
          aria-label="Move layer backward"
          title="Move backward"
          disabled={!canBackward}
          onClick={() =>
            dispatch({ type: "REORDER_ELEMENT_LAYER", id: element.id, direction: "backward" })
          }
        >
          ↓
        </button>
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${btnSecondarySm}`}
          aria-label="Move layer forward"
          title="Move forward"
          disabled={!canForward}
          onClick={() =>
            dispatch({ type: "REORDER_ELEMENT_LAYER", id: element.id, direction: "forward" })
          }
        >
          ↑
        </button>
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${btnSecondarySm} ${
            locked ? "text-blue-600" : ""
          }`}
          aria-label={locked ? "Unlock" : "Lock"}
          title={locked ? "Unlock" : "Lock"}
          onClick={() =>
            dispatch({ type: "UPDATE_ELEMENT", id: element.id, patch: { locked: !locked } })
          }
        >
          {locked ? "🔒" : "🔓"}
        </button>
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${btnImportantSm}`}
          aria-label="Delete"
          title="Delete"
          onClick={() => {
            if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteSelected)) return;
            dispatch({ type: "DELETE_SELECTED" });
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
