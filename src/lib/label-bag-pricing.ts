import { labelLineSubtotalCents } from "@/lib/label-cart-pricing";
import {
  batchFinishSurchargeCents,
  type BatchFinishSelection,
  type TemplateFinishOptionRow,
} from "@/lib/label-finish-options";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";

function templateTotalQty(items: LabelBagItem[], templateId: string): number {
  return items
    .filter((i) => i.templateId === templateId)
    .reduce((s, i) => s + Math.max(1, i.quantity), 0);
}

function buildAllocationMap(
  allItems: LabelBagItem[],
  templates: LabelTemplatePickerOption[],
): Map<string, number> {
  const map = new Map<string, number>();
  const templateIds = [...new Set(allItems.map((i) => i.templateId))];
  for (const templateId of templateIds) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) continue;
    const group = allItems.filter((i) => i.templateId === templateId);
    const totalQty = templateTotalQty(allItems, templateId);
    const templateTotal = labelLineSubtotalCents(t.priceTiers, totalQty);
    let assigned = 0;
    for (let i = 0; i < group.length; i++) {
      const row = group[i]!;
      const qty = Math.max(1, row.quantity);
      if (i === group.length - 1) {
        map.set(row.id, templateTotal - assigned);
      } else {
        const share = Math.round((qty / totalQty) * templateTotal);
        map.set(row.id, share);
        assigned += share;
      }
    }
  }
  return map;
}

/** Bag subtotal with bulk tiers (finish options chosen at add-to-cart). */
export function bagSubtotalCentsWithBulk(
  items: LabelBagItem[],
  templates: LabelTemplatePickerOption[],
): number {
  const templateIds = [...new Set(items.map((i) => i.templateId))];
  let total = 0;
  for (const templateId of templateIds) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) continue;
    const qty = templateTotalQty(items, templateId);
    total += labelLineSubtotalCents(t.priceTiers, qty);
  }
  return total;
}

export function bagSubtotalCentsWithFinish(
  items: LabelBagItem[],
  templates: LabelTemplatePickerOption[],
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>,
  finishSelection: BatchFinishSelection | undefined,
): number {
  return (
    bagSubtotalCentsWithBulk(items, templates) +
    batchFinishSurchargeCents(items, finishOptionsByTemplateId, finishSelection)
  );
}

/** Per-line share of bulk-priced template subtotal (for display only). */
export function bagItemSubtotalCentsWithBulk(
  item: LabelBagItem,
  allItems: LabelBagItem[],
  templates: LabelTemplatePickerOption[],
): number {
  return buildAllocationMap(allItems, templates).get(item.id) ?? 0;
}
