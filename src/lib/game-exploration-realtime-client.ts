/** Browser WebSocket client for exploration dedicated realtime (pose, bugs, chat, world patches). */

import type {
  CoopPresenceActivity,
  CoopPresenceCompanion,
  CoopPresencePeer,
} from "@/lib/game-exploration-coop-shared";
import type { ExplorationAvatarAppearance } from "@/lib/game-exploration-avatar-shared";
import { areaSpawnsRoamBugs, type ExplorationFleeingBug, type ExplorationWorldNode } from "@/lib/game-exploration-gather-shared";
import { parseBugActivityPeriod } from "@/lib/game-exploration-bugs-shared";
import type { ExplorationChatMessage } from "@/lib/game-exploration-chat";

/** How often we push local pose to the dedicated server. */
export const REALTIME_POSE_TICK_MS = 100;

export function getExplorationRealtimeWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_EXPLORATION_REALTIME_URL?.trim() ?? "";
  return raw;
}

export type RealtimeJoinPayload = {
  id: string;
  displayName: string;
  appearance: ExplorationAvatarAppearance;
  zoneId: string;
  pose: {
    x: number;
    y: number;
    facingDeg: number;
    walking: boolean;
  };
  companion?: CoopPresenceCompanion | null;
};

export type RealtimeBugsSubscribePayload = {
  zoneId: string;
  worldW: number;
  worldH: number;
  areas: unknown[];
  escapeMissesMin?: number;
  escapeMissesMax?: number;
  wrongToolChancePct?: number;
  isNight?: boolean;
};

export type RealtimeCatchAttemptPayload = {
  bugId: string;
  toolKind: string;
  collectionChancePct: number;
  wrongToolChancePct: number;
  /** Client in-range distance (reach + slack). */
  workDistancePx: number;
  /** Catch-time player pose (avoids stale server pose rejects). */
  x?: number;
  y?: number;
};

export type RealtimeCatchResult = {
  ok: boolean;
  caught?: boolean;
  bugId?: string;
  bug?: ExplorationFleeingBug;
  error?: string;
  failedCatches?: number;
};

export type RealtimeChatSayPayload = {
  id?: string;
  channel: "all" | "zone";
  body: string;
  zoneName?: string;
  at?: number;
};

export type RealtimeWorldNodesPatch = {
  zoneId: string;
  upserts?: ExplorationWorldNode[];
  removes?: string[];
};

export type ExplorationRealtimeHandlers = {
  onPeers: (peers: CoopPresencePeer[]) => void;
  onPeerUpdate: (peer: CoopPresencePeer) => void;
  onPeerLeft: (id: string) => void;
  onStatus?: (connected: boolean) => void;
  onBugsSnapshot?: (bugs: ExplorationFleeingBug[], zoneId: string) => void;
  onBugsDelta?: (delta: {
    zoneId: string;
    upserts?: ExplorationFleeingBug[];
    removes?: string[];
    replace?: boolean;
    bugs?: ExplorationFleeingBug[];
  }) => void;
  onCatchResult?: (result: RealtimeCatchResult) => void;
  onBugCaught?: (info: { bugId: string; byId: string; byName: string }) => void;
  onChatMessage?: (message: ExplorationChatMessage) => void;
  onWorldNodesPatch?: (patch: RealtimeWorldNodesPatch & { byId?: string }) => void;
};

type PoseSnapshot = {
  x: number;
  y: number;
  facingDeg: number;
  walking: boolean;
  mounted: boolean;
  zoneId: string;
  displayName: string;
  appearance: ExplorationAvatarAppearance;
  companion: CoopPresenceCompanion | null;
};

function isPeer(raw: unknown): raw is CoopPresencePeer {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.displayName === "string" &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    typeof p.zoneId === "string" &&
    p.appearance != null &&
    typeof p.appearance === "object"
  );
}

function asChatMessage(raw: unknown): ExplorationChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || typeof m.body !== "string" || typeof m.from !== "string") {
    return null;
  }
  const channel =
    m.channel === "zone" || m.channel === "all" || m.channel === "party" || m.channel === "dm"
      ? m.channel
      : "all";
  return {
    id: m.id,
    channel,
    from: m.from,
    to: typeof m.to === "string" ? m.to : undefined,
    body: m.body,
    zoneName: typeof m.zoneName === "string" ? m.zoneName : "",
    at: typeof m.at === "number" ? m.at : Date.now(),
    partyId: typeof m.partyId === "string" ? m.partyId : undefined,
  };
}

