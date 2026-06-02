"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type PointsLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  orderId: string | null;
  createdAt: string;
};

export async function listPointsLedgerForCustomer(
  customerId: string,
  take = 80,
): Promise<PointsLedgerRow[] | { error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }
  const n = Math.min(200, Math.max(1, take));
  const rows = await prisma.pointsLedger.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: n,
    select: { id: true, delta: true, reason: true, orderId: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    orderId: r.orderId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type AdjustPointsResult = { ok: true; newBalance: number } | { ok: false; error: string };

/**
 * Apply a point delta and append a ledger row. Reason is shown in history.
 */
export async function adjustCustomerLoyaltyPoints(
  customerId: string,
  delta: number,
  reason: string,
): Promise<AdjustPointsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  const d = Math.trunc(delta);
  if (d === 0) {
    return { ok: false, error: "Enter a non-zero point change." };
  }
  const r = (reason ?? "").trim().slice(0, 500) || "Manual adjustment (admin)";

  try {
    const { newBalance } = await prisma.$transaction(async (tx) => {
      const cur = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true, pointsBalance: true } });
      if (!cur) throw new Error("NOT_FOUND");
      const next = Math.max(0, cur.pointsBalance + d);
      await tx.customer.update({
        where: { id: customerId },
        data: { pointsBalance: next },
      });
      await tx.pointsLedger.create({
        data: {
          customerId,
          delta: d,
          reason: r,
        },
      });
      return { newBalance: next };
    });
    revalidatePath("/settings/loyalty", "page");
    revalidatePath("/settings/customers", "page");
    return { ok: true, newBalance };
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { ok: false, error: "Customer not found." };
    }
    return { ok: false, error: "Could not update points." };
  }
}
