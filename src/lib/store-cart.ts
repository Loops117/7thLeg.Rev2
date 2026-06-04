import { parseCartLabelBundlePayload } from "@/lib/label-cart-bundle";
import { priceLabelCartForCustomer } from "@/lib/label-cart-event-pricing";
import { priceCartMerchandiseForCustomer } from "@/lib/checkout-cart-pricing";
import type { CartLabelBundleLineEntry, CartLabelLineView } from "@/lib/cart-label-types";
export type { CartLabelBundleLineEntry, CartLabelLineView } from "@/lib/cart-label-types";
import { LABEL_EDITOR_DOC_VERSION, parseLabelEditorDocument } from "@/lib/label-editor/document";
import { labelTemplateRowToPickerOption } from "@/lib/label-editor/template-meta";
import { prisma } from "@/lib/prisma";
export async function getOrCreateCart(customerId: string) {
  const existing = await prisma.cart.findUnique({ where: { customerId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { customerId } });
}

export async function getCartItemCount(customerId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: { select: { quantity: true } },
      labelItems: { select: { id: true } },
    },
  });
  if (!cart) return 0;
  const productQty = cart.items.reduce((s, i) => s + i.quantity, 0);
  return productQty + cart.labelItems.length;
}

export async function getCartLabelLinesForCustomer(customerId: string): Promise<CartLabelLineView[]> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      labelItems: {
        orderBy: { createdAt: "asc" },
        include: { template: true },
      },
    },
  });
  if (!cart?.labelItems.length) return [];

  return cart.labelItems.map((row) => {
    const bundle = parseCartLabelBundlePayload(row.documentJson);
    if (bundle) {
      const bundleEntries: CartLabelBundleLineEntry[] = bundle.entries.map((e) => ({
        displayName: e.displayName,
        quantity: e.quantity,
        templateName: e.templateName,
        dataRowLabel: e.dataRowLabel,
        doc: e.document,
        template: {
          ...e.templateMeta,
          sortOrder: 0,
          widthMm: e.widthMm,
          heightMm: e.heightMm,
          description: "",
          priceTiers: [],
        },
      }));
      return {
        id: row.id,
        displayName: row.displayName,
        quantity: row.quantity,
        unitPriceCents: row.unitCents,
        lineTotalCents: row.lineTotalCents,
        isBundle: true,
        bundleEntries,
      };
    }

    const legacyDoc = parseLabelEditorDocument(row.documentJson, row.templateId);
    const legacyPreviewEntry: CartLabelBundleLineEntry | undefined =
      legacyDoc.version === LABEL_EDITOR_DOC_VERSION
        ? {
            displayName: row.displayName,
            quantity: row.quantity,
            templateName: row.template.name,
            dataRowLabel: row.dataRowLabel,
            doc: legacyDoc,
            template: labelTemplateRowToPickerOption(row.template),
          }
        : undefined;

    return {
      id: row.id,
      displayName: row.displayName,
      quantity: row.quantity,
      unitPriceCents: row.unitCents,
      lineTotalCents: row.lineTotalCents,
      isBundle: false,
      legacyPreviewEntry,
      dataRowLabel: row.dataRowLabel,
      widthMm: row.widthMm,
      heightMm: row.heightMm,
      sheetsCount: row.sheetsCount,
      labelsPerSheet: row.labelsPerSheet,
      templateName: row.template.name,
    };
  });
}

export async function getCartLabelSubtotalCents(customerId: string): Promise<number> {
  const priced = await priceLabelCartForCustomer(customerId);
  return priced.payableSubtotalCents;
}

export async function getCartLabelDiscountCents(customerId: string): Promise<number> {
  const priced = await priceLabelCartForCustomer(customerId);
  return priced.discountCents;
}

export type CartLineView = {
  id: string;
  quantity: number;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  /** Payable unit price after timed-sale + checkout coupon rules. */
  unitPriceCents: number;
  lineTotalCents: number;
  /** Catalogue unit price before timed sale / coupon adjustments. */
  baseUnitPriceCents: number;
  variantLabel: string | null;
  /** When line was added as part of a kit bundle. */
  kitBundleLabel: string | null;
};

