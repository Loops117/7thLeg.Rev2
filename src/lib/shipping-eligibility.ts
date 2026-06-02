import { prisma } from "@/lib/prisma";
import type { StorefrontShippingOption } from "@/lib/shipping-options-public";
import { clampShippingUnits } from "@/lib/shipping-units";

export type CartShippingLine = {
  productId: string;
  quantity: number;
  shippingUnits: number;
  excludedShippingOptionIds: string[];
};

export function totalShippingUnitsForCart(lines: CartShippingLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.shippingUnits, 0);
}

export function isShippingOptionEligible(
  option: { id: string; maxShippingUnits: number },
  lines: CartShippingLine[],
): boolean {
  if (lines.length === 0) return true;

  const totalUnits = totalShippingUnitsForCart(lines);
  if (totalUnits > option.maxShippingUnits) return false;

  for (const line of lines) {
    if (line.excludedShippingOptionIds.includes(option.id)) return false;
  }
  return true;
}

export function filterEligibleShippingOptions<T extends { id: string; maxShippingUnits: number }>(
  options: T[],
  lines: CartShippingLine[],
): T[] {
  return options.filter((option) => isShippingOptionEligible(option, lines));
}

function shippingUnitsForCartItem(item: {
  variant: { shippingUnits: number } | null;
  product: {
    variants: { shippingUnits: number }[];
  };
}): number {
  if (item.variant) return clampShippingUnits(item.variant.shippingUnits);
  const fallback = item.product.variants[0];
  return fallback ? clampShippingUnits(fallback.shippingUnits) : 1;
}

export async function loadCartShippingLines(customerId: string): Promise<CartShippingLine[]> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: {
      items: {
        select: {
          quantity: true,
          variant: {
            select: { shippingUnits: true },
          },
          product: {
            select: {
              id: true,
              shippingOptionExclusions: { select: { shippingOptionId: true } },
              variants: {
                orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
                take: 1,
                select: { shippingUnits: true },
              },
            },
          },
        },
      },
    },
  });
  if (!cart) return [];

  return cart.items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
    shippingUnits: shippingUnitsForCartItem(item),
    excludedShippingOptionIds: item.product.shippingOptionExclusions.map((row) => row.shippingOptionId),
  }));
}

export async function getEligibleShippingOptionsForCustomer(
  customerId: string,
): Promise<StorefrontShippingOption[]> {
  const [activeOptions, lines] = await Promise.all([
    prisma.shippingOption.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        label: true,
        description: true,
        priceCents: true,
        maxShippingUnits: true,
      },
    }),
    loadCartShippingLines(customerId),
  ]);

  return filterEligibleShippingOptions(activeOptions, lines);
}

export async function isShippingOptionEligibleForCustomer(
  customerId: string,
  shippingOptionId: string,
): Promise<boolean> {
  const [option, lines] = await Promise.all([
    prisma.shippingOption.findFirst({
      where: { id: shippingOptionId, active: true },
      select: { id: true, maxShippingUnits: true },
    }),
    loadCartShippingLines(customerId),
  ]);
  if (!option) return false;
  return isShippingOptionEligible(option, lines);
}
