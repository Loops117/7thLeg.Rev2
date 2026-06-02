"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { putUploadObject } from "@/lib/app-uploads";
import { autoGridStepPx, labelCanvasPxFromMm } from "@/lib/label-template-canvas";
import { borderConfigForPayload, type LabelBorderConfig } from "@/lib/label-template-border";
import { DEFAULT_LABEL_PRICE_TIERS, type LabelPriceTier, validatePriceTiersInput } from "@/lib/label-template-tiers";
import { normalizeLabelBaseLayoutBuffer } from "@/lib/image-upload-normalize";
import { LABEL_EDITOR_DOC_VERSION, parseLabelEditorDocument } from "@/lib/label-editor/document";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function safePublicPath(v: string, maxLen: number): string {
  const t = v.trim();
  if (!t || (!t.startsWith("/uploads/") && !t.startsWith("https://"))) return "";
  return t.slice(0, maxLen);
}

export type LabelTemplateAdminPayload = {
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  widthMm: number;
  heightMm: number;
  marginPx: number;
  maxElements: number;
  priceTiers: LabelPriceTier[];
  baseLayoutImageUrl: string;
  baseLayoutScalePercent: number;
  baseLayoutRotationDeg: number;
  baseLayoutOpacityPercent: number;
  baseLayoutOffsetXPx: number;
  baseLayoutOffsetYPx: number;
  borderConfig: LabelBorderConfig;
};

function normalizePayload(
  input: LabelTemplateAdminPayload,
):
  | {
      ok: true;
      data: LabelTemplateAdminPayload & {
        canvasWidthPx: number;
        canvasHeightPx: number;
        gridStepPx: number;
        borderConfigJson: object;
      };
    }
  | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const description = typeof input.description === "string" ? input.description : "";
  const active = !!input.active;
  const sortOrder = Math.round(Number(input.sortOrder));
  if (!Number.isFinite(sortOrder)) return { ok: false, error: "Sort order must be a number." };

  const widthMm = Math.round(Number(input.widthMm));
  const heightMm = Math.round(Number(input.heightMm));
  if (
    !Number.isFinite(widthMm) ||
    !Number.isFinite(heightMm) ||
    widthMm < 1 ||
    widthMm > 500 ||
    heightMm < 1 ||
    heightMm > 500
  ) {
    return { ok: false, error: "Label size must be between 1 and 500 mm each side." };
  }

  const marginPx = Math.round(Number(input.marginPx));
  if (!Number.isFinite(marginPx) || marginPx < 0 || marginPx > 128) {
    return { ok: false, error: "Margin must be between 0 and 128 px." };
  }

  const maxElements = Math.round(Number(input.maxElements));
  if (!Number.isFinite(maxElements) || maxElements < 1 || maxElements > 200) {
    return { ok: false, error: "Max elements must be between 1 and 200." };
  }

  const tiersCheck = validatePriceTiersInput(input.priceTiers ?? []);
  if (!tiersCheck.ok) return tiersCheck;

  const baseLayoutImageUrl = safePublicPath(input.baseLayoutImageUrl ?? "", 500);

  let scale = Math.round(Number(input.baseLayoutScalePercent));
  if (!Number.isFinite(scale)) scale = 100;
  scale = Math.min(300, Math.max(50, scale));

  let rot = Math.round(Number(input.baseLayoutRotationDeg));
  if (!Number.isFinite(rot)) rot = 0;
  rot = Math.min(180, Math.max(-180, rot));

  let op = Math.round(Number(input.baseLayoutOpacityPercent));
  if (!Number.isFinite(op)) op = 100;
  op = Math.min(100, Math.max(0, op));

  const { widthPx, heightPx } = labelCanvasPxFromMm(widthMm, heightMm);

  let offX = Math.round(Number(input.baseLayoutOffsetXPx));
  let offY = Math.round(Number(input.baseLayoutOffsetYPx));
  if (!Number.isFinite(offX)) offX = 0;
  if (!Number.isFinite(offY)) offY = 0;
  const span = Math.max(widthPx, heightPx) * 4;
  offX = Math.min(span, Math.max(-span, offX));
  offY = Math.min(span, Math.max(-span, offY));

  const borderConfig = borderConfigForPayload(
    input.borderConfig ??
      {
        mode: "none",
        strokePx: 6,
        insetPx: 0,
        color: "#1b4332",
        bottomText: "",
        textPlacement: "bottom",
        textPaddingPx: 8,
        textOffsetXPx: 0,
        textOffsetYPx: 0,
      },
    widthPx,
    heightPx,
  );

  const gridStepPx = autoGridStepPx(widthPx, heightPx, marginPx);

  return {
    ok: true,
    data: {
      name,
      description,
      active,
      sortOrder,
      widthMm,
      heightMm,
      marginPx,
      maxElements,
      priceTiers: tiersCheck.tiers,
      baseLayoutImageUrl,
      baseLayoutScalePercent: scale,
      baseLayoutRotationDeg: rot,
      baseLayoutOpacityPercent: op,
      baseLayoutOffsetXPx: offX,
      baseLayoutOffsetYPx: offY,
      borderConfig,
      canvasWidthPx: widthPx,
      canvasHeightPx: heightPx,
      gridStepPx,
      borderConfigJson: borderConfig as object,
    },
  };
}

