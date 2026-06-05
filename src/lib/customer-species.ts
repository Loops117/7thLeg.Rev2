import { csvRow, escapeCsvCell, parseCsvLine, parseYesNo } from "@/lib/product-catalog-csv";
import { parsePriceToCents } from "@/lib/product-slug";

export type CustomerSpeciesEntryRow = {
  id: string;
  species: string;
  insectType: string;
  morphName: string;
  commonName: string;
  dateObtained: string | null;
  source: string;
  priceCents: number | null;
  acquisitionNotes: string;
  available: boolean;
  availabilityNotes: string;
};

export type CustomerSpeciesEntryInput = Omit<CustomerSpeciesEntryRow, "id">;

export type PublicCustomerSpeciesEntry = Pick<
  CustomerSpeciesEntryRow,
  | "id"
  | "species"
  | "insectType"
  | "morphName"
  | "commonName"
  | "dateObtained"
  | "available"
  | "availabilityNotes"
>;

export const CUSTOMER_SPECIES_CSV_HEADERS = [
  "Insect Type",
  "Species",
  "Morph Name",
  "Common Name",
  "Date Obtained",
  "Source",
  "Price",
  "Acquisition Notes",
  "Available",
  "Availability Notes",
] as const;

export function customerSpeciesDisplayName(customer: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const first = customer.firstName?.trim() ?? "";
  const last = customer.lastName?.trim() ?? "";
  if (first || last) return [first, last].filter(Boolean).join(" ");
  if (customer.displayName?.trim()) return customer.displayName.trim();
  const local = customer.email.split("@")[0]?.trim();
  return local || "Collector";
}

export function speciesListDefaultTitle(customer: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  return `${customerSpeciesDisplayName(customer)}'s species list`;
}

export function resolveSpeciesListTitle(
  customer: {
    speciesListDisplayName: string | null;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  },
): string {
  const custom = customer.speciesListDisplayName?.trim();
  if (custom) return custom.slice(0, 120);
  return speciesListDefaultTitle(customer);
}

export type SpeciesEntrySortColumn =
  | "insectType"
  | "species"
  | "morphName"
  | "commonName"
  | "dateObtained"
  | "available";

export type SpeciesEntrySortState = {
  column: SpeciesEntrySortColumn;
  direction: "asc" | "desc";
};

export const DEFAULT_SPECIES_ENTRY_SORT: SpeciesEntrySortState = {
  column: "species",
  direction: "asc",
};

type SpeciesSortable = Pick<
  CustomerSpeciesEntryRow,
  SpeciesEntrySortColumn
>;

function compareStringColumn(a: string, b: string, direction: "asc" | "desc"): number {
  const dir = direction === "asc" ? 1 : -1;
  return a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
}

export function compareSpeciesEntryRows(
  a: SpeciesSortable,
  b: SpeciesSortable,
  sort: SpeciesEntrySortState,
): number {
  const dir = sort.direction === "asc" ? 1 : -1;

  if (sort.column === "available") {
    const primary = ((a.available ? 1 : 0) - (b.available ? 1 : 0)) * dir;
    if (primary !== 0) return primary;
  } else if (sort.column === "dateObtained") {
    const av = a.dateObtained ?? "";
    const bv = b.dateObtained ?? "";
    if (!av && !bv) {
      /* fall through to tiebreakers */
    } else if (!av) return 1;
    else if (!bv) return -1;
    else {
      const primary = av.localeCompare(bv) * dir;
      if (primary !== 0) return primary;
    }
  } else {
    const primary = compareStringColumn(
      (a[sort.column] ?? "").toString(),
      (b[sort.column] ?? "").toString(),
      sort.direction,
    );
    if (primary !== 0) return primary;
  }

  const speciesCmp = compareStringColumn(a.species, b.species, "asc");
  if (speciesCmp !== 0) return speciesCmp;
  return compareStringColumn(a.insectType, b.insectType, "asc");
}

export function speciesDateToIsoString(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function speciesDateFromDb(value: Date | null | undefined): string | null {
  if (!value) return null;
  return speciesDateToIsoString(value);
}

export function formatSpeciesDateForDisplay(isoDate: string | null): string {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function speciesDateFromParts(year: number, month: number, day: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
    return null;
  }
  return d;
}

function parseExcelSerialDate(raw: string): Date | null {
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const serial = Number.parseFloat(raw);
  if (!Number.isFinite(serial) || serial < 1 || serial >= 1_000_000) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const d = new Date(epoch + Math.round(serial * 86_400_000));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseSpeciesDateInput(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map((part) => Number.parseInt(part, 10));
    return speciesDateFromParts(y!, m!, d!);
  }

  const slash4 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash4) {
    const [, m, d, y] = slash4;
    return speciesDateFromParts(Number.parseInt(y!, 10), Number.parseInt(m!, 10), Number.parseInt(d!, 10));
  }

  const slash2 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slash2) {
    const [, m, d, y2] = slash2;
    const year = Number.parseInt(y2!, 10);
    const fullYear = year >= 70 ? 1900 + year : 2000 + year;
    return speciesDateFromParts(fullYear, Number.parseInt(m!, 10), Number.parseInt(d!, 10));
  }

  const excel = parseExcelSerialDate(t);
  if (excel) return excel;

  return null;
}

