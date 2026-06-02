import Link from "next/link";

type Props = { searchParams: Promise<{ session_id?: string; order?: string }> };

export default async function CartSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId, order: orderId } = await searchParams;
  const freeCheckout = Boolean(orderId?.trim() && !sessionId?.trim());

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">
        Thanks for your order
      </h1>
      <p className="mt-6 max-w-xl text-ink/85">
        {freeCheckout
          ? "Your order is complete — no payment was required. It should appear on your account right away."
          : "Thank you for your payment. Orders usually appear on your account within a minute after the webhook confirms—the page may refresh shortly."}
      </p>
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
        <Link href="/account" className="font-bold text-lagoon-dark underline">
          View your account &amp; orders
        </Link>
        <Link href="/store" className="font-bold text-lagoon-dark underline">
          Back to the store
        </Link>
      </p>
    </div>
  );
}
