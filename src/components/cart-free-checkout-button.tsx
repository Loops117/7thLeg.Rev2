"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeFreeCheckoutAction } from "@/app/actions/checkout-free";
import { btnMainLg } from "@/lib/btn-theme-classes";

export function CartFreeCheckoutButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="text-left">
      {error ? <p className="mb-2 text-sm font-medium text-coral">{error}</p> : null}
      <button
        type="button"
        disabled={disabled || pending}
        className={`${btnMainLg} font-black uppercase tracking-wide shadow-sm`}
        onClick={() => {
          setError("");
          startTransition(async () => {
            const res = await completeFreeCheckoutAction();
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push(res.redirectUrl);
          });
        }}
      >
        {pending ? "Completing…" : "Complete order — $0.00"}
      </button>
      <p className="mt-2 text-xs text-ink/60">No payment required for this order.</p>
    </div>
  );
}
