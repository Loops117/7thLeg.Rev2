/** Collection spawn areas + runtime gather helpers. */

import type { ExplorationItemSetView } from "@/lib/game-exploration-item-sets-shared";
import type {
  ExplorationBugSetView,
  ExplorationBugStyle,
  ExplorationBugView,
  ExplorationBugActivityPeriod,
} from "@/lib/game-exploration-bugs-shared";
import { bugActiveForPeriod } from "@/lib/game-exploration-bugs-shared";
import type { ExplorationItemView, ExplorationToolView } from "@/lib/game-exploration-tools-shared";
import {
  toolMatchesRequired,
  type ExplorationToolKind,
} from "@/lib/game-exploration-tools-shared";

export type ExplorationCollectAreaKind = "COLLECT" | "ROAM_BUG" | "WATER";

export type ExplorationCollectShape = "square" | "circle" | "ellipse" | "polygon" | "point";

export type ExplorationCollectPolyPoint = { xPct: number; yPct: number };

export type ExplorationCollectAreaView = {
  id: string;
  zoneId: string;
  kind: ExplorationCollectAreaKind;
  name: string;
  shape: ExplorationCollectShape;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  polyPoints: ExplorationCollectPolyPoint[];
  maxConcurrent: number;
  /** COLLECT: % chance to burst bugs from overlapping ROAM_BUG on node resolve. */
  bugBurstChancePct: number;
  active: boolean;
  sortOrder: number;
  /** Item sets allowed to spawn in this area (COLLECT). */
  sets: ExplorationItemSetView[];
  /** Bug sets for ROAM_BUG areas. */
  bugSets: ExplorationBugSetView[];
  /** WATER only — wade depth, tint, and speed. */
  water?: ExplorationWaterAreaSettings | null;
};

/** Admin / play settings for wade-in water zones. Stored in collect area configJson.water. */
export type ExplorationWaterAreaSettings = {
  /** 0–100 — how far the avatar sinks when fully waded in. */
  depthPct: number;
  /** Walk speed multiplier at full wade (0–1). */
  speedMult: number;
  /** Tint applied to submerged body (e.g. blue water vs dark mud). */
  submergedTintHex: string;
  /** 0–100 — submerged body visibility (100 = full tint, 0 = shadow only). */
  submergedBodyOpacity: number;
  /** World px from edge until full wade depth (gradual entry). */
  entryBlendPx: number;
};

export const DEFAULT_WATER_AREA_SETTINGS: ExplorationWaterAreaSettings = {
  depthPct: 45,
  speedMult: 0.55,
  submergedTintHex: "#1e3a5f",
  submergedBodyOpacity: 70,
  entryBlendPx: 56,
};

export function parseWaterAreaSettings(raw: unknown): ExplorationWaterAreaSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WATER_AREA_SETTINGS };
  const row = raw as Record<string, unknown>;
  const depthPct =
    typeof row.depthPct === "number" && Number.isFinite(row.depthPct)
      ? clamp(row.depthPct, 0, 100)
      : DEFAULT_WATER_AREA_SETTINGS.depthPct;
  const speedMult =
    typeof row.speedMult === "number" && Number.isFinite(row.speedMult)
      ? clamp(row.speedMult, 0.05, 1)
      : DEFAULT_WATER_AREA_SETTINGS.speedMult;
  const submergedTintHex =
    typeof row.submergedTintHex === "string" && /^#[0-9a-fA-F]{6}$/.test(row.submergedTintHex.trim())
      ? row.submergedTintHex.trim().toLowerCase()
      : DEFAULT_WATER_AREA_SETTINGS.submergedTintHex;
  const submergedBodyOpacity =
    typeof row.submergedBodyOpacity === "number" && Number.isFinite(row.submergedBodyOpacity)
      ? clamp(row.submergedBodyOpacity, 0, 100)
      : DEFAULT_WATER_AREA_SETTINGS.submergedBodyOpacity;
  const entryBlendPx =
    typeof row.entryBlendPx === "number" && Number.isFinite(row.entryBlendPx)
      ? clamp(row.entryBlendPx, 8, 400)
      : DEFAULT_WATER_AREA_SETTINGS.entryBlendPx;
  return {
    depthPct,
    speedMult,
    submergedTintHex,
    submergedBodyOpacity,
    entryBlendPx,
  };
}

