"use client";

import { useState, useTransition } from "react";
import { beginStripeCheckoutAction } from "@/app/actions/checkout-stripe";
import { btnMainLg } from "@/lib/btn-theme-classes";

export function CartCheckoutButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="mt-6 text-right">
      {error ? <p className="mb-2 text-sm font-medium text-coral">{error}</p> : null}
      <button
        type="button"
        disabled={disabled || pending}
        className={`${btnMainLg} font-black uppercase tracking-wide shadow-sm`}
        onClick={() => {
          setError("");
          startTransition(async () => {
            const res = await beginStripeCheckoutAction();
            if (!res.ok) {
              setError(res.error);
              return;
            }
            window.location.href = res.url;
          });
        }}
      >
        {pending ? "Redirecting…" : "Pay with card — Stripe Checkout"}
      </button>
      <p className="mt-2 text-xs text-ink/60">Secure checkout. You&apos;ll finish payment on Stripe.</p>
    </div>
  );
}
