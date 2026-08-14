"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArcadeExplorationZoneBackground } from "@/components/arcade/arcade-exploration-zone-background";
import { uploadExplorationZoneElementImageAction } from "@/app/actions/game-arcade-exploration-admin";
import {
  adminInsetPanelClass,
  adminToolModeClass,
} from "@/lib/admin-surface-classes";
import {
  DEFAULT_ZONE_LIGHT,
  type ExplorationZoneLightConfig,
} from "@/lib/game-exploration-light-shared";
import type {
  ExplorationArtDepth,
  ExplorationElementShape,
  ExplorationPolyPoint,
  ExplorationTeleporterDestination,
  ExplorationZoneElementKind,
  ExplorationZoneOption,
  ExplorationZoneTileView,
} from "@/lib/game-exploration-shared";
import type {
  ExplorationCollectAreaKind,
  ExplorationCollectAreaView,
} from "@/lib/game-exploration-gather-shared";
import type { ExplorationItemSetAdminRow } from "@/lib/game-exploration-item-sets-shared";
import type { ExplorationBugSetAdminRow } from "@/lib/game-exploration-bugs-shared";
import {
  saveCollectAreaAdminAction,
} from "@/app/actions/game-arcade-exploration-collect-admin";
import { GameArcadeExplorationCollectionPanel } from "@/components/settings/game-arcade-exploration-collection-panel";
import {
  boundsFromPolyPoints,
  defaultElementShape,
  EXPLORATION_POLY_MAX_POINTS,
  EXPLORATION_POLY_MIN_POINTS,
  insertPolyPointOnEdge,
  rectToPolyPoints,
  removePolyPoint,
  zoneUsesMapTiles,
} from "@/lib/game-exploration-shared";
import {
  DEFAULT_HOME_STYLE,
  homePlateCss,
} from "@/lib/game-exploration-housing-shared";
import { btnSecondarySm } from "@/lib/btn-theme-classes";

export type ZoneMapElementDraft = {
  id: string;
  kind: ExplorationZoneElementKind;
  label: string;
  nodeKind: string;
  imageUrl: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  teleporter: { destinations: ExplorationTeleporterDestination[] };
  shape: ExplorationElementShape;
  artDepth: ExplorationArtDepth;
  /** Absolute map-% vertices when shape is polygon. */
  polyPoints: ExplorationPolyPoint[];
  /** HOME door / spawn arrow (0 = up). */
  rotateDeg: number;
  /** HOME monthly fee in cents. */
  monthlyFeeCents: number;
  textColor: string;
  textOpacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderOpacity: number;
  /** NPC pin: which catalog NPC stands here. */
  npcId: string;
  /** SIGN dialogue body. */
  dialogueText: string;
  /** MAP_LABEL font size on maps. */
  mapLabelSizePx: number;
  /** LIGHT shine config. */
  zoneLight: ExplorationZoneLightConfig;
  /** REGION optional dehydration rate (pts/sec). */
  dehydrationRatePerSec: number | null;
};

type BuilderTool =
  | ExplorationZoneElementKind
  | "select"
  | "poly-draw"
  | "region-draw"
  | "collect-place"
  | "roam-place"
  | "water-place"
  | "water-poly-draw";

type ZoneEditorLayerId =
  | "map-items"
  | "regions"
  | "buildings"
  | "utilities"
  | "npc"
  | "wild-spawns";

type ZoneEditorLayerDef = {
  id: ZoneEditorLayerId;
  label: string;
  /** Zone element kinds shown/hidden with this layer. */
  kinds: ExplorationZoneElementKind[];
};

const ZONE_EDITOR_LAYERS: ZoneEditorLayerDef[] = [
  {
    id: "map-items",
    label: "Map items",
    kinds: ["NODE", "BLOCKER", "DISMOUNT", "ART", "SIGN"],
  },
  {
    id: "regions",
    label: "Regions",
    kinds: ["REGION", "MAP_LABEL"],
  },
  {
    id: "buildings",
    label: "Buildings",
    kinds: ["TELEPORTER", "STABLE", "STORE", "HOME", "FOUNTAIN"],
  },
  {
    id: "utilities",
    label: "Utilities",
    kinds: ["LIGHT"],
  },
  {
    id: "npc",
    label: "NPC",
    kinds: ["NPC"],
  },
  {
    id: "wild-spawns",
    label: "Wild Spawns",
    kinds: [],
  },
];

function layerIdForKind(kind: ExplorationZoneElementKind): ZoneEditorLayerId {
  for (const layer of ZONE_EDITOR_LAYERS) {
    if (layer.kinds.includes(kind)) return layer.id;
  }
  return "map-items";
}

function defaultLayerVisibility(): Record<ZoneEditorLayerId, boolean> {
  return {
    "map-items": true,
    regions: true,
    buildings: true,
    utilities: true,
    npc: true,
    "wild-spawns": true,
  };
}

