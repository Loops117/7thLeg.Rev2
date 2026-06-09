"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  THEATRICAL_STAGE_REF_WIDTH_PX,
  computeTheatricalStageLayout,
  type TheatricalStageAspect,
  type TheatricalStageComputedLayout,
} from "@/lib/theatrical-pane";

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

function useTheatricalStageLayout(
  aspect: TheatricalStageAspect,
  maxHeightPx: number,
): {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  layout: TheatricalStageComputedLayout;
} {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TheatricalStageComputedLayout>(() =>
    computeTheatricalStageLayout(THEATRICAL_STAGE_REF_WIDTH_PX, aspect, maxHeightPx),
  );

  const remeasure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setLayout(computeTheatricalStageLayout(el.clientWidth, aspect, maxHeightPx));
  }, [aspect, maxHeightPx]);

  useLayoutEffect(() => {
    remeasure();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => remeasure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [remeasure]);

  return { viewportRef, layout };
}

export function TheatricalStageFrame({
  aspect,
  maxHeightPx = 0,
  bgHex,
  interactRef,
  onInteractPointerDown,
  stageClassName,
  canvasClassName,
  children,
}: {
  aspect: TheatricalStageAspect;
  maxHeightPx?: number;
  bgHex: string;
  /** Measured box for drag math (display size, not ref canvas). */
  interactRef?: Ref<HTMLDivElement>;
  onInteractPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  stageClassName?: string;
  canvasClassName?: string;
  children: ReactNode;
}) {
  const { viewportRef, layout } = useTheatricalStageLayout(aspect, maxHeightPx);

  return (
    <div ref={viewportRef} className="theatrical-stage-viewport w-full">
      <div
        ref={(node) => assignRef(interactRef, node)}
        className={stageClassName}
        style={{
          width: layout.displayWidth,
          height: layout.displayHeight,
          marginLeft: "auto",
          marginRight: "auto",
          position: "relative",
          overflow: "hidden",
        }}
        onPointerDown={onInteractPointerDown}
      >
        <div
          className={canvasClassName}
          style={{
            position: "relative",
            width: layout.refWidth,
            height: layout.refHeight,
            transform: `scale(${layout.scale})`,
            transformOrigin: "top left",
            backgroundColor: bgHex,
            overflow: "hidden",
            isolation: "isolate",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
