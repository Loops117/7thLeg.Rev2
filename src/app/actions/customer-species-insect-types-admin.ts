"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { CustomerSpeciesInsectTypeAdminRow } from "@/lib/customer-species-insect-types";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function revalidateSpeciesListPaths() {
  revalidatePath("/settings/species-list");
  revalidatePath("/account/species");
}

export async function listCustomerSpeciesInsectTypesAdmin(): Promise<CustomerSpeciesInsectTypeAdminRow[]> {
  await requireAdmin();
  const rows = await prisma.customerSpeciesInsectType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    active: r.active,
  }));
}

export async function listActiveCustomerSpeciesInsectTypes(): Promise<
  { id: string; name: string }[]
> {
  const rows = await prisma.customerSpeciesInsectType.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return rows;
}

export async function adminUpsertCustomerSpeciesInsectType(input: {
  id?: string;
  name: string;
  sortOrder: number;
  active: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const name = input.name.trim().slice(0, 120);
    if (!name) return { ok: false, error: "Name is required." };
    const sortOrder = Math.round(Number(input.sortOrder)) || 0;

    if (input.id?.trim()) {
      await prisma.customerSpeciesInsectType.update({
        where: { id: input.id.trim() },
        data: { name, sortOrder, active: !!input.active },
      });
      revalidateSpeciesListPaths();
      return { ok: true, id: input.id.trim() };
    }

    const created = await prisma.customerSpeciesInsectType.create({
      data: { name, sortOrder, active: !!input.active },
    });
    revalidateSpeciesListPaths();
    return { ok: true, id: created.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "An insect type with that name already exists." };
    }
    return { ok: false, error: msg };
  }
}

export async function adminDeleteCustomerSpeciesInsectType(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const cid = id.trim();
    if (!cid) return { ok: false, error: "Invalid option." };
    await prisma.customerSpeciesInsectType.delete({ where: { id: cid } });
    revalidateSpeciesListPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}
