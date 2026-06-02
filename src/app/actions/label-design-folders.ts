"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("Sign in to manage folders.");
  }
  return session.user.id;
}

export type LabelDesignFolderSummary = {
  id: string;
  name: string;
  sortOrder: number;
};

export async function listCustomerLabelDesignFolders(): Promise<LabelDesignFolderSummary[]> {
  const customerId = await requireCustomerId();
  const rows = await prisma.customerLabelDesignFolder.findMany({
    where: { customerId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder }));
}

export async function createCustomerLabelDesignFolder(
  name: string,
): Promise<{ ok: true; folder: LabelDesignFolderSummary } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const trimmed = name.trim().slice(0, 80) || "New folder";
    const maxOrder = await prisma.customerLabelDesignFolder.aggregate({
      where: { customerId },
      _max: { sortOrder: true },
    });
    const row = await prisma.customerLabelDesignFolder.create({
      data: {
        customerId,
        name: trimmed,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePath("/labels", "layout");
    return { ok: true, folder: { id: row.id, name: row.name, sortOrder: row.sortOrder } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create folder." };
  }
}

export async function renameCustomerLabelDesignFolder(
  folderId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) return { ok: false, error: "Name is required." };
    await prisma.customerLabelDesignFolder.updateMany({
      where: { id: folderId, customerId },
      data: { name: trimmed },
    });
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Rename failed." };
  }
}

export async function deleteCustomerLabelDesignFolder(
  folderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    await prisma.customerLabelDesign.updateMany({
      where: { folderId, customerId },
      data: { folderId: null },
    });
    await prisma.customerLabelDesignFolder.deleteMany({
      where: { id: folderId, customerId },
    });
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}
