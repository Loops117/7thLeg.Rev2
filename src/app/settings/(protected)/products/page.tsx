import Link from "next/link";
import { ProductsAdminPanel } from "@/components/settings/products-admin";
import { getProductCatalogEditPayload } from "@/app/actions/products-admin";
import { buildProductTypePickerGroups, ProductTypeIndex } from "@/lib/product-type-index";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function SettingsProductsPage({ searchParams }: Props) {
  const { edit: editId } = await searchParams;
  const trimmedEdit = editId?.trim() || null;

  const [products, types, footers, editPayload] = await Promise.all([
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        basePriceCents: true,
        quantity: true,
        unlimitedQuantity: true,
        active: true,
        featured: true,
        onSale: true,
        types: { select: { typeId: true } },
      },
    }),
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
    prisma.automaticFooter.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    trimmedEdit ? getProductCatalogEditPayload(trimmedEdit) : Promise.resolve(null),
  ]);

  const editNotFound = Boolean(trimmedEdit && !editPayload);

  const typePickerGroups = buildProductTypePickerGroups(types);
  const typeIndex = new ProductTypeIndex(types);
  const filterTypes = typeIndex.flattenTree().map((r) => ({
    id: r.id,
    pathLabel: r.pathLabel,
  }));
  const typeHierarchy = types;

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    basePriceCents: p.basePriceCents,
    quantity: p.quantity,
    unlimitedQuantity: p.unlimitedQuantity,
    active: p.active,
    featured: p.featured,
    onSale: p.onSale,
    typeIds: p.types.map((t) => t.typeId),
  }));

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Catalog</h1>
      <p className="mt-4 text-ink/80">
        Add or edit products in the first panel. The table lists everything for quick actions. Live pages:{" "}
        <Link href="/store" className="font-medium text-lagoon-dark underline">
          store
        </Link>
        .
      </p>
      <p className="mt-2 text-sm text-ink/65">
        <Link href="/settings/store" className="text-lagoon-dark underline">
          Store settings
        </Link>{" "}
        — banner, featured strip, footer.
      </p>

      <div className="mt-8">
        <ProductsAdminPanel
          initialProducts={rows}
          typePickerGroups={typePickerGroups}
          filterTypes={filterTypes}
          typeHierarchy={typeHierarchy}
          footers={footers}
          editPayload={editPayload}
          editIdFromUrl={trimmedEdit}
          editNotFound={editNotFound}
        />
      </div>
    </div>
  );
}
