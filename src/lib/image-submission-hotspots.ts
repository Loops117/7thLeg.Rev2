import { customerArtDisplayName } from "@/lib/customer-art";
import { prisma } from "@/lib/prisma";

export type ImageSubmissionHotspotRow = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string | null;
  variantLabel: string | null;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  sortOrder: number;
};

export type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";

import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";

export type CustomerSuppliedImageRow = {
  submissionId: string;
  imageUrl: string;
  artistName: string;
};

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Pin center on the image (0–100%). Legacy rows may have width/height — use center of box. */
export function normalizePinPosition(h: {
  xPercent: number;
  yPercent: number;
  widthPercent?: number;
  heightPercent?: number;
}) {
  const w = h.widthPercent ?? 0;
  const ht = h.heightPercent ?? 0;
  if (w > 0 || ht > 0) {
    return {
      xPercent: clampPercent(h.xPercent + w / 2),
      yPercent: clampPercent(h.yPercent + ht / 2),
    };
  }
  return {
    xPercent: clampPercent(h.xPercent),
    yPercent: clampPercent(h.yPercent),
  };
}

export async function listHotspotsForSubmissionAdmin(submissionId: string): Promise<ImageSubmissionHotspotRow[]> {
  const rows = await prisma.imageSubmissionHotspot.findMany({
    where: { submissionId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      product: { select: { name: true, slug: true } },
      variant: { select: { label: true } },
    },
  });
  return rows.map((r) => {
    const pos = normalizePinPosition(r);
    return {
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      productSlug: r.product.slug,
      variantId: r.variantId,
      variantLabel: r.variant?.label ?? null,
      xPercent: pos.xPercent,
      yPercent: pos.yPercent,
      widthPercent: 0,
      heightPercent: 0,
      sortOrder: r.sortOrder,
    };
  });
}

export async function listHotspotsBySubmissionIds(
  submissionIds: string[],
): Promise<Record<string, StorefrontImagePin[]>> {
  if (submissionIds.length === 0) return {};
  const rows = await prisma.imageSubmissionHotspot.findMany({
    where: { submissionId: { in: submissionIds } },
    orderBy: [{ submissionId: "asc" }, { sortOrder: "asc" }],
    include: {
      product: { select: { slug: true, name: true, basePriceCents: true } },
      variant: { select: { label: true, priceDeltaCents: true } },
    },
  });
  const out: Record<string, StorefrontImagePin[]> = {};
  for (const r of rows) {
    const pos = normalizePinPosition(r);
    const priceCents = r.product.basePriceCents + (r.variant?.priceDeltaCents ?? 0);
    const item: StorefrontImagePin = {
      id: r.id,
      productSlug: r.product.slug,
      productName: r.product.name,
      variantId: r.variantId,
      variantLabel: r.variant?.label ?? null,
      priceCents,
      xPercent: pos.xPercent,
      yPercent: pos.yPercent,
    };
    if (!out[r.submissionId]) out[r.submissionId] = [];
    out[r.submissionId].push(item);
  }
  return out;
}

export async function listCustomerSuppliedImagesForProduct(productId: string): Promise<CustomerSuppliedImageRow[]> {
  const rows = await prisma.customerArtSubmission.findMany({
    where: {
      approved: true,
      customerRemovedAt: null,
      hotspots: { some: { productId } },
    },
    orderBy: { createdAt: "desc" },
    take: 24,
    include: {
      customer: {
        select: { email: true, firstName: true, lastName: true, displayName: true },
      },
    },
  });
  return rows.map((r) => ({
    submissionId: r.id,
    imageUrl: r.imageUrl,
    artistName: customerArtDisplayName(r.customer),
  }));
}
