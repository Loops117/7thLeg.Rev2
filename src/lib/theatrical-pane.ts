import type { CSSProperties } from "react";

export type TheatricalElementKind = "video" | "image" | "text" | "link";

export const DEFAULT_THEATRICAL_STAGE_BG_HEX = "#1c1917";
export const DEFAULT_THEATRICAL_TEXT_COLOR_HEX = "#2c2416";
export const DEFAULT_THEATRICAL_TEXT_BG_HEX = "";
export const DEFAULT_THEATRICAL_FONT_SIZE_PX = 16;

export type TheatricalPaneElement = {
  id: string;
  kind: TheatricalElementKind;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  zIndex: number;
  videoUrl?: string;
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoLoop?: boolean;
  imageUrl?: string;
  html?: string;
  /** Text layer: box background (#rrggbb). Empty = transparent. */
  textBgHex?: string;
  /** Text layer: base font color (#rrggbb). */
  textColorHex?: string;
  /** Text layer: base font size in px. */
  fontSizePx?: number;
  linkHref?: string;
  linkLabel?: string;
  linkOpenInNewTab?: boolean;
};

export type TheatricalStageAspect = "32:9" | "21:9" | "2.35:1" | "16:9" | "4:3" | "tall";

export const DEFAULT_THEATRICAL_STAGE_MAX_HEIGHT_PX = 0;

/** Fixed layout width — text wraps here; stage scales uniformly to fit (editor + storefront). */
export const THEATRICAL_STAGE_REF_WIDTH_PX = 1200;

const STAGE_ASPECT_RATIOS: Record<TheatricalStageAspect, number> = {
  "32:9": 32 / 9,
  "21:9": 21 / 9,
  "2.35:1": 2.35,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  tall: 3 / 4,
};

export const THEATRICAL_STAGE_ASPECT_OPTIONS: { value: TheatricalStageAspect; label: string }[] = [
  { value: "32:9", label: "Ultra-wide banner (32:9)" },
  { value: "21:9", label: "Cinema wide (21:9)" },
  { value: "2.35:1", label: "Cinematic (2.35:1)" },
  { value: "16:9", label: "Widescreen (16:9)" },
  { value: "4:3", label: "Standard (4:3)" },
  { value: "tall", label: "Tall portrait (3:4)" },
];

