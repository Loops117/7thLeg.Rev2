"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  clampReviewRating,
  GENERAL_REVIEW_LABEL,
  reviewAuthorName,
  type ProductReviewPublicRow,
} from "@/lib/product-reviews";

async function requireCustomerId(): Promise<string | { error: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "customer") {
    return { error: "Sign in to leave a review." };
  }
  return session.user.id;
}

function toPublicRow(r: {
  id: string;
  productId: string | null;
  rating: number;
  title: string;
  body: string;
  authorDisplayName: string;
  approvedAt: Date | null;
  isImported: boolean;
  product: { name: string; slug: string; active: boolean } | null;
  customer: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}): ProductReviewPublicRow {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? "",
    productSlug: r.product?.slug ?? "",
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: reviewAuthorName(r),
    approvedAt: r.approvedAt?.toISOString() ?? "",
    isImported: r.isImported,
  };
}

const reviewInclude = {
  product: { select: { name: true, slug: true, active: true } },
  customer: {
    select: { displayName: true, firstName: true, lastName: true, email: true },
  },
} as const;

export async function listApprovedReviewsForProduct(productId: string): Promise<ProductReviewPublicRow[]> {
  const rows = await prisma.productReview.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: reviewInclude,
  });
  return rows.map(toPublicRow);
}

export async function listApprovedReviewsForPane(limit: number): Promise<ProductReviewPublicRow[]> {
  const n = Math.min(48, Math.max(1, Math.floor(limit)));
  const rows = await prisma.productReview.findMany({
    where: {
      status: "APPROVED",
      OR: [{ productId: null }, { product: { active: true } }],
    },
    orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
    take: n,
    include: reviewInclude,
  });
  return rows.map(toPublicRow);
}

export async function getCustomerReviewForProduct(
  productId: string,
): Promise<{ rating: number; title: string; body: string; status: string } | null> {
  const customerId = await requireCustomerId();
  if (typeof customerId !== "string") return null;
  const row = await prisma.productReview.findUnique({
    where: { productId_customerId: { productId, customerId } },
    select: { rating: true, title: true, body: true, status: true },
  });
  return row;
}

export async function submitProductReview(input: {
  productId: string;
  rating: number;
  title: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const customerId = await requireCustomerId();
  if (typeof customerId !== "string") return { ok: false, error: customerId.error };

  const site = await prisma.siteConfig.findUnique({ where: { id: 1 }, select: { productReviewsEnabled: true } });
  if (site && !site.productReviewsEnabled) {
    return { ok: false, error: "Reviews are not available right now." };
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, active: true, slug: true },
  });
  if (!product?.active) return { ok: false, error: "Product not found." };

  const rating = clampReviewRating(input.rating);
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 4000);
  if (!body) return { ok: false, error: "Please write a review." };

  const existing = await prisma.productReview.findUnique({
    where: { productId_customerId: { productId: product.id, customerId } },
  });
  if (existing && existing.status === "APPROVED") {
    return { ok: false, error: "Your review is already published." };
  }

  if (existing) {
    await prisma.productReview.update({
      where: { id: existing.id },
      data: {
        rating,
        title,
        body,
        status: "PENDING",
        rejectedAt: null,
        approvedAt: null,
        isImported: false,
      },
    });
  } else {
    await prisma.productReview.create({
      data: {
        productId: product.id,
        customerId,
        rating,
        title,
        body,
        status: "PENDING",
      },
    });
  }

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/settings/reviews");
  return { ok: true };
}
