import { prisma } from "@/lib/prisma";
import {
  parseCollectPolyPoints,
  parseCollectShape,
  parseWaterAreaSettings,
  type ExplorationCollectAreaView,
  type ExplorationWaterAreaSettings,
} from "@/lib/game-exploration-gather-shared";
import {
  parseItemSetCollectType,
  clampWorldImageSizePx,
  type ExplorationItemSetView,
} from "@/lib/game-exploration-item-sets-shared";
import {
  parseCollectType,
  parseItemKind,
  parseRequiredToolKind,
  type ExplorationItemView,
} from "@/lib/game-exploration-tools-shared";
import { ensureExplorationItemSetPremades } from "@/lib/game-exploration-item-sets";
import {
  parseBugBodyVariant,
  parseBugParts,
  parseBugStyle,
  parseBugActivityPeriod,
  parseCatchToolKinds,
  clampBugSizePx,
  type ExplorationBugSetView,
  type ExplorationBugView,
} from "@/lib/game-exploration-bugs-shared";

function mapBug(r: {
  id: string;
  name: string;
  bugType: string;
  bodyVariant: string;
  partsJson: unknown;
  styleJson?: unknown;
  imageUrl: string;
  iconStretch: boolean;
  sizePx: number;
  canBeCompanion: boolean;
  catchToolKinds: string;
  stepDistancePx: number;
  stepPauseMs: number;
  speedPx: number;
  activityPeriod: string;
  attractedToClearLight?: boolean;
  deterredByClearLight?: boolean;
  active: boolean;
  sortOrder: number;
  notes: string;
}): ExplorationBugView {
  const bodyVariant = parseBugBodyVariant(r.bodyVariant);
  return {
    id: r.id,
    name: r.name,
    bugType: r.bugType,
    bodyVariant,
    parts: parseBugParts(r.partsJson, bodyVariant),
    style: parseBugStyle(r.styleJson, bodyVariant),
    imageUrl: r.imageUrl,
    iconStretch: r.iconStretch,
    sizePx: clampBugSizePx(r.sizePx),
    canBeCompanion: r.canBeCompanion,
    catchToolKinds: parseCatchToolKinds(r.catchToolKinds),
    stepDistancePx: Math.max(4, r.stepDistancePx),
    stepPauseMs: Math.max(0, r.stepPauseMs),
    speedPx: Math.max(10, r.speedPx),
    activityPeriod: parseBugActivityPeriod(r.activityPeriod),
    attractedToClearLight: Boolean(r.attractedToClearLight),
    deterredByClearLight: Boolean(r.deterredByClearLight),
    active: r.active,
    sortOrder: r.sortOrder,
    notes: r.notes,
  };
}

function mapBugSet(row: {
  id: string;
  name: string;
  notes: string;
  active: boolean;
  sortOrder: number;
  members: Array<{
    id: string;
    bugId: string;
    spawnWeight: number;
    minCount: number;
    maxCount: number;
    sortOrder: number;
    bug: Parameters<typeof mapBug>[0];
  }>;
}): ExplorationBugSetView {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    active: row.active,
    sortOrder: row.sortOrder,
    members: row.members.map((m) => ({
      id: m.id,
      bugId: m.bugId,
      spawnWeight: m.spawnWeight,
      minCount: m.minCount,
      maxCount: m.maxCount,
      sortOrder: m.sortOrder,
      bug: mapBug(m.bug),
    })),
  };
}

function mapItem(r: {
  id: string;
  name: string;
  imageUrl: string;
  iconStretch?: boolean;
  notes: string;
  stackMax: number;
  itemKind: string;
  collectType?: string;
  requiredToolKind: string;
  active: boolean;
  sortOrder: number;
}): ExplorationItemView {
  return {
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl,
    iconStretch: Boolean(r.iconStretch),
    notes: r.notes,
    stackMax: r.stackMax,
    itemKind: parseItemKind(r.itemKind),
    collectType: parseCollectType(r.collectType),
    requiredToolKind: parseRequiredToolKind(r.requiredToolKind),
    active: r.active,
    sortOrder: r.sortOrder,
  };
}

function mapSet(row: {
  id: string;
  name: string;
  imageUrl: string;
  worldImageSizePx?: number;
  notes: string;
  collectType: string;
  active: boolean;
  sortOrder: number;
  members: Array<{
    id: string;
    itemId: string;
    spawnWeight: number;
    nodeHp: number;
    qty2ChancePct: number;
    sortOrder: number;
    item: Parameters<typeof mapItem>[0];
  }>;
}): ExplorationItemSetView {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    worldImageSizePx: clampWorldImageSizePx(row.worldImageSizePx ?? 48),
    notes: row.notes,
    collectType: parseItemSetCollectType(row.collectType),
    active: row.active,
    sortOrder: row.sortOrder,
    members: row.members.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      spawnWeight: m.spawnWeight,
      nodeHp: m.nodeHp,
      qty2ChancePct: m.qty2ChancePct,
      sortOrder: m.sortOrder,
      item: mapItem(m.item),
    })),
  };
}

