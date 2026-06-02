import { prisma } from "@/lib/prisma";

/**
 * Loads event payload for admin edit UI. Intended for Server Components behind the authenticated
 * settings layout (no auth gate here — `auth()` inside "use server" modules can throw during RSC streaming).
 */
export async function fetchEventEditPayload(id: string) {
  const e = await prisma.event.findUnique({
    where: { id },
    include: {
      typeLinks: { select: { typeId: true } },
      productLinks: { select: { productId: true } },
      couponPickProducts: { select: { productId: true } },
    },
  });
  if (!e) return null;
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    details: e.details,
    startAt: e.startAt.toISOString().slice(0, 16),
    endAt: e.endAt.toISOString().slice(0, 16),
    signupButtonLabel: e.signupButtonLabel,
    couponCode: e.couponCode.trim(),
    couponPickerMeansIncluded: e.couponPickerMeansIncluded,
    pointsPerDollarOverride: e.pointsPerDollarOverride,
    saleDiscountMode: e.saleDiscountMode,
    saleDiscountPercent: e.saleDiscountPercent,
    saleDiscountCents: e.saleDiscountCents,
    typeIds: e.typeLinks.map((t) => t.typeId),
    productIds: e.productLinks.map((p) => p.productId),
    couponPickProductIds: e.couponPickProducts.map((r) => r.productId),
    includesLabelMaker: e.includesLabelMaker,
    includesFreeShipping: e.includesFreeShipping,
    giveawayPrimaryCount: e.giveawayPrimaryCount,
    giveawayBackupCount: e.giveawayBackupCount,
    giveawaySendEmailOnDraw: e.giveawaySendEmailOnDraw,
    giveawayEmailSubject: e.giveawayEmailSubject,
    giveawayEmailBody: e.giveawayEmailBody,
  };
}
