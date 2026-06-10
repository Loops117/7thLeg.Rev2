import type { CSSProperties } from "react";
import { ProductRecommendationStripCard } from "@/components/product/product-recommendation-strip-card";
import { recommendationStripCardHeightPx } from "@/lib/recommendation-strip-layout";
import type { StorefrontProductCard } from "@/lib/products-storefront";
import type { StoreRecommendationCardConfig } from "@/lib/store-settings-shared";

type StripHoverConfig = Pick<
  StoreRecommendationCardConfig,
  "hoverGlowHex" | "hoverGlowThicknessPx" | "hoverZoomPercent"
>;

function RecommendationColumn({
  title,
  headingId,
  products,
  cardWidthPx,
  hoverConfig,
  eventId,
  productDiagonalBrandName,
  productDiagonalNameGapPx,
  watermarkOpacityPercent,
}: {
  title: string;
  headingId: string;
  products: StorefrontProductCard[];
  cardWidthPx: number;
  hoverConfig: StripHoverConfig;
  eventId?: string | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  if (products.length === 0) return null;

  const cardHeightPx = recommendationStripCardHeightPx(cardWidthPx);

  return (
    <div className="min-w-0 w-full">
      <h2 id={headingId} className="text-sm font-black text-palm">
        {title}
      </h2>
      <div
        className="product-recommendation-strip-scroll mt-2 -mx-0.5 px-0.5 pb-1"
        style={
          {
            "--product-recommendation-card-width": `${cardWidthPx}px`,
            "--product-recommendation-card-height": `${cardHeightPx}px`,
          } as CSSProperties
        }
      >
        <ul className="product-recommendation-strip flex w-max flex-nowrap gap-1.5 sm:gap-2">
          {products.map((p) => (
            <ProductRecommendationStripCard
              key={p.id}
              product={p}
              cardWidthPx={cardWidthPx}
              hoverGlowHex={hoverConfig.hoverGlowHex}
              hoverGlowThicknessPx={hoverConfig.hoverGlowThicknessPx}
              hoverZoomPercent={hoverConfig.hoverZoomPercent}
              eventId={eventId}
              productDiagonalBrandName={productDiagonalBrandName}
              productDiagonalNameGapPx={productDiagonalNameGapPx}
              watermarkOpacityPercent={watermarkOpacityPercent}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProductRecommendationSections({
  related,
  youMayAlsoWant,
  recommendationCardConfig,
  eventId = null,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
}: {
  related: StorefrontProductCard[];
  youMayAlsoWant: StorefrontProductCard[];
  /** From Settings → Store → Product cards. */
  recommendationCardConfig: StoreRecommendationCardConfig;
  eventId?: string | null;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  const hasRelated = related.length > 0;
  const hasAlsoWant = youMayAlsoWant.length > 0;
  if (!hasRelated && !hasAlsoWant) return null;

  const shared = {
    cardWidthPx: recommendationCardConfig.cardWidthPx,
    hoverConfig: {
      hoverGlowHex: recommendationCardConfig.hoverGlowHex,
      hoverGlowThicknessPx: recommendationCardConfig.hoverGlowThicknessPx,
      hoverZoomPercent: recommendationCardConfig.hoverZoomPercent,
    },
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