const setInclude = {
  members: {
    include: { item: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
};

const areaInclude = {
  sets: {
    include: {
      set: { include: setInclude },
    },
  },
  bugSets: {
    include: {
      bugSet: {
        include: {
          members: {
            include: { bug: true },
            orderBy: [{ sortOrder: "asc" as const }],
          },
        },
      },
    },
  },
};

function mapArea(row: {
  id: string;
  zoneId: string;
  kind: "COLLECT" | "ROAM_BUG" | "WATER";
  name: string;
  shape: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  configJson: unknown;
  maxConcurrent: number;
  bugBurstChancePct?: number;
  active: boolean;
  sortOrder: number;
  sets: Array<{ set: Parameters<typeof mapSet>[0] }>;
  bugSets?: Array<{ bugSet: Parameters<typeof mapBugSet>[0] }>;
}): ExplorationCollectAreaView {
  const cfg =
    row.configJson && typeof row.configJson === "object"
      ? (row.configJson as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    zoneId: row.zoneId,
    kind: row.kind,
    name: row.name,
    shape: parseCollectShape(row.shape),
    leftPct: row.leftPct,
    topPct: row.topPct,
    widthPct: row.widthPct,
    heightPct: row.heightPct,
    polyPoints: parseCollectPolyPoints(cfg.polyPoints),
    maxConcurrent: row.maxConcurrent,
    bugBurstChancePct:
      typeof row.bugBurstChancePct === "number" && Number.isFinite(row.bugBurstChancePct)
        ? Math.min(100, Math.max(0, row.bugBurstChancePct))
        : 0,
    active: row.active,
    sortOrder: row.sortOrder,
    sets: row.sets.map((link) => mapSet(link.set)),
    bugSets: (row.bugSets ?? []).map((link) => mapBugSet(link.bugSet)),
    water: row.kind === "WATER" ? parseWaterAreaSettings(cfg.water) : null,
  };
}

export async function listCollectAreasForZone(
  zoneId: string,
): Promise<ExplorationCollectAreaView[]> {
  const rows = await prisma.gameExplorationCollectArea.findMany({
    where: { zoneId },
    include: areaInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapArea);
}

export async function listCollectAreasForPlay(
  zoneId: string,
): Promise<ExplorationCollectAreaView[]> {
  const rows = await prisma.gameExplorationCollectArea.findMany({
    where: { zoneId, active: true },
    include: areaInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapArea);
}

export async function listAllCollectAreasForPlay(): Promise<ExplorationCollectAreaView[]> {
  const rows = await prisma.gameExplorationCollectArea.findMany({
    where: { active: true },
    include: areaInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapArea);
}

export type CollectAreaSaveInput = {
  id?: string;
  zoneId: string;
  kind: "COLLECT" | "ROAM_BUG" | "WATER";
  name: string;
  shape: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  polyPoints?: Array<{ xPct: number; yPct: number }>;
  maxConcurrent: number;
  bugBurstChancePct?: number;
  active: boolean;
  sortOrder: number;
  /** Item set IDs allowed to spawn in this area (COLLECT). */
  setIds: string[];
  /** Bug set IDs for ROAM_BUG / WATER roam areas. */
  bugSetIds?: string[];
  /** WATER only — wade depth, tint, speed (stored in configJson.water). */
  water?: ExplorationWaterAreaSettings;
};

export async function saveCollectAreaAdmin(
  input: CollectAreaSaveInput,
): Promise<{ ok: true; area: ExplorationCollectAreaView } | { ok: false; error: string }> {
  const zone = await prisma.gameExplorationZone.findUnique({ where: { id: input.zoneId } });
  if (!zone) return { ok: false, error: "Zone not found." };

  const shape = parseCollectShape(input.shape);
  let waterSettings: ExplorationWaterAreaSettings | undefined;
  if (input.kind === "WATER") {
    if (input.id) {
      const existing = await prisma.gameExplorationCollectArea.findUnique({
        where: { id: input.id },
        select: { configJson: true },
      });
      const cfg =
        existing?.configJson && typeof existing.configJson === "object"
          ? (existing.configJson as Record<string, unknown>)
          : {};
      waterSettings = input.water ?? parseWaterAreaSettings(cfg.water);
    } else {
      waterSettings = input.water ?? parseWaterAreaSettings(null);
    }
  }
  const configJson = {
    polyPoints: parseCollectPolyPoints(input.polyPoints ?? []),
    ...(waterSettings ? { water: waterSettings } : {}),
  };
  const setIds = [...new Set((input.setIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const bugSetIds = [...new Set((input.bugSetIds ?? []).map((id) => id.trim()).filter(Boolean))];
  if (setIds.length > 0) {
    const found = await prisma.gameExplorationItemSet.count({
      where: { id: { in: setIds } },
    });
    if (found !== setIds.length) {
      return { ok: false, error: "One or more item sets were not found." };
    }
  }
  if (bugSetIds.length > 0) {
    const found = await prisma.gameExplorationBugSet.count({
      where: { id: { in: bugSetIds } },
    });
    if (found !== bugSetIds.length) {
      return { ok: false, error: "One or more bug sets were not found." };
    }
  }

  const core = {
    kind: input.kind,
    name: input.name.trim().slice(0, 80) || "Collect area",
    shape,
    leftPct: input.leftPct,
    topPct: input.topPct,
    widthPct: input.widthPct,
    heightPct: input.heightPct,
    configJson,
    maxConcurrent: Math.max(1, Math.min(40, Math.round(input.maxConcurrent) || 3)),
    bugBurstChancePct: Math.min(
      100,
      Math.max(0, Number(input.bugBurstChancePct) || 0),
    ),
    active: !!input.active,
    sortOrder: Math.round(input.sortOrder) || 0,
  };

  let areaId = input.id;
  if (areaId) {
    await prisma.gameExplorationCollectArea.update({
      where: { id: areaId },
      data: core,
    });
  } else {
    const created = await prisma.gameExplorationCollectArea.create({
      data: { zoneId: input.zoneId, ...core },
    });
    areaId = created.id;
  }

  await prisma.gameExplorationCollectAreaSet.deleteMany({ where: { areaId } });
  if (setIds.length > 0) {
    await prisma.gameExplorationCollectAreaSet.createMany({
      data: setIds.map((setId) => ({ areaId: areaId!, setId })),
    });
  }

  await prisma.gameExplorationCollectAreaBugSet.deleteMany({ where: { areaId } });
  if (bugSetIds.length > 0) {
    await prisma.gameExplorationCollectAreaBugSet.createMany({
      data: bugSetIds.map((bugSetId) => ({ areaId: areaId!, bugSetId })),
    });
  }

  const areas = await listCollectAreasForZone(input.zoneId);
  const area = areas.find((a) => a.id === areaId);
  return area ? { ok: true, area } : { ok: false, error: "Area missing after save." };
}

export async function deleteCollectAreaAdmin(
  areaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.gameExplorationCollectArea.delete({ where: { id: areaId } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

/**
 * Seed demo collect areas linked to premade item sets when none exist.
 */
export async function ensureExplorationGatherDemoAreas(): Promise<void> {
  const existing = await prisma.gameExplorationCollectArea.count();
  if (existing > 0) return;

  await ensureExplorationItemSetPremades();

  const zone = await prisma.gameExplorationZone.findFirst({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (!zone) return;

  const sets = await prisma.gameExplorationItemSet.findMany({
    where: { active: true },
    select: { id: true, name: true, collectType: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  if (sets.length === 0) return;

  const mossBark = sets.filter((s) => s.collectType === "moss" || s.collectType === "bark");
  const dirt = sets.filter((s) => s.collectType === "substrate");

  const demos: CollectAreaSaveInput[] = [];
  if (mossBark.length > 0) {
    demos.push({
      zoneId: zone.id,
      kind: "COLLECT",
      name: "Demo moss & bark",
      shape: "circle",
      leftPct: 18,
      topPct: 28,
      widthPct: 22,
      heightPct: 22,
      maxConcurrent: 3,
      active: true,
      sortOrder: 1,
      setIds: mossBark.map((s) => s.id),
    });
  }
  if (dirt.length > 0) {
    demos.push({
      zoneId: zone.id,
      kind: "COLLECT",
      name: "Demo dirt piles",
      shape: "square",
      leftPct: 58,
      topPct: 42,
      widthPct: 20,
      heightPct: 18,
      maxConcurrent: 2,
      active: true,
      sortOrder: 2,
      setIds: dirt.map((s) => s.id),
    });
  }

  for (const demo of demos) {
    await saveCollectAreaAdmin(demo);
  }
}
