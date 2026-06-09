export type PurchaseRewardLine = {
  lineTotalCents: number;
  pointsMultiplier?: number | null | { toNumber?: () => number };
};

function multiplierOf(line: PurchaseRewardLine): number {
  const raw = line.pointsMultiplier;
  if (raw == null) return 1;
  const n =
    typeof raw === "object" && raw !== null && "toNumber" in raw && typeof raw.toNumber === "function"
      ? raw.toNumber()
      : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Whole points earned from product line totals (matches fulfill-paid-order). */
export function computePurchaseRewardPoints(
  lines: PurchaseRewardLine[],
  pointsPerDollar: number,
): number {
  const ppd = Math.max(0, Math.floor(pointsPerDollar));
  if (ppd <= 0 || lines.length === 0) return 0;
  let earned = 0;
  for (const li of lines) {
    const dollars = li.lineTotalCents / 100;
    earned += Math.floor(dollars * ppd * multiplierOf(li));
  }
  return Math.max(0, earned);
}
