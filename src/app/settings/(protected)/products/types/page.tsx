import { ProductTypesAdmin } from "@/components/settings/product-types-admin";
import type { ProductFooterOption } from "@/lib/products-admin-types";
import { productTypeOrderBy } from "@/lib/product-type-order";
import { ProductTypeIndex } from "@/lib/product-type-index";
import { prisma } from "@/lib/prisma";

export default async function ProductTypesSettingsPage() {
  const [rawTypes, footers] = await Promise.all([
    prisma.productType.findMany({
      orderBy: [...productTypeOrderBy],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        storefrontVisible: true,
        sortOrder: true,
        _count: { select: { products: true, defaultFooters: true } },
      },
    }),
    prisma.automaticFooter.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const index = new ProductTypeIndex(
    rawTypes.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      parentId: t.parentId,
      sortOrder: t.sortOrder,
      storefrontVisible: t.storefrontVisible,
    })),
  );
  const treeRows = index.flattenTree().map((row) => {
    const raw = rawTypes.find((t) => t.id === row.id)!;
    return {
      ...row,
      storefrontVisible: raw.storefrontVisible,
      _count: raw._count,
      siblingCount: index.children(row.parentId).length,
      siblingIndex: index.children(row.parentId).findIndex((s) => s.id === row.id),
    };
  });

  const parentOptions = rawTypes.map((t) => ({
    id: t.id,
    pathLabel: index.flattenTree().find((r) => r.id === t.id)?.pathLabel ?? t.name,
  }));

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Product types</h1>
      <p className="mt-4 text-ink/80">
        Types appear as checkboxes when you create or edit a product, as <strong>filters on the store</strong>, and
        control which <strong>default footers</strong> apply to matching products.
      </p>
      <div className="mt-8">
        <ProductTypesAdmin
          initialTreeRows={treeRows}
          parentOptions={parentOptions}
          footers={footers as ProductFooterOption[]}
        />
      </div>
    </div>
  );
}
