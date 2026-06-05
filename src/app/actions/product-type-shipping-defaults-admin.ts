"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  getDefaultShippingExclusionsForProductTypes,
  getProductTypeDefaultShippingExclusionIds,
  syncProductTypeDefaultShippingExclusions,
} from "@/lib/product-type-shipping-defaults";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function getProductTypeDefaultShippingExclusionsForAdmin(
  typeId: string,
): Promise<string[]> {
  await requireAdmin();
  return getProductTypeDefaultShippingExclusionIds(typeId);
}

/** For product editor: apply when product types are selected. */
export async function fetchDefaultShippingExclusionsForProductTypes(
  typeIds: string[],
): Promise<string[]> {
  await requireAdmin();
  return getDefaultShippingExclusionsForProductTypes(typeIds);
}

export type SaveProductTypeShippingDefaultsResult = { ok: true } | { ok: false; error: string };

export async function saveProductTypeDefaultShippingExclusions(input: {
  typeId: string;
  excludedShippingOptionIds: string[];
}): Promise<SaveProductTypeShippingDefaultsResult> {
  try {
    await requireAdmin();
    const type = await prisma.productType.findUnique({
      where: { id: input.typeId },
      select: { id: true },
    });
    if (!type) {
      return { ok: false, error: "Type not found." };
    }

    await syncProductTypeDefaultShippingExclusions(type.id, input.excludedShippingOptionIds);

    revalidatePath("/settings/products/types");
    revalidatePath(`/settings/products/types/${type.id}/edit`);
    revalidatePath("/settings/products");
    return { ok: true };
  } catch (e) {
    console.error("saveProductTypeDefaultShippingExclusions", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}
