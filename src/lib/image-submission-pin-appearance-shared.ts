export type ImageSubmissionPinAppearance = {
  sizePx: number;
  fillColor: string;
  borderWidthPx: number;
  borderColor: string;
  customImageUrl: string;
  /** Hover ring on pins in gallery viewers (tagged product list + pin marker). */
  highlightColor: string;
};

export const IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS: ImageSubmissionPinAppearance = {
  sizePx: 20,
  fillColor: "#2d6a4f",
  borderWidthPx: 2,
  borderColor: "#000000",
  customImageUrl: "",
  highlightColor: "#f4a261",
};

function normalizeHexColor(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function normalizeImageSubmissionPinAppearance(row: {
  imageSubmissionPinSizePx?: number | null;
  imageSubmissionPinFillColor?: string | null;
  imageSubmissionPinBorderWidthPx?: number | null;
  imageSubmissionPinBorderColor?: string | null;
  imageSubmissionPinCustomImageUrl?: string | null;
  imageSubmissionPinHighlightColor?: string | null;
} | null): ImageSubmissionPinAppearance {
  const d = IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS;
  if (!row) return { ...d };
  const custom =
    typeof row.imageSubmissionPinCustomImageUrl === "string" ? row.imageSubmissionPinCustomImageUrl.trim() : "";
  return {
    sizePx: Math.min(64, Math.max(8, Math.round(row.imageSubmissionPinSizePx ?? d.sizePx))),
    fillColor: normalizeHexColor(row.imageSubmissionPinFillColor, d.fillColor),
    borderWidthPx: Math.min(8, Math.max(0, Math.round(row.imageSubmissionPinBorderWidthPx ?? d.borderWidthPx))),
    borderColor: normalizeHexColor(row.imageSubmissionPinBorderColor, d.borderColor),
    customImageUrl: custom,
    highlightColor: normalizeHexColor(row.imageSubmissionPinHighlightColor, d.highlightColor),
  };
}

export function pinMarkerUsesCustomImage(appearance: ImageSubmissionPinAppearance): boolean {
  return appearance.customImageUrl.length > 0;
}
