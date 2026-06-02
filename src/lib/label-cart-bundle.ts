import { labelLineSubtotalCents } from "@/lib/label-cart-pricing";
import type { LabelEditorDocument, LabelEditorTemplateMeta } from "@/lib/label-editor/document";
import { type LabelPriceTier, unitCentsForLabelQuantity } from "@/lib/label-template-tiers";

export const CART_LABEL_BUNDLE_KIND = "label_bundle" as const;
export const CART_LABEL_BUNDLE_VERSION = 1 as const;

export type CartLabelFinishChoice = {
  groupName: string;
  finishOptionId: string;
  finishOptionName: string;
  priceDeltaCents: number;
};

export type CartLabelBundleEntry = {
  displayName: string;
  quantity: number;
  templateId: string;
  templateName: string;
  savedDesignId: string | null;
  dataRowLabel: string | null;
  widthMm: number;
  heightMm: number;
  labelsPerSheet: number;
  sheetsCount: number;
  document: LabelEditorDocument;
  templateMeta: LabelEditorTemplateMeta;
  /** Per-label surcharge (sum of selected groups for this template). */
  finishPriceDeltaCents?: number;
  finishSelections?: CartLabelFinishChoice[];
  /** @deprecated Legacy single-option fields */
  finishOptionId?: string | null;
  finishOptionName?: string | null;
};

export type CartLabelBundlePayload = {
  version: typeof CART_LABEL_BUNDLE_VERSION;
  kind: typeof CART_LABEL_BUNDLE_KIND;
  entries: CartLabelBundleEntry[];
};

export function isCartLabelBundlePayload(raw: unknown): raw is CartLabelBundlePayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return o.kind === CART_LABEL_BUNDLE_KIND && o.version === CART_LABEL_BUNDLE_VERSION && Array.isArray(o.entries);
}

export function parseCartLabelBundlePayload(raw: unknown): CartLabelBundlePayload | null {
  if (!isCartLabelBundlePayload(raw)) return null;
  return raw;
}

export type TemplateQtyInput = { templateId: string; tiers: LabelPriceTier[]; quantity: number };

/** Bulk tier pricing: sum subtotals per template using combined quantity. */
export function labelBulkSubtotalCents(groups: TemplateQtyInput[]): number {
  let total = 0;
  for (const g of groups) {
    const qty = Math.max(1, Math.floor(g.quantity));
    total += labelLineSubtotalCents(g.tiers, qty);
  }
  return total;
}

export function quantityByTemplateId(
  lines: { templateId: string; quantity: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) {
    const qty = Math.max(1, Math.floor(line.quantity || 1));
    map.set(line.templateId, (map.get(line.templateId) ?? 0) + qty);
  }
  return map;
}

export function bulkUnitCentsForLine(tiers: LabelPriceTier[], templateTotalQty: number): number {
  return unitCentsForLabelQuantity(tiers, Math.max(1, templateTotalQty));
}
