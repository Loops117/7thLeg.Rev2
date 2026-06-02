"use server";

import { randomUUID } from "node:crypto";
import { auth as readAuthSession } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  QrFrameShape,
  QrModuleShape,
  QrRedirectTarget,
  QrStyle,
} from "@/generated/prisma/enums";
import type {
  QrFrameShape as QrFrameShapeType,
  QrModuleShape as QrModuleShapeType,
  QrRedirectTarget as QrRedirectTargetType,
  QrStyle as QrStyleType,
} from "@/generated/prisma/enums";
import { putUploadObject } from "@/lib/app-uploads";
import { getUploadImageSettingsFromDb, normalizeImageBufferForUpload } from "@/lib/image-upload-normalize";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const CENTER_IMG_MAX = 2 * 1024 * 1024;
const CENTER_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/gif", "image/avif"]);

async function requireAdmin() {
  const session = await readAuthSession().catch(() => null);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function safeUploadUrl(v: string, maxLen: number): string {
  const t = v.trim();
  if (!t || (!t.startsWith("/uploads/") && !t.startsWith("https://"))) return "";
  return t.slice(0, maxLen);
}

async function allocatePublicCode(): Promise<string> {
  const rows = await prisma.qrRedirect.findMany({ select: { publicCode: true } });
  let maxN = 0;
  for (const { publicCode } of rows) {
    const m = /^QR(\d+)$/i.exec(publicCode);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `QR${maxN + 1}`;
}

function parseTarget(v: string): QrRedirectTargetType | null {
  const allowed = Object.values(QrRedirectTarget) as string[];
  return allowed.includes(v) ? (v as QrRedirectTargetType) : null;
}

function parseStyle(v: string): QrStyleType | null {
  const allowed = Object.values(QrStyle) as string[];
  return allowed.includes(v) ? (v as QrStyleType) : null;
}

function parseModuleShape(v: string): QrModuleShapeType | null {
  const allowed = Object.values(QrModuleShape) as string[];
  return allowed.includes(v) ? (v as QrModuleShapeType) : null;
}

function parseFrameShape(v: string): QrFrameShapeType | null {
  const allowed = Object.values(QrFrameShape) as string[];
  return allowed.includes(v) ? (v as QrFrameShapeType) : null;
}

export async function createQrRedirectAction(form: {
  name: string;
  target: string;
  customUrl: string;
  style: string;
  moduleShape: string;
  frameShape: string;
  centerUseColor: boolean;
}): Promise<{ ok: true; id: string; publicCode: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const name = form.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const target = parseTarget(form.target);
  if (!target) return { ok: false, error: "Invalid redirect target." };

  const style = parseStyle(form.style) ?? QrStyle.CLASSIC;
  const moduleShape = parseModuleShape(form.moduleShape) ?? QrModuleShape.SQUARE;
  const frameShape = parseFrameShape(form.frameShape) ?? QrFrameShape.SQUARE;
  const centerUseColor = !!form.centerUseColor;
  const customUrl = form.customUrl.trim();

  if (target === QrRedirectTarget.CUSTOM && !customUrl) {
    return { ok: false, error: "Enter a URL or site path when using Custom URL." };
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const publicCode = await allocatePublicCode();
    try {
      const row = await prisma.qrRedirect.create({
        data: {
          name,
          publicCode,
          target,
          customUrl,
          style,
          moduleShape,
          frameShape,
          centerUseColor,
        },
      });
      revalidatePath("/settings/qr-codes");
      return { ok: true, id: row.id, publicCode: row.publicCode };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue;
      }
      console.error("[createQrRedirectAction]", e);
      return { ok: false, error: "Could not save the QR code." };
    }
  }
  return { ok: false, error: "Could not allocate a unique QR id." };
}

export async function updateQrRedirectAction(form: {
  id: string;
  name: string;
  target: string;
  customUrl: string;
  style: string;
  moduleShape: string;
  frameShape: string;
  centerUseColor: boolean;
  centerImageUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const id = form.id.trim();
  if (!id) return { ok: false, error: "Missing id." };

  const name = form.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const target = parseTarget(form.target);
  if (!target) return { ok: false, error: "Invalid redirect target." };

  const style = parseStyle(form.style) ?? QrStyle.CLASSIC;
  const moduleShape = parseModuleShape(form.moduleShape) ?? QrModuleShape.SQUARE;
  const frameShape = parseFrameShape(form.frameShape) ?? QrFrameShape.SQUARE;
  const centerUseColor = !!form.centerUseColor;
  const customUrl = form.customUrl.trim();
  const centerImageUrl = safeUploadUrl(form.centerImageUrl, 500);

  if (target === QrRedirectTarget.CUSTOM && !customUrl) {
    return { ok: false, error: "Enter a URL or site path when using Custom URL." };
  }

  try {
    await prisma.qrRedirect.update({
      where: { id },
      data: {
        name,
        target,
        customUrl,
        style,
        moduleShape,
        frameShape,
        centerUseColor,
        centerImageUrl,
      },
    });
    revalidatePath("/settings/qr-codes");
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "QR code not found." };
    }
    console.error("[updateQrRedirectAction]", e);
    return { ok: false, error: "Could not update." };
  }
}

