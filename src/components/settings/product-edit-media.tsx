"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductMediaAdmin } from "@/app/actions/product-images-admin";
import { ProductImagesManager } from "@/components/settings/product-images-manager";
import type { VariantPriceDisplay } from "@/lib/product-variant-price-display";
import { ProductVariantsSection } from "@/components/settings/product-variants-section";

/** Keeps variant list and image variant-dropdown in sync after add/remove variation. */
export function ProductEditMedia({
  productId,
  basePriceCents,
  variantPriceDisplay,
  initialMedia,
  onVariantPriceDisplaySaved,
}: {
  productId: string;
  basePriceCents: number;
  variantPriceDisplay: VariantPriceDisplay;
  /** From server on edit page — avoids empty flash before first fetch. */
  initialMedia?: ProductMediaAdmin;
  onVariantPriceDisplaySaved?: (mode: VariantPriceDisplay) => void;
}) {
  const router = useRouter();
  const [epoch, setEpoch] = useState(0);

  const bump = () => {
    setEpoch((e) => e + 1);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <ProductVariantsSection
        key={`${productId}-${variantPriceDisplay}`}
        productId={productId}
        basePriceCents={basePriceCents}
        variantPriceDisplay={variantPriceDisplay}
        reloadKey={epoch}
        initialVariants={initialMedia?.variants}
        onVariantsChanged={bump}
        onVariantPriceDisplaySaved={onVariantPriceDisplaySaved}
      />
      <ProductImagesManager
        productId={productId}
        variantEpoch={epoch}
        initialMedia={initialMedia}
      />
    </div>
  );
}
