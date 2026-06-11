import { ProductStockingAdmin } from "@/components/settings/product-stocking-admin";
import { getProductStockingRowsForAdmin } from "@/app/actions/product-stocking-admin";
import { ProductTypeIndex } from "@/lib/product-type-index";
import { prisma } from "@/lib/prisma";

export default async function ProductStockingPage() {
  const [rows, types] = await Promise.all([
    getProductStockingRowsForAdmin(),
    prisma.productType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        sortOrder: true,
        storefrontVisible: true,
      },
    }),
  ]);

  const typeIndex = new ProductTypeIndex(types);
  const filterTypes = typeIndex.flattenTree().map((r) => ({
    id: r.id,
    pathLabel: r.pathLabel,
  }));

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Product stocking</h1>
      <p className="mt-4 max-w-3xl text-sm text-ink/80">
        Bulk-edit listing visibility, in-breeding status, option availability, price, quantity, and shipping units
        for every product variation. Use search and filters to work through a type or flag at a time.
      </p>
      <div className="mt-8">
        <ProductStockingAdmin initialRows={rows} filterTypes={filterTypes} typeHierarchy={types} />
      </div>
    </div>
  );
}
