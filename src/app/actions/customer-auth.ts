"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { auth as readAuthSession } from "@/auth";
import { clearGuestCheckoutContactCookie } from "@/lib/guest-checkout-contact";
import {
  linkGuestOrdersAndAwardLoyalty,
  mergeGuestCartIntoCustomer,
} from "@/lib/link-guest-orders";
import { prisma } from "@/lib/prisma";

const GUEST_CART_COOKIE = "7thleg_guest_cart";

export type RegisterCustomerResult =
  | { ok: true }
  | { ok: false; error: string; emailExists?: true };

export async function registerCustomer(formData: FormData): Promise<RegisterCustomerResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      emailExists: true as const,
    };
  }

  const firstName = emptyToNull(String(formData.get("firstName") ?? ""));
  const lastName = emptyToNull(String(formData.get("lastName") ?? ""));
  const displayName =
    [firstName, lastName].filter((x): x is string => x != null && x.length > 0).join(" ").trim() || null;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.customer.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      displayName,
    },
  });
  return { ok: true };
}

/** Merge guest cart and award retroactive loyalty after sign-in or registration. */
export async function syncGuestSessionAfterSignIn(): Promise<void> {
  const session = await readAuthSession();
  if (session?.user?.role !== "customer" || !session.user.id) return;

  const customer = await prisma.customer.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!customer) return;

  const jar = await cookies();
  const guestSessionId = jar.get(GUEST_CART_COOKIE)?.value?.trim();
  if (guestSessionId && guestSessionId.length >= 8) {
    await mergeGuestCartIntoCustomer(guestSessionId, session.user.id);
  }

  await linkGuestOrdersAndAwardLoyalty(session.user.id, customer.email);
  await clearGuestCheckoutContactCookie();
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length ? t.slice(0, 80) : null;
}
