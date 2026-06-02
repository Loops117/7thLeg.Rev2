import type { CSSProperties } from "react";
import type { LabelPreviewWatermarkKind, WatermarkPlacement } from "@/lib/site-config-types";

function clampOpacity(opacityPercent: number): number {
  return Math.min(1, Math.max(0, opacityPercent / 100));
}

function clampScale(scalePercent: number): number {
  return Math.min(3, Math.max(0.25, scalePercent / 100));
}

function placementTransformOrigin(placement: WatermarkPlacement): string {
  switch (placement) {
    case "bottomLeft":
      return "left bottom";
    case "topRight":
      return "right top";
    case "topLeft":
      return "left top";
    case "center":
      return "center center";
    case "stretch":
      return "center center";
    case "bottomRight":
    default:
      return "right bottom";
  }
}

/** CSS for composited watermark image overlay on label preview mock. */
export function labelWatermarkImageStyle(
  placement: WatermarkPlacement,
  opacityPercent: number,
  scalePercent = 100,
): CSSProperties {
  const op = clampOpacity(opacityPercent);
  const scale = clampScale(scalePercent);
  const origin = placementTransformOrigin(placement);
  const base: CSSProperties = {
    position: "absolute",
    opacity: op,
    pointerEvents: "none",
    maxWidth: "44%",
    maxHeight: "44%",
    objectFit: "contain",
    transformOrigin: origin,
    transform: `scale(${scale})`,
  };
  switch (placement) {
    case "bottomLeft":
      return { ...base, left: "5%", bottom: "5%" };
    case "topRight":
      return { ...base, right: "5%", top: "5%" };
    case "topLeft":
      return { ...base, left: "5%", top: "5%" };
    case "center":
      return {
        ...base,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
        maxWidth: "55%",
        maxHeight: "55%",
      };
    case "stretch":
      return {
        ...base,
        inset: "6%",
        maxWidth: "none",
        maxHeight: "none",
        width: "auto",
        height: "auto",
        objectFit: "contain",
        transform: `scale(${scale})`,
      };
    case "bottomRight":
    default:
      return { ...base, right: "5%", bottom: "5%" };
  }
}

/** CSS for text watermark on label preview mock. */
export function labelWatermarkTextStyle(
  placement: WatermarkPlacement,
  opacityPercent: number,
  scalePercent = 100,
): CSSProperties {
  const op = clampOpacity(opacityPercent);
  const scale = clampScale(scalePercent);
  const baseFontPx = 13;
  const fontSize = Math.round(baseFontPx * scale);

  const textBlock: CSSProperties = {
    position: "absolute",
    margin: 0,
    padding: "0.25rem 0.5rem",
    fontSize,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: `rgba(30, 30, 30, ${op})`,
    textShadow: `0 0 1px rgba(255,255,255,${Math.min(0.85, op + 0.2)})`,
    pointerEvents: "none",
    maxWidth: placement === "stretch" ? "88%" : "72%",
    textAlign: "center",
    transform: `rotate(-18deg) scale(${scale})`,
    transformOrigin: "center center",
  };

  switch (placement) {
    case "bottomLeft":
      return { ...textBlock, left: "6%", bottom: "10%", transform: `rotate(-12deg) scale(${scale})` };
    case "topRight":
      return { ...textBlock, right: "6%", top: "10%", transform: `rotate(-12deg) scale(${scale})` };
    case "topLeft":
      return { ...textBlock, left: "6%", top: "10%", transform: `rotate(-12deg) scale(${scale})` };
    case "bottomRight":
      return { ...textBlock, right: "6%", bottom: "10%", transform: `rotate(-12deg) scale(${scale})` };
    case "stretch":
    case "center":
    default:
      return {
        ...textBlock,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(-18deg) scale(${scale})`,
        maxWidth: "85%",
      };
  }
}

export function labelPreviewProtectionClassNames(enabled: boolean): string {
  if (!enabled) return "";
  return "select-none [&_img]:pointer-events-none [&_canvas]:pointer-events-none [&_*]:[-webkit-user-drag:none]";
}

/** Resolve which image URL to show for the active watermark kind. */
export function resolveLabelPreviewWatermarkImageUrl(
  kind: LabelPreviewWatermarkKind,
  globalWatermarkUrl: string,
  customWatermarkUrl: string,
): string | null {
  if (kind === "global") {
    const u = globalWatermarkUrl.trim();
    return u || null;
  }
  if (kind === "custom") {
    const u = customWatermarkUrl.trim();
    return u || null;
  }
  return null;
}
