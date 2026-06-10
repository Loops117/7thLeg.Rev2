"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { OrderStatus, TrackingCarrier } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

const STATUSES = new Set<OrderStatus>([
  "PENDING",
  "PAID",
  "ACCEPTED",
  "FULFILLED",
  "SHIPPED",
  "COMPLETE",
  "CANCELLED",
]);

const CARRIERS = new Set<TrackingCarrier>(["NONE", "USPS", "UPS", "FEDEX", "DHL", "OTHER"]);

/** Update order status / tracking visible to admins and customers. */
export async function adminUpdateOrder(
  orderId: string,
  input: { status: OrderStatus; trackingNumber: string; trackingCarrier: TrackingCarrier },
): Promise<void> {
  await requireAdmin();
  const id = orderId.trim();
  if (!id || !STATUSES.has(input.status)) {
    throw new Error("Invalid order or status.");
  }
  const cc = input.trackingCarrier ?? "NONE";
  if (!CARRIERS.has(cc)) throw new Error("Invalid carrier.");

  const tracking = input.trackingNumber.trim().slice(0, 512);

  const prev = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: input.status,
      trackingNumber: tracking,
      trackingCarrier: cc,
    },
    select: { customerId: true },
  });

  if (input.status === "SHIPPED" && prev?.status !== "SHIPPED") {
    try {
      const { sendOrderShippedEmailIfEnabled } = await import("@/lib/send-order-shipped-email");
      await sendOrderShippedEmailIfEnabled(id);
    } catch (e) {
      console.warn("Order shipped email hook failed:", id, e);
    }
  }

  revalidatePath("/settings/sales");
  revalidatePath(`/settings/sales/${id}`);
  if (order.customerId) {
    revalidatePath("/account");
  }
}

export async function adminBulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatus,
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (!STATUSES.has(status)) return { ok: false, error: "Invalid status." };
    const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return { ok: false, error: "Select at least one order." };

    const toShip =
      status === "SHIPPED"
        ? await prisma.order.findMany({
            where: { id: { in: ids }, status: { not: "SHIPPED" } },
            select: { id: true },
          })
        : [];

    const result = await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    if (status === "SHIPPED" && toShip.length > 0) {
      const { sendOrderShippedEmailIfEnabled } = await import("@/lib/send-order-shipped-email");
      for (const row of toShip) {
        try {
          await sendOrderShippedEmailIfEnabled(row.id);
        } catch (e) {
          console.warn("Order shipped email hook failed:", row.id, e);
        }
      }
    }

    revalidatePath("/settings/sales");
    for (const id of ids) {
      revalidatePath(`/settings/sales/${id}`);
    }
    return { ok: true, updated: result.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk update failed." };
  }
}

export async function adminSetOrderArchived(orderId: string, archived: boolean): Promise<void> {
  await requireAdmin();
  const id = orderId.trim();
  if (!id) throw new Error("Invalid order.");

  await prisma.order.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });

  revalidatePath("/settings/sales");
  revalidatePath(`/settings/sales/${id}`);
}

export async function adminUpdateOrderPickChecks(
  orderId: string,
  checks: Record<string, boolean>,
): Promise<void> {
  await requireAdmin();
  const id = orderId.trim();
  if (!id) throw new Error("Invalid order.");

  const sanitized: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(checks)) {
    if (typeof key !== "string" || !key.trim()) continue;
    sanitized[key.trim()] = !!val;
  }

  await prisma.order.update({
    where: { id },
    data: { adminPickChecksJson: sanitized as Prisma.InputJsonValue },
  });

  revalidatePath(`/settings/sales/${id}`);
}
