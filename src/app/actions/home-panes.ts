"use server";

import { revalidatePath } from "next/cache";
import type { PageKey, PaneType } from "@/generated/prisma/enums";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultPaneConfigWithTheme,
  parseHomePaneConfig,
  type HomePaneConfig,
} from "@/lib/pane-config";
import { themePaneDefaultsForNewPane } from "@/lib/theme-config";
import { loadResolvedPublicThemeFromDb } from "@/lib/theme-config-server";
import { settingsPathForPageKey, storefrontPathForPageKey } from "@/lib/pane-pages";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

function revalidatePaneRoutes(page: PageKey) {
  revalidatePath(storefrontPathForPageKey(page), "page");
  revalidatePath(settingsPathForPageKey(page), "page");
}

export async function createHomePane(page: PageKey, type: PaneType) {
  await requireAdmin();
  const theme = await loadResolvedPublicThemeFromDb();
  const config = defaultPaneConfigWithTheme(type, themePaneDefaultsForNewPane(theme)) as object;
  const agg = await prisma.pane.aggregate({
    where: { page },
    _max: { sortOrder: true },
  });
  const nextOrder = (agg._max.sortOrder ?? -1) + 1;
  await prisma.pane.create({
    data: {
      page,
      type,
      sortOrder: nextOrder,
      config,
    },
  });
  revalidatePaneRoutes(page);
}

export async function updateHomePane(page: PageKey, id: string, config: HomePaneConfig) {
  await requireAdmin();
  const pane = await prisma.pane.findFirst({ where: { id, page } });
  if (!pane) throw new Error("Pane not found");
  const merged = parseHomePaneConfig(config, pane.type);
  await prisma.pane.update({
    where: { id },
    data: { config: merged as object },
  });
  revalidatePaneRoutes(page);
}

export async function deleteHomePane(page: PageKey, id: string) {
  await requireAdmin();
  await prisma.pane.deleteMany({ where: { id, page } });
  revalidatePaneRoutes(page);
}

export async function moveHomePane(page: PageKey, id: string, direction: "up" | "down") {
  await requireAdmin();
  const panes = await prisma.pane.findMany({
    where: { page },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const idx = panes.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= panes.length) return;
  const a = panes[idx];
  const b = panes[j];
  await prisma.$transaction([
    prisma.pane.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.pane.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  revalidatePaneRoutes(page);
}
