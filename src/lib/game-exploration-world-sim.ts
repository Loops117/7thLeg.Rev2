import { randomUUID } from "node:crypto";
import { COOP_PLAYTEST_ROOM_ID, COOP_PRESENCE_STALE_MS } from "@/lib/game-exploration-coop-shared";
import {
  listCoopPresenceByGuestIds,
  listCoopPresencePeers,
} from "@/lib/game-exploration-coop";
import { listCollectAreasForPlay } from "@/lib/game-exploration-collect";
import {
  areaSpawnsRoamBugs,
  collectAreaCenter,
  refillCollectAreaNodes,
  refillRoamBugs,
  rollBugCatchSuccess,
  rollCollectionSuccess,
  rollLootFromNode,
  spawnBugsFromOverlappingRoam,
  stepAmbientBugPosition,
  type ExplorationCollectAreaView,
  type ExplorationFleeingBug,
  type ExplorationWorldNode,
} from "@/lib/game-exploration-gather-shared";
import { getPartyForGuest } from "@/lib/game-exploration-party";
import { loadExplorationGeneralSettings } from "@/lib/game-exploration-settings";
import {
  DEFAULT_EXPLORATION_GENERAL_SETTINGS,
  type ExplorationGatheringSettings,
} from "@/lib/game-exploration-settings-shared";
import {
  rollToolHitDamage,
  toolWorkInRangePx,
  type ExplorationBagStack,
  type ExplorationToolView,
} from "@/lib/game-exploration-tools-shared";
import { listExplorationToolsActive } from "@/lib/game-exploration-tools";
import { prisma } from "@/lib/prisma";
import {
  WORLD_INTEREST_RADIUS_PX,
  WORLD_MAX_TICK_MS,
  WORLD_STASIS_AFTER_MS,
  type ExplorationPendingItemGrant,
  type ExplorationWorldCatchResult,
  type ExplorationWorldGrant,
  type ExplorationWorldHitResult,
  type ExplorationWorldSnapshot,
  type ExplorationZoneWorldState,
} from "@/lib/game-exploration-world-sim-shared";

type PlayerPos = { guestId: string; x: number; y: number; displayName?: string };

function emptyState(): ExplorationZoneWorldState {
  return { nodes: [], bugs: [], areaMeta: {} };
}

function parseState(raw: unknown): ExplorationZoneWorldState {
  if (!raw || typeof raw !== "object") return emptyState();
  const row = raw as Record<string, unknown>;
  return {
    nodes: Array.isArray(row.nodes) ? (row.nodes as ExplorationWorldNode[]) : [],
    bugs: Array.isArray(row.bugs) ? (row.bugs as ExplorationFleeingBug[]) : [],
    areaMeta:
      row.areaMeta && typeof row.areaMeta === "object"
        ? (row.areaMeta as ExplorationZoneWorldState["areaMeta"])
        : {},
  };
}

function areaInInterest(
  area: ExplorationCollectAreaView,
  players: PlayerPos[],
  worldW: number,
  worldH: number,
): boolean {
  if (players.length === 0) return false;
  const c = collectAreaCenter(area, worldW, worldH);
  const r = WORLD_INTEREST_RADIUS_PX;
  return players.some((p) => Math.hypot(p.x - c.x, p.y - c.y) <= r);
}

function splitLootShares(
  quantity: number,
  recipients: string[],
): Map<string, number> {
  const shares = new Map<string, number>();
  if (recipients.length === 0 || quantity <= 0) return shares;
  for (let i = 0; i < quantity; i++) {
    const who = recipients[Math.floor(Math.random() * recipients.length)]!;
    shares.set(who, (shares.get(who) ?? 0) + 1);
  }
  return shares;
}

