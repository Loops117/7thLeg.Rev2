# Cloudflare Tunnel → exploration realtime

Gives `https://` / `wss://` in front of the GSA Node server so `https://www.7thleg.com` can connect.

**Origin today:** `http://99.184.242.69:7813` (GSA Connect game port — change if Connect changes).

---

## DNS note (important)

`7thleg.com` nameservers are currently **GoDaddy** (`ns47/ns48.domaincontrol.com`), not Cloudflare.

A stable hostname like `game.7thleg.com` needs the zone on Cloudflare (or Cloudflare for SaaS). Two paths:

| Path | When |
|------|------|
| **A — Quick tunnel** (`*.trycloudflare.com`) | Prove `wss` tonight; URL changes if you recreate |
| **B — Named tunnel + `game.7thleg.com`** | Production; add domain to Cloudflare + CNAME |

---

## A. Quick tunnel (this PC)

Requires `cloudflared` installed and the GSA server running.

```bat
cloudflared tunnel --url http://99.184.242.69:7813
```

Copy the printed `https://….trycloudflare.com` URL.

Smoke tests:

```bat
curl https://YOUR-SUBDOMAIN.trycloudflare.com/health
```

Vercel (temporary):

```
NEXT_PUBLIC_EXPLORATION_REALTIME_URL=wss://YOUR-SUBDOMAIN.trycloudflare.com/ws
```

Redeploy after changing the env. Keep this terminal open — closing it drops the tunnel.

Leave this PC on while testing. For always-on, use path B on the R620 (or a small always-on box that can reach `:7813`).

---

## B. Named tunnel + `game.7thleg.com` (production)

### 1. Add `7thleg.com` to Cloudflare

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Add site → `7thleg.com`
2. Free plan is enough
3. Copy Cloudflare nameservers; at GoDaddy set those NS records
4. Recreate DNS (typical):
   - `www` → CNAME → `cname.vercel-dns.com` (or your current Vercel target), **Proxied** or DNS-only per Vercel docs
   - Apex `@` → as you already use (A/ALIAS/forward to www)

Wait until Cloudflare shows the zone **Active**.

### 2. Create tunnel (dashboard, easiest)

1. Zero Trust → **Networks** → **Tunnels** → Create
2. Name: `7thleg-realtime`
3. Install connector:
   - **Best:** Windows on the **R620** (origin `http://127.0.0.1:7813`)
   - **OK for bring-up:** this PC (origin `http://99.184.242.69:7813`)
4. Paste the install/token command Cloudflare shows; run as admin if installing a service

### 3. Public hostname

| Field | Value |
|--------|--------|
| Subdomain | `game` |
| Domain | `7thleg.com` |
| Type | HTTP |
| URL | `127.0.0.1:7813` (on R620) or `99.184.242.69:7813` (remote connector) |

No path prefix — `/health` and `/ws` stay on the origin.

Enable **WebSockets** under Cloudflare domain → Network (usually on by default).

### 4. Verify

```bat
curl https://game.7thleg.com/health
```

Expect JSON with `"players":…`.

### 5. Vercel

```
NEXT_PUBLIC_EXPLORATION_REALTIME_URL=wss://game.7thleg.com/ws
```

Redeploy (NEXT_PUBLIC_* is bake-time).

---

## Local config file (optional CLI tunnel)

Copy `cloudflare-tunnel.example.yml` → `%USERPROFILE%\.cloudflared\config.yml` after `cloudflared tunnel login` / `tunnel create`, then:

```bat
cloudflared tunnel route dns 7thleg-realtime game.7thleg.com
cloudflared tunnel run 7thleg-realtime
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Mixed content / WS blocked on www | Must use `wss://`, not `ws://` |
| `/health` OK, WS fails | Confirm Network → WebSockets On; path is `/ws` |
| Tunnel up, origin refused | GSA stopped or game port changed — check Connect |
| `players` stays 0 on prod | Client code not deployed yet, or wrong env URL |
| Idle disconnects | Client already can `ping`; add periodic ping if needed |

Connector should run as a **Windows service** on the R620 so it survives logoff.
