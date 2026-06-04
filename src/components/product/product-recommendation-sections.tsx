import { StoreProductCard } from "@/components/store/store-product-card";
import type { StorefrontProductCard } from "@/lib/products-storefront";

function RecommendationColumn({
  title,
  headingId,
  products,
  eventId,
  productDiagonalBrandName,
  productDiagonalNameGapPx,
  watermarkOpacityPercent,
}: {
  title: string;
  headingId: string;
  products: StorefrontProductCard[];
  eventId?: string | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  if (products.length === 0) return null;

  return (
    <div className="min-w-0 flex-1">
      <h2 id={headingId} className="text-base font-black text-palm sm:text-lg">
        {title}
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <StoreProductCard
              product={p}
              compact
              eventId={eventId}
              productDiagonalBrandName={productDiagonalBrandName}
              productDiagonalNameGapPx={productDiagonalNameGapPx}
              watermarkOpacityPercent={watermarkOpacityPercent}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductRecommendationSections({
  related,
  youMayAlsoWant,
  eventId = null,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
}: {
  related: StorefrontProductCard[];
  youMayAlsoWant: StorefrontProductCard[];
  eventId?: string | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  const hasRelated = related.length > 0;
  const hasAlsoWant = youMayAlsoWant.length > 0;
  if (!hasRelated && !hasAlsoWant) return null;

  const shared = {
    eventId,
    productDiagonalBrandName,
    productDiagonalNameGapPx,
    watermarkOpacityPercent,
  };

  const showDivider = hasRelated && hasAlsoWant;

  return (
    <section
      className="mt-10 border-t-2 border-palm/20 pt-8"
      aria-label="Product suggestions"
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-0">
        {hasRelated ? (
          <div className={showDivider ? "md:pr-5 lg:pr-6" : undefined}>
            <RecommendationColumn
              title="Related items"
              headingId="product-related-items-heading"
              products={related}
              {...shared}
            />
          </div>
        ) : null}

        {showDivider ? (
          <>
            <div
              className="hidden shrink-0 self-stretch md:block md:w-px md:bg-palm/25"
              aria-hidden
            />
            <div className="border-t border-palm/25 md:hidden" aria-hidden />
          </>
        ) : null}

        {hasAlsoWant ? (
          <div className={showDivider ? "md:pl-5 lg:pl-6" : undefined}>
            <RecommendationColumn
              title="You may also want"
              headingId="product-you-may-also-want-heading"
              products={youMayAlsoWant}
              {...shared}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
