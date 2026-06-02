import { renderStrokesOnCanvas } from "@/lib/label-editor/draw-canvas";
import type {
  LabelCanvasElement,
  LabelEditorDocument,
  LabelImageElement,
  LabelStickerElement,
  LabelTableElement,
  LabelTextElement,
} from "@/lib/label-editor/document";
import {
  getTableCellStyle,
  resolveTableCellContent,
  resolveTextContent,
} from "@/lib/label-editor/document";
import { getTableColWidthsPx, getTableRowHeightsPx } from "@/lib/label-editor/table-layout";
import { fontSizePxFromPercent, fitFontSizePx } from "@/lib/label-editor/typography";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import {
  clampBorderConfigToCanvas,
  estimateBorderTextWidthPx,
  type LabelBorderConfig,
} from "@/lib/label-template-border";
import { editableRegionPx } from "@/lib/label-template-canvas";
import type { LabelFulfillmentPrintSettings, LabelPrintSheetSpec } from "@/lib/order-label-print-plan";
import { mmToPrintPx } from "@/lib/label-print-units";
import sharp from "sharp";

type PrintCtx = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textBaseline: CanvasTextBaseline;
  textAlign: CanvasTextAlign;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): TextMetrics;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
  ): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
};

async function loadCanvasKit() {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  return { createCanvas, loadImage };
}

function absAssetUrl(origin: string, path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const base = origin.replace(/\/+$/, "");
  return p.startsWith("/") ? `${base}${p}` : `${base}/${p}`;
}

function primaryFontFamily(fontFamily: string): string {
  const first = fontFamily.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "") || "Arial";
  return first;
}

function canvasFont(style: {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}): string {
  const weight = style.bold ? "bold" : "normal";
  const slant = style.italic ? "italic" : "normal";
  return `${weight} ${slant} ${Math.round(style.fontSize)}px ${primaryFontFamily(style.fontFamily)}`;
}

function drawRotated(
  ctx: PrintCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number,
  draw: () => void,
): void {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);
  draw();
  ctx.restore();
}

function drawTextInBox(
  ctx: PrintCtx,
  text: string,
  boxW: number,
  boxH: number,
  style: {
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
    textFit?: boolean;
  },
): void {
  const content = text || "";
  let sizePx = fontSizePxFromPercent(style.fontSize, boxH);
  if (style.textFit && content) {
    sizePx = fitFontSizePx(content, boxW, boxH, sizePx);
  }
  ctx.fillStyle = style.color;
  ctx.font = canvasFont({ ...style, fontSize: sizePx });
  ctx.textBaseline = "middle";

  const pad = 4;
  const lines = content.split(/\r?\n/);
  const lineHeight = sizePx * 1.15;
  const blockH = lines.length * lineHeight;
  let y =
    style.verticalAlign === "bottom"
      ? boxH - pad - blockH + lineHeight / 2
      : style.verticalAlign === "middle"
        ? (boxH - blockH) / 2 + lineHeight / 2
        : pad + lineHeight / 2;

  for (const line of lines) {
    const metrics = ctx.measureText(line);
    let x = pad;
    if (style.align === "center") x = (boxW - metrics.width) / 2;
    else if (style.align === "right") x = boxW - pad - metrics.width;
    ctx.fillText(line, x, y);
    if (style.underline && line) {
      const uy = y + sizePx * 0.35;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(1, sizePx / 14);
      ctx.beginPath();
      ctx.moveTo(x, uy);
      ctx.lineTo(x + metrics.width, uy);
      ctx.stroke();
    }
    y += lineHeight;
  }
}

