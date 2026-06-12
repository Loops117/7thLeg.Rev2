import { EventKind, type EventSaleDiscountMode, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { effectiveEventSalePriceCents, eventDisplayPriceForBase, isEventActive } from "@/lib/event-pricing";
import { productListPriceCents } from "@/lib/product-list-price-cents";
import { productTypeOrderBy } from "@/lib/product-type-order";
import {
  compareStorefrontCatalogProducts,
  matchesStoreCatalogVisibility,
  resolveStoreCatalogVisibility,
  type StoreCatalogVisibility,
} from "@/lib/store-catalog-sort";
import { expandEventTypeIds, typeIdsForStoreFilter } from "@/lib/product-type-tree";
export {
  getStorefrontTypeFilterNav,
  type StorefrontTypeFilterNav,
} from "@/lib/product-type-tree";

/** Default page size for the store "Load more" list. */
export const STORE_PAGE_SIZE = 24;

/** Listing / carousel card shape (shared). */
export const storefrontProductSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  basePriceCents: true,
  quantity: true,
  unlimitedQuantity: true,
  featured: true,
  onSale: true,
  inBreeding: true,
  variantPriceDisplay: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    take: 24,
    select: { url: true, watermarkedUrl: true, useWatermarkedPublic: true, variantId: true },
  },
  variants: {
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      label: true,
      stock: true,
      unlimitedStock: true,
      active: true,
      priceDeltaCents: true,
    },
  },
} satisfies Prisma.ProductSelect;

type StorefrontProductRow = Prisma.ProductGetPayload<{ select: typeof storefrontProductSelect }>;

const storefrontSortSelect = {
  id: true,
  name: true,
  featured: true,
  inBreeding: true,
  quantity: true,
  unlimitedQuantity: true,
  variants: {
    select: { active: true, unlimitedStock: true, stock: true },
  },
} satisfies Prisma.ProductSelect;

