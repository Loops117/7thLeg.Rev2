# Exploration realtime (GSA)

Node WebSocket service for a **GameServerApp Custom Windows blueprint**.

Pose / peer fan-out lives here. Inventory, world nodes, party, and session commands stay on Next.js (HTTP) for now.

See **[GSA_BLUEPRINT.md](./GSA_BLUEPRINT.md)** for dashboard fields.

## Protocol (`/ws`)

| Type | Dir | Purpose |
|------|-----|---------|
| `hello` | S→C | On connect |
| `join` | C→S | `{ id, displayName, appearance, zoneId, pose, companion? }` |
| `joined` | S→C | `{ peers }` snapshot for zone |
| `pose` | C→S | Throttled pose + optional companion / appearance |
| `peer_update` | S→C | One peer in your zone |
| `peer_left` | S→C | Peer left / zone change / disconnect |
| `zone` | S→C | You changed zones; new `peers` |
| `leave` | C→S | Clean leave |
| `ping` / `pong` | both | Keepalive |

## Next.js env

```bash
# Local / http origin (mixed content blocks this from https://www.7thleg.com):
NEXT_PUBLIC_EXPLORATION_REALTIME_URL=ws://99.184.242.69:7813/ws

# Production needs TLS, e.g. Cloudflare Tunnel:
# NEXT_PUBLIC_EXPLORATION_REALTIME_URL=wss://game.7thleg.com/ws
```

Port `7813` is whatever GSA **Connect → Game port** shows (auto-assigned).

## Local smoke test

```bash
cd services/exploration-realtime
npm install
PORT=7813 node server.js
# curl http://127.0.0.1:7813/health
```

## Rebuild GSA image after server.js changes

On a Windows host that can build/push (or the R620):

```bat
cd services\exploration-realtime
docker build -f Dockerfile.windows -t loops117/7thleg-realtime:win-ltsc2019 .
docker push loops117/7thleg-realtime:win-ltsc2019
```

Then in GSA: pull/restart the game server so it picks up the new image. Confirm logs show listening on the **game port**, and `/health` includes `"players":0`.
