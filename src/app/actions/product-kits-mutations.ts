"use server";

import { revalidatePath } from "next/cache";
import { searchProductsForHotspotPicker } from "@/app/actions/image-submission-hotspots";
import { auth } from "@/auth";
import type { ProductKitItemInput } from "@/lib/product-kits";
import { MIN_PRODUCT_KIT_ITEMS, orderKitItemsWithHostFirst } from "@/lib/product-kits-shared";
import type { ProductPickerOption } from "@/lib/product-picker-option";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function searchProductsForKitPicker(
  query: string,
): Promise<ProductPickerOption[] | { error: string }> {
  return searchProductsForHotspotPicker(query);
}

export type SaveProductKitResult = { ok: true } | { ok: false; error: string };

export async function saveProductKit(input: {
  hostProductId: string;
  enabled: boolean;
  label: string;
  discountDollars: string;
  items: ProductKitItemInput[];
}): Promise<SaveProductKitResult> {
  try {
    await requireAdmin();
    const host = await prisma.product.findUnique({
      where: { id: input.hostProductId },
      select: { id: true, slug: true },
    });
    if (!host) return { ok: false, error: "Product not found." };

    const dollars = Number.parseFloat(input.discountDollars.replace(/[^0-9.]/g, ""));
    const discountCents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;

    const orderedItems = orderKitItemsWithHostFirst(host.id, input.items);

    if (input.enabled && orderedItems.length < MIN_PRODUCT_KIT_ITEMS) {
      return {
        ok: false,
        error: `Add at least ${MIN_PRODUCT_KIT_ITEMS} products with specific variations to enable a kit.`,
      };
    }

    if (
      input.enabled &&
      (orderedItems.length === 0 || orderedItems[0]!.productId !== host.id)
    ) {
      return {
        ok: false,
        error: "The first kit item must be a variation of this product.",
      };
    }

    const { syncProductKit } = await import("@/lib/product-kits");
    await syncProductKit(host.id, {
      enabled: input.enabled,
      label: input.label,
      discountCents,
      items: orderedItems,
    });

    revalidatePath("/settings/products");
    revalidatePath(`/product/${host.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("saveProductKit", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not save kit." };
  }
}
