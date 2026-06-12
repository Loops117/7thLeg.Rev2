/** Product fields used to decide species-list auto-add eligibility. */
export type ProductSpeciesListMapping = {
  speciesAutoAdd: boolean;
  speciesListSpecies: string;
  speciesListInsectType: string;
  speciesListMorphName: string;
  speciesListCommonName: string;
  speciesListSource: string;
};

export const DEFAULT_SPECIES_LIST_SOURCE = "7th Leg";

export function isProductSpeciesListEligible(
  product: Pick<ProductSpeciesListMapping, "speciesAutoAdd" | "speciesListSpecies">,
): boolean {
  return product.speciesAutoAdd && product.speciesListSpecies.trim().length > 0;
}

export function normalizeSpeciesListKey(value: string): string {
  return value.trim().toLowerCase();
}

export function speciesListDedupeKey(species: string, morphName: string): string {
  return `${normalizeSpeciesListKey(species)}::${normalizeSpeciesListKey(morphName)}`;
}

export function sanitizeProductSpeciesListInput(input: {
  speciesAutoAdd: boolean;
  speciesListSpecies: string;
  speciesListInsectType: string;
  speciesListMorphName: string;
  speciesListCommonName: string;
  speciesListSource: string;
}): ProductSpeciesListMapping | { error: string } {
  const speciesListSpecies = input.speciesListSpecies.trim().slice(0, 200);
  const speciesListInsectType = input.speciesListInsectType.trim().slice(0, 120);
  const speciesListMorphName = input.speciesListMorphName.trim().slice(0, 200);
  const speciesListCommonName = input.speciesListCommonName.trim().slice(0, 200);
  const speciesListSource =
    input.speciesListSource.trim().slice(0, 200) || DEFAULT_SPECIES_LIST_SOURCE;

  if (input.speciesAutoAdd && !speciesListSpecies) {
    return { error: "Species is required when auto-add on purchase is enabled." };
  }

  return {
    speciesAutoAdd: !!input.speciesAutoAdd,
    speciesListSpecies,
    speciesListInsectType,
    speciesListMorphName,
    speciesListCommonName,
    speciesListSource,
  };
}

export function formatSpeciesPurchaseNote(orderId: string, date: Date): string {
  const shortId = orderId.slice(0, 8);
  const dateStr = date.toISOString().slice(0, 10);
  return `New purchase at 7th Leg on ${dateStr} (order ${shortId}).`;
}
