# 7th Leg Rev2

Inverts Oasis storefront and admin (Next.js, Prisma, Postgres).

**Repository:** [github.com/Loops117/7thLeg.Rev2](https://github.com/Loops117/7thLeg.Rev2)

This project is **not** the `io-danny` / `lemons-shop` deployment. Do not link or deploy this folder to those Vercel projects.

## Setup

```bash
npm install
cp .env.example .env   # if present; configure DATABASE_URL and auth secrets
npx prisma migrate deploy
npm run dev
```

## Deploy (7th Leg Vercel project only)

1. `npm run build`
2. `npx vercel link --yes --project 7thleg-rev2` (use your Vercel project slug)
3. `npx vercel deploy --prod --yes`

Confirm deploy output shows your **7th Leg** project name, not `io-danny`.
