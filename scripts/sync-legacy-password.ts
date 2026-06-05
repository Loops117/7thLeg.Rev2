import "dotenv/config";
import pg from "pg";
import { prisma } from "../src/lib/prisma";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Usage: npx tsx scripts/sync-legacy-password.ts <email>");
  process.exit(1);
}

async function main() {
  const legacy = new pg.Client({ connectionString: process.env.LEGACY_DIRECT_URL });
  await legacy.connect();
  const r = await legacy.query<{ encrypted_password: string | null }>(
    "SELECT encrypted_password FROM auth.users WHERE lower(email) = lower($1) AND deleted_at IS NULL",
    [email],
  );
  await legacy.end();

  const hash = r.rows[0]?.encrypted_password;
  if (!hash) {
    console.error("No legacy password for this email (OAuth-only or missing).");
    process.exit(1);
  }

  await prisma.customer.update({
    where: { email },
    data: { passwordHash: hash },
  });
  console.log(`Synced legacy password hash for ${email}. Use your old site password to sign in.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
