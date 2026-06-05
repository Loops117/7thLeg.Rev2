/**
 * Check whether a migrated customer row exists and the password hash looks valid.
 *
 *   npx tsx scripts/diagnose-customer-login.ts you@example.com
 *   npx tsx scripts/diagnose-customer-login.ts you@example.com YourPassword
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email) {
    console.error("Usage: npx tsx scripts/diagnose-customer-login.ts <email> [password-to-test]");
    process.exit(1);
  }

  const customer = await prisma.customer.findUnique({
    where: { email },
    select: {
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      displayName: true,
      createdAt: true,
    },
  });

  if (!customer) {
    console.log("NOT FOUND in public.customers:", email);
    const guesses = await prisma.customer.findMany({
      where: {
        OR: [
          { email: { contains: email.split("@")[0] ?? email, mode: "insensitive" } },
          { displayName: { contains: email.split("@")[0] ?? email, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { email: true, displayName: true },
    });
    if (guesses.length) {
      console.log("\nSimilar accounts:");
      for (const g of guesses) console.log(`  ${g.email}  (${g.displayName ?? "no name"})`);
    }
    process.exit(1);
  }

  const hash = customer.passwordHash;
  const looksBcrypt = /^\$2[aby]\$\d{2}\$/.test(hash);
  console.log("FOUND:", customer.email);
  const name =
    customer.displayName ??
    ([customer.firstName, customer.lastName].filter(Boolean).join(" ") || "(none)");
  console.log("Name:", name);
  console.log("Created:", customer.createdAt.toISOString());
  console.log("Hash prefix:", hash.slice(0, 29) + "…");
  console.log("Looks like bcrypt:", looksBcrypt ? "yes" : "NO — login will fail");

  if (password) {
    const ok = await bcrypt.compare(password, hash);
    console.log("Password test:", ok ? "MATCH" : "does not match");
  } else {
    console.log("\nTip: add your password as a 2nd arg to test without changing it.");
  }

  const legacyUrl = process.env.LEGACY_DIRECT_URL?.trim();
  if (legacyUrl) {
    const legacy = new pg.Client({ connectionString: legacyUrl });
    await legacy.connect();
    const r = await legacy.query<{ email: string; encrypted_password: string | null }>(
      `SELECT email, encrypted_password FROM auth.users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
      [email],
    );
    await legacy.end();
    if (!r.rows[0]) {
      console.log("\nLegacy auth.users: no row for this email");
    } else {
      const legacyHash = r.rows[0].encrypted_password ?? "";
      console.log("\nLegacy auth.users: found");
      console.log("Legacy hash prefix:", legacyHash ? legacyHash.slice(0, 29) + "…" : "(empty — OAuth-only account)");
      console.log("Hashes identical:", legacyHash === hash ? "yes" : "no");
      if (password && legacyHash) {
        console.log("Legacy password test:", (await bcrypt.compare(password, legacyHash)) ? "MATCH" : "does not match");
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
