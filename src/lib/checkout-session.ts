import { requireCartOwner, type CartOwner } from "@/lib/cart-owner";
import { readGuestCheckoutContactCookie, type GuestCheckoutContact } from "@/lib/guest-checkout-contact";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { prisma } from "@/lib/prisma";

export type CheckoutSessionContext =
  | {
      ok: true;
      owner: CartOwner;
      checkoutEmail: string;
      shippingContact: GuestCheckoutContact;
    }
  | { ok: false; error: string };

/** Resolve cart owner and confirmed shipping contact for payment actions. */
export async function requireCheckoutSession(): Promise<CheckoutSessionContext> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return ownerResult;
  const owner = ownerResult.owner;

  const shippingContact = await readGuestCheckoutContactCookie();
  if (!shippingContact) {
    return { ok: false, error: "Save your shipping address on the cart page before checkout." };
  }

  if (isGuestOwner(owner)) {
    return { ok: true, owner, checkoutEmail: shippingContact.email, shippingContact };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: owner.customerId },
    select: { email: true },
  });
  if (!customer) return { ok: false, error: "Account not found." };
  if (shippingContact.email !== customer.email.trim().toLowerCase()) {
    return { ok: false, error: "Shipping details are out of date — save them again on the cart page." };
  }
  return { ok: true, owner, checkoutEmail: customer.email, shippingContact };
}
