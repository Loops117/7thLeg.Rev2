"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyCustomerPointsDelta } from "@/lib/loyalty-points";
import { putUploadObject } from "@/lib/app-uploads";
import { getUploadImageSettingsFromDb, normalizeWatermarkBuffer } from "@/lib/image-upload-normalize";
import { normalizeArtGroupKey } from "@/lib/pane-config";
import {
  customerArtDisplayName,
  type CustomerArtSubmissionRow,
  type CustomerMyArtUploadRow,
} from "@/lib/customer-art";

const IMG_MAX = 8 * 1024 * 1024;
const IMG_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);
const MAX_BATCH_FILES = 20;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.id) {
    throw new Error("Unauthorized");
  }
}

async function requireCustomer() {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function mapAdminRow(
  r: {
    id: string;
    artGroup: string;
    imageUrl: string;
    approved: boolean;
    customerRemovedAt: Date | null;
    createdAt: Date;
    customerId: string;
    customer: { id: string; email: string; firstName: string | null; lastName: string | null; displayName: string | null };
  },
): CustomerArtSubmissionRow {
  return {
    id: r.id,
    artGroup: r.artGroup,
    imageUrl: r.imageUrl,
    approved: r.approved,
    customerRemovedAt: r.customerRemovedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    customerId: r.customerId,
    customerName: customerArtDisplayName(r.customer),
    customerEmail: r.customer.email,
  };
}

export async function listCustomerArtSubmissionsForAdmin(): Promise<CustomerArtSubmissionRow[]> {
  await requireAdmin();
  const rows = await prisma.customerArtSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: { id: true, email: true, firstName: true, lastName: true, displayName: true },
      },
    },
  });
  return rows.map(mapAdminRow);
}

export async function listDistinctCustomerArtGroups(): Promise<string[]> {
  await requireAdmin();
  const rows = await prisma.customerArtSubmission.findMany({
    distinct: ["artGroup"],
    select: { artGroup: true },
    orderBy: { artGroup: "asc" },
  });
  return rows.map((r) => r.artGroup);
}

export async function countVisibleCustomerArtUploads(customerId: string): Promise<number> {
  return prisma.customerArtSubmission.count({
    where: { customerId, customerRemovedAt: null },
  });
}

