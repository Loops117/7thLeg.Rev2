import {
  bagItemSubtotalCentsWithBulk,
  bagSubtotalCentsWithBulk,
} from "@/lib/label-bag-pricing";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";

export type LabelBagGroup = {
  key: string;
  templateId: string;
  templateName: string;
  savedDesignName: string | null;
  items: LabelBagItem[];
};

export function groupBagItems(items: LabelBagItem[]): LabelBagGroup[] {
  const map = new Map<string, LabelBagGroup>();
  for (const item of items) {
    const designKey = item.savedDesignName?.trim() || "_unsaved";
    const key = `${item.templateId}:${designKey}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, {
        key,
        templateId: item.templateId,
        templateName: item.templateName,
        savedDesignName: item.savedDesignName?.trim() || null,
        items: [item],
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    const t = a.templateName.localeCompare(b.templateName);
    if (t !== 0) return t;
    return (a.savedDesignName ?? "").localeCompare(b.savedDesignName ?? "");
  });
}

export function bagLabelCounts(items: LabelBagItem[]): {
  individualLines: number;
  totalWithQuantity: number;
} {
  const individualLines = items.length;
  const totalWithQuantity = items.reduce((s, i) => s + Math.max(1, i.quantity), 0);
  return { individualLines, totalWithQuantity };
}

export function bagSubtotalCents(
  items: LabelBagItem[],
  templates: LabelTemplatePickerOption[],
): number {
  return bagSubtotalCentsWithBulk(items, templates);
}

export function bagItemSubtotalCents(
  item: LabelBagItem,
  templates: LabelTemplatePickerOption[],
  allItems?: LabelBagItem[],
): number {
  const pool = allItems ?? [item];
  return bagItemSubtotalCentsWithBulk(item, pool, templates);
}

export { bagItemDisplayName } from "@/lib/label-bag-display-name";
