export const PRODUCT_BACK_FROM_QUERY = "from";

export const PRODUCT_BACK_SOURCES = ["home", "featured", "store", "in-breeding"] as const;
export type ProductBackSource = (typeof PRODUCT_BACK_SOURCES)[number];

export type ProductBackNav = {
  href: string;
  label: string;
};

export function parseProductBackSource(raw: string | null | undefined): ProductBackSource | null {
  const v = raw?.trim().toLowerCase();
  if (v === "home" || v === "featured" || v === "store" || v === "in-breeding") return v;
  return null;
}

export function resolveProductBackNav(
  source: ProductBackSource | null,
  labels?: {
    store?: string | null;
    inBreeding?: string | null;
  },
): ProductBackNav {
  switch (source) {
    case "home":
      return { href: "/", label: "Home" };
    case "featured":
      return { href: "/featured", label: "Featured" };
    case "in-breeding":
      return {
        href: "/in-breeding",
        label: labels?.inBreeding?.trim() || "In Breeding",
      };
    case "store":
    default:
      return { href: "/store", label: labels?.store?.trim() || "Store" };
  }
}

export function buildProductHref(
  slug: string,
  opts?: {
    eventId?: string | null;
    variantId?: string | null;
    from?: ProductBackSource | null;
    review?: boolean;
  },
): string {
  const p = new URLSearchParams();
  if (opts?.eventId?.trim()) p.set("event", opts.eventId.trim());
  if (opts?.variantId?.trim()) p.set("variant", opts.variantId.trim());
  if (opts?.from) p.set(PRODUCT_BACK_FROM_QUERY, opts.from);
  if (opts?.review) p.set("review", "1");
  const q = p.toString();
  return `/product/${slug}${q ? `?${q}` : ""}`;
}