export function waterSettingsForArea(
  area: ExplorationCollectAreaView,
): ExplorationWaterAreaSettings | null {
  if (area.kind !== "WATER") return null;
  return area.water ?? { ...DEFAULT_WATER_AREA_SETTINGS };
}

function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Minimum distance from an interior point to the area boundary (world px). */
export function distanceToCollectAreaEdge(
  area: ExplorationCollectAreaView,
  x: number,
  y: number,
  worldW: number,
  worldH: number,
): number {
  if (!pointInCollectArea(area, x, y, worldW, worldH)) return 0;

  const left = (area.leftPct / 100) * worldW;
  const top = (area.topPct / 100) * worldH;
  const w = Math.max(4, (area.widthPct / 100) * worldW);
  const h = Math.max(4, (area.heightPct / 100) * worldH);

  if (area.shape === "polygon" && area.polyPoints.length >= 3) {
    const pts = area.polyPoints.map((p) => ({
      x: (p.xPct / 100) * worldW,
      y: (p.yPct / 100) * worldH,
    }));
    let min = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      min = Math.min(min, distPointToSegment(x, y, a.x, a.y, b.x, b.y));
    }
    return Number.isFinite(min) ? min : 0;
  }

  if (area.shape === "circle" || area.shape === "ellipse") {
    const cx = left + w / 2;
    const cy = top + h / 2;
    const rx = Math.max(1, w / 2);
    const ry = Math.max(1, h / 2);
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const distNorm = Math.hypot(nx, ny);
    if (distNorm < 1e-6) return Math.min(rx, ry);
    const edgeX = cx + (nx / distNorm) * rx;
    const edgeY = cy + (ny / distNorm) * ry;
    return Math.hypot(x - edgeX, y - edgeY);
  }

  return Math.min(x - left, left + w - x, y - top, top + h - y);
}

/** 0–1 wade factor (ramps up from shore using entryBlendPx). */
export function collectAreaWaterWadeFactor(
  area: ExplorationCollectAreaView,
  x: number,
  y: number,
  worldW: number,
  worldH: number,
): number {
  if (area.kind !== "WATER") return 0;
  if (!pointInCollectArea(area, x, y, worldW, worldH)) return 0;
  const settings = waterSettingsForArea(area)!;
  const edgeDist = distanceToCollectAreaEdge(area, x, y, worldW, worldH);
  const blend = Math.max(8, settings.entryBlendPx);
  return clamp(edgeDist / blend, 0, 1);
}

export type ExplorationPlayerWaterState = {
  areaId: string;
  wade: number;
  settings: ExplorationWaterAreaSettings;
  speedMult: number;
  sinkPx: number;
};

export function resolvePlayerWaterState(
  areas: ExplorationCollectAreaView[],
  x: number,
  y: number,
  worldW: number,
  worldH: number,
): ExplorationPlayerWaterState | null {
  let best: ExplorationPlayerWaterState | null = null;
  for (const area of areas) {
    if (area.kind !== "WATER") continue;
    const wade = collectAreaWaterWadeFactor(area, x, y, worldW, worldH);
    if (wade <= 0) continue;
    const settings = waterSettingsForArea(area)!;
    const speedMult = 1 - (1 - settings.speedMult) * wade;
    const sinkPx = (settings.depthPct / 100) * wade * 14;
    if (!best || wade > best.wade) {
      best = { areaId: area.id, wade, settings, speedMult, sinkPx };
    }
  }
  return best;
}

/** ROAM_BUG areas, or WATER areas with linked bug sets. */
export function areaSpawnsRoamBugs(area: ExplorationCollectAreaView): boolean {
  return (
    area.kind === "ROAM_BUG" || (area.kind === "WATER" && (area.bugSets?.length ?? 0) > 0)
  );
}