function asWorldNode(raw: unknown): ExplorationWorldNode | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  if (typeof n.id !== "string" || typeof n.areaId !== "string") return null;
  return n as ExplorationWorldNode;
}

function asBug(raw: unknown): ExplorationFleeingBug | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.id !== "string" || typeof b.bugId !== "string") return null;
  return {
    id: b.id,
    bugId: b.bugId,
    name: typeof b.name === "string" ? b.name : "Bug",
    bugType: typeof b.bugType === "string" ? b.bugType : "",
    imageUrl: typeof b.imageUrl === "string" ? b.imageUrl : "",
    iconStretch: Boolean(b.iconStretch),
    x: Number(b.x) || 0,
    y: Number(b.y) || 0,
    speedPx: Number(b.speedPx) || 90,
    facingDeg: Number(b.facingDeg) || 0,
    expiresAt: typeof b.expiresAt === "number" ? b.expiresAt : Number.MAX_SAFE_INTEGER,
    sizePx: Number(b.sizePx) || 28,
    stepDistancePx: Number(b.stepDistancePx) || 24,
    stepPauseMs: Number(b.stepPauseMs) || 400,
    catchToolKinds: Array.isArray(b.catchToolKinds)
      ? (b.catchToolKinds as ExplorationFleeingBug["catchToolKinds"])
      : [],
    bodyVariant: typeof b.bodyVariant === "string" ? b.bodyVariant : "beetle",
    parts:
      b.parts && typeof b.parts === "object"
        ? (b.parts as Record<string, string>)
        : {},
    style:
      b.style && typeof b.style === "object"
        ? (b.style as ExplorationFleeingBug["style"])
        : undefined,
    ambient: b.ambient !== false,
    areaId: typeof b.areaId === "string" ? b.areaId : undefined,
    stepRemainingPx: Number(b.stepRemainingPx) || 0,
    pauseUntilMs: Number(b.pauseUntilMs) || 0,
    failedCatches: Number(b.failedCatches) || 0,
    escapeAfterMisses: Number(b.escapeAfterMisses) || 4,
    activityPeriod: parseBugActivityPeriod(b.activityPeriod),
    attractedToClearLight: Boolean(b.attractedToClearLight),
    deterredByClearLight: Boolean(b.deterredByClearLight),
  };
}

/**
 * Opens WS to dedicated host when URL is configured.
 * Returns a controller; call stop() on leave / unmount.
 */
