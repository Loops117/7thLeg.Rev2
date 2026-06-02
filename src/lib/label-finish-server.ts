import type { TemplateFinishOptionRow } from "@/lib/label-finish-options";
import { prisma } from "@/lib/prisma";

function mapLink(link: {
  finishOptionId: string;
  priceDeltaCents: number | null;
  finishOption: { name: string; groupName: string; active: boolean };
}): TemplateFinishOptionRow {
  return {
    finishOptionId: link.finishOptionId,
    name: link.finishOption.name,
    groupName: link.finishOption.groupName,
    enabled: true,
    priceDeltaCents: Math.max(0, link.priceDeltaCents ?? 0),
  };
}

export async function listActiveTemplateFinishOptions(
  templateId: string,
): Promise<TemplateFinishOptionRow[]> {
  const links = await prisma.labelTemplateFinishOption.findMany({
    where: { templateId, finishOption: { active: true } },
    include: { finishOption: true },
    orderBy: [{ finishOption: { sortOrder: "asc" } }, { finishOption: { name: "asc" } }],
  });
  return links.map(mapLink);
}

export async function listTemplateFinishOptionsMap(
  templateIds: string[],
): Promise<Record<string, TemplateFinishOptionRow[]>> {
  if (templateIds.length === 0) return {};
  const links = await prisma.labelTemplateFinishOption.findMany({
    where: { templateId: { in: templateIds }, finishOption: { active: true } },
    include: { finishOption: true },
    orderBy: [{ finishOption: { sortOrder: "asc" } }, { finishOption: { name: "asc" } }],
  });
  const out: Record<string, TemplateFinishOptionRow[]> = {};
  for (const link of links) {
    const row = mapLink(link);
    if (!out[link.templateId]) out[link.templateId] = [];
    out[link.templateId]!.push(row);
  }
  return out;
}
