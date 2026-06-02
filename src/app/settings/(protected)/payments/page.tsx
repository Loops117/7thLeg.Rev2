import { PaymentsGatewayEditor } from "@/components/settings/payments-gateway-editor";
import { getPaymentGatewaysForAdmin } from "@/lib/site-config";

export default async function SettingsPaymentsPage() {
  const gateways = await getPaymentGatewaysForAdmin();

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Payments</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/80">
        Choose which processors appear at checkout. You can enable both Stripe and Square; customers will see every
        option that passes these toggles <em>and</em> runtime configuration checks.
      </p>
      <div className="mt-10">
        <PaymentsGatewayEditor initial={gateways} />
      </div>
    </div>
  );
}
