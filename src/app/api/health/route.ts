import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** No Prisma — use to verify Vercel routing and env visibility without opening a DB connection. */
// Redeploy smoke: bump when triggering a fresh Vercel/GitHub build (no runtime effect).
export async function GET() {
  const authSecret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  return NextResponse.json({
    ok: true,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasAuthSecret: authSecret.length >= 16,
    via: "app-router",
  });
}