/** Cart totals + priced lines shared with checkout (timed sale persists on cart items; coupon stored on cart). */
export async function getCartPricingForCartPage(customerId: string): Promise<
  | { empty: true }
  | {
      empty: false;
      lines: CartLineView[];
      /** Payable merchandise (after timed sale + promo). */
      merchandiseSubtotalCents: number;
      /** Raw catalogue merchandise (qty × unit list price) before timed event pricing. */
      merchandiseListSubtotalCents: number;
      /** Sum of line qty × unit price before checkout coupon only (includes timed sale if active). */
      merchandiseBeforeCouponSubtotalCents: number;
      couponDiscountCents: number;
      kitDiscountCents: number;
      appliedCouponCode: string | null;
      /** Whole points the customer chose to redeem (clamped at checkout). */
      appliedLoyaltyPoints: number;
    }
> {
  const priced = await priceCartMerchandiseForCustomer(customerId);
  if (!priced.ok) return { empty: true };

  const kitLabelByInstance = new Map(priced.kitInstances.map((k) => [k.instanceId, k.label]));

  return {
    empty: false,
    lines: priced.pricedLines.map((r) => {
      const inst = r.productKitInstanceId?.trim();
      const kitBundleLabel = inst ? (kitLabelByInstance.get(inst) ?? "Kit") : null;
      return {
        id: r.cartItemId,
        quantity: r.quantity,
        productId: r.productId,
        variantId: r.variantId,
        name: r.productNameSnap,
        slug: r.slug,
        imageUrl: r.imageUrl,
        unitPriceCents: r.unitPriceCents,
        lineTotalCents: r.lineTotalCents,
        baseUnitPriceCents: r.baseUnitPriceCents,
        variantLabel: r.variantLabelSnap,
        kitBundleLabel,
      };
    }),
    merchandiseSubtotalCents: priced.merchandiseSubtotalCents,
    merchandiseListSubtotalCents: priced.merchandiseListSubtotalCents,
    merchandiseBeforeCouponSubtotalCents: priced.merchandiseBeforeCouponSubtotalCents,
    couponDiscountCents: priced.couponDiscountCents,
    kitDiscountCents: priced.kitDiscountCents,
    appliedCouponCode: priced.checkoutCouponCodeSnap.trim() || null,
    appliedLoyaltyPoints: priced.appliedLoyaltyPoints,
  };
}

export type CartHeaderPreview = {
  count: number;
  subtotalCents: number;
  lines: { name: string; detail: string | null; quantity: number; lineTotalCents: number }[];
};

export async function getCartHeaderPreview(customerId: string): Promise<CartHeaderPreview> {
  const [productPack, labelLines, labelPriced] = await Promise.all([
    getCartPricingForCartPage(customerId),
    getCartLabelLinesForCustomer(customerId),
    priceLabelCartForCustomer(customerId),
  ]);

  const lines: CartHeaderPreview["lines"] = [];
  if (!productPack.empty) {
    for (const line of productPack.lines) {
      lines.push({
        name: line.name,
        detail: line.variantLabel,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
      });
    }
  }
  for (const label of labelLines) {
    lines.push({
      name: label.displayName,
      detail: label.isBundle ? "Custom labels (bundle)" : (label.templateName ?? null),
      quantity: label.quantity,
      lineTotalCents: label.lineTotalCents,
    });
  }

  const productSub = productPack.empty ? 0 : productPack.merchandiseSubtotalCents;
  const labelSub = labelPriced.payableSubtotalCents;
  const count =
    (productPack.empty ? 0 : productPack.lines.reduce((s, l) => s + l.quantity, 0)) +
    labelLines.reduce((s, l) => s + l.quantity, 0);

  return { count, subtotalCents: productSub + labelSub, lines };
}

/** @deprecated Prefer getCartPricingForCartPage. */
export async function getCartLinesForCustomer(customerId: string): Promise<CartLineView[]> {
  const pack = await getCartPricingForCartPage(customerId);
  if (pack.empty) return [];
  return pack.lines;
}
