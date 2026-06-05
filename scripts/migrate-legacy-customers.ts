/**
 * One-off: copy customers from a legacy Supabase Postgres DB into this project.
 *
 * Passwords are preserved by copying bcrypt hashes verbatim. Supports:
 *   - public.customers (Rev2-style passwordHash column)
 *   - auth.users + public.profiles (7thleg-site Supabase Auth)
 *
 * Usage:
 *   LEGACY_DIRECT_URL="postgresql://postgres:...@db.OLD_REF.supabase.co:5432/postgres" \
 *   npx tsx scripts/migrate-legacy-customers.ts --dry-run
 *
 *   LEGACY_DIRECT_URL="..." npx tsx scripts/migrate-legacy-customers.ts
 *
 * Env:
 *   LEGACY_DIRECT_URL  — source (old Supabase direct connection, port 5432)
 *   DIRECT_URL         — destination (defaults to DATABASE_URL without pgbouncer)
 *
 * Flags:
 *   --dry-run          — report only, no writes
 *   --skip-existing    — skip emails already in destination (default)
 *   --update-existing  — overwrite profile + password hash for existing emails
 */

import "dotenv/config";
import pg from "pg";
import { prisma } from "../src/lib/prisma";

type LegacyCustomerRow = Record<string, unknown>;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const updateExisting = args.has("--update-existing");
const skipExisting = !updateExisting;

function directUrlFromEnv(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) throw new Error("Set DIRECT_URL or DATABASE_URL for the destination database.");
  return pooled.replace("?pgbouncer=true", "").replace(":6543/", ":5432/");
}

function legacyUrlFromEnv(): string {
  const url = process.env.LEGACY_DIRECT_URL?.trim();
  if (!url) {
    throw new Error(
      "Set LEGACY_DIRECT_URL to the old Supabase direct connection string (port 5432).",
    );
  }
  return url.replace("?pgbouncer=true", "").replace(":6543/", ":5432/");
}

function pick(row: LegacyCustomerRow, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] != null) return row[key];
  }
  return undefined;
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (v == null) return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "t", "1", "yes", "y"].includes(s)) return true;
  if (["false", "f", "0", "no", "n"].includes(s)) return false;
  return fallback;
}

function asDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeEmail(v: unknown): string | null {
  const s = asString(v);
  return s ? s.toLowerCase() : null;
}

function looksLikeBcrypt(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

function splitFullName(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function mapLegacyRow(row: LegacyCustomerRow) {
  const email = normalizeEmail(pick(row, "email"));
  const passwordHash = asString(
    pick(row, "passwordHash", "password_hash", "encrypted_password"),
  );
  if (!email || !passwordHash) return { ok: false as const, reason: "missing email or password hash" };

  if (!looksLikeBcrypt(passwordHash)) {
    return {
      ok: false as const,
      reason: `password hash for ${email} does not look like bcrypt (${passwordHash.slice(0, 12)}…)`,
    };
  }

  const fullName = asString(pick(row, "full_name", "fullName"));
  const split = splitFullName(fullName);
  const firstName = asString(pick(row, "firstName", "first_name")) ?? split.firstName;
  const lastName = asString(pick(row, "lastName", "last_name")) ?? split.lastName;
  const displayName =
    asString(pick(row, "displayName", "display_name", "full_name")) ??
    ([firstName, lastName].filter(Boolean).join(" ").trim() || null);

  return {
    ok: true as const,
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      displayName,
      pointsBalance: asInt(pick(row, "pointsBalance", "points_balance", "total_points"), 0),
      addressLine1: asString(
        pick(row, "addressLine1", "address_line1", "address_line_1", "address_full"),
      ),
      addressLine2: asString(pick(row, "addressLine2", "address_line2", "address_line_2")),
      city: asString(pick(row, "city")),
      stateRegion: asString(pick(row, "stateRegion", "state_region", "state")),
      postalCode: asString(pick(row, "postalCode", "postal_code", "zip")),
      country: asString(pick(row, "country")),
      speciesListShareToken: asString(
        pick(row, "speciesListShareToken", "species_list_share_token", "share_token"),
      ),
      speciesListPublicEnabled: asBool(
        pick(row, "speciesListPublicEnabled", "species_list_public_enabled"),
        true,
      ),
      speciesListDisplayName: asString(
        pick(row, "speciesListDisplayName", "species_list_display_name"),
      ),
      createdAt: asDate(pick(row, "createdAt", "created_at")),
      updatedAt: asDate(pick(row, "updatedAt", "updated_at")),
    },
  };
}

async function tableExists(client: pg.Client, schema: string, table: string): Promise<boolean> {
  const r = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    ) AS exists`,
    [schema, table],
  );
  return Boolean(r.rows[0]?.exists);
}

async function loadLegacyCustomers(client: pg.Client): Promise<LegacyCustomerRow[]> {
  if (await tableExists(client, "public", "customers")) {
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customers'
       ORDER BY ordinal_position`,
    );
    console.log("Legacy source: public.customers");
    console.log("Columns:", cols.rows.map((r) => r.column_name).join(", "));
    const { rows } = await client.query<LegacyCustomerRow>(
      `SELECT * FROM customers ORDER BY email`,
    );
    return rows;
  }

  if (!(await tableExists(client, "auth", "users"))) {
    throw new Error('Legacy database has neither public.customers nor auth.users.');
  }

  const hasProfiles = await tableExists(client, "public", "profiles");
  const hasPoints = await tableExists(client, "public", "user_total_points");
  console.log(
    `Legacy source: auth.users${hasProfiles ? " + public.profiles" : ""}${hasPoints ? " + public.user_total_points" : ""}`,
  );

  const sql = hasProfiles
    ? `
      SELECT
        u.email,
        u.encrypted_password,
        u.created_at,
        u.updated_at,
        p.full_name,
        p.city,
        p.state,
        p.postal_code,
        p.country,
        p.address_full
        ${hasPoints ? ", COALESCE(ut.total_points, 0) AS total_points" : ""}
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      ${hasPoints ? "LEFT JOIN public.user_total_points ut ON ut.user_id = u.id" : ""}
      WHERE u.email IS NOT NULL
        AND u.deleted_at IS NULL
      ORDER BY u.email
    `
    : `
      SELECT u.email, u.encrypted_password, u.created_at, u.updated_at
      FROM auth.users u
      WHERE u.email IS NOT NULL
        AND u.deleted_at IS NULL
      ORDER BY u.email
    `;

  const { rows } = await client.query<LegacyCustomerRow>(sql);
  return rows;
}

