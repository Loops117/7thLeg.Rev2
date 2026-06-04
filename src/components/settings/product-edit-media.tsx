"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getProductMediaAdmin,
  updateProductImageVariant,
  type ProductMediaAdmin,
} from "@/app/actions/product-images-admin";
import { ProductEditorSection } from "@/components/settings/product-editor-section";
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
  initialMedia?: ProductMediaAdmin;
  onVariantPriceDisplaySaved?: (mode: VariantPriceDisplay) => void;
}) {
  const router = useRouter();
  const [epoch, setEpoch] = useState(0);
  const [media, setMedia] = useState<ProductMediaAdmin | undefined>(initialMedia);

  const refreshMedia = useCallback(async () => {
    const m = await getProductMediaAdmin(productId);
    setMedia(m);
    return m;
  }, [productId]);

  useEffect(() => {
    void refreshMedia();
  }, [productId, epoch, refreshMedia]);

  const bump = () => {
    setEpoch((e) => e + 1);
    router.refresh();
  };

  const assignImageVariant = useCallback(
    async (imageId: string, variantId: string | null) => {
      await updateProductImageVariant(imageId, variantId);
      await refreshMedia();
    },
    [refreshMedia],
  );

  const variantCount = media?.variants.length ?? 0;
  const imageCount = media?.images.length ?? 0;
  const variantLinkedImages = media?.images.filter((i) => i.variantId != null).length ?? 0;

  return (
    <div className="space-y-4">
      <ProductEditorSection
        title="Variation Control"
        status={variantCount > 0 ? "active" : "empty"}
        statusLabel={variantCount > 0 ? "In use" : "Not set up"}
        meta={
          variantCount > 0
            ? `${variantCount} variation${variantCount === 1 ? "" : "s"} · ${imageCount} image${imageCount === 1 ? "" : "s"}`
            : "Add variations after saving the product"
        }
      >
        <ProductVariantsSection
          key={`${productId}-${variantPriceDisplay}-${epoch}`}
          productId={productId}
          basePriceCents={basePriceCents}
          variantPriceDisplay={variantPriceDisplay}
          reloadKey={epoch}
          initialVariants={media?.variants}
          images={media?.images ?? []}
          onAssignImageVariant={assignImageVariant}
          onVariantsChanged={bump}
          onVariantPriceDisplaySaved={onVariantPriceDisplaySaved}
        />
      </ProductEditorSection>

      <ProductEditorSection
        title="Product images"
        status={imageCount > 0 ? "active" : "empty"}
        statusLabel={imageCount > 0 ? "In use" : "Empty"}
        meta={
          imageCount > 0
            ? `${imageCount} image${imageCount === 1 ? "" : "s"}${variantLinkedImages > 0 ? ` · ${variantLinkedImages} tied to variations` : ""}`
            : "No uploads yet"
        }
      >
        <ProductImagesManager
          productId={productId}
          variantEpoch={epoch}
          media={media}
          onMediaRefresh={refreshMedia}
          embedded
        />
      </ProductEditorSection>
    </div>
  );
}
