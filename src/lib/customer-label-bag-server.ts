import {
  parseCustomerLabelBagFoldersJson,
  parseCustomerLabelBagItemsJson,
} from "@/lib/customer-label-bag";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelBagFolder } from "@/lib/label-editor/label-bag-folders";
import { prisma } from "@/lib/prisma";

export async function getCustomerLabelBagItemsForCustomer(
  customerId: string,
): Promise<{ items: LabelBagItem[]; folders: LabelBagFolder[] }> {
  const row = await prisma.customerLabelBag.findUnique({ where: { customerId } });
  if (!row) return { items: [], folders: [] };
  return {
    items: parseCustomerLabelBagItemsJson(row.itemsJson),
    folders: parseCustomerLabelBagFoldersJson(row.foldersJson),
  };
}
