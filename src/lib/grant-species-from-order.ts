import type { Prisma } from "@/generated/prisma/client";
import {
  formatSpeciesPurchaseNote,
  isProductSpeciesListEligible,
  speciesListDedupeKey,
  type ProductSpeciesListMapping,
} from "@/lib/product-species-list";

type Tx = Prisma.TransactionClient;

type LineWithProduct = {
  id: string;
  addToSpeciesList: boolean;
  unitPriceCents: number;
  product: ProductSpeciesListMapping;
};

/** Auto-add or append customer species entries for eligible paid order lines. Idempotent per line. */
export async function grantSpeciesFromPaidOrder(
  tx: Tx,
  order: { id: string; customerId: string; createdAt: Date },
  lineItems: LineWithProduct[],
): Promise<void> {
  const existingGrants = await tx.orderLineItemSpeciesGrant.findMany({
    where: { orderLineItemId: { in: lineItems.map((l) => l.id) } },
    select: { orderLineItemId: true },
  });
  const grantedLineIds = new Set(existingGrants.map((g) => g.orderLineItemId));

  const customerEntries = await tx.customerSpeciesEntry.findMany({
    where: { customerId: order.customerId },
    select: {
      id: true,
      species: true,
      morphName: true,
      acquisitionNotes: true,
    },
  });
  const entryByKey = new Map(
    customerEntries.map((e) => [speciesListDedupeKey(e.species, e.morphName), e]),
  );

  const purchaseNote = formatSpeciesPurchaseNote(order.id, order.createdAt);

  for (const li of lineItems) {
    if (grantedLineIds.has(li.id)) continue;

    const eligible = isProductSpeciesListEligible(li.product);
    if (!li.addToSpeciesList || !eligible) {
      await tx.orderLineItemSpeciesGrant.create({
        data: {
          orderLineItemId: li.id,
          action: "skipped",
        },
      });
      continue;
    }

    const species = li.product.speciesListSpecies.trim();
    const morphName = li.product.speciesListMorphName.trim();
    const key = speciesListDedupeKey(species, morphName);
    const existing = entryByKey.get(key);

    if (existing) {
      const prior = existing.acquisitionNotes.trim();
      const nextNotes = prior ? `${prior}\n${purchaseNote}` : purchaseNote;
      await tx.customerSpeciesEntry.update({
        where: { id: existing.id },
        data: { acquisitionNotes: nextNotes },
      });
      existing.acquisitionNotes = nextNotes;
      await tx.orderLineItemSpeciesGrant.create({
        data: {
          orderLineItemId: li.id,
          customerSpeciesEntryId: existing.id,
          action: "appended",
        },
      });
      continue;
    }

    const created = await tx.customerSpeciesEntry.create({
      data: {
        customerId: order.customerId,
        species,
        insectType: li.product.speciesListInsectType.trim(),
        morphName,
        commonName: li.product.speciesListCommonName.trim(),
        dateObtained: order.createdAt,
        source: li.product.speciesListSource.trim() || "7th Leg",
        priceCents: li.unitPriceCents > 0 ? li.unitPriceCents : null,
        acquisitionNotes: purchaseNote,
      },
      select: { id: true, species: true, morphName: true, acquisitionNotes: true },
    });
    entryByKey.set(key, created);
    await tx.orderLineItemSpeciesGrant.create({
      data: {
        orderLineItemId: li.id,
        customerSpeciesEntryId: created.id,
        action: "created",
      },
    });
  }
}
