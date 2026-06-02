import {
  type LabelPriceTier,
  parsePriceTiersJson,
  unitCentsForLabelQuantity,
} from "@/lib/label-template-tiers";
import { formatPriceUsd } from "@/lib/product-slug";

export function labelLineSubtotalCents(tiers: LabelPriceTier[], quantity: number): number {
  const q = Math.max(1, Math.floor(quantity));
  return unitCentsForLabelQuantity(tiers, q) * q;
}

export function labelUnitCentsDisplay(tiers: LabelPriceTier[], quantity: number): string {
  return formatPriceUsd(unitCentsForLabelQuantity(tiers, quantity));
}

export function labelLineSubtotalDisplay(tiers: LabelPriceTier[], quantity: number): string {
  return formatPriceUsd(labelLineSubtotalCents(tiers, quantity));
}

export type LabelTierBreakdownRow = {
  minQty: number;
  unitDisplay: string;
  active: boolean;
};

/** Rows for admin / builder tier tables at a given quantity. */
export function labelTierBreakdownAtQuantity(tiers: LabelPriceTier[], quantity: number): LabelTierBreakdownRow[] {
  const q = Math.max(1, Math.floor(quantity));
  const list = parsePriceTiersJson(tiers);
  const applied = list.filter((t) => t.minQty <= q).at(-1) ?? list[0];
  const appliedMinQty = applied?.minQty ?? 1;
  return list.map((t) => ({
    minQty: t.minQty,
    unitDisplay: formatPriceUsd(t.unitCents),
    active: t.minQty === appliedMinQty,
  }));
}
