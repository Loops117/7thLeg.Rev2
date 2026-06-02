/**
 * Allocate a merchandise discount across cart lines (integer cents per line),
 * then rebuild unit prices so unit × qty = line total for payment providers.
 */

export type PendingLineMoney = {
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

function apportionIntegers(total: number, weights: readonly number[]): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const wsum = weights.reduce((a, b) => a + b, 0);
  if (wsum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / wsum);
  const floors = raw.map((r) => Math.floor(r));
  let rem = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (const { i } of order) {
    if (rem <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    rem--;
  }
  return out;
}

/** Integer discount per line; sum equals `discountCents` when possible without exceeding any line total. */
export function allocateLineDiscounts(lineTotals: readonly number[], discountCents: number): number[] {
  const n = lineTotals.length;
  const sum = lineTotals.reduce((a, b) => a + b, 0);
  const d = Math.min(Math.max(0, Math.floor(discountCents)), sum);
  if (d === 0 || n === 0) return Array(n).fill(0);

  let alloc = apportionIntegers(d, lineTotals);
  for (let i = 0; i < n; i++) {
    if ((alloc[i] ?? 0) > lineTotals[i]!) {
      alloc[i] = lineTotals[i]!;
    }
  }
  let given = alloc.reduce((a, b) => a + b, 0);
  let remaining = d - given;
  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < n; i++) {
      if ((alloc[i] ?? 0) < lineTotals[i]!) {
        alloc[i] = (alloc[i] ?? 0) + 1;
        remaining--;
        progressed = true;
        break;
      }
    }
    if (!progressed) break;
  }
  return alloc;
}

export function applyLoyaltyDiscountToPendingLineCreates<T extends PendingLineMoney>(
  lineCreates: readonly T[],
  discountCents: number,
): { lines: T[]; discountAppliedCents: number; roundingShortfallCents: number } {
  if (lineCreates.length === 0) {
    return { lines: [], discountAppliedCents: 0, roundingShortfallCents: 0 };
  }
  const totals = lineCreates.map((l) => l.lineTotalCents);
  const sumOld = totals.reduce((a, b) => a + b, 0);
  const d = Math.min(Math.max(0, Math.floor(discountCents)), sumOld);
  if (d === 0) {
    return { lines: lineCreates.map((l) => ({ ...l })), discountAppliedCents: 0, roundingShortfallCents: 0 };
  }

  const alloc = allocateLineDiscounts(totals, d);
  const targets = totals.map((t, i) => t - (alloc[i] ?? 0));
  const out = lineCreates.map((l) => ({ ...l }));

  for (let i = 0; i < out.length; i++) {
    const tgt = Math.max(0, targets[i] ?? 0);
    const q = Math.max(1, out[i]!.quantity);
    const u = Math.floor(tgt / q);
    out[i]!.unitPriceCents = u;
    out[i]!.lineTotalCents = u * q;
  }

  const wantedMerch = sumOld - alloc.reduce((a, b) => a + b, 0);
  let got = out.reduce((s, l) => s + l.lineTotalCents, 0);
  let short = wantedMerch - got;

  while (short > 0) {
    let bumped = false;
    const byQty = out
      .map((l, idx) => ({ idx, q: l.quantity }))
      .sort((a, b) => a.q - b.q);
    for (const { idx, q } of byQty) {
      if (short >= q) {
        out[idx]!.unitPriceCents += 1;
        out[idx]!.lineTotalCents += q;
        short -= q;
        bumped = true;
        break;
      }
    }
    if (!bumped) break;
  }

  const discountApplied = sumOld - out.reduce((s, l) => s + l.lineTotalCents, 0);
  return { lines: out, discountAppliedCents: discountApplied, roundingShortfallCents: short };
}
