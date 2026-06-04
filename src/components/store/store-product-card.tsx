"use client";

import Link from "next/link";
import { useRef } from "react";
import { ProductQuickAddButton } from "@/components/product-quick-add-button";
import { ProductDiagonalBrandOverlay } from "@/components/store/product-diagonal-brand-overlay";
import { ProductVariantBadge, storefrontVariantCount } from "@/components/store/product-variant-badge";
import { storefrontDisplayImageUrl } from "@/lib/product-images-public";
import { productCardAppearsInStock } from "@/lib/product-stock";
import { parseVariantPriceDisplay } from "@/lib/product-variant-price-display";
import { productListPriceCents } from "@/lib/product-list-price-cents";
import { formatPriceUsd } from "@/lib/product-slug";
import type { StorefrontProductCard } from "@/lib/products-storefront";

export function StoreProductCard({
  product: p,
  hover: _hover,
  compact,
  mini,
  catalogGrid,
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
  /** Main /store grid: square image (cover) and uniform card height. */
  catalogGrid?: boolean;
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
  const isMini = mini && compact;
  const isCatalogGrid = catalogGrid && !compact && !mini;

  return (
    <div
      ref={cardRef}
      className={`store-product-card relative flex w-full flex-col rounded ${isMini ? "" : "h-full"}`}
    >
      <Link href={`/product/${p.slug}${qs}`} className={`flex flex-col ${isMini ? "" : "min-h-0 flex-1"}`}>
        <div
          className={`store-product-card__image-area relative shrink-0 overflow-hidden ${
            isMini
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
            className={`h-full w-full ${isCatalogGrid ? "object-cover object-center" : "object-contain"}`}
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
        <div
          className={`flex flex-col ${isMini ? "p-1" : compact ? "min-h-0 flex-1 p-2" : "min-h-0 flex-1 p-3"}`}
        >
          <p
            className={`store-product-card__title shrink-0 font-bold ${
              isMini
                ? "line-clamp-2 text-[10px] leading-tight"
                : compact
                  ? "line-clamp-2 min-h-[2.25rem] text-xs"
                  : "line-clamp-2 min-h-[2.5rem] text-sm"
            }`}
          >
            {p.name}
          </p>
          {!compact ? (
            <p className="store-product-card__description mt-1 min-h-[2.5rem] shrink-0 line-clamp-2 text-xs">
              {p.shortDescription?.trim() ? p.shortDescription : "\u00a0"}
            </p>
          ) : null}
          <div className={`shrink-0 ${isMini ? "pt-0.5" : "mt-auto pt-2"}`}>
            <p className={`store-product-card__price font-bold ${isMini ? "text-[10px]" : compact ? "text-xs" : "text-sm"}`}>
              {formatPriceUsd(priceCents)}
              {p.displaySale || p.onSale ? <span className="store-product-card__sale ml-1">Sale</span> : null}
            </p>
            {!inStock ? (
              <p className="store-product-card__stock-warn mt-1 text-xs font-medium">Out of stock</p>
            ) : null}
          </div>
        </div>
      </Link>
      {showQuickAdd && inStock ? (
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
