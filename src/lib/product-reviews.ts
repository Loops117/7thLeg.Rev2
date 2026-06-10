import type { ProductReviewStatus } from "@/generated/prisma/client";

export const PRODUCT_REVIEW_RATING_MIN = 1;
export const PRODUCT_REVIEW_RATING_MAX = 5;

export const GENERAL_REVIEW_LABEL = "General";

export type ProductReviewPublicRow = {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  approvedAt: string;
  isImported: boolean;
};

export type ProductReviewAdminRow = {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  customerId: string | null;
  customerEmail: string | null;
  authorDisplayName: string;
  authorName: string;
  orderId: string | null;
  rating: number;
  title: string;
  body: string;
  status: ProductReviewStatus;
  isImported: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
};

export type ProductReviewStatusFilter = "all" | "pending" | "approved" | "rejected";

export function clampReviewRating(n: number): number {
  return Math.min(PRODUCT_REVIEW_RATING_MAX, Math.max(PRODUCT_REVIEW_RATING_MIN, Math.floor(n)));
}

export function reviewAuthorName(row: {
  authorDisplayName: string;
  customer?: { displayName: string | null; firstName: string | null; lastName: string | null; email: string } | null;
}): string {
  const custom = row.authorDisplayName.trim();
  if (custom) return custom;
  const c = row.customer;
  if (!c) return "Customer";
  const fromParts = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (c.displayName?.trim()) return c.displayName.trim();
  const emailLocal = c.email.split("@")[0]?.trim();
  return emailLocal || "Customer";
}

export function filterReviewAdminRows(
  rows: ProductReviewAdminRow[],
  opts: { q: string; status: ProductReviewStatusFilter },
): ProductReviewAdminRow[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (opts.status === "pending" && r.status !== "PENDING") return false;
    if (opts.status === "approved" && r.status !== "APPROVED") return false;
    if (opts.status === "rejected" && r.status !== "REJECTED") return false;
    if (!q) return true;
    return (
      r.productName.toLowerCase().includes(q) ||
      r.authorName.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q) ||
      (r.customerEmail?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function starsLabel(rating: number): string {
  const n = clampReviewRating(rating);
  return "★".repeat(n) + "☆".repeat(PRODUCT_REVIEW_RATING_MAX - n);
}
