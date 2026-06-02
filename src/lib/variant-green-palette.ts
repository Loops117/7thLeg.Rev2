/**
 * Default storefront variation buttons: greens starting at brand green, each option darker.
 * Custom per-variation hex colors in admin override this.
 */
export const VARIANT_LOGO_GREEN = "#12c705";

/** {@link VARIANT_LOGO_GREEN} first, then progressively darker (no lighter tints). */
const GREEN_STOPS = [
  VARIANT_LOGO_GREEN,
  "#10b304",
  "#0e9f03",
  "#0c8a03",
  "#0a7503",
  "#086002",
  "#064b02",
  "#053d02",
  "#042f01",
] as const;

function stopIndex(index: number, total: number): number {
  if (total <= 1) {
    return 0;
  }
  const t = index / (total - 1);
  return Math.round(t * (GREEN_STOPS.length - 1));
}

/** Inline styles for automatic (non-custom) variation picker buttons. */
export function variantGreenPaletteStyle(
  index: number,
  total: number,
  selected: boolean,
): { backgroundColor: string; borderColor: string; color: string } {
  const hex = GREEN_STOPS[stopIndex(index, total)] ?? VARIANT_LOGO_GREEN;
  const border = `color-mix(in srgb, ${hex} 65%, #000000)`;
  if (selected) {
    return {
      backgroundColor: hex,
      borderColor: border,
      color: "#ffffff",
    };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${hex} 82%, #000000)`,
    borderColor: border,
    color: "#d1d5db",
  };
}

/** @deprecated Use {@link variantGreenPaletteStyle}. Kept for older imports. */
export const variantRainbowStyle = variantGreenPaletteStyle;
