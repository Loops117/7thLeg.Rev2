"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type ShippingOptionAdminPayload = {
  label: string;
  description?: string;
  priceCents: number;
  sortOrder: number;
  active: boolean;
};

function normalizePayload(input: ShippingOptionAdminPayload): { ok: true; data: ShippingOptionAdminPayload } | { ok: false; error: string } {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Label is required." };

  let price = Math.round(Number(input.priceCents));
  if (!Number.isFinite(price) || price < 0 || price > 5_000_000) {
    return { ok: false, error: "Price must be between $0 and a reasonable upper bound." };
  }

  const sortOrder = Math.round(Number(input.sortOrder));
  if (!Number.isFinite(sortOrder)) return { ok: false, error: "Sort order must be a number." };

  return {
    ok: true,
    data: {
      label,
      description: input.description ?? "",
      priceCents: price,
      sortOrder,
      active: !!input.active,
    },
  };
}

export async function adminCreateShippingOption(input: ShippingOptionAdminPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const normalized = normalizePayload(input);
  if (!normalized.ok) return normalized;

  await prisma.shippingOption.create({
    data: normalized.data,
  });

  revalidatePath("/settings/shipping");
  revalidatePath("/cart");
  return { ok: true };
}

export async function adminUpdateShippingOption(
  id: string,
  input: ShippingOptionAdminPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const cid = id.trim();
  if (!cid) return { ok: false, error: "Invalid option." };

  const normalized = normalizePayload(input);
  if (!normalized.ok) return normalized;

  const exists = await prisma.shippingOption.findUnique({ where: { id: cid }, select: { id: true } });
  if (!exists) return { ok: false, error: "Option not found." };

  await prisma.shippingOption.update({
    where: { id: cid },
    data: normalized.data,
  });

  revalidatePath("/settings/shipping");
  revalidatePath("/cart");
  return { ok: true };
}

export async function adminDeleteShippingOption(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const cid = id.trim();
  if (!cid) return { ok: false, error: "Invalid option." };

  try {
    await prisma.shippingOption.delete({ where: { id: cid } });
  } catch {
    return { ok: false, error: "Could not delete (option may be in use)." };
  }

  revalidatePath("/settings/shipping");
  revalidatePath("/cart");
  return { ok: true };
}
