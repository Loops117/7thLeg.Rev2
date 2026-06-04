/** Catalog editor payload types (no server imports — safe for client `import type`). */

import type { ProductMediaAdmin } from "@/app/actions/product-images-admin";
import type { ProductEditInitial } from "@/lib/products-admin-types";

export type ProductCatalogKitAdmin = {
  enabled: boolean;
  label: string;
  discountCents: number;
  items: {
    productId: string;
    productName: string;
    productSlug: string;
    variantId: string | null;
    variantLabel: string | null;
  }[];
};

export type ProductCatalogEditPayload = {
  initial: ProductEditInitial;
  media: ProductMediaAdmin;
  recommendations: {
    related: { id: string; name: string; slug: string }[];
    youMayAlsoWant: { id: string; name: string; slug: string }[];
  };
  kit: ProductCatalogKitAdmin;
};
