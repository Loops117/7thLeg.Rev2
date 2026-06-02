"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  MAX_CUSTOMER_LABEL_BAG_ITEMS,
  parseCustomerLabelBagFoldersJson,
  parseCustomerLabelBagItemsJson,
} from "@/lib/customer-label-bag";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelBagFolder } from "@/lib/label-editor/label-bag-folders";
import { prisma } from "@/lib/prisma";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("Sign in to sync your label bag.");
  }
  return session.user.id;
}

export async function getCustomerLabelBagAction(): Promise<
  | { ok: true; items: LabelBagItem[]; folders: LabelBagFolder[] }
  | { ok: false; error: string }
> {
  try {
    const customerId = await requireCustomerId();
    const row = await prisma.customerLabelBag.findUnique({ where: { customerId } });
    if (!row) {
      return { ok: true, items: [], folders: [] };
    }
    return {
      ok: true,
      items: parseCustomerLabelBagItemsJson(row.itemsJson),
      folders: parseCustomerLabelBagFoldersJson(row.foldersJson),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load bag." };
  }
}

export async function syncCustomerLabelBagAction(
  items: unknown,
  folders?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const parsedItems = parseCustomerLabelBagItemsJson(items).slice(0, MAX_CUSTOMER_LABEL_BAG_ITEMS);
    const parsedFolders = folders === undefined ? undefined : parseCustomerLabelBagFoldersJson(folders);

    const foldersPayload =
      parsedFolders === undefined
        ? undefined
        : parsedFolders.length > 0
          ? parsedFolders
          : [];

    await prisma.customerLabelBag.upsert({
      where: { customerId },
      create: {
        customerId,
        itemsJson: parsedItems,
        ...(foldersPayload !== undefined ? { foldersJson: foldersPayload } : {}),
      },
      update: {
        itemsJson: parsedItems,
        ...(foldersPayload !== undefined ? { foldersJson: foldersPayload } : {}),
      },
    });

    revalidatePath("/labels", "layout");
    revalidatePath("/settings/labels/created");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not sync bag." };
  }
}
