/** Shared product-admin types (no "use client") so RSC/type imports never touch client bundles. */

import type { VariantPriceDisplay } from "@/lib/product-variant-price-display";

export type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  basePriceCents: number;
  /** Primary variation list price (base + first variation delta). */
  listPriceCents: number;
  quantity: number;
  unlimitedQuantity: boolean;
  active: boolean;
  featured: boolean;
  onSale: boolean;
  inBreeding: boolean;
  typeIds: string[];
};

export type ProductTypeOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  /** Full path for pickers, e.g. Live Inverts › Isopods › Cubaris sp. */
  pathLabel: string;
  isLeaf: boolean;
};

/** Leaf types grouped under their parent branch, in catalog tree order. */
export type ProductTypePickerGroup = {
  key: string;
  label: string;
  options: ProductTypeOption[];
};

export type ProductFooterOption = { id: string; title: string };

export type ProductShippingOptionRef = { id: string; label: string };

/** Admin product editor (create uses null id only in client state until after create). */
export type ProductEditInitial = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  basePriceCents: number;
  quantity: number;
  unlimitedQuantity: boolean;
  active: boolean;
  featured: boolean;
  onSale: boolean;
  inBreeding: boolean;
  speciesAutoAdd: boolean;
  speciesListSpecies: string;
  speciesListInsectType: string;
  speciesListMorphName: string;
  speciesListCommonName: string;
  speciesListSource: string;
  saleEndsAt: string;
  typeIds: string[];
  footerIds: string[];
  variantPriceDisplay: VariantPriceDisplay;
  excludedShippingOptionIds: string[];
};
