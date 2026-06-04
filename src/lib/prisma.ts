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
  /** Schema + generated client fingerprint — invalidate dev client when either changes. */
  prismaFreshnessKey: string | undefined;
};

function prismaClientFreshnessKey(): string | null {
  const paths = [
    "prisma/schema.prisma",
    "src/generated/prisma/client.ts",
    "src/generated/prisma/internal/class.ts",
  ];
  const parts: number[] = [];
  for (const rel of paths) {
    try {
      parts.push(statSync(resolve(process.cwd(), rel)).mtimeMs);
    } catch {
      return null;
    }
  }
  return parts.join(":");
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

  const freshnessKey = prismaClientFreshnessKey();
  if (freshnessKey == null) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma && globalForPrisma.prismaFreshnessKey === freshnessKey) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaFreshnessKey = freshnessKey;
  return globalForPrisma.prisma;
}

/**
 * Lazy proxy so importing `@/lib/prisma` does not run `createPrismaClient()` until the first query.
 * Callers with try/catch (e.g. getSiteConfig) can handle missing DATABASE_URL / bad pooler URL without crashing the RSC tree.
 */
function getClientDelegate(client: PrismaClient, prop: string | symbol) {
  return Reflect.get(client as object, prop, client as object);
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    let client = getPrismaClient();
    let value = getClientDelegate(client, prop);

    // Dev: cached client from before `prisma generate` lacks new model delegates (e.g. productKit).
    if (
      process.env.NODE_ENV !== "production" &&
      typeof prop === "string" &&
      value === undefined &&
      prop !== "$connect" &&
      !prop.startsWith("$") &&
      prop !== "constructor"
    ) {
      globalForPrisma.prismaFreshnessKey = undefined;
      client = getPrismaClient();
      value = getClientDelegate(client, prop);
      if (value === undefined) {
        throw new Error(
          `Prisma model "${prop}" is not available. Run "npx prisma generate" and restart the dev server (stop and run "npm run dev" again).`,
        );
      }
    }

    return value;
  },
});
