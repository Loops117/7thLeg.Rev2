"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { AddToWishlistButton } from "@/components/add-to-wishlist-button";
import { ProductDiagonalBrandOverlay } from "@/components/store/product-diagonal-brand-overlay";
import {
  PRODUCT_IMAGE_PLACEHOLDER_URL,
  productPageGalleryAll,
  productPagePreferredImageIndex,
  storefrontImageUrl,
  type ProductGalleryImageRow,
} from "@/lib/product-images-public";
import { variantIsPurchasable } from "@/lib/product-stock";
import {
  unitCentsForVariantQuantity,
  type ProductPriceTier,
} from "@/lib/product-price-tiers-storefront";
import {
  variantOptionPriceLabel,
  type VariantPriceDisplay,
} from "@/lib/product-variant-price-display";
import { formatPriceUsd } from "@/lib/product-slug";
import {
  normalizeProductDescriptionHtml,
  richTextHasVisibleContent,
} from "@/lib/product-description-html";
import { variantPickerButtonStyle } from "@/lib/variant-picker-style";

type VariantRow = {
  id: string;
  label: string;
  descriptionHtml: string;
  priceDeltaCents: number;
  stock: number;
  unlimitedStock: boolean;
  active: boolean;
  priceTiers: ProductPriceTier[] | null;
  pickerBgHex?: string | null;
  pickerFgHex?: string | null;
  pickerBorderHex?: string | null;
};

type ImgRow = ProductGalleryImageRow;

