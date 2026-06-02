"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LabelEditorHelpConfig, LabelPaletteHelpTool } from "@/lib/label-editor-help";
import type { LabelPaletteTool } from "@/lib/label-editor/document";
import { getHelpForTool } from "@/lib/label-editor-help";
import { btnMainSm } from "@/lib/btn-theme-classes";

const TOUR_STORAGE_KEY = "lemons-label-editor-tour-v1";

const TOUR_STEPS: LabelPaletteHelpTool[] = ["template", "data", "draw", "text", "saved"];

const VIEWPORT_PAD = 12;
const GAP = 10;
const POPUP_ESTIMATE_W = 288;
const POPUP_ESTIMATE_H = 180;

type TourLayout = {
  top: number;
  left: number;
  placement: "above" | "below";
};

function computeTourLayout(
  anchor: DOMRect,
  popupW: number,
  popupH: number,
): TourLayout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(popupW, vw - VIEWPORT_PAD * 2);
  const h = Math.min(popupH, vh - VIEWPORT_PAD * 2);

  const spaceBelow = vh - anchor.bottom - GAP;
  const spaceAbove = anchor.top - GAP;
  const placement: "above" | "below" =
    spaceBelow >= h || spaceBelow >= spaceAbove ? "below" : "above";

  let top =
    placement === "below" ? anchor.bottom + GAP : anchor.top - GAP - h;
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - VIEWPORT_PAD - h));

  let left = anchor.left + anchor.width / 2;
  left = Math.max(VIEWPORT_PAD + w / 2, Math.min(left, vw - VIEWPORT_PAD - w / 2));

  return { top, left, placement };
}

export function LabelEditorTour({
  helpConfig,
  activeTool,
  onOpenPalette,
  onSelectTool,
}: {
  helpConfig: LabelEditorHelpConfig;
  activeTool: LabelPaletteTool;
  onOpenPalette: () => void;
  onSelectTool: (tool: LabelPaletteTool) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const [layout, setLayout] = useState<TourLayout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const stepTool = TOUR_STEPS[stepIndex];
  const entry = stepTool ? getHelpForTool(helpConfig, stepTool) : null;

  useEffect(() => {
    if (!helpConfig.tourEnabled) {
      setDismissed(true);
      return;
    }
    try {
      if (globalThis.localStorage.getItem(TOUR_STORAGE_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    setDismissed(false);
    setStepIndex(0);
    onOpenPalette();
    onSelectTool("template");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when editor mounts
  }, []);

  const updatePosition = useCallback(() => {
    if (!stepTool) {
      setLayout(null);
      return;
    }
    const el = document.querySelector(`[data-label-tour="${stepTool}"]`);
    if (!el) {
      setLayout(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const rect = el.getBoundingClientRect();
    const popup = popupRef.current;
    const w = popup?.offsetWidth ?? POPUP_ESTIMATE_W;
    const h = popup?.offsetHeight ?? POPUP_ESTIMATE_H;
    setLayout(computeTourLayout(rect, w, h));
  }, [stepTool]);

  useLayoutEffect(() => {
    if (dismissed || !stepTool) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    const onReflow = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [dismissed, stepTool, stepIndex, updatePosition]);

  const dismissPermanent = () => {
    try {
      globalThis.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const advance = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      dismissPermanent();
      return;
    }
    const next = stepIndex + 1;
    const nextTool = TOUR_STEPS[next];
    setStepIndex(next);
    onOpenPalette();
    onSelectTool(nextTool);
  };

  if (dismissed || !stepTool || !entry) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90] bg-ink/20 md:bg-transparent" aria-hidden />
      <div
        ref={popupRef}
        role="dialog"
        aria-labelledby="label-tour-title"
        className="fixed z-[95] max-h-[min(40dvh,calc(100dvh-2rem))] w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-xl border-2 border-palm/25 bg-white p-3 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
        style={{
          top: layout?.top ?? VIEWPORT_PAD,
          left: layout?.left ?? window.innerWidth / 2,
          visibility: layout ? "visible" : "hidden",
        }}
      >
        <p id="label-tour-title" className="text-sm font-black text-palm dark:text-emerald-300">
          {entry.tourTitle}
        </p>
        <div
          className="store-rich mt-2 text-xs text-ink/85 dark:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: entry.tourHtml }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnMainSm}
            onClick={advance}
          >
            {stepIndex >= TOUR_STEPS.length - 1 ? "Done" : "OK"}
          </button>
          <button
            type="button"
            className="text-xs font-bold text-ink/60 underline dark:text-zinc-400"
            onClick={dismissPermanent}
          >
            Don&apos;t show again
          </button>
        </div>
        {layout?.placement === "below" ? (
          <span
            className="pointer-events-none absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-white dark:border-b-zinc-900"
            aria-hidden
          />
        ) : (
          <span
            className="pointer-events-none absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white dark:border-t-zinc-900"
            aria-hidden
          />
        )}
      </div>
    </>,
    document.body,
  );
}
