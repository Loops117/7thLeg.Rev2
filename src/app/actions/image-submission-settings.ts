"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { deleteUploadByUrl, putUploadObject } from "@/lib/app-uploads";
import {
  IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS,
  normalizeImageSubmissionPinAppearance,
  type ImageSubmissionPinAppearance,
} from "@/lib/image-submission-pin-appearance";
import { getUploadImageSettingsFromDb, normalizeWatermarkBuffer } from "@/lib/image-upload-normalize";
import { prisma } from "@/lib/prisma";

const PIN_IMG_MAX = 512 * 1024;
const PIN_IMG_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

const pinSelect = {
  imageSubmissionApprovalPoints: true,
  imageSubmissionPinSizePx: true,
  imageSubmissionPinFillColor: true,
  imageSubmissionPinBorderWidthPx: true,
  imageSubmissionPinBorderColor: true,
  imageSubmissionPinCustomImageUrl: true,
  imageSubmissionPinHighlightColor: true,
} as const;

export type ImageSubmissionSettingsState = {
  approvalPoints: number;
  pinAppearance: ImageSubmissionPinAppearance;
};

function revalidateImageSubmissionPaths() {
  revalidatePath("/settings/image-submission");
  revalidatePath("/gallery");
  revalidatePath("/");
}

function pinAppearancePrismaDefaults() {
  const d = IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS;
  return {
    imageSubmissionPinSizePx: d.sizePx,
    imageSubmissionPinFillColor: d.fillColor,
    imageSubmissionPinBorderWidthPx: d.borderWidthPx,
    imageSubmissionPinBorderColor: d.borderColor,
    imageSubmissionPinCustomImageUrl: d.customImageUrl,
    imageSubmissionPinHighlightColor: d.highlightColor,
  };
}

export async function getImageSubmissionSettingsForAdmin(): Promise<ImageSubmissionSettingsState> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: pinSelect,
    });
    return {
      approvalPoints: Math.max(0, Math.min(10_000, Math.floor(row?.imageSubmissionApprovalPoints ?? 0))),
      pinAppearance: normalizeImageSubmissionPinAppearance(row),
    };
  } catch {
    return {
      approvalPoints: 0,
      pinAppearance: { ...IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS },
    };
  }
}

export async function updateImageSubmissionApprovalPoints(
  approvalPoints: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const pts = Math.max(0, Math.min(10_000, Math.floor(Number(approvalPoints) || 0)));
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "Inverts Oasis",
        imageSubmissionApprovalPoints: pts,
        ...pinAppearancePrismaDefaults(),
      },
      update: { imageSubmissionApprovalPoints: pts },
    });
    revalidateImageSubmissionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
}

export async function updateImageSubmissionPinAppearance(
  appearance: ImageSubmissionPinAppearance,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const normalized = normalizeImageSubmissionPinAppearance({
      imageSubmissionPinSizePx: appearance.sizePx,
      imageSubmissionPinFillColor: appearance.fillColor,
      imageSubmissionPinBorderWidthPx: appearance.borderWidthPx,
      imageSubmissionPinBorderColor: appearance.borderColor,
      imageSubmissionPinCustomImageUrl: appearance.customImageUrl,
      imageSubmissionPinHighlightColor: appearance.highlightColor,
    });
    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 }, select: { id: true } });
    if (existing) {
      await prisma.siteConfig.update({
        where: { id: 1 },
        data: {
          imageSubmissionPinSizePx: normalized.sizePx,
          imageSubmissionPinFillColor: normalized.fillColor,
          imageSubmissionPinBorderWidthPx: normalized.borderWidthPx,
          imageSubmissionPinBorderColor: normalized.borderColor,
          imageSubmissionPinCustomImageUrl: normalized.customImageUrl,
          imageSubmissionPinHighlightColor: normalized.highlightColor,
        },
      });
    } else {
      await prisma.siteConfig.create({
        data: {
          id: 1,
          companyName: "Inverts Oasis",
          imageSubmissionApprovalPoints: 0,
          imageSubmissionPinSizePx: normalized.sizePx,
          imageSubmissionPinFillColor: normalized.fillColor,
          imageSubmissionPinBorderWidthPx: normalized.borderWidthPx,
          imageSubmissionPinBorderColor: normalized.borderColor,
          imageSubmissionPinCustomImageUrl: normalized.customImageUrl,
          imageSubmissionPinHighlightColor: normalized.highlightColor,
        },
      });
    }
    revalidateImageSubmissionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save pin style." };
  }
}

export type UploadPinCustomImageResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadImageSubmissionPinCustomImage(
  formData: FormData,
): Promise<UploadPinCustomImageResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > PIN_IMG_MAX) {
      return { ok: false, error: "Pin image must be 512KB or smaller." };
    }
    if (!PIN_IMG_TYPES.has(file.type)) {
      return { ok: false, error: "Use PNG, JPEG, WebP, GIF, or AVIF." };
    }

    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: pinSelect,
    });
    const prevUrl = row?.imageSubmissionPinCustomImageUrl?.trim() ?? "";

    const raw = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeWatermarkBuffer(raw, file.type, settings);
    const key = `uploads/image-submission/pin-marker/${randomUUID()}.${norm.ext}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    const current = normalizeImageSubmissionPinAppearance(row);
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "Inverts Oasis",
        imageSubmissionPinSizePx: current.sizePx,
        imageSubmissionPinFillColor: current.fillColor,
        imageSubmissionPinBorderWidthPx: current.borderWidthPx,
        imageSubmissionPinBorderColor: current.borderColor,
        imageSubmissionPinCustomImageUrl: url,
        imageSubmissionPinHighlightColor: current.highlightColor,
      },
      update: { imageSubmissionPinCustomImageUrl: url },
    });

    if (prevUrl && prevUrl !== url) {
      await deleteUploadByUrl(prevUrl).catch(() => undefined);
    }

    revalidateImageSubmissionPaths();
    return { ok: true, url };
  } catch (e) {
    console.error("uploadImageSubmissionPinCustomImage", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function clearImageSubmissionPinCustomImage(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: pinSelect,
    });
    const prevUrl = row?.imageSubmissionPinCustomImageUrl?.trim() ?? "";
    const current = normalizeImageSubmissionPinAppearance(row);
    await prisma.siteConfig.update({
      where: { id: 1 },
      data: { imageSubmissionPinCustomImageUrl: "" },
    });
    if (prevUrl) {
      await deleteUploadByUrl(prevUrl).catch(() => undefined);
    }
    revalidateImageSubmissionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove custom pin." };
  }
}
