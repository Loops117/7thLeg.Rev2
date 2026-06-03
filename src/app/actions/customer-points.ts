"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CustomerPointsLedgerRow } from "@/lib/customer-points";

export async function listMyPointsLedger(take = 100): Promise<CustomerPointsLedgerRow[] | { error: string }> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { error: "Log in to view your points history." };
  }
  const n = Math.min(200, Math.max(1, take));
  const rows = await prisma.pointsLedger.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: n,
    select: {
      id: true,
      delta: true,
      reason: true,
      orderId: true,
      artSubmissionId: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    orderId: r.orderId,
    artSubmissionId: r.artSubmissionId,
    createdAt: r.createdAt.toISOString(),
  }));
}
