import {
  resolveSpeciesListTitle,
  speciesDateFromDb,
  type PublicCustomerSpeciesEntry,
  toPublicSpeciesEntry,
  type CustomerSpeciesEntryRow,
} from "@/lib/customer-species";
import { prisma } from "@/lib/prisma";

export type PublicSpeciesListPage = {
  listTitle: string;
  entries: PublicCustomerSpeciesEntry[];
};

export async function getPublicSpeciesListByToken(
  shareToken: string,
): Promise<PublicSpeciesListPage | null> {
  const token = shareToken.trim();
  if (!token) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      speciesListShareToken: token,
      speciesListPublicEnabled: true,
    },
    select: {
      speciesListDisplayName: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
      speciesEntries: {
        orderBy: [{ species: "asc" }, { insectType: "asc" }, { morphName: "asc" }],
        select: {
          id: true,
          species: true,
          insectType: true,
          morphName: true,
          commonName: true,
          dateObtained: true,
          available: true,
          availabilityNotes: true,
        },
      },
    },
  });

  if (!customer) return null;

  const entries: PublicCustomerSpeciesEntry[] = customer.speciesEntries.map((row) => {
    const full: CustomerSpeciesEntryRow = {
      id: row.id,
      species: row.species,
      insectType: row.insectType,
      morphName: row.morphName,
      commonName: row.commonName,
      dateObtained: speciesDateFromDb(row.dateObtained),
      source: "",
      priceCents: null,
      acquisitionNotes: "",
      available: row.available,
      availabilityNotes: row.availabilityNotes,
    };
    return toPublicSpeciesEntry(full);
  });

  return {
    listTitle: resolveSpeciesListTitle(customer),
    entries,
  };
}
