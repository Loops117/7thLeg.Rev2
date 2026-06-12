import type { ProductBreedingShape, ProductStockShape } from "@/lib/product-stock";
import { productAvailability } from "@/lib/product-stock";

/** 0 = in stock, 1 = out of stock, 2 = in breeding */
export function storefrontAvailabilitySortTier(p: ProductBreedingShape & ProductStockShape): number {
  const status = productAvailability(p);
  if (status === "available") return 0;
  if (status === "outofstock") return 1;
  return 2;
}

export type StoreCatalogVisibility = {
  showOutOfStock?: boolean;
  showInBreeding?: boolean;
};

export function resolveStoreCatalogVisibility(visibility?: StoreCatalogVisibility): {
  showOutOfStock: boolean;
  showInBreeding: boolean;
} {
  return {
    showOutOfStock: visibility?.showOutOfStock !== false,
    showInBreeding: visibility?.showInBreeding !== false,
  };
}

export function matchesStoreCatalogVisibility(
  p: ProductBreedingShape & ProductStockShape,
  visibility: StoreCatalogVisibility,
): boolean {
  const { showOutOfStock, showInBreeding } = resolveStoreCatalogVisibility(visibility);
  const status = productAvailability(p);
  if (status === "breeding" && !showInBreeding) return false;
  if (status === "outofstock" && !showOutOfStock) return false;
  return true;
}

export type StorefrontSortableProduct = ProductBreedingShape &
  ProductStockShape & {
    featured: boolean;
    name: string;
  };

export function compareStorefrontCatalogProducts(
  a: StorefrontSortableProduct,
  b: StorefrontSortableProduct,
): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  const tierA = storefrontAvailabilitySortTier(a);
  const tierB = storefrontAvailabilitySortTier(b);
  if (tierA !== tierB) return tierA - tierB;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function sortStorefrontCatalogProducts<T extends StorefrontSortableProduct>(rows: T[]): T[] {
  return [...rows].sort(compareStorefrontCatalogProducts);
}
