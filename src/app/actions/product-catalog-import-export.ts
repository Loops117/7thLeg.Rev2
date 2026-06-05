"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createProductVariant, saveProductVariantRow } from "@/app/actions/product-variants-admin";
import {
  csvRow,
  escapeCsvCell,
  EXTRA_VARIANTS_CSV_HEADERS,
  formatKitItemsForCsv,
  formatPriceTiersForCsv,
  parseExtraVariantsCatalogCsv,
  parseKitItemsCell,
  parsePriceTiersFromCsv,
  parseProductsCatalogCsv,
  PRODUCT_CATALOG_CSV_HEADERS,
  type ParsedExtraVariantRow,
  type ParsedProductCatalogRow,
} from "@/lib/product-catalog-csv";
import { syncProductKit, type ProductKitItemInput } from "@/lib/product-kits";
import { MIN_PRODUCT_KIT_ITEMS } from "@/lib/product-kits-shared";
import { parseProductPriceTiersJson, priceTiersJsonForDb } from "@/lib/product-price-tiers";
import { ProductTypeIndex } from "@/lib/product-type-index";
import { loadProductTypeIndex } from "@/lib/product-type-tree";
import { syncProductRecommendations } from "@/lib/product-recommendations";
import { parseVariantPriceDisplay } from "@/lib/product-variant-price-display";
import type { Prisma } from "@/generated/prisma/client";
import { csvWithUtf8Bom, readUploadedCsvText } from "@/lib/csv-text-encoding";
import { prisma } from "@/lib/prisma";
import { parsePriceToCents, slugifyProductName } from "@/lib/product-slug";
import { clampShippingUnits } from "@/lib/shipping-units";
import { normalizeVariantSku } from "@/lib/variant-sku";

const variantOrderBy = [{ sortOrder: "asc" as const }, { label: "asc" as const }];

const MAX_CSV_BYTES = 8 * 1024 * 1024;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

export type CatalogImportLogEntry = {
  row: number;
  key: string;
  status: "created" | "updated" | "skipped" | "rejected";
  message: string;
};

export type CatalogImportResult = {
  ok: true;
  created: number;
  updated: number;
  skipped: number;
  rejected: number;
  logs: CatalogImportLogEntry[];
};

export type CatalogImportError = { ok: false; error: string };

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  for (;;) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function log(
  logs: CatalogImportLogEntry[],
  row: number,
  key: string,
  status: CatalogImportLogEntry["status"],
  message: string,
) {
  logs.push({ row, key, status, message });
}

