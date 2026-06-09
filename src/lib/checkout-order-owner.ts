import type { CartOwner } from "@/lib/cart-owner";
import { isGuestOwner } from "@/lib/link-guest-orders";

export function orderBelongsToOwner(
  order: { customerId: string | null; guestSessionId: string | null },
  owner: CartOwner,
): boolean {
  if (owner.type === "customer") {
    return order.customerId === owner.customerId;
  }
  return order.customerId == null && order.guestSessionId === owner.sessionId;
}

export function checkoutEmailForOwner(
  owner: CartOwner,
  guestEmail?: string,
  customerEmail?: string,
): string | null {
  if (isGuestOwner(owner)) return guestEmail?.trim() || null;
  return customerEmail?.trim() || null;
}
