import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturedStripScroll } from "@/components/store/featured-strip-scroll";
import { StoreAllProductsSection } from "@/components/store/store-all-products-section";
import { StoreProductCard } from "@/components/store/store-product-card";
import { getInBreedingPageSettings } from "@/lib/in-breeding-settings";
import { getSeoPublicConfig } from "@/lib/site-config";
import { getStoreSettings } from "@/lib/store-settings";
import {
  countStorefrontInBreedingProducts,
  getStorefrontInBreedingFeaturedStrip,
  getStorefrontInBreedingProductsPage,
  getStorefrontTypeFilterNav,
  STORE_PAGE_SIZE,
  type StorefrontProductCard,
} from "@/lib/products-storefront";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, site] = await Promise.all([getInBreedingPageSettings(), getSeoPublicConfig()]);
  const title = settings.pageTitle.trim() || "In Breeding";
  const company = site.companyName?.trim() || "7th Leg";
  return {
    title: `${title} — ${company}`,
    description: `Products currently in breeding at ${company}.`,
  };
}

export default async function InBreedingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type: typeParam, q: qParam } = await searchParams;
  const activeSlug = typeParam?.trim() || null;
  const initialQ = (qParam?.trim() ?? "") || "";

  const [pageSettings, storeSettings, sitePub] = await Promise.all([
    getInBreedingPageSettings(),
    getStoreSettings(),
    getSeoPublicConfig(),
  ]);

  if (!pageSettings.pageEnabled) {
    notFound();
  }

  const pageTitle = pageSettings.pageTitle.trim() || "In Breeding";
  const productDiagonalBrandName = sitePub.productDiagonalBrandOverlay ? sitePub.companyName : null;
  const hover = storeSettings.cardHoverMode;

  const [typeFilterNav, catalogAllCount, featRows, firstPage, totalForGrid] = await Promise.all([
    getStorefrontTypeFilterNav(activeSlug, { inBreedingOnly: true }),
    countStorefrontInBreedingProducts(null, null),
    pageSettings.featuredStripEnabled
      ? getStorefrontInBreedingFeaturedStrip(pageSettings.featuredStripConfig.maxProducts)
      : Promise.resolve([]),
    getStorefrontInBreedingProductsPage(0, STORE_PAGE_SIZE, activeSlug, initialQ),
    countStorefrontInBreedingProducts(activeSlug, initialQ),
  ]);

  return (
    <div className="p-6 sm:p-10" data-store-card-hover={hover}>
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">
        {pageTitle}
      </h1>

      {pageSettings.bannerEnabled && pageSettings.bannerHtml.trim() ? (
        <div
          className="store-rich mt-8 rounded border-2 border-palm/25 bg-white/60 p-4 text-ink shadow-sm sm:p-6 [&_a]:text-lagoon-dark [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: pageSettings.bannerHtml }}
        />
      ) : null}

      {pageSettings.featuredStripEnabled ? (
        <section className="mt-10" aria-labelledby="in-breeding-featured-heading">
          <h2 id="in-breeding-featured-heading" className="text-lg font-black text-palm">
            {pageSettings.featuredStripConfig.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">
            Featured products currently in breeding (max {pageSettings.featuredStripConfig.maxProducts}).
          </p>
          <FeaturedStrip
            products={featRows}
            hover={hover}
            productDiagonalBrandName={productDiagonalBrandName}
            productDiagonalNameGapPx={sitePub.productDiagonalNameGapPx}
            watermarkOpacityPercent={sitePub.watermarkOpacityPercent}
          />
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-black text-palm">All items</h2>
        <StoreAllProductsSection
          baseProducts={firstPage}
          totalCount={totalForGrid}
          pageSize={STORE_PAGE_SIZE}
          initialQuery={initialQ}
          typeFilterNav={typeFilterNav}
          activeSlug={activeSlug}
          eventId={null}
          eventMetaOk
          totalCatalogSize={catalogAllCount}
          hover={hover}
          productDiagonalBrandName={productDiagonalBrandName}
          productDiagonalNameGapPx={sitePub.productDiagonalNameGapPx}
          watermarkOpacityPercent={sitePub.watermarkOpacityPercent}
          catalogCardWidthPx={pageSettings.productCardConfig.cardWidthPx}
          catalogPath="/in-breeding"
          catalogVariant="inBreeding"
        />
      </section>

      {pageSettings.footerEnabled && pageSettings.footerHtml.trim() ? (
        <div
          className="store-rich mt-12 rounded border-2 border-palm/25 bg-white/60 p-4 text-ink shadow-sm sm:p-6 [&_a]:text-lagoon-dark [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: pageSettings.footerHtml }}
        />
      ) : null}
    </div>
  );
}

function FeaturedStrip({
  products,
  hover,
  productDiagonalBrandName,
  productDiagonalNameGapPx,
  watermarkOpacityPercent,
}: {
  products: StorefrontProductCard[];
  hover: "zoom" | "glow";
  productDiagonalBrandName: string | null;
  productDiagonalNameGapPx: number;
  watermarkOpacityPercent: number;
}) {
  if (products.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink/60">
        No featured in-breeding products yet. Mark products as <strong>Featured</strong> and{" "}
        <strong>In breeding</strong> in the catalog.
      </p>
    );
  }
  return (
    <FeaturedStripScroll>
      <div className="mt-4 flex items-stretch gap-4 pb-2">
        {products.map((p) => (
          <div key={p.id} className="flex w-40 shrink-0 sm:w-44">
            <StoreProductCard
              product={p}
              hover={hover}
              compact
              productFrom="in-breeding"
              productDiagonalBrandName={productDiagonalBrandName}
              productDiagonalNameGapPx={productDiagonalNameGapPx}
              watermarkOpacityPercent={watermarkOpacityPercent}
            />
          </div>
        ))}
      </div>
    </FeaturedStripScroll>
  );
}
