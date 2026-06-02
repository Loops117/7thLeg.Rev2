import { NextResponse } from "next/server";
import { isRemoteBlobStorage } from "@/lib/app-uploads";
import { hasAuthSecretConfigured } from "@/lib/auth-secret";
import { ensureProductionAuthUrl, publicAuthBaseUrl } from "@/lib/auth-url";

export const runtime = "nodejs";

/** No Prisma — use to verify Vercel routing and env visibility without opening a DB connection. */
export async function GET() {
  ensureProductionAuthUrl();
  const authBaseUrl = publicAuthBaseUrl();
  const rawAuthUrl = process.env.AUTH_URL?.trim() || null;
  const authUrlLooksLocal = rawAuthUrl
    ? /localhost|127\.0\.0\.1/i.test(rawAuthUrl)
    : false;

  let databaseHost: string | null = null;
  try {
    const db = process.env.DATABASE_URL?.trim();
    if (db) databaseHost = new URL(db.replace(/^postgres:/, "postgresql:")).hostname;
  } catch {
    databaseHost = null;
  }

  return NextResponse.json({
    ok: true,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasAuthSecret: hasAuthSecretConfigured(),
    hasBlobStorage: isRemoteBlobStorage(),
    authBaseUrl,
    authUrlLooksLocal,
    vercelUrl: process.env.VERCEL_URL?.trim() || null,
    databaseHost,
    via: "app-router",
  });
}
