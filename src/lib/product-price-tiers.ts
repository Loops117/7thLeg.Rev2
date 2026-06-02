import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaRuntime } from "@/generated/prisma/client";
import { validatePriceTiersInput, type LabelPriceTier } from "@/lib/label-template-tiers";

export type ProductPriceTier = LabelPriceTier;

export {
  parseProductPriceTiersJson,
  unitCentsForVariantQuantity,
  unitBaseCentsForProductQuantity,
  productTierSummary,
  productLineSubtotalCents,
  productUnitCentsDisplay,
  productTierBreakdownAtQuantity,
  validateProductPriceTiersInput,
  type ProductTierBreakdownRow,
} from "@/lib/product-price-tiers-storefront";

export function priceTiersJsonForDb(
  tiers: ProductPriceTier[] | null | undefined,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (!tiers?.length) return PrismaRuntime.DbNull;
  const check = validatePriceTiersInput(tiers);
  if (!check.ok) throw new Error(check.error);
  return check.tiers as Prisma.InputJsonValue;
}
