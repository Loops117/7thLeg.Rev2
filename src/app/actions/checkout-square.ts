"use server";

import { revalidatePath } from "next/cache";
import { auth as readAuthSession } from "@/auth";
import { OrderStatus } from "@/generated/prisma/client";
import { createFreshPendingCheckoutOrder } from "@/lib/checkout-create-pending-order";
import { fulfillPaidOrder } from "@/lib/fulfill-paid-order";
import { prisma } from "@/lib/prisma";
import { getSquareClient, getSquarePublicApplicationId, isSquareSandbox } from "@/lib/square-server";
import { SquareError, type Square } from "square";

export type PrepareSquareCheckoutResult =
  | { ok: true; orderId: string; applicationId: string; locationId: string; sandbox: boolean; totalCents: number }
  | { ok: false; error: string };

export async function prepareSquareCheckoutAction(): Promise<PrepareSquareCheckoutResult> {
  const session = await readAuthSession();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { ok: false, error: "Sign in to check out." };
  }
  const customerId = session.user.id;

  const row = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { paymentSquareEnabled: true },
  });
  if (!row?.paymentSquareEnabled) {
    return { ok: false, error: "Square checkout is disabled for this store." };
  }

  const applicationId = getSquarePublicApplicationId();
  const locationId = process.env.SQUARE_LOCATION_ID?.trim();
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!applicationId || !locationId || !token) {
    return { ok: false, error: "Square is not fully configured on the server (env vars)." };
  }

  const created = await createFreshPendingCheckoutOrder(customerId);
  if (!created.ok) return created;

  const ord = await prisma.order.findUnique({
    where: { id: created.orderId },
    select: { id: true, totalCents: true, customerId: true },
  });
  if (!ord || ord.customerId !== customerId) {
    return { ok: false, error: "Could not verify your cart order." };
  }
  if (ord.totalCents <= 0) {
    await prisma.order.delete({ where: { id: ord.id } }).catch(() => {});
    return {
      ok: false,
      error: "This order total is $0.00 — use Complete order on the cart page instead of card checkout.",
    };
  }

  revalidatePath("/cart");
  revalidatePath("/account");

  return {
    ok: true,
    orderId: ord.id,
    applicationId,
    locationId,
    sandbox: isSquareSandbox(),
    totalCents: ord.totalCents,
  };
}

export type CompleteSquarePaymentResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

export async function completeSquarePaymentAction(
  orderId: string,
  sourceIdRaw: string,
): Promise<CompleteSquarePaymentResult> {
  const session = await readAuthSession();
  if (session?.user?.role !== "customer" || !session.user.id) {
    return { ok: false, error: "Sign in required." };
  }
  const customerId = session.user.id;

  const siteCfg = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { paymentSquareEnabled: true },
  });
  if (!siteCfg?.paymentSquareEnabled) {
    return { ok: false, error: "Square checkout is disabled." };
  }

  const sourceId = sourceIdRaw?.trim();
  if (!sourceId) {
    return { ok: false, error: "Missing card token." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      customerId: true,
      totalCents: true,
      stripeCheckoutSessionId: true,
    },
  });
  if (!order || order.customerId !== customerId) {
    return { ok: false, error: "Order not found." };
  }

  if (order.status !== OrderStatus.PENDING) {
    return { ok: false, error: "This order already completed or can’t be paid again." };
  }
  if (order.stripeCheckoutSessionId) {
    return { ok: false, error: "Invalid order state." };
  }

  const locationId = process.env.SQUARE_LOCATION_ID?.trim();
  if (!locationId) {
    return { ok: false, error: "Square location is not configured." };
  }

  let paymentId: string | undefined;

  try {
    const client = getSquareClient();
    const body: Square.CreatePaymentResponse = await client.payments.create({
      sourceId,
      idempotencyKey: order.id,
      amountMoney: {
        currency: "USD",
        amount: BigInt(order.totalCents),
      },
      autocomplete: true,
      locationId,
      referenceId: order.id.slice(0, 40),
      note: `Web order ${order.id.slice(0, 10)}`,
    });

    const errs = body.errors ?? [];
    if (errs.length) {
      console.error("Square createPayment errors:", errs);
      return { ok: false, error: errs[0]?.detail || errs[0]?.code || "Payment was declined." };
    }

    const payment = body.payment;
    const st = payment?.status ?? "";
    if (st !== "COMPLETED" && st !== "APPROVED") {
      return { ok: false, error: st === "FAILED" ? "Card payment failed." : "Payment did not complete. Try again." };
    }

    paymentId = payment?.id ?? undefined;
    if (!paymentId) {
      return { ok: false, error: "Square did not return a payment id." };
    }

    const paidAmt = payment?.amountMoney?.amount;
    if (paidAmt != null && Number(paidAmt) !== order.totalCents) {
      console.warn("Square amount mismatch:", paidAmt.toString(), "expected", order.totalCents);
    }
  } catch (e) {
    if (e instanceof SquareError) {
      console.error(e);
      const first = e.errors[0];
      return { ok: false, error: first?.detail || first?.code || "Payment request failed." };
    }
    console.error(e);
    return { ok: false, error: "Payment request failed." };
  }

  const fulfilled = await fulfillPaidOrder(order.id, { squarePaymentId: paymentId });
  if (!fulfilled) {
    return {
      ok: false,
      error:
        "Payment may have succeeded but fulfillment failed. Contact the store with your confirmation — don't retry immediately.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/cart");
  revalidatePath("/store");

  return { ok: true, redirectUrl: "/cart/success?square=1" };
}