export function connectExplorationRealtime(
  url: string,
  join: RealtimeJoinPayload,
  handlers: ExplorationRealtimeHandlers,
): {
  stop: () => void;
  publishPose: (snap: PoseSnapshot) => void;
  connected: () => boolean;
  subscribeBugs: (seed: RealtimeBugsSubscribePayload) => void;
  setBugsEnv: (env: { isNight?: boolean }) => void;
  catchAttempt: (payload: RealtimeCatchAttemptPayload) => void;
  sayChat: (payload: RealtimeChatSayPayload) => void;
  publishWorldNodesPatch: (patch: RealtimeWorldNodesPatch) => void;
} {
  let socket: WebSocket | null = null;
  let stopped = false;
  let joined = false;
  let reconnectTimer = 0;
  let poseTimer = 0;
  let pendingBugSeed: RealtimeBugsSubscribePayload | null = null;
  let latest: PoseSnapshot = {
    x: join.pose.x,
    y: join.pose.y,
    facingDeg: join.pose.facingDeg,
    walking: join.pose.walking,
    mounted: Boolean(join.companion?.mounted),
    zoneId: join.zoneId,
    displayName: join.displayName,
    appearance: join.appearance,
    companion: join.companion ?? null,
  };

  const setStatus = (ok: boolean) => {
    handlers.onStatus?.(ok);
  };

  const clearTimers = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = 0;
    }
    if (poseTimer) {
      window.clearInterval(poseTimer);
      poseTimer = 0;
    }
  };

  const send = (msg: Record<string, unknown>) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(msg));
  };

  const startPoseTicks = () => {
    if (poseTimer) return;
    poseTimer = window.setInterval(() => {
      if (!joined) return;
      send({
        type: "pose",
        displayName: latest.displayName,
        appearance: latest.appearance,
        companion: {
          ...(latest.companion ?? {}),
          mounted: latest.mounted,
        },
        pose: {
          x: latest.x,
          y: latest.y,
          facingDeg: latest.facingDeg,
          walking: latest.walking,
          zoneId: latest.zoneId,
        },
      });
    }, REALTIME_POSE_TICK_MS);
  };

  const flushBugSubscribe = () => {
    if (!joined || !pendingBugSeed) return;
    send({ type: "bugs_subscribe", ...pendingBugSeed });
  };

  const open = () => {
    if (stopped || !url) return;
    try {
      socket = new WebSocket(url);
    } catch {
      setStatus(false);
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      if (stopped) return;
      send({
        type: "join",
        id: join.id,
        displayName: latest.displayName,
        appearance: latest.appearance,
        zoneId: latest.zoneId,
        pose: {
          x: latest.x,
          y: latest.y,
          facingDeg: latest.facingDeg,
          walking: latest.walking,
        },
        companion: {
          ...(latest.companion ?? {}),
          mounted: latest.mounted,
        },
      });
      startPoseTicks();
    };

    socket.onmessage = (ev) => {
      let msg: Record<string, unknown> | null = null;
      try {
        msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== "string") return;

      switch (msg.type) {
        case "hello":
          break;
        case "joined":
        case "zone": {
          joined = true;
          setStatus(true);
          const peers = Array.isArray(msg.peers)
            ? (msg.peers.filter(isPeer) as CoopPresencePeer[])
            : [];
          handlers.onPeers(peers);
          flushBugSubscribe();
          break;
        }
        case "peer_update":
          if (isPeer(msg.peer)) handlers.onPeerUpdate(msg.peer);
          break;
        case "peer_left":
          if (typeof msg.id === "string") handlers.onPeerLeft(msg.id);
          break;
        case "bugs_snapshot": {
          const zoneId = typeof msg.zoneId === "string" ? msg.zoneId : "";
          const bugs = Array.isArray(msg.bugs)
            ? msg.bugs.map(asBug).filter((b): b is ExplorationFleeingBug => b != null)
            : [];
          handlers.onBugsSnapshot?.(bugs, zoneId);
          break;
        }
        case "bugs_delta": {
          const zoneId = typeof msg.zoneId === "string" ? msg.zoneId : "";
          if (msg.replace && Array.isArray(msg.bugs)) {
            const bugs = msg.bugs
              .map(asBug)
              .filter((b): b is ExplorationFleeingBug => b != null);
            handlers.onBugsDelta?.({ zoneId, replace: true, bugs });
            break;
          }
          const upserts = Array.isArray(msg.upserts)
            ? msg.upserts.map(asBug).filter((b): b is ExplorationFleeingBug => b != null)
            : undefined;
          const removes = Array.isArray(msg.removes)
            ? msg.removes.filter((x): x is string => typeof x === "string")
            : undefined;
          handlers.onBugsDelta?.({ zoneId, upserts, removes });
          break;
        }
        case "catch_result":
          handlers.onCatchResult?.({
            ok: Boolean(msg.ok),
            caught: Boolean(msg.caught),
            bugId: typeof msg.bugId === "string" ? msg.bugId : undefined,
            bug: asBug(msg.bug) ?? undefined,
            error: typeof msg.error === "string" ? msg.error : undefined,
            failedCatches:
              typeof msg.failedCatches === "number" ? msg.failedCatches : undefined,
          });
          break;
        case "bug_caught":
          if (typeof msg.bugId === "string" && typeof msg.byId === "string") {
            handlers.onBugCaught?.({
              bugId: msg.bugId,
              byId: msg.byId,
              byName: typeof msg.byName === "string" ? msg.byName : "Player",
            });
          }
          break;
        case "chat_message": {
          const chat = asChatMessage(msg.message);
          if (chat) handlers.onChatMessage?.(chat);
          break;
        }
        case "world_nodes_patch": {
          const zoneId = typeof msg.zoneId === "string" ? msg.zoneId : "";
          const upserts = Array.isArray(msg.upserts)
            ? msg.upserts
                .map(asWorldNode)
                .filter((n): n is ExplorationWorldNode => n != null)
            : undefined;
          const removes = Array.isArray(msg.removes)
            ? msg.removes.filter((x): x is string => typeof x === "string")
            : undefined;
          handlers.onWorldNodesPatch?.({
            zoneId,
            upserts,
            removes,
            byId: typeof msg.byId === "string" ? msg.byId : undefined,
          });
          break;
        }
        case "pong":
        case "error":
        default:
          break;
      }
    };

    socket.onclose = () => {
      joined = false;
      setStatus(false);
      if (poseTimer) {
        window.clearInterval(poseTimer);
        poseTimer = 0;
      }
      socket = null;
      if (!stopped) scheduleReconnect();
    };

    socket.onerror = () => {
      /* onclose handles reconnect */
    };
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = 0;
      open();
    }, 2_000);
  };

  open();

  return {
    stop: () => {
      stopped = true;
      clearTimers();
      setStatus(false);
      try {
        send({ type: "leave" });
        socket?.close();
      } catch {
        /* ignore */
      }
      socket = null;
      joined = false;
    },
    publishPose: (snap) => {
      latest = snap;
    },
    connected: () => joined && socket?.readyState === WebSocket.OPEN,
    subscribeBugs: (seed) => {
      pendingBugSeed = seed;
      flushBugSubscribe();
    },
    setBugsEnv: (env) => {
      if (pendingBugSeed && typeof env.isNight === "boolean") {
        pendingBugSeed = { ...pendingBugSeed, isNight: env.isNight };
      }
      send({ type: "bugs_env", ...env });
    },
    catchAttempt: (payload) => {
      send({ type: "catch_attempt", ...payload });
    },
    sayChat: (payload) => {
      send({ type: "chat_say", ...payload });
    },
    publishWorldNodesPatch: (patch) => {
      send({ type: "world_nodes_patch", ...patch });
    },
  };
}

