import { bagItemDisplayName } from "@/lib/label-bag-display-name";
import { parseCartLabelBundlePayload } from "@/lib/label-cart-bundle";
import { labelBagItemMatchesSearch, parseCustomerLabelBagItemsJson } from "@/lib/customer-label-bag";
import type { LabelEditorDocument } from "@/lib/label-editor/document";
import { parseLabelEditorDocument } from "@/lib/label-editor/document";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { formatCustomerFullName } from "@/lib/customer-display-name";

export type CreatedLabelGallerySource = "saved" | "cart" | "bag";

export type CreatedLabelGalleryItem = {
  key: string;
  source: CreatedLabelGallerySource;
  name: string;
  customer: string;
  customerEmail: string;
  customerId: string | null;
  customerGroupKey: string;
  templateName: string;
  subtitle: string;
  template: LabelTemplatePickerOption;
  doc: LabelEditorDocument;
};

export type CreatedLabelCustomerGroup = {
  groupKey: string;
  customer: string;
  customerEmail: string;
  customerId: string | null;
  items: CreatedLabelGalleryItem[];
};

type CustomerSlice = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
} | null;

function formatCustomer(c: CustomerSlice): { label: string; email: string; id: string | null } {
  if (!c) return { label: "Guest", email: "—", id: null };
  const name = formatCustomerFullName(c);
  return { label: name || c.email, email: c.email, id: c.id };
}

function customerGroupKey(c: CustomerSlice, sessionId?: string | null): string {
  if (c?.id) return `c:${c.id}`;
  if (c?.email) return `e:${c.email.toLowerCase()}`;
  if (sessionId) return `s:${sessionId}`;
  return "guest";
}

function pushItem(
  items: CreatedLabelGalleryItem[],
  templateMap: Map<string, LabelTemplatePickerOption>,
  input: {
    key: string;
    source: CreatedLabelGallerySource;
    name: string;
    customer: CustomerSlice;
    sessionId?: string | null;
    templateId: string;
    documentJson: unknown;
    subtitle: string;
  },
): boolean {
  const template = templateMap.get(input.templateId);
  if (!template) return false;
  try {
    const doc = parseLabelEditorDocument(input.documentJson, input.templateId);
    const cust = formatCustomer(input.customer);
    items.push({
      key: input.key,
      source: input.source,
      name: input.name,
      customer: cust.label,
      customerEmail: cust.email,
      customerId: cust.id,
      customerGroupKey: customerGroupKey(input.customer, input.sessionId),
      templateName: template.name,
      subtitle: input.subtitle,
      template,
      doc,
    });
    return true;
  } catch {
    return false;
  }
}

export function groupCreatedLabelsByCustomer(items: CreatedLabelGalleryItem[]): CreatedLabelCustomerGroup[] {
  const map = new Map<string, CreatedLabelCustomerGroup>();
  for (const item of items) {
    let group = map.get(item.customerGroupKey);
    if (!group) {
      group = {
        groupKey: item.customerGroupKey,
        customer: item.customer,
        customerEmail: item.customerEmail,
        customerId: item.customerId,
        items: [],
      };
      map.set(item.customerGroupKey, group);
    }
    group.items.push(item);
  }
  return [...map.values()].sort((a, b) => {
    const byName = a.customer.localeCompare(b.customer);
    if (byName !== 0) return byName;
    return a.customerEmail.localeCompare(b.customerEmail);
  });
}

export function buildCreatedLabelsGalleryItems(
  savedDesigns: Array<{
    id: string;
    name: string;
    templateId: string;
    documentJson: unknown;
    updatedAt: Date;
    folder: { name: string } | null;
    customer: CustomerSlice;
  }>,
  cartLabels: Array<{
    id: string;
    displayName: string;
    templateId: string;
    documentJson: unknown;
    quantity: number;
    sheetsCount: number;
    createdAt: Date;
    cart: { customer: CustomerSlice; sessionId: string | null };
  }>,
  customerBags: Array<{
    customerId: string;
    itemsJson: unknown;
    customer: CustomerSlice;
  }>,
  templateMap: Map<string, LabelTemplatePickerOption>,
  searchQuery = "",
): { items: CreatedLabelGalleryItem[]; skipped: number } {
  const items: CreatedLabelGalleryItem[] = [];
  let skipped = 0;
  const q = searchQuery.trim();

  for (const d of savedDesigns) {
    const ok = pushItem(items, templateMap, {
      key: `saved-${d.id}`,
      source: "saved",
      name: d.name,
      customer: d.customer,
      templateId: d.templateId,
      documentJson: d.documentJson,
      subtitle: d.folder?.name ? `Saved · ${d.folder.name}` : "Saved · library",
    });
    if (!ok) skipped += 1;
  }

  for (const line of cartLabels) {
    const bundle = parseCartLabelBundlePayload(line.documentJson);
    if (bundle) {
      bundle.entries.forEach((entry, index) => {
        const rowLabel = entry.dataRowLabel ? ` · row ${entry.dataRowLabel}` : "";
        const ok = pushItem(items, templateMap, {
          key: `cart-${line.id}-${index}`,
          source: "cart",
          name: entry.displayName,
          customer: line.cart.customer,
          sessionId: line.cart.sessionId,
          templateId: entry.templateId,
          documentJson: entry.document,
          subtitle: line.cart.customer
            ? `In cart · ${entry.quantity} label${entry.quantity === 1 ? "" : "s"}${rowLabel}`
            : `Guest cart · ${entry.quantity} label${entry.quantity === 1 ? "" : "s"}${rowLabel}`,
        });
        if (!ok) skipped += 1;
      });
      continue;
    }

    const ok = pushItem(items, templateMap, {
      key: `cart-${line.id}`,
      source: "cart",
      name: line.displayName,
      customer: line.cart.customer,
      sessionId: line.cart.sessionId,
      templateId: line.templateId,
      documentJson: line.documentJson,
      subtitle: line.cart.customer
        ? `In cart · ${line.quantity} label${line.quantity === 1 ? "" : "s"}`
        : `Guest cart · ${line.quantity} label${line.quantity === 1 ? "" : "s"}`,
    });
    if (!ok) skipped += 1;
  }

  for (const bag of customerBags) {
    const bagItems = parseCustomerLabelBagItemsJson(bag.itemsJson);
    for (const item of bagItems) {
      if (q && !labelBagItemMatchesSearch(item, q)) continue;
      const name = bagItemDisplayName(item);
      const inBag = item.inBag !== false;
      const ok = pushItem(items, templateMap, {
        key: `bag-${bag.customerId}-${item.id}`,
        source: "bag",
        name,
        customer: bag.customer,
        templateId: item.templateId,
        documentJson: item.document,
        subtitle: inBag
          ? `Label selection · in bag · qty ${item.quantity}`
          : `Label selection · library only · qty ${item.quantity}`,
      });
      if (!ok) skipped += 1;
    }
  }

  return { items, skipped };
}
