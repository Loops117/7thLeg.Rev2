/**
 * Exploration realtime — pose / peer fan-out for co-op playtest.
 * Inventory, world nodes, party, and session commands stay on Next.js for now.
 *
 * Env:
 *   PORT  — listen port (GSA game port / {gameserver.game_port})
 *   HOST  — bind address (default 0.0.0.0)
 */
"use strict";

const http = require("node:http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || "0.0.0.0";
const STALE_MS = 15_000;
const POSE_BROADCAST_MIN_MS = 50;

/** @typedef {{
 *   id: string,
 *   displayName: string,
 *   appearance: object,
 *   x: number,
 *   y: number,
 *   facingDeg: number,
 *   walking: boolean,
 *   zoneId: string,
 *   companion: object | null,
 *   updatedAt: number,
 *   socket: import("ws").WebSocket,
 * }} Presence */

/** @type {Map<string, Presence>} */
const byId = new Map();

function send(socket, msg) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify(msg));
}

function peerView(p) {
  return {
    id: p.id,
    displayName: p.displayName,
    appearance: p.appearance,
    x: p.x,
    y: p.y,
    facingDeg: p.facingDeg,
    walking: p.walking,
    zoneId: p.zoneId,
    updatedAt: p.updatedAt,
    companion: p.companion,
  };
}

function peersInZone(zoneId, excludeId) {
  const out = [];
  for (const p of byId.values()) {
    if (p.zoneId !== zoneId) continue;
    if (excludeId && p.id === excludeId) continue;
    out.push(peerView(p));
  }
  return out;
}

function broadcastZone(zoneId, msg, excludeId) {
  const raw = JSON.stringify(msg);
  for (const p of byId.values()) {
    if (p.zoneId !== zoneId) continue;
    if (excludeId && p.id === excludeId) continue;
    if (p.socket.readyState === 1) p.socket.send(raw);
  }
}

function removePresence(id, reason) {
  const prev = byId.get(id);
  if (!prev) return;
  byId.delete(id);
  broadcastZone(
    prev.zoneId,
    { type: "peer_left", id, zoneId: prev.zoneId, reason: reason || "leave" },
    id,
  );
}

function handleJoin(socket, msg) {
  const id = typeof msg.id === "string" ? msg.id.trim().slice(0, 64) : "";
  const displayName =
    typeof msg.displayName === "string" ? msg.displayName.trim().slice(0, 24) : "";
  const zoneId = typeof msg.zoneId === "string" ? msg.zoneId.trim().slice(0, 64) : "";
  if (!id || !displayName || !zoneId || !msg.appearance || typeof msg.appearance !== "object") {
    send(socket, { type: "error", error: "invalid_join" });
    return;
  }

  const existing = byId.get(id);
  if (existing && existing.socket !== socket) {
    try {
      existing.socket.close(4000, "replaced");
    } catch {
      /* ignore */
    }
    byId.delete(id);
  }

  const pose = msg.pose && typeof msg.pose === "object" ? msg.pose : {};
  const now = Date.now();
  /** @type {Presence} */
  const row = {
    id,
    displayName,
    appearance: msg.appearance,
    x: Number(pose.x) || 0,
    y: Number(pose.y) || 0,
    facingDeg: Number(pose.facingDeg) || 0,
    walking: Boolean(pose.walking),
    zoneId,
    companion: msg.companion && typeof msg.companion === "object" ? msg.companion : null,
    updatedAt: now,
    socket,
  };
  socket._playerId = id;
  socket._lastPoseBroadcast = 0;
  byId.set(id, row);

  send(socket, {
    type: "joined",
    id,
    zoneId,
    peers: peersInZone(zoneId, id),
    at: now,
  });
  broadcastZone(zoneId, { type: "peer_update", peer: peerView(row) }, id);
}

function handlePose(socket, msg) {
  const id = socket._playerId;
  if (!id) {
    send(socket, { type: "error", error: "not_joined" });
    return;
  }
  const row = byId.get(id);
  if (!row || row.socket !== socket) return;

  const pose = msg.pose && typeof msg.pose === "object" ? msg.pose : msg;
  const nextZone =
    typeof pose.zoneId === "string" && pose.zoneId.trim()
      ? pose.zoneId.trim().slice(0, 64)
      : row.zoneId;
  const prevZone = row.zoneId;

  if (typeof msg.displayName === "string" && msg.displayName.trim()) {
    row.displayName = msg.displayName.trim().slice(0, 24);
  }
  if (msg.appearance && typeof msg.appearance === "object") {
    row.appearance = msg.appearance;
  }
  if (msg.companion !== undefined) {
    row.companion =
      msg.companion && typeof msg.companion === "object" ? msg.companion : null;
  }

  row.x = Number(pose.x) || 0;
  row.y = Number(pose.y) || 0;
  row.facingDeg = Number(pose.facingDeg) || 0;
  row.walking = Boolean(pose.walking);
  row.updatedAt = Date.now();

  if (nextZone !== prevZone) {
    row.zoneId = nextZone;
    broadcastZone(prevZone, { type: "peer_left", id, zoneId: prevZone, reason: "zone" }, id);
    send(socket, {
      type: "zone",
      zoneId: nextZone,
      peers: peersInZone(nextZone, id),
    });
    broadcastZone(nextZone, { type: "peer_update", peer: peerView(row) }, id);
    return;
  }

  const last = socket._lastPoseBroadcast || 0;
  if (row.updatedAt - last < POSE_BROADCAST_MIN_MS) return;
  socket._lastPoseBroadcast = row.updatedAt;
  broadcastZone(row.zoneId, { type: "peer_update", peer: peerView(row) }, id);
}

function handleLeave(socket) {
  const id = socket._playerId;
  if (!id) return;
  removePresence(id, "leave");
  socket._playerId = null;
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    const body = JSON.stringify({
      ok: true,
      service: "7thleg-exploration-realtime",
      port: PORT,
      players: byId.size,
      at: Date.now(),
    });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  send(socket, { type: "hello", service: "7thleg-exploration-realtime" });

  socket.on("message", (raw) => {
    let msg = null;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(socket, { type: "error", error: "invalid_json" });
      return;
    }
    if (!msg || typeof msg.type !== "string") {
      send(socket, { type: "error", error: "invalid_message" });
      return;
    }
    switch (msg.type) {
      case "ping":
        send(socket, { type: "pong", at: Date.now() });
        break;
      case "join":
        handleJoin(socket, msg);
        break;
      case "pose":
        handlePose(socket, msg);
        break;
      case "leave":
        handleLeave(socket);
        break;
      default:
        send(socket, { type: "error", error: "unknown_type" });
    }
  });

  socket.on("close", () => {
    const id = socket._playerId;
    if (id) {
      const row = byId.get(id);
      if (row && row.socket === socket) removePresence(id, "disconnect");
    }
  });
});

setInterval(() => {
  const cutoff = Date.now() - STALE_MS;
  for (const p of [...byId.values()]) {
    if (p.updatedAt < cutoff) {
      try {
        p.socket.close(4001, "stale");
      } catch {
        /* ignore */
      }
      removePresence(p.id, "stale");
    }
  }
}, 5_000);

server.listen(PORT, HOST, () => {
  console.log(`[7thleg-realtime] listening on http://${HOST}:${PORT}  ws path /ws`);
});

function shutdown(signal) {
  console.log(`[7thleg-realtime] ${signal}, shutting down`);
  wss.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
