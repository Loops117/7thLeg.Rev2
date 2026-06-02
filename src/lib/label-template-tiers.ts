import { formatPriceUsd } from "@/lib/product-slug";

export type LabelPriceTier = { minQty: number; unitCents: number };

export const DEFAULT_LABEL_PRICE_TIERS: LabelPriceTier[] = [{ minQty: 1, unitCents: 100 }];

/** Normalize tiers from DB JSON for admin UI and pricing. */
export function parsePriceTiersJson(raw: unknown): LabelPriceTier[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_LABEL_PRICE_TIERS.map((t) => ({ ...t }));
  }
  const parsed: LabelPriceTier[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const minQty = Math.max(1, Math.floor(Number(o.minQty) || 0));
    const unitCents = Math.max(0, Math.round(Number(o.unitCents) || 0));
    if (minQty < 1 || !Number.isFinite(unitCents)) continue;
    parsed.push({ minQty, unitCents });
  }
  if (parsed.length === 0) return DEFAULT_LABEL_PRICE_TIERS.map((t) => ({ ...t }));
  parsed.sort((a, b) => a.minQty - b.minQty);
  return dedupeMinQtyKeepLast(parsed);
}

function dedupeMinQtyKeepLast(sorted: LabelPriceTier[]): LabelPriceTier[] {
  const byMin = new Map<number, LabelPriceTier>();
  for (const t of sorted) {
    byMin.set(t.minQty, t);
  }
  return [...byMin.values()].sort((a, b) => a.minQty - b.minQty);
}

export type ValidateTiersResult = { ok: true; tiers: LabelPriceTier[] } | { ok: false; error: string };

/** Validate user-edited tier rows before save. */
export function validatePriceTiersInput(rows: LabelPriceTier[]): ValidateTiersResult {
  if (rows.length === 0) return { ok: false, error: "Add at least one price tier." };
  if (rows.length > 12) return { ok: false, error: "At most 12 tiers." }

  const normalized: LabelPriceTier[] = [];
  for (const r of rows) {
    const minQty = Math.max(1, Math.floor(Number(r.minQty) || 0));
    const unitCents = Math.round(Number(r.unitCents) || 0);
    if (minQty < 1 || !Number.isFinite(unitCents)) {
      return { ok: false, error: "Each tier needs a valid minimum quantity and price." };
    }
    if (unitCents < 0 || unitCents > 1_000_000) {
      return { ok: false, error: "Unit price out of range." };
    }
    normalized.push({ minQty, unitCents });
  }
  normalized.sort((a, b) => a.minQty - b.minQty);
  const deduped = dedupeMinQtyKeepLast(normalized);
  for (let i = 1; i < deduped.length; i++) {
    if (deduped[i].minQty <= deduped[i - 1].minQty) {
      return { ok: false, error: "Minimum quantities must be unique and increasing." };
    }
  }
  return { ok: true, tiers: deduped };
}

/** Unit price in cents for a line quantity (best tier where minQty ≤ qty). */
export function unitCentsForLabelQuantity(tiers: LabelPriceTier[], quantity: number): number {
  const q = Math.max(1, Math.floor(quantity));
  const list = parsePriceTiersJson(tiers);
  let best = list[0]?.unitCents ?? 0;
  for (const t of list) {
    if (t.minQty <= q) best = t.unitCents;
  }
  return best;
}

/** Short pricing summary for tables and picker rows. */
export function labelTierSummary(tiers: LabelPriceTier[]): string {
  const list = parsePriceTiersJson(tiers);
  if (list.length === 0) return "—";
  const parts = list.slice(0, 3).map((t) => `${formatPriceUsd(t.unitCents)} @ ${t.minQty}+`);
  const extra = list.length > 3 ? ` (+${list.length - 3} more)` : "";
  return parts.join(" · ") + extra;
}
