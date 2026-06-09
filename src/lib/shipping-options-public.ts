import { cartOwnerWhere, ownerFromCustomerId, type CartOwner } from "@/lib/cart-owner";
import {
  getEligibleShippingOptionsForOwner,
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

/** Active shipping options that fit the cart (units + per-product exclusions). */
export async function getCartEligibleShippingOptionsForOwner(
  owner: CartOwner,
): Promise<StorefrontShippingOption[]> {
  return getEligibleShippingOptionsForOwner(owner);
}

export async function getCartEligibleShippingOptionsForCustomer(
  customerId: string,
): Promise<StorefrontShippingOption[]> {
  return getCartEligibleShippingOptionsForOwner(ownerFromCustomerId(customerId));
}

export async function getCartShippingUnitsTotal(owner: CartOwner): Promise<number> {
  const lines = await loadCartShippingLines(owner);
  return totalShippingUnitsForCart(lines);
}

/**
 * Keeps cart selection aligned with eligible options: clears stale FKs,
 * picks the first option when any exist and none is selected.
 */
export async function ensureCartShippingSelection(
  owner: CartOwner,
  eligibleOptions: StorefrontShippingOption[],
): Promise<string | null> {
  const cart = await prisma.cart.findUnique({
    where: cartOwnerWhere(owner),
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
export async function reconcileCartShippingSelection(owner: CartOwner): Promise<void> {
  const eligible = await getEligibleShippingOptionsForOwner(owner);
  await ensureCartShippingSelection(owner, eligible);
}
