"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { putUploadObject } from "@/lib/app-uploads";
import { prisma } from "@/lib/prisma";
import {
  labelEditorHelpDefaults,
  parseLabelEditorHelpConfig,
  type LabelEditorHelpConfig,
} from "@/lib/label-editor-help";

const IMG_MAX = 4 * 1024 * 1024;
const IMG_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/gif", "image/avif"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type UpdateLabelEditorHelpResult = { ok: true } | { ok: false; error: string };
export type UploadLabelHelpImageResult = { ok: true; url: string } | { ok: false; error: string };

export async function updateLabelEditorHelpConfig(
  config: LabelEditorHelpConfig,
): Promise<UpdateLabelEditorHelpResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  const parsed = parseLabelEditorHelpConfig(config);
  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "7th Leg",
        loyaltyEnabled: false,
        pointsPerDollar: 10,
        loyaltyRedemptionCentsPerPoint: 10,
        labelEditorHelpJson: JSON.stringify(parsed),
      },
      update: { labelEditorHelpJson: JSON.stringify(parsed) },
    });
    revalidatePath("/labels", "page");
    revalidatePath("/settings/labels/information", "page");
    return { ok: true };
  } catch (e) {
    console.error("updateLabelEditorHelpConfig", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    if (/label_editor_help_json|does not exist|Unknown column/i.test(msg)) {
      return {
        ok: false,
        error: "Database is missing label editor help column. Run `npx prisma migrate deploy`.",
      };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}

export async function uploadLabelHelpImage(formData: FormData): Promise<UploadLabelHelpImageResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > IMG_MAX) {
    return { ok: false, error: "Image must be 4MB or smaller." };
  }
  if (!IMG_TYPES.has(file.type)) {
    return { ok: false, error: "Use PNG, WebP, JPEG, GIF, or AVIF." };
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const url = await putUploadObject(
      `uploads/label-help/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
      buf,
      file.type,
    );
    return { ok: true, url };
  } catch (e) {
    console.error("uploadLabelHelpImage", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function loadLabelEditorHelpForAdmin(): Promise<LabelEditorHelpConfig> {
  await requireAdmin();
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { labelEditorHelpJson: true },
    });
    if (!row?.labelEditorHelpJson?.trim()) {
      return labelEditorHelpDefaults();
    }
    return parseLabelEditorHelpConfig(JSON.parse(row.labelEditorHelpJson));
  } catch {
    return labelEditorHelpDefaults();
  }
}
