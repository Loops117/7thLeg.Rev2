import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CustomerAddressForm } from "../customer-address-form";
import { CustomerNameForm } from "../customer-name-form";

export default async function AccountProfilePage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My info</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/profile" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          to manage your profile.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My info</h1>
        <p className="mt-6 text-ink/80">Profile settings are available on a customer account.</p>
      </div>
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      pointsBalance: true,
      firstName: true,
      lastName: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateRegion: true,
      postalCode: true,
      country: true,
    },
  });

  if (!customer) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My info</h1>
        <p className="mt-6 text-ink/80">We couldn’t load your profile. Try signing out and back in.</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My info</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/75">Email, loyalty points, your name, and saved shipping address.</p>

      <dl className="mt-8 max-w-lg space-y-4 border border-palm/20 bg-white/80 p-6 shadow-sm">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-palm-mid">Email</dt>
          <dd className="mt-1 text-ink">{customer.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-palm-mid">Loyalty points</dt>
          <dd className="mt-1 text-2xl font-black text-palm">{customer.pointsBalance}</dd>
          <dd className="mt-2">
            <Link href="/account/points" className="text-sm font-bold text-lagoon-dark underline">
              View point history
            </Link>
          </dd>
        </div>
      </dl>

      <section className="mt-10 max-w-lg border border-palm/20 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-black text-palm">Your name</h2>
        <p className="mt-2 text-sm text-ink/75">Used for shipping labels and giveaways.</p>
        <CustomerNameForm
          initial={{
            firstName: customer.firstName,
            lastName: customer.lastName,
          }}
        />
      </section>

      <section className="mt-10 max-w-lg border border-palm/20 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-black text-palm">Shipping address</h2>
        <p className="mt-2 text-sm text-ink/75">
          Used for orders and giveaways when we need to ship to you. You can update this anytime.
        </p>
        <CustomerAddressForm
          initial={{
            addressLine1: customer.addressLine1,
            addressLine2: customer.addressLine2,
            city: customer.city,
            stateRegion: customer.stateRegion,
            postalCode: customer.postalCode,
            country: customer.country,
          }}
        />
      </section>
    </div>
  );
}
