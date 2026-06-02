"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import { useState, useTransition } from "react";
import { updatePaymentGatewaysSettings } from "@/app/actions/site-config-admin";
import { type PaymentGatewaysState, paymentGatewaysDefaults } from "@/lib/site-config-types";

export function PaymentsGatewayEditor({ initial }: { initial: PaymentGatewaysState }) {
  const [gateways, setGateways] = useState<PaymentGatewaysState>(initial ?? paymentGatewaysDefaults);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await updatePaymentGatewaysSettings(gateways);
      if (result.ok) {
        setMessage("Saved.");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="rounded border border-palm/25 bg-white/90 p-6 shadow-sm">
      <h2 className="text-lg font-black text-palm">Checkout gateways</h2>
      <p className="mt-2 max-w-xl text-sm text-ink/75">
        Turn each processor on only when credentials are deployed. Customers only see gateways that are both{" "}
        <strong className="text-ink">enabled here</strong> and have the required{" "}
        <strong className="text-ink">environment variables</strong>.
      </p>

      <ul className="mt-6 space-y-5">
        <li className="flex flex-wrap items-start gap-3">
          <input
            id="pay-stripe"
            type="checkbox"
            className="mt-1 h-4 w-4 border-palm accent-palm"
            checked={gateways.stripeEnabled}
            onChange={(e) => setGateways((g) => ({ ...g, stripeEnabled: e.target.checked }))}
          />
          <div>
            <label htmlFor="pay-stripe" className="cursor-pointer font-bold text-ink">
              Stripe Checkout
            </label>
            <p className="mt-1 text-xs text-ink/65">
              Requires{" "}
              <code className="rounded bg-black/5 px-1">STRIPE_SECRET_KEY</code>, webhook (
              <code className="rounded bg-black/5 px-1">STRIPE_WEBHOOK_SECRET</code>), success/cancel redirects via{" "}
              <code className="rounded bg-black/5 px-1">AUTH_URL</code> or{" "}
              <code className="rounded bg-black/5 px-1">NEXT_PUBLIC_SITE_URL</code>.
            </p>
          </div>
        </li>

        <li className="flex flex-wrap items-start gap-3">
          <input
            id="pay-square"
            type="checkbox"
            className="mt-1 h-4 w-4 border-palm accent-palm"
            checked={gateways.squareEnabled}
            onChange={(e) => setGateways((g) => ({ ...g, squareEnabled: e.target.checked }))}
          />
          <div>
            <label htmlFor="pay-square" className="cursor-pointer font-bold text-ink">
              Square Web Payments
            </label>
            <p className="mt-1 text-xs text-ink/65">
              Requires{" "}
              <code className="rounded bg-black/5 px-1">SQUARE_ACCESS_TOKEN</code>,{" "}
              <code className="rounded bg-black/5 px-1">SQUARE_LOCATION_ID</code>, and{" "}
              <code className="rounded bg-black/5 px-1">NEXT_PUBLIC_SQUARE_APPLICATION_ID</code> (sandbox IDs start with{" "}
              <code className="rounded bg-black/5 px-1">sandbox-</code> — that automatically loads the Sandbox card SDK).
              Optionally set{" "}
              <code className="rounded bg-black/5 px-1">SQUARE_ENV=sandbox</code> or{" "}
              <code className="rounded bg-black/5 px-1">SQUARE_USE_SANDBOX=true</code> for sandbox API calls.
            </p>
          </div>
        </li>
      </ul>

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className={`mt-8 ${btnSecondaryMd} disabled:opacity-55`}
      >
        {pending ? "Saving…" : "Save payment gateways"}
      </button>
      {message ? <p className="mt-3 text-sm text-ink/80">{message}</p> : null}
    </div>
  );
}
