/** Clamp design coordinates to the inner editable region (inside red margin). */

export function editableBounds(
  canvasWidthPx: number,
  canvasHeightPx: number,
  inset: number,
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: inset,
    top: inset,
    right: canvasWidthPx - inset,
    bottom: canvasHeightPx - inset,
  };
}

export function clampPointToEditableRegion(
  x: number,
  y: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
  inset: number,
): { x: number; y: number } {
  const b = editableBounds(canvasWidthPx, canvasHeightPx, inset);
  return {
    x: Math.min(b.right, Math.max(b.left, x)),
    y: Math.min(b.bottom, Math.max(b.top, y)),
  };
}

export function isPointInEditableRegion(
  x: number,
  y: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
  inset: number,
): boolean {
  const b = editableBounds(canvasWidthPx, canvasHeightPx, inset);
  return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
}
