/**
 * Set a customer password by email (bcrypt, same as registration).
 *
 *   npx tsx scripts/reset-customer-password.ts you@example.com NewPassword123
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/reset-customer-password.ts <email> <new-password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    console.error(`No customer found for: ${email}`);
    const partial = await prisma.customer.findMany({
      where: { email: { contains: email.split("@")[0], mode: "insensitive" } },
      take: 5,
      select: { email: true },
    });
    if (partial.length) {
      console.error("Did you mean:");
      for (const row of partial) console.error(`  - ${row.email}`);
    }
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.customer.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`Password updated for ${email}. You can sign in on the site now.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