async function buildStorefrontListWhere(
  typeSlug: string | null | undefined,
  search: string | null | undefined,
  inBreedingOnly = false,
): Promise<Prisma.ProductWhereInput> {
  const slug = typeSlug?.trim() || null;
  const q = search?.trim() || null;
  const typeIds = slug ? await typeIdsForStoreFilter(slug) : null;

  return {
    active: true,
    ...(inBreedingOnly ? { inBreeding: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { shortDescription: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(typeIds && typeIds.length > 0
      ? {
          types: {
            some: { typeId: { in: typeIds } },
          },
        }
      : slug
        ? { id: { in: [] } }
        : {}),
  };
}

async function listStorefrontCatalogPage(
  where: Prisma.ProductWhereInput,
  skip: number,
  take: number,
  visibility?: StoreCatalogVisibility,
) {
  const vis = resolveStoreCatalogVisibility(visibility);
  const sortRows = await prisma.product.findMany({
    where,
    select: storefrontSortSelect,
  });
  const sorted = sortRows
    .filter((p) => matchesStoreCatalogVisibility(p, vis))
    .sort(compareStorefrontCatalogProducts);
  const total = sorted.length;
  const pageIds = sorted.slice(Math.max(0, Math.floor(skip)), Math.max(0, Math.floor(skip)) + take).map((p) => p.id);
  if (pageIds.length === 0) {
    return { products: [] as StorefrontProductRow[], total };
  }
  const full = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    select: storefrontProductSelect,
  });
  const byId = new Map(full.map((p) => [p.id, p]));
  const products = pageIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  return { products, total };
}

export async function countStorefrontProducts(
  typeSlug: string | null | undefined,
  search: string | null | undefined,
  visibility?: StoreCatalogVisibility,
) {
  const where = await buildStorefrontListWhere(typeSlug, search);
  const vis = resolveStoreCatalogVisibility(visibility);
  const sortRows = await prisma.product.findMany({
    where,
    select: storefrontSortSelect,
  });
  return sortRows.filter((p) => matchesStoreCatalogVisibility(p, vis)).length;
}

export async function getStorefrontProductsPage(
  skip: number,
  take: number,
  typeSlug: string | null | undefined,
  search: string | null | undefined,
  visibility?: StoreCatalogVisibility,
) {
  const t = Math.min(100, Math.max(1, Math.floor(take)));
  const where = await buildStorefrontListWhere(typeSlug, search);
  const { products } = await listStorefrontCatalogPage(where, Math.max(0, Math.floor(skip)), t, visibility);
  return products;
}

/** Featured products only (store strip), bounded — avoids loading the full catalog. */
export async function getStorefrontFeaturedStrip(take: number) {
  const n = Math.min(48, Math.max(1, Math.floor(take)));
  return prisma.product.findMany({
    where: { active: true, featured: true },
    take: n,
    orderBy: { name: "asc" },
    select: storefrontProductSelect,
  });
}

export async function countStorefrontInBreedingProducts(
  typeSlug: string | null | undefined,
  search: string | null | undefined,
) {
  return prisma.product.count({ where: await buildStorefrontListWhere(typeSlug, search, true) });
}

export async function getStorefrontInBreedingProductsPage(
  skip: number,
  take: number,
  typeSlug: string | null | undefined,
  search: string | null | undefined,
) {
  const t = Math.min(100, Math.max(1, Math.floor(take)));
  return prisma.product.findMany({
    where: await buildStorefrontListWhere(typeSlug, search, true),
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    skip: Math.max(0, Math.floor(skip)),
    take: t,
    select: storefrontProductSelect,
  });
}

/** Featured products that are also marked in breeding. */
export async function getStorefrontInBreedingFeaturedStrip(take: number) {
  const n = Math.min(48, Math.max(1, Math.floor(take)));
  return prisma.product.findMany({
    where: { active: true, inBreeding: true, featured: true },
    take: n,
    orderBy: { name: "asc" },
    select: storefrontProductSelect,
  });
}

/** Product carousel on home / featured / about panes: featured first, then name. */
export async function getCarouselProducts(limit: number, typeIds?: string[] | null) {
  const n = Math.min(48, Math.max(1, Math.floor(limit)));
  const ids = typeIds?.filter((x) => typeof x === "string" && x.length > 0) ?? [];
  const expanded = ids.length > 0 ? await expandEventTypeIds(ids) : [];
  const typeFilter =
    expanded.length > 0
      ? {
          types: {
            some: { typeId: { in: expanded } },
          },
        }
      : undefined;
  return prisma.product.findMany({
    where: { active: true, ...typeFilter },
    take: n,
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: storefrontProductSelect,
  });
}

export async function getStorefrontProducts(typeSlug?: string | null, search?: string | null) {
  return prisma.product.findMany({
    where: await buildStorefrontListWhere(typeSlug, search),
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: storefrontProductSelect,
  });
}

type StorefrontProductBase = StorefrontProductRow;

/** Card row; optional display fields are set when an event applies timed-sale pricing. */
export type StorefrontProductCard = StorefrontProductBase & {
  displayPriceCents?: number;
  displaySale?: boolean;
};

export type PublicEventForStorefront = {
  id: string;
  name: string;
  details: string;
  kind: EventKind;
  startAt: Date;
  endAt: Date;
  signupButtonLabel: string;
  couponCode: string;
  saleDiscountMode: EventSaleDiscountMode;
  saleDiscountPercent: number | null;
  saleDiscountCents: number | null;
};

function enrichProductsWithEventPricing(
  rows: StorefrontProductBase[],
  event: Pick<
    PublicEventForStorefront,
    "kind" | "startAt" | "endAt" | "saleDiscountMode" | "saleDiscountPercent" | "saleDiscountCents"
  >,
): StorefrontProductCard[] {
  if (
    event.kind !== "TIMED" ||
    !isEventActive(event.startAt, event.endAt) ||
    event.saleDiscountMode === "NONE"
  ) {
    return rows.map((p) => ({ ...p }));
  }
  return rows.map((p) => {
    const listCents = productListPriceCents(p.basePriceCents, p.variants);
    const { priceCents, showSale } = effectiveEventSalePriceCents(
      listCents,
      event.saleDiscountMode,
      event.saleDiscountPercent,
      event.saleDiscountCents,
    );
    if (!showSale) {
      return { ...p };
    }
    return {
      ...p,
      displayPriceCents: priceCents,
      displaySale: true,
    };
  });
}

async function fetchEventProductRows(
  eventId: string,
  limit: number,
): Promise<{ event: PublicEventForStorefront; baseRows: StorefrontProductBase[] } | null> {
  const n = Math.min(500, Math.max(1, Math.floor(limit)));
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      details: true,
      kind: true,
      startAt: true,
      endAt: true,
      signupButtonLabel: true,
      couponCode: true,
      saleDiscountMode: true,
      saleDiscountPercent: true,
      saleDiscountCents: true,
      typeLinks: { select: { typeId: true } },
      productLinks: { select: { productId: true } },
    },
  });
  if (!event) return null;
  const typeIds = await expandEventTypeIds(event.typeLinks.map((t) => t.typeId));
  const explicitIds = event.productLinks.map((p) => p.productId);
  const or: { id?: { in: string[] }; types?: { some: { typeId: { in: string[] } } } }[] = [];
  if (explicitIds.length) or.push({ id: { in: explicitIds } });
  if (typeIds.length) or.push({ types: { some: { typeId: { in: typeIds } } } });
  if (or.length === 0) {
    const { typeLinks: _tl, productLinks: _pl, ...pub } = event;
    return { event: pub, baseRows: [] };
  }

  const rows = await prisma.product.findMany({
    where: { active: true, OR: or },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: storefrontProductSelect,
  });
  const seen = new Set<string>();
  const out: StorefrontProductBase[] = [];
  for (const p of rows) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= n) break;
  }
  const { typeLinks: _tl, productLinks: _pl, ...pub } = event;
  return { event: pub, baseRows: out };
}

