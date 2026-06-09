import Link from "next/link";

type Props = {
  projectedPoints: number;
  pointsPerDollar: number;
};

export function GuestPointsUpsell({ projectedPoints, pointsPerDollar }: Props) {
  if (projectedPoints <= 0) return null;

  return (
    <div className="cart-panel border-lagoon/40 bg-lagoon/5">
      <h2 className="cart-panel__heading text-lagoon-dark">Earn {projectedPoints} loyalty points</h2>
      <p className="cart-panel__text">
        This order would earn about <strong>{projectedPoints}</strong> point
        {projectedPoints === 1 ? "" : "s"} ({pointsPerDollar} per $1 on eligible products) if you check out with an
        account. Guest orders don&apos;t earn points until you register with the same email.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/register" className="font-bold text-lagoon-dark underline">
          Create a free account
        </Link>{" "}
        or{" "}
        <Link href="/login?callbackUrl=/cart" className="font-bold text-lagoon-dark underline">
          sign in
        </Link>{" "}
        before paying to collect points automatically — or register later with the same email to claim them
        retroactively.
      </p>
    </div>
  );
}
