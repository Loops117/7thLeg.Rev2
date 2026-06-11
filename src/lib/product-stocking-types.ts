/** One admin table row per product variation (stocking grid). */
export type ProductStockingRow = {
  productId: string;
  productName: string;
  productSlug: string;
  productActive: boolean;
  productFeatured: boolean;
  productOnSale: boolean;
  productInBreeding: boolean;
  typeIds: string[];
  variantId: string;
  variantLabel: string;
  variantCount: number;
  basePriceCents: number;
  listPriceCents: number;
  stock: number;
  unlimitedStock: boolean;
  variantActive: boolean;
  shippingUnits: number;
};

export type ProductStockingQuickFilter =
  | "all"
  | "active"
  | "inactive"
  | "featured"
  | "sale"
  | "inbreeding"
  | "outofstock";

export type ProductStockingSortKey =
  | "productName"
  | "variantLabel"
  | "price"
  | "stock"
  | "shippingUnits"
  | "listingOn"
  | "optionOn"
  | "inBreeding";
