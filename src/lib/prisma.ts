import { setDefaultResultOrder } from "node:dns";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

/** Prefer A records so Vercel can reach Supabase when IPv6 is unreachable (see Node docs: dns.setDefaultResultOrder). */
setDefaultResultOrder("ipv4first");

/**
 * In development, `globalThis` keeps a single PrismaClient. After `prisma generate`, that instance can still embed an
 * older query engine and reject new enum values until the process exits. We invalidate when generated client files
 * change (mtime). Production keeps one client for the process lifetime.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  prismaGeneratedMtimeMs: number | undefined;
};

function generatedPrismaClientMtimeMs(): number | null {
  try {
    return statSync(resolve(process.cwd(), "src/generated/prisma/client.ts")).mtimeMs;
  } catch {
    return null;
  }
}

/** Prisma needs `pgbouncer=true` on Supavisor transaction pooler URLs; easy to forget in the dashboard copy. */
function ensurePgbouncerForSupabasePooler(connectionString: string): string {
  if (!connectionString.includes("pooler.supabase.com")) return connectionString;
  if (/[?&]pgbouncer=true\b/i.test(connectionString)) return connectionString;
  return connectionString.includes("?")
    ? `${connectionString}&pgbouncer=true`
    : `${connectionString}?pgbouncer=true`;
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and add your Supabase URI.");
  }
  const connectionString = ensurePgbouncerForSupabasePooler(raw.trim());
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      // Fewer, shorter-lived idle connections helps when Supabase or the pooler closes sockets (P1017).
      max: Math.min(Number(process.env.PGPOOL_MAX ?? 8), 20),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 20_000,
      allowExitOnIdle: true,
    });
  pool.on("error", (err) => {
    console.error("[prisma pool] idle client error:", err);
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/** One client per runtime (important for serverless warm instances). */
function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }

  const genMtime = generatedPrismaClientMtimeMs();
  if (genMtime == null) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma && globalForPrisma.prismaGeneratedMtimeMs === genMtime) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaGeneratedMtimeMs = genMtime ?? undefined;
  return globalForPrisma.prisma;
}

/**
 * Lazy proxy so importing `@/lib/prisma` does not run `createPrismaClient()` until the first query.
 * Callers with try/catch (e.g. getSiteConfig) can handle missing DATABASE_URL / bad pooler URL without crashing the RSC tree.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    // Prisma model accessors (e.g. `shippingOption`) use getters whose `this` must be the real client.
    // Reflect.get(_, prop, receiver) would invoke those getters with `this === receiver` (this proxy).
    return Reflect.get(client as object, prop, client as object);
  },
});