function parseSaleEndsAt(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

type CatalogLookups = {
  typeByPath: Map<string, string>;
  footerByTitle: Map<string, string>;
  shippingByLabel: Map<string, string>;
  productBySlug: Map<string, { id: string; slug: string }>;
  productById: Map<string, { id: string; slug: string }>;
};

async function loadCatalogLookups(): Promise<CatalogLookups> {
  const [types, footers, shipping, products] = await Promise.all([
    prisma.productType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true, sortOrder: true, storefrontVisible: true },
    }),
    prisma.automaticFooter.findMany({ select: { id: true, title: true } }),
    prisma.shippingOption.findMany({ select: { id: true, label: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
  ]);

  const index = new ProductTypeIndex(types);
  const typeByPath = new Map<string, string>();
  for (const leaf of index.leaves()) {
    const row = index.flattenTree().find((r) => r.id === leaf.id);
    if (row) typeByPath.set(row.pathLabel.toLowerCase(), leaf.id);
  }

  const footerByTitle = new Map<string, string>();
  for (const f of footers) footerByTitle.set(f.title.trim().toLowerCase(), f.id);

  const shippingByLabel = new Map<string, string>();
  for (const s of shipping) shippingByLabel.set(s.label.trim().toLowerCase(), s.id);

  const productBySlug = new Map<string, { id: string; slug: string }>();
  const productById = new Map<string, { id: string; slug: string }>();
  for (const p of products) {
    productBySlug.set(p.slug.toLowerCase(), p);
    productById.set(p.id, p);
  }

  return { typeByPath, footerByTitle, shippingByLabel, productBySlug, productById };
}

function resolveTypeIds(paths: string[], lookups: CatalogLookups, row: number, logs: CatalogImportLogEntry[]): string[] {
  const ids: string[] = [];
  for (const path of paths) {
    const id = lookups.typeByPath.get(path.trim().toLowerCase());
    if (id) ids.push(id);
    else log(logs, row, path, "skipped", `Unknown product type path (skipped): ${path}`);
  }
  return [...new Set(ids)];
}

function resolveFooterIds(titles: string[], lookups: CatalogLookups, row: number, logs: CatalogImportLogEntry[]): string[] {
  const ids: string[] = [];
  for (const title of titles) {
    const id = lookups.footerByTitle.get(title.trim().toLowerCase());
    if (id) ids.push(id);
    else log(logs, row, title, "skipped", `Unknown footer title (skipped): ${title}`);
  }
  return [...new Set(ids)];
}

function resolveShippingIds(labels: string[], lookups: CatalogLookups, row: number, logs: CatalogImportLogEntry[]): string[] {
  const ids: string[] = [];
  for (const label of labels) {
    const id = lookups.shippingByLabel.get(label.trim().toLowerCase());
    if (id) ids.push(id);
    else log(logs, row, label, "skipped", `Unknown shipping option (skipped): ${label}`);
  }
  return [...new Set(ids)];
}

function resolveProductSlugs(
  slugs: string[],
  lookups: CatalogLookups,
  row: number,
  logs: CatalogImportLogEntry[],
): string[] {
  const ids: string[] = [];
  for (const slug of slugs) {
    const p = lookups.productBySlug.get(slug.trim().toLowerCase());
    if (p) ids.push(p.id);
    else log(logs, row, slug, "skipped", `Unknown related product slug (skipped): ${slug}`);
  }
  return [...new Set(ids)];
}

async function resolveKitItems(
  raw: string,
  hostProductId: string,
  lookups: CatalogLookups,
  row: number,
  logs: CatalogImportLogEntry[],
): Promise<ProductKitItemInput[]> {
  const parsed = parseKitItemsCell(raw);
  const items: ProductKitItemInput[] = [];
  const seen = new Set<string>();

  for (const entry of parsed) {
    const p = lookups.productBySlug.get(entry.slug.toLowerCase());
    if (!p) {
      log(logs, row, entry.slug, "skipped", `Kit item product not in catalog (skipped): ${entry.slug}`);
      continue;
    }
    let variantId: string | null = null;
    if (entry.variantLabel) {
      const v = await prisma.productVariant.findFirst({
        where: { productId: p.id, label: entry.variantLabel },
        select: { id: true },
      });
      if (!v) {
        log(logs, row, entry.slug, "skipped", `Kit item variant not found (skipped): ${entry.slug}:${entry.variantLabel}`);
        continue;
      }
      variantId = v.id;
    }
    const key = `${p.id}:${variantId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ productId: p.id, variantId });
  }

  return items;
}

async function applyDefaultVariant(
  productId: string,
  row: ParsedProductCatalogRow,
  variantId: string,
  logs: CatalogImportLogEntry[],
): Promise<void> {
  const listCents = parsePriceToCents(row.defaultListPrice.trim() || "0");
  if (listCents === null) {
    log(logs, row.rowNumber, row.slug, "skipped", "Invalid default_list_price — variant price not updated.");
    return;
  }
  const tiers = parsePriceTiersFromCsv(row.defaultPriceTiers);
  const stock = Math.max(0, Math.floor(Number(row.defaultStock) || 0));
  const label = row.defaultVariantLabel.trim() || "Default";

  try {
    await saveProductVariantRow({
      productId,
      variantId,
      label,
      sku: row.defaultSku.trim() || null,
      description: row.defaultDescription,
      listPriceUsd: (listCents / 100).toFixed(2),
      stock,
      unlimitedStock: row.defaultUnlimitedStock,
      active: row.defaultActive,
      priceTiers: tiers,
      pickerBgHex: row.defaultPickerBgHex.trim() || null,
      pickerFgHex: row.defaultPickerFgHex.trim() || null,
      pickerBorderHex: row.defaultPickerBorderHex.trim() || null,
      shippingUnits: row.defaultShippingUnits.trim()
        ? clampShippingUnits(Number(row.defaultShippingUnits))
        : undefined,
    });
  } catch (e) {
    log(
      logs,
      row.rowNumber,
      row.slug,
      "skipped",
      e instanceof Error ? e.message : "Could not save default variation.",
    );
  }
}

async function syncProductRelations(
  productId: string,
  row: ParsedProductCatalogRow,
  lookups: CatalogLookups,
  logs: CatalogImportLogEntry[],
): Promise<void> {
  const typeIndex = await loadProductTypeIndex();
  const typeIds = resolveTypeIds(row.typePaths, lookups, row.rowNumber, logs).filter((id) =>
    typeIndex.isLeaf(id),
  );
  const footerIds = resolveFooterIds(row.footerTitles, lookups, row.rowNumber, logs);
  const excludedIds = resolveShippingIds(row.excludedShipping, lookups, row.rowNumber, logs);
  const relatedIds = resolveProductSlugs(row.relatedSlugs, lookups, row.rowNumber, logs).filter(
    (id) => id !== productId,
  );
  const alsoWantIds = resolveProductSlugs(row.alsoWantSlugs, lookups, row.rowNumber, logs).filter(
    (id) => id !== productId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.productOnType.deleteMany({ where: { productId } });
    for (const typeId of typeIds) {
      await tx.productOnType.create({ data: { productId, typeId } });
    }
    await tx.productOnFooter.deleteMany({ where: { productId } });
    for (const footerId of footerIds) {
      await tx.productOnFooter.create({ data: { productId, footerId } });
    }
    await tx.productShippingOptionExclusion.deleteMany({ where: { productId } });
    for (const shippingOptionId of excludedIds) {
      await tx.productShippingOptionExclusion.create({ data: { productId, shippingOptionId } });
    }
  });

  await syncProductRecommendations(productId, {
    relatedProductIds: relatedIds,
    youMayAlsoWantProductIds: alsoWantIds,
  });

  const kitDiscountCents = parsePriceToCents(row.kitDiscountUsd.trim() || "0") ?? 0;
  let kitItems = await resolveKitItems(row.kitItems, productId, lookups, row.rowNumber, logs);
  if (!kitItems.some((i) => i.productId === productId)) {
    kitItems = [{ productId, variantId: null }, ...kitItems];
  }

  if (row.kitEnabled && kitItems.length >= MIN_PRODUCT_KIT_ITEMS) {
    await syncProductKit(productId, {
      enabled: true,
      label: row.kitLabel.trim() || "Kit deal",
      discountCents: Math.max(0, kitDiscountCents),
      items: kitItems,
    });
  } else if (row.kitEnabled && kitItems.length < MIN_PRODUCT_KIT_ITEMS) {
    log(
      logs,
      row.rowNumber,
      row.slug,
      "skipped",
      `Kit not saved — need at least ${MIN_PRODUCT_KIT_ITEMS} valid items (host counts when listed).`,
    );
    await syncProductKit(productId, { enabled: false, label: "", discountCents: 0, items: [] });
  } else {
    await syncProductKit(productId, { enabled: false, label: "", discountCents: 0, items: [] });
  }
}

async function upsertProductFromRow(
  row: ParsedProductCatalogRow,
  lookups: CatalogLookups,
  logs: CatalogImportLogEntry[],
): Promise<"created" | "updated" | "rejected" | "skipped"> {
  const key = row.slug.trim() || row.productId.trim() || row.name.trim() || `row ${row.rowNumber}`;
  let existing: { id: string; slug: string } | undefined;

  if (row.productId.trim()) {
    existing = lookups.productById.get(row.productId.trim());
    if (!existing) {
      log(logs, row.rowNumber, key, "rejected", "product_id not found in catalog.");
      return "rejected";
    }
  } else if (row.slug.trim()) {
    existing = lookups.productBySlug.get(row.slug.trim().toLowerCase());
  }

  const name = row.name.trim();
  if (!existing && !name) {
    log(logs, row.rowNumber, key, "rejected", "name is required for new products.");
    return "rejected";
  }

  const slugBase = row.slug.trim()
    ? slugifyProductName(row.slug.trim())
    : slugifyProductName(name);
  if (!existing && !slugBase) {
    log(logs, row.rowNumber, key, "rejected", "Could not derive a URL slug — set slug or name.");
    return "rejected";
  }

  const saleEndsAt = row.onSale ? parseSaleEndsAt(row.saleEndsAt) : null;
  const variantPriceDisplay = parseVariantPriceDisplay(
    row.variantPriceDisplay.trim() || "difference",
  );

  if (!existing) {
    const slug = await uniqueSlug(slugBase);
    const listCents = parsePriceToCents(row.defaultListPrice.trim() || "0");
    const basePriceCents = listCents ?? 0;

    let productId = "";
    try {
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name,
            slug,
            shortDescription: row.shortDescription.trim() || null,
            description: row.description.trim(),
            basePriceCents,
            quantity: 0,
            unlimitedQuantity: false,
            active: row.active,
            featured: row.featured,
            onSale: row.onSale,
            saleEndsAt,
            variantPriceDisplay,
          },
        });
        productId = product.id;
        const vLabel = row.defaultVariantLabel.trim() || "Default";
        let tiersJson;
        try {
          tiersJson = priceTiersJsonForDb(parsePriceTiersFromCsv(row.defaultPriceTiers));
        } catch {
          tiersJson = priceTiersJsonForDb(null);
        }
        await tx.productVariant.create({
          data: {
            productId: product.id,
            label: vLabel,
            description: row.defaultDescription.trim(),
            sku: normalizeVariantSku(row.defaultSku.trim() || null),
            stock: row.defaultUnlimitedStock
              ? 0
              : Math.max(0, Math.floor(Number(row.defaultStock) || 0)),
            unlimitedStock: row.defaultUnlimitedStock,
            active: row.defaultActive,
            priceDeltaCents: 0,
            priceTiersJson: tiersJson,
            shippingUnits: row.defaultShippingUnits.trim()
              ? clampShippingUnits(Number(row.defaultShippingUnits))
              : 1,
          },
        });
      });
    } catch (e) {
      console.error("import product create", e);
      log(logs, row.rowNumber, slug, "rejected", "Database error creating product.");
      return "rejected";
    }

    lookups.productById.set(productId, { id: productId, slug });
    lookups.productBySlug.set(slug.toLowerCase(), { id: productId, slug });

    await syncProductRelations(productId, row, lookups, logs);

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: variantOrderBy,
      select: { id: true },
    });
    const defaultId = variants[0]?.id;
    if (defaultId && (row.defaultListPrice.trim() || row.defaultSku.trim() || row.defaultDescription.trim())) {
      await applyDefaultVariant(productId, row, defaultId, logs);
    }

    log(logs, row.rowNumber, slug, "created", `Created product “${name}” (${slug}).`);
    return "created";
  }

  const productId = existing.id;
  let slug = existing.slug;
  if (row.slug.trim()) {
    const want = slugifyProductName(row.slug.trim());
    if (want && want !== existing.slug) {
      slug = await uniqueSlug(want, productId);
    }
  }

  const current = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true },
  });

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: name || current?.name || slug,
        slug,
        shortDescription: row.shortDescription.trim() || null,
        description: row.description.trim(),
        active: row.active,
        featured: row.featured,
        onSale: row.onSale,
        saleEndsAt: row.onSale ? saleEndsAt : null,
        variantPriceDisplay,
      },
    });
  } catch (e) {
    console.error("import product update", e);
    log(logs, row.rowNumber, slug, "rejected", "Database error updating product.");
    return "rejected";
  }

  lookups.productById.set(productId, { id: productId, slug });
  lookups.productBySlug.set(slug.toLowerCase(), { id: productId, slug });

  await syncProductRelations(productId, row, lookups, logs);

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: variantOrderBy,
    select: { id: true, label: true },
  });
  let defaultVariant = variants[0];
  if (row.defaultVariantId.trim()) {
    defaultVariant = variants.find((v) => v.id === row.defaultVariantId.trim()) ?? defaultVariant;
  } else if (row.defaultVariantLabel.trim()) {
    defaultVariant =
      variants.find((v) => v.label === row.defaultVariantLabel.trim()) ?? defaultVariant;
  }
  if (defaultVariant) {
    await applyDefaultVariant(productId, row, defaultVariant.id, logs);
  }

  log(logs, row.rowNumber, slug, "updated", `Updated product “${name || slug}”.`);
  return "updated";
}

function revalidateCatalog() {
  revalidatePath("/settings/products");
  revalidatePath("/store");
}

const productCatalogExportInclude = {
  types: { select: { typeId: true } },
  footers: { include: { footer: { select: { title: true } } } },
  shippingOptionExclusions: { include: { shippingOption: { select: { label: true } } } },
  variants: { orderBy: variantOrderBy },
  recommendationsFrom: {
    orderBy: [{ kind: "asc" as const }, { sortOrder: "asc" as const }],
    include: { relatedProduct: { select: { slug: true } } },
  },
  kitHost: {
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
        include: {
          product: { select: { slug: true } },
          variant: { select: { label: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductForCatalogExport = Prisma.ProductGetPayload<{ include: typeof productCatalogExportInclude }>;

function buildProductsCatalogCsv(
  products: ProductForCatalogExport[],
  types: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    sortOrder: number;
    storefrontVisible: boolean;
  }[],
): string {
  const index = new ProductTypeIndex(types);
  const pathByTypeId = new Map(index.flattenTree().map((r) => [r.id, r.pathLabel] as const));
  const lines = [csvRow([...PRODUCT_CATALOG_CSV_HEADERS])];

  for (const p of products) {
    const defaultV = p.variants[0];
    const related = p.recommendationsFrom
      .filter((r) => r.kind === "RELATED")
      .map((r) => r.relatedProduct.slug);
    const alsoWant = p.recommendationsFrom
      .filter((r) => r.kind === "YOU_MAY_ALSO_WANT")
      .map((r) => r.relatedProduct.slug);

    const kit = p.kitHost;
    const kitItems = kit
      ? formatKitItemsForCsv(
          kit.items.map((i) => ({
            productSlug: i.product.slug,
            variantLabel: i.variant?.label ?? null,
          })),
        )
      : "";

    const defaultTiers = defaultV?.priceTiersJson
      ? formatPriceTiersForCsv(parseProductPriceTiersJson(defaultV.priceTiersJson))
      : "";

    const listCents = defaultV != null ? p.basePriceCents + defaultV.priceDeltaCents : p.basePriceCents;

    lines.push(
      csvRow([
        p.id,
        p.slug,
        p.name,
        p.shortDescription ?? "",
        p.description,
        p.active ? "yes" : "no",
        p.featured ? "yes" : "no",
        p.onSale ? "yes" : "no",
        p.saleEndsAt?.toISOString().slice(0, 16) ?? "",
        p.variantPriceDisplay,
        p.types
          .map((t) => pathByTypeId.get(t.typeId) ?? "")
          .filter(Boolean)
          .join("|"),
        p.footers.map((f) => f.footer.title).join("|"),
        p.shippingOptionExclusions.map((e) => e.shippingOption.label).join("|"),
        related.join("|"),
        alsoWant.join("|"),
        kit?.enabled ? "yes" : "no",
        kit?.label ?? "",
        kit ? (kit.discountCents / 100).toFixed(2) : "",
        kitItems,
        defaultV?.id ?? "",
        defaultV?.label ?? "Default",
        (listCents / 100).toFixed(2),
        String(defaultV?.stock ?? 0),
        defaultV?.unlimitedStock ? "yes" : "no",
        defaultV?.active !== false ? "yes" : "no",
        defaultV?.sku ?? "",
        defaultV?.description ?? "",
        defaultTiers,
        defaultV?.pickerBgHex ?? "",
        defaultV?.pickerFgHex ?? "",
        defaultV?.pickerBorderHex ?? "",
        String(defaultV?.shippingUnits ?? 1),
      ]),
    );
  }

  return `${lines.join("\n")}\n`;
}

async function loadProductTypesForExport() {
  return prisma.productType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, sortOrder: true, storefrontVisible: true },
  });
}

export async function exportProductsCatalogCsv(): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const [products, types] = await Promise.all([
      prisma.product.findMany({ orderBy: { name: "asc" }, include: productCatalogExportInclude }),
      loadProductTypesForExport(),
    ]);
    return { ok: true, csv: csvWithUtf8Bom(buildProductsCatalogCsv(products, types)) };
  } catch (e) {
    console.error("exportProductsCatalogCsv", e);
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}

export async function exportSelectedProductsCatalogCsv(
  productIds: string[],
): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const ids = [...new Set(productIds.filter(Boolean))];
    if (ids.length === 0) {
      return { ok: false, error: "No products selected." };
    }
    const [products, types] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids } },
        orderBy: { name: "asc" },
        include: productCatalogExportInclude,
      }),
      loadProductTypesForExport(),
    ]);
    if (products.length === 0) {
      return { ok: false, error: "Selected products were not found." };
    }
    return { ok: true, csv: csvWithUtf8Bom(buildProductsCatalogCsv(products, types)) };
  } catch (e) {
    console.error("exportSelectedProductsCatalogCsv", e);
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}

export async function exportExtraVariantsCatalogCsv(): Promise<
  { ok: true; csv: string } | { ok: false; error: string }
> {
  try {
    await requireAdmin();
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: { variants: { orderBy: variantOrderBy } },
    });

    const lines = [csvRow([...EXTRA_VARIANTS_CSV_HEADERS])];

    for (const p of products) {
      const extras = p.variants.slice(1);
      for (const v of extras) {
        const tiers = formatPriceTiersForCsv(parseProductPriceTiersJson(v.priceTiersJson));
        const listCents = p.basePriceCents + v.priceDeltaCents;
        lines.push(
          csvRow([
            p.slug,
            p.id,
            v.id,
            v.label,
            v.description,
            v.sku ?? "",
            (listCents / 100).toFixed(2),
            String(v.stock),
            v.unlimitedStock ? "yes" : "no",
            v.active ? "yes" : "no",
            tiers,
            v.pickerBgHex ?? "",
            v.pickerFgHex ?? "",
            v.pickerBorderHex ?? "",
            String(v.shippingUnits),
            String(v.sortOrder),
          ]),
        );
      }
    }

    return { ok: true, csv: csvWithUtf8Bom(`${lines.join("\n")}\n`) };
  } catch (e) {
    console.error("exportExtraVariantsCatalogCsv", e);
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}

export async function importProductsCatalogCsv(formData: FormData): Promise<CatalogImportResult | CatalogImportError> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose a CSV file." };
    }
    if (file.size > MAX_CSV_BYTES) {
      return { ok: false, error: "CSV must be 8MB or smaller." };
    }

    const parsed = parseProductsCatalogCsv(await readUploadedCsvText(file));
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const lookups = await loadCatalogLookups();
    const logs: CatalogImportLogEntry[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let rejected = 0;

    for (const row of parsed.rows) {
      const result = await upsertProductFromRow(row, lookups, logs);
      if (result === "created") created++;
      else if (result === "updated") updated++;
      else if (result === "rejected") rejected++;
      else skipped++;
    }

    revalidateCatalog();
    return { ok: true, created, updated, skipped, rejected, logs };
  } catch (e) {
    console.error("importProductsCatalogCsv", e);
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}

async function upsertExtraVariantRow(
  row: ParsedExtraVariantRow,
  lookups: CatalogLookups,
  logs: CatalogImportLogEntry[],
): Promise<"created" | "updated" | "rejected" | "skipped"> {
  const slugKey = row.productSlug.trim().toLowerCase();
  if (!slugKey) {
    log(logs, row.rowNumber, "—", "rejected", "product_slug is required.");
    return "rejected";
  }

  let product = lookups.productBySlug.get(slugKey);
  if (!product && row.productId.trim()) {
    product = lookups.productById.get(row.productId.trim());
  }
  if (!product) {
    log(logs, row.rowNumber, row.productSlug, "rejected", "Product not in catalog — import products first.");
    return "rejected";
  }

  const label = row.variantLabel.trim();
  if (!label) {
    log(logs, row.rowNumber, row.productSlug, "rejected", "variant_label is required.");
    return "rejected";
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id },
    orderBy: variantOrderBy,
    select: { id: true, label: true, sortOrder: true },
  });
  const primaryId = variants[0]?.id;

  let variantId: string | undefined;
  if (row.variantId.trim()) {
    const match = variants.find((v) => v.id === row.variantId.trim());
    if (!match) {
      log(logs, row.rowNumber, row.productSlug, "rejected", "variant_id not found on this product.");
      return "rejected";
    }
    variantId = match.id;
  } else {
    variantId = variants.find((v) => v.label === label)?.id;
  }

  if (variantId === primaryId) {
    log(
      logs,
      row.rowNumber,
      row.productSlug,
      "skipped",
      "Primary/default variation belongs in the products CSV — row skipped.",
    );
    return "skipped";
  }

  const listCents = parsePriceToCents(row.listPrice.trim() || "0");
  if (listCents === null) {
    log(logs, row.rowNumber, row.productSlug, "rejected", "Invalid list_price.");
    return "rejected";
  }

  const tiers = parsePriceTiersFromCsv(row.priceTiers);
  const stock = Math.max(0, Math.floor(Number(row.stock) || 0));
  const sortOrder = row.sortOrder.trim() ? Math.floor(Number(row.sortOrder)) : undefined;

  if (!variantId) {
    try {
      await createProductVariant(product.id, label);
      const refreshed = await prisma.productVariant.findMany({
        where: { productId: product.id },
        orderBy: variantOrderBy,
        select: { id: true, label: true },
      });
      variantId = refreshed.find((v) => v.label === label)?.id;
      if (!variantId) {
        log(logs, row.rowNumber, row.productSlug, "rejected", "Could not create variation.");
        return "rejected";
      }
      if (sortOrder !== undefined && !Number.isNaN(sortOrder)) {
        await prisma.productVariant.update({
          where: { id: variantId },
          data: { sortOrder },
        });
      }
    } catch (e) {
      log(logs, row.rowNumber, row.productSlug, "rejected", e instanceof Error ? e.message : "Create failed.");
      return "rejected";
    }

    try {
      await saveProductVariantRow({
        productId: product.id,
        variantId,
        label,
        sku: row.sku.trim() || null,
        description: row.description,
        listPriceUsd: (listCents / 100).toFixed(2),
        stock,
        unlimitedStock: row.unlimitedStock,
        active: row.active,
        priceTiers: tiers,
        pickerBgHex: row.pickerBgHex.trim() || null,
        pickerFgHex: row.pickerFgHex.trim() || null,
        pickerBorderHex: row.pickerBorderHex.trim() || null,
        shippingUnits: row.shippingUnits.trim()
          ? clampShippingUnits(Number(row.shippingUnits))
          : undefined,
      });
    } catch (e) {
      log(logs, row.rowNumber, row.productSlug, "skipped", e instanceof Error ? e.message : "Price save failed.");
    }

    log(logs, row.rowNumber, `${product.slug}:${label}`, "created", `Added variation “${label}”.`);
    return "created";
  }

  if (sortOrder !== undefined && !Number.isNaN(sortOrder)) {
    await prisma.productVariant.update({ where: { id: variantId }, data: { sortOrder } });
  }

  try {
    await saveProductVariantRow({
      productId: product.id,
      variantId,
      label,
      sku: row.sku.trim() || null,
      description: row.description,
      listPriceUsd: (listCents / 100).toFixed(2),
      stock,
      unlimitedStock: row.unlimitedStock,
      active: row.active,
      priceTiers: tiers,
      pickerBgHex: row.pickerBgHex.trim() || null,
      pickerFgHex: row.pickerFgHex.trim() || null,
      pickerBorderHex: row.pickerBorderHex.trim() || null,
      shippingUnits: row.shippingUnits.trim() ? clampShippingUnits(Number(row.shippingUnits)) : undefined,
    });
  } catch (e) {
    log(logs, row.rowNumber, row.productSlug, "rejected", e instanceof Error ? e.message : "Update failed.");
    return "rejected";
  }

  log(logs, row.rowNumber, `${product.slug}:${label}`, "updated", `Updated variation “${label}”.`);
  return "updated";
}

export async function importExtraVariantsCatalogCsv(
  formData: FormData,
): Promise<CatalogImportResult | CatalogImportError> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose a CSV file." };
    }
    if (file.size > MAX_CSV_BYTES) {
      return { ok: false, error: "CSV must be 8MB or smaller." };
    }

    const parsed = parseExtraVariantsCatalogCsv(await readUploadedCsvText(file));
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const lookups = await loadCatalogLookups();
    const logs: CatalogImportLogEntry[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let rejected = 0;

    for (const row of parsed.rows) {
      const result = await upsertExtraVariantRow(row, lookups, logs);
      if (result === "created") created++;
      else if (result === "updated") updated++;
      else if (result === "rejected") rejected++;
      else skipped++;
    }

    revalidateCatalog();
    return { ok: true, created, updated, skipped, rejected, logs };
  } catch (e) {
    console.error("importExtraVariantsCatalogCsv", e);
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
