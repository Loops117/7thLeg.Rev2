"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  bulkUnitCentsForLine,
  type CartLabelBundleEntry,
  type CartLabelBundlePayload,
  CART_LABEL_BUNDLE_KIND,
  CART_LABEL_BUNDLE_VERSION,
  labelBulkSubtotalCents,
  quantityByTemplateId,
} from "@/lib/label-cart-bundle";
import { computeLabelImposition } from "@/lib/label-print-imposition";
import { LABEL_EDITOR_DOC_VERSION, parseLabelEditorDocument } from "@/lib/label-editor/document";
import { labelTemplateRowToMeta } from "@/lib/label-editor/template-meta";
import { parsePriceTiersJson } from "@/lib/label-template-tiers";
import {
  batchFinishSurchargeCents,
  perLabelFinishCentsForTemplate,
  type BatchFinishSelection,
} from "@/lib/label-finish-options";
import { listTemplateFinishOptionsMap } from "@/lib/label-finish-server";
import { ownerFromCustomerId } from "@/lib/cart-owner";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/store-cart";
import type { LabelFulfillmentSheetFormat } from "@/lib/site-config-types";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("Sign in to add labels to your cart.");
  }
  return session.user.id;
}

export type AddLabelCartLineInput = {
  templateId: string;
  savedDesignId?: string | null;
  displayName: string;
  document: unknown;
  quantity: number;
  dataRowLabel?: string | null;
};

export type AddLabelsToCartResult =
  | { ok: true; addedCount: number; cartLabelSubtotalCents: number }
  | { ok: false; error: string };

