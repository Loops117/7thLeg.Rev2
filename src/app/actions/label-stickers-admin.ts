"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { putUploadObject } from "@/lib/app-uploads";
import { prisma } from "@/lib/prisma";
import { getUploadImageSettingsFromDb, normalizeWatermarkBuffer } from "@/lib/image-upload-normalize";
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type LabelStickerAssetRow = {
  id: string;
  name: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

function rowToDto(r: {
  id: string;
  name: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
}): LabelStickerAssetRow {
  return {
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl,
    sortOrder: r.sortOrder,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listLabelStickerAssetsAdmin(): Promise<LabelStickerAssetRow[]> {
  await requireAdmin();
  const rows = await prisma.labelStickerAsset.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(rowToDto);
}

export async function listActiveLabelStickerAssets(): Promise<LabelStickerAssetRow[]> {
  const rows = await prisma.labelStickerAsset.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(rowToDto);
}

export async function uploadLabelStickerAsset(
  formData: FormData,
): Promise<{ ok: true; row: LabelStickerAssetRow } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    const name = String(formData.get("name") ?? "").trim() || "Sticker";
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, error: "Image must be 8MB or smaller." };
    }
    const allowed = new Set(["image/png", "image/webp", "image/jpeg", "image/gif", "image/avif"]);
    if (!allowed.has(file.type)) {
      return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeWatermarkBuffer(buf, file.type, settings);
    const key = `uploads/label-stickers/${randomUUID()}.${norm.ext}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    const maxOrder = await prisma.labelStickerAsset.aggregate({ _max: { sortOrder: true } });
    const row = await prisma.labelStickerAsset.create({
      data: {
        name,
        imageUrl: url,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        active: true,
      },
    });
    revalidatePath("/settings/labels");
    revalidatePath("/labels", "layout");
    return { ok: true, row: rowToDto(row) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function updateLabelStickerAsset(
  id: string,
  patch: { name?: string; active?: boolean; sortOrder?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await prisma.labelStickerAsset.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim() || "Sticker" } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      },
    });
    revalidatePath("/settings/labels");
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

export async function deleteLabelStickerAsset(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await prisma.labelStickerAsset.delete({ where: { id } });
    revalidatePath("/settings/labels");
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}
