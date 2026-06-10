import { prisma } from "@/lib/prisma";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { sendReviewRequestEmail } from "@/lib/review-request-email";
import { DEFAULT_COMPANY_NAME } from "@/lib/site-config-types";

/** After fulfillment: optionally email the customer with a link to leave a review. */
export async function sendOrderReviewRequestIfEnabled(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: { email: true, firstName: true, displayName: true },
      },
      lineItems: {
        include: { product: { select: { slug: true, active: true } } },
      },
    },
  });
  if (!order?.customer?.email?.trim()) return;
  if (order.reviewRequestEmailSentAt) return;

  const site = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: {
      reviewRequestEmailEnabled: true,
      reviewRequestEmailSubject: true,
      reviewRequestEmailBody: true,
      companyName: true,
    },
  });
  if (!site?.reviewRequestEmailEnabled) return;

  const activeProducts = order.lineItems
    .map((li) => li.product)
    .filter((p) => p?.active && p.slug);
  const origin = getPublicAppOrigin();
  const reviewUrl =
    activeProducts.length === 1
      ? `${origin}/product/${activeProducts[0]!.slug}?review=1`
      : `${origin}/account/orders`;

  const customerName =
    order.customer.firstName?.trim() ||
    order.customer.displayName?.trim() ||
    order.customer.email.split("@")[0] ||
    "there";

  const result = await sendReviewRequestEmail({
    to: order.customer.email,
    subject: site.reviewRequestEmailSubject,
    body: site.reviewRequestEmailBody,
    customerName,
    reviewUrl,
    companyName: site.companyName?.trim() || DEFAULT_COMPANY_NAME,
    orderId: order.id,
  });

  if (result.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: { reviewRequestEmailSentAt: new Date() },
    });
  } else {
    console.warn("Review request email failed:", orderId, result.error);
  }
}
