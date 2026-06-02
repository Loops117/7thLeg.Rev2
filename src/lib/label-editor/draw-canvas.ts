import type { BrushStyle, DrawStroke } from "@/lib/label-editor/document";

function lineDash(style: BrushStyle): number[] | undefined {
  switch (style) {
    case "dashed":
      return [12, 8];
    case "dotted":
      return [2, 6];
    default:
      return undefined;
  }
}

function strokePath(ctx: CanvasRenderingContext2D, stroke: DrawStroke): void {
  if (stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(lineDash(stroke.style) ?? []);
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Paint strokes in document order so new brush work appears above prior erasing. */
export function renderStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  current: DrawStroke | null,
  clip?: { x: number; y: number; width: number; height: number },
): void {
  const all = current ? [...strokes, current] : strokes;

  if (clip) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
  }

  for (const stroke of all) {
    if (stroke.erase) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }
    strokePath(ctx, stroke);
  }

  ctx.globalCompositeOperation = "source-over";

  if (clip) ctx.restore();
}