export async function addLabelsToCartAction(
  lines: AddLabelCartLineInput[],
  finishSelection?: BatchFinishSelection,
): Promise<AddLabelsToCartResult> {
  try {
    const customerId = await requireCustomerId();
    if (!lines.length) return { ok: false, error: "Select at least one label." };

    const templateIds = [...new Set(lines.map((l) => l.templateId.trim()))];
    const finishOptionsByTemplateId = await listTemplateFinishOptionsMap(templateIds);

    const site = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const minQty = Math.max(1, site?.labelCartMinQuantity ?? 1);
    const sheetFormat = (site?.labelFulfillmentSheetFormat ?? "letter") as LabelFulfillmentSheetFormat;
    const sheetMarginMm = site?.labelFulfillmentSheetMarginMm ?? 12.7;
    const labelGapMm = site?.labelFulfillmentLabelGapMm ?? 2;

    const cart = await getOrCreateCart(ownerFromCustomerId(customerId));
    const templateCache = new Map<string, Awaited<ReturnType<typeof prisma.labelTemplate.findFirst>>>();
    const bundleEntries: CartLabelBundleEntry[] = [];
    const qtyByTemplate = quantityByTemplateId(
      lines.map((l) => ({ templateId: l.templateId.trim(), quantity: l.quantity })),
    );

    for (const line of lines) {
      const templateId = line.templateId.trim();
      let template = templateCache.get(templateId);
      if (template === undefined) {
        template = await prisma.labelTemplate.findFirst({
          where: { id: templateId, active: true },
        });
        templateCache.set(templateId, template);
      }
      if (!template) return { ok: false, error: "A label template is no longer available." };

      const doc = parseLabelEditorDocument(line.document, template.id);
      if (doc.version !== LABEL_EDITOR_DOC_VERSION) {
        return { ok: false, error: "Unsupported label document version." };
      }

      let savedDesignId: string | null = line.savedDesignId?.trim() || null;
      if (savedDesignId) {
        const owned = await prisma.customerLabelDesign.findFirst({
          where: { id: savedDesignId, customerId },
        });
        if (!owned) savedDesignId = null;
      }

      const qty = Math.max(minQty, Math.min(9999, Math.floor(line.quantity || 1)));
      const tiers = parsePriceTiersJson(template.priceTiersJson);

      const imp = computeLabelImposition({
        labelWidthMm: template.widthMm,
        labelHeightMm: template.heightMm,
        sheetFormat,
        sheetMarginMm,
        labelGapMm,
      });
      const labelsPerSheet = Math.max(1, imp.labelsPerSheet);
      const sheetsCount = Math.max(1, Math.ceil(qty / labelsPerSheet));

      const finishDeltaPerLabel = perLabelFinishCentsForTemplate(
        template.id,
        finishOptionsByTemplateId,
        finishSelection,
      );
      const finishSelections = (finishSelection?.choices ?? []).map((c) => {
        const row = (finishOptionsByTemplateId[template.id] ?? []).find(
          (o) => o.finishOptionId === c.finishOptionId,
        );
        return {
          groupName: c.groupName,
          finishOptionId: c.finishOptionId,
          finishOptionName: c.finishOptionName,
          priceDeltaCents: Math.max(0, row?.priceDeltaCents ?? 0),
        };
      });
      bundleEntries.push({
        displayName: line.displayName.trim().slice(0, 160) || template.name,
        quantity: qty,
        templateId: template.id,
        templateName: template.name,
        savedDesignId,
        dataRowLabel: line.dataRowLabel?.trim().slice(0, 80) || null,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        labelsPerSheet,
        sheetsCount,
        document: { ...doc, version: LABEL_EDITOR_DOC_VERSION },
        templateMeta: labelTemplateRowToMeta(template),
        finishPriceDeltaCents: finishDeltaPerLabel,
        finishSelections: finishSelections.length > 0 ? finishSelections : undefined,
        finishOptionId:
          finishSelections.length === 1 ? finishSelections[0]!.finishOptionId : null,
        finishOptionName:
          finishSelections.length === 1
            ? finishSelections[0]!.finishOptionName.slice(0, 80)
            : finishSelections.length > 1
              ? finishSelections.map((c) => c.finishOptionName).join(", ").slice(0, 80)
              : null,
      });
    }

    const tierGroups = [...qtyByTemplate.entries()].map(([templateId, quantity]) => {
      const template = templateCache.get(templateId);
      if (!template) throw new Error("Template missing.");
      return {
        templateId,
        tiers: parsePriceTiersJson(template.priceTiersJson),
        quantity,
      };
    });

    const finishSurcharge = batchFinishSurchargeCents(
      lines.map((l) => ({ templateId: l.templateId.trim(), quantity: l.quantity })),
      finishOptionsByTemplateId,
      finishSelection,
    );
    const lineTotalCents = labelBulkSubtotalCents(tierGroups) + finishSurcharge;
    const totalQty = bundleEntries.reduce((s, e) => s + e.quantity, 0);
    const unitCents = totalQty > 0 ? Math.round(lineTotalCents / totalQty) : 0;
    const totalSheets = bundleEntries.reduce((s, e) => s + e.sheetsCount, 0);
    const first = bundleEntries[0]!;
    const primaryTemplate = templateCache.get(first.templateId)!;
    const primaryTemplateQty = qtyByTemplate.get(first.templateId) ?? totalQty;

    const bundlePayload: CartLabelBundlePayload = {
      version: CART_LABEL_BUNDLE_VERSION,
      kind: CART_LABEL_BUNDLE_KIND,
      entries: bundleEntries,
    };

    const designCount = bundleEntries.length;
    const displayName =
      designCount === 1
        ? bundleEntries[0]!.displayName
        : `Custom labels (${designCount} designs, ${totalQty} labels)`;

    await prisma.cartLabelItem.create({
      data: {
        cartId: cart.id,
        templateId: primaryTemplate.id,
        savedDesignId: designCount === 1 ? bundleEntries[0]!.savedDesignId : null,
        displayName: displayName.slice(0, 160),
        documentJson: bundlePayload,
        quantity: totalQty,
        unitCents: bulkUnitCentsForLine(
          parsePriceTiersJson(primaryTemplate.priceTiersJson),
          primaryTemplateQty,
        ),
        lineTotalCents,
        dataRowLabel: null,
        widthMm: first.widthMm,
        heightMm: first.heightMm,
        labelsPerSheet: first.labelsPerSheet,
        sheetsCount: totalSheets,
        sheetFormat,
      },
    });

    const sum = await prisma.cartLabelItem.aggregate({
      where: { cartId: cart.id },
      _sum: { lineTotalCents: true },
    });

    revalidatePath("/cart");
    revalidatePath("/");
    revalidatePath("/labels", "layout");

    return {
      ok: true,
      addedCount: 1,
      cartLabelSubtotalCents: sum._sum.lineTotalCents ?? 0,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add to cart." };
  }
}

export async function removeCartLabelLineAction(lineId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    await prisma.cartLabelItem.deleteMany({
      where: { id: lineId, cart: { customerId } },
    });
    revalidatePath("/cart");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Remove failed." };
  }
}
