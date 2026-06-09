import { buildProductJsonLd } from "@/lib/seo-metadata";

export function ProductJsonLd({
  product,
  siteName,
}: {
  product: {
    name: string;
    slug: string;
    description: string;
    shortDescription: string | null;
    basePriceCents: number;
    imageUrl: string | null;
  };
  siteName: string;
}) {
  const json = buildProductJsonLd(product, siteName);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
