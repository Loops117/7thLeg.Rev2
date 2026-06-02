"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length ? t : null;
}

export type UpdateCustomerNameResult = { ok: true } | { ok: false; error: string };

function fullDisplayFromParts(first: string | null, last: string | null): string | null {
  const a = first?.trim() ?? "";
  const b = last?.trim() ?? "";
  const combined = [a, b].filter(Boolean).join(" ").trim();
  return combined.length ? combined : null;
}

export async function updateCustomerName(formData: FormData): Promise<UpdateCustomerNameResult> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { ok: false, error: "Sign in required." };
  }

  const firstName = emptyToNull(String(formData.get("firstName") ?? ""));
  const lastName = emptyToNull(String(formData.get("lastName") ?? ""));
  const displayName = fullDisplayFromParts(firstName, lastName);

  await prisma.customer.update({
    where: { id: session.user.id },
    data: {
      firstName,
      lastName,
      displayName,
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true };
}

export type UpdateCustomerAddressResult = { ok: true } | { ok: false; error: string };

export async function updateCustomerAddress(formData: FormData): Promise<UpdateCustomerAddressResult> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { ok: false, error: "Sign in required." };
  }

  const addressLine1 = emptyToNull(String(formData.get("addressLine1") ?? ""));
  const addressLine2 = emptyToNull(String(formData.get("addressLine2") ?? ""));
  const city = emptyToNull(String(formData.get("city") ?? ""));
  const stateRegion = emptyToNull(String(formData.get("stateRegion") ?? ""));
  const postalCode = emptyToNull(String(formData.get("postalCode") ?? ""));
  const country = emptyToNull(String(formData.get("country") ?? ""));

  await prisma.customer.update({
    where: { id: session.user.id },
    data: {
      addressLine1,
      addressLine2,
      city,
      stateRegion,
      postalCode,
      country,
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true };
}
