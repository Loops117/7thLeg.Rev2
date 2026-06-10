"use client";

import Link from "next/link";
import { useRef } from "react";
import { ProductQuickAddButton } from "@/components/product-quick-add-button";
import { StoreProductCardPriceRow } from "@/components/store/store-product-card-price-row";
import { ProductDiagonalBrandOverlay } from "@/components/store/product-diagonal-brand-overlay";
import { ProductVariantBadge, storefrontVariantCount } from "@/components/store/product-variant-badge";
import { storefrontDisplayImageUrl } from "@/lib/product-images-public";
import { PRODUCT_UNAVAILABLE_LABEL, productCardAppearsInStock } from "@/lib/product-stock";
import { parseVariantPriceDisplay } from "@/lib/product-variant-price-display";
import { productListPriceCents, storefrontDefaultVariantLabel } from "@/lib/product-list-price-cents";
import type { StorefrontProductCard } from "@/lib/products-storefront";

export function StoreProductCard({
  product: p,
  hover: _hover,
  compact,
  mini,
  recommendationStrip,
  catalogGrid,
  fillImage = false,
  eventId,
  showQuickAdd = false,
  productDiagonalBrandName,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
}: {
  product: StorefrontProductCard;
  /** Parent wrapper should set `data-store-card-hover` (zoom | glow). Kept for API compatibility. */
  hover?: "zoom" | "glow";
  compact?: boolean;
  /** Tighter card for product-page recommendation strips. */
  mini?: boolean;
  /** Uniform mini cards on product-page related / also-want strips. */
  recommendationStrip?: boolean;
  /** Main /store grid: square image (cover) and uniform card height. */
  catalogGrid?: boolean;
  /** Fill the image frame (cover/crop) instead of letterboxing — home carousel strips. */
  fillImage?: boolean;
  eventId?: string | null;
  /** Quick add is for the store catalog grid only, not product detail or featured strips. */
  showQuickAdd?: boolean;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  const img = storefrontDisplayImageUrl(p.images);
  const qs = eventId?.trim() ? `?event=${encodeURIComponent(eventId.trim())}` : "";
  const inStock = productCardAppearsInStock(p);
  const listPriceCents = productListPriceCents(p.basePriceCents, p.variants);
  const priceCents = p.displayPriceCents ?? listPriceCents;
  const cardRef = useRef<HTMLDivElement>(null);
  const variantCount = storefrontVariantCount(p.variants);
  const defaultVariantLabel = !mini ? storefrontDefaultVariantLabel(p.variants) : null;
  const isMini = mini && compact;
  const isRecStrip = recommendationStrip && isMini;
  const isCatalogGrid = catalogGrid && !compact && !mini;
  const imageFillsFrame = isCatalogGrid || fillImage;
  const showCart = showQuickAdd && inStock;
  const padX = isRecStrip || isMini ? "px-1" : compact ? "px-2.5" : "px-3.5";
  const padTop = isRecStrip || isMini ? "pt-1" : compact ? "pt-2.5" : "pt-3.5";
  const padBottom = isRecStrip || isMini ? "pb-1" : compact ? "pb-2.5" : "pb-3.5";
  const footerTop = isRecStrip || isMini ? "pt-0.5" : "pt-2";

  return (
    <div
      ref={cardRef}
      className={`store-product-card relative flex w-full flex-col rounded ${isMini && !isRecStrip ? "" : "h-full"}`}
    >
      <Link
        href={`/product/${p.slug}${qs}`}
        className={`flex flex-col ${isRecStrip ? "h-full min-h-0" : isMini ? "" : "min-h-0 flex-1"}`}
      >
        <div
          className={`store-product-card__image-area relative shrink-0 overflow-hidden ${
            isRecStrip
              ? "aspect-square w-full"
              : isMini
                ? "aspect-square max-h-[4.5rem]"
                : isCatalogGrid || compact
                  ? "aspect-square"
                  : "aspect-[4/3]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary URLs */}
          <img
            src={img}
            alt={p.name}
            className={`h-full w-full ${imageFillsFrame ? "object-cover object-center" : "object-contain"}`}
          />
          {!isMini ? <ProductVariantBadge count={variantCount} /> : null}
          {productDiagonalBrandName?.trim() ? (
            <ProductDiagonalBrandOverlay
              brandName={productDiagonalBrandName}
              spacingPx={productDiagonalNameGapPx}
              opacityPercent={watermarkOpacityPercent}
            />
          ) : null}
        </div>
        <div className={`flex min-h-0 flex-1 flex-col ${padX} ${padTop} pb-0`}>
          <p
            className={`store-product-card__title shrink-0 font-bold ${
              isRecStrip
                ? "line-clamp-2 min-h-[1.65rem] text-[10px] leading-tight"
                : isMini
                  ? "line-clamp-2 text-[10px] leading-tight"
                  : compact
                    ? "line-clamp-2 min-h-[2.5rem] text-xs"
                    : "line-clamp-2 min-h-[2.75rem] text-sm"
            }`}
          >
            {p.name}
          </p>
          {!compact ? (
            <p className="store-product-card__description mt-1 min-h-[3rem] shrink-0 line-clamp-2 text-xs">
              {p.shortDescription?.trim() ? p.shortDescription : "\u00a0"}
            </p>
          ) : null}
        </div>
      </Link>
      <div className={`mt-auto shrink-0 ${padX} ${padBottom} ${footerTop} ${showCart ? "pr-14" : ""}`}>
        <StoreProductCardPriceRow
          priceCents={priceCents}
          showSale={!!(p.displaySale || p.onSale)}
          variantLabel={defaultVariantLabel}
          compact={compact}
          mini={isMini}
        />
        {!inStock ? (
          <p
            className={`store-product-card__stock-warn mt-1 font-medium ${
              isRecStrip ? "line-clamp-2 text-[10px] leading-tight" : "text-xs"
            }`}
          >
            {PRODUCT_UNAVAILABLE_LABEL}
          </p>
        ) : null}
      </div>
      {showCart ? (
        <ProductQuickAddButton
          productId={p.id}
          productName={p.name}
          basePriceCents={priceCents}
          variants={p.variants}
          canPurchase
          timedSaleEventId={eventId}
          variantPriceDisplay={parseVariantPriceDisplay(p.variantPriceDisplay)}
          compact
          pickerMode="card-overlay"
          overlayHostRef={cardRef}
          className="absolute bottom-2 right-2 z-10"
        />
      ) : null}
    </div>
  );
}
