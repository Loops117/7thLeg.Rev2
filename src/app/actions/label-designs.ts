"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { putUploadObject } from "@/lib/app-uploads";
import { LABEL_EDITOR_DOC_VERSION, parseLabelEditorDocument } from "@/lib/label-editor/document";
import { getUploadImageSettingsFromDb, normalizeWatermarkBuffer } from "@/lib/image-upload-normalize";
import { prisma } from "@/lib/prisma";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("Sign in to save label designs.");
  }
  return session.user.id;
}

export type SavedLabelDesignSummary = {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  folderId: string | null;
  folderName: string | null;
  updatedAt: string;
};

export async function listCustomerLabelDesignsForTemplate(
  templateId: string,
): Promise<SavedLabelDesignSummary[]> {
  const customerId = await requireCustomerId();
  const tid = templateId.trim();
  if (!tid) return [];
  const rows = await prisma.customerLabelDesign.findMany({
    where: { customerId, templateId: tid },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      template: { select: { name: true } },
      folder: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    templateId: r.templateId,
    templateName: r.template.name,
    folderId: r.folderId,
    folderName: r.folder?.name ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listCustomerLabelDesigns(): Promise<SavedLabelDesignSummary[]> {
  const customerId = await requireCustomerId();
  const rows = await prisma.customerLabelDesign.findMany({
    where: { customerId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      template: { select: { name: true } },
      folder: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    templateId: r.templateId,
    templateName: r.template.name,
    folderId: r.folderId,
    folderName: r.folder?.name ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function loadCustomerLabelDesign(
  designId: string,
): Promise<{ ok: true; document: unknown; templateId: string; name: string } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const row = await prisma.customerLabelDesign.findFirst({
      where: { id: designId, customerId },
    });
    if (!row) return { ok: false, error: "Design not found." };
    return { ok: true, document: row.documentJson, templateId: row.templateId, name: row.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load design." };
  }
}

export async function saveCustomerLabelDesign(input: {
  id?: string;
  templateId: string;
  name: string;
  document: unknown;
  folderId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const name = input.name.trim().slice(0, 120) || "My label";
    const templateId = input.templateId.trim();
    if (!templateId) return { ok: false, error: "Missing template." };

    const template = await prisma.labelTemplate.findFirst({
      where: { id: templateId, active: true },
    });
    if (!template) return { ok: false, error: "Template not available." };

    const doc = parseLabelEditorDocument(input.document, templateId);
    if (doc.version !== LABEL_EDITOR_DOC_VERSION) {
      return { ok: false, error: "Unsupported document version." };
    }

    const payload = { ...doc, version: LABEL_EDITOR_DOC_VERSION };

    let folderId: string | null = input.folderId?.trim() || null;
    if (folderId) {
      const folder = await prisma.customerLabelDesignFolder.findFirst({
        where: { id: folderId, customerId },
      });
      if (!folder) folderId = null;
    }

    if (input.id) {
      const existing = await prisma.customerLabelDesign.findFirst({
        where: { id: input.id, customerId },
      });
      if (!existing) return { ok: false, error: "Design not found." };
      await prisma.customerLabelDesign.update({
        where: { id: input.id },
        data: { name, documentJson: payload, templateId, folderId },
      });
      revalidatePath("/labels", "layout");
      return { ok: true, id: input.id };
    }

    const created = await prisma.customerLabelDesign.create({
      data: {
        customerId,
        templateId,
        name,
        documentJson: payload,
        folderId,
      },
    });
    revalidatePath("/labels", "layout");
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function moveCustomerLabelDesignToFolder(
  designId: string,
  folderId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    let targetFolderId = folderId?.trim() || null;
    if (targetFolderId) {
      const folder = await prisma.customerLabelDesignFolder.findFirst({
        where: { id: targetFolderId, customerId },
      });
      if (!folder) targetFolderId = null;
    }
    const updated = await prisma.customerLabelDesign.updateMany({
      where: { id: designId, customerId },
      data: { folderId: targetFolderId },
    });
    if (updated.count === 0) return { ok: false, error: "Design not found." };
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Move failed." };
  }
}

export async function deleteCustomerLabelDesign(
  designId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    await prisma.customerLabelDesign.deleteMany({
      where: { id: designId, customerId },
    });
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

const IMG_MAX = 8 * 1024 * 1024;
const IMG_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/gif", "image/avif"]);

export type UploadLabelImageResult =
  | { ok: true; url: string; uploadId?: string }
  | { ok: false; error: string };

export type LabelUploadLibraryItem = { id: string; imageUrl: string; createdAt: string };

export async function listCustomerLabelUploads(): Promise<LabelUploadLibraryItem[]> {
  try {
    const customerId = await requireCustomerId();
    const rows = await prisma.customerLabelUpload.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    return rows.map((r) => ({
      id: r.id,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function registerCustomerLabelUpload(
  imageUrl: string,
): Promise<{ ok: true; item: LabelUploadLibraryItem } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const url = imageUrl.trim();
    if (!url) return { ok: false, error: "Invalid image." };

    const existing = await prisma.customerLabelUpload.findFirst({
      where: { customerId, imageUrl: url },
    });
    if (existing) {
      return {
        ok: true,
        item: {
          id: existing.id,
          imageUrl: existing.imageUrl,
          createdAt: existing.createdAt.toISOString(),
        },
      };
    }

    const row = await prisma.customerLabelUpload.create({
      data: { customerId, imageUrl: url },
    });
    revalidatePath("/labels", "layout");
    return {
      ok: true,
      item: { id: row.id, imageUrl: row.imageUrl, createdAt: row.createdAt.toISOString() },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save upload." };
  }
}

export async function deleteCustomerLabelUpload(
  uploadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    await prisma.customerLabelUpload.deleteMany({
      where: { id: uploadId, customerId },
    });
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

export async function uploadLabelEditorImage(formData: FormData): Promise<UploadLabelImageResult> {
  try {
    const session = await auth();
    const customerId = session?.user?.role === "customer" ? session.user.id : "guest";
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > IMG_MAX) {
      return { ok: false, error: "Image must be 8MB or smaller." };
    }
    if (!IMG_TYPES.has(file.type)) {
      return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeWatermarkBuffer(buf, file.type, settings);
    const name = `label-${randomUUID()}.${norm.ext}`;
    const key = `uploads/labels/${customerId}/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    let uploadId: string | undefined;
    if (session?.user?.role === "customer" && session.user.id) {
      const row = await prisma.customerLabelUpload.create({
        data: { customerId: session.user.id, imageUrl: url },
      });
      uploadId = row.id;
      revalidatePath("/labels", "layout");
    }

    return { ok: true, url, uploadId };
  } catch (e) {
    console.error("uploadLabelEditorImage", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}
