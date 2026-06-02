import type { CartLabelBundleLineEntry, CartLabelLineView } from "@/lib/cart-label-types";

/** Cart list: drop embedded row segment from formatted bag names (`Name - Row 3 - text`). */
export function cartLabelEntryDescription(displayName: string): string {
  return displayName.replace(/\s*-\s*Row\s+\d+\s*-\s*/gi, " - ").trim();
}

/** Preview entries for a cart label line (bundle or legacy single-doc row). */
export function labelPreviewEntriesForCartLine(line: CartLabelLineView): CartLabelBundleLineEntry[] | null {
  if (line.bundleEntries?.length) return line.bundleEntries;
  if (line.legacyPreviewEntry) return [line.legacyPreviewEntry];
  return null;
}
