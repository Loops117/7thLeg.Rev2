import type { Metadata } from "next";
import Link from "next/link";
import { FeaturedStripScroll } from "@/components/store/featured-strip-scroll";
import { StoreAllProductsSection } from "@/components/store/store-all-products-section";
import { StoreProductCard } from "@/components/store/store-product-card";
import { getSeoPublicConfig } from "@/lib/site-config";
import { buildStoreMetadata } from "@/lib/seo-metadata";
import { getSiteBrandingForMetadata } from "@/lib/site-branding";
import { getStoreSettings } from "@/lib/store-settings";
import {
  countStorefrontEventProducts,
  countStorefrontProducts,
  getStorefrontEventProductPage,
  getStorefrontFeaturedStrip,
  getStorefrontTypeFilterNav,
  getStorefrontProductsPage,
  STORE_PAGE_SIZE,
  type StorefrontProductCard,
} from "@/lib/products-storefront";

type ProductRow = StorefrontProductCard;

export async function generateMetadata(): Promise<Metadata> {
  const [config, branding] = await Promise.all([getSeoPublicConfig(), getSiteBrandingForMetadata()]);
  return buildStoreMetadata(config, branding);
}

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; event?: string; q?: string }>;
}) {
  const { type: typeParam, event: eventParam, q: qParam } = await searchParams;
  const activeSlug = typeParam?.trim() || null;
  const eventId = eventParam?.trim() || null;
  const initialQ = (qParam?.trim() ?? "") || "";

  const [s, typeFilterNav, catalogAllCount, sitePub] = await Promise.all([
    getStoreSettings(),
    getStorefrontTypeFilterNav(activeSlug),
    countStorefrontProducts(null, null),
    getSeoPublicConfig(),
  ]);
  const productDiagonalBrandName = sitePub.productDiagonalBrandOverlay ? sitePub.companyName : null;

  const featRows = s.storeFeaturedStripEnabled
    ? await getStorefrontFeaturedStrip(s.storeFeaturedStripConfig.maxProducts)
    : [];

  const hover = s.cardHoverMode;

  if (eventId) {
    const [firstPack, eventTotal] = await Promise.all([
      getStorefrontEventProductPage(eventId, 0, STORE_PAGE_SIZE, initialQ),
      countStorefrontEventProducts(eventId, initialQ),
    ]);

    const eventMeta = firstPack ? { id: firstPack.event.id, name: firstPack.event.name } : null;
    const eventMetaOk = Boolean(eventMeta);
    const baseGrid: StorefrontProductCard[] = firstPack?.products ?? [];

    return (
      <div className="p-6 sm:p-10" data-store-card-hover={hover}>
        <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">
          Store
        </h1>
        {eventMeta ? (
          <p className="mt-4 max-w-2xl text-ink/85">
            Showing products for <strong>{eventMeta.name}</strong>.{" "}
            <Link href={`/event/${eventMeta.id}`} className="font-medium text-lagoon-dark underline">
              Event page
            </Link>
            {" · "}
            <Link href="/store" className="font-medium text-lagoon-dark underline">
              Full store
            </Link>
          </p>
        ) : null}

        {s.storeBannerEnabled && s.storeBannerHtml.trim() ? (
          <div
            className="store-rich mt-8 rounded border-2 border-palm/25 bg-white/60 p-4 text-ink shadow-sm sm:p-6 [&_a]:text-lagoon-dark [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: s.storeBannerHtml }}
          />
        ) : null}

        {s.storeFeaturedStripEnabled ? (
          <section className="mt-10" aria-labelledby="store-featured-heading">
            <h2 id="store-featured-heading" className="text-lg font-black text-palm">
              {s.storeFeaturedStripConfig.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink/70">
              Showing featured products (max {s.storeFeaturedStripConfig.maxProducts}).
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
          <h2 className="text-lg font-black text-palm">All products</h2>
          <StoreAllProductsSection
            baseProducts={baseGrid}
            totalCount={eventTotal}
            pageSize={STORE_PAGE_SIZE}
            initialQuery={initialQ}
            typeFilterNav={typeFilterNav}
            activeSlug={activeSlug}
            eventId={eventId}
            eventMetaOk={eventMetaOk}
            totalCatalogSize={catalogAllCount}
            hover={hover}
            productDiagonalBrandName={productDiagonalBrandName}
            productDiagonalNameGapPx={sitePub.productDiagonalNameGapPx}
            watermarkOpacityPercent={sitePub.watermarkOpacityPercent}
            catalogCardWidthPx={s.storeProductCardConfig.cardWidthPx}
          />
        </section>

        {s.storeFooterEnabled && s.storeFooterHtml.trim() ? (
          <div
            className="store-rich mt-12 rounded border-2 border-palm/25 bg-white/60 p-4 text-ink shadow-sm sm:p-6 [&_a]:text-lagoon-dark [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: s.storeFooterHtml }}
          />
        ) : null}
      </div>
    );
  }

  const [firstPage, totalForGrid] = await Promise.all([
    getStorefrontProductsPage(0, STORE_PAGE_SIZE, activeSlug, initialQ),
    countStorefrontProducts(activeSlug, initialQ),
  ]);

  return (
    <div className="p-6 sm:p-10" data-store-card-hover={hover}>
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">
        Store
      </h1>

      {s.storeBannerEnabled && s.storeBannerHtml.trim() ? (
        <div
          className="store-rich mt-8 rounded border-2 border-palm/25 bg-white/60 p-4 text-ink shadow-sm sm:p-6 [&_a]:text-lagoon-dark [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: s.storeBannerHtml }}
        />
      ) : null}

      {s.storeFeaturedStripEnabled ? (
        <section className="mt-10" aria-labelledby="store-featured-heading">
          <h2 id="store-featured-heading" className="text-lg font-black text-palm">
            {s.storeFeaturedStripConfig.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">
            Showing featured products (max {s.storeFeaturedStripConfig.maxProducts}).
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
        <h2 className="text-lg font-black text-palm">All products</h2>
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
          catalogCardWidthPx={s.storeProductCardConfig.cardWidthPx}
        />
      </section>

      {s.storeFooterEnabled && s.storeFooterHtml.trim() ? (
        <div
          className="store-rich mt-12 rounded border-2 border-palm/25 bg-white/60 p-4 text-ink shadow-sm sm:p-6 [&_a]:text-lagoon-dark [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: s.storeFooterHtml }}
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
  products: ProductRow[];
  hover: "zoom" | "glow";
  productDiagonalBrandName: string | null;
  productDiagonalNameGapPx: number;
  watermarkOpacityPercent: number;
}) {
  if (products.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink/60">
        No featured products yet. Edit a product in Settings → Products and enable <strong>Featured</strong>.
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
              productFrom="store"
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