export async function deleteQrRedirectAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  if (!id.trim()) return { ok: false, error: "Missing id." };

  try {
    await prisma.qrRedirect.delete({ where: { id } });
    revalidatePath("/settings/qr-codes");
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "Already deleted." };
    }
    console.error("[deleteQrRedirectAction]", e);
    return { ok: false, error: "Could not delete." };
  }
}

export type UploadQrImageResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadQrDefaultCenterImageAction(formData: FormData): Promise<UploadQrImageResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > CENTER_IMG_MAX) {
    return { ok: false, error: "Image must be 2MB or smaller." };
  }
  if (!CENTER_TYPES.has(file.type)) {
    return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeImageBufferForUpload(buf, file.type, "preservePngIfAlpha", settings);
    const name = `qr-center-${randomUUID()}.${norm.ext}`;
    const key = `uploads/site/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    await prisma.$executeRaw`
      UPDATE "site_config" SET "qr_default_center_image_url" = ${url} WHERE "id" = 1
    `;

    revalidatePath("/settings/qr-codes", "page");
    revalidatePath("/", "layout");
    return { ok: true, url };
  } catch (e) {
    console.error("[uploadQrDefaultCenterImageAction]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function clearQrDefaultCenterImageAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  try {
    await prisma.$executeRaw`UPDATE "site_config" SET "qr_default_center_image_url" = '' WHERE "id" = 1`;
    revalidatePath("/settings/qr-codes", "page");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[clearQrDefaultCenterImageAction]", e);
    return { ok: false, error: "Could not clear." };
  }
}

export async function uploadQrRedirectOverrideCenterAction(
  qrId: string,
  formData: FormData,
): Promise<UploadQrImageResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const id = qrId.trim();
  if (!id) return { ok: false, error: "Missing QR id." };

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > CENTER_IMG_MAX) {
    return { ok: false, error: "Image must be 2MB or smaller." };
  }
  if (!CENTER_TYPES.has(file.type)) {
    return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
  }

  try {
    const exists = await prisma.qrRedirect.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { ok: false, error: "QR code not found." };

    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeImageBufferForUpload(buf, file.type, "preservePngIfAlpha", settings);
    const name = `qr-center-${id.slice(0, 8)}-${randomUUID()}.${norm.ext}`;
    const key = `uploads/site/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    await prisma.qrRedirect.update({
      where: { id },
      data: { centerImageUrl: url },
    });

    revalidatePath("/settings/qr-codes");
    return { ok: true, url };
  } catch (e) {
    console.error("[uploadQrRedirectOverrideCenterAction]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function clearQrRedirectOverrideCenterAction(
  qrId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const id = qrId.trim();
  if (!id) return { ok: false, error: "Missing QR id." };

  try {
    await prisma.qrRedirect.update({
      where: { id },
      data: { centerImageUrl: "" },
    });
    revalidatePath("/settings/qr-codes");
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "Not found." };
    }
    return { ok: false, error: "Could not clear." };
  }
}
