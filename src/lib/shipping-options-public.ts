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

/**
 * Keeps cart selection aligned with currently active options: clears stale FKs,
 * picks the first option when any exist and none is selected.
 */
export async function ensureCartShippingSelection(
  customerId: string,
  activeOptions: StorefrontShippingOption[],
): Promise<string | null> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    select: { id: true, selectedShippingOptionId: true },
  });
  if (!cart) return null;

  if (activeOptions.length === 0) {
    if (cart.selectedShippingOptionId != null) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { selectedShippingOptionId: null },
      });
    }
    return null;
  }

  const allowed = new Set(activeOptions.map((o) => o.id));
  let sel = cart.selectedShippingOptionId;
  if (sel && !allowed.has(sel)) sel = null;

  if (sel === null) {
    sel = activeOptions[0].id;
    await prisma.cart.update({
      where: { id: cart.id },
      data: { selectedShippingOptionId: sel },
    });
  }

  return sel;
}
