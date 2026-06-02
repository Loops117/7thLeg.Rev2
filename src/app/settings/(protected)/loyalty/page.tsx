import Link from "next/link";
import { LoyaltyPageContent, type LoyaltyMemberRow } from "@/components/settings/loyalty-page-content";
import { getLoyaltyProgramForAdmin } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";

export default async function SettingsLoyaltyPage() {
  const [program, customers] = await Promise.all([
    getLoyaltyProgramForAdmin(),
    prisma.customer.findMany({
      orderBy: { email: "asc" },
      take: 2000,
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        pointsBalance: true,
        createdAt: true,
      },
    }),
  ]);

  const members: LoyaltyMemberRow[] = customers.map((c) => ({
    id: c.id,
    email: c.email,
    displayName: c.displayName,
    firstName: c.firstName,
    lastName: c.lastName,
    pointsBalance: c.pointsBalance,
    createdAt: c.createdAt.toLocaleDateString(),
  }));

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Loyalty</h1>
      <p className="mt-4 text-ink/80">
        Program rules and a full list of members with point balances, manual adjustments, and history. For address-only
        context, see also{" "}
        <Link href="/settings/customers" className="font-medium text-lagoon-dark underline">
          Customers
        </Link>
        .
      </p>
      <div className="mt-8">
        <LoyaltyPageContent initialProgram={program} members={members} />
      </div>
    </div>
  );
}
