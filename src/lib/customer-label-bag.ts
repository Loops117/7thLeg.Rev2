import { bagItemDisplayName } from "@/lib/label-bag-display-name";
import { normalizeBagItem, type LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelBagFolder } from "@/lib/label-editor/label-bag-folders";

export const MAX_CUSTOMER_LABEL_BAG_ITEMS = 200;

export function parseCustomerLabelBagItemsJson(raw: unknown): LabelBagItem[] {
  if (!Array.isArray(raw)) return [];
  const items: LabelBagItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.templateId !== "string") continue;
    if (!o.document || typeof o.document !== "object") continue;
    try {
      items.push(
        normalizeBagItem({
          id: o.id,
          templateId: o.templateId,
          templateName: typeof o.templateName === "string" ? o.templateName : "",
          widthMm: typeof o.widthMm === "number" ? o.widthMm : 0,
          heightMm: typeof o.heightMm === "number" ? o.heightMm : 0,
          document: o.document as LabelBagItem["document"],
          quantity: typeof o.quantity === "number" ? o.quantity : 1,
          dataRowLabel: typeof o.dataRowLabel === "string" ? o.dataRowLabel : null,
          savedDesignId: typeof o.savedDesignId === "string" ? o.savedDesignId : null,
          savedDesignName: typeof o.savedDesignName === "string" ? o.savedDesignName : null,
          bagFolderId: typeof o.bagFolderId === "string" ? o.bagFolderId : null,
          addedAt: typeof o.addedAt === "number" ? o.addedAt : 0,
          inBag: o.inBag !== false,
        }),
      );
    } catch {
      /* skip invalid row */
    }
  }
  return items.slice(0, MAX_CUSTOMER_LABEL_BAG_ITEMS);
}

export function parseCustomerLabelBagFoldersJson(raw: unknown): LabelBagFolder[] {
  if (!Array.isArray(raw)) return [];
  const folders: LabelBagFolder[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string") continue;
    folders.push({ id: o.id, name: o.name.trim().slice(0, 80) || "Folder" });
  }
  return folders;
}

export function labelBagItemMatchesSearch(item: LabelBagItem, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const name = bagItemDisplayName(item).toLowerCase();
  const saved = (item.savedDesignName ?? "").toLowerCase();
  const template = item.templateName.toLowerCase();
  const row = (item.dataRowLabel ?? "").toLowerCase();
  return name.includes(t) || saved.includes(t) || template.includes(t) || row.includes(t);
}
