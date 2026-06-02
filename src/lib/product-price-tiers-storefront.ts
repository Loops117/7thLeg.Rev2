import {
  parsePriceTiersJson,
  validatePriceTiersInput,
  type LabelPriceTier,
} from "@/lib/label-template-tiers";
import { formatPriceUsd } from "@/lib/product-slug";

export type ProductPriceTier = LabelPriceTier;

export { validatePriceTiersInput as validateProductPriceTiersInput };

/** Parse product tiers; null/empty means no bulk pricing (use base price only). */
export function parseProductPriceTiersJson(raw: unknown): ProductPriceTier[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw) && raw.length === 0) return null;
  return parsePriceTiersJson(raw);
}

/** Unit price in cents for a variation at quantity (tiers are full unit prices for that variation). */
export function unitCentsForVariantQuantity(
  tiersJson: unknown,
  fallbackUnitCents: number,
  quantity: number,
): number {
  const tiers = parseProductPriceTiersJson(tiersJson);
  if (!tiers?.length) return fallbackUnitCents;
  const q = Math.max(1, Math.floor(quantity));
  let matched: number | null = null;
  for (const t of tiers) {
    if (t.minQty <= q) matched = t.unitCents;
  }
  return matched ?? fallbackUnitCents;
}

/** @deprecated Use unitCentsForVariantQuantity */
export const unitBaseCentsForProductQuantity = unitCentsForVariantQuantity;

export function productTierSummary(tiersJson: unknown): string {
  const tiers = parseProductPriceTiersJson(tiersJson);
  if (!tiers?.length) return "—";
  const parts = tiers.slice(0, 3).map((t) => `${formatPriceUsd(t.unitCents)} @ ${t.minQty}+`);
  const extra = tiers.length > 3 ? ` (+${tiers.length - 3} more)` : "";
  return parts.join(" · ") + extra;
}

export function productLineSubtotalCents(tiersJson: unknown, fallbackUnitCents: number, quantity: number): number {
  const q = Math.max(1, Math.floor(quantity));
  return unitCentsForVariantQuantity(tiersJson, fallbackUnitCents, q) * q;
}

export function productUnitCentsDisplay(tiersJson: unknown, fallbackUnitCents: number, quantity: number): string {
  return formatPriceUsd(unitCentsForVariantQuantity(tiersJson, fallbackUnitCents, quantity));
}

export type ProductTierBreakdownRow = {
  minQty: number;
  unitDisplay: string;
  active: boolean;
};

/** Rows for storefront bulk pricing table at the selected quantity. */
export function productTierBreakdownAtQuantity(
  tiersJson: unknown,
  quantity: number,
): ProductTierBreakdownRow[] {
  const list = parseProductPriceTiersJson(tiersJson);
  if (!list?.length) return [];
  const q = Math.max(1, Math.floor(quantity));
  const appliedMinQty = list.filter((t) => t.minQty <= q).at(-1)?.minQty ?? null;
  return list.map((t) => ({
    minQty: t.minQty,
    unitDisplay: formatPriceUsd(t.unitCents),
    active: appliedMinQty != null && t.minQty === appliedMinQty,
  }));
}
