import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";

/** True when any pin on this submission matches the product search query. */
export function submissionMatchesProductSearch(
  pins: StorefrontImagePin[] | undefined,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (!pins?.length) return false;
  return pins.some((pin) => {
    const hay = `${pin.productName} ${pin.variantLabel ?? ""} ${pin.productSlug}`.toLowerCase();
    return hay.includes(q);
  });
}

/** Unique product names tagged on a set of submissions (for search hints). */
export function uniqueTaggedProductNames(pinsBySubmissionId: Record<string, StorefrontImagePin[]>): string[] {
  const names = new Set<string>();
  for (const pins of Object.values(pinsBySubmissionId)) {
    for (const pin of pins) {
      const n = pin.productName.trim();
      if (n) names.add(n);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
