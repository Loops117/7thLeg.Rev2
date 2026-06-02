import { notFound } from "next/navigation";
import { ProductFooterEditForm } from "@/components/settings/product-footer-edit-form";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductFooterPage({ params }: Props) {
  const { id } = await params;
  const footer = await prisma.automaticFooter.findUnique({ where: { id } });
  if (!footer) {
    notFound();
  }

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Edit footer</h1>
      <div className="mt-8 max-w-3xl rounded border-2 border-palm bg-white p-4 shadow-sm sm:p-6">
        <ProductFooterEditForm footerId={footer.id} initialTitle={footer.title} initialHtml={footer.html} />
      </div>
    </div>
  );
}
