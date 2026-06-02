"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type LabelFinishOptionAdminRow = {
  id: string;
  name: string;
  groupName: string;
  active: boolean;
  sortOrder: number;
};

export async function listLabelFinishOptionsAdmin(): Promise<LabelFinishOptionAdminRow[]> {
  await requireAdmin();
  const rows = await prisma.labelFinishOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    groupName: r.groupName,
    active: r.active,
    sortOrder: r.sortOrder,
  }));
}

export async function adminUpsertLabelFinishOption(input: {
  id?: string;
  name: string;
  groupName: string;
  active: boolean;
  sortOrder: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const name = input.name.trim().slice(0, 80);
    if (!name) return { ok: false, error: "Name is required." };
    const groupName = input.groupName.trim().slice(0, 60);
    const sortOrder = Math.round(Number(input.sortOrder)) || 0;

    if (input.id?.trim()) {
      await prisma.labelFinishOption.update({
        where: { id: input.id.trim() },
        data: { name, groupName, active: !!input.active, sortOrder },
      });
      revalidatePaths();
      return { ok: true, id: input.id.trim() };
    }

    const created = await prisma.labelFinishOption.create({
      data: { name, groupName, active: !!input.active, sortOrder, priceDeltaCents: 0 },
    });
    revalidatePaths();
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function adminDeleteLabelFinishOption(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const cid = id.trim();
    if (!cid) return { ok: false, error: "Invalid option." };
    await prisma.labelFinishOption.delete({ where: { id: cid } });
    revalidatePaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

export type TemplateFinishLinkInput = {
  finishOptionId: string;
  priceDeltaCents: number;
};

export async function adminSetTemplateFinishOptions(
  templateId: string,
  links: TemplateFinishLinkInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const tid = templateId.trim();
    if (!tid) return { ok: false, error: "Invalid template." };
    const template = await prisma.labelTemplate.findUnique({ where: { id: tid }, select: { id: true } });
    if (!template) return { ok: false, error: "Template not found." };

    for (const l of links) {
      if (!Number.isFinite(l.priceDeltaCents) || l.priceDeltaCents < 0) {
        return { ok: false, error: "Each option needs a valid price increase (0 or more)." };
      }
    }

    await prisma.$transaction([
      prisma.labelTemplateFinishOption.deleteMany({ where: { templateId: tid } }),
      ...links.map((l) =>
        prisma.labelTemplateFinishOption.create({
          data: {
            templateId: tid,
            finishOptionId: l.finishOptionId,
            enabled: true,
            priceDeltaCents: Math.max(0, Math.round(l.priceDeltaCents)),
          },
        }),
      ),
    ]);

    revalidatePaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save template options." };
  }
}

export async function listTemplateFinishLinksAdmin(
  templateId: string,
): Promise<Array<{ finishOptionId: string; priceDeltaCents: number | null }>> {
  await requireAdmin();
  const rows = await prisma.labelTemplateFinishOption.findMany({
    where: { templateId },
    select: { finishOptionId: true, priceDeltaCents: true },
  });
  return rows.map((r) => ({
    finishOptionId: r.finishOptionId,
    priceDeltaCents: r.priceDeltaCents,
  }));
}

function revalidatePaths() {
  revalidatePath("/settings/labels/options");
  revalidatePath("/settings/labels");
  revalidatePath("/labels", "layout");
}
