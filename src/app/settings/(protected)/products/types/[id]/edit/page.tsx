import { notFound } from "next/navigation";
import { getProductTypeDefaultRecommendationsForAdmin } from "@/app/actions/product-type-recommendation-defaults-admin";
import { getProductTypeDefaultShippingExclusionsForAdmin } from "@/app/actions/product-type-shipping-defaults-admin";
import { ProductTypeEditForm } from "@/components/settings/product-type-edit-form";
import { ProductTypeRecommendationDefaultsEditor } from "@/components/settings/product-type-recommendation-defaults-editor";
import { ProductTypeShippingDefaultsEditor } from "@/components/settings/product-type-shipping-defaults-editor";
import type { ProductFooterOption } from "@/lib/products-admin-types";
import { productTypeOrderBy } from "@/lib/product-type-order";
import { ProductTypeIndex } from "@/lib/product-type-index";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductTypePage({ params }: Props) {
  const { id } = await params;
  const [type, allTypes, footers, shippingOptions] = await Promise.all([
    prisma.productType.findUnique({
      where: { id },
      include: { defaultFooters: { select: { footerId: true } } },
    }),
    prisma.productType.findMany({
      orderBy: [...productTypeOrderBy],
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
    prisma.shippingOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { id: true, label: true },
    }),
  ]);

  if (!type) {
    notFound();
  }

  const index = new ProductTypeIndex(allTypes);
  const descendantIds = new Set(index.descendantsOf(id));
  const parentOptions = index
    .flattenTree()
    .filter((row) => row.id !== id && !descendantIds.has(row.id))
    .map((row) => ({ id: row.id, pathLabel: row.pathLabel }));

  const initialFooterIds = type.defaultFooters.map((d) => d.footerId);
  const [typeDefaults, initialShippingExclusions] = await Promise.all([
    getProductTypeDefaultRecommendationsForAdmin(type.id),
    getProductTypeDefaultShippingExclusionsForAdmin(type.id),
  ]);

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Edit type</h1>
      <p className="mt-4 font-mono text-sm text-ink/70">{type.slug}</p>
      <div className="mt-8 max-w-4xl rounded border-2 border-palm bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <ProductTypeEditForm
          typeId={type.id}
          initialName={type.name}
          initialSlug={type.slug}
          initialParentId={type.parentId}
          initialStorefrontVisible={type.storefrontVisible}
          initialFooterIds={initialFooterIds}
          parentOptions={parentOptions}
          footers={footers as ProductFooterOption[]}
        />
        <ProductTypeRecommendationDefaultsEditor
          typeId={type.id}
          typeName={type.name}
          initialRelated={typeDefaults.related}
          initialYouMayAlsoWant={typeDefaults.youMayAlsoWant}
        />
        <ProductTypeShippingDefaultsEditor
          typeId={type.id}
          typeName={type.name}
          shippingOptions={shippingOptions}
          initialExcludedShippingOptionIds={initialShippingExclusions}
        />
      </div>
    </div>
  );
}