async function enqueueItemGrant(
  guestId: string,
  grant: ExplorationPendingItemGrant,
  roomId = COOP_PLAYTEST_ROOM_ID,
) {
  await prisma.gameExplorationPendingGrant.create({
    data: {
      id: randomUUID(),
      roomId,
      guestId,
      kind: "item",
      payloadJson: grant as object,
    },
  });
}

export async function takePendingGrantsForGuest(
  guestId: string,
): Promise<ExplorationWorldGrant[]> {
  const id = guestId.trim().slice(0, 64);
  if (!id) return [];
  const rows = await prisma.gameExplorationPendingGrant.findMany({
    where: { guestId: id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });
  if (rows.length === 0) return [];
  await prisma.gameExplorationPendingGrant.deleteMany({
    where: { id: { in: rows.map((r) => r.id) } },
  });
  const out: ExplorationWorldGrant[] = [];
  for (const r of rows) {
    if (r.kind !== "item" || !r.payloadJson || typeof r.payloadJson !== "object") continue;
    const p = r.payloadJson as ExplorationPendingItemGrant;
    if (p.kind === "item" && p.stack?.itemId) out.push(p);
  }
  return out;
}

async function loadZoneDims(zoneId: string): Promise<{ w: number; h: number } | null> {
  const z = await prisma.gameExplorationZone.findUnique({
    where: { id: zoneId },
    select: { worldWidthPx: true, worldHeightPx: true, active: true },
  });
  if (!z || !z.active) return null;
  return { w: z.worldWidthPx, h: z.worldHeightPx };
}

async function zonePlayers(zoneId: string): Promise<PlayerPos[]> {
  const peers = await listCoopPresencePeers({ zoneId });
  const cutoff = Date.now() - COOP_PRESENCE_STALE_MS;
  return peers
    .filter((p) => {
      // listCoopPresencePeers already filters stale; keep defensive
      return p.zoneId === zoneId;
    })
    .map((p) => ({
      guestId: p.id,
      x: p.x,
      y: p.y,
      displayName: p.displayName,
    }));
}

function seedState(
  areas: ExplorationCollectAreaView[],
  worldW: number,
  worldH: number,
  gathering: ExplorationGatheringSettings,
): ExplorationZoneWorldState {
  let nodes: ExplorationWorldNode[] = [];
  let bugs: ExplorationFleeingBug[] = [];
  const areaMeta: ExplorationZoneWorldState["areaMeta"] = {};
  const now = Date.now();
  for (const area of areas) {
    areaMeta[area.id] = { areaId: area.id, lastActiveAt: now, stasis: false };
    if (area.kind === "COLLECT") {
      nodes = refillCollectAreaNodes(area, nodes, worldW, worldH);
    } else if (areaSpawnsRoamBugs(area)) {
      const spawned = refillRoamBugs(area, bugs, worldW, worldH, gathering.bugLingerMs, {
        escapeMissesMin: gathering.bugEscapeMissesMin,
        escapeMissesMax: gathering.bugEscapeMissesMax,
      });
      bugs = [...bugs, ...spawned];
    }
  }
  return { nodes, bugs, areaMeta };
}

function tickBugs(
  state: ExplorationZoneWorldState,
  areas: ExplorationCollectAreaView[],
  players: PlayerPos[],
  worldW: number,
  worldH: number,
  dtMs: number,
  gathering: ExplorationGatheringSettings,
  now: number,
): ExplorationZoneWorldState {
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const dt = Math.min(WORLD_MAX_TICK_MS, Math.max(0, dtMs)) / 1000;
  if (dt <= 0) return state;

  // Update stasis / interest per roam area.
  for (const area of areas) {
    if (!areaSpawnsRoamBugs(area) && area.kind !== "COLLECT") continue;
    const active = areaInInterest(area, players, worldW, worldH);
    const prev = state.areaMeta[area.id] ?? {
      areaId: area.id,
      lastActiveAt: 0,
      stasis: true,
    };
    if (active) {
      state.areaMeta[area.id] = {
        areaId: area.id,
        lastActiveAt: now,
        stasis: false,
      };
    } else {
      const idle = now - (prev.lastActiveAt || 0) >= WORLD_STASIS_AFTER_MS;
      state.areaMeta[area.id] = {
        areaId: area.id,
        lastActiveAt: prev.lastActiveAt || 0,
        stasis: idle,
      };
    }
  }

  // Refill collect nodes always (static; cheap) when players in zone.
  if (players.length > 0) {
    for (const area of areas) {
      if (area.kind !== "COLLECT") continue;
      const meta = state.areaMeta[area.id];
      if (meta?.stasis) continue;
      state.nodes = refillCollectAreaNodes(area, state.nodes, worldW, worldH);
    }
  }

  // Ambient refill + motion only for non-stasis roam areas.
  const nextBugs: ExplorationFleeingBug[] = [];
  for (const area of areas) {
    if (!areaSpawnsRoamBugs(area)) continue;
    const meta = state.areaMeta[area.id];
    if (meta?.stasis) {
      // Keep frozen poses.
      for (const b of state.bugs) {
        if (b.ambient && b.areaId === area.id) nextBugs.push(b);
      }
      continue;
    }
    const existing = state.bugs.filter((b) => b.ambient && b.areaId === area.id);
    const spawned = refillRoamBugs(area, existing, worldW, worldH, gathering.bugLingerMs, {
      escapeMissesMin: gathering.bugEscapeMissesMin,
      escapeMissesMax: gathering.bugEscapeMissesMax,
    });
    const pool = [...existing, ...spawned];
    for (const b of pool) {
      nextBugs.push(stepBug(b, areaById.get(b.areaId!) ?? null, worldW, worldH, dt, now));
    }
  }

  // Non-ambient (burst) bugs — always tick until expire.
  for (const b of state.bugs) {
    if (b.ambient) continue;
    if (b.expiresAt <= now) continue;
    const roam = b.areaId ? areaById.get(b.areaId) ?? null : null;
    nextBugs.push(stepBug(b, roam, worldW, worldH, dt, now));
  }

  state.bugs = nextBugs;
  return state;
}

function stepBug(
  b: ExplorationFleeingBug,
  roam: ExplorationCollectAreaView | null,
  worldW: number,
  worldH: number,
  dt: number,
  now: number,
): ExplorationFleeingBug {
  const catalogStep = Number.isFinite(b.stepDistancePx) ? b.stepDistancePx : 24;
  const stepDist = Math.max(28, Math.min(160, Math.round(Math.max(4, catalogStep) * 1.35)));
  const speed = Number.isFinite(b.speedPx) && b.speedPx > 0 ? Math.max(18, b.speedPx) : 48;
  let facing = Number.isFinite(b.facingDeg) ? b.facingDeg : Math.random() * 360;
  let stepRemaining = Number.isFinite(b.stepRemainingPx) ? b.stepRemainingPx : stepDist;
  let pauseUntil = Number.isFinite(b.pauseUntilMs) ? b.pauseUntilMs : 0;
  let x = Number.isFinite(b.x) ? b.x : worldW / 2;
  let y = Number.isFinite(b.y) ? b.y : worldH / 2;
  const STEP_EPS = 0.5;

  if (!(stepRemaining >= STEP_EPS)) stepRemaining = 0;
  if (pauseUntil > now + 2000) pauseUntil = 0;

  if (!(stepRemaining > 0) && !(pauseUntil > 0)) {
    const catalogPause = Math.max(0, Number(b.stepPauseMs) || 0);
    const wantRest = catalogPause > 0 && Math.random() < 0.18;
    if (wantRest) {
      const pauseCap = Math.min(catalogPause, 120);
      pauseUntil = now + Math.round(pauseCap * (0.35 + Math.random() * 0.65));
    } else {
      facing = facing + (Math.random() - 0.5) * 70;
      stepRemaining = stepDist;
    }
  }
  if (pauseUntil > 0) {
    if (now < pauseUntil) {
      return { ...b, x, y, facingDeg: facing, stepRemainingPx: 0, pauseUntilMs: pauseUntil };
    }
    if (roam) {
      const center = collectAreaCenter(roam, worldW, worldH);
      const inward = (Math.atan2(center.y - y, center.x - x) * 180) / Math.PI;
      facing = inward + (Math.random() - 0.5) * 120;
    } else {
      facing = Math.random() * 360;
    }
    stepRemaining = stepDist;
    pauseUntil = 0;
  }
  if (!(stepRemaining >= STEP_EPS)) stepRemaining = stepDist;

  const maxMove = Math.min(stepRemaining, speed * Math.max(dt, 1 / 30));
  let stepped = stepAmbientBugPosition({
    x,
    y,
    facingDeg: facing,
    distancePx: maxMove,
    area: roam,
    worldW,
    worldH,
  });
  let traveled = Math.hypot(stepped.x - x, stepped.y - y);
  if (traveled < 0.15 && maxMove > 0.05 && roam) {
    const center = collectAreaCenter(roam, worldW, worldH);
    const inward = (Math.atan2(center.y - y, center.x - x) * 180) / Math.PI;
    facing = inward + (Math.random() - 0.5) * 90;
    stepped = stepAmbientBugPosition({
      x,
      y,
      facingDeg: facing,
      distancePx: Math.max(maxMove, 2.5),
      area: roam,
      worldW,
      worldH,
    });
    traveled = Math.hypot(stepped.x - x, stepped.y - y);
  }
  let nextRemaining =
    traveled < 0.15 ? 0 : Math.max(0, stepRemaining - Math.max(traveled, maxMove));
  if (nextRemaining < STEP_EPS) nextRemaining = 0;

  return {
    ...b,
    x: stepped.x,
    y: stepped.y,
    facingDeg: stepped.facingDeg,
    speedPx: speed,
    stepRemainingPx: nextRemaining,
    pauseUntilMs: pauseUntil,
  };
}

async function saveWorld(
  zoneId: string,
  state: ExplorationZoneWorldState,
  lastTickAt: Date,
) {
  await prisma.gameExplorationZoneWorld.upsert({
    where: { zoneId },
    create: {
      id: randomUUID(),
      zoneId,
      roomId: COOP_PLAYTEST_ROOM_ID,
      lastTickAt,
      stateJson: state as object,
    },
    update: {
      lastTickAt,
      stateJson: state as object,
    },
  });
}

/** Load (or seed), lazy-tick, persist, return state. */
export async function syncZoneWorld(zoneId: string): Promise<{
  state: ExplorationZoneWorldState;
  worldW: number;
  worldH: number;
  gathering: ExplorationGatheringSettings;
  areas: ExplorationCollectAreaView[];
} | null> {
  const dims = await loadZoneDims(zoneId);
  if (!dims) return null;
  const [areas, settings, players, row] = await Promise.all([
    listCollectAreasForPlay(zoneId),
    loadExplorationGeneralSettings(),
    zonePlayers(zoneId),
    prisma.gameExplorationZoneWorld.findUnique({ where: { zoneId } }),
  ]);
  const gathering =
    settings.gathering ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.gathering;
  const now = Date.now();
  let state = row ? parseState(row.stateJson) : emptyState();
  if (!row || (state.nodes.length === 0 && state.bugs.length === 0 && areas.length > 0)) {
    state = seedState(areas, dims.w, dims.h, gathering);
  }
  const lastTick = row?.lastTickAt?.getTime() ?? now;
  const dtMs = Math.min(WORLD_MAX_TICK_MS, Math.max(0, now - lastTick));
  state = tickBugs(state, areas, players, dims.w, dims.h, dtMs, gathering, now);
  await saveWorld(zoneId, state, new Date(now));
  return { state, worldW: dims.w, worldH: dims.h, gathering, areas };
}

function toSnapshot(
  zoneId: string,
  state: ExplorationZoneWorldState,
  grants: ExplorationWorldGrant[],
): ExplorationWorldSnapshot {
  return {
    zoneId,
    nodes: state.nodes,
    bugs: state.bugs,
    areaMeta: state.areaMeta,
    grants,
    serverTime: Date.now(),
  };
}

export async function getWorldSnapshotForGuest(
  zoneId: string,
  guestId: string,
): Promise<ExplorationWorldSnapshot | null> {
  // Poll path must stay light (no bug tick storm), but harvest nodes still need topping up —
  // clients no longer refill locally when shared world is on.
  const dims = await loadZoneDims(zoneId);
  if (!dims) return null;

  const [areas, row] = await Promise.all([
    listCollectAreasForPlay(zoneId),
    prisma.gameExplorationZoneWorld.findUnique({ where: { zoneId } }),
  ]);

  let state = row ? parseState(row.stateJson) : emptyState();
  let dirty = false;

  if (!row) {
    const settings = await loadExplorationGeneralSettings();
    const gathering =
      settings.gathering ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.gathering;
    state = seedState(areas, dims.w, dims.h, gathering);
    dirty = true;
  } else {
    const before = state.nodes.length;
    for (const area of areas) {
      if (area.kind !== "COLLECT") continue;
      state.nodes = refillCollectAreaNodes(area, state.nodes, dims.w, dims.h);
    }
    if (state.nodes.length !== before) dirty = true;
  }

  if (dirty) {
    await saveWorld(zoneId, state, new Date());
  }

  const grants = await takePendingGrantsForGuest(guestId);
  return toSnapshot(zoneId, state, grants);
}

/** Admin live-map: nodes/bugs without consuming party grants. */
export async function getWorldSnapshotForAdmin(
  zoneId: string,
): Promise<ExplorationWorldSnapshot | null> {
  const dims = await loadZoneDims(zoneId);
  if (!dims) return null;

  const [areas, row] = await Promise.all([
    listCollectAreasForPlay(zoneId),
    prisma.gameExplorationZoneWorld.findUnique({ where: { zoneId } }),
  ]);

  let state = row ? parseState(row.stateJson) : emptyState();
  let dirty = false;

  if (!row) {
    const settings = await loadExplorationGeneralSettings();
    const gathering =
      settings.gathering ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.gathering;
    state = seedState(areas, dims.w, dims.h, gathering);
    dirty = true;
  } else {
    const before = state.nodes.length;
    for (const area of areas) {
      if (area.kind !== "COLLECT") continue;
      state.nodes = refillCollectAreaNodes(area, state.nodes, dims.w, dims.h);
    }
    if (state.nodes.length !== before) dirty = true;
  }

  if (dirty) {
    await saveWorld(zoneId, state, new Date());
  }

  return toSnapshot(zoneId, state, []);
}

async function partyRecipientsInRange(opts: {
  actorGuestId: string;
  actorName: string;
  x: number;
  y: number;
  zoneId: string;
  shareDistancePx: number;
}): Promise<{ recipients: string[]; nameById: Record<string, string>; itemSharing: boolean }> {
  const party = await getPartyForGuest(opts.actorGuestId);
  if (!party || !party.itemSharing || party.members.length <= 1) {
    return {
      recipients: [opts.actorGuestId],
      nameById: { [opts.actorGuestId]: opts.actorName },
      itemSharing: false,
    };
  }
  const memberIds = party.members.map((m) => m.guestId);
  const peers = await listCoopPresenceByGuestIds(memberIds);
  const nameById: Record<string, string> = {};
  for (const m of party.members) nameById[m.guestId] = m.displayName;
  nameById[opts.actorGuestId] = opts.actorName;

  const recipients = [opts.actorGuestId];
  for (const p of peers) {
    if (p.id === opts.actorGuestId) continue;
    if (p.zoneId !== opts.zoneId) continue;
    if (Math.hypot(p.x - opts.x, p.y - opts.y) > opts.shareDistancePx) continue;
    recipients.push(p.id);
  }
  return {
    recipients: [...new Set(recipients)],
    nameById,
    itemSharing: recipients.length > 1,
  };
}

export async function hitWorldNode(input: {
  zoneId: string;
  guestId: string;
  displayName: string;
  nodeId: string;
  x: number;
  y: number;
  toolId: string;
}): Promise<ExplorationWorldHitResult> {
  const synced = await syncZoneWorld(input.zoneId);
  if (!synced) return { ok: false, error: "Zone not found." };
  const { state, worldW, worldH, gathering, areas } = synced;
  const node = state.nodes.find((n) => n.id === input.nodeId);
  if (!node) return { ok: false, error: "Node gone.", node: null };

  const tools = await listExplorationToolsActive();
  const tool: ExplorationToolView | null = tools.find((t) => t.id === input.toolId) ?? null;
  const workReach = toolWorkInRangePx(tool?.workDistancePx);
  if (Math.hypot(node.x - input.x, node.y - input.y) > workReach) {
    return { ok: false, error: "Out of range." };
  }

  const dmg = tool ? rollToolHitDamage(tool) : { damage: 1, crit: false };
  const nextHp = node.hp - dmg.damage;
  if (nextHp > 0) {
    state.nodes = state.nodes.map((n) =>
      n.id === node.id ? { ...n, hp: nextHp } : n,
    );
    await saveWorld(input.zoneId, state, new Date());
    const grants = await takePendingGrantsForGuest(input.guestId);
    return {
      ok: true,
      node: { ...node, hp: nextHp },
      resolved: false,
      damage: dmg.damage,
      crit: dmg.crit,
      snapshot: toSnapshot(input.zoneId, state, grants),
    };
  }

  // Resolve
  const settings = await loadExplorationGeneralSettings();
  const sharePx = settings.experience.shareDistancePx;
  const success = rollCollectionSuccess({
    tool,
    requiredToolKind: node.requiredToolKind,
    wrongToolChancePct: gathering.wrongToolChancePct,
  });
  const loot = success ? rollLootFromNode(node) : null;
  const logLines: Array<{ kind: string; body: string }> = [];
  const lootStacks: ExplorationBagStack[] = [];

  if (loot) {
    const stack: ExplorationBagStack = {
      itemId: loot.item.id,
      name: loot.item.name,
      imageUrl: loot.item.imageUrl,
      quantity: loot.quantity,
      stackMax: loot.item.stackMax,
      iconStretch: loot.item.iconStretch,
    };
    const share = await partyRecipientsInRange({
      actorGuestId: input.guestId,
      actorName: input.displayName,
      x: input.x,
      y: input.y,
      zoneId: input.zoneId,
      shareDistancePx: sharePx,
    });
    const shares = share.itemSharing
      ? splitLootShares(stack.quantity, share.recipients)
      : new Map([[input.guestId, stack.quantity]]);

    for (const [whoId, qty] of shares) {
      if (qty <= 0) continue;
      const piece = { ...stack, quantity: qty };
      const whoName = share.nameById[whoId] || whoId.slice(0, 8);
      logLines.push({
        kind: "loot",
        body:
          whoId === input.guestId && shares.size === 1
            ? `Got ${qty}× ${stack.name}`
            : `${whoName} got ${qty}× ${stack.name}`,
      });
      if (whoId === input.guestId) {
        lootStacks.push(piece);
      } else {
        await enqueueItemGrant(whoId, {
          kind: "item",
          stack: piece,
          fromName: input.displayName,
        });
      }
    }
  } else {
    logLines.push({ kind: "gather", body: "Nothing collected" });
  }

  const burst = spawnBugsFromOverlappingRoam({
    node,
    collectArea: areas.find((a) => a.id === node.areaId) ?? null,
    roamAreas: areas.filter((a) => areaSpawnsRoamBugs(a)),
    worldW,
    worldH,
    lingerMs: gathering.bugLingerMs,
    escapeMissesMin: gathering.bugEscapeMissesMin,
    escapeMissesMax: gathering.bugEscapeMissesMax,
  });

  let without = state.nodes.filter((n) => n.id !== node.id);
  const area = areas.find((a) => a.id === node.areaId);
  if (area) without = refillCollectAreaNodes(area, without, worldW, worldH);
  state.nodes = without;
  state.bugs = [...state.bugs, ...burst];

  await saveWorld(input.zoneId, state, new Date());
  const grants = await takePendingGrantsForGuest(input.guestId);
  return {
    ok: true,
    node: null,
    resolved: true,
    damage: dmg.damage,
    crit: dmg.crit,
    lootStacks,
    logLines,
    dust: !loot,
    burstBugIds: burst.map((b) => b.id),
    snapshot: toSnapshot(input.zoneId, state, grants),
  };
}

export async function catchWorldBug(input: {
  zoneId: string;
  guestId: string;
  displayName: string;
  bugId: string;
  x: number;
  y: number;
  toolId: string;
}): Promise<ExplorationWorldCatchResult> {
  const synced = await syncZoneWorld(input.zoneId);
  if (!synced) return { ok: false, error: "Zone not found." };
  const { state, gathering } = synced;
  const bug = state.bugs.find((b) => b.id === input.bugId);
  if (!bug) return { ok: false, error: "Bug gone.", bug: null };

  const tools = await listExplorationToolsActive();
  const tool = tools.find((t) => t.id === input.toolId) ?? null;
  const reach = toolWorkInRangePx(tool?.workDistancePx);
  if (Math.hypot(bug.x - input.x, bug.y - input.y) > reach + 40) {
    return { ok: false, error: "Out of range." };
  }

  const caught = rollBugCatchSuccess({
    tool,
    bugCatchToolKinds: bug.catchToolKinds,
    wrongToolChancePct: gathering.wrongToolChancePct,
  });

  const logLines: Array<{ kind: string; body: string }> = [];

  if (caught) {
    state.bugs = state.bugs.filter((b) => b.id !== bug.id);
    logLines.push({ kind: "loot", body: `Caught ${bug.name}` });
    await saveWorld(input.zoneId, state, new Date());
    const grants = await takePendingGrantsForGuest(input.guestId);
    return {
      ok: true,
      caught: true,
      bug,
      logLines,
      snapshot: toSnapshot(input.zoneId, state, grants),
    };
  }

  const failed = (bug.failedCatches ?? 0) + 1;
  const escapeAfter = bug.escapeAfterMisses ?? 3;
  if (failed >= escapeAfter && !bug.ambient) {
    state.bugs = state.bugs.filter((b) => b.id !== bug.id);
    logLines.push({ kind: "gather", body: `${bug.name} escaped` });
    await saveWorld(input.zoneId, state, new Date());
    const grants = await takePendingGrantsForGuest(input.guestId);
    return {
      ok: true,
      caught: false,
      escaped: true,
      bug: null,
      logLines,
      snapshot: toSnapshot(input.zoneId, state, grants),
    };
  }

  state.bugs = state.bugs.map((b) =>
    b.id === bug.id ? { ...b, failedCatches: failed } : b,
  );
  logLines.push({ kind: "gather", body: `Missed ${bug.name}` });
  await saveWorld(input.zoneId, state, new Date());
  const grants = await takePendingGrantsForGuest(input.guestId);
  return {
    ok: true,
    caught: false,
    escaped: false,
    bug: { ...bug, failedCatches: failed },
    logLines,
    snapshot: toSnapshot(input.zoneId, state, grants),
  };
}
