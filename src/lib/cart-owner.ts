import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { auth as readAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CartOwner =
  | { type: "customer"; customerId: string }
  | { type: "guest"; sessionId: string };

const GUEST_CART_COOKIE = "7thleg_guest_cart";

export function cartOwnerWhere(owner: CartOwner) {
  return owner.type === "customer"
    ? { customerId: owner.customerId }
    : { sessionId: owner.sessionId };
}

export function ownerFromCustomerId(customerId: string): CartOwner {
  return { type: "customer", customerId };
}

export async function isGuestCheckoutEnabled(): Promise<boolean> {
  const row = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { guestCheckoutEnabled: true },
  });
  return row?.guestCheckoutEnabled ?? false;
}

async function readGuestCartSessionId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(GUEST_CART_COOKIE)?.value?.trim();
  return raw && raw.length >= 8 ? raw : null;
}

/** Create guest cart cookie — Server Actions / Route Handlers only. */
async function ensureGuestCartSessionId(): Promise<string> {
  const existing = await readGuestCartSessionId();
  if (existing) return existing;
  const id = randomUUID();
  const jar = await cookies();
  jar.set(GUEST_CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

/**
 * Read cart owner without mutating cookies (safe in Server Components).
 * Returns null for anonymous visitors who have not added to cart yet.
 */
export async function readCartOwner(): Promise<CartOwner | null> {
  const session = await readAuthSession().catch(() => null);
  if (session?.user?.role === "customer" && session.user.id) {
    return { type: "customer", customerId: session.user.id };
  }
  if (!(await isGuestCheckoutEnabled())) return null;
  const sessionId = await readGuestCartSessionId();
  if (!sessionId) return null;
  return { type: "guest", sessionId };
}

/** @deprecated Use readCartOwner in Server Components. */
export const resolveCartOwner = readCartOwner;

/** Cart owner for server actions; creates guest cookie on first cart mutation. */
export async function requireCartOwner(): Promise<
  { ok: true; owner: CartOwner } | { ok: false; error: string }
> {
  const session = await readAuthSession().catch(() => null);
  if (session?.user?.role === "customer" && session.user.id) {
    return { ok: true, owner: { type: "customer", customerId: session.user.id } };
  }
  if (!(await isGuestCheckoutEnabled())) {
    return { ok: false, error: "Sign in to use your cart, or enable guest checkout in store settings." };
  }
  const sessionId = await ensureGuestCartSessionId();
  return { ok: true, owner: { type: "guest", sessionId } };
}

export async function clearGuestCartCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(GUEST_CART_COOKIE);
}
