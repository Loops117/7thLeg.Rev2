import type { CSSProperties } from "react";
import { StoreProductCard } from "@/components/store/store-product-card";
import type { StorefrontProductCard } from "@/lib/products-storefront";

function RecommendationColumn({
  title,
  headingId,
  products,
  cardWidthPx,
  eventId,
  productDiagonalBrandName,
  productDiagonalNameGapPx,
  watermarkOpacityPercent,
}: {
  title: string;
  headingId: string;
  products: StorefrontProductCard[];
  cardWidthPx: number;
  eventId?: string | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  if (products.length === 0) return null;

  return (
    <div className="min-w-0 w-full">
      <h2 id={headingId} className="text-sm font-black text-palm">
        {title}
      </h2>
      <div className="mt-2 -mx-0.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5">
        <ul
          className="product-recommendation-strip flex w-max flex-nowrap gap-1.5 sm:gap-2"
          style={{ "--product-recommendation-card-width": `${cardWidthPx}px` } as CSSProperties}
        >
        {products.map((p) => (
          <li key={p.id} className="product-recommendation-strip__item shrink-0">
            <StoreProductCard
              product={p}
              compact
              mini
              eventId={eventId}
              productDiagonalBrandName={productDiagonalBrandName}
              productDiagonalNameGapPx={productDiagonalNameGapPx}
              watermarkOpacityPercent={watermarkOpacityPercent}
            />
          </li>
        ))}
        </ul>
      </div>
    </div>
  );
}

export function ProductRecommendationSections({
  related,
  youMayAlsoWant,
  recommendationCardWidthPx = 88,
  eventId = null,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
}: {
  related: StorefrontProductCard[];
  youMayAlsoWant: StorefrontProductCard[];
  /** From Settings → Store → Product cards. */
  recommendationCardWidthPx?: number;
  eventId?: string | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  const hasRelated = related.length > 0;
  const hasAlsoWant = youMayAlsoWant.length > 0;
  if (!hasRelated && !hasAlsoWant) return null;

  const shared = {
    cardWidthPx: recommendationCardWidthPx,
    eventId,
    productDiagonalBrandName,
    productDiagonalNameGapPx,
    watermarkOpacityPercent,
  };

  const showDivider = hasRelated && hasAlsoWant;

  return (
    <section className="mt-6 border-t border-palm/20 pt-4" aria-label="Product suggestions">
      <div className="flex flex-col gap-5">
        {hasRelated ? (
          <div className={showDivider ? "border-b border-palm/20 pb-5" : undefined}>
            <RecommendationColumn
              title="Related items"
              headingId="product-related-items-heading"
              products={related}
              {...shared}
            />
          </div>
        ) : null}

        {hasAlsoWant ? (
          <RecommendationColumn
            title="You may also want"
            headingId="product-you-may-also-want-heading"
            products={youMayAlsoWant}
            {...shared}
          />
        ) : null}
      </div>
    </section>
  );
}
