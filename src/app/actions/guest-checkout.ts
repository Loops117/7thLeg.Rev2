"use server";

import { revalidatePath } from "next/cache";
import { requireCartOwner } from "@/lib/cart-owner";
import {
  parseGuestCheckoutContact,
  readGuestCheckoutContactCookie,
  saveGuestCheckoutContactCookie,
  type GuestCheckoutContact,
} from "@/lib/guest-checkout-contact";
import { isGuestOwner } from "@/lib/link-guest-orders";
import { prisma } from "@/lib/prisma";

export type GuestContactActionResult =
  | { ok: true; contact: GuestCheckoutContact }
  | { ok: false; error: string };

export async function saveGuestCheckoutContactAction(
  formData: FormData,
): Promise<GuestContactActionResult> {
  const ownerResult = await requireCartOwner();
  if (!ownerResult.ok) return { ok: false, error: ownerResult.error };

  let contact: GuestCheckoutContact | null;
  if (isGuestOwner(ownerResult.owner)) {
    contact = parseGuestCheckoutContact(formData);
  } else {
    const customer = await prisma.customer.findUnique({
      where: { id: ownerResult.owner.customerId },
      select: { email: true },
    });
    if (!customer) return { ok: false, error: "Account not found." };
    contact = parseGuestCheckoutContact({
      email: customer.email,
      displayName: String(formData.get("displayName") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      addressLine2: String(formData.get("addressLine2") ?? ""),
      city: String(formData.get("city") ?? ""),
      stateRegion: String(formData.get("stateRegion") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? ""),
    });
  }

  if (!contact) {
    return {
      ok: false,
      error: "Enter your name and full shipping address (line 1, city, state, postal code).",
    };
  }
  await saveGuestCheckoutContactCookie(contact);
  revalidatePath("/cart");
  return { ok: true, contact };
}

export async function readGuestCheckoutContactAction(): Promise<GuestCheckoutContact | null> {
  return readGuestCheckoutContactCookie();
}