/** Helper to build companion blob matching HTTP presence shape. */
export function buildRealtimeCompanion(input: {
  followerId?: string;
  mountId?: string;
  mounted?: boolean;
  equipment?: import("@/lib/game-exploration-equipment-shared").ExplorationEquipmentLoadout | null;
  activity?: CoopPresenceActivity | null;
  gm?: import("@/lib/game-exploration-coop-shared").CoopPresenceGm | null;
}): CoopPresenceCompanion {
  return {
    followerId: input.followerId || undefined,
    mountId: input.mountId || undefined,
    mounted: Boolean(input.mounted),
    equipment: input.equipment ?? null,
    activity: input.activity ?? null,
    gm: input.gm ?? null,
  };
}

/** Compact roam areas for bugs_subscribe (strip collect-only payload). */
export function serializeRoamAreasForRealtime(
  areas: import("@/lib/game-exploration-gather-shared").ExplorationCollectAreaView[],
): unknown[] {
  return areas
    .filter((a) => areaSpawnsRoamBugs(a) && a.active)
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      active: a.active,
      shape: a.shape,
      leftPct: a.leftPct,
      topPct: a.topPct,
      widthPct: a.widthPct,
      heightPct: a.heightPct,
      polyPoints: a.polyPoints,
      maxConcurrent: a.maxConcurrent,
      bugSets: a.bugSets
        .filter((s) => s.active)
        .map((s) => ({
          id: s.id,
          active: s.active,
          members: s.members.map((m) => ({
            spawnWeight: m.spawnWeight,
            minCount: m.minCount,
            maxCount: m.maxCount,
            bug: {
              id: m.bug.id,
              name: m.bug.name,
              bugType: m.bug.bugType,
              imageUrl: m.bug.imageUrl,
              iconStretch: m.bug.iconStretch,
              active: m.bug.active,
              speedPx: m.bug.speedPx,
              sizePx: m.bug.sizePx,
              stepDistancePx: m.bug.stepDistancePx,
              stepPauseMs: m.bug.stepPauseMs,
              catchToolKinds: m.bug.catchToolKinds,
              bodyVariant: m.bug.bodyVariant,
              parts: m.bug.parts,
              style: m.bug.style,
              activityPeriod: m.bug.activityPeriod,
              attractedToClearLight: m.bug.attractedToClearLight,
              deterredByClearLight: m.bug.deterredByClearLight,
            },
          })),
        })),
    }));
}
