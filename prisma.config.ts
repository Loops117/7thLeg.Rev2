// Load .env from project root; override so a stale DATABASE_URL in the shell
// (e.g. from an old session) does not win over your real Supabase URL.
import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

/** Override with `PRISMA_DOTENV_PATH=.env.vercel.production` after `vercel env pull` for prod migrations. */
const dotEnvPath = process.env.PRISMA_DOTENV_PATH?.trim()
  ? resolve(process.cwd(), process.env.PRISMA_DOTENV_PATH.trim())
  : resolve(process.cwd(), ".env");
config({ path: dotEnvPath, override: true });

/** Migrations need a Postgres session. Supabase `DATABASE_URL` is often the transaction pooler (`:6543`); use `DIRECT_URL` when set. */
function migrateDatasourceUrl(): string | undefined {
  const direct = process.env["DIRECT_URL"]?.trim();
  if (direct) return direct;
  const dbUrl = process.env["DATABASE_URL"]?.trim();
  if (!dbUrl) return undefined;
  try {
    const u = new URL(dbUrl);
    if (u.port === "6543" && u.hostname.includes("pooler.supabase.com")) {
      u.port = "5432";
      u.searchParams.delete("pgbouncer");
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return dbUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrateDatasourceUrl(),
  },
});
