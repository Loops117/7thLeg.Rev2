"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  clampReviewRating,
  GENERAL_REVIEW_LABEL,
  reviewAuthorName,
  type ProductReviewAdminRow,
} from "@/lib/product-reviews";
import {
  DEFAULT_REVIEW_REQUEST_BODY,
  DEFAULT_REVIEW_REQUEST_SUBJECT,
} from "@/lib/review-request-email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

const adminInclude = {
  product: { select: { name: true, slug: true } },
  customer: {
    select: { email: true, displayName: true, firstName: true, lastName: true },
  },
} as const;

function toAdminRow(r: {
  id: string;
  productId: string | null;
  customerId: string | null;
  authorDisplayName: string;
  orderId: string | null;
  rating: number;
  title: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isImported: boolean;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  product: { name: string; slug: string } | null;
  customer: {
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}): ProductReviewAdminRow {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? GENERAL_REVIEW_LABEL,
    productSlug: r.product?.slug ?? "",
    customerId: r.customerId,
    customerEmail: r.customer?.email ?? null,
    authorDisplayName: r.authorDisplayName,
    authorName: reviewAuthorName(r),
    orderId: r.orderId,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    isImported: r.isImported,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export type ProductReviewsSettingsState = {
  productReviewsEnabled: boolean;
  reviewRequestEmailEnabled: boolean;
  reviewRequestEmailSubject: string;
  reviewRequestEmailBody: string;
};

export async function getProductReviewsSettings(): Promise<ProductReviewsSettingsState> {
  await requireAdmin();
  const site = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  return {
    productReviewsEnabled: site?.productReviewsEnabled ?? true,
    reviewRequestEmailEnabled: site?.reviewRequestEmailEnabled ?? false,
    reviewRequestEmailSubject: site?.reviewRequestEmailSubject ?? DEFAULT_REVIEW_REQUEST_SUBJECT,
    reviewRequestEmailBody: site?.reviewRequestEmailBody ?? DEFAULT_REVIEW_REQUEST_BODY,
  };
}

export async function saveProductReviewsSettings(
  input: ProductReviewsSettingsState,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  await prisma.siteConfig.update({
    where: { id: 1 },
    data: {
      productReviewsEnabled: !!input.productReviewsEnabled,
      reviewRequestEmailEnabled: !!input.reviewRequestEmailEnabled,
      reviewRequestEmailSubject: input.reviewRequestEmailSubject.trim().slice(0, 300) || DEFAULT_REVIEW_REQUEST_SUBJECT,
      reviewRequestEmailBody: input.reviewRequestEmailBody.trim().slice(0, 8000) || DEFAULT_REVIEW_REQUEST_BODY,
    },
  });
  revalidatePath("/settings/reviews");
  return { ok: true };
}

export async function listProductReviewsForAdmin(): Promise<ProductReviewAdminRow[]> {
  await requireAdmin();
  const rows = await prisma.productReview.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 500,
    include: adminInclude,
  });
  return rows.map(toAdminRow);
}

export async function approveProductReview(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const row = await prisma.productReview.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!row) return { ok: false, error: "Review not found." };
  await prisma.productReview.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), rejectedAt: null },
  });
  revalidateReviewPaths(row.product?.slug ?? null);
  return { ok: true };
}

export async function rejectProductReview(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const row = await prisma.productReview.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!row) return { ok: false, error: "Review not found." };
  await prisma.productReview.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date(), approvedAt: null },
  });
  revalidateReviewPaths(row.product?.slug ?? null);
  return { ok: true };
}

export async function deleteProductReview(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const row = await prisma.productReview.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!row) return { ok: false, error: "Review not found." };
  await prisma.productReview.delete({ where: { id } });
  revalidateReviewPaths(row.product?.slug ?? null);
  return { ok: true };
}

export async function importProductReview(input: {
  productId?: string | null;
  authorDisplayName: string;
  rating: number;
  title: string;
  body: string;
  approveNow: boolean;
  createdAtIso?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const productId = input.productId?.trim() || null;
  let productSlug: string | null = null;
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true },
    });
    if (!product) return { ok: false, error: "Product not found." };
    productSlug = product.slug;
  }

  const authorDisplayName = input.authorDisplayName.trim().slice(0, 80);
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 4000);
  if (!authorDisplayName) return { ok: false, error: "Author name is required for imported reviews." };
  if (!body) return { ok: false, error: "Review text is required." };

  let createdAt: Date | undefined;
  if (input.createdAtIso?.trim()) {
    const d = new Date(input.createdAtIso);
    if (!Number.isNaN(d.getTime())) createdAt = d;
  }

  await prisma.productReview.create({
    data: {
      productId,
      authorDisplayName,
      rating: clampReviewRating(input.rating),
      title,
      body,
      status: input.approveNow ? "APPROVED" : "PENDING",
      isImported: true,
      approvedAt: input.approveNow ? createdAt ?? new Date() : null,
      ...(createdAt ? { createdAt } : {}),
    },
  });

  revalidateReviewPaths(productSlug);
  return { ok: true };
}

export async function searchProductsForReviewImport(
  q: string,
): Promise<{ id: string; name: string; slug: string }[]> {
  await requireAdmin();
  const term = q.trim();
  if (term.length < 1) return [];
  return prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 12,
    select: { id: true, name: true, slug: true },
  });
}

function revalidateReviewPaths(productSlug: string | null) {
  if (productSlug) revalidatePath(`/product/${productSlug}`);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/settings/reviews");
}