export async function adminCreateLabelTemplate(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const tiers = DEFAULT_LABEL_PRICE_TIERS.map((t) => ({ ...t }));
  const { widthPx, heightPx } = labelCanvasPxFromMm(50, 25);
  const marginPx = 20;
  const gridStepPx = autoGridStepPx(widthPx, heightPx, marginPx);

  const created = await prisma.labelTemplate.create({
    data: {
      name: "New label template",
      description: "",
      active: true,
      sortOrder: 0,
      widthMm: 50,
      heightMm: 25,
      marginPx,
      canvasWidthPx: widthPx,
      canvasHeightPx: heightPx,
      gridStepPx,
      maxElements: 24,
      priceTiersJson: tiers,
      baseLayoutImageUrl: "",
      baseLayoutScalePercent: 100,
      baseLayoutRotationDeg: 0,
      baseLayoutOpacityPercent: 100,
      baseLayoutOffsetXPx: 0,
      baseLayoutOffsetYPx: 0,
      borderConfigJson: {},
    },
  });

  revalidatePath("/settings/labels");
  revalidatePath("/labels");
  return { ok: true, id: created.id };
}

export async function adminUpdateLabelTemplate(
  id: string,
  input: LabelTemplateAdminPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const cid = id.trim();
  if (!cid) return { ok: false, error: "Invalid template." };

  const normalized = normalizePayload(input);
  if (!normalized.ok) return normalized;

  const exists = await prisma.labelTemplate.findUnique({ where: { id: cid }, select: { id: true } });
  if (!exists) return { ok: false, error: "Template not found." };

  const d = normalized.data;
  await prisma.labelTemplate.update({
    where: { id: cid },
    data: {
      name: d.name,
      description: d.description,
      active: d.active,
      sortOrder: d.sortOrder,
      widthMm: d.widthMm,
      heightMm: d.heightMm,
      marginPx: d.marginPx,
      canvasWidthPx: d.canvasWidthPx,
      canvasHeightPx: d.canvasHeightPx,
      gridStepPx: d.gridStepPx,
      maxElements: d.maxElements,
      priceTiersJson: d.priceTiers,
      baseLayoutImageUrl: d.baseLayoutImageUrl,
      baseLayoutScalePercent: d.baseLayoutScalePercent,
      baseLayoutRotationDeg: d.baseLayoutRotationDeg,
      baseLayoutOpacityPercent: d.baseLayoutOpacityPercent,
      baseLayoutOffsetXPx: d.baseLayoutOffsetXPx,
      baseLayoutOffsetYPx: d.baseLayoutOffsetYPx,
      borderConfigJson: d.borderConfigJson,
    },
  });

  revalidatePath("/settings/labels");
  revalidatePath("/labels");
  return { ok: true };
}