/** Live world node spawned from an item-set member. */
export type ExplorationWorldNode = {
  id: string;
  areaId: string;
  /** Set member id (or legacy entry id). */
  entryId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  worldImageUrl: string;
  /** Display size in world px. */
  worldImageSizePx: number;
  label: string;
  requiredToolKind: ExplorationToolKind | "";
  qty2ChancePct: number;
  bugBurstChancePct: number;
  loot: Array<{ itemId: string; weight: number; item: ExplorationItemView }>;
  bugs: Array<{
    itemId: string;
    weight: number;
    speedPx: number;
    minCount: number;
    maxCount: number;
    item: ExplorationItemView;
  }>;
};

export type ExplorationFleeingBug = {
  id: string;
  bugId: string;
  name: string;
  bugType: string;
  imageUrl: string;
  iconStretch?: boolean;
  x: number;
  y: number;
  speedPx: number;
  facingDeg: number;
  expiresAt: number;
  sizePx: number;
  stepDistancePx: number;
  stepPauseMs: number;
  catchToolKinds: ExplorationToolKind[];
  bodyVariant: string;
  parts: Record<string, string>;
  style?: ExplorationBugStyle;
  /** Ambient roam (ROAM_BUG area) — does not time out like burst flee bugs. */
  ambient?: boolean;
  /** Source ROAM_BUG area id (for refill caps). */
  areaId?: string;
  /** Pixels left to travel in the current step. */
  stepRemainingPx: number;
  /** Until this timestamp the bug stays still, then picks a new facing. */
  pauseUntilMs: number;
  /** Consecutive blocked / out-of-area move attempts (unstuck after a few). */
  moveFailCount?: number;
  /** Failed catch swings so far. */
  failedCatches: number;
  /** After this many failed catches the bug escapes. */
  escapeAfterMisses: number;
  activityPeriod?: ExplorationBugActivityPeriod;
  attractedToClearLight?: boolean;
  deterredByClearLight?: boolean;
};

export type ExplorationDamageFloater = {
  id: string;
  x: number;
  y: number;
  value: number;
  crit: boolean;
  guestId: string;
  at: number;
};

export type ExplorationDustFx = {
  id: string;
  x: number;
  y: number;
  expiresAt: number;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function rollBugEscapeMisses(min: number, max: number): number {
  const lo = Math.max(1, Math.round(Math.min(min, max)));
  const hi = Math.max(lo, Math.round(Math.max(min, max)));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function parseCollectShape(raw: unknown): ExplorationCollectShape {
  if (
    raw === "square" ||
    raw === "circle" ||
    raw === "ellipse" ||
    raw === "polygon" ||
    raw === "point"
  ) {
    return raw;
  }
  return "square";
}

export function parseCollectPolyPoints(raw: unknown): ExplorationCollectPolyPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const row = p as Record<string, unknown>;
      const xPct = typeof row.xPct === "number" ? clamp(row.xPct, 0, 100) : null;
      const yPct = typeof row.yPct === "number" ? clamp(row.yPct, 0, 100) : null;
      if (xPct == null || yPct == null) return null;
      return { xPct, yPct };
    })
    .filter((p): p is ExplorationCollectPolyPoint => p != null)
    .slice(0, 48);
}

