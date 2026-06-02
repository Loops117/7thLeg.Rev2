import {
  getEligibleShippingOptionsForCustomer,
  loadCartShippingLines,
  totalShippingUnitsForCart,
} from "@/lib/shipping-eligibility";
import { prisma } from "@/lib/prisma";

export type StorefrontShippingOption = {
  id: string;
  label: string;
  description: string;
  priceCents: number;
};

export async function getActiveShippingOptionsForStorefront(): Promise<StorefrontShippingOption[]> {
  const rows = await prisma.shippingOption.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, label: true, description: true, priceCents: true },
  });
  return rows;
}

/** Active shipping options that fit the customer's current cart (units + per-product exclusions). */
export async function getCartEligibleShippingOptionsForCustomer(
  customerId: string,
): Promise<StorefrontShippingOption[]> {
  return getEligibleShippingOptionsForCustomer(customerId);
}

export async function getCartShippingUnitsTotal(customerId: string): Promise<number> {
  const lines = await loadCartShippingLines(customerId);
  return totalShippingUnitsForCart(lines);
}

/**
 * Keeps cart selection aligned with eligible options: clears stale FKs,
 * picks the first option when any exist and none is selected.
 */
export async function ensureCartShippingSelection(
  customerId: string,
  eligibleOptions: StorefrontShippingOption[],
): Promise<string | null> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: { id: true, selectedShippingOptionId: true },
  });
  if (!cart) return null;

  if (eligibleOptions.length === 0) {
    if (cart.selectedShippingOptionId != null) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { selectedShippingOptionId: null },
      });
    }
    return null;
  }

  const allowed = new Set(eligibleOptions.map((o) => o.id));
  let sel = cart.selectedShippingOptionId;
  if (sel && !allowed.has(sel)) sel = null;

  if (sel === null) {
    sel = eligibleOptions[0].id;
    await prisma.cart.update({
      where: { id: cart.id },
      data: { selectedShippingOptionId: sel },
    });
  }

  return sel;
}

/** Recompute eligible options after cart changes and fix the selected shipping method. */
export async function reconcileCartShippingSelection(customerId: string): Promise<void> {
  const eligible = await getEligibleShippingOptionsForCustomer(customerId);
  await ensureCartShippingSelection(customerId, eligible);
}
