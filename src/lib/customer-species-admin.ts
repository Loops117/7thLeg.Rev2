import type { Prisma } from "@/generated/prisma/client";

export type SpeciesListAdminRow = {
  id: string;
  insectType: string;
  species: string;
  morphName: string;
  commonName: string;
  dateObtained: string | null;
  source: string;
  priceCents: number | null;
  available: boolean;
  availabilityNotes: string;
  updatedAt: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  speciesListPublicEnabled: boolean;
  shareToken: string | null;
};

export const SPECIES_LIST_SORT_VALUES = new Set([
  "type_asc",
  "type_desc",
  "species_asc",
  "species_desc",
  "morph_asc",
  "morph_desc",
  "common_asc",
  "common_desc",
  "obtained_asc",
  "obtained_desc",
  "source_asc",
  "source_desc",
  "price_asc",
  "price_desc",
  "available_asc",
  "available_desc",
  "customer_asc",
  "customer_desc",
  "updated_asc",
  "updated_desc",
]);

export type SpeciesListSort = `${string}_${"asc" | "desc"}`;

export function parseSpeciesListSort(raw: string | undefined): SpeciesListSort {
  const s = (raw ?? "").trim();
  return SPECIES_LIST_SORT_VALUES.has(s) ? (s as SpeciesListSort) : "species_asc";
}

export function speciesListAdminOrderBy(
  sort: SpeciesListSort,
): Prisma.CustomerSpeciesEntryOrderByWithRelationInput | Prisma.CustomerSpeciesEntryOrderByWithRelationInput[] {
  switch (sort) {
    case "type_asc":
      return [{ insectType: "asc" }, { species: "asc" }];
    case "type_desc":
      return [{ insectType: "desc" }, { species: "asc" }];
    case "species_desc":
      return [{ species: "desc" }, { morphName: "asc" }];
    case "morph_asc":
      return [{ morphName: "asc" }, { species: "asc" }];
    case "morph_desc":
      return [{ morphName: "desc" }, { species: "asc" }];
    case "common_asc":
      return [{ commonName: "asc" }, { species: "asc" }];
    case "common_desc":
      return [{ commonName: "desc" }, { species: "asc" }];
    case "obtained_asc":
      return [{ dateObtained: { sort: "asc", nulls: "last" } }, { species: "asc" }];
    case "obtained_desc":
      return [{ dateObtained: { sort: "desc", nulls: "last" } }, { species: "asc" }];
    case "source_asc":
      return [{ source: "asc" }, { species: "asc" }];
    case "source_desc":
      return [{ source: "desc" }, { species: "asc" }];
    case "price_asc":
      return [{ priceCents: { sort: "asc", nulls: "last" } }, { species: "asc" }];
    case "price_desc":
      return [{ priceCents: { sort: "desc", nulls: "last" } }, { species: "asc" }];
    case "available_asc":
      return [{ available: "asc" }, { species: "asc" }];
    case "available_desc":
      return [{ available: "desc" }, { species: "asc" }];
    case "customer_asc":
      return [{ customer: { email: "asc" } }, { species: "asc" }];
    case "customer_desc":
      return [{ customer: { email: "desc" } }, { species: "asc" }];
    case "updated_asc":
      return [{ updatedAt: "asc" }, { species: "asc" }];
    case "updated_desc":
      return [{ updatedAt: "desc" }, { species: "asc" }];
    case "species_asc":
    default:
      return [{ species: "asc" }, { morphName: "asc" }];
  }
}

export function speciesListAdminWhere(
  q: string,
  insectType: string,
  available: string,
): Prisma.CustomerSpeciesEntryWhereInput {
  const where: Prisma.CustomerSpeciesEntryWhereInput = {};
  const t = q.trim();
  if (t) {
    where.OR = [
      { species: { contains: t, mode: "insensitive" } },
      { morphName: { contains: t, mode: "insensitive" } },
      { commonName: { contains: t, mode: "insensitive" } },
      { insectType: { contains: t, mode: "insensitive" } },
      { source: { contains: t, mode: "insensitive" } },
      { customer: { email: { contains: t, mode: "insensitive" } } },
      { customer: { displayName: { contains: t, mode: "insensitive" } } },
      { customer: { firstName: { contains: t, mode: "insensitive" } } },
      { customer: { lastName: { contains: t, mode: "insensitive" } } },
    ];
  }
  const typeFilter = insectType.trim();
  if (typeFilter) {
    where.insectType = typeFilter;
  }
  const avail = available.trim().toLowerCase();
  if (avail === "yes" || avail === "true" || avail === "1") {
    where.available = true;
  } else if (avail === "no" || avail === "false" || avail === "0") {
    where.available = false;
  }
  return where;
}

export function toggleSpeciesListSort(sort: SpeciesListSort, column: string): SpeciesListSort {
  const [col, dir] = sort.split("_") as [string, "asc" | "desc"];
  const nextDir = col === column ? (dir === "asc" ? "desc" : "asc") : "asc";
  const candidate = `${column}_${nextDir}` as SpeciesListSort;
  return SPECIES_LIST_SORT_VALUES.has(candidate) ? candidate : "species_asc";
}

export const SPECIES_LIST_SORT_COLUMNS: { key: string; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "species", label: "Species" },
  { key: "morph", label: "Morph" },
  { key: "common", label: "Common" },
  { key: "obtained", label: "Obtained" },
  { key: "source", label: "Source" },
  { key: "price", label: "Price" },
  { key: "available", label: "Avail." },
  { key: "customer", label: "Customer" },
  { key: "updated", label: "Updated" },
];
