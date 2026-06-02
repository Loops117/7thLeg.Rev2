/** Resize handles for label canvas elements (axis-aligned box, rotation-aware deltas). */

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type ElementRect = { x: number; y: number; width: number; height: number };

export const LABEL_ELEMENT_MIN_SIZE_PX = 20;

export function designDeltaToLocal(
  dx: number,
  dy: number,
  rotationDeg: number,
): { localDx: number; localDy: number } {
  const rad = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    localDx: dx * cos - dy * sin,
    localDy: dx * sin + dy * cos,
  };
}

function affects(handle: ResizeHandle, edge: "n" | "e" | "s" | "w"): boolean {
  switch (edge) {
    case "n":
      return handle === "n" || handle === "ne" || handle === "nw";
    case "s":
      return handle === "s" || handle === "se" || handle === "sw";
    case "e":
      return handle === "e" || handle === "ne" || handle === "se";
    case "w":
      return handle === "w" || handle === "nw" || handle === "sw";
  }
}

export function resizeElementRect(
  handle: ResizeHandle,
  orig: ElementRect,
  localDx: number,
  localDy: number,
  bounds: { left: number; top: number; right: number; bottom: number },
  minSize = LABEL_ELEMENT_MIN_SIZE_PX,
): ElementRect {
  let x = orig.x;
  let y = orig.y;
  let width = orig.width;
  let height = orig.height;

  if (affects(handle, "e")) {
    width = orig.width + localDx;
  }
  if (affects(handle, "w")) {
    width = orig.width - localDx;
    x = orig.x + localDx;
  }
  if (affects(handle, "s")) {
    height = orig.height + localDy;
  }
  if (affects(handle, "n")) {
    height = orig.height - localDy;
    y = orig.y + localDy;
  }

  if (width < minSize) {
    if (affects(handle, "w")) {
      x = orig.x + orig.width - minSize;
    }
    width = minSize;
  }
  if (height < minSize) {
    if (affects(handle, "n")) {
      y = orig.y + orig.height - minSize;
    }
    height = minSize;
  }

  if (x < bounds.left) {
    width -= bounds.left - x;
    x = bounds.left;
  }
  if (y < bounds.top) {
    height -= bounds.top - y;
    y = bounds.top;
  }
  if (x + width > bounds.right) {
    width = bounds.right - x;
  }
  if (y + height > bounds.bottom) {
    height = bounds.bottom - y;
  }

  width = Math.max(minSize, width);
  height = Math.max(minSize, height);

  if (x + width > bounds.right) {
    x = bounds.right - width;
  }
  if (y + height > bounds.bottom) {
    y = bounds.bottom - height;
  }
  if (x < bounds.left) {
    x = bounds.left;
  }
  if (y < bounds.top) {
    y = bounds.top;
  }

  return { x, y, width, height };
}
