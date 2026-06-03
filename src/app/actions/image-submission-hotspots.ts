"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  listHotspotsForSubmissionAdmin,
  normalizePinPosition,
  type ImageSubmissionHotspotRow,
} from "@/lib/image-submission-hotspots";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type PinDraftInput = {
  productId: string;
  variantId: string | null;
  xPercent: number;
  yPercent: number;
};

export type ProductPickerOption = {
  id: string;
  name: string;
  slug: string;
  variants: { id: string; label: string; active: boolean }[];
};

export async function listImageSubmissionHotspotsForAdmin(
  submissionId: string,
): Promise<ImageSubmissionHotspotRow[] | { error: string }> {
  try {
    await requireAdmin();
    return listHotspotsForSubmissionAdmin(submissionId);
  } catch {
    return { error: "Unauthorized." };
  }
}

export async function searchProductsForHotspotPicker(query: string): Promise<ProductPickerOption[] | { error: string }> {
  try {
    await requireAdmin();
    const q = query.trim();
    const rows = await prisma.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              {
                variants: {
                  some: {
                    OR: [
                      { label: { contains: q, mode: "insensitive" } },
                      { sku: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {},
      orderBy: [{ name: "asc" }],
      take: 40,
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        variants: {
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          select: { id: true, label: true, active: true, sku: true },
        },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: v.sku?.trim() ? `${v.label} (${v.sku})` : v.label,
        active: v.active,
      })),
    }));
  } catch (e) {
    console.error("searchProductsForHotspotPicker", e);
    const message = e instanceof Error ? e.message : "Could not search products.";
    return { error: message === "Unauthorized" ? "Session expired — refresh and log in again." : "Could not search products." };
  }
}

export async function saveImageSubmissionHotspots(
  submissionId: string,
  pins: PinDraftInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const sub = await prisma.customerArtSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    });
    if (!sub) return { ok: false, error: "Submission not found." };

    const cleaned = pins.slice(0, 40).map((h, i) => {
      const pos = normalizePinPosition(h);
      return {
        submissionId,
        productId: h.productId,
        variantId: h.variantId?.trim() || null,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        widthPercent: 0,
        heightPercent: 0,
        sortOrder: i,
      };
    });

    for (const h of cleaned) {
      const product = await prisma.product.findUnique({
        where: { id: h.productId },
        select: { id: true, variants: { select: { id: true } } },
      });
      if (!product) return { ok: false, error: "Invalid product on a pin." };
      if (product.variants.length > 0 && !h.variantId) {
        return { ok: false, error: "Each pin on a product with variations must link to a variation." };
      }
      if (h.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: h.variantId, productId: h.productId },
          select: { id: true },
        });
        if (!variant) return { ok: false, error: "Invalid variation on a pin." };
      }
    }

    await prisma.$transaction([
      prisma.imageSubmissionHotspot.deleteMany({ where: { submissionId } }),
      ...(cleaned.length > 0
        ? [prisma.imageSubmissionHotspot.createMany({ data: cleaned })]
        : []),
    ]);

    const slugs = new Set<string>();
    for (const h of cleaned) {
      const p = await prisma.product.findUnique({ where: { id: h.productId }, select: { slug: true } });
      if (p?.slug) slugs.add(p.slug);
    }
    revalidatePath("/settings/image-submission");
    revalidatePath("/gallery");
    revalidatePath("/store");
    for (const slug of slugs) {
      revalidatePath(`/product/${slug}`);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save hotspots." };
  }
}
