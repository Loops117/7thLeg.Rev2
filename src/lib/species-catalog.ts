import type { Prisma } from "@/generated/prisma/client";

export type SpeciesCatalogRow = {
  id: string;
  type: string;
  genus: string;
  species: string;
  commonName: string;
  morph: string;
  approved: boolean;
  createdAt: string;
};

export type SpeciesCatalogStatusFilter = "all" | "approved" | "pending";

export type SpeciesCatalogSort =
  | "date_desc"
  | "date_asc"
  | "type_asc"
  | "type_desc"
  | "genus_asc"
  | "genus_desc"
  | "species_asc"
  | "species_desc"
  | "common_asc"
  | "common_desc";

export const SPECIES_CATALOG_SORT_VALUES = new Set<SpeciesCatalogSort>([
  "date_desc",
  "date_asc",
  "type_asc",
  "type_desc",
  "genus_asc",
  "genus_desc",
  "species_asc",
  "species_desc",
  "common_asc",
  "common_desc",
]);

export const SPECIES_CATALOG_STATUS_VALUES = new Set<SpeciesCatalogStatusFilter>([
  "all",
  "approved",
  "pending",
]);

export function parseSpeciesCatalogSort(raw: string | undefined): SpeciesCatalogSort {
  const s = (raw ?? "").trim() as SpeciesCatalogSort;
  return SPECIES_CATALOG_SORT_VALUES.has(s) ? s : "date_desc";
}

export function parseSpeciesCatalogStatus(raw: string | undefined): SpeciesCatalogStatusFilter {
  const s = (raw ?? "").trim() as SpeciesCatalogStatusFilter;
  return SPECIES_CATALOG_STATUS_VALUES.has(s) ? s : "all";
}

export function speciesCatalogOrderBy(
  sort: SpeciesCatalogSort,
): Prisma.SpeciesCatalogEntryOrderByWithRelationInput | Prisma.SpeciesCatalogEntryOrderByWithRelationInput[] {
  switch (sort) {
    case "date_asc":
      return { createdAt: "asc" };
    case "type_asc":
      return [{ type: "asc" }, { genus: "asc" }, { species: "asc" }];
    case "type_desc":
      return [{ type: "desc" }, { genus: "desc" }, { species: "desc" }];
    case "genus_asc":
      return [{ genus: "asc" }, { species: "asc" }, { morph: "asc" }];
    case "genus_desc":
      return [{ genus: "desc" }, { species: "desc" }, { morph: "desc" }];
    case "species_asc":
      return [{ species: "asc" }, { genus: "asc" }];
    case "species_desc":
      return [{ species: "desc" }, { genus: "desc" }];
    case "common_asc":
      return [{ commonName: "asc" }, { genus: "asc" }];
    case "common_desc":
      return [{ commonName: "desc" }, { genus: "desc" }];
    case "date_desc":
    default:
      return { createdAt: "desc" };
  }
}