function pointInPolygon(
  x: number,
  y: number,
  poly: Array<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Random world point inside an area. */
export function randomPointInCollectArea(
  area: Pick<
    ExplorationCollectAreaView,
    "shape" | "leftPct" | "topPct" | "widthPct" | "heightPct" | "polyPoints"
  >,
  worldW: number,
  worldH: number,
): { x: number; y: number } {
  const left = (area.leftPct / 100) * worldW;
  const top = (area.topPct / 100) * worldH;
  const w = Math.max(4, (area.widthPct / 100) * worldW);
  const h = Math.max(4, (area.heightPct / 100) * worldH);

  if (area.shape === "point") {
    const cx = left + w / 2;
    const cy = top + h / 2;
    const radius = Math.max(72, Math.max(w, h) / 2);
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  }

  if (area.shape === "polygon" && area.polyPoints.length >= 3) {
    const pts = area.polyPoints.map((p) => ({
      x: (p.xPct / 100) * worldW,
      y: (p.yPct / 100) * worldH,
    }));
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    for (let i = 0; i < 40; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      if (pointInPolygon(x, y, pts)) return { x, y };
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  if (area.shape === "circle" || area.shape === "ellipse") {
    const cx = left + w / 2;
    const cy = top + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    return { x: cx + Math.cos(t) * rx * r, y: cy + Math.sin(t) * ry * r };
  }

  return { x: left + Math.random() * w, y: top + Math.random() * h };
}

function pickWeighted<T extends { weight: number }>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + Math.max(0, r.weight), 0);
  if (total <= 0) return rows[0] ?? null;
  let roll = Math.random() * total;
  for (const r of rows) {
    roll -= Math.max(0, r.weight);
    if (roll <= 0) return r;
  }
  return rows[rows.length - 1] ?? null;
}

export function createWorldNodeFromSet(
  area: ExplorationCollectAreaView,
  set: ExplorationItemSetView,
  worldW: number,
  worldH: number,
): ExplorationWorldNode | null {
  const members = set.members.filter((m) => m.item.active);
  if (members.length === 0) return null;
  const picked = pickWeighted(
    members.map((m) => ({ ...m, weight: Math.max(0.01, m.spawnWeight) })),
  );
  if (!picked) return null;
  const pos = randomPointInCollectArea(area, worldW, worldH);
  return {
    id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    areaId: area.id,
    entryId: picked.id,
    x: pos.x,
    y: pos.y,
    hp: Math.max(1, picked.nodeHp),
    maxHp: Math.max(1, picked.nodeHp),
    worldImageUrl: set.imageUrl || picked.item.imageUrl,
    worldImageSizePx: Math.max(16, Math.min(256, set.worldImageSizePx || 48)),
    label: picked.item.name || set.name || "Node",
    requiredToolKind: picked.item.requiredToolKind,
    qty2ChancePct: picked.qty2ChancePct,
    bugBurstChancePct: clamp(area.bugBurstChancePct, 0, 100),
    loot: [{ itemId: picked.itemId, weight: 1, item: picked.item }],
    bugs: [],
  };
}

/** Keep area filled up to maxConcurrent using linked item sets. */
export function refillCollectAreaNodes(
  area: ExplorationCollectAreaView,
  existing: ExplorationWorldNode[],
  worldW: number,
  worldH: number,
): ExplorationWorldNode[] {
  if (!area.active || area.kind !== "COLLECT") return existing;
  const activeSets = area.sets.filter((s) => s.active && s.members.length > 0);
  const others = existing.filter((n) => n.areaId !== area.id);
  if (activeSets.length === 0) return others;

  const next = existing.filter((n) => n.areaId === area.id);
  let guard = 0;
  while (next.length < Math.max(1, area.maxConcurrent) && guard < 40) {
    guard += 1;
    const set = activeSets[Math.floor(Math.random() * activeSets.length)]!;
    const node = createWorldNodeFromSet(area, set, worldW, worldH);
    if (!node) break;
    next.push(node);
  }
  return [...others, ...next];
}

export function rollCollectionSuccess(input: {
  tool: ExplorationToolView | null;
  requiredToolKind: ExplorationToolKind | "";
  wrongToolChancePct: number;
}): boolean {
  const matching = toolMatchesRequired(input.tool, input.requiredToolKind);
  if (!input.tool) {
    return Math.random() * 100 < clamp(input.wrongToolChancePct, 0, 100);
  }
  const chance = matching
    ? clamp(input.tool.collectionChancePct, 0, 100)
    : clamp(input.wrongToolChancePct, 0, 100);
  return Math.random() * 100 < chance;
}

/** Bug catch: matching catch-tool kinds use the tool's collection chance. */
export function rollBugCatchSuccess(input: {
  tool: ExplorationToolView | null;
  bugCatchToolKinds: ExplorationToolKind[];
  wrongToolChancePct: number;
}): boolean {
  if (!input.tool) {
    return Math.random() * 100 < clamp(input.wrongToolChancePct, 0, 100);
  }
  const matching = input.bugCatchToolKinds.includes(input.tool.toolKind);
  const chance = matching
    ? clamp(input.tool.collectionChancePct, 0, 100)
    : clamp(input.wrongToolChancePct, 0, 100);
  return Math.random() * 100 < chance;
}

export function rollLootFromNode(node: ExplorationWorldNode): {
  item: ExplorationItemView;
  quantity: number;
} | null {
  const pick = pickWeighted(node.loot);
  if (!pick) return null;
  const qty = Math.random() * 100 < clamp(node.qty2ChancePct, 0, 100) ? 2 : 1;
  return { item: pick.item, quantity: qty };
}

export function spawnBugBurstFromNode(
  node: ExplorationWorldNode,
  lingerMs: number,
  now = Date.now(),
): ExplorationFleeingBug[] {
  // Legacy path unused — prefer spawnBugsFromOverlappingRoam.
  if (node.bugs.length === 0) return [];
  if (Math.random() * 100 >= clamp(node.bugBurstChancePct, 0, 100)) return [];
  return [];
}

/** True if world point lies inside a collect / roam area. */
export function pointInCollectArea(
  area: ExplorationCollectAreaView,
  x: number,
  y: number,
  worldW: number,
  worldH: number,
): boolean {
  const left = (area.leftPct / 100) * worldW;
  const top = (area.topPct / 100) * worldH;
  const w = (area.widthPct / 100) * worldW;
  const h = (area.heightPct / 100) * worldH;

  // Point pins are editor handles — give ambient bugs a roam disc so they
  // aren't permanently "outside" after the first pixel of movement.
  if (area.shape === "point") {
    const cx = left + w / 2;
    const cy = top + h / 2;
    const radius = Math.max(72, Math.max(w, h) / 2);
    return Math.hypot(x - cx, y - cy) <= radius;
  }

  if (area.shape === "polygon" && area.polyPoints.length >= 3) {
    const pts = area.polyPoints.map((p) => ({
      x: (p.xPct / 100) * worldW,
      y: (p.yPct / 100) * worldH,
    }));
    return pointInPolygon(x, y, pts);
  }
  if (area.shape === "circle" || area.shape === "ellipse") {
    const cx = left + w / 2;
    const cy = top + h / 2;
    const rx = Math.max(1, w / 2);
    const ry = Math.max(1, h / 2);
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }
  return x >= left && x <= left + w && y >= top && y <= top + h;
}

/** Center of a collect / roam area in world pixels (for steering stuck bugs inward). */
export function collectAreaCenter(
  area: ExplorationCollectAreaView,
  worldW: number,
  worldH: number,
): { x: number; y: number } {
  const left = (area.leftPct / 100) * worldW;
  const top = (area.topPct / 100) * worldH;
  const w = Math.max(4, (area.widthPct / 100) * worldW);
  const h = Math.max(4, (area.heightPct / 100) * worldH);

  if (area.shape === "polygon" && area.polyPoints.length >= 3) {
    let sx = 0;
    let sy = 0;
    for (const p of area.polyPoints) {
      sx += (p.xPct / 100) * worldW;
      sy += (p.yPct / 100) * worldH;
    }
    const n = area.polyPoints.length;
    return { x: sx / n, y: sy / n };
  }
  return { x: left + w / 2, y: top + h / 2 };
}

/**
 * Pull a world point back into the collect/roam area along the line to center.
 * Ambient bugs use this to bounce on the edge instead of freezing when a step
 * would leave the roam region.
 */
export function clampPointToCollectArea(
  area: ExplorationCollectAreaView,
  x: number,
  y: number,
  worldW: number,
  worldH: number,
): { x: number; y: number } {
  if (pointInCollectArea(area, x, y, worldW, worldH)) {
    return { x, y };
  }
  const c = collectAreaCenter(area, worldW, worldH);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const mx = c.x + (x - c.x) * mid;
    const my = c.y + (y - c.y) * mid;
    if (pointInCollectArea(area, mx, my, worldW, worldH)) lo = mid;
    else hi = mid;
  }
  const t = Math.max(0, lo * 0.98);
  return {
    x: c.x + (x - c.x) * t,
    y: c.y + (y - c.y) * t,
  };
}

