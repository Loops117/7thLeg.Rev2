/** Browser WebSocket client for exploration dedicated realtime (pose fan-out). */

import type {
  CoopPresenceActivity,
  CoopPresenceCompanion,
  CoopPresencePeer,
} from "@/lib/game-exploration-coop-shared";
import type { ExplorationAvatarAppearance } from "@/lib/game-exploration-avatar-shared";

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

export type ExplorationRealtimeHandlers = {
  onPeers: (peers: CoopPresencePeer[]) => void;
  onPeerUpdate: (peer: CoopPresencePeer) => void;
  onPeerLeft: (id: string) => void;
  onStatus?: (connected: boolean) => void;
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
} {
  let socket: WebSocket | null = null;
  let stopped = false;
  let joined = false;
  let reconnectTimer = 0;
  let poseTimer = 0;
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
          break;
        }
        case "peer_update":
          if (isPeer(msg.peer)) handlers.onPeerUpdate(msg.peer);
          break;
        case "peer_left":
          if (typeof msg.id === "string") handlers.onPeerLeft(msg.id);
          break;
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
  };
}

/** Helper to build companion blob matching HTTP presence shape. */
export function buildRealtimeCompanion(input: {
  followerId?: string;
  mountId?: string;
  mounted?: boolean;
  activity?: CoopPresenceActivity | null;
}): CoopPresenceCompanion {
  return {
    followerId: input.followerId || undefined,
    mountId: input.mountId || undefined,
    mounted: Boolean(input.mounted),
    activity: input.activity ?? null,
  };
}
