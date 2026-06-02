export type LabelBorderMode = "none" | "solid" | "solid_with_bottom_text";

export type LabelBorderTextPlacement = "top" | "bottom";

export type LabelBorderConfig = {
  mode: LabelBorderMode;
  /** Stroke width in design pixels (scaled in preview). */
  strokePx: number;
  /** Distance design px from outer label edge — border draws inside this inset. */
  insetPx: number;
  /** CSS color e.g. #1b4332 */
  color: string;
  /** Edge text color; defaults to stroke color when empty. */
  textColor: string;
  /** Shown when mode is solid_with_bottom_text */
  bottomText: string;
  /** Which edge gets the text gap. */
  textPlacement: LabelBorderTextPlacement;
  /** Extra horizontal space in the border gap around the text. */
  textPaddingPx: number;
  /** Shift text along the edge (design px; negative = left). */
  textOffsetXPx: number;
  /** Shift text perpendicular to the edge (design px; negative = up). */
  textOffsetYPx: number;
};

export const defaultLabelBorderConfig = (): LabelBorderConfig => ({
  mode: "none",
  strokePx: 6,
  insetPx: 0,
  color: "#1b4332",
  textColor: "",
  bottomText: "",
  textPlacement: "bottom",
  textPaddingPx: 8,
  textOffsetXPx: 0,
  textOffsetYPx: 0,
});

function clampOffset(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  const m = Math.max(0, Math.round(max));
  return Math.min(m, Math.max(-m, Math.round(n)));
}

/** How far edge text can move from center within the border inset (design px). */
export function borderTextOffsetLimits(
  canvasWidthPx: number,
  canvasHeightPx: number,
  cfg: Pick<LabelBorderConfig, "insetPx" | "strokePx" | "bottomText" | "textPaddingPx">,
): { maxX: number; maxY: number } {
  const cw = Math.max(1, canvasWidthPx);
  const ch = Math.max(1, canvasHeightPx);
  const bi = Math.min(Math.max(0, cfg.insetPx), Math.floor(Math.min(cw, ch) / 2) - 2);
  const s = Math.max(1, Math.min(48, cfg.strokePx));
  const xl = bi + s / 2;
  const xr = cw - bi - s / 2;
  const yt = bi + s / 2;
  const yb = ch - bi - s / 2;
  const fs = Math.max(10, Math.min(28, s * 4.5));
  const textHalf = estimateBorderTextWidthPx(cfg.bottomText.trim() || "Your site.com", fs) / 2;
  const innerW = Math.max(0, xr - xl);
  const innerH = Math.max(0, yb - yt);
  const maxX = Math.max(0, Math.floor(innerW / 2 - textHalf - 4));
  const maxY = Math.max(0, Math.floor(innerH / 2 - fs / 2 - 4));
  return { maxX, maxY };
}

export function clampBorderConfigToCanvas(
  cfg: LabelBorderConfig,
  canvasWidthPx: number,
  canvasHeightPx: number,
): LabelBorderConfig {
  const { maxX, maxY } = borderTextOffsetLimits(canvasWidthPx, canvasHeightPx, cfg);
  return {
    ...cfg,
    textOffsetXPx: clampOffset(cfg.textOffsetXPx, maxX),
    textOffsetYPx: clampOffset(cfg.textOffsetYPx, maxY),
  };
}

function parseTextPlacement(raw: unknown): LabelBorderTextPlacement {
  if (raw === "top") return "top";
  if (raw === "bottom") return "bottom";
  if (typeof raw === "string") {
    if (raw.startsWith("top")) return "top";
    if (raw.startsWith("bottom")) return "bottom";
  }
  return "bottom";
}

export function parseLabelBorderConfig(raw: unknown): LabelBorderConfig {
  const base = defaultLabelBorderConfig();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const mode = o.mode;
  const m =
    mode === "solid"
      ? "solid"
      : mode === "solid_with_bottom_text" || mode === "solid_with_edge_text"
        ? "solid_with_bottom_text"
        : "none";
  const strokePxRaw = Math.round(Number(o.strokePx));
  const strokePx = Number.isFinite(strokePxRaw) ? strokePxRaw : base.strokePx;
  const color =
    typeof o.color === "string" && o.color.trim()
      ? o.color.trim().slice(0, 40)
      : base.color;
  const textColor =
    typeof o.textColor === "string" && o.textColor.trim()
      ? o.textColor.trim().slice(0, 40)
      : base.textColor;
  const insetRaw = Math.round(Number(o.insetPx));
  const insetPx = Number.isFinite(insetRaw) ? insetRaw : base.insetPx;
  const bottomText = typeof o.bottomText === "string" ? o.bottomText.slice(0, 120) : "";
  const textPaddingRaw = Math.round(Number(o.textPaddingPx));
  const textPaddingPx = Number.isFinite(textPaddingRaw) ? textPaddingRaw : base.textPaddingPx;
  return {
    mode: m,
    strokePx: Math.min(64, Math.max(1, strokePx)),
    insetPx: Math.min(128, Math.max(0, insetPx)),
    color,
    textColor,
    bottomText,
    textPlacement: parseTextPlacement(o.textPlacement),
    textPaddingPx: Math.min(64, Math.max(0, textPaddingPx)),
    textOffsetXPx: clampOffset(Number(o.textOffsetXPx), 2048),
    textOffsetYPx: clampOffset(Number(o.textOffsetYPx), 2048),
  };
}

export function borderConfigForPayload(
  input: LabelBorderConfig,
  canvasWidthPx?: number,
  canvasHeightPx?: number,
): LabelBorderConfig {
  const parsed = parseLabelBorderConfig(input);
  if (canvasWidthPx != null && canvasHeightPx != null) {
    return clampBorderConfigToCanvas(parsed, canvasWidthPx, canvasHeightPx);
  }
  return parsed;
}

/** Rough text width in design px for gap sizing. */
export function estimateBorderTextWidthPx(text: string, fontSize: number): number {
  const t = text.trim() || "Your site.com";
  return Math.max(fontSize * 2.5, t.length * fontSize * 0.52);
}
