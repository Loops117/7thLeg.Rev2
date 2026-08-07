# 7th Leg — GameServerApp Windows blueprint (no Discord required)

Fill this in the GSA dashboard using the public docs:
https://docs.gameserverapp.com/dashboard/blueprints/create_and_manage_blueprints/

**Do not use a Path of Titans / Steam marketplace BP.** Create your own **Custom game** blueprint.

---

## 0. Before you start

1. In GSA → Machines, note whether the R620 host is **Windows Server 2019 or 2022** (container OS must match).
2. You will either:
   - **Option A (recommended):** publish a Docker image you build (this repo’s `Dockerfile.windows`), or
   - **Option B:** use GSA’s Windows base image + portable Node in `serverfiles` (more fiddly, no Docker Hub needed).

Start with **Option A** if you can push to Docker Hub (free account is fine).

---

## 1. Create blueprint

1. Blueprints → **+ Add blueprint**
2. Name: `7th Leg Exploration Realtime`
3. Game: **Custom game**
4. Leave **Linux** form empty (machine is Windows)
5. Fill **Windows** form only
6. Keep version in **DEV** until it works

---

## 2. Windows form — Game

| Field | Value |
|--------|--------|
| Type | **Custom** |
| Command / Control | Leave disabled |
| Monitoring | **Container** |
| Recovery mode | **Enabled** |
| Wipe folders | (optional empty) |
| Backup folders | Name `app`, path `\serverfiles` |

Custom type has no Steam executable fields — startup comes from the **Docker image CMD**.

---

## 3. Windows form — Directories

| Name | Path | Create | Type |
|------|------|--------|------|
| Server files | `\serverfiles` | Yes | (default) |
| Logs | `\serverfiles\logs` | Yes | **Logs** |

Paths are relative to the container home on the host, same pattern as GSA docs (`\serverfiles\...`).

---

## 4. Windows form — Docker

### Option A — your image (recommended)

| Field | Value |
|--------|--------|
| Image | `loops117/7thleg-realtime` |
| Version/tag | `win-ltsc2022` **or** `win-ltsc2019` to match the host |
| Environment | see below |
| Mounts | see below |
| Ports | see below |

Build/push from this folder (`services/exploration-realtime`) **on the Server 2019 R620** (best) or another 2019 host:

```bat
docker build -f Dockerfile.windows -t loops117/7thleg-realtime:win-ltsc2019 .
docker push loops117/7thleg-realtime:win-ltsc2019
```

Blueprint image tag must be `win-ltsc2019` (not 2022).

### Option B — GSA Windows base + files only (if you cannot push images)

| Field | Value |
|--------|--------|
| Image | `gameserverapp/dediconnect-windows` |
| Version/tag | `{dynamic-os-tag}` |
| Mounts / Ports / Env | same as below |

Then upload into `serverfiles` via SFTP:

- Portable Node folder (e.g. `node\node.exe`)
- `server.js`, `package.json`, `start.cmd`

If Custom + this base image **ignores** your `start.cmd`, Option A is required. GSA Custom relies on the image entrypoint/CMD.

### Environment variables

Add (names can match GSA’s UI exactly):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | use the GSA variable for the game port if the UI offers one (often like `{gameerver.game_port}` — pick from the Variables picker in the form). If unsure, hardcode the same port you map below (e.g. `3100`) and set the Game port mapping to `3100`. |
| `HOST` | `0.0.0.0` |

Later (not required for hello-world):

| Key | Value |
|-----|--------|
| `REALTIME_AUTH_SECRET` | long random string (must match Vercel later) |

### Mounts

| Host path | Container path |
|-----------|----------------|
| `{container.home_root}\serverfiles` | `C:\serverfiles` |

If GSA rejects that container path, try `C:\Users\ContainerUser\serverfiles` (GSA Steam docs use that layout). Align with whatever path appears after first install via FTP.

### Ports

| Type | Notes |
|------|--------|
| **Game port** | Base port e.g. `3100`, multiplier `1` |

One port is enough. GSA opens it for **TCP and UDP**; WebSockets only need **TCP**.

---

## 5. Config template (optional)

| Name | Path | Default content |
|------|------|-----------------|
| Env | `\serverfiles\.env.example` | `# PORT is set by Docker env\n# REALTIME_AUTH_SECRET=\n` |

---

## 6. Install on the R620

1. Install game server from this blueprint on the Windows machine
2. Open **Connect** — copy **public IP** + **game port**
3. SFTP: confirm `serverfiles` is visible (Option A may not need files if the app is baked into the image; still useful for logs/config)
4. Start the server in GSA
5. Test from your PC:

```bat
curl http://PUBLIC_IP:GAME_PORT/health
```

Expect JSON like `{"ok":true,"service":"7thleg-exploration-realtime","port":7813,"players":0}`.

WebSocket protocol: `join` / `pose` / `peer_update` — see **README.md**.

```js
const ws = new WebSocket("ws://PUBLIC_IP:GAME_PORT/ws");
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    id: "test-1",
    displayName: "Tester",
    zoneId: "zone-a",
    appearance: { hairStyleId: "a", hairColorHex: "#000", skinColorHex: "#fff", shirtColorHex: "#f00", pantsColorHex: "#00f", eyesItemId: "e", mouthItemId: "m" },
    pose: { x: 0, y: 0, facingDeg: 0, walking: false },
  }));
};
ws.onmessage = (e) => console.log(e.data);
```

---

## 7. TLS / WSS (needed for production site)

`https://www.7thleg.com` cannot use insecure `ws://` in production.

Without asking Max, practical options:

1. **Cloudflare Tunnel** (or similar) from the R620 to `game.7thleg.com` with HTTPS — no GSA TLS features needed  
2. Or run **Caddy/IIS** on the Windows host in front of the container port (outside GSA), reverse-proxy to the game port

Set Next.js:

`NEXT_PUBLIC_EXPLORATION_REALTIME_URL=wss://game.7thleg.com/ws`

For first bring-up on **http localhost**, `ws://PUBLIC_IP:GAME_PORT/ws` is enough.

---

## 8. Troubleshooting (solo)

| Symptom | Likely fix |
|---------|------------|
| Container exits immediately | Image CMD wrong; check GSA container logs; confirm `node server.js` works in image |
| Port closed externally | Game port not mapped on BP; reinstall after port change; Windows firewall / GSA port publish |
| `curl` works, WS fails | Hitting wrong path — use `/ws` |
| Image won’t pull | Host OS ≠ image base (2019 vs 2022); retag/rebuild |
| FTP empty | Directory registration path wrong; reinstall after fixing Directories |

---

## Files in this folder

| File | Purpose |
|------|---------|
| `server.js` | Minimal health + WebSocket ping server |
| `package.json` | Depends on `ws` |
| `Dockerfile.windows` | Windows Server Core + Node + app |
| `start.cmd` | Helper if you run from `serverfiles` |
| `GSA_BLUEPRINT.md` | This guide |

When health + ping work on the public IP, say so and we can wire the Next.js playtest client next — still without involving Max.
