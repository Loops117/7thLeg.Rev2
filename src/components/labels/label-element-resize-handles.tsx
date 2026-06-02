"use client";

import type { ResizeHandle } from "@/lib/label-editor/element-resize";

function stopBubble(e: React.PointerEvent) {
  e.stopPropagation();
  e.preventDefault();
}

const HANDLES: {
  id: ResizeHandle;
  className: string;
  cursor: string;
  aria: string;
}[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize", aria: "Resize top-left" },
  { id: "n", className: "left-1/2 top-0 w-5 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize", aria: "Resize top" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize", aria: "Resize top-right" },
  { id: "e", className: "right-0 top-1/2 h-5 -translate-y-1/2 translate-x-1/2", cursor: "ew-resize", aria: "Resize right" },
  { id: "se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize", aria: "Resize bottom-right" },
  { id: "s", className: "bottom-0 left-1/2 w-5 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize", aria: "Resize bottom" },
  { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize", aria: "Resize bottom-left" },
  { id: "w", className: "left-0 top-1/2 h-5 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize", aria: "Resize left" },
];

export function LabelElementResizeHandles({
  onResizeStart,
}: {
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void;
}) {
  return (
    <>
      {HANDLES.map((h) => {
        const isEdge = h.id === "n" || h.id === "s" || h.id === "e" || h.id === "w";
        return (
          <button
            key={h.id}
            type="button"
            aria-label={h.aria}
            className={`absolute z-20 touch-none border border-white bg-lagoon-dark shadow-sm dark:bg-emerald-600 ${
              isEdge ? "rounded-sm" : "h-2.5 w-2.5 rounded-sm"
            } ${h.className}`}
            style={{ cursor: h.cursor }}
            onPointerDown={(e) => {
              stopBubble(e);
              onResizeStart(h.id, e);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}
    </>
  );
}
