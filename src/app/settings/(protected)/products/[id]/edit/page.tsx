import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/settings/products?edit=${encodeURIComponent(id)}`);
}