/**
 * Ambient bug step: free movement inside the roam area (no player-sized
 * blocker collision). Soft-clamps at the area edge and turns inward.
 */
export function stepAmbientBugPosition(opts: {
  x: number;
  y: number;
  facingDeg: number;
  distancePx: number;
  area: ExplorationCollectAreaView | null;
  worldW: number;
  worldH: number;
}): { x: number; y: number; facingDeg: number; hitEdge: boolean } {
  const distance = Number.isFinite(opts.distancePx) ? Math.max(0, opts.distancePx) : 0;
  const facing = Number.isFinite(opts.facingDeg) ? opts.facingDeg : 0;
  const rad = (facing * Math.PI) / 180;
  let nx = opts.x + Math.cos(rad) * distance;
  let ny = opts.y + Math.sin(rad) * distance;
  nx = Math.max(4, Math.min(opts.worldW - 4, nx));
  ny = Math.max(4, Math.min(opts.worldH - 4, ny));

  if (!opts.area) {
    return { x: nx, y: ny, facingDeg: facing, hitEdge: false };
  }

  if (pointInCollectArea(opts.area, nx, ny, opts.worldW, opts.worldH)) {
    return { x: nx, y: ny, facingDeg: facing, hitEdge: false };
  }

  const clamped = clampPointToCollectArea(
    opts.area,
    nx,
    ny,
    opts.worldW,
    opts.worldH,
  );
  const c = collectAreaCenter(opts.area, opts.worldW, opts.worldH);
  const inward =
    (Math.atan2(c.y - clamped.y, c.x - clamped.x) * 180) / Math.PI;
  const facingDeg =
    ((inward + (Math.random() - 0.5) * 100) % 360 + 360) % 360;
  return {
    x: clamped.x,
    y: clamped.y,
    facingDeg,
    hitEdge: true,
  };
}

