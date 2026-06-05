import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { CustomerSpeciesManager } from "@/components/account/customer-species-manager";
import {
  getCustomerSpeciesShareInfo,
  listCustomerSpeciesForAccount,
} from "@/app/actions/customer-species";
import { listActiveCustomerSpeciesInsectTypes } from "@/app/actions/customer-species-insect-types-admin";

export default async function AccountSpeciesPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My Species</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/species" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            create an account
          </Link>{" "}
          to maintain your personal species list.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My Species</h1>
        <p className="mt-6 text-ink/80">My Species is available on a customer account.</p>
      </div>
    );
  }

  const [entries, share, insectTypes] = await Promise.all([
    listCustomerSpeciesForAccount(),
    getCustomerSpeciesShareInfo(),
    listActiveCustomerSpeciesInsectTypes(),
  ]);

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My Species</h1>
      <p className="mt-4 max-w-2xl text-sm text-ink/80">
        Track species you keep or have kept. Share a public link with friends — source, price, and acquisition notes stay
        private on the shared page.
      </p>
      <div className="mt-8">
        <CustomerSpeciesManager initialEntries={entries} initialShare={share} insectTypes={insectTypes} />
      </div>
    </div>
  );
}
