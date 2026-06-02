import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** No Prisma — use to verify Vercel routing and env visibility without opening a DB connection. */
// Redeploy smoke: bump when triggering a fresh Vercel/GitHub build (no runtime effect).
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    via: "app-router",
  });
}
