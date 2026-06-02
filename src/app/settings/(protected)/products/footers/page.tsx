import { ProductFootersAdmin } from "@/components/settings/product-footers-admin";
import { prisma } from "@/lib/prisma";

export default async function ProductFootersSettingsPage() {
  const footers = await prisma.automaticFooter.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Product footers</h1>
      <div className="mt-8">
        <ProductFootersAdmin initialFooters={footers} />
      </div>
    </div>
  );
}
