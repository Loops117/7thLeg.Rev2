import { prisma } from "@/lib/prisma";
import { getSquarePublicApplicationId, isSquareEnvConfigured, isSquareSandbox } from "@/lib/square-server";

export type CartPaymentAvailability = {
  stripeEnabled: boolean;
  squareEnabled: boolean;
  squareSandbox: boolean;
  squareApplicationId: string | null;
  squareLocationId: string | null;
};

export async function getCartPaymentAvailability(): Promise<CartPaymentAvailability> {
  const row = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: {
      paymentStripeEnabled: true,
      paymentSquareEnabled: true,
    },
  });

  const stripeToggle = row?.paymentStripeEnabled ?? true;
  const squareToggle = !!row?.paymentSquareEnabled;

  return {
    stripeEnabled: stripeToggle && !!process.env.STRIPE_SECRET_KEY?.trim(),
    squareEnabled: squareToggle && isSquareEnvConfigured(),
    squareSandbox: isSquareSandbox(),
    squareApplicationId: getSquarePublicApplicationId() || null,
    squareLocationId: process.env.SQUARE_LOCATION_ID?.trim() || null,
  };
}
