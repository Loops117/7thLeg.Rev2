/** Preview / checkout math for redeeming whole points at a fixed cents-per-point rate. */

export type LoyaltyRedemptionInputs = {
  loyaltyProgramEnabled: boolean;
  redemptionCentsPerPoint: number;
  customerPointsBalance: number;
  /** From cart row; whole points customer selected. */
  appliedLoyaltyPointsRequested: number;
  /** Payable merchandise subtotal after coupons (cents). */
  merchandiseSubtotalCents: number;
};

export type LoyaltyRedemptionPlan = {
  /** Points actually deducted when the order is paid (whole points). */
  pointsToRedeem: number;
  /** Merchandise discount in cents after line-level rounding (≤ requested value). */
  discountCents: number;
  /** Same as discountCents for display; may be slightly less than pointsToRedeem * cpp due to rounding. */
  discountFromPointsCents: number;
};

export function planLoyaltyRedemptionForCheckout(input: LoyaltyRedemptionInputs): LoyaltyRedemptionPlan | null {
  if (!input.loyaltyProgramEnabled) return null;
  const cpp = Math.floor(Number(input.redemptionCentsPerPoint) || 0);
  if (cpp <= 0) return null;
  const merch = Math.max(0, Math.floor(input.merchandiseSubtotalCents));
  if (merch <= 0) return null;

  const balance = Math.max(0, Math.floor(input.customerPointsBalance));
  const requested = Math.max(0, Math.floor(input.appliedLoyaltyPointsRequested));
  const maxPointsByMerch = Math.floor(merch / cpp);
  const maxPoints = Math.min(balance, maxPointsByMerch, requested);
  if (maxPoints <= 0) {
    return { pointsToRedeem: 0, discountCents: 0, discountFromPointsCents: 0 };
  }

  const rawDiscount = Math.min(merch, maxPoints * cpp);
  return {
    pointsToRedeem: maxPoints,
    discountCents: rawDiscount,
    discountFromPointsCents: rawDiscount,
  };
}

export function loyaltyDollarValueCents(points: number, redemptionCentsPerPoint: number): number {
  const p = Math.max(0, Math.floor(points));
  const cpp = Math.max(0, Math.floor(redemptionCentsPerPoint));
  return p * cpp;
}

/** Maximum whole points redeemable on this cart at the current rate (capped by balance and merchandise). */
export function maxRedeemablePointsForCart(input: {
  loyaltyProgramEnabled: boolean;
  redemptionCentsPerPoint: number;
  customerPointsBalance: number;
  merchandiseSubtotalCents: number;
}): number {
  const plan = planLoyaltyRedemptionForCheckout({
    ...input,
    appliedLoyaltyPointsRequested: 2_000_000_000,
  });
  return plan?.pointsToRedeem ?? 0;
}
