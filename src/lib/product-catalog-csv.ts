import { parsePriceToCents } from "@/lib/product-slug";
import { validatePriceTiersInput, type LabelPriceTier } from "@/lib/label-template-tiers";

/** Parse a single CSV line respecting quoted fields. */
export function parseCsvLine(line: string): string[] {
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
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function escapeCsvCell(value: string): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function csvRow(cells: string[]): string {
  return cells.map((c) => escapeCsvCell(c)).join(",");
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseYesNo(raw: string, defaultValue = false): boolean {
  const t = raw.trim().toLowerCase();
  if (!t) return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(t);
}

/** Split pipe- or semicolon-separated lists (trim each segment). */
export function parseDelimitedList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatPriceTiersForCsv(tiers: LabelPriceTier[] | null | undefined): string {
  if (!tiers?.length) return "";
  return tiers.map((t) => `${t.minQty}@${(t.unitCents / 100).toFixed(2)}`).join(";");
}

/** `10@9.99;25@8.50` → tier rows */
export function parsePriceTiersFromCsv(raw: string): LabelPriceTier[] | null {
  const text = raw.trim();
  if (!text) return null;
  const rows: LabelPriceTier[] = [];
  for (const part of text.split(";")) {
    const seg = part.trim();
    if (!seg) continue;
    const at = seg.lastIndexOf("@");
    if (at <= 0) continue;
    const minQty = Math.max(1, Math.floor(Number(seg.slice(0, at).trim()) || 0));
    const cents = parsePriceToCents(seg.slice(at + 1).trim());
    if (cents === null) continue;
    rows.push({ minQty, unitCents: cents });
  }
  if (rows.length === 0) return null;
  const check = validatePriceTiersInput(rows);
  return check.ok ? check.tiers : null;
}

export const PRODUCT_CATALOG_CSV_HEADERS = [
  "product_id",
  "slug",
  "name",
  "short_description",
  "description",
  "active",
  "featured",
  "on_sale",
  "sale_ends_at",
  "variant_price_display",
  "type_paths",
  "footer_titles",
  "excluded_shipping",
  "related_slugs",
  "also_want_slugs",
  "kit_enabled",
  "kit_label",
  "kit_discount_usd",
  "kit_items",
  "default_variant_id",
  "default_variant_label",
  "default_list_price",
  "default_stock",
  "default_unlimited_stock",
  "default_active",
  "default_sku",
  "default_description",
  "default_price_tiers",
  "default_picker_bg_hex",
  "default_picker_fg_hex",
  "default_picker_border_hex",
  "default_shipping_units",
  "in_breeding",
] as const;

export const EXTRA_VARIANTS_CSV_HEADERS = [
  "product_slug",
  "product_id",
  "variant_id",
  "variant_label",
  "description",
  "sku",
  "list_price",
  "stock",
  "unlimited_stock",
  "active",
  "price_tiers",
  "picker_bg_hex",
  "picker_fg_hex",
  "picker_border_hex",
  "shipping_units",
  "sort_order",
] as const;

export type ParsedProductCatalogRow = {
  rowNumber: number;
  productId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  active: boolean;
  featured: boolean;
  onSale: boolean;
  saleEndsAt: string;
  variantPriceDisplay: string;
  typePaths: string[];
  footerTitles: string[];
  excludedShipping: string[];
  relatedSlugs: string[];
  alsoWantSlugs: string[];
  kitEnabled: boolean;
  kitLabel: string;
  kitDiscountUsd: string;
  kitItems: string;
  defaultVariantId: string;
  defaultVariantLabel: string;
  defaultListPrice: string;
  defaultStock: string;
  defaultUnlimitedStock: boolean;
  defaultActive: boolean;
  defaultSku: string;
  defaultDescription: string;
  defaultPriceTiers: string;
  defaultPickerBgHex: string;
  defaultPickerFgHex: string;
  defaultPickerBorderHex: string;
  defaultShippingUnits: string;
  inBreeding: boolean;
};

export type ParsedExtraVariantRow = {
  rowNumber: number;
  productSlug: string;
  productId: string;
  variantId: string;
  variantLabel: string;
  description: string;
  sku: string;
  listPrice: string;
  stock: string;
  unlimitedStock: boolean;
  active: boolean;
  priceTiers: string;
  pickerBgHex: string;
  pickerFgHex: string;
  pickerBorderHex: string;
  shippingUnits: string;
  sortOrder: string;
};

type CsvParseResult<T> =
  | { ok: true; rows: T[] }
  | { ok: false; error: string };

function parseCsvTable(
  text: string,
  requiredNormalizedHeaders: string[],
): { ok: true; headerKeys: string[]; lines: string[] } | { ok: false; error: string } {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { ok: false, error: "CSV file is empty." };
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV needs a header row and at least one data row." };
  }
  const headerKeys = parseCsvLine(lines[0]!).map(normalizeHeader);
  for (const req of requiredNormalizedHeaders) {
    if (!headerKeys.includes(req)) {
      return { ok: false, error: `Missing required column: ${req.replace(/_/g, " ")}.` };
    }
  }
  return { ok: true, headerKeys, lines };
}

function cell(line: string, headerKeys: string[], key: string): string {
  const idx = headerKeys.indexOf(key);
  if (idx < 0) return "";
  return parseCsvLine(line)[idx]?.trim() ?? "";
}

export function parseProductsCatalogCsv(text: string): CsvParseResult<ParsedProductCatalogRow> {
  const table = parseCsvTable(text, ["slug", "name"]);
  if (!table.ok) return table;

  const { headerKeys, lines } = table;
  const rows: ParsedProductCatalogRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    rows.push({
      rowNumber: i + 1,
      productId: cell(line, headerKeys, "product_id"),
      slug: cell(line, headerKeys, "slug"),
      name: cell(line, headerKeys, "name"),
      shortDescription: cell(line, headerKeys, "short_description"),
      description: cell(line, headerKeys, "description"),
      active: parseYesNo(cell(line, headerKeys, "active"), true),
      featured: parseYesNo(cell(line, headerKeys, "featured"), false),
      onSale: parseYesNo(cell(line, headerKeys, "on_sale"), false),
      saleEndsAt: cell(line, headerKeys, "sale_ends_at"),
      variantPriceDisplay: cell(line, headerKeys, "variant_price_display"),
      typePaths: parseDelimitedList(cell(line, headerKeys, "type_paths")),
      footerTitles: parseDelimitedList(cell(line, headerKeys, "footer_titles")),
      excludedShipping: parseDelimitedList(cell(line, headerKeys, "excluded_shipping")),
      relatedSlugs: parseDelimitedList(cell(line, headerKeys, "related_slugs")),
      alsoWantSlugs: parseDelimitedList(cell(line, headerKeys, "also_want_slugs")),
      kitEnabled: parseYesNo(cell(line, headerKeys, "kit_enabled"), false),
      kitLabel: cell(line, headerKeys, "kit_label"),
      kitDiscountUsd: cell(line, headerKeys, "kit_discount_usd"),
      kitItems: cell(line, headerKeys, "kit_items"),
      defaultVariantId: cell(line, headerKeys, "default_variant_id"),
      defaultVariantLabel: cell(line, headerKeys, "default_variant_label"),
      defaultListPrice: cell(line, headerKeys, "default_list_price"),
      defaultStock: cell(line, headerKeys, "default_stock"),
      defaultUnlimitedStock: parseYesNo(cell(line, headerKeys, "default_unlimited_stock"), false),
      defaultActive: parseYesNo(cell(line, headerKeys, "default_active"), true),
      defaultSku: cell(line, headerKeys, "default_sku"),
      defaultDescription: cell(line, headerKeys, "default_description"),
      defaultPriceTiers: cell(line, headerKeys, "default_price_tiers"),
      defaultPickerBgHex: cell(line, headerKeys, "default_picker_bg_hex"),
      defaultPickerFgHex: cell(line, headerKeys, "default_picker_fg_hex"),
      defaultPickerBorderHex: cell(line, headerKeys, "default_picker_border_hex"),
      defaultShippingUnits: cell(line, headerKeys, "default_shipping_units"),
      inBreeding: parseYesNo(cell(line, headerKeys, "in_breeding"), false),
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found." };
  }
  return { ok: true, rows };
}

export function parseExtraVariantsCatalogCsv(text: string): CsvParseResult<ParsedExtraVariantRow> {
  const table = parseCsvTable(text, ["product_slug", "variant_label"]);
  if (!table.ok) return table;

  const { headerKeys, lines } = table;
  const rows: ParsedExtraVariantRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    rows.push({
      rowNumber: i + 1,
      productSlug: cell(line, headerKeys, "product_slug"),
      productId: cell(line, headerKeys, "product_id"),
      variantId: cell(line, headerKeys, "variant_id"),
      variantLabel: cell(line, headerKeys, "variant_label"),
      description: cell(line, headerKeys, "description"),
      sku: cell(line, headerKeys, "sku"),
      listPrice: cell(line, headerKeys, "list_price"),
      stock: cell(line, headerKeys, "stock"),
      unlimitedStock: parseYesNo(cell(line, headerKeys, "unlimited_stock"), false),
      active: parseYesNo(cell(line, headerKeys, "active"), true),
      priceTiers: cell(line, headerKeys, "price_tiers"),
      pickerBgHex: cell(line, headerKeys, "picker_bg_hex"),
      pickerFgHex: cell(line, headerKeys, "picker_fg_hex"),
      pickerBorderHex: cell(line, headerKeys, "picker_border_hex"),
      shippingUnits: cell(line, headerKeys, "shipping_units"),
      sortOrder: cell(line, headerKeys, "sort_order"),
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found." };
  }
  return { ok: true, rows };
}

export function productsCatalogCsvTemplate(): string {
  return `${csvRow([...PRODUCT_CATALOG_CSV_HEADERS])}\n`;
}

export function extraVariantsCatalogCsvTemplate(): string {
  return `${csvRow([...EXTRA_VARIANTS_CSV_HEADERS])}\n`;
}

/** Kit item cell: `slug` or `slug:Variant Label` segments separated by | or ; */
export function parseKitItemsCell(raw: string): { slug: string; variantLabel: string | null }[] {
  const out: { slug: string; variantLabel: string | null }[] = [];
  for (const seg of parseDelimitedList(raw)) {
    const colon = seg.indexOf(":");
    if (colon >= 0) {
      out.push({
        slug: seg.slice(0, colon).trim(),
        variantLabel: seg.slice(colon + 1).trim() || null,
      });
    } else {
      out.push({ slug: seg, variantLabel: null });
    }
  }
  return out;
}

export function formatKitItemsForCsv(
  items: { productSlug: string; variantLabel: string | null }[],
): string {
  return items
    .map((i) => (i.variantLabel ? `${i.productSlug}:${i.variantLabel}` : i.productSlug))
    .join("|");
}
