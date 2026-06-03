import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { listMyPointsLedger } from "@/app/actions/customer-points";
import { CustomerPointsLedger } from "@/components/account/customer-points-ledger";
import { prisma } from "@/lib/prisma";

export default async function AccountPointsPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Points</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/points" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          to view your loyalty points.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Points</h1>
        <p className="mt-6 text-ink/80">Points history is available on a customer account.</p>
      </div>
    );
  }

  const [customer, ledgerResult] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: session.user.id },
      select: { pointsBalance: true },
    }),
    listMyPointsLedger(120),
  ]);

  if (!customer) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Points</h1>
        <p className="mt-6 text-ink/80">We couldn’t load your account. Try signing out and back in.</p>
      </div>
    );
  }

  const rows = Array.isArray(ledgerResult) ? ledgerResult : [];

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Points</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/75">
        Track loyalty points earned from purchases, image approvals, and other activity. Redeem points at checkout when
        available.
      </p>
      <div className="mt-8">
        <CustomerPointsLedger balance={customer.pointsBalance} rows={rows} />
      </div>
    </div>
  );
}