const MIN_PIN = 0.15;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 10;
/** Snap distance (% of map) to close a click-to-place polygon on the first corner. */
const POLY_CLOSE_SNAP_PCT = 1.35;

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type DragState = {
  id: string;
  mode: "move" | ResizeEdge | "poly-vertex";
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
  origWidth: number;
  origHeight: number;
  /** NODE circle: resize keeps equal width/height from center. */
  circleResize: boolean;
  /** Index into polyPoints when mode is poly-vertex. */
  polyIndex?: number;
  /** Snapshot of all vertices at drag start (for move / vertex). */
  origPolyPoints?: ExplorationPolyPoint[];
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function defaultSize(kind: ExplorationZoneElementKind): { widthPct: number; heightPct: number } {
  if (kind === "BLOCKER") return { widthPct: 1.5, heightPct: 1.5 };
  if (kind === "DISMOUNT") return { widthPct: 12, heightPct: 12 };
  if (kind === "ART") return { widthPct: 15, heightPct: 15 };
  if (kind === "TELEPORTER") return { widthPct: 8, heightPct: 8 };
  if (kind === "STABLE") return { widthPct: 8, heightPct: 8 };
  if (kind === "HOME") return { widthPct: 10, heightPct: 10 };
  if (kind === "STORE") return { widthPct: 8, heightPct: 8 };
  if (kind === "FOUNTAIN") return { widthPct: 8, heightPct: 8 };
  if (kind === "LIGHT") return { widthPct: 4, heightPct: 4 };
  if (kind === "NPC") return { widthPct: 3, heightPct: 3 };
  if (kind === "SIGN") return { widthPct: 4, heightPct: 4 };
  if (kind === "MAP_LABEL") return { widthPct: 12, heightPct: 4 };
  if (kind === "REGION") return { widthPct: 20, heightPct: 20 };
  return { widthPct: 6, heightPct: 6 };
}

function defaultLabel(kind: ExplorationZoneElementKind): string {
  if (kind === "NODE") return "Node";
  if (kind === "BLOCKER") return "Blocker";
  if (kind === "DISMOUNT") return "Town dismount";
  if (kind === "TELEPORTER") return "Teleporter";
  if (kind === "STABLE") return "Stable";
  if (kind === "HOME") return "House";
  if (kind === "STORE") return "Store";
  if (kind === "FOUNTAIN") return "Fountain";
  if (kind === "LIGHT") return "Light";
  if (kind === "NPC") return "NPC";
  if (kind === "SIGN") return "Sign";
  if (kind === "MAP_LABEL") return "Area name";
  if (kind === "REGION") return "Region";
  return "Art";
}

export function createZoneMapElement(
  kind: ExplorationZoneElementKind,
  leftPct = 40,
  topPct = 40,
): ZoneMapElementDraft {
  const size = defaultSize(kind);
  return {
    id: `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    label: defaultLabel(kind),
    nodeKind: kind === "NODE" ? "forage" : "",
    imageUrl: "",
    leftPct: clamp(leftPct - size.widthPct / 2, 0, 100 - size.widthPct),
    topPct: clamp(topPct - size.heightPct / 2, 0, 100 - size.heightPct),
    widthPct: size.widthPct,
    heightPct: size.heightPct,
    teleporter: { destinations: [] },
    shape: defaultElementShape(kind),
    artDepth: kind === "ART" ? "ysort" : "ground",
    polyPoints: [],
    rotateDeg: 0,
    monthlyFeeCents: kind === "HOME" ? 5000 : 0,
    npcId: "",
    dialogueText: kind === "SIGN" ? "Read the sign…" : "",
    mapLabelSizePx: 12,
    zoneLight: kind === "LIGHT" ? { ...DEFAULT_ZONE_LIGHT } : { ...DEFAULT_ZONE_LIGHT },
    dehydrationRatePerSec: null,
    ...DEFAULT_HOME_STYLE,
  };
}

function boundsFromLoosePolyPoints(points: ExplorationPolyPoint[]): {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
} {
  if (points.length >= EXPLORATION_POLY_MIN_POINTS) return boundsFromPolyPoints(points);
  if (points.length === 0) {
    return { leftPct: 40, topPct: 40, widthPct: 1, heightPct: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.xPct);
    minY = Math.min(minY, p.yPct);
    maxX = Math.max(maxX, p.xPct);
    maxY = Math.max(maxY, p.yPct);
  }
  const pad = 0.4;
  const leftPct = Math.max(0, minX - pad);
  const topPct = Math.max(0, minY - pad);
  const widthPct = Math.min(100 - leftPct, Math.max(MIN_PIN, maxX - minX + pad * 2));
  const heightPct = Math.min(100 - topPct, Math.max(MIN_PIN, maxY - minY + pad * 2));
  return { leftPct, topPct, widthPct, heightPct };
}

function nearPolyPoint(a: ExplorationPolyPoint, b: ExplorationPolyPoint, snap = POLY_CLOSE_SNAP_PCT) {
  return Math.hypot(a.xPct - b.xPct, a.yPct - b.yPct) <= snap;
}

function applyResize(drag: DragState, dx: number, dy: number): Pick<
  ZoneMapElementDraft,
  "leftPct" | "topPct" | "widthPct" | "heightPct"
> {
  let left = drag.origLeft;
  let top = drag.origTop;
  let width = drag.origWidth;
  let height = drag.origHeight;
  const mode = drag.mode;

  if (mode.includes("e")) {
    width = clamp(drag.origWidth + dx, MIN_PIN, 100 - drag.origLeft);
  }
  if (mode.includes("s")) {
    height = clamp(drag.origHeight + dy, MIN_PIN, 100 - drag.origTop);
  }
  if (mode.includes("w")) {
    const nextWidth = clamp(drag.origWidth - dx, MIN_PIN, drag.origLeft + drag.origWidth);
    left = drag.origLeft + drag.origWidth - nextWidth;
    width = nextWidth;
  }
  if (mode.includes("n")) {
    const nextHeight = clamp(drag.origHeight - dy, MIN_PIN, drag.origTop + drag.origHeight);
    top = drag.origTop + drag.origHeight - nextHeight;
    height = nextHeight;
  }

  left = clamp(left, 0, 100 - width);
  top = clamp(top, 0, 100 - height);
  return { leftPct: left, topPct: top, widthPct: width, heightPct: height };
}

/** Uniform diameter resize from center (keeps circle circular). */
function applyCircleResize(
  drag: DragState,
  dx: number,
  dy: number,
): Pick<ZoneMapElementDraft, "leftPct" | "topPct" | "widthPct" | "heightPct"> {
  const mode = drag.mode;
  let fromX = 0;
  let fromY = 0;
  if (mode.includes("e")) fromX = dx;
  if (mode.includes("w")) fromX = -dx;
  if (mode.includes("s")) fromY = dy;
  if (mode.includes("n")) fromY = -dy;
  const delta = mode.length === 2 ? (fromX + fromY) / 2 : fromX !== 0 ? fromX : fromY;

  const cx = drag.origLeft + drag.origWidth / 2;
  const cy = drag.origTop + drag.origHeight / 2;
  const nextSize = clamp(drag.origWidth + delta, MIN_PIN, 100);
  const half = nextSize / 2;
  const left = clamp(cx - half, 0, 100 - nextSize);
  const top = clamp(cy - half, 0, 100 - nextSize);
  return { leftPct: left, topPct: top, widthPct: nextSize, heightPct: nextSize };
}

function toCircleBounds(el: ZoneMapElementDraft): Pick<
  ZoneMapElementDraft,
  "leftPct" | "topPct" | "widthPct" | "heightPct"
> {
  const size = Math.min(el.widthPct, el.heightPct);
  const cx = el.leftPct + el.widthPct / 2;
  const cy = el.topPct + el.heightPct / 2;
  const left = clamp(cx - size / 2, 0, 100 - size);
  const top = clamp(cy - size / 2, 0, 100 - size);
  return { leftPct: left, topPct: top, widthPct: size, heightPct: size };
}

const EDGE_HANDLES: { edge: ResizeEdge; className: string; cursor: string }[] = [
  { edge: "n", className: "left-2 right-2 top-0 h-2 -translate-y-1/2", cursor: "ns-resize" },
  { edge: "s", className: "left-2 right-2 bottom-0 h-2 translate-y-1/2", cursor: "ns-resize" },
  { edge: "e", className: "top-2 bottom-2 right-0 w-2 translate-x-1/2", cursor: "ew-resize" },
  { edge: "w", className: "top-2 bottom-2 left-0 w-2 -translate-x-1/2", cursor: "ew-resize" },
  { edge: "nw", className: "left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
  { edge: "ne", className: "right-0 top-0 h-2.5 w-2.5 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
  { edge: "sw", className: "left-0 bottom-0 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  { edge: "se", className: "right-0 bottom-0 h-2.5 w-2.5 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
];

const CIRCLE_EDGE_HANDLES: { edge: ResizeEdge; className: string; cursor: string }[] = [
  { edge: "n", className: "left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
  { edge: "s", className: "left-1/2 bottom-0 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
  { edge: "e", className: "right-0 top-1/2 h-2.5 w-2.5 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { edge: "w", className: "left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

function elementBorderClass(kind: ExplorationZoneElementKind): string {
  if (kind === "BLOCKER") return "border-coral bg-coral/35";
  if (kind === "DISMOUNT") return "border-sky-400 bg-sky-400/30";
  if (kind === "ART") return "border-mango bg-mango/20";
  if (kind === "TELEPORTER") return "border-violet-300 bg-violet-500/40";
  if (kind === "STABLE") return "border-amber-500 bg-amber-600/40";
  if (kind === "HOME") return "border-rose-400 bg-rose-500/35";
  if (kind === "STORE") return "border-emerald-500 bg-emerald-600/40";
  if (kind === "FOUNTAIN") return "border-cyan-500 bg-cyan-600/40";
  if (kind === "LIGHT") return "border-yellow-300 bg-yellow-400/45";
  if (kind === "NPC") return "border-sky-400 bg-sky-500/55";
  if (kind === "SIGN") return "border-amber-700 bg-amber-500/45";
  if (kind === "MAP_LABEL") return "border-sky-500 bg-sky-400/20";
  if (kind === "REGION") return "border-teal-500 bg-teal-400/25";
  return "border-lagoon bg-lagoon/35";
}

function polygonFillStroke(kind: ExplorationZoneElementKind): { fill: string; stroke: string } {
  if (kind === "BLOCKER") return { fill: "rgba(239, 71, 111, 0.35)", stroke: "#ef476f" };
  if (kind === "DISMOUNT") return { fill: "rgba(56, 189, 248, 0.3)", stroke: "#38bdf8" };
  if (kind === "ART") return { fill: "rgba(249, 168, 37, 0.25)", stroke: "#f9a825" };
  if (kind === "TELEPORTER") return { fill: "rgba(139, 92, 246, 0.4)", stroke: "#8b5cf6" };
  if (kind === "STABLE") return { fill: "rgba(217, 119, 6, 0.4)", stroke: "#d97706" };
  if (kind === "HOME") return { fill: "rgba(251, 113, 133, 0.35)", stroke: "#fb7185" };
  if (kind === "STORE") return { fill: "rgba(16, 185, 129, 0.4)", stroke: "#10b981" };
  if (kind === "FOUNTAIN") return { fill: "rgba(6, 182, 212, 0.42)", stroke: "#06b6d4" };
  if (kind === "LIGHT") return { fill: "rgba(250, 204, 21, 0.45)", stroke: "#facc15" };
  if (kind === "NPC") return { fill: "rgba(14, 165, 233, 0.5)", stroke: "#0ea5e9" };
  if (kind === "REGION") return { fill: "rgba(20, 184, 166, 0.28)", stroke: "#14b8a6" };
  return { fill: "rgba(45, 212, 191, 0.35)", stroke: "#2dd4bf" };
}

function collectAreaPolyColors(
  kind: ExplorationCollectAreaView["kind"],
): { fill: string; stroke: string } {
  if (kind === "ROAM_BUG") return { fill: "rgba(132, 204, 22, 0.28)", stroke: "#84cc16" };
  if (kind === "WATER") return { fill: "rgba(34, 211, 238, 0.32)", stroke: "#22d3ee" };
  return { fill: "rgba(245, 158, 11, 0.3)", stroke: "#f59e0b" };
}

type CollectDragState = {
  id: string;
  mode: "move" | ResizeEdge | "poly-vertex";
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
  origWidth: number;
  origHeight: number;
  circleResize: boolean;
  origPolyPoints?: ExplorationCollectAreaView["polyPoints"];
  polyIndex?: number;
};

type SpawnDragState = {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
};

type Props = {
  zoneId: string;
  backgroundImageUrl: string;
  worldWidthPx: number;
  worldHeightPx: number;
  tileCols?: number;
  tileRows?: number;
  tileWidthPx?: number;
  tileHeightPx?: number;
  tiles?: ExplorationZoneTileView[];
  overheadImageUrl?: string;
  spawnXPct: number;
  spawnYPct: number;
  onSpawnChange: (spawnXPct: number, spawnYPct: number) => void;
  elements: ZoneMapElementDraft[];
  setElements: Dispatch<SetStateAction<ZoneMapElementDraft[]>>;
  /** Other zones available as teleporter destinations. */
  zoneOptions: ExplorationZoneOption[];
  /** Active NPCs for NPC pin dropdown. */
  npcOptions?: Array<{ id: string; name: string }>;
  /** Wild spawn / collect areas for this zone. */
  collectAreas?: ExplorationCollectAreaView[];
  onCollectAreasChange?: (areas: ExplorationCollectAreaView[]) => void;
  /** Catalog of item sets for wild-spawn multi-select. */
  itemSets?: ExplorationItemSetAdminRow[];
  /** Catalog of bug sets for roam areas. */
  bugSets?: ExplorationBugSetAdminRow[];
  pending?: boolean;
  onUploadError?: (message: string) => void;
};

export function GameExplorationZoneMapBuilder({
  zoneId,
  backgroundImageUrl,
  worldWidthPx,
  worldHeightPx,
  tileCols = 0,
  tileRows = 0,
  tileWidthPx = 0,
  tileHeightPx = 0,
  tiles = [],
  overheadImageUrl = "",
  spawnXPct,
  spawnYPct,
  onSpawnChange,
  elements,
  setElements,
  zoneOptions,
  npcOptions = [],
  collectAreas = [],
  onCollectAreasChange,
  itemSets = [],
  bugSets = [],
  pending = false,
  onUploadError,
}: Props) {
  const mapBackdrop = {
    backgroundImageUrl,
    overheadImageUrl,
    worldWidthPx,
    worldHeightPx,
    tileCols,
    tileRows,
    tileWidthPx,
    tileHeightPx,
    tiles,
  };
  const hasMapArt = Boolean(backgroundImageUrl) || zoneUsesMapTiles(mapBackdrop);
  const aspect = zoneUsesMapTiles(mapBackdrop)
    ? (tileCols * tileWidthPx) / (tileRows * tileHeightPx)
    : worldWidthPx > 0 && worldHeightPx > 0
      ? worldWidthPx / worldHeightPx
      : 16 / 10;
  const mapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const [tool, setTool] = useState<BuilderTool>("select");
  const [activeLayer, setActiveLayer] = useState<ZoneEditorLayerId>("map-items");
  const [layerVisible, setLayerVisible] = useState(defaultLayerVisibility);
  const [polyDrawId, setPolyDrawId] = useState<string | null>(null);
  const [waterPolyDrawId, setWaterPolyDrawId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusCollectId, setFocusCollectId] = useState<string | null>(null);
  const [placingCollect, setPlacingCollect] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  zoomRef.current = zoom;
  const [draggingSpawn, setDraggingSpawn] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    elementId: string;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const collectDragRef = useRef<CollectDragState | null>(null);
  const collectAreasRef = useRef(collectAreas);
  collectAreasRef.current = collectAreas;
  const onCollectAreasChangeRef = useRef(onCollectAreasChange);
  onCollectAreasChangeRef.current = onCollectAreasChange;
  const persistCollectAreaGeometryRef = useRef<
    (area: ExplorationCollectAreaView) => Promise<void>
  >(async () => undefined);
  const spawnDragRef = useRef<SpawnDragState | null>(null);
  const onSpawnChangeRef = useRef(onSpawnChange);
  onSpawnChangeRef.current = onSpawnChange;

  const focus = elements.find((el) => el.id === focusId) ?? null;
  const focusCollect = collectAreas.find((a) => a.id === focusCollectId) ?? null;
  const destinationChoices = zoneOptions.filter((z) => z.id !== zoneId);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const rect = map.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const spawnDrag = spawnDragRef.current;
      if (spawnDrag) {
        const dx = ((e.clientX - spawnDrag.startX) / rect.width) * 100;
        const dy = ((e.clientY - spawnDrag.startY) / rect.height) * 100;
        onSpawnChangeRef.current(
          clamp(Math.round((spawnDrag.origX + dx) * 10) / 10, 0, 100),
          clamp(Math.round((spawnDrag.origY + dy) * 10) / 10, 0, 100),
        );
        return;
      }

      const collectDrag = collectDragRef.current;
      if (collectDrag) {
        const dx = ((e.clientX - collectDrag.startX) / rect.width) * 100;
        const dy = ((e.clientY - collectDrag.startY) / rect.height) * 100;
        const area = collectAreasRef.current.find((a) => a.id === collectDrag.id);
        if (area?.shape === "polygon" && collectDrag.mode === "poly-vertex" && collectDrag.polyIndex != null && collectDrag.origPolyPoints) {
          const nextPoints = collectDrag.origPolyPoints.map((p, i) =>
            i === collectDrag.polyIndex
              ? {
                  xPct: clamp(p.xPct + dx, 0, 100),
                  yPct: clamp(p.yPct + dy, 0, 100),
                }
              : p,
          );
          onCollectAreasChangeRef.current?.(
            collectAreasRef.current.map((a) =>
              a.id === collectDrag.id
                ? { ...a, polyPoints: nextPoints, ...boundsFromPolyPoints(nextPoints) }
                : a,
            ),
          );
          return;
        }
        if (area?.shape === "polygon" && collectDrag.mode === "move" && collectDrag.origPolyPoints) {
          const nextPoints = collectDrag.origPolyPoints.map((p) => ({
            xPct: clamp(p.xPct + dx, 0, 100),
            yPct: clamp(p.yPct + dy, 0, 100),
          }));
          onCollectAreasChangeRef.current?.(
            collectAreasRef.current.map((a) =>
              a.id === collectDrag.id
                ? { ...a, polyPoints: nextPoints, ...boundsFromPolyPoints(nextPoints) }
                : a,
            ),
          );
          return;
        }
        const asElementDrag: DragState = {
          id: collectDrag.id,
          mode: collectDrag.mode,
          startX: collectDrag.startX,
          startY: collectDrag.startY,
          origLeft: collectDrag.origLeft,
          origTop: collectDrag.origTop,
          origWidth: collectDrag.origWidth,
          origHeight: collectDrag.origHeight,
          circleResize: collectDrag.circleResize,
        };
        const nextBounds =
          collectDrag.mode === "move"
            ? {
                leftPct: clamp(collectDrag.origLeft + dx, 0, 100 - collectDrag.origWidth),
                topPct: clamp(collectDrag.origTop + dy, 0, 100 - collectDrag.origHeight),
                widthPct: collectDrag.origWidth,
                heightPct: collectDrag.origHeight,
              }
            : collectDrag.circleResize
              ? applyCircleResize(asElementDrag, dx, dy)
              : applyResize(asElementDrag, dx, dy);
        const rounded = {
          leftPct: Math.round(nextBounds.leftPct * 10) / 10,
          topPct: Math.round(nextBounds.topPct * 10) / 10,
          widthPct: Math.round(nextBounds.widthPct * 10) / 10,
          heightPct: Math.round(nextBounds.heightPct * 10) / 10,
        };
        onCollectAreasChangeRef.current?.(
          collectAreasRef.current.map((a) =>
            a.id === collectDrag.id ? { ...a, ...rounded } : a,
          ),
        );
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;
      const dx = ((e.clientX - drag.startX) / rect.width) * 100;
      const dy = ((e.clientY - drag.startY) / rect.height) * 100;
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== drag.id) return el;
          if (drag.mode === "poly-vertex" && drag.polyIndex != null && drag.origPolyPoints) {
            const nextPoints = drag.origPolyPoints.map((p, i) =>
              i === drag.polyIndex
                ? {
                    xPct: clamp(p.xPct + dx, 0, 100),
                    yPct: clamp(p.yPct + dy, 0, 100),
                  }
                : p,
            );
            return { ...el, polyPoints: nextPoints, ...boundsFromPolyPoints(nextPoints) };
          }
          if (drag.mode === "move") {
            if (el.shape === "polygon" && drag.origPolyPoints && drag.origPolyPoints.length >= 3) {
              const nextPoints = drag.origPolyPoints.map((p) => ({
                xPct: clamp(p.xPct + dx, 0, 100),
                yPct: clamp(p.yPct + dy, 0, 100),
              }));
              return { ...el, polyPoints: nextPoints, ...boundsFromPolyPoints(nextPoints) };
            }
            return {
              ...el,
              leftPct: clamp(drag.origLeft + dx, 0, 100 - el.widthPct),
              topPct: clamp(drag.origTop + dy, 0, 100 - el.heightPct),
            };
          }
          if (drag.circleResize) {
            return { ...el, ...applyCircleResize(drag, dx, dy) };
          }
          return { ...el, ...applyResize(drag, dx, dy) };
        }),
      );
    };
    const onUp = () => {
      const collectDrag = collectDragRef.current;
      if (collectDrag) {
        collectDragRef.current = null;
        const area = collectAreasRef.current.find((a) => a.id === collectDrag.id);
        if (area) void persistCollectAreaGeometryRef.current(area);
      }
      dragRef.current = null;
      if (spawnDragRef.current) {
        spawnDragRef.current = null;
        setDraggingSpawn(false);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setElements]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const bumpZoom = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const scroller = scrollRef.current;
    const prevZoom = zoomRef.current;
    const nextZoom = clamp(Math.round(prevZoom * factor * 100) / 100, ZOOM_MIN, ZOOM_MAX);
    if (nextZoom === prevZoom) return;

    if (scroller && clientX != null && clientY != null) {
      const rect = scroller.getBoundingClientRect();
      const offsetX = clientX - rect.left + scroller.scrollLeft;
      const offsetY = clientY - rect.top + scroller.scrollTop;
      const ratio = nextZoom / prevZoom;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        scroller.scrollLeft = offsetX * ratio - (clientX - rect.left);
        scroller.scrollTop = offsetY * ratio - (clientY - rect.top);
      });
      return;
    }
    setZoom(nextZoom);
  }, []);

  /** Wheel must use a non-passive listener so preventDefault blocks scroll. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      bumpZoom(e.deltaY > 0 ? 0.9 : 1.1, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bumpZoom]);

  function placeAtClick(e: React.MouseEvent) {
    if (tool === "select" || !mapRef.current) return;
    // Allow placing poly corners even when clicking empty map; vertex handles stop propagation.
    if (
      tool !== "poly-draw" &&
      tool !== "region-draw" &&
      tool !== "water-poly-draw" &&
      (e.target as HTMLElement).closest("[data-zone-el]")
    ) {
      return;
    }
    const rect = mapRef.current.getBoundingClientRect();
    const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);

    if (tool === "collect-place" || tool === "roam-place" || tool === "water-place") {
      void placeCollectAreaAt(
        tool === "roam-place" ? "ROAM_BUG" : tool === "water-place" ? "WATER" : "COLLECT",
        xPct,
        yPct,
      );
      return;
    }

    if (tool === "water-poly-draw") {
      const clickPt = { xPct, yPct };
      const drawing = waterPolyDrawId
        ? collectAreasRef.current.find((a) => a.id === waterPolyDrawId)
        : null;

      if (!drawing) {
        void createWaterPolyArea(clickPt);
        return;
      }

      const pts = drawing.polyPoints.length > 0 ? drawing.polyPoints : [];
      if (
        pts.length >= EXPLORATION_POLY_MIN_POINTS &&
        nearPolyPoint(clickPt, pts[0]!)
      ) {
        const closed = { ...drawing, shape: "polygon" as const, polyPoints: pts };
        onCollectAreasChangeRef.current?.(
          collectAreasRef.current.map((a) => (a.id === drawing.id ? closed : a)),
        );
        void persistCollectAreaGeometryRef.current(closed);
        setWaterPolyDrawId(null);
        setFocusCollectId(drawing.id);
        setTool("select");
        return;
      }

      const polyPoints = [...pts, clickPt];
      const bounds = boundsFromLoosePolyPoints(polyPoints);
      const next = {
        ...drawing,
        shape: "polygon" as const,
        polyPoints,
        ...bounds,
      };
      onCollectAreasChangeRef.current?.(
        collectAreasRef.current.map((a) => (a.id === drawing.id ? next : a)),
      );
      return;
    }

    if (tool === "poly-draw" || tool === "region-draw") {
      const polyKind: ExplorationZoneElementKind =
        tool === "region-draw" ? "REGION" : "BLOCKER";
      const clickPt = { xPct, yPct };
      const drawing = polyDrawId ? elements.find((el) => el.id === polyDrawId) : null;

      if (!drawing) {
        const el = createZoneMapElement(polyKind, xPct, yPct);
        const polyPoints = [clickPt];
        const bounds = boundsFromLoosePolyPoints(polyPoints);
        const next = {
          ...el,
          shape: "polygon" as const,
          polyPoints,
          ...bounds,
          label: defaultLabel(polyKind),
        };
        setElements((prev) => [...prev, next]);
        setFocusId(next.id);
        setPolyDrawId(next.id);
        return;
      }

      const pts = drawing.polyPoints.length > 0 ? drawing.polyPoints : [];
      if (
        pts.length >= EXPLORATION_POLY_MIN_POINTS &&
        nearPolyPoint(pts[0]!, clickPt)
      ) {
        const bounds = boundsFromPolyPoints(pts);
        setElements((prev) =>
          prev.map((el) => (el.id === drawing.id ? { ...el, ...bounds } : el)),
        );
        setPolyDrawId(null);
        setTool("select");
        setFocusId(drawing.id);
        return;
      }

      if (pts.length >= EXPLORATION_POLY_MAX_POINTS) return;
      const polyPoints = [...pts, clickPt];
      const bounds = boundsFromLoosePolyPoints(polyPoints);
      setElements((prev) =>
        prev.map((el) =>
          el.id === drawing.id
            ? { ...el, shape: "polygon", polyPoints, ...bounds }
            : el,
        ),
      );
      return;
    }

    const el = createZoneMapElement(tool, xPct, yPct);
    setElements((prev) => [...prev, el]);
    setFocusId(el.id);
    setTool("select");
  }

  async function createWaterPolyArea(firstPt: { xPct: number; yPct: number }) {
    if (placingCollect) return;
    setPlacingCollect(true);
    const polyPoints = [firstPt];
    const bounds = boundsFromLoosePolyPoints(polyPoints);
    const res = await saveCollectAreaAdminAction({
      zoneId,
      kind: "WATER",
      name: "Water area",
      shape: "polygon",
      leftPct: bounds.leftPct,
      topPct: bounds.topPct,
      widthPct: bounds.widthPct,
      heightPct: bounds.heightPct,
      polyPoints,
      maxConcurrent: 3,
      active: true,
      sortOrder: collectAreas.length,
      setIds: [],
      bugSetIds: [],
    });
    setPlacingCollect(false);
    if (!res.ok) {
      onUploadError?.(res.error);
      return;
    }
    const next = [...collectAreas.filter((a) => a.id !== res.area.id), res.area];
    onCollectAreasChange?.(next);
    setWaterPolyDrawId(res.area.id);
    setFocusCollectId(res.area.id);
    setFocusId(null);
  }

  async function placeCollectAreaAt(
    kind: ExplorationCollectAreaKind,
    xPct: number,
    yPct: number,
  ) {
    if (placingCollect) return;
    setPlacingCollect(true);
    const widthPct = 14;
    const heightPct = 14;
    const leftPct = clamp(xPct - widthPct / 2, 0, 100 - widthPct);
    const topPct = clamp(yPct - heightPct / 2, 0, 100 - heightPct);
    const res = await saveCollectAreaAdminAction({
      zoneId,
      kind,
      name:
        kind === "ROAM_BUG"
          ? "Roam bugs"
          : kind === "WATER"
            ? "Water (beach refill)"
            : "Collect area",
      shape: "square",
      leftPct,
      topPct,
      widthPct,
      heightPct,
      maxConcurrent: 3,
      bugBurstChancePct: kind === "COLLECT" ? 40 : 0,
      active: true,
      sortOrder: collectAreas.length,
      setIds: [],
      bugSetIds: [],
    });
    setPlacingCollect(false);
    if (!res.ok) {
      onUploadError?.(res.error);
      return;
    }
    const next = [...collectAreas.filter((a) => a.id !== res.area.id), res.area];
    onCollectAreasChange?.(next);
    setFocusCollectId(res.area.id);
    setFocusId(null);
    setTool("select");
  }

  async function persistCollectAreaGeometry(area: ExplorationCollectAreaView) {
    const res = await saveCollectAreaAdminAction({
      id: area.id,
      zoneId: area.zoneId || zoneId,
      kind: area.kind,
      name: area.name,
      shape: area.shape,
      leftPct: area.leftPct,
      topPct: area.topPct,
      widthPct: area.widthPct,
      heightPct: area.heightPct,
      polyPoints: area.polyPoints,
      maxConcurrent: area.maxConcurrent,
      bugBurstChancePct: area.bugBurstChancePct ?? 0,
      active: area.active,
      sortOrder: area.sortOrder,
      setIds: area.sets.map((s) => s.id),
      bugSetIds: (area.bugSets ?? []).map((s) => s.id),
      water: area.water ?? undefined,
    });
    if (!res.ok) {
      onUploadError?.(res.error);
      return;
    }
    onCollectAreasChange?.(
      collectAreasRef.current.map((a) => (a.id === res.area.id ? res.area : a)),
    );
  }

  persistCollectAreaGeometryRef.current = persistCollectAreaGeometry;

  function startCollectDrag(
    area: ExplorationCollectAreaView,
    mode: CollectDragState["mode"],
    e: React.PointerEvent,
    polyIndex?: number,
  ) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    spawnDragRef.current = null;
    dragRef.current = null;
    setDraggingSpawn(false);
    setActiveLayer("wild-spawns");
    setFocusCollectId(area.id);
    setFocusId(null);
    setTool("select");
    const circleResize = mode !== "move" && area.shape === "circle";
    let leftPct = area.leftPct;
    let topPct = area.topPct;
    let widthPct = area.widthPct;
    let heightPct = area.heightPct;
    if (circleResize && Math.abs(widthPct - heightPct) > 0.05) {
      const size = Math.min(widthPct, heightPct);
      const cx = leftPct + widthPct / 2;
      const cy = topPct + heightPct / 2;
      leftPct = clamp(cx - size / 2, 0, 100 - size);
      topPct = clamp(cy - size / 2, 0, 100 - size);
      widthPct = size;
      heightPct = size;
      onCollectAreasChange?.(
        collectAreas.map((a) =>
          a.id === area.id ? { ...a, leftPct, topPct, widthPct, heightPct } : a,
        ),
      );
    }
    collectDragRef.current = {
      id: area.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: leftPct,
      origTop: topPct,
      origWidth: widthPct,
      origHeight: heightPct,
      circleResize,
      origPolyPoints:
        area.shape === "polygon" && area.polyPoints.length >= 3 ? area.polyPoints : undefined,
      polyIndex,
    };
  }

  async function applyCollectShape(
    areaId: string,
    shape: ExplorationCollectAreaView["shape"],
  ) {
    const area = collectAreas.find((a) => a.id === areaId);
    if (!area || area.shape === shape) return;
    let next: ExplorationCollectAreaView = { ...area, shape };
    if (shape === "circle") {
      const size = Math.min(area.widthPct, area.heightPct);
      const cx = area.leftPct + area.widthPct / 2;
      const cy = area.topPct + area.heightPct / 2;
      next = {
        ...next,
        leftPct: clamp(cx - size / 2, 0, 100 - size),
        topPct: clamp(cy - size / 2, 0, 100 - size),
        widthPct: size,
        heightPct: size,
        polyPoints: [],
      };
    } else if (shape === "point") {
      next = {
        ...next,
        widthPct: Math.max(2, Math.min(area.widthPct, 4)),
        heightPct: Math.max(2, Math.min(area.heightPct, 4)),
        polyPoints: [],
      };
    } else if (shape !== "polygon") {
      next = { ...next, polyPoints: [] };
    } else if (next.polyPoints.length < 3) {
      next = {
        ...next,
        polyPoints: [
          { xPct: next.leftPct, yPct: next.topPct },
          { xPct: next.leftPct + next.widthPct, yPct: next.topPct },
          {
            xPct: next.leftPct + next.widthPct,
            yPct: next.topPct + next.heightPct,
          },
          { xPct: next.leftPct, yPct: next.topPct + next.heightPct },
        ],
      };
    }
    onCollectAreasChange?.(collectAreas.map((a) => (a.id === areaId ? next : a)));
    await persistCollectAreaGeometry(next);
  }

  function selectLayer(layerId: ZoneEditorLayerId) {
    setActiveLayer(layerId);
    setTool("select");
    setPolyDrawId(null);
    setWaterPolyDrawId(null);
    if (layerId !== "wild-spawns") setFocusCollectId(null);
  }

  function toggleLayerVisible(layerId: ZoneEditorLayerId, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setLayerVisible((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  }

  function isElementVisible(el: ZoneMapElementDraft): boolean {
    return layerVisible[layerIdForKind(el.kind)] !== false;
  }

  function beginPolyDrawMode(kind: "BLOCKER" | "REGION" = "BLOCKER") {
    setTool(kind === "REGION" ? "region-draw" : "poly-draw");
    const focus = focusId ? elements.find((el) => el.id === focusId) : null;
    const canReuse =
      focus &&
      (focus.kind === kind ||
        (kind === "BLOCKER" && focus.kind === "BLOCKER") ||
        (kind === "REGION" && focus.kind === "REGION") ||
        focus.shape === "polygon");
    if (focus && canReuse) {
      const cx = focus.leftPct + focus.widthPct / 2;
      const cy = focus.topPct + focus.heightPct / 2;
      const polyPoints = [{ xPct: cx, yPct: cy }];
      const bounds = boundsFromLoosePolyPoints(polyPoints);
      setElements((prev) =>
        prev.map((el) =>
          el.id === focus.id
            ? {
                ...el,
                kind,
                shape: "polygon",
                polyPoints,
                ...bounds,
                label: el.label.trim() || defaultLabel(kind),
              }
            : el,
        ),
      );
      setPolyDrawId(focus.id);
    } else {
      setPolyDrawId(null);
    }
  }

  function startDrag(el: ZoneMapElementDraft, mode: DragState["mode"], e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    spawnDragRef.current = null;
    setDraggingSpawn(false);
    setFocusId(el.id);
    const circleResize = mode !== "move" && mode !== "poly-vertex" && el.shape === "circle";
    // Ellipse and square: free width/height. Circle only: lock aspect.
    const bounds =
      circleResize && Math.abs(el.widthPct - el.heightPct) > 0.05
        ? toCircleBounds(el)
        : {
            leftPct: el.leftPct,
            topPct: el.topPct,
            widthPct: el.widthPct,
            heightPct: el.heightPct,
          };
    if (circleResize && bounds.widthPct !== el.widthPct) {
      setElements((prev) => prev.map((row) => (row.id === el.id ? { ...row, ...bounds } : row)));
    }
    dragRef.current = {
      id: el.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: bounds.leftPct,
      origTop: bounds.topPct,
      origWidth: bounds.widthPct,
      origHeight: bounds.heightPct,
      circleResize,
      origPolyPoints:
        el.shape === "polygon" && el.polyPoints.length >= 3
          ? el.polyPoints.map((p) => ({ ...p }))
          : undefined,
    };
  }

  function startPolyVertexDrag(
    el: ZoneMapElementDraft,
    index: number,
    e: React.PointerEvent,
  ) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    setFocusId(el.id);
    const points =
      el.polyPoints.length >= 3 ? el.polyPoints : rectToPolyPoints(el);
    dragRef.current = {
      id: el.id,
      mode: "poly-vertex",
      startX: e.clientX,
      startY: e.clientY,
      origLeft: el.leftPct,
      origTop: el.topPct,
      origWidth: el.widthPct,
      origHeight: el.heightPct,
      circleResize: false,
      polyIndex: index,
      origPolyPoints: points.map((p) => ({ ...p })),
    };
  }

  function convertFocusToPolygon() {
    if (!focus) return;
    const polyPoints =
      focus.polyPoints.length >= EXPLORATION_POLY_MIN_POINTS
        ? focus.polyPoints
        : rectToPolyPoints(focus);
    const bounds = boundsFromPolyPoints(polyPoints);
    setElements((prev) =>
      prev.map((el) =>
        el.id === focus.id ? { ...el, shape: "polygon", polyPoints, ...bounds } : el,
      ),
    );
  }

  function addCornerOnLongestEdge() {
    if (!focus || focus.shape !== "polygon") return;
    if (focus.polyPoints.length >= EXPLORATION_POLY_MAX_POINTS) return;
    const pts = focus.polyPoints;
    let best = 0;
    let bestLen = -1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      const len = Math.hypot(b.xPct - a.xPct, b.yPct - a.yPct);
      if (len > bestLen) {
        bestLen = len;
        best = i;
      }
    }
    const next = insertPolyPointOnEdge(pts, best);
    setElements((prev) =>
      prev.map((el) =>
        el.id === focus.id
          ? { ...el, polyPoints: next, ...boundsFromPolyPoints(next) }
          : el,
      ),
    );
  }

  function openElementContextMenu(el: ZoneMapElementDraft, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setTool("select");
    setFocusId(el.id);
    setContextMenu({ elementId: el.id, x: e.clientX, y: e.clientY });
  }

  function duplicateElement(elementId: string) {
    const source = elements.find((el) => el.id === elementId);
    if (!source) return;
    const offset = 3;
    const leftPct = clamp(source.leftPct + offset, 0, 100 - source.widthPct);
    const topPct = clamp(source.topPct + offset, 0, 100 - source.heightPct);
    const copy: ZoneMapElementDraft = {
      ...source,
      id: `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      leftPct,
      topPct,
      teleporter: {
        destinations: source.teleporter.destinations.map((d) => ({ ...d })),
      },
    };
    setElements((prev) => [...prev, copy]);
    setFocusId(copy.id);
    setContextMenu(null);
  }

  function startSpawnDrag(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = null;
    setFocusId(null);
    setDraggingSpawn(true);
    spawnDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: spawnXPct,
      origY: spawnYPct,
    };
  }

  async function uploadElementImage(elementId: string, file: File) {
    setUploadingId(elementId);
    const fd = new FormData();
    fd.set("zoneId", zoneId);
    fd.set("file", file);
    const res = await uploadExplorationZoneElementImageAction(fd);
    setUploadingId(null);
    if (!res.ok) {
      onUploadError?.(res.error);
      return;
    }
    setElements((prev) => prev.map((el) => (el.id === elementId ? { ...el, imageUrl: res.url } : el)));
  }

  function updateFocusTeleporter(destinations: ExplorationTeleporterDestination[]) {
    if (!focus) return;
    setElements((prev) =>
      prev.map((el) =>
        el.id === focus.id ? { ...el, teleporter: { destinations } } : el,
      ),
    );
  }

  const toolbar = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {ZONE_EDITOR_LAYERS.map((layer) => {
          const visible = layerVisible[layer.id] !== false;
          const selected = activeLayer === layer.id;
          return (
            <div
              key={layer.id}
              className={`flex items-center overflow-hidden rounded-md border ${
                selected
                  ? "border-palm bg-palm/15 dark:border-emerald-500 dark:bg-emerald-900/40"
                  : "border-palm/25 bg-white/70 dark:border-zinc-600 dark:bg-zinc-900/50"
              }`}
            >
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-black ${
                  selected ? "text-palm dark:text-emerald-300" : "text-ink/75 dark:text-zinc-300"
                }`}
                onClick={() => selectLayer(layer.id)}
                title={`Edit ${layer.label}`}
              >
                {layer.label}
              </button>
              <button
                type="button"
                className={`border-l border-palm/20 px-1.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  visible ? "text-palm/80" : "text-ink/35"
                } dark:border-zinc-600`}
                onClick={(e) => toggleLayerVisible(layer.id, e)}
                title={visible ? `Hide ${layer.label} (still saved)` : `Show ${layer.label}`}
                aria-pressed={visible}
                aria-label={visible ? `Hide ${layer.label}` : `Show ${layer.label}`}
              >
                {visible ? "On" : "Off"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={adminToolModeClass(tool === "select")}
          onClick={() => setTool("select")}
        >
          Select
        </button>

        {activeLayer === "map-items" ? (
          <>
            <button
              type="button"
              className={adminToolModeClass(tool === "NODE")}
              onClick={() => setTool("NODE")}
            >
              + Node
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "BLOCKER")}
              onClick={() => setTool("BLOCKER")}
            >
              + Non-walkable
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "poly-draw")}
              onClick={() => beginPolyDrawMode("BLOCKER")}
              title="Click corners on the map; click the first corner again to close"
            >
              Click poly
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "DISMOUNT")}
              onClick={() => setTool("DISMOUNT")}
            >
              + Dismount zone
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "ART")}
              onClick={() => setTool("ART")}
            >
              + Art
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "SIGN")}
              onClick={() => setTool("SIGN")}
            >
              + Sign
            </button>
          </>
        ) : null}

        {activeLayer === "regions" ? (
          <>
            <button
              type="button"
              className={adminToolModeClass(tool === "region-draw")}
              onClick={() => beginPolyDrawMode("REGION")}
              title="Outline a named region: click corners, then click the first corner to close"
            >
              + Region poly
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "MAP_LABEL")}
              onClick={() => setTool("MAP_LABEL")}
            >
              + Map label
            </button>
          </>
        ) : null}

        {activeLayer === "buildings" ? (
          <>
            <button
              type="button"
              className={adminToolModeClass(tool === "TELEPORTER")}
              onClick={() => setTool("TELEPORTER")}
            >
              + Teleporter
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "STABLE")}
              onClick={() => setTool("STABLE")}
            >
              + Stable
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "STORE")}
              onClick={() => setTool("STORE")}
            >
              + Store
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "HOME")}
              onClick={() => setTool("HOME")}
            >
              + House
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "FOUNTAIN")}
              onClick={() => setTool("FOUNTAIN")}
            >
              + Fountain
            </button>
          </>
        ) : null}

        {activeLayer === "utilities" ? (
          <button
            type="button"
            className={adminToolModeClass(tool === "LIGHT")}
            onClick={() => setTool("LIGHT")}
          >
            + Light
          </button>
        ) : null}

        {activeLayer === "npc" ? (
          <button
            type="button"
            className={adminToolModeClass(tool === "NPC")}
            onClick={() => setTool("NPC")}
          >
            + NPC
          </button>
        ) : null}

        {activeLayer === "wild-spawns" ? (
          <>
            <button
              type="button"
              className={adminToolModeClass(tool === "collect-place")}
              onClick={() => setTool("collect-place")}
              disabled={placingCollect}
            >
              + Collect area
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "roam-place")}
              onClick={() => setTool("roam-place")}
              disabled={placingCollect}
            >
              + Roam bug area
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "water-place")}
              onClick={() => {
                setWaterPolyDrawId(null);
                setTool("water-place");
              }}
              disabled={placingCollect}
            >
              + Water area
            </button>
            <button
              type="button"
              className={adminToolModeClass(tool === "water-poly-draw")}
              onClick={() => {
                setPolyDrawId(null);
                setWaterPolyDrawId(null);
                setTool("water-poly-draw");
              }}
              disabled={placingCollect}
            >
              Water poly
            </button>
            {focusCollect ? (
              <span className="flex flex-wrap items-center gap-1 self-center text-[11px]">
                <span className={fullscreen ? "text-white/55" : "text-ink/50"}>Shape:</span>
                {(
                  [
                    ["square", "Square"],
                    ["circle", "Circle"],
                    ["ellipse", "Oval"],
                    ["polygon", "Poly"],
                    ["point", "Point"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={adminToolModeClass(focusCollect.shape === value)}
                    onClick={() => void applyCollectShape(focusCollect.id, value)}
                  >
                    {label}
                  </button>
                ))}
              </span>
            ) : null}
          </>
        ) : null}

        <button type="button" className={btnSecondarySm} onClick={() => bumpZoom(1.1)}>
          Zoom in
        </button>
        <button type="button" className={btnSecondarySm} onClick={() => bumpZoom(0.9)}>
          Zoom out
        </button>
        <button type="button" className={btnSecondarySm} onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className={btnSecondarySm} onClick={() => setFullscreen((v) => !v)}>
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
        <span className={`self-center text-[11px] ${fullscreen ? "text-white/60" : "text-ink/55"}`}>
          {fullscreen ? "Esc to exit · " : ""}
          Scroll to zoom · eye toggles hide layers (still saved) ·{" "}
          {tool === "select"
            ? "drag spawn / pins · right-click Duplicate."
            : tool === "poly-draw" || tool === "region-draw"
              ? "click corners · click first corner to close."
              : tool === "water-poly-draw"
                ? "click water shoreline corners · click first corner to close."
              : tool === "collect-place" || tool === "roam-place" || tool === "water-place"
                ? "click the map to place a wild-spawn area."
                : focusCollectId && activeLayer === "wild-spawns"
                  ? "drag area to move · white handles to resize · Shape buttons to change outline."
                  : `click the map to place a ${String(tool).toLowerCase()}.`}
        </span>
      </div>
    </div>
  );

  const mapCanvas = (
    <div
      ref={scrollRef}
      className={
        fullscreen
          ? "min-h-0 flex-1 overscroll-contain overflow-auto p-3"
          : "max-h-[70vh] w-full overscroll-contain overflow-auto rounded border-2 border-palm/20 bg-zinc-900/40 p-2"
      }
    >
      <div
        ref={mapRef}
        className="relative cursor-crosshair bg-zinc-800"
        style={{
          aspectRatio: `${aspect}`,
          width: `${zoom * 100}%`,
          minWidth: fullscreen ? undefined : 280,
          minHeight: 280 * zoom,
        }}
        onClick={placeAtClick}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest("[data-zone-el]")) return;
          setContextMenu(null);
        }}
      >
        {hasMapArt ? (
          <>
            <ArcadeExplorationZoneBackground zone={mapBackdrop} layer="GROUND" percentLayout />
            <ArcadeExplorationZoneBackground zone={mapBackdrop} layer="OVERHEAD" percentLayout />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-900/50 via-teal-800/40 to-stone-800">
            <p className="px-4 text-center text-xs font-bold text-white/70">
              Upload a map image or map tiles above to see it here
            </p>
          </div>
        )}

        <button
          type="button"
          data-zone-el
          aria-label="Spawn point"
          title="Spawn — drag to move"
          className={`absolute z-30 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-white bg-lagoon text-[9px] font-black uppercase text-white shadow-md active:cursor-grabbing ${
            draggingSpawn ? "ring-2 ring-white/90" : "hover:ring-2 hover:ring-white/70"
          }`}
          style={{ left: `${spawnXPct}%`, top: `${spawnYPct}%` }}
          onPointerDown={startSpawnDrag}
          onClick={(e) => e.stopPropagation()}
        >
          S
        </button>

        {layerVisible["wild-spawns"] !== false
          ? collectAreas.map((area) => {
              const focused = focusCollectId === area.id;
              const isRound = area.shape === "circle" || area.shape === "ellipse";
              const lockRound = area.shape === "circle";
              const handles = lockRound ? CIRCLE_EDGE_HANDLES : EDGE_HANDLES;
              const isPolygon = area.shape === "polygon";
              const polyPts = isPolygon ? area.polyPoints : [];
              const polyClosed = polyPts.length >= EXPLORATION_POLY_MIN_POINTS;
              const polyDrawing = waterPolyDrawId === area.id;
              const polyColors = collectAreaPolyColors(area.kind);
              const kindLabel =
                area.kind === "ROAM_BUG"
                  ? "roam bug"
                  : area.kind === "WATER"
                    ? "water"
                    : "collect";

              if (isPolygon) {
                const svgPoints = polyPts.map((p) => `${p.xPct},${p.yPct}`).join(" ");
                const cx =
                  polyPts.reduce((s, p) => s + p.xPct, 0) / Math.max(1, polyPts.length);
                const cy =
                  polyPts.reduce((s, p) => s + p.yPct, 0) / Math.max(1, polyPts.length);
                return (
                  <div
                    key={`collect-${area.id}`}
                    data-zone-el
                    data-collect-area
                    className="absolute inset-0 z-[11]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLayer("wild-spawns");
                      setFocusCollectId(area.id);
                      setFocusId(null);
                      setTool("select");
                    }}
                  >
                    <svg
                      className="absolute inset-0 h-full w-full overflow-visible"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {polyClosed ? (
                        <polygon
                          points={svgPoints}
                          fill={polyColors.fill}
                          stroke={polyColors.stroke}
                          strokeOpacity={focused || polyDrawing ? 1 : 0.85}
                          strokeWidth={focused || polyDrawing ? 2.5 : 1.5}
                          vectorEffect="non-scaling-stroke"
                          style={{
                            pointerEvents: "all",
                            cursor: tool === "select" ? "move" : "crosshair",
                          }}
                          onPointerDown={(e) => {
                            if (tool !== "select") return;
                            startCollectDrag(area, "move", e);
                          }}
                        />
                      ) : null}
                      {polyPts.map((p, i) => {
                        const isFirst = i === 0;
                        return (
                          <circle
                            key={`${area.id}-v-${i}`}
                            cx={p.xPct}
                            cy={p.yPct}
                            r={focused || polyDrawing ? 1.1 : 0.75}
                            fill={isFirst && polyDrawing ? "#fff" : polyColors.stroke}
                            stroke="#fff"
                            strokeWidth={0.35}
                            vectorEffect="non-scaling-stroke"
                            style={{
                              pointerEvents: "all",
                              cursor:
                                polyDrawing && isFirst && polyPts.length >= EXPLORATION_POLY_MIN_POINTS
                                  ? "pointer"
                                  : tool === "select"
                                    ? "grab"
                                    : "crosshair",
                            }}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              if (tool === "select") {
                                startCollectDrag(area, "poly-vertex", e, i);
                              }
                            }}
                          />
                        );
                      })}
                    </svg>
                    <span
                      className="pointer-events-none absolute max-w-[40%] truncate text-[9px] font-black uppercase text-white drop-shadow"
                      style={{
                        left: `${cx}%`,
                        top: `${cy}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {area.name || (area.kind === "WATER" ? "Water" : area.kind === "ROAM_BUG" ? "Roam" : "Collect")}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={`collect-${area.id}`}
                  data-zone-el
                  data-collect-area
                  title={`${area.name} (${kindLabel}) — drag to move`}
                  className={`absolute z-[11] border-2 border-dashed ${
                    area.kind === "ROAM_BUG"
                      ? "border-lime-400 bg-lime-500/25"
                      : area.kind === "WATER"
                        ? "border-cyan-300 bg-cyan-400/35"
                        : "border-amber-300 bg-amber-500/30"
                  } ${focused ? "ring-2 ring-white" : ""} ${
                    isRound ? "rounded-full" : "rounded"
                  }`}
                  style={{
                    left: `${area.leftPct}%`,
                    top: `${area.topPct}%`,
                    width: `${Math.max(area.widthPct, area.shape === "point" ? 2 : 1)}%`,
                    height: `${Math.max(area.heightPct, area.shape === "point" ? 2 : 1)}%`,
                    cursor: tool === "select" ? "move" : "crosshair",
                  }}
                  onPointerDown={(e) => {
                    if (tool !== "select") return;
                    startCollectDrag(area, "move", e);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLayer("wild-spawns");
                    setFocusCollectId(area.id);
                    setFocusId(null);
                    setTool("select");
                  }}
                >
                  <span className="pointer-events-none absolute left-1/2 top-1/2 max-w-[90%] -translate-x-1/2 -translate-y-1/2 truncate text-[9px] font-black uppercase text-white drop-shadow">
                    {area.name ||
                      (area.kind === "ROAM_BUG"
                        ? "Roam"
                        : area.kind === "WATER"
                          ? "Water"
                          : "Collect")}
                  </span>
                  {tool === "select" && focused
                    ? handles.map(({ edge, className, cursor }) => (
                        <button
                          key={edge}
                          type="button"
                          aria-label={`Resize ${edge}`}
                          className={`absolute z-30 bg-white/95 shadow ${
                            isRound ? "rounded-full" : ""
                          } ${className}`}
                          style={{ cursor }}
                          onPointerDown={(e) => startCollectDrag(area, edge, e)}
                        />
                      ))
                    : null}
                </div>
              );
            })
          : null}

        {elements.map((el) => {
          if (!isElementVisible(el)) return null;
          const focused = el.id === focusId;
          const isRound = el.shape === "circle" || el.shape === "ellipse";
          const lockRound = el.shape === "circle";
          const isPolygon = el.shape === "polygon";
          const polyPts =
            isPolygon && el.polyPoints.length > 0
              ? el.polyPoints
              : isPolygon
                ? rectToPolyPoints(el)
                : [];
          const polyClosed = polyPts.length >= EXPLORATION_POLY_MIN_POINTS;
          const polyDrawing = polyDrawId === el.id;
          const polyColors = polygonFillStroke(el.kind);

          if (isPolygon) {
            const svgPoints = polyPts.map((p) => `${p.xPct},${p.yPct}`).join(" ");
            const cx =
              polyPts.reduce((s, p) => s + p.xPct, 0) / Math.max(1, polyPts.length);
            const cy =
              polyPts.reduce((s, p) => s + p.yPct, 0) / Math.max(1, polyPts.length);
            return (
              <div key={el.id} data-zone-el className="pointer-events-none absolute inset-0 z-10">
                <svg
                  className="absolute inset-0 h-full w-full overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {polyClosed ? (
                    <polygon
                      points={svgPoints}
                      fill={polyColors.fill}
                      stroke={polyColors.stroke}
                      strokeOpacity={focused || polyDrawing ? 1 : 0.85}
                      strokeWidth={focused || polyDrawing ? 2.5 : 1.5}
                      vectorEffect="non-scaling-stroke"
                      style={{
                        pointerEvents: "all",
                        cursor: tool === "select" ? "move" : "crosshair",
                      }}
                      onPointerDown={(e) => {
                        if (tool !== "select") return;
                        startDrag({ ...el, polyPoints: polyPts }, "move", e);
                      }}
                      onContextMenu={(e) =>
                        openElementContextMenu({ ...el, polyPoints: polyPts }, e)
                      }
                    />
                  ) : polyPts.length >= 2 ? (
                    <polyline
                      points={svgPoints}
                      fill="none"
                      stroke={polyColors.stroke}
                      strokeOpacity={1}
                      strokeWidth={2.5}
                      strokeDasharray="2 1.5"
                      vectorEffect="non-scaling-stroke"
                      style={{ pointerEvents: "none" }}
                    />
                  ) : null}
                </svg>
                {el.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.imageUrl}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute object-contain drop-shadow"
                    style={{
                      left: `${el.leftPct}%`,
                      top: `${el.topPct}%`,
                      width: `${el.widthPct}%`,
                      height: `${el.heightPct}%`,
                    }}
                  />
                ) : (
                  <span
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center text-[9px] font-black uppercase text-white drop-shadow"
                    style={{ left: `${cx}%`, top: `${cy}%` }}
                  >
                    {(el.label || el.kind).slice(0, el.kind === "REGION" ? 24 : 8)}
                  </span>
                )}
                {el.kind === "HOME" ? (
                  <span
                    className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full drop-shadow"
                    style={{
                      left: `${cx}%`,
                      top: `${el.topPct}%`,
                      color: polyColors.stroke,
                      transform: `translate(-50%, -100%) rotate(${el.rotateDeg}deg)`,
                      transformOrigin: "center bottom",
                    }}
                    aria-hidden
                    title="Door / spawn direction"
                  >
                    <svg width="14" height="16" viewBox="0 0 14 16" className="overflow-visible">
                      <path d="M7 0 L13 10 H9 V16 H5 V10 H1 Z" fill="currentColor" />
                    </svg>
                  </span>
                ) : null}
                {(tool === "select" || polyDrawing) && (focused || polyDrawing)
                  ? polyPts.map((p, i) => {
                      const hasNextEdge =
                        polyClosed || i < polyPts.length - 1;
                      const next = hasNextEdge
                        ? polyPts[polyClosed ? (i + 1) % polyPts.length : i + 1]!
                        : null;
                      const midX = next ? (p.xPct + next.xPct) / 2 : 0;
                      const midY = next ? (p.yPct + next.yPct) / 2 : 0;
                      const isFirst = i === 0;
                      return (
                        <div key={`poly-${el.id}-${i}`}>
                          <button
                            type="button"
                            data-zone-el
                            title={
                              polyDrawing && isFirst && polyPts.length >= EXPLORATION_POLY_MIN_POINTS
                                ? "Click to close polygon"
                                : "Drag corner · right-click to remove"
                            }
                            aria-label={`Corner ${i + 1}`}
                            className={`absolute z-40 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow pointer-events-auto ${
                              polyDrawing && isFirst ? "ring-2 ring-white" : ""
                            }`}
                            style={{
                              left: `${p.xPct}%`,
                              top: `${p.yPct}%`,
                              cursor: "grab",
                              backgroundColor: polyColors.stroke,
                            }}
                            onPointerDown={(e) => {
                              if (polyDrawing && isFirst && polyPts.length >= EXPLORATION_POLY_MIN_POINTS) {
                                e.stopPropagation();
                                e.preventDefault();
                                return;
                              }
                              startPolyVertexDrag({ ...el, polyPoints: polyPts }, i, e);
                            }}
                            onClick={(e) => {
                              if (
                                !(polyDrawing && isFirst && polyPts.length >= EXPLORATION_POLY_MIN_POINTS)
                              ) {
                                return;
                              }
                              e.stopPropagation();
                              const bounds = boundsFromPolyPoints(polyPts);
                              setElements((prev) =>
                                prev.map((row) =>
                                  row.id === el.id ? { ...row, ...bounds } : row,
                                ),
                              );
                              setPolyDrawId(null);
                              setTool("select");
                              setFocusId(el.id);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (polyPts.length <= 1) {
                                setElements((prev) => prev.filter((row) => row.id !== el.id));
                                setPolyDrawId(null);
                                setFocusId(null);
                                return;
                              }
                              const nextPts = removePolyPoint(polyPts, i, {
                                allowBelowMin: polyDrawing,
                              });
                              if (
                                !polyDrawing &&
                                nextPts.length < EXPLORATION_POLY_MIN_POINTS
                              ) {
                                return;
                              }
                              setElements((prev) =>
                                prev.map((row) =>
                                  row.id === el.id
                                    ? {
                                        ...row,
                                        polyPoints: nextPts,
                                        ...boundsFromLoosePolyPoints(nextPts),
                                      }
                                    : row,
                                ),
                              );
                            }}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (polyPts.length <= 1) return;
                              const nextPts = removePolyPoint(polyPts, i, {
                                allowBelowMin: polyDrawing,
                              });
                              if (
                                !polyDrawing &&
                                nextPts.length < EXPLORATION_POLY_MIN_POINTS
                              ) {
                                return;
                              }
                              setElements((prev) =>
                                prev.map((row) =>
                                  row.id === el.id
                                    ? {
                                        ...row,
                                        polyPoints: nextPts,
                                        ...boundsFromLoosePolyPoints(nextPts),
                                      }
                                    : row,
                                ),
                              );
                            }}
                          />
                          {next && polyPts.length < EXPLORATION_POLY_MAX_POINTS ? (
                            <button
                              type="button"
                              data-zone-el
                              title="Add corner on this edge"
                              aria-label={`Add corner on edge ${i + 1}`}
                              className="absolute z-30 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-white/80 shadow pointer-events-auto hover:border-white"
                              style={{ left: `${midX}%`, top: `${midY}%`, cursor: "copy" }}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextPts = insertPolyPointOnEdge(polyPts, i);
                                setElements((prev) =>
                                  prev.map((row) =>
                                    row.id === el.id
                                      ? {
                                          ...row,
                                          polyPoints: nextPts,
                                          ...boundsFromLoosePolyPoints(nextPts),
                                        }
                                      : row,
                                  ),
                                );
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })
                  : null}
              </div>
            );
          }

          const homeCss =
            el.kind === "HOME"
              ? homePlateCss({
                  textColor: el.textColor ?? DEFAULT_HOME_STYLE.textColor,
                  textOpacity: el.textOpacity ?? DEFAULT_HOME_STYLE.textOpacity,
                  backgroundColor: el.backgroundColor ?? DEFAULT_HOME_STYLE.backgroundColor,
                  backgroundOpacity:
                    el.backgroundOpacity ?? DEFAULT_HOME_STYLE.backgroundOpacity,
                  borderColor: el.borderColor ?? DEFAULT_HOME_STYLE.borderColor,
                  borderOpacity: el.borderOpacity ?? DEFAULT_HOME_STYLE.borderOpacity,
                })
              : null;
          return (
            <div
              key={el.id}
              data-zone-el
              className={`absolute z-10 border-2 ${
                el.kind === "HOME"
                  ? ""
                  : el.imageUrl
                    ? "border-white/40 bg-transparent"
                    : elementBorderClass(el.kind)
              } ${isRound ? "rounded-full" : "rounded-sm"} ${focused ? "ring-2 ring-white" : ""}`}
              style={{
                left: `${el.leftPct}%`,
                top: `${el.topPct}%`,
                width: `${el.widthPct}%`,
                height: `${el.heightPct}%`,
                cursor: tool === "select" ? "move" : "crosshair",
                transform: el.kind === "HOME" ? `rotate(${el.rotateDeg}deg)` : undefined,
                transformOrigin: "center center",
                ...(homeCss
                  ? {
                      color: homeCss.color,
                      backgroundColor: homeCss.backgroundColor,
                      borderColor: homeCss.borderColor,
                    }
                  : null),
              }}
              onPointerDown={(e) => {
                if (tool !== "select") return;
                startDrag(el, "move", e);
              }}
              onContextMenu={(e) => openElementContextMenu(el, e)}
            >
              {el.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.imageUrl}
                  alt=""
                  draggable={false}
                  className={`pointer-events-none h-full w-full object-contain ${
                    isRound ? "rounded-full" : ""
                  }`}
                />
              ) : el.kind === "NPC" ? (
                <span className="pointer-events-none flex h-full w-full items-center justify-center rounded-full border-2 border-white/80 bg-sky-500 text-[8px] font-black uppercase text-white shadow">
                  {el.label?.slice(0, 3) || "NPC"}
                </span>
              ) : el.kind === "HOME" ? (
                <span className="pointer-events-none flex h-full w-full items-center justify-center text-center text-[9px] font-black uppercase drop-shadow">
                  {el.label || "Home"}
                </span>
              ) : (
                <span className="pointer-events-none flex h-full w-full items-center justify-center text-center text-[9px] font-black uppercase text-white drop-shadow">
                  {el.label || el.kind}
                </span>
              )}
              {el.kind === "HOME" && el.imageUrl ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/35 px-0.5 text-center text-[8px] font-black uppercase">
                  {el.label || "Home"}
                </span>
              ) : null}
              {el.kind === "HOME" ? (
                <span
                  className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-full drop-shadow"
                  style={{ color: homeCss?.borderColor ?? "#fecdd3" }}
                  aria-hidden
                  title="Door / spawn direction"
                >
                  <svg width="14" height="16" viewBox="0 0 14 16" className="overflow-visible">
                    <path d="M7 0 L13 10 H9 V16 H5 V10 H1 Z" fill="currentColor" />
                  </svg>
                </span>
              ) : null}

              {tool === "select" && focused
                ? (lockRound ? CIRCLE_EDGE_HANDLES : EDGE_HANDLES).map(
                    ({ edge, className, cursor }) => (
                      <button
                        key={edge}
                        type="button"
                        aria-label={`Resize ${edge}`}
                        className={`absolute z-30 bg-white/95 shadow ${
                          isRound ? "rounded-full" : ""
                        } ${className}`}
                        style={{ cursor }}
                        onPointerDown={(e) => startDrag(el, edge, e)}
                      />
                    ),
                  )
                : null}
            </div>
          );
        })}

        {focus?.kind === "LIGHT" ? (
          <div
            className="pointer-events-none absolute z-[9] rounded-full border-2 border-dashed border-yellow-300/90"
            style={{
              left: `${focus.leftPct + focus.widthPct / 2 - (focus.zoneLight.shineDistancePx / worldWidthPx) * 100}%`,
              top: `${focus.topPct + focus.heightPct / 2 - (focus.zoneLight.shineDistancePx / worldHeightPx) * 100}%`,
              width: `${((focus.zoneLight.shineDistancePx * 2) / worldWidthPx) * 100}%`,
              height: `${((focus.zoneLight.shineDistancePx * 2) / worldHeightPx) * 100}%`,
              backgroundColor: `${focus.zoneLight.colorHex}22`,
              boxShadow: `0 0 16px ${focus.zoneLight.colorHex}66`,
            }}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );

  const inspector = focus ? (
    <div
      className={`${adminInsetPanelClass} max-h-[40vh] space-y-3 overflow-y-auto p-3 ${
        fullscreen ? "shrink-0 border-t border-palm/20" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase text-palm">
          {focus.kind === "NODE"
            ? "Collectible node"
            : focus.kind === "BLOCKER"
              ? "Non-walkable area"
              : focus.kind === "DISMOUNT"
                ? "Town dismount zone"
                : focus.kind === "TELEPORTER"
                  ? "Teleporter"
                  : focus.kind === "STABLE"
                    ? "Stable"
                    : focus.kind === "STORE"
                      ? "Item store"
                      : focus.kind === "FOUNTAIN"
                        ? "Fountain"
                        : focus.kind === "LIGHT"
                          ? "Zone light"
                          : focus.kind === "NPC"
                        ? "NPC ping"
                        : focus.kind === "HOME"
                          ? "House"
                          : focus.kind === "SIGN"
                            ? "Sign"
                            : focus.kind === "MAP_LABEL"
                              ? "Map label"
                              : focus.kind === "REGION"
                                ? "Named region"
                                : "Map art"}
        </p>
        <button
          type="button"
          className="text-xs font-bold text-coral underline"
          onClick={() => {
            setElements((prev) => prev.filter((el) => el.id !== focus.id));
            setFocusId(null);
          }}
        >
          Remove
        </button>
      </div>

      <label className="block text-xs font-bold">
        Label
        <input
          className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
          value={focus.label}
          onChange={(e) => {
            const label = e.target.value;
            setElements((prev) => prev.map((el) => (el.id === focus.id ? { ...el, label } : el)));
          }}
        />
      </label>

      <label className="block text-xs font-bold">
        Shape
        <select
          className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
          value={focus.shape}
          onChange={(e) => {
            const raw = e.target.value;
            const shape: ExplorationElementShape =
              raw === "circle" || raw === "ellipse" || raw === "polygon" ? raw : "square";
            setElements((prev) =>
              prev.map((el) => {
                if (el.id !== focus.id) return el;
                if (shape === "circle") {
                  return { ...el, shape, polyPoints: [], ...toCircleBounds(el) };
                }
                if (shape === "polygon") {
                  const polyPoints =
                    el.polyPoints.length >= EXPLORATION_POLY_MIN_POINTS
                      ? el.polyPoints
                      : rectToPolyPoints(el);
                  return {
                    ...el,
                    shape,
                    polyPoints,
                    ...boundsFromPolyPoints(polyPoints),
                  };
                }
                return { ...el, shape, polyPoints: [] };
              }),
            );
          }}
        >
          <option value="square">Square</option>
          <option value="circle">Circle (round)</option>
          <option value="ellipse">Oval (oblong)</option>
          <option value="polygon">Polygon (editable corners)</option>
        </select>
      </label>
      {focus.shape === "circle" ? (
        <p className="text-xs text-ink/55">
          Drag an edge handle to grow or shrink — stays perfectly round.
        </p>
      ) : null}
      {focus.shape === "ellipse" ? (
        <p className="text-xs text-ink/55">
          Drag corner/edge handles freely for an oblong oval (pill / ellipse footprint).
        </p>
      ) : null}
      {focus.shape === "polygon" ? (
        <div className="space-y-2 rounded border border-palm/20 bg-white/50 p-2 dark:bg-zinc-900/40">
          <p className="text-xs text-ink/65">
            Drag corner dots to reshape. Click mid-edge dots to add a corner. Double-click a
            corner to remove (min {EXPLORATION_POLY_MIN_POINTS}).
          </p>
          <p className="text-[11px] font-bold text-ink/55">
            {focus.polyPoints.length || 4} corners
            {focus.polyPoints.length >= EXPLORATION_POLY_MAX_POINTS ? " (max)" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondarySm}
              disabled={focus.polyPoints.length >= EXPLORATION_POLY_MAX_POINTS}
              onClick={addCornerOnLongestEdge}
            >
              + Corner
            </button>
            <button
              type="button"
              className={btnSecondarySm}
              onClick={() => {
                const polyPoints = rectToPolyPoints(focus);
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id
                      ? { ...el, shape: "polygon", polyPoints, ...boundsFromPolyPoints(polyPoints) }
                      : el,
                  ),
                );
              }}
            >
              Reset to rectangle
            </button>
          </div>
        </div>
      ) : null}

      {focus.shape !== "polygon" ? (
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold">
          Width %
          <input
            type="number"
            min={0.15}
            max={95}
            step={0.05}
            className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
            value={Number(focus.widthPct.toFixed(2))}
            onChange={(e) => {
              const widthPct = clamp(Number(e.target.value) || MIN_PIN, MIN_PIN, 95);
              setElements((prev) =>
                prev.map((el) => {
                  if (el.id !== focus.id) return el;
                  if (el.shape === "circle") {
                    const size = widthPct;
                    const cx = el.leftPct + el.widthPct / 2;
                    const cy = el.topPct + el.heightPct / 2;
                    return {
                      ...el,
                      widthPct: size,
                      heightPct: size,
                      leftPct: clamp(cx - size / 2, 0, 100 - size),
                      topPct: clamp(cy - size / 2, 0, 100 - size),
                    };
                  }
                  return {
                    ...el,
                    widthPct,
                    leftPct: clamp(el.leftPct, 0, 100 - widthPct),
                  };
                }),
              );
            }}
          />
        </label>
        <label className="block text-xs font-bold">
          Height %
          <input
            type="number"
            min={0.15}
            max={95}
            step={0.05}
            className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
            value={Number(focus.heightPct.toFixed(2))}
            onChange={(e) => {
              const heightPct = clamp(Number(e.target.value) || MIN_PIN, MIN_PIN, 95);
              setElements((prev) =>
                prev.map((el) => {
                  if (el.id !== focus.id) return el;
                  if (el.shape === "circle") {
                    const size = heightPct;
                    const cx = el.leftPct + el.widthPct / 2;
                    const cy = el.topPct + el.heightPct / 2;
                    return {
                      ...el,
                      widthPct: size,
                      heightPct: size,
                      leftPct: clamp(cx - size / 2, 0, 100 - size),
                      topPct: clamp(cy - size / 2, 0, 100 - size),
                    };
                  }
                  return {
                    ...el,
                    heightPct,
                    topPct: clamp(el.topPct, 0, 100 - heightPct),
                  };
                }),
              );
            }}
          />
        </label>
      </div>
      ) : null}

      {focus.kind === "ART" ? (
        <label className="block text-xs font-bold">
          Depth (walk-behind)
          <select
            className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
            value={focus.artDepth ?? "ground"}
            onChange={(e) => {
              const raw = e.target.value;
              const artDepth: ExplorationArtDepth =
                raw === "ysort" || raw === "overhead" ? raw : "ground";
              setElements((prev) =>
                prev.map((el) => (el.id === focus.id ? { ...el, artDepth } : el)),
              );
            }}
          >
            <option value="ground">Ground — always under characters</option>
            <option value="ysort">Y-sort — walk in front or behind</option>
            <option value="overhead">Overhead — always covers characters</option>
          </select>
        </label>
      ) : null}

      {focus.kind === "NODE" ? (
        <label className="block text-xs font-bold">
          Node kind (e.g. bark, moss)
          <input
            className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
            value={focus.nodeKind}
            onChange={(e) => {
              const nodeKind = e.target.value;
              setElements((prev) =>
                prev.map((el) => (el.id === focus.id ? { ...el, nodeKind } : el)),
              );
            }}
          />
        </label>
      ) : null}

      {focus.kind === "ART" ||
      focus.kind === "NODE" ||
      focus.kind === "TELEPORTER" ||
      focus.kind === "STABLE" ||
      focus.kind === "STORE" ||
      focus.kind === "FOUNTAIN" ||
      focus.kind === "HOME" ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold">
            {focus.kind === "TELEPORTER"
              ? "Teleporter image"
              : focus.kind === "STABLE"
                ? "Stable image"
                : focus.kind === "STORE"
                  ? "Store image (optional)"
                  : focus.kind === "FOUNTAIN"
                    ? "Fountain image (optional)"
                    : focus.kind === "HOME"
                    ? "House image (optional)"
                    : focus.kind === "ART"
                      ? "Art image"
                      : "Node icon (optional)"}
            <input
              type="file"
              accept="image/*"
              disabled={pending || uploadingId === focus.id}
              className="mt-1 block text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadElementImage(focus.id, f);
                e.target.value = "";
              }}
            />
          </label>
          {focus.kind === "HOME" && focus.imageUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={btnSecondarySm}
                onClick={() => {
                  setElements((prev) =>
                    prev.map((el) => (el.id === focus.id ? { ...el, imageUrl: "" } : el)),
                  );
                }}
              >
                Remove image
              </button>
              <span className="text-[10px] text-ink/55">Uses label plate styles when empty.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {focus.kind === "HOME" ? (
        <div className="space-y-3 border-t border-palm/15 pt-3">
          <label className="block text-xs font-bold">
            Monthly rent ($)
            <input
              type="number"
              min={0}
              step={1}
              className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
              value={Number((focus.monthlyFeeCents / 100).toFixed(2))}
              onChange={(e) => {
                const dollars = Math.max(0, Number(e.target.value) || 0);
                const monthlyFeeCents = Math.round(dollars * 100);
                setElements((prev) =>
                  prev.map((el) => (el.id === focus.id ? { ...el, monthlyFeeCents } : el)),
                );
              }}
            />
          </label>
          <label className="block text-xs font-bold">
            Door / spawn rotation (°)
            <input
              type="number"
              min={0}
              max={359}
              step={1}
              className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
              value={focus.rotateDeg}
              onChange={(e) => {
                const raw = Number(e.target.value) || 0;
                const rotateDeg = ((Math.round(raw) % 360) + 360) % 360;
                setElements((prev) =>
                  prev.map((el) => (el.id === focus.id ? { ...el, rotateDeg } : el)),
                );
              }}
            />
          </label>

          <p className="text-xs font-black uppercase text-palm">Plate look</p>
          {(
            [
              {
                key: "text" as const,
                label: "Text",
                colorKey: "textColor" as const,
                opacityKey: "textOpacity" as const,
              },
              {
                key: "background" as const,
                label: "Background",
                colorKey: "backgroundColor" as const,
                opacityKey: "backgroundOpacity" as const,
              },
              {
                key: "border" as const,
                label: "Border",
                colorKey: "borderColor" as const,
                opacityKey: "borderOpacity" as const,
              },
            ] as const
          ).map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_auto_5rem] items-end gap-2">
              <label className="block text-xs font-bold">
                {row.label} color
                <input
                  type="color"
                  className="mt-1 h-9 w-full cursor-pointer rounded border border-palm/25 bg-white p-0.5"
                  value={focus[row.colorKey] || DEFAULT_HOME_STYLE[row.colorKey]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setElements((prev) =>
                      prev.map((el) =>
                        el.id === focus.id ? { ...el, [row.colorKey]: value } : el,
                      ),
                    );
                  }}
                />
              </label>
              <span
                className="mb-1 h-8 w-8 rounded border border-palm/30"
                style={{
                  backgroundColor: homePlateCss({
                    textColor: focus.textColor,
                    textOpacity: focus.textOpacity,
                    backgroundColor: focus.backgroundColor,
                    backgroundOpacity: focus.backgroundOpacity,
                    borderColor: focus.borderColor,
                    borderOpacity: focus.borderOpacity,
                  })[row.key === "text" ? "color" : row.key === "background" ? "backgroundColor" : "borderColor"],
                }}
                aria-hidden
              />
              <label className="block text-xs font-bold">
                %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
                  value={Math.round((focus[row.opacityKey] ?? 1) * 100)}
                  onChange={(e) => {
                    const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                    setElements((prev) =>
                      prev.map((el) =>
                        el.id === focus.id ? { ...el, [row.opacityKey]: pct / 100 } : el,
                      ),
                    );
                  }}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className={btnSecondarySm}
            onClick={() => {
              setElements((prev) =>
                prev.map((el) => (el.id === focus.id ? { ...el, ...DEFAULT_HOME_STYLE } : el)),
              );
            }}
          >
            Reset plate colors
          </button>

          <p className="text-xs text-ink/55">
            Non-walkable. Arrow shows spawn direction (0° = up). Remove the image to place a
            transparent-styled hitbox over map art.
          </p>
        </div>
      ) : null}

      {focus.kind === "BLOCKER" ? (
        <div className="space-y-2">
          {focus.shape !== "polygon" ? (
            <button type="button" className={btnSecondarySm} onClick={convertFocusToPolygon}>
              Convert to editable polygon
            </button>
          ) : null}
          <p className="text-xs text-ink/55">
            Blocks walking in playtest. Square / circle / oval use the box handles. Polygon lets you
            add and drag corners for irregular walls, paths, and buildings.
          </p>
        </div>
      ) : null}

      {focus.kind !== "BLOCKER" && focus.shape !== "polygon" ? (
        <button type="button" className={btnSecondarySm} onClick={convertFocusToPolygon}>
          Convert to editable polygon
        </button>
      ) : null}

      {focus.kind === "DISMOUNT" ? (
        <p className="text-xs text-ink/55">
          Entering this area while mounted auto-dismounts (towns / safe zones). Does not block walking.
        </p>
      ) : null}

      {focus.kind === "STABLE" ? (
        <p className="text-xs text-ink/55">
          Clicking this pin in play opens the Stable market (listings from Exploration → Stable).
        </p>
      ) : null}

      {focus.kind === "STORE" ? (
        <p className="text-xs text-ink/55">
          Clicking this pin in play opens the item store (listings from Exploration → Store). Supports
          polygon footprints like other pins.
        </p>
      ) : null}

      {focus.kind === "NPC" ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold">
            NPC at this ping
            <select
              className="mt-1 w-full rounded border border-palm/25 px-2 py-1.5 text-sm"
              value={focus.npcId}
              onChange={(e) => {
                const npcId = e.target.value;
                const named = npcOptions.find((n) => n.id === npcId);
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id
                      ? {
                          ...el,
                          npcId,
                          label: named?.name || el.label || "NPC",
                        }
                      : el,
                  ),
                );
              }}
            >
              <option value="">— Select NPC —</option>
              {npcOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          {npcOptions.length === 0 ? (
            <p className="text-xs text-ink/55">
              Create NPCs under Exploration → NPCs, then pick one here.
            </p>
          ) : (
            <p className="text-xs text-ink/55">
              Small map ping only — the chosen NPC stands / wanders from this point in play.
            </p>
          )}
        </div>
      ) : null}

      {focus.kind === "SIGN" ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold">
            Sign dialogue
            <textarea
              className="mt-1 min-h-[6rem] w-full rounded border border-palm/25 px-2 py-1.5 text-sm"
              value={focus.dialogueText}
              placeholder="What players read when they click this sign…"
              onChange={(e) => {
                const dialogueText = e.target.value.slice(0, 4000);
                setElements((prev) =>
                  prev.map((el) => (el.id === focus.id ? { ...el, dialogueText } : el)),
                );
              }}
            />
          </label>
          <p className="text-xs text-ink/55">
            Optional image above. Players walk up and click the sign to open this text.
          </p>
        </div>
      ) : null}

      {focus.kind === "MAP_LABEL" ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold">
            Label size on maps ({focus.mapLabelSizePx}px)
            <input
              type="range"
              min={8}
              max={28}
              step={1}
              className="mt-1 w-full"
              value={focus.mapLabelSizePx}
              onChange={(e) => {
                const mapLabelSizePx = Number(e.target.value);
                setElements((prev) =>
                  prev.map((el) => (el.id === focus.id ? { ...el, mapLabelSizePx } : el)),
                );
              }}
            />
          </label>
          <p className="text-xs text-ink/55">
            Shown on the in-game open map / minimap overview and here in the editor — not on the
            ground while walking.
          </p>
        </div>
      ) : null}

      {focus.kind === "REGION" ? (
        <div className="space-y-3">
          <p className="text-xs text-ink/55">
            Outline with <strong>+ Region poly</strong> (click corners, close on first). Set the{" "}
            <strong>Label</strong> above — the HUD “Region name” pin shows it while the player stands
            inside. Invisible in play except via that HUD. Nested regions: smallest wins.
          </p>
          <label className="block text-xs font-bold">
            Dehydration rate (pts/sec, optional)
            <input
              type="number"
              min={0}
              step={0.1}
              className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
              value={focus.dehydrationRatePerSec ?? ""}
              placeholder="Leave empty for default"
              onChange={(e) => {
                const raw = e.target.value.trim();
                const dehydrationRatePerSec =
                  raw === "" ? null : Math.max(0, Number(raw) || 0);
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id ? { ...el, dehydrationRatePerSec } : el,
                  ),
                );
              }}
            />
          </label>
        </div>
      ) : null}

      {focus.kind === "LIGHT" ? (
        <div className="space-y-3 border-t border-palm/15 pt-3">
          <p className="text-xs font-black uppercase text-palm">Light shine</p>
          <label className="block text-xs font-bold">
            Shine distance ({focus.zoneLight.shineDistancePx}px)
            <input
              type="range"
              min={20}
              max={2000}
              step={10}
              className="mt-1 w-full"
              value={focus.zoneLight.shineDistancePx}
              onChange={(e) => {
                const shineDistancePx = Number(e.target.value) || DEFAULT_ZONE_LIGHT.shineDistancePx;
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id
                      ? { ...el, zoneLight: { ...el.zoneLight, shineDistancePx } }
                      : el,
                  ),
                );
              }}
            />
          </label>
          <label className="block text-xs font-bold">
            Pattern
            <select
              className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
              value={focus.zoneLight.shinePattern}
              onChange={(e) => {
                const shinePattern =
                  e.target.value === "directional" ? "directional" : "omni";
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id
                      ? { ...el, zoneLight: { ...el.zoneLight, shinePattern } }
                      : el,
                  ),
                );
              }}
            >
              <option value="omni">Omni (radial)</option>
              <option value="directional">Directional cone</option>
            </select>
          </label>
          <label className="block text-xs font-bold">
            Color
            <input
              type="color"
              className="mt-1 h-9 w-full cursor-pointer rounded border border-palm/25 bg-white p-0.5"
              value={focus.zoneLight.colorHex}
              onChange={(e) => {
                const colorHex = e.target.value;
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id
                      ? { ...el, zoneLight: { ...el.zoneLight, colorHex } }
                      : el,
                  ),
                );
              }}
            />
          </label>
          <label className="block text-xs font-bold">
            Flicker ({Math.round(focus.zoneLight.flicker * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="mt-1 w-full"
              value={focus.zoneLight.flicker}
              onChange={(e) => {
                const flicker = Number(e.target.value) || 0;
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === focus.id
                      ? { ...el, zoneLight: { ...el.zoneLight, flicker } }
                      : el,
                  ),
                );
              }}
            />
          </label>
          <p className="text-xs text-ink/55">
            Yellow preview ring on the map shows shine radius while this light is selected.
          </p>
        </div>
      ) : null}

      {focus.kind === "TELEPORTER" ? (
        <div className="space-y-3 border-t border-palm/15 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase text-palm">Destinations</p>
            <button
              type="button"
              className={btnSecondarySm}
              disabled={destinationChoices.length === 0}
              onClick={() => {
                const first = destinationChoices[0];
                if (!first) return;
                updateFocusTeleporter([
                  ...focus.teleporter.destinations,
                  { zoneId: first.id, label: first.name, feeCents: 0 },
                ]);
              }}
            >
              + Destination
            </button>
          </div>
          {destinationChoices.length === 0 ? (
            <p className="text-xs text-ink/55">Create another zone to add teleport destinations.</p>
          ) : null}
          {focus.teleporter.destinations.length === 0 ? (
            <p className="text-xs text-ink/55">No destinations yet — players will see an empty menu.</p>
          ) : null}
          {focus.teleporter.destinations.map((dest, index) => (
            <div
              key={`${dest.zoneId}-${index}`}
              className="space-y-2 rounded border border-palm/20 bg-white/60 p-2 dark:bg-zinc-900/40"
            >
              <label className="block text-xs font-bold">
                Zone
                <select
                  className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
                  value={dest.zoneId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const opt = destinationChoices.find((z) => z.id === nextId);
                    const next = focus.teleporter.destinations.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            zoneId: nextId,
                            label: d.label.trim() ? d.label : (opt?.name ?? d.label),
                          }
                        : d,
                    );
                    updateFocusTeleporter(next);
                  }}
                >
                  {destinationChoices.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold">
                Menu label
                <input
                  className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
                  value={dest.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    updateFocusTeleporter(
                      focus.teleporter.destinations.map((d, i) =>
                        i === index ? { ...d, label } : d,
                      ),
                    );
                  }}
                />
              </label>
              <label className="block text-xs font-bold">
                Fee (dollars, 0 = free / hidden)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="mt-1 w-full rounded border border-palm/25 px-2 py-1 text-sm"
                  value={(dest.feeCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const dollars = Number(e.target.value);
                    const feeCents = Number.isFinite(dollars)
                      ? Math.max(0, Math.round(dollars * 100))
                      : 0;
                    updateFocusTeleporter(
                      focus.teleporter.destinations.map((d, i) =>
                        i === index ? { ...d, feeCents } : d,
                      ),
                    );
                  }}
                />
              </label>
              <button
                type="button"
                className="text-xs font-bold text-coral underline"
                onClick={() => {
                  updateFocusTeleporter(
                    focus.teleporter.destinations.filter((_, i) => i !== index),
                  );
                }}
              >
                Remove destination
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  const contextMenuUi = contextMenu ? (
    <div
      role="menu"
      className="fixed z-[120] min-w-[9rem] overflow-hidden rounded-md border border-palm/30 bg-[var(--sand)] py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-1.5 text-left text-sm font-bold text-palm hover:bg-palm/10 dark:text-emerald-300 dark:hover:bg-white/10"
        onClick={() => duplicateElement(contextMenu.elementId)}
      >
        Duplicate
      </button>
    </div>
  ) : null;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 text-white">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2">
          {toolbar}
        </div>
        {mapCanvas}
        {inspector}
        {activeLayer === "wild-spawns" ? (
          <div className="max-h-[40vh] shrink-0 overflow-auto border-t border-white/10 bg-zinc-900 p-3">
            <GameArcadeExplorationCollectionPanel
              zoneId={zoneId}
              itemSets={itemSets}
              bugSets={bugSets}
              areas={collectAreas}
              onAreasChange={(areas) => onCollectAreasChange?.(areas)}
              focusAreaId={focusCollectId}
              onFocusAreaIdChange={setFocusCollectId}
              compact
            />
          </div>
        ) : null}
        {contextMenuUi}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {mapCanvas}
      {inspector}
      {activeLayer === "wild-spawns" ? (
        <div className={`${adminInsetPanelClass} p-3`}>
          <GameArcadeExplorationCollectionPanel
            zoneId={zoneId}
            itemSets={itemSets}
            bugSets={bugSets}
            areas={collectAreas}
            onAreasChange={(areas) => onCollectAreasChange?.(areas)}
            focusAreaId={focusCollectId}
            onFocusAreaIdChange={setFocusCollectId}
            compact
          />
        </div>
      ) : null}
      {contextMenuUi}
    </div>
  );
}
