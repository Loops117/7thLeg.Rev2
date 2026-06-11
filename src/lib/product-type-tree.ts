import { ProductTypeIndex, formatTypeBreadcrumb, type ProductTypeFlat } from "@/lib/product-type-index";
import { productTypeOrderBy } from "@/lib/product-type-order";
import { prisma } from "@/lib/prisma";

export {
  ProductTypeIndex,
  buildProductTypePickerOptions,
  formatTypeBreadcrumb,
  type ProductTypeFlat,
  type ProductTypeTreeRow,
} from "@/lib/product-type-index";

export async function loadProductTypeIndex(): Promise<ProductTypeIndex> {
  const rows = await prisma.productType.findMany({
    orderBy: [...productTypeOrderBy],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      storefrontVisible: true,
    },
  });
  return new ProductTypeIndex(rows);
}

export async function typeIdsForStoreFilter(slug: string): Promise<string[] | null> {
  const index = await loadProductTypeIndex();
  const type = index.getBySlug(slug);
  if (!type || !type.storefrontVisible) return null;
  return index.descendantsOf(type.id);
}

export async function countActiveProductsInTypeSubtree(
  typeId: string,
  extraWhere?: { inBreeding?: boolean },
): Promise<number> {
  const index = await loadProductTypeIndex();
  const ids = index.descendantsOf(typeId);
  return prisma.product.count({
    where: {
      active: true,
      ...(extraWhere?.inBreeding ? { inBreeding: true } : {}),
      types: { some: { typeId: { in: ids } } },
    },
  });
}

export type StorefrontTypeFilterNav = {
  breadcrumb: { name: string; slug: string }[];
  chips: { id: string; name: string; slug: string; productCount: number }[];
};

/** Drill-down chips: roots when no filter; children of active type otherwise. */
export async function getStorefrontTypeFilterNav(
  activeSlug: string | null,
  options?: { inBreedingOnly?: boolean },
): Promise<StorefrontTypeFilterNav> {
  const inBreedingOnly = !!options?.inBreedingOnly;
  const index = await loadProductTypeIndex();
  const active = activeSlug?.trim() ? index.getBySlug(activeSlug.trim()) : undefined;
  const activeOk = active?.storefrontVisible ? active : undefined;

  const breadcrumb = activeOk
    ? index
        .ancestorsOf(activeOk.id)
        .map((id) => index.get(id))
        .filter((t): t is ProductTypeFlat => Boolean(t && t.storefrontVisible))
        .map((t) => ({ name: t.name, slug: t.slug }))
    : [];

  const chipParentId = activeOk?.id ?? null;
  const siblings = index.children(chipParentId).filter((t) => t.storefrontVisible);

  const chips = await Promise.all(
    siblings.map(async (t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      productCount: await countActiveProductsInTypeSubtree(
        t.id,
        inBreedingOnly ? { inBreeding: true } : undefined,
      ),
    })),
  );

  return { breadcrumb, chips };
}

export async function expandEventTypeIds(typeIds: string[]): Promise<string[]> {
  if (typeIds.length === 0) return [];
  const index = await loadProductTypeIndex();
  return index.expandWithDescendants(typeIds);
}

export async function expandProductTypeIdsForFooters(typeIds: string[]): Promise<string[]> {
  if (typeIds.length === 0) return [];
  const index = await loadProductTypeIndex();
  return index.expandWithAncestors(typeIds);
}