export async function adminSetLabelTemplateActive(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const cid = id.trim();
  if (!cid) return { ok: false, error: "Invalid template." };

  const exists = await prisma.labelTemplate.findUnique({ where: { id: cid }, select: { id: true } });
  if (!exists) return { ok: false, error: "Template not found." };

  await prisma.labelTemplate.update({
    where: { id: cid },
    data: { active },
  });

  revalidatePath("/settings/labels");
  revalidatePath("/labels");
  return { ok: true };
}

export async function updateLabelTemplateSortOrder(
  id: string,
  sortOrder: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  const cid = id.trim();
  if (!cid) return { ok: false, error: "Invalid template." };
  const so = Math.round(Number(sortOrder));
  if (!Number.isFinite(so)) return { ok: false, error: "Sort order must be a number." };

  try {
    await prisma.labelTemplate.update({
      where: { id: cid },
      data: { sortOrder: so },
    });
    revalidatePath("/settings/labels");
    revalidatePath("/labels");
    return { ok: true };
  } catch {
    return { ok: false, error: "Template not found." };
  }
}

export async function adminDeleteLabelTemplate(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const cid = id.trim();
  if (!cid) return { ok: false, error: "Invalid template." };

  try {
    await prisma.labelTemplate.delete({ where: { id: cid } });
  } catch {
    return { ok: false, error: "Could not delete this template." };
  }

  revalidatePath("/settings/labels");
  revalidatePath("/labels");
  return { ok: true };
}

const BASE_MAX_BYTES = 6 * 1024 * 1024;
const BASE_ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);

export type UploadLabelTemplateBaseResult = { ok: true; url: string } | { ok: false; error: string };

export async function adminSaveLabelTemplateStarterDocument(
  templateId: string,
  document: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const tid = templateId.trim();
    if (!tid) return { ok: false, error: "Invalid template." };

    const template = await prisma.labelTemplate.findUnique({ where: { id: tid } });
    if (!template) return { ok: false, error: "Template not found." };

    const doc = parseLabelEditorDocument(document, tid);
    if (doc.version !== LABEL_EDITOR_DOC_VERSION) {
      return { ok: false, error: "Unsupported document version." };
    }

    const hasStarter =
      doc.elements.length > 0 || doc.strokes.length > 0 || Boolean(doc.dataSheet);
    await prisma.labelTemplate.update({
      where: { id: tid },
      data: {
        starterDocumentJson: hasStarter
          ? ({ ...doc, version: LABEL_EDITOR_DOC_VERSION } as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });

    revalidatePath("/settings/labels");
    revalidatePath(`/settings/labels/templates/${tid}/layout`);
    revalidatePath("/labels", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function uploadLabelTemplateBaseLayout(
  templateId: string,
  formData: FormData,
): Promise<UploadLabelTemplateBaseResult> {
  try {
    await requireAdmin();
    const tid = templateId.trim();
    if (!tid) return { ok: false, error: "Invalid template." };

    const exists = await prisma.labelTemplate.findUnique({ where: { id: tid }, select: { id: true } });
    if (!exists) return { ok: false, error: "Template not found." };

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > BASE_MAX_BYTES) {
      return { ok: false, error: "Image must be 6MB or smaller." };
    }
    if (!BASE_ALLOWED.has(file.type)) {
      return { ok: false, error: "Use JPEG, PNG, WebP, GIF, or AVIF." };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const norm = await normalizeLabelBaseLayoutBuffer(buf, file.type);
    const ext = norm.ext || "jpg";
    const name = `label-base-${tid.slice(0, 8)}-${randomUUID()}.${ext}`;
    const key = `uploads/label-templates/${name}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);

    await prisma.labelTemplate.update({
      where: { id: tid },
      data: { baseLayoutImageUrl: url },
    });

    revalidatePath("/settings/labels");
    revalidatePath("/labels");
    return { ok: true, url };
  } catch (e) {
    console.error("uploadLabelTemplateBaseLayout", e);
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}
