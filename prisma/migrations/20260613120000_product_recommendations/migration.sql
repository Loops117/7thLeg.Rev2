-- CreateEnum
CREATE TYPE "ProductRecommendationKind" AS ENUM ('RELATED', 'YOU_MAY_ALSO_WANT');

-- CreateTable
CREATE TABLE "product_recommendations" (
    "product_id" TEXT NOT NULL,
    "related_product_id" TEXT NOT NULL,
    "kind" "ProductRecommendationKind" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("product_id","related_product_id","kind")
);

-- CreateIndex
CREATE INDEX "product_recommendations_product_id_kind_sort_order_idx" ON "product_recommendations"("product_id", "kind", "sort_order");

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_related_product_id_fkey" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