/** Full event + products with timed-sale display prices when applicable. */
export async function getStorefrontEventListing(
  eventId: string,
  limit: number,
): Promise<{ event: PublicEventForStorefront; products: StorefrontProductCard[] } | null> {
  const pack = await fetchEventProductRows(eventId, limit);
  if (!pack) return null;
  const products = enrichProductsWithEventPricing(pack.baseRows, pack.event);
  return { event: pack.event, products };
}

/** Active products for an event: union of linked types/products (deduped), with timed-sale pricing applied. */
export async function getStorefrontProductsForEvent(eventId: string, limit: number): Promise<StorefrontProductCard[]> {
  const pack = await getStorefrontEventListing(eventId, limit);
  if (!pack) return [];
  return pack.products;
}

function buildEventOrBranches(
  typeIds: string[],
  productIds: string[],
): Prisma.ProductWhereInput[] {
  const or: Prisma.ProductWhereInput[] = [];
  if (productIds.length) or.push({ id: { in: productIds } });
  if (typeIds.length) or.push({ types: { some: { typeId: { in: typeIds } } } });
  return or;
}

function buildEventStoreWhere(
  orBranches: Prisma.ProductWhereInput[],
  q: string | null | undefined,
): Prisma.ProductWhereInput {
  const qTrim = q?.trim() || "";
  if (orBranches.length === 0) return { id: { in: [] } };
  const search: Prisma.ProductWhereInput | null = qTrim
    ? {
        OR: [
          { name: { contains: qTrim, mode: "insensitive" } },
          { slug: { contains: qTrim, mode: "insensitive" } },
          { shortDescription: { contains: qTrim, mode: "insensitive" } },
        ],
      }
    : null;
  return {
    active: true,
    AND: [{ OR: orBranches }, ...(search ? [search] : [])],
  };
}

const eventListSelect = {
  id: true,
  name: true,
  details: true,
  kind: true,
  startAt: true,
  endAt: true,
  signupButtonLabel: true,
  couponCode: true,
  saleDiscountMode: true,
  saleDiscountPercent: true,
  saleDiscountCents: true,
  typeLinks: { select: { typeId: true } },
  productLinks: { select: { productId: true } },
} as const;

export async function countStorefrontEventProducts(eventId: string, q: string | null | undefined) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: eventListSelect,
  });
  if (!event) return 0;
  const or = buildEventOrBranches(
    await expandEventTypeIds(event.typeLinks.map((t) => t.typeId)),
    event.productLinks.map((p) => p.productId),
  );
  return prisma.product.count({ where: buildEventStoreWhere(or, q) });
}

/** Paged event store listing (search matches name / slug / short description). */
export async function getStorefrontEventProductPage(
  eventId: string,
  skip: number,
  take: number,
  q: string | null | undefined,
): Promise<{ event: PublicEventForStorefront; products: StorefrontProductCard[] } | null> {
  const n = Math.min(100, Math.max(1, Math.floor(take)));
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: eventListSelect,
  });
  if (!event) return null;
  const or = buildEventOrBranches(
    await expandEventTypeIds(event.typeLinks.map((t) => t.typeId)),
    event.productLinks.map((p) => p.productId),
  );
  const { typeLinks: _tl, productLinks: _pl, ...pub } = event;
  const baseRows = await prisma.product.findMany({
    where: buildEventStoreWhere(or, q),
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    skip: Math.max(0, Math.floor(skip)),
    take: n,
    select: storefrontProductSelect,
  });
  const products = enrichProductsWithEventPricing(baseRows, pub);
  return { event: pub, products };
}

export async function getStorefrontProductTypes() {
  const { getStorefrontTypeFilterNav } = await import("@/lib/product-type-tree");
  return getStorefrontTypeFilterNav(null);
}

/** When `?event=` is present on a product page, apply the same timed-sale rules if the product is in scope. */
export async function getEventPriceOverlayForProduct(
  eventId: string,
  productId: string,
  basePriceCents: number,
  onSaleDb: boolean,
): Promise<{ displayPriceCents: number; displaySale: boolean } | null> {
  const listing = await fetchEventProductRows(eventId, 500);
  if (!listing) return null;
  // COUPON / SIGNUP events must not simulate timed-sale prices on storefront product pages.
  if (listing.event.kind !== EventKind.TIMED) return null;
  if (!listing.baseRows.some((p) => p.id === productId)) return null;
  return eventDisplayPriceForBase(listing.event, basePriceCents, onSaleDb);
}