function drawBorder(ctx: PrintCtx, cw: number, ch: number, raw: LabelBorderConfig): void {
  const cfg = clampBorderConfigToCanvas(raw, cw, ch);
  if (cfg.mode === "none") return;

  const bi = Math.min(Math.max(0, cfg.insetPx), Math.floor(Math.min(cw, ch) / 2) - 2);
  const s = Math.max(1, Math.min(48, cfg.strokePx));
  const c = cfg.color;
  const iw = cw - 2 * bi;
  const xl = bi + s / 2;
  const xr = cw - bi - s / 2;
  const yt = bi + s / 2;
  const yb = ch - bi - s / 2;
  const xc = (xl + xr) / 2;

  ctx.strokeStyle = c;
  ctx.lineWidth = s;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  if (cfg.mode === "solid") {
    ctx.strokeRect(xl, yt, iw - s, ch - 2 * bi - s);
    return;
  }

  const fs = Math.max(10, Math.min(28, s * 4.5));
  const text = cfg.bottomText.trim() || "Your site.com";
  const pad = Math.max(0, cfg.textPaddingPx);
  const gapW = Math.min(iw * 0.72, estimateBorderTextWidthPx(text, fs) + pad * 2);
  const tx = xc + cfg.textOffsetXPx;
  let gapA = tx - gapW / 2;
  let gapB = tx + gapW / 2;
  if (gapA < xl) {
    gapB += xl - gapA;
    gapA = xl;
  }
  if (gapB > xr) {
    gapA -= gapB - xr;
    gapB = xr;
  }
  gapA = Math.max(xl, gapA);
  gapB = Math.min(xr, gapB);

  const onBottom = cfg.textPlacement === "bottom";
  const edgeY = onBottom ? yb : yt;

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  if (onBottom) {
    line(xl, yt, xr, yt);
    line(xl, yt, xl, yb);
    line(xr, yt, xr, yb);
    line(xl, yb, gapA, yb);
    line(gapB, yb, xr, yb);
  } else {
    line(xl, yb, xr, yb);
    line(xl, yt, xl, yb);
    line(xr, yt, xr, yb);
    line(xl, yt, gapA, yt);
    line(gapB, yt, xr, yt);
  }

  ctx.fillStyle = cfg.textColor?.trim() || c;
  ctx.font = `600 ${fs}px system-ui, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, tx, edgeY + cfg.textOffsetYPx);
}

async function drawBaseLayout(
  ctx: PrintCtx,
  template: LabelTemplatePickerOption,
  origin: string,
  loadImage: Awaited<ReturnType<typeof loadCanvasKit>>["loadImage"],
): Promise<void> {
  const url = template.baseLayoutImageUrl?.trim();
  if (!url) return;

  try {
    const res = await fetch(absAssetUrl(origin, url));
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);
    const cw = template.canvasWidthPx;
    const ch = template.canvasHeightPx;
    const scale = template.baseLayoutScalePercent / 100;
    const rot = (template.baseLayoutRotationDeg * Math.PI) / 180;
    const opacity = template.baseLayoutOpacityPercent / 100;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(cw / 2 + template.baseLayoutOffsetXPx, ch / 2 + template.baseLayoutOffsetYPx);
    ctx.rotate(rot);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  } catch {
    /* skip missing layout image */
  }
}

/** Match editor `object-contain` — uniform scale, centered in the element box. */
function drawImageContained(
  ctx: PrintCtx,
  img: { width: number; height: number },
  boxW: number,
  boxH: number,
  draw: (dx: number, dy: number, dw: number, dh: number) => void,
): void {
  const iw = img.width;
  const ih = img.height;
  if (iw <= 0 || ih <= 0) return;
  const scale = Math.min(boxW / iw, boxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  draw((boxW - dw) / 2, (boxH - dh) / 2, dw, dh);
}

async function drawImageElement(
  ctx: PrintCtx,
  el: LabelImageElement,
  origin: string,
  loadImage: Awaited<ReturnType<typeof loadCanvasKit>>["loadImage"],
): Promise<void> {
  const src = el.src?.trim();
  if (!src) return;
  try {
    const res = await fetch(absAssetUrl(origin, src));
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);
    drawRotated(ctx, el.x, el.y, el.width, el.height, el.rotation, () => {
      ctx.save();
      ctx.globalAlpha = el.opacity / 100;
      drawImageContained(ctx, img, el.width, el.height, (dx, dy, dw, dh) => {
        ctx.drawImage(img, dx, dy, dw, dh);
      });
      ctx.restore();
    });
  } catch {
    /* skip */
  }
}

async function drawStickerElement(
  ctx: PrintCtx,
  el: LabelStickerElement,
  origin: string,
  loadImage: Awaited<ReturnType<typeof loadCanvasKit>>["loadImage"],
): Promise<void> {
  let stickerImg: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (el.shape === "image" && el.imageUrl?.trim()) {
    try {
      const res = await fetch(absAssetUrl(origin, el.imageUrl));
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        stickerImg = await loadImage(buf);
      }
    } catch {
      stickerImg = null;
    }
  }

  drawRotated(ctx, el.x, el.y, el.width, el.height, el.rotation, () => {
    ctx.save();
    ctx.globalAlpha = el.opacity / 100;
    if (stickerImg) {
      drawImageContained(ctx, stickerImg, el.width, el.height, (dx, dy, dw, dh) => {
        ctx.drawImage(stickerImg, dx, dy, dw, dh);
      });
    } else if (el.shape === "circle") {
      ctx.fillStyle = el.fill;
      ctx.beginPath();
      ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = el.fill;
      ctx.fillRect(0, 0, el.width, el.height);
    }
    ctx.restore();
  });
}

function drawTextElement(ctx: PrintCtx, el: LabelTextElement, doc: LabelEditorDocument): void {
  const text = resolveTextContent(el, doc);
  drawRotated(ctx, el.x, el.y, el.width, el.height, el.rotation, () => {
    drawTextInBox(ctx, text, el.width, el.height, el);
  });
}

function drawTableElement(ctx: PrintCtx, el: LabelTableElement, doc: LabelEditorDocument): void {
  const colWidths = getTableColWidthsPx(el);
  const rowHeights = getTableRowHeightsPx(el);
  drawRotated(ctx, el.x, el.y, el.width, el.height, el.rotation, () => {
    let y = 0;
    for (let r = 0; r < el.rows; r++) {
      let x = 0;
      const rh = rowHeights[r] ?? el.height / el.rows;
      for (let c = 0; c < el.cols; c++) {
        const cw = colWidths[c] ?? el.width / el.cols;
        const idx = r * el.cols + c;
        if (el.showBorder) {
          ctx.strokeStyle = el.borderColor;
          ctx.lineWidth = el.borderWidth;
          ctx.strokeRect(x, y, cw, rh);
        }
        const style = getTableCellStyle(el, idx);
        const cellText = resolveTableCellContent(idx, el, doc);
        ctx.save();
        ctx.translate(x, y);
        drawTextInBox(ctx, cellText, cw, rh, style);
        ctx.restore();
        x += cw;
      }
      y += rh;
    }
  });
}

async function drawElement(
  ctx: PrintCtx,
  el: LabelCanvasElement,
  doc: LabelEditorDocument,
  origin: string,
  loadImage: Awaited<ReturnType<typeof loadCanvasKit>>["loadImage"],
): Promise<void> {
  switch (el.kind) {
    case "text":
      drawTextElement(ctx, el, doc);
      break;
    case "table":
      drawTableElement(ctx, el, doc);
      break;
    case "image":
      await drawImageElement(ctx, el, origin, loadImage);
      break;
    case "sticker":
      await drawStickerElement(ctx, el, origin, loadImage);
      break;
  }
}

/** Render a single label design to a print-ready PNG buffer (no preview watermark). */
export async function renderOrderLabelEntryToPng(
  template: LabelTemplatePickerOption,
  doc: LabelEditorDocument,
  origin: string,
  options?: { transparentBackground?: boolean },
): Promise<Buffer> {
  const { createCanvas, loadImage } = await loadCanvasKit();
  const cw = template.canvasWidthPx;
  const ch = template.canvasHeightPx;
  const canvas = createCanvas(cw, ch);
  const ctx = canvas.getContext("2d") as unknown as PrintCtx;

  if (!options?.transparentBackground) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.clearRect(0, 0, cw, ch);
  }

  await drawBaseLayout(ctx, template, origin, loadImage);

  const { inset, widthPx: editW, heightPx: editH } = editableRegionPx(cw, ch, template.marginPx);
  renderStrokesOnCanvas(ctx as unknown as CanvasRenderingContext2D, doc.strokes, null, {
    x: inset,
    y: inset,
    width: editW,
    height: editH,
  });

  for (const el of doc.elements) {
    await drawElement(ctx, el, doc, origin, loadImage);
  }

  drawBorder(ctx, cw, ch, template.borderConfig);

  const raw = canvas.toBuffer("image/png");
  return sharp(raw).png().toBuffer();
}

export function orderLabelPrintFilename(displayName: string, entryIndex: number): string {
  const base = displayName
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "label";
  return `${base}-${entryIndex + 1}.png`;
}

/** Scale label artwork to the print cell without stretching (matches editor canvas aspect). */
async function resizeLabelToPrintCell(
  labelBuf: Buffer,
  template: LabelTemplatePickerOption,
  cellW: number,
  cellH: number,
): Promise<{ buffer: Buffer; offsetX: number; offsetY: number }> {
  const cw = Math.max(1, template.canvasWidthPx);
  const ch = Math.max(1, template.canvasHeightPx);
  const scale = Math.min(cellW / cw, cellH / ch);
  const w = Math.max(1, Math.round(cw * scale));
  const h = Math.max(1, Math.round(ch * scale));
  const buffer = await sharp(labelBuf).resize(w, h, { fit: "inside" }).png().toBuffer();
  return {
    buffer,
    offsetX: Math.round((cellW - w) / 2),
    offsetY: Math.round((cellH - h) / 2),
  };
}

/** Composite one or more label copies onto a print sheet (fulfillment imposition). */
export async function renderOrderLabelSheetToPng(
  spec: LabelPrintSheetSpec,
  settings: LabelFulfillmentPrintSettings,
  origin: string,
): Promise<Buffer> {
  const dpi = settings.printDpi;
  const imposition = spec.imposition;
  const sheetW = mmToPrintPx(imposition.sheetWidthMm, dpi);
  const sheetH = mmToPrintPx(imposition.sheetHeightMm, dpi);
  const labelW = mmToPrintPx(spec.labelWidthMm, dpi);
  const labelH = mmToPrintPx(spec.labelHeightMm, dpi);
  const marginPx = mmToPrintPx(settings.sheetMarginMm, dpi);
  const gapPx = mmToPrintPx(settings.labelGapMm, dpi);

  const transparentSheet = settings.printTransparentBackground;

  const renderCache = new Map<string, Buffer>();
  const labelComposites: { input: Buffer; left: number; top: number }[] = [];

  for (const { instance, col, row } of spec.placements) {
    const cellX = marginPx + col * (labelW + gapPx);
    const cellY = marginPx + row * (labelH + gapPx);
    const cacheKey = `${instance.lineId}:${instance.entryIndex}`;
    let labelBuf = renderCache.get(cacheKey);
    if (!labelBuf) {
      labelBuf = await renderOrderLabelEntryToPng(instance.template, instance.doc, origin);
      renderCache.set(cacheKey, labelBuf);
    }
    const { buffer, offsetX, offsetY } = await resizeLabelToPrintCell(
      labelBuf,
      instance.template,
      labelW,
      labelH,
    );
    labelComposites.push({
      input: buffer,
      left: Math.round(cellX + offsetX),
      top: Math.round(cellY + offsetY),
    });
  }

  return sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: transparentSheet
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(labelComposites)
    .png()
    .toBuffer();
}
