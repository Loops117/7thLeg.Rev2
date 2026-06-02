"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("You must be signed in as a customer.");
  }
  return session.user.id;
}

export async function addProductToWishlist(input: {
  productId: string;
  variantId: string | null;
  unitPriceCentsAtAdd: number;
  timedSaleEventIdAtAdd: string | null;
  /** Revalidate this product page (e.g. `/product/my-slug`) so wishlist state updates. */
  storefrontProductPath?: string | null;
}) {
  const customerId = await requireCustomerId();
  const productId = input.productId?.trim();
  if (!productId) throw new Error("Missing product.");

  const unit = Math.max(0, Math.floor(Number(input.unitPriceCentsAtAdd)));
  if (!Number.isFinite(unit)) throw new Error("Invalid price.");

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    select: { id: true },
  });
  if (!product) throw new Error("Product not found.");

  let variantId: string | null = input.variantId?.trim() || null;
  if (variantId) {
    const v = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, active: true },
      select: { id: true },
    });
    if (!v) throw new Error("That option is not available.");
  } else {
    const count = await prisma.productVariant.count({ where: { productId, active: true } });
    if (count > 0) throw new Error("Choose an option before adding to your wishlist.");
  }

  const timed = input.timedSaleEventIdAtAdd?.trim() || null;

  await prisma.customerWishlistItem.upsert({
    where: { customerId_productId: { customerId, productId } },
    create: {
      customerId,
      productId,
      variantId,
      unitPriceCentsAtAdd: unit,
      timedSaleEventIdAtAdd: timed,
    },
    update: {
      variantId,
      unitPriceCentsAtAdd: unit,
      timedSaleEventIdAtAdd: timed,
    },
  });

  const path = input.storefrontProductPath?.trim();
  if (path) revalidatePath(path);
  revalidatePath("/account/wishlist");
  revalidatePath("/product");
}

export async function removeProductFromWishlist(productId: string, storefrontProductPath?: string | null) {
  const customerId = await requireCustomerId();
  const pid = productId?.trim();
  if (!pid) throw new Error("Missing product.");

  await prisma.customerWishlistItem.deleteMany({
    where: { customerId, productId: pid },
  });

  const path = storefrontProductPath?.trim();
  if (path) revalidatePath(path);
  revalidatePath("/account/wishlist");
  revalidatePath("/settings/customers");
  revalidatePath("/product");
}

export async function removeWishlistItem(wishlistItemId: string) {
  const customerId = await requireCustomerId();
  const id = wishlistItemId?.trim();
  if (!id) throw new Error("Missing item.");

  await prisma.customerWishlistItem.deleteMany({
    where: { id, customerId },
  });

  revalidatePath("/account/wishlist");
  revalidatePath("/settings/customers");
  revalidatePath("/product");
}
