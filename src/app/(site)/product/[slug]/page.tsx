import Link from "next/link";
import { notFound } from "next/navigation";
import { auth as readAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { ProductVariantShop } from "@/components/product-variant-shop";
import { getFootersForProduct } from "@/lib/product-page-footers";
import { productCanPurchase } from "@/lib/product-stock";
import { getEventPriceOverlayForProduct } from "@/lib/products-storefront";
import { parseProductPriceTiersJson } from "@/lib/product-price-tiers-storefront";
import { normalizeProductDescriptionHtml } from "@/lib/product-description-html";
import { formatTypeBreadcrumb, loadProductTypeIndex } from "@/lib/product-type-tree";
import { parseVariantPriceDisplay } from "@/lib/product-variant-price-display";
import { CustomerSuppliedProductImages } from "@/components/product/customer-supplied-product-images";
import {
  listCustomerSuppliedImagesForProduct,
  listHotspotsBySubmissionIds,
} from "@/lib/image-submission-hotspots";
import { getImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance";
import { ProductKitSection } from "@/components/product/product-kit-section";
import { ProductRecommendationSections } from "@/components/product/product-recommendation-sections";
import { getProductKitForStorefront } from "@/lib/product-kits";
import { getProductRecommendationsForStorefront } from "@/lib/product-recommendations";
import { productFooterCssVariables } from "@/lib/theme-config";
import { getStoreSettings } from "@/lib/store-settings";
import { loadResolvedPublicThemeFromDb } from "@/lib/theme-config-server";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ event?: string; variant?: string }>;
};

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { event: eventParam, variant: variantParam } = await searchParams;
  const eventId = eventParam?.trim() || null;
  const initialVariantId = variantParam?.trim() || null;
  const [product, sitePub, publicTheme, storeSettings] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
        types: { include: { type: true } },
      },
    }),
    getSiteConfig(),
    loadResolvedPublicThemeFromDb(),
    getStoreSettings(),
  ]);
  const productFooterStyle = productFooterCssVariables(publicTheme.productFooter);

  if (!product) {
    notFound();
  }

  const productDiagonalBrandName = sitePub.productDiagonalBrandOverlay ? sitePub.companyName : null;

  const typeIds = product.types.map((t) => t.typeId);
  const [footerBlocks, customerSuppliedImages, pinAppearance, recommendations, kit] = await Promise.all([
    getFootersForProduct(product.id, typeIds),
    listCustomerSuppliedImagesForProduct(product.id),
    getImageSubmissionPinAppearance(),
    getProductRecommendationsForStorefront(product.id, eventId),
    getProductKitForStorefront(product.id, eventId),
  ]);
  const customerSuppliedPinsBySubmissionId = await listHotspotsBySubmissionIds(
    customerSuppliedImages.map((img) => img.submissionId),
  );
  const typeIndex = await loadProductTypeIndex();

  const overlay =
    eventId != null
      ? await getEventPriceOverlayForProduct(
          eventId,
          product.id,
          product.basePriceCents,
          product.onSale,
        )
      : null;
  const priceCents = overlay?.displayPriceCents ?? product.basePriceCents;
  const showSale = overlay?.displaySale ?? product.onSale;

  const canPurchase = productCanPurchase({
    quantity: product.quantity,
    unlimitedQuantity: product.unlimitedQuantity,
    variants: product.variants,
  });

  const visibleTypeIds = product.types
    .filter((t) => t.type.storefrontVisible)
    .map((t) => t.typeId);
  const typesLine = formatTypeBreadcrumb(typeIndex, visibleTypeIds);

  const session = await readAuthSession().catch(() => null);
  const sessionCustomerId = session?.user?.role === "customer" && session.user.id ? session.user.id : null;
  const wishlistRow =
    sessionCustomerId != null
      ? await prisma.customerWishlistItem.findUnique({
          where: { customerId_productId: { customerId: sessionCustomerId, productId: product.id } },
          select: { id: true },
        })
      : null;
  const initialInWishlist = Boolean(wishlistRow);

  return (
    <div className="p-6 sm:p-10">
      <p className="text-sm font-medium text-lagoon-dark">
        <Link href="/store" className="underline">
          ← Store
        </Link>
      </p>

      <ProductVariantShop
        productId={product.id}
        timedSaleEventId={eventId}
        variantPriceDisplay={parseVariantPriceDisplay(product.variantPriceDisplay)}
        productName={product.name}
        shortDescription={product.shortDescription}
        descriptionHtml={normalizeProductDescriptionHtml(product.description)}
        typesLine={typesLine}
        basePriceCents={priceCents}
        showSale={showSale}
        productUnlimited={!!product.unlimitedQuantity}
        productQuantity={product.quantity}
        canPurchase={canPurchase}
        images={product.images.map((im) => ({
          id: im.id,
          url: im.url,
          watermarkedUrl: im.watermarkedUrl,
          useWatermarkedPublic: im.useWatermarkedPublic,
          sortOrder: im.sortOrder,
          variantId: im.variantId,
        }))}
        variants={product.variants.map((v) => ({
          id: v.id,
          label: v.label,
          descriptionHtml: normalizeProductDescriptionHtml(v.description),
          priceDeltaCents: v.priceDeltaCents,
          stock: v.stock,
          unlimitedStock: v.unlimitedStock,
          active: v.active,
          priceTiers: parseProductPriceTiersJson(v.priceTiersJson),
          pickerBgHex: v.pickerBgHex,
          pickerFgHex: v.pickerFgHex,
          pickerBorderHex: v.pickerBorderHex,
        }))}
        productDiagonalBrandName={productDiagonalBrandName}
        productDiagonalNameGapPx={sitePub.productDiagonalNameGapPx}
        watermarkOpacityPercent={sitePub.watermarkOpacityPercent}
        wishlistCallbackUrl={`/product/${product.slug}${eventId ? `?event=${encodeURIComponent(eventId)}` : ""}`}
        productSlug={product.slug}
        initialInWishlist={initialInWishlist}
        initialSelectedVariantId={initialVariantId}
      />

      {kit ? <ProductKitSection kit={kit} timedSaleEventId={eventId} /> : null}

      <CustomerSuppliedProductImages
        images={customerSuppliedImages}
        pinsBySubmissionId={customerSuppliedPinsBySubmissionId}
        pinAppearance={pinAppearance}
        productSlug={product.slug}
        recommendationCardConfig={storeSettings.storeRecommendationCardConfig}
      />

      <ProductRecommendationSections
        related={recommendations.related}
        youMayAlsoWant={recommendations.youMayAlsoWant}
        recommendationCardConfig={storeSettings.storeRecommendationCardConfig}
        eventId={eventId}
        productDiagonalBrandName={productDiagonalBrandName}
        productDiagonalNameGapPx={sitePub.productDiagonalNameGapPx}
        watermarkOpacityPercent={sitePub.watermarkOpacityPercent}
      />

      {footerBlocks.length > 0 ? (
        <section
          className="product-footer-section mt-12 pt-10"
          style={productFooterStyle}
          aria-labelledby="product-footers-heading"
        >
          <h2 id="product-footers-heading" className="sr-only">
            Additional information
          </h2>
          <div className="space-y-8">
            {footerBlocks.map((block) => (
              <article key={block.id} className="product-footer-block">
                <h3 className="product-footer-block__title">{block.title}</h3>
                <div
                  className="product-footer-block__body store-rich"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