async function main() {
  const legacyClient = new pg.Client({ connectionString: legacyUrlFromEnv() });
  await legacyClient.connect();
  console.log("Connected to legacy database.");

  const legacyRows = await loadLegacyCustomers(legacyClient);
  await legacyClient.end();
  console.log(`Found ${legacyRows.length} legacy customer row(s).`);

  const existingEmails = new Set<string>();
  const existingShareTokens = new Set<string>();
  const destRows = await prisma.customer.findMany({
    select: { email: true, speciesListShareToken: true },
  });
  for (const row of destRows) {
    existingEmails.add(row.email.toLowerCase());
    if (row.speciesListShareToken) existingShareTokens.add(row.speciesListShareToken);
  }
  console.log(`Destination already has ${existingEmails.size} customer(s).`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let rejected = 0;
  const problems: string[] = [];

  for (const legacyRow of legacyRows) {
    const mapped = mapLegacyRow(legacyRow);
    if (!mapped.ok) {
      rejected++;
      problems.push(mapped.reason);
      continue;
    }

    const { data } = mapped;
    const exists = existingEmails.has(data.email);

    if (exists && skipExisting) {
      skipped++;
      continue;
    }

    let shareToken = data.speciesListShareToken;
    if (shareToken && existingShareTokens.has(shareToken) && !exists) {
      problems.push(
        `Share token collision for ${data.email}; importing without species_list_share_token.`,
      );
      shareToken = null;
    }

    const payload = {
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      pointsBalance: data.pointsBalance,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      stateRegion: data.stateRegion,
      postalCode: data.postalCode,
      country: data.country,
      speciesListShareToken: shareToken,
      speciesListPublicEnabled: data.speciesListPublicEnabled,
      speciesListDisplayName: data.speciesListDisplayName,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
    };

    if (dryRun) {
      if (exists) updated++;
      else created++;
      continue;
    }

    if (exists) {
      await prisma.customer.update({
        where: { email: data.email },
        data: payload,
      });
      updated++;
    } else {
      await prisma.customer.create({ data: payload });
      existingEmails.add(data.email);
      if (shareToken) existingShareTokens.add(shareToken);
      created++;
    }
  }

  console.log("\n--- Migration summary ---");
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already in destination): ${skipped}`);
  console.log(`Rejected: ${rejected}`);
  if (problems.length) {
    console.log("\nNotes / issues:");
    for (const p of problems.slice(0, 30)) console.log(`  - ${p}`);
    if (problems.length > 30) console.log(`  … and ${problems.length - 30} more`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
