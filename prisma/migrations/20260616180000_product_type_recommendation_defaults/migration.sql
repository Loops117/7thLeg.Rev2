-- CreateTable
CREATE TABLE "product_type_default_recommendations" (
    "type_id" TEXT NOT NULL,
    "related_product_id" TEXT NOT NULL,
    "kind" "ProductRecommendationKind" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_type_default_recommendations_pkey" PRIMARY KEY ("type_id","related_product_id","kind")
);

-- CreateIndex
CREATE INDEX "product_type_default_recommendations_type_id_kind_sort_order_idx" ON "product_type_default_recommendations"("type_id", "kind", "sort_order");

-- AddForeignKey
ALTER TABLE "product_type_default_recommendations" ADD CONSTRAINT "product_type_default_recommendations_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type_default_recommendations" ADD CONSTRAINT "product_type_default_recommendations_related_product_id_fkey" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
