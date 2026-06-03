/** Layout math for hotspots on images using CSS object-contain. */

export type PercentRect = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type ImageDisplayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function objectContainDisplayRect(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): ImageDisplayRect | null {
  if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Pointer position as % of the visible image (0–100), clamped to image bounds. */
export function clientPointToImagePercent(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  naturalWidth: number,
  naturalHeight: number,
): { x: number; y: number } {
  const display = objectContainDisplayRect(
    containerRect.width,
    containerRect.height,
    naturalWidth,
    naturalHeight,
  );
  if (!display) return { x: 0, y: 0 };

  const localX = clientX - containerRect.left - display.left;
  const localY = clientY - containerRect.top - display.top;
  const x = (localX / display.width) * 100;
  const y = (localY / display.height) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

export function boundingBoxFromPoints(points: { x: number; y: number }[]): PercentRect | null {
  if (points.length < 2) return null;
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const p of points.slice(1)) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const widthPercent = maxX - minX;
  const heightPercent = maxY - minY;
  if (widthPercent < 1 && heightPercent < 1) return null;
  return {
    xPercent: minX,
    yPercent: minY,
    widthPercent: Math.max(1, widthPercent),
    heightPercent: Math.max(1, heightPercent),
  };
}

/** Center of a pin (image %) → CSS % for the pin element (use with translate -50% -50%). */
export function pinCenterToContainerStyle(
  pinXPercent: number,
  pinYPercent: number,
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { left: string; top: string } | null {
  return hotspotToContainerPercentStyle(
    {
      xPercent: clampPercent(pinXPercent),
      yPercent: clampPercent(pinYPercent),
      widthPercent: 0,
      heightPercent: 0,
    },
    containerWidth,
    containerHeight,
    naturalWidth,
    naturalHeight,
  );
}

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Map image-percent hotspot to CSS % positions relative to the container. */
export function hotspotToContainerPercentStyle(
  hotspot: PercentRect,
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { left: string; top: string; width: string; height: string } | null {
  const display = objectContainDisplayRect(containerWidth, containerHeight, naturalWidth, naturalHeight);
  if (!display || containerWidth <= 0 || containerHeight <= 0) return null;

  const leftPx = display.left + (hotspot.xPercent / 100) * display.width;
  const topPx = display.top + (hotspot.yPercent / 100) * display.height;
  const widthPx = (hotspot.widthPercent / 100) * display.width;
  const heightPx = (hotspot.heightPercent / 100) * display.height;

  return {
    left: `${(leftPx / containerWidth) * 100}%`,
    top: `${(topPx / containerHeight) * 100}%`,
    width: `${(widthPx / containerWidth) * 100}%`,
    height: `${(heightPx / containerHeight) * 100}%`,
  };
}

/** Position an overlay (e.g. SVG) exactly over the object-contain image. */
export function imageDisplayOverlayBox(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { left: string; top: string; width: string; height: string } | null {
  const display = objectContainDisplayRect(containerWidth, containerHeight, naturalWidth, naturalHeight);
  if (!display || containerWidth <= 0 || containerHeight <= 0) return null;
  return {
    left: `${(display.left / containerWidth) * 100}%`,
    top: `${(display.top / containerHeight) * 100}%`,
    width: `${(display.width / containerWidth) * 100}%`,
    height: `${(display.height / containerHeight) * 100}%`,
  };
}
