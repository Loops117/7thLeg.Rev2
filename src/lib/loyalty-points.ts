import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ApplyCustomerPointsDeltaInput = {
  customerId: string;
  delta: number;
  reason: string;
  orderId?: string | null;
  artSubmissionId?: string | null;
};

/**
 * Adjust customer points balance and append a ledger row. Use for all programmatic point changes.
 */
export async function applyCustomerPointsDelta(
  input: ApplyCustomerPointsDeltaInput,
  tx?: Prisma.TransactionClient,
): Promise<{ newBalance: number }> {
  const d = Math.trunc(input.delta);
  if (d === 0) {
    throw new Error("ZERO_DELTA");
  }
  const reason = (input.reason ?? "").trim().slice(0, 500) || "Points adjustment";

  const run = async (t: Prisma.TransactionClient) => {
    const cur = await t.customer.findUnique({
      where: { id: input.customerId },
      select: { pointsBalance: true },
    });
    if (!cur) throw new Error("NOT_FOUND");
    const next = Math.max(0, cur.pointsBalance + d);
    await t.customer.update({
      where: { id: input.customerId },
      data: { pointsBalance: next },
    });
    await t.pointsLedger.create({
      data: {
        customerId: input.customerId,
        delta: d,
        reason,
        orderId: input.orderId ?? null,
        artSubmissionId: input.artSubmissionId ?? null,
      },
    });
    return { newBalance: next };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

export async function getImageSubmissionApprovalPoints(): Promise<number> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { imageSubmissionApprovalPoints: true },
    });
    return Math.max(0, Math.floor(row?.imageSubmissionApprovalPoints ?? 0));
  } catch {
    return 0;
  }
}
