import { NextResponse } from "next/server";
import { hasAuthSecretConfigured } from "@/lib/auth-secret";

export const runtime = "nodejs";

/** No Prisma — use to verify Vercel routing and env visibility without opening a DB connection. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasAuthSecret: hasAuthSecretConfigured(),
    via: "app-router",
  });
}
