/** URL-safe slug from a product name (may need uniquifying in the DB). */
export function slugifyProductName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

export function parsePriceToCents(raw: string): number | null {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatPriceUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