export function speciesDateToInputValue(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "";
  return isoDate.slice(0, 10);
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function priceCentsToCsv(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}

export function customerSpeciesEntryToCsvRow(entry: CustomerSpeciesEntryRow): string {
  return csvRow([
    entry.insectType,
    entry.species,
    entry.morphName,
    entry.commonName,
    entry.dateObtained ?? "",
    entry.source,
    priceCentsToCsv(entry.priceCents),
    entry.acquisitionNotes,
    entry.available ? "yes" : "no",
    entry.availabilityNotes,
  ]);
}

export function exportCustomerSpeciesCsv(entries: CustomerSpeciesEntryRow[]): string {
  const lines = [csvRow([...CUSTOMER_SPECIES_CSV_HEADERS]), ...entries.map(customerSpeciesEntryToCsvRow)];
  return lines.join("\r\n");
}

export function customerSpeciesCsvTemplate(): string {
  return csvRow([...CUSTOMER_SPECIES_CSV_HEADERS]);
}

export type CustomerSpeciesCsvParseResult =
  | { ok: true; rows: CustomerSpeciesEntryInput[] }
  | { ok: false; error: string };

export function parseCustomerSpeciesCsv(text: string): CustomerSpeciesCsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { ok: false, error: "CSV is empty." };
  }

  const headerCells = parseCsvLine(lines[0]!).map(normalizeHeader);
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headerCells.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const speciesIdx = idx(["species"]);
  if (speciesIdx < 0) {
    return { ok: false, error: 'Missing required "Species" column.' };
  }

  const insectTypeIdx = idx(["insect_type", "insecttype"]);
  const morphIdx = idx(["morph_name", "morph"]);
  const commonIdx = idx(["common_name", "common"]);
  const dateIdx = idx(["date_obtained", "date"]);
  const sourceIdx = idx(["source"]);
  const priceIdx = idx(["price"]);
  const acqIdx = idx(["acquisition_notes", "aquisition_notes", "notes"]);
  const availIdx = idx(["available"]);
  const availNotesIdx = idx(["availability_notes"]);

  const rows: CustomerSpeciesEntryInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const species = (cells[speciesIdx] ?? "").trim();
    if (!species) continue;

    const dateRaw = dateIdx >= 0 ? (cells[dateIdx] ?? "").trim() : "";
    const dateParsed = parseSpeciesDateInput(dateRaw);
    const priceRaw = priceIdx >= 0 ? (cells[priceIdx] ?? "").trim() : "";
    const priceCents = priceRaw ? parsePriceToCents(priceRaw) : null;

    rows.push({
      species: species.slice(0, 200),
      insectType: (insectTypeIdx >= 0 ? cells[insectTypeIdx] ?? "" : "").trim().slice(0, 200),
      morphName: (morphIdx >= 0 ? cells[morphIdx] ?? "" : "").trim().slice(0, 200),
      commonName: (commonIdx >= 0 ? cells[commonIdx] ?? "" : "").trim().slice(0, 200),
      dateObtained: dateParsed ? speciesDateToIsoString(dateParsed) : null,
      source: (sourceIdx >= 0 ? cells[sourceIdx] ?? "" : "").trim().slice(0, 200),
      priceCents: priceCents != null && priceCents >= 0 ? priceCents : null,
      acquisitionNotes: (acqIdx >= 0 ? cells[acqIdx] ?? "" : "").trim().slice(0, 4000),
      available: availIdx >= 0 ? parseYesNo(cells[availIdx] ?? "", false) : false,
      availabilityNotes: (availNotesIdx >= 0 ? cells[availNotesIdx] ?? "" : "").trim().slice(0, 1000),
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found (need at least one Species value)." };
  }

  return { ok: true, rows };
}

export function toPublicSpeciesEntry(entry: CustomerSpeciesEntryRow): PublicCustomerSpeciesEntry {
  return {
    id: entry.id,
    species: entry.species,
    insectType: entry.insectType,
    morphName: entry.morphName,
    commonName: entry.commonName,
    dateObtained: entry.dateObtained,
    available: entry.available,
    availabilityNotes: entry.availabilityNotes,
  };
}

export function speciesListPublicPath(shareToken: string): string {
  return `/species/${encodeURIComponent(shareToken)}`;
}

export function speciesListPublicUrl(shareToken: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}${speciesListPublicPath(shareToken)}`;
}