export async function listMyCustomerArtUploads(): Promise<CustomerMyArtUploadRow[]> {
  const customerId = await requireCustomer();
  const rows = await prisma.customerArtSubmission.findMany({
    where: { customerId, customerRemovedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      artGroup: true,
      imageUrl: true,
      approved: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    artGroup: r.artGroup,
    imageUrl: r.imageUrl,
    approved: r.approved,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type SetCustomerArtApprovedResult =
  | { ok: true; pointsAwarded?: number }
  | { ok: false; error: string };

export async function setCustomerArtApproved(
  submissionId: string,
  approved: boolean,
): Promise<SetCustomerArtApprovedResult> {
  try {
    await requireAdmin();
    const row = await prisma.customerArtSubmission.findUnique({
      where: { id: submissionId },
      select: {
        customerRemovedAt: true,
        approved: true,
        customerId: true,
        approvalPointsAwardedAt: true,
      },
    });
    if (!row) return { ok: false, error: "Submission not found." };
    if (approved && row.customerRemovedAt) {
      return {
        ok: false,
        error: "Customer removed this upload. It cannot be approved for the gallery.",
      };
    }

    const wasApproved = row.approved;
    let pointsAwarded: number | undefined;

    await prisma.$transaction(async (tx) => {
      await tx.customerArtSubmission.update({
        where: { id: submissionId },
        data: { approved },
      });

      if (approved && !wasApproved && !row.approvalPointsAwardedAt) {
        const site = await tx.siteConfig.findUnique({
          where: { id: 1 },
          select: { imageSubmissionApprovalPoints: true },
        });
        const pts = Math.max(0, Math.floor(site?.imageSubmissionApprovalPoints ?? 0));
        if (pts > 0) {
          await applyCustomerPointsDelta(
            {
              customerId: row.customerId,
              delta: pts,
              reason: "Image approved for gallery",
              artSubmissionId: submissionId,
            },
            tx,
          );
          await tx.customerArtSubmission.update({
            where: { id: submissionId },
            data: { approvalPointsAwardedAt: new Date() },
          });
          pointsAwarded = pts;
        }
      }
    });

    revalidatePath("/account/points");
    revalidatePath("/account/profile");
    revalidatePath("/settings/image-submission");
    revalidatePath("/settings/customer-art");
    revalidatePath("/gallery");
    revalidatePath("/");
    revalidatePath("/featured");
    revalidatePath("/about");
    return { ok: true, pointsAwarded };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update." };
  }
}

export type HideCustomerArtUploadResult = { ok: true } | { ok: false; error: string };

export async function hideCustomerArtUpload(submissionId: string): Promise<HideCustomerArtUploadResult> {
  try {
    const customerId = await requireCustomer();
    const row = await prisma.customerArtSubmission.findFirst({
      where: { id: submissionId, customerId, customerRemovedAt: null },
      select: { id: true },
    });
    if (!row) return { ok: false, error: "Upload not found." };

    await prisma.customerArtSubmission.update({
      where: { id: submissionId },
      data: {
        customerRemovedAt: new Date(),
        approved: false,
      },
    });

    revalidatePath("/account/uploads");
    revalidatePath("/");
    revalidatePath("/featured");
    revalidatePath("/about");
    revalidatePath("/gallery");
    revalidatePath("/settings/image-submission");
    revalidatePath("/settings/customer-art");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove upload." };
  }
}

export type DeleteCustomerArtSubmissionResult = { ok: true } | { ok: false; error: string };

export async function deleteCustomerArtSubmission(submissionId: string): Promise<DeleteCustomerArtSubmissionResult> {
  try {
    await requireAdmin();
    await prisma.customerArtSubmission.delete({ where: { id: submissionId } });
    revalidatePath("/settings/image-submission");
    revalidatePath("/settings/customer-art");
    revalidatePath("/gallery");
    revalidatePath("/");
    revalidatePath("/featured");
    revalidatePath("/about");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete." };
  }
}

export type SubmitCustomerArtResult = { ok: true } | { ok: false; error: string };

export type SubmitCustomerArtBatchResult =
  | { ok: true; uploadedCount: number; errors: string[] }
  | { ok: false; error: string };

function readUploadFiles(formData: FormData): File[] {
  const fromAll = formData.getAll("file").filter((entry): entry is File => entry instanceof File);
  if (fromAll.length > 0) return fromAll;
  const single = formData.get("file");
  return single instanceof File ? [single] : [];
}

async function uploadOneCustomerArtFile(
  customerId: string,
  artGroup: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.size > IMG_MAX) {
    return { ok: false, error: "Image must be 8MB or smaller." };
  }
  if (!IMG_TYPES.has(file.type)) {
    return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const settings = await getUploadImageSettingsFromDb();
  const norm = await normalizeWatermarkBuffer(buf, file.type, settings);
  const key = `uploads/customer-art/${customerId}/${randomUUID()}.${norm.ext}`;
  const url = await putUploadObject(key, norm.buffer, norm.contentType);

  await prisma.customerArtSubmission.create({
    data: {
      customerId,
      artGroup,
      imageUrl: url,
    },
  });

  return { ok: true };
}

function revalidateCustomerArtPaths() {
  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/about");
  revalidatePath("/account/uploads");
  revalidatePath("/settings/image-submission");
  revalidatePath("/settings/customer-art");
}

export async function submitCustomerArtBatch(formData: FormData): Promise<SubmitCustomerArtBatchResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "customer" || !session.user.id) {
      return { ok: false, error: "Log in to submit your artwork." };
    }

    const artGroupRaw = formData.get("artGroup");
    const artGroup = typeof artGroupRaw === "string" ? normalizeArtGroupKey(artGroupRaw) : null;
    if (!artGroup) {
      return { ok: false, error: "This upload section is not configured." };
    }

    const files = readUploadFiles(formData);
    if (files.length === 0) {
      return { ok: false, error: "Choose at least one image file." };
    }
    if (files.length > MAX_BATCH_FILES) {
      return { ok: false, error: `You can upload up to ${MAX_BATCH_FILES} images at once.` };
    }

    const errors: string[] = [];
    let uploadedCount = 0;

    for (const file of files) {
      const result = await uploadOneCustomerArtFile(session.user.id, artGroup, file);
      if (result.ok) {
        uploadedCount += 1;
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    }

    if (uploadedCount === 0) {
      return { ok: false, error: errors[0] ?? "Upload failed." };
    }

    revalidateCustomerArtPaths();
    return { ok: true, uploadedCount, errors };
  } catch (e) {
    console.error("submitCustomerArtBatch", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function submitCustomerArt(formData: FormData): Promise<SubmitCustomerArtResult> {
  const result = await submitCustomerArtBatch(formData);
  if (!result.ok) return result;
  return { ok: true };
}
