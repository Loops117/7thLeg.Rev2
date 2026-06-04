/** Normalize admin-entered variation SKU (empty → null). */
export function normalizeVariantSku(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  return s.length > 0 ? s : null;
}