export function speciesCatalogSearchWhere(
  q: string,
  status: SpeciesCatalogStatusFilter,
  typeFilter?: string,
): Prisma.SpeciesCatalogEntryWhereInput {
  const t = q.trim();
  const typeQ = (typeFilter ?? "").trim();
  const parts: Prisma.SpeciesCatalogEntryWhereInput[] = [];
  if (status === "approved") parts.push({ approved: true });
  if (status === "pending") parts.push({ approved: false });
  if (typeQ) parts.push({ type: { equals: typeQ, mode: "insensitive" } });
  if (t) {
    parts.push({
      OR: [
        { type: { contains: t, mode: "insensitive" } },
        { genus: { contains: t, mode: "insensitive" } },
        { species: { contains: t, mode: "insensitive" } },
        { commonName: { contains: t, mode: "insensitive" } },
        { morph: { contains: t, mode: "insensitive" } },
        { id: { contains: t, mode: "insensitive" } },
      ],
    });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export function sortSpeciesCatalogRows(rows: SpeciesCatalogRow[], sort: SpeciesCatalogSort): SpeciesCatalogRow[] {
  const list = [...rows];
  const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  list.sort((a, b) => {
    switch (sort) {
      case "date_asc":
        return a.createdAt.localeCompare(b.createdAt);
      case "type_asc":
        return cmp(a.type, b.type) || cmp(a.genus, b.genus) || cmp(a.species, b.species);
      case "type_desc":
        return cmp(b.type, a.type) || cmp(b.genus, a.genus) || cmp(b.species, a.species);
      case "genus_asc":
        return cmp(a.genus, b.genus) || cmp(a.species, b.species);
      case "genus_desc":
        return cmp(b.genus, a.genus) || cmp(b.species, a.species);
      case "species_asc":
        return cmp(a.species, b.species) || cmp(a.genus, b.genus);
      case "species_desc":
        return cmp(b.species, a.species) || cmp(b.genus, a.genus);
      case "common_asc":
        return cmp(a.commonName, b.commonName) || cmp(a.genus, b.genus);
      case "common_desc":
        return cmp(b.commonName, a.commonName) || cmp(b.genus, a.genus);
      case "date_desc":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
  return list;
}

export function filterSpeciesCatalogRows(
  rows: SpeciesCatalogRow[],
  q: string,
  status: SpeciesCatalogStatusFilter,
  typeFilter: string,
): SpeciesCatalogRow[] {
  const t = q.trim().toLowerCase();
  const typeQ = typeFilter.trim().toLowerCase();
  return rows.filter((r) => {
    if (status === "approved" && !r.approved) return false;
    if (status === "pending" && r.approved) return false;
    if (typeQ && r.type.trim().toLowerCase() !== typeQ) return false;
    if (!t) return true;
    const hay = [r.type, r.genus, r.species, r.commonName, r.morph, r.id].join(" ").toLowerCase();
    return hay.includes(t);
  });
}

export type SpeciesCatalogInput = {
  type: string;
  genus: string;
  species: string;
  commonName: string;
  morph: string;
  approved: boolean;
};

export function normalizeSpeciesCatalogInput(input: SpeciesCatalogInput): SpeciesCatalogInput | { error: string } {
  const type = input.type.trim().slice(0, 80);
  const genus = input.genus.trim();
  const species = input.species.trim();
  if (!genus) return { error: "Genus is required." };
  if (!species) return { error: "Species is required." };
  const commonName = input.commonName.trim().slice(0, 200);
  const morph = input.morph.trim().slice(0, 200);
  if (genus.length > 120) return { error: "Genus is too long (max 120 characters)." };
  if (species.length > 120) return { error: "Species is too long (max 120 characters)." };
  return { type, genus, species, commonName, morph, approved: !!input.approved };
}

export function speciesCatalogDedupeKey(type: string, genus: string, species: string, morph: string): string {
  return `${type.trim().toLowerCase()}\u0000${genus.trim().toLowerCase()}\u0000${species.trim().toLowerCase()}\u0000${morph.trim().toLowerCase()}`;
}

/** Parse a single CSV line respecting quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseApprovedCell(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t) return false;
  return ["1", "true", "yes", "y", "approved", "approve", "on"].includes(t);
}

export type SpeciesCsvRow = SpeciesCatalogInput;

export type SpeciesCsvParseResult =
  | { ok: true; rows: SpeciesCsvRow[]; skippedHeaderOnly: boolean }
  | { ok: false; error: string };

/**
 * Import CSV with headers: type, genus, species, common_name, morph, approved (optional).
 */
export function parseSpeciesCatalogCsv(text: string): SpeciesCsvParseResult {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { ok: false, error: "CSV file is empty." };

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { ok: false, error: "CSV file has no data rows." };

  const headerCells = parseCsvLine(lines[0]!);
  const headerKeys = headerCells.map(normalizeHeader);

  const typeIdx = headerKeys.findIndex((h) => h === "type" || h === "taxon_type" || h === "category");
  const genusIdx = headerKeys.findIndex((h) => h === "genus");
  const speciesIdx = headerKeys.findIndex((h) => h === "species");
  const commonIdx = headerKeys.findIndex((h) => h === "common_name" || h === "commonname");
  const morphIdx = headerKeys.findIndex((h) => h === "morph");
  const approvedIdx = headerKeys.findIndex((h) => h === "approved" || h === "approve");

  const hasHeader = genusIdx >= 0 && speciesIdx >= 0;
  const dataStart = hasHeader ? 1 : 0;

  if (!hasHeader) {
    if (headerCells.length < 2) {
      return { ok: false, error: "CSV must include genus and species columns (header row recommended)." };
    }
  }

  const rows: SpeciesCsvRow[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    let type = "";
    let genus: string;
    let species: string;
    let commonName = "";
    let morph = "";
    let approved = false;

    if (hasHeader) {
      if (typeIdx >= 0) type = cells[typeIdx] ?? "";
      genus = cells[genusIdx] ?? "";
      species = cells[speciesIdx] ?? "";
      if (commonIdx >= 0) commonName = cells[commonIdx] ?? "";
      if (morphIdx >= 0) morph = cells[morphIdx] ?? "";
      if (approvedIdx >= 0) approved = parseApprovedCell(cells[approvedIdx] ?? "");
    } else {
      genus = cells[0] ?? "";
      species = cells[1] ?? "";
      commonName = cells[2] ?? "";
      morph = cells[3] ?? "";
      type = cells[4] ?? "";
      if (cells[5]) approved = parseApprovedCell(cells[5]);
    }

    const norm = normalizeSpeciesCatalogInput({ type, genus, species, commonName, morph, approved });
    if ("error" in norm) continue;
    rows.push(norm);
  }

  if (rows.length === 0) {
    return { ok: false, error: "No valid rows found. Check genus and species columns." };
  }

  return { ok: true, rows, skippedHeaderOnly: hasHeader && lines.length === 1 };
}

export function formatSpeciesDisplay(row: Pick<SpeciesCatalogInput, "genus" | "species" | "morph">): string {
  const sci = `${row.genus} ${row.species}`.trim();
  return row.morph.trim() ? `${sci} (${row.morph.trim()})` : sci;
}

export function distinctSpeciesTypes(rows: Pick<SpeciesCatalogRow, "type">[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const t = r.type.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