export function ProductVariantShop({
  productId,
  productName,
  shortDescription,
  descriptionHtml,
  typesLine,
  basePriceCents,
  showSale,
  productUnlimited,
  productQuantity,
  canPurchase,
  images,
  variants,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
  timedSaleEventId = null,
  variantPriceDisplay = "difference",
  wishlistCallbackUrl,
  productSlug,
  initialInWishlist,
  initialSelectedVariantId = null,
}: {
  productId: string;
  productName: string;
  shortDescription: string | null;
  descriptionHtml: string;
  typesLine: string | null;
  basePriceCents: number;
  showSale: boolean;
  productUnlimited: boolean;
  productQuantity: number;
  canPurchase: boolean;
  images: ImgRow[];
  variants: VariantRow[];
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
  /** From `?event=` on TIMED storefront links — attaches sale rules to cart lines when adding. */
  timedSaleEventId?: string | null;
  variantPriceDisplay?: VariantPriceDisplay;
  /** For “Log in” redirect on wishlist CTA. */
  wishlistCallbackUrl: string;
  /** Storefront path segment slug — builds `/product/{slug}` for wishlist revalidation. */
  productSlug: string;
  /** Whether this customer already has this product on their wishlist (one row per product). */
  initialInWishlist: boolean;
  /** From `?variant=` (e.g. gallery product pins). */
  initialSelectedVariantId?: string | null;
}) {
  const purchasable = variants.filter(variantIsPurchasable);
  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    if (variants.length === 0) return "";
    const fromUrl = initialSelectedVariantId?.trim();
    if (fromUrl && variants.some((v) => v.id === fromUrl)) return fromUrl;
    if (purchasable.length === 1) return purchasable[0].id;
    return purchasable[0]?.id ?? "";
  });

  const purchasableKey = purchasable.map((v) => v.id).join(",");
  useEffect(() => {
    if (variants.length === 0) return;
    const fromUrl = initialSelectedVariantId?.trim();
    if (fromUrl && variants.some((v) => v.id === fromUrl)) {
      setSelectedVariantId(fromUrl);
      return;
    }
    if (purchasable.length === 0) {
      setSelectedVariantId("");
      return;
    }
    setSelectedVariantId((cur) =>
      cur && variants.some((v) => v.id === cur) ? cur : purchasable[0].id,
    );
  }, [variants.length, purchasableKey, initialSelectedVariantId]);

  const hasVariants = variants.length > 0;
  const gallery = productPageGalleryAll(images);

  const [imageIndex, setImageIndex] = useState(() =>
    productPagePreferredImageIndex(gallery, selectedVariantId, hasVariants),
  );
  const [quantity, setQuantity] = useState(1);
  const galleryKey = gallery.map((g) => g.id).join(",");
  useEffect(() => {
    setImageIndex(productPagePreferredImageIndex(gallery, selectedVariantId, hasVariants));
  }, [selectedVariantId, galleryKey, hasVariants]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantId]);

  const hero = gallery[imageIndex] ?? gallery[0];
  const heroUrl = hero ? storefrontImageUrl(hero) : PRODUCT_IMAGE_PLACEHOLDER_URL;
  const hasGalleryNav = gallery.length > 1;

  function showPrevImage() {
    setImageIndex((idx) => (idx <= 0 ? gallery.length - 1 : idx - 1));
  }

  function showNextImage() {
    setImageIndex((idx) => (idx >= gallery.length - 1 ? 0 : idx + 1));
  }

  const selectedVar = variants.find((v) => v.id === selectedVariantId);
  const variantDescriptionHtml =
    selectedVar && richTextHasVisibleContent(selectedVar.descriptionHtml)
      ? normalizeProductDescriptionHtml(selectedVar.descriptionHtml)
      : "";
  const listUnitCents = basePriceCents + (selectedVar?.priceDeltaCents ?? 0);
  const priceTiersJson = selectedVar?.priceTiers ?? null;
  const unitPriceCents = unitCentsForVariantQuantity(priceTiersJson, listUnitCents, quantity);

  const maxQuantity = (() => {
    if (variants.length === 0) {
      return productUnlimited ? 99 : Math.max(1, productQuantity);
    }
    if (!selectedVar) return 1;
    if (selectedVar.unlimitedStock) return 99;
    return Math.max(1, selectedVar.stock);
  })();

  const wishlistVariantId = variants.length > 0 ? (selectedVariantId || null) : null;
  const canWishlist =
    variants.length === 0 ||
    Boolean(selectedVariantId && purchasable.some((v) => v.id === selectedVariantId));

  const stockLine = (() => {
    if (variants.length === 0) {
      if (!productUnlimited && productQuantity <= 0) return "Out of stock";
      return productUnlimited ? "Made to order — always available" : `${productQuantity} in stock`;
    }
    if (!selectedVar || !selectedVar.active) return "This option is unavailable.";
    if (selectedVar.unlimitedStock) return "In stock for this option";
    return `${selectedVar.stock} in stock for this option`;
  })();

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="overflow-hidden rounded border-2 border-palm/25 bg-surf/40">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden">
            <div className="relative h-[85%] w-[85%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroUrl}
                alt={productName}
                className="h-full w-full object-contain"
                draggable={false}
              />
              {hero && productDiagonalBrandName?.trim() ? (
                <ProductDiagonalBrandOverlay
                  brandName={productDiagonalBrandName}
                  spacingPx={productDiagonalNameGapPx}
                  opacityPercent={watermarkOpacityPercent}
                />
              ) : null}
            </div>
            {hasGalleryNav ? (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-palm/25 bg-white/90 text-lg font-black leading-none text-palm shadow-sm hover:border-palm/45 hover:bg-white sm:h-10 sm:w-10 sm:text-xl"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-palm/25 bg-white/90 text-lg font-black leading-none text-palm shadow-sm hover:border-palm/45 hover:bg-white sm:h-10 sm:w-10 sm:text-xl"
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        </div>
        {gallery.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {gallery.map((im, idx) => (
              <button
                key={im.id}
                type="button"
                onClick={() => setImageIndex(idx)}
                className={`relative overflow-hidden rounded border-2 p-0.5 ${
                  idx === imageIndex ? "border-palm ring-2 ring-lagoon/30" : "border-palm/25"
                }`}
                aria-label={`Image ${idx + 1} of ${gallery.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={storefrontImageUrl(im)} alt="" className="h-16 w-16 object-contain" />
                {productDiagonalBrandName?.trim() ? (
                  <ProductDiagonalBrandOverlay
                    brandName={productDiagonalBrandName}
                    spacingPx={productDiagonalNameGapPx}
                    opacityPercent={Math.max(18, Math.min(100, Math.round(watermarkOpacityPercent * 0.84)))}
                  />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <h1 className="border-b-2 border-palm/20 pb-3 text-2xl font-black text-palm sm:text-3xl">{productName}</h1>
        {shortDescription ? <p className="mt-4 text-lg text-ink/85">{shortDescription}</p> : null}
        <p className="mt-4 text-2xl font-bold text-ink">
          {formatPriceUsd(unitPriceCents)}
          {quantity > 1 ? <span className="ml-2 text-base font-normal text-ink/70">at qty {quantity}</span> : null}
          {showSale ? <span className="ml-2 text-base font-semibold text-coral">On sale</span> : null}
        </p>
        <p className="mt-2 text-sm text-ink/70">{stockLine}</p>

        {variants.length > 0 ? (
          <div className="mt-6 border-t border-palm/15 pt-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-palm">Choose an option</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((v, idx) => {
                const ok = variantIsPurchasable(v);
                const sel = v.id === selectedVariantId;
                const btnStyle = variantPickerButtonStyle(v, idx, variants.length, sel);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!v.active || !ok}
                    onClick={() => setSelectedVariantId(v.id)}
                    className="rounded border-2 px-3 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      backgroundColor: btnStyle.backgroundColor,
                      borderColor: btnStyle.borderColor,
                      color: btnStyle.color,
                    }}
                  >
                    {v.label}
                    {(() => {
                      const priceLabel = variantOptionPriceLabel(
                        variantPriceDisplay,
                        basePriceCents,
                        v.priceDeltaCents,
                      );
                      return priceLabel ? (
                        <span className="ml-1 font-normal opacity-90">({priceLabel})</span>
                      ) : null;
                    })()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {typesLine ? (
          <p className="mt-4 text-sm text-ink/70">
            <span className="font-bold text-palm">Types: </span>
            {typesLine}
          </p>
        ) : null}

        <AddToCartButton
          productId={productId}
          productUnlimited={productUnlimited}
          canPurchase={canPurchase}
          timedSaleEventId={timedSaleEventId}
          variants={variants.map((v) => ({
            id: v.id,
            label: v.label,
            stock: v.stock,
            unlimitedStock: v.unlimitedStock,
            active: v.active,
          }))}
          selectedVariantId={variants.length ? selectedVariantId : undefined}
          onVariantSelect={variants.length ? setSelectedVariantId : undefined}
          quantity={quantity}
          onQuantityChange={setQuantity}
          priceTiersJson={priceTiersJson}
          listUnitCents={listUnitCents}
          maxQuantity={maxQuantity}
        />

        <AddToWishlistButton
          productId={productId}
          variantId={wishlistVariantId}
          unitPriceCentsAtAdd={unitPriceCents}
          timedSaleEventIdAtAdd={timedSaleEventId}
          callbackUrl={wishlistCallbackUrl}
          disabled={!canWishlist}
          initialInWishlist={initialInWishlist}
          storefrontProductPath={`/product/${productSlug}`}
        />

        {(variantDescriptionHtml || descriptionHtml.trim()) ? (
          <div className="mt-8 space-y-6 border-t border-palm/15 pt-6">
            {variantDescriptionHtml ? (
              <div
                className="store-rich text-ink [&_a]:text-lagoon-dark [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: variantDescriptionHtml }}
              />
            ) : null}
            {variantDescriptionHtml && descriptionHtml.trim() ? (
              <div className="border-t border-palm/15" role="separator" aria-hidden />
            ) : null}
            {descriptionHtml.trim() ? (
              <div
                className="store-rich text-ink [&_a]:text-lagoon-dark [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
