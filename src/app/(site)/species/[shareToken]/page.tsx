import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSpeciesListViewer } from "@/components/species/public-species-list-viewer";
import { getPublicSpeciesListByToken } from "@/lib/customer-species-public";

type Props = { params: Promise<{ shareToken: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  const page = await getPublicSpeciesListByToken(shareToken);
  if (!page) return { title: "Species list" };
  return {
    title: page.listTitle,
    description: `Species collection: ${page.listTitle}.`,
  };
}

export default async function PublicSpeciesListPage({ params }: Props) {
  const { shareToken } = await params;
  const page = await getPublicSpeciesListByToken(shareToken);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">{page.listTitle}</h1>
      <p className="mt-3 text-sm text-ink/70">Shared species collection</p>
      <PublicSpeciesListViewer entries={page.entries} />
    </div>
  );
}