export const THEATRICAL_STAGE_MAX_HEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Auto (full width)" },
  { value: 240, label: "Max 240px tall" },
  { value: 320, label: "Max 320px tall" },
  { value: 400, label: "Max 400px tall" },
  { value: 480, label: "Max 480px tall" },
  { value: 560, label: "Max 560px tall" },
  { value: 640, label: "Max 640px tall" },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function str(v: unknown, max = 4000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function bool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function num(v: unknown, fallback: number, min: number, max: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return clamp(Math.round(v * 100) / 100, min, max);
}

function int(v: unknown, fallback: number, min: number, max: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return clamp(Math.round(v), min, max);
}

/** Accepts #rgb or #rrggbb. Returns normalized #rrggbb or null. */
export function normalizeTheatricalColorHex(input: string | undefined): string | null {
  if (!input?.trim()) return null;
  let h = input.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const [, r, g, b] = h;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function parseTheatricalStageBgHex(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_THEATRICAL_STAGE_BG_HEX;
  return normalizeTheatricalColorHex(raw) ?? DEFAULT_THEATRICAL_STAGE_BG_HEX;
}

export function newTheatricalElementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultTheatricalElements(): TheatricalPaneElement[] {
  return [
    {
      id: newTheatricalElementId(),
      kind: "video",
      leftPct: 0,
      topPct: 0,
      widthPct: 100,
      heightPct: 100,
      zIndex: 1,
      videoUrl: "",
      videoAutoplay: false,
      videoMuted: true,
      videoLoop: true,
    },
    {
      id: newTheatricalElementId(),
      kind: "text",
      leftPct: 8,
      topPct: 62,
      widthPct: 84,
      heightPct: 28,
      zIndex: 2,
      html: "<p><strong>Your headline</strong></p><p>Drag elements on the stage. Add video, images, text, and links.</p>",
      textBgHex: DEFAULT_THEATRICAL_TEXT_BG_HEX,
      textColorHex: DEFAULT_THEATRICAL_TEXT_COLOR_HEX,
      fontSizePx: DEFAULT_THEATRICAL_FONT_SIZE_PX,
    },
  ];
}

export function parseTheatricalElements(raw: unknown): TheatricalPaneElement[] {
  if (!Array.isArray(raw)) return defaultTheatricalElements();
  const out: TheatricalPaneElement[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const kind = o.kind;
    if (kind !== "video" && kind !== "image" && kind !== "text" && kind !== "link") continue;
    const id = str(o.id, 80) || newTheatricalElementId();
    out.push({
      id,
      kind,
      leftPct: num(o.leftPct, 0, 0, 100),
      topPct: num(o.topPct, 0, 0, 100),
      widthPct: num(o.widthPct, 40, 4, 100),
      heightPct: num(o.heightPct, 20, 4, 100),
      zIndex: num(o.zIndex, 1, 0, 999),
      videoUrl: str(o.videoUrl, 2000),
      videoAutoplay: bool(o.videoAutoplay, false),
      videoMuted: bool(o.videoMuted, true),
      videoLoop: bool(o.videoLoop, true),
      imageUrl: str(o.imageUrl, 2000),
      html: str(o.html, 120_000),
      textBgHex: normalizeTheatricalColorHex(str(o.textBgHex, 16)) ?? "",
      textColorHex:
        normalizeTheatricalColorHex(str(o.textColorHex, 16)) ?? DEFAULT_THEATRICAL_TEXT_COLOR_HEX,
      fontSizePx: int(o.fontSizePx, DEFAULT_THEATRICAL_FONT_SIZE_PX, 10, 72),
      linkHref: str(o.linkHref, 2000),
      linkLabel: str(o.linkLabel, 200),
      linkOpenInNewTab: bool(o.linkOpenInNewTab, false),
    });
  }
  return out.length > 0 ? out.slice(0, 40) : defaultTheatricalElements();
}

export function parseTheatricalStageAspect(raw: unknown): TheatricalStageAspect {
  if (
    raw === "32:9" ||
    raw === "21:9" ||
    raw === "2.35:1" ||
    raw === "16:9" ||
    raw === "4:3" ||
    raw === "tall"
  ) {
    return raw;
  }
  return "16:9";
}

export function parseTheatricalStageMaxHeightPx(raw: unknown): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return DEFAULT_THEATRICAL_STAGE_MAX_HEIGHT_PX;
  return clamp(Math.round(raw), 0, 1200);
}

export function theatricalStageAspectRatio(aspect: TheatricalStageAspect): number {
  return STAGE_ASPECT_RATIOS[aspect];
}

export function theatricalStageRefHeightPx(aspect: TheatricalStageAspect): number {
  return THEATRICAL_STAGE_REF_WIDTH_PX / theatricalStageAspectRatio(aspect);
}

export type TheatricalStageComputedLayout = {
  scale: number;
  displayWidth: number;
  displayHeight: number;
  refWidth: number;
  refHeight: number;
};

/** Scale a fixed ref canvas to fit container — identical text wrap + layer positions everywhere. */
export function computeTheatricalStageLayout(
  containerWidthPx: number,
  aspect: TheatricalStageAspect,
  maxHeightPx = DEFAULT_THEATRICAL_STAGE_MAX_HEIGHT_PX,
): TheatricalStageComputedLayout {
  const refWidth = THEATRICAL_STAGE_REF_WIDTH_PX;
  const refHeight = theatricalStageRefHeightPx(aspect);
  let scale = containerWidthPx > 0 ? containerWidthPx / refWidth : 1;
  if (maxHeightPx > 0) {
    scale = Math.min(scale, maxHeightPx / refHeight);
  }
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;
  return {
    scale,
    displayWidth: refWidth * scale,
    displayHeight: refHeight * scale,
    refWidth,
    refHeight,
  };
}

export type TheatricalVideoEmbed =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string };

/** Resolve YouTube/Vimeo/direct file URLs for storefront embed. */
export function theatricalVideoEmbed(url: string): TheatricalVideoEmbed | null {
  const t = url.trim();
  if (!t) return null;

  const ytMatch =
    t.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i) ??
    t.match(/youtube\.com\/shorts\/([\w-]{6,})/i);
  if (ytMatch?.[1]) {
    return { kind: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  const vimeoMatch = t.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  if (/^https?:\/\//i.test(t) && /\.(mp4|webm|ogg)(\?|$)/i.test(t)) {
    return { kind: "video", src: t };
  }

  if (/^https?:\/\//i.test(t) && (t.includes("blob.vercel-storage.com") || t.includes("/uploads/"))) {
    return { kind: "video", src: t };
  }

  if (/^https?:\/\//i.test(t)) {
    return { kind: "iframe", src: t };
  }

  return null;
}

export function theatricalElementStyle(el: TheatricalPaneElement): CSSProperties {
  return {
    left: `${el.leftPct}%`,
    top: `${el.topPct}%`,
    width: `${el.widthPct}%`,
    height: `${el.heightPct}%`,
    zIndex: el.zIndex,
  };
}

export function theatricalTextBoxStyle(el: TheatricalPaneElement): CSSProperties {
  const style: CSSProperties = { ...theatricalElementStyle(el) };
  const bg = normalizeTheatricalColorHex(el.textBgHex);
  style.backgroundColor = bg ?? "transparent";
  const color = normalizeTheatricalColorHex(el.textColorHex);
  if (color) style.color = color;
  const size = int(el.fontSizePx, DEFAULT_THEATRICAL_FONT_SIZE_PX, 10, 72);
  style.fontSize = `${size}px`;
  return style;
}
