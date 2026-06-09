import { PaymentsGatewayEditor } from "@/components/settings/payments-gateway-editor";
import { PaymentsSetupStatus } from "@/components/settings/payments-setup-status";
import { getPaymentGatewaysForAdmin } from "@/lib/site-config";
import { getSquareSetupStatus } from "@/lib/square-setup-status";

export default async function SettingsPaymentsPage() {
  const gateways = await getPaymentGatewaysForAdmin();
  const square = getSquareSetupStatus();

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Payments</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/80">
        Choose which processors appear at checkout. You can enable both Stripe and Square; customers will see every
        option that passes these toggles <em>and</em> runtime configuration checks.
      </p>
      <div className="mt-10">
        <PaymentsGatewayEditor initial={gateways} />
        <PaymentsSetupStatus
          square={square}
          squareToggleEnabled={gateways.squareEnabled}
          stripeSecretConfigured={!!process.env.STRIPE_SECRET_KEY?.trim()}
        />
      </div>
    </div>
  );
}
