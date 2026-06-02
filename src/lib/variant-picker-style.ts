import { normalizePaneColorHex } from "@/lib/pane-config";
import { variantGreenPaletteStyle } from "@/lib/variant-green-palette";

export type VariantPickerColors = {
  pickerBgHex?: string | null;
  pickerFgHex?: string | null;
  pickerBorderHex?: string | null;
};

export function hasCustomVariantPickerColors(colors: VariantPickerColors): boolean {
  return Boolean(
    normalizePaneColorHex(colors.pickerBgHex ?? "") &&
      normalizePaneColorHex(colors.pickerFgHex ?? "") &&
      normalizePaneColorHex(colors.pickerBorderHex ?? ""),
  );
}

/** Inline styles for storefront variation buttons (custom hex or logo green shades). */
export function variantPickerButtonStyle(
  colors: VariantPickerColors,
  index: number,
  total: number,
  selected: boolean,
): { backgroundColor: string; borderColor: string; color: string } {
  const bg = normalizePaneColorHex(colors.pickerBgHex ?? "");
  const fg = normalizePaneColorHex(colors.pickerFgHex ?? "");
  const border = normalizePaneColorHex(colors.pickerBorderHex ?? "");
  if (bg && fg && border) {
    if (selected) {
      return {
        backgroundColor: bg,
        borderColor: border,
        color: fg,
      };
    }
    return {
      backgroundColor: `color-mix(in srgb, ${bg} 88%, white)`,
      borderColor: border,
      color: fg,
    };
  }
  return variantGreenPaletteStyle(index, total, selected);
}
