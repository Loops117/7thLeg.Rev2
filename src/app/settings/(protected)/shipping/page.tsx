import { ShippingOptionsEditor } from "@/components/settings/shipping-options-editor";
import { prisma } from "@/lib/prisma";

export default async function SettingsShippingPage() {
  const options = await prisma.shippingOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      label: true,
      description: true,
      priceCents: true,
      sortOrder: true,
      active: true,
    },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:border-zinc-600 dark:text-emerald-200">
        Shipping
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-ink/80 dark:text-zinc-400">
        Define pickup or delivery tiers customers choose on the cart. When at least one option is{" "}
        <strong className="text-ink dark:text-zinc-200">active</strong>, checkout requires a selection and totals include
        the chosen amount. Leave every option inactive (or none at all) to keep free shipping behaviour.
      </p>
      <div className="mt-10">
        <ShippingOptionsEditor initial={options} />
      </div>
    </div>
  );
}
