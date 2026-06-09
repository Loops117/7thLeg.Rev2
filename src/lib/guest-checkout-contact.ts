import { cookies } from "next/headers";

const GUEST_CONTACT_COOKIE = "7thleg_guest_contact";

export type GuestCheckoutContact = {
  email: string;
  displayName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
};

/** @alias GuestCheckoutContact */
export type CheckoutShippingContact = GuestCheckoutContact;

type CustomerProfileForShipping = {
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
};

/** Pre-fill checkout shipping from a saved customer profile (may be incomplete). */
export function contactFromCustomerProfile(customer: CustomerProfileForShipping): GuestCheckoutContact {
  const displayName =
    customer.displayName?.trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    "";
  return {
    email: customer.email.trim().toLowerCase(),
    displayName,
    addressLine1: customer.addressLine1?.trim() ?? "",
    addressLine2: customer.addressLine2?.trim() ?? "",
    city: customer.city?.trim() ?? "",
    stateRegion: customer.stateRegion?.trim() ?? "",
    postalCode: customer.postalCode?.trim() ?? "",
    country: customer.country?.trim() || "US",
  };
}

export function hasCompleteShippingContact(contact: GuestCheckoutContact | null | undefined): boolean {
  if (!contact) return false;
  return parseGuestCheckoutContact(contact) != null;
}

export function parseGuestCheckoutContact(raw: FormData | GuestCheckoutContact): GuestCheckoutContact | null {
  const email = String("get" in raw ? raw.get("email") : raw.email ?? "")
    .trim()
    .toLowerCase();
  const displayName = String("get" in raw ? raw.get("displayName") : raw.displayName ?? "").trim();
  const addressLine1 = String("get" in raw ? raw.get("addressLine1") : raw.addressLine1 ?? "").trim();
  const addressLine2 = String("get" in raw ? raw.get("addressLine2") : raw.addressLine2 ?? "").trim();
  const city = String("get" in raw ? raw.get("city") : raw.city ?? "").trim();
  const stateRegion = String("get" in raw ? raw.get("stateRegion") : raw.stateRegion ?? "").trim();
  const postalCode = String("get" in raw ? raw.get("postalCode") : raw.postalCode ?? "").trim();
  const country = String("get" in raw ? raw.get("country") : raw.country ?? "").trim() || "US";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (!displayName || !addressLine1 || !city || !stateRegion || !postalCode) return null;

  return {
    email,
    displayName: displayName.slice(0, 120),
    addressLine1: addressLine1.slice(0, 120),
    addressLine2: addressLine2.slice(0, 120),
    city: city.slice(0, 80),
    stateRegion: stateRegion.slice(0, 80),
    postalCode: postalCode.slice(0, 32),
    country: country.slice(0, 80),
  };
}

export async function saveGuestCheckoutContactCookie(contact: GuestCheckoutContact): Promise<void> {
  const jar = await cookies();
  jar.set(GUEST_CONTACT_COOKIE, JSON.stringify(contact), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function readGuestCheckoutContactCookie(): Promise<GuestCheckoutContact | null> {
  const jar = await cookies();
  const raw = jar.get(GUEST_CONTACT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuestCheckoutContact;
    if (!parsed?.email) return null;
    return parseGuestCheckoutContact(parsed);
  } catch {
    return null;
  }
}

export async function clearGuestCheckoutContactCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(GUEST_CONTACT_COOKIE);
}
