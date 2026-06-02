import { formatPriceUsd } from "@/lib/product-slug";

/** How variation option buttons show price on the product page. */
export type VariantPriceDisplay = "full" | "difference";

export function parseVariantPriceDisplay(raw: unknown): VariantPriceDisplay {
  return raw === "full" ? "full" : "difference";
}

/** Text after the label, without wrapping parens — null = show nothing. */
export function variantOptionPriceLabel(
  display: VariantPriceDisplay,
  basePriceCents: number,
  priceDeltaCents: number,
): string | null {
  if (display === "full") {
    return formatPriceUsd(basePriceCents + priceDeltaCents);
  }
  if (priceDeltaCents === 0) {
    return null;
  }
  const sign = priceDeltaCents > 0 ? "+" : "";
  return `${sign}${formatPriceUsd(priceDeltaCents)}`;
}
