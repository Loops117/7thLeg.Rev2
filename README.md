# 7th Leg Rev2

Inverts Oasis storefront and admin (Next.js, Prisma, Postgres).

**Repository:** [github.com/Loops117/7thLeg.Rev2](https://github.com/Loops117/7thLeg.Rev2)

This project is **not** the `io-danny` / `lemons-shop` deployment. Do not link or deploy this folder to those Vercel projects.

## Setup

```bash
npm install
cp .env.example .env   # if present; configure DATABASE_URL and auth secrets
npx prisma migrate deploy
npm run db:seed          # creates admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env
npm run dev
```

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (Supabase pooler on Vercel) |
| `AUTH_SECRET` | NextAuth signing secret — **required** or admin login shows “server configuration” error |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used by `npm run db:seed` only |
| `BLOB_READ_WRITE_TOKEN` | **Required on Vercel** for admin image uploads (product, theme, logo). Serverless disk is read-only. |

Generate `AUTH_SECRET`: `openssl rand -base64 32`

**Vercel Blob:** Project → **Storage** → **Blob** → create/connect store to `7thleg-rev2` (adds `BLOB_READ_WRITE_TOKEN` automatically). Or: `npx vercel blob create-store 7thleg-rev2 --access public --yes` from this directory. Local dev: `vercel env pull` for `.env.local`.

**Vercel:** copy the same `DATABASE_URL` and `AUTH_SECRET` from your local `.env` into Project → Settings → Environment Variables (Production + Preview), then redeploy.

Set **`AUTH_URL`** to your live URL, e.g. `https://7thleg-rev2.vercel.app` (no trailing slash). **Do not** use `http://localhost:3000` on Vercel — sign-in will fail even when `/api/health` shows `hasAuthSecret: true`.

Check deployment: open `/api/health` — `hasAuthSecret`, `hasDatabaseUrl`, and `hasBlobStorage` should be `true`, and `authUrlLooksLocal` should be `false`.

### Branding, theme colors, and site name

Those are stored in **Postgres** (`site_config`, theme JSON), not in git. Local admin changes only appear on production if Vercel’s **`DATABASE_URL`** is the **same Supabase project** you use locally. If production still shows “Inverts Oasis”, either the DB is different or you haven’t saved settings against the production database yet.

## Deploy (7th Leg Vercel project only)

1. `npm run build`
2. `npx vercel link --yes --project 7thleg-rev2` (use your Vercel project slug)
3. `npx vercel deploy --prod --yes`

Confirm deploy output shows your **7th Leg** project name, not `io-danny`.