function fleeingFromBug(
  bug: ExplorationBugView,
  x: number,
  y: number,
  now: number,
  lingerMs: number,
  opts?: {
    ambient?: boolean;
    areaId?: string;
    escapeMissesMin?: number;
    escapeMissesMax?: number;
  },
): ExplorationFleeingBug {
  const ang = Math.random() * Math.PI * 2;
  const ambient = Boolean(opts?.ambient);
  const stepDistancePx = Math.max(4, Number(bug.stepDistancePx) || 24);
  // Ambient: spawn on the rolled point. Burst: scatter a bit from the node.
  const scatter = ambient ? 0 : 10 + Math.random() * 24;
  const escapeAfterMisses = rollBugEscapeMisses(
    opts?.escapeMissesMin ?? 2,
    opts?.escapeMissesMax ?? 4,
  );
  return {
    id: `bug-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    bugId: bug.id,
    name: bug.name,
    bugType: bug.bugType,
    imageUrl: bug.imageUrl,
    iconStretch: bug.iconStretch,
    x: x + Math.cos(ang) * scatter,
    y: y + Math.sin(ang) * scatter,
    speedPx: Math.max(10, Number(bug.speedPx) || 90),
    facingDeg: (ang * 180) / Math.PI,
    // Ambient roam bugs stay until caught; burst linger also disabled while testing stuck bugs.
    expiresAt: Number.MAX_SAFE_INTEGER,
    sizePx: bug.sizePx,
    stepDistancePx,
    stepPauseMs: Math.max(0, Number(bug.stepPauseMs) || 0),
    catchToolKinds: bug.catchToolKinds,
    bodyVariant: bug.bodyVariant,
    parts: bug.parts,
    style: bug.style,
    ambient,
    areaId: opts?.areaId,
    stepRemainingPx: stepDistancePx * (0.35 + Math.random() * 0.65),
    pauseUntilMs: Math.random() < 0.35 ? now + Math.round(Math.random() * 180) : 0,
    moveFailCount: 0,
    failedCatches: 0,
    escapeAfterMisses,
    activityPeriod: bug.activityPeriod,
    attractedToClearLight: bug.attractedToClearLight,
    deterredByClearLight: bug.deterredByClearLight,
  };
}

/**
 * After collecting a node: if roll passes area burst %, spawn bugs from any
 * overlapping ROAM_BUG area's bug sets.
 */
export function spawnBugsFromOverlappingRoam(input: {
  node: ExplorationWorldNode;
  collectArea: ExplorationCollectAreaView | null;
  roamAreas: ExplorationCollectAreaView[];
  worldW: number;
  worldH: number;
  lingerMs: number;
  escapeMissesMin?: number;
  escapeMissesMax?: number;
  now?: number;
  isNight?: boolean;
}): ExplorationFleeingBug[] {
  const now = input.now ?? Date.now();
  const chance =
    input.collectArea?.bugBurstChancePct ?? input.node.bugBurstChancePct ?? 0;
  if (Math.random() * 100 >= clamp(chance, 0, 100)) return [];

  const overlaps = input.roamAreas.filter(
    (a) =>
      a.kind === "ROAM_BUG" &&
      a.active &&
      pointInCollectArea(a, input.node.x, input.node.y, input.worldW, input.worldH),
  );
  if (overlaps.length === 0) return [];

  const out: ExplorationFleeingBug[] = [];
  const isNight = input.isNight;
  for (const area of overlaps) {
    const sets = area.bugSets.filter((s) => s.active && s.members.length > 0);
    if (sets.length === 0) continue;
    const set = sets[Math.floor(Math.random() * sets.length)]!;
    const members = set.members.filter(
      (m) =>
        m.bug.active &&
        (isNight === undefined || bugActiveForPeriod(m.bug.activityPeriod, isNight)),
    );
    if (members.length === 0) continue;
    const picked = pickWeighted(
      members.map((m) => ({ ...m, weight: Math.max(0.01, m.spawnWeight) })),
    );
    if (!picked) continue;
    const min = Math.max(1, picked.minCount);
    const max = Math.max(min, picked.maxCount);
    const count = min + Math.floor(Math.random() * (max - min + 1));
    for (let i = 0; i < count; i++) {
      out.push(
        fleeingFromBug(picked.bug, input.node.x, input.node.y, now, input.lingerMs, {
          escapeMissesMin: input.escapeMissesMin,
          escapeMissesMax: input.escapeMissesMax,
        }),
      );
    }
  }
  return out;
}

/** Ambient roam bugs for a ROAM_BUG area (up to maxConcurrent). Returns only new bugs. */
export function refillRoamBugs(
  area: ExplorationCollectAreaView,
  existing: ExplorationFleeingBug[],
  worldW: number,
  worldH: number,
  lingerMs: number,
  opts?: {
    now?: number;
    escapeMissesMin?: number;
    escapeMissesMax?: number;
    /** Reject spawn points that sit in blockers. */
    isBlocked?: (x: number, y: number) => boolean;
    /** When set, only spawn bugs active for this period. */
    isNight?: boolean;
  },
): ExplorationFleeingBug[] {
  if (!area.active || area.kind !== "ROAM_BUG") return [];
  const sets = area.bugSets.filter((s) => s.active && s.members.length > 0);
  if (sets.length === 0) return [];

  const now = opts?.now ?? Date.now();
  const isNight = opts?.isNight;
  const already = existing.filter((b) => b.ambient && b.areaId === area.id).length;
  const target = Math.max(1, area.maxConcurrent);
  const need = Math.max(0, target - already);
  if (need <= 0) return [];

  const next: ExplorationFleeingBug[] = [];
  let guard = 0;
  while (next.length < need && guard < 60) {
    guard += 1;
    const set = sets[Math.floor(Math.random() * sets.length)]!;
    const members = set.members.filter(
      (m) =>
        m.bug.active &&
        (isNight === undefined || bugActiveForPeriod(m.bug.activityPeriod, isNight)),
    );
    if (members.length === 0) break;
    const picked = pickWeighted(
      members.map((m) => ({ ...m, weight: Math.max(0.01, m.spawnWeight) })),
    );
    if (!picked) break;
    const pos = randomPointInCollectArea(area, worldW, worldH);
    if (opts?.isBlocked?.(pos.x, pos.y)) continue;
    next.push(
      fleeingFromBug(picked.bug, pos.x, pos.y, now, lingerMs, {
        ambient: true,
        areaId: area.id,
        escapeMissesMin: opts?.escapeMissesMin,
        escapeMissesMax: opts?.escapeMissesMax,
      }),
    );
  }
  return next;
}

export function isNodeRevealed(
  node: { x: number; y: number },
  player: { x: number; y: number },
  revealDistancePx: number,
): boolean {
  const d = Math.hypot(node.x - player.x, node.y - player.y);
  return d <= Math.max(0, revealDistancePx);
}
