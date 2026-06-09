import Link from "next/link";

type Props = {
  searchParams: Promise<{ session_id?: string; order?: string; square?: string; guest?: string }>;
};

export default async function CartSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId, order: orderId, square: squareFlag, guest: guestFlag } = await searchParams;
  const freeCheckout = Boolean(orderId?.trim() && !sessionId?.trim() && squareFlag !== "1");
  const squareCheckout = squareFlag === "1";
  const guestCheckout = guestFlag === "1";

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">
        Thanks for your order
      </h1>
      <p className="mt-6 max-w-xl text-ink/85">
        {freeCheckout
          ? guestCheckout
            ? "Your order is complete — no payment was required. We'll ship to the address you provided."
            : "Your order is complete — no payment was required. It should appear on your account right away."
          : squareCheckout
            ? guestCheckout
              ? "Thank you — your Square payment went through. We'll email your receipt and ship to the address you provided."
              : "Thank you — your Square payment went through. Your order should appear on your account right away."
            : guestCheckout
              ? "Thank you for your payment. We'll email your receipt and ship to the address you provided."
              : "Thank you for your payment. Orders usually appear on your account within a minute after the webhook confirms—the page may refresh shortly."}
      </p>
      {guestCheckout ? (
        <p className="mt-4 max-w-xl rounded border border-lagoon/35 bg-lagoon/10 px-4 py-3 text-sm text-ink/90">
          Checked out as a guest?{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            Create an account
          </Link>{" "}
          with the same email to track orders and claim any loyalty points from this purchase.
        </p>
      ) : null}
      {sessionId ? (
        <p className="mt-4 font-mono text-xs text-ink/50">
          Reference <span className="select-all">{sessionId.slice(0, 32)}…</span>
        </p>
      ) : null}
      {orderId?.trim() && freeCheckout ? (
        <p className="mt-4 font-mono text-xs text-ink/50">
          Order <span className="select-all">{orderId.trim().slice(0, 12)}…</span>
        </p>
      ) : null}
      <p className="mt-10 flex flex-wrap gap-4">
        {guestCheckout ? (
          <>
            <Link href="/register" className="font-bold text-lagoon-dark underline">
              Create an account
            </Link>
            <Link href="/login" className="font-bold text-lagoon-dark underline">
              Sign in
            </Link>
          </>
        ) : (
          <Link href="/account" className="font-bold text-lagoon-dark underline">
            View your account &amp; orders
          </Link>
        )}
        <Link href="/store" className="font-bold text-lagoon-dark underline">
          Back to the store
        </Link>
      </p>
    </div>
  );
}
