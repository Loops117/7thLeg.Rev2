-- CreateTable
CREATE TABLE "product_kits" (
    "id" TEXT NOT NULL,
    "host_product_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Kit deal',
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_kit_items" (
    "id" TEXT NOT NULL,
    "kit_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_kits_host_product_id_key" ON "product_kits"("host_product_id");

-- CreateIndex
CREATE INDEX "product_kit_items_kit_id_sort_order_idx" ON "product_kit_items"("kit_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_kit_items_kit_id_product_id_variant_id_key" ON "product_kit_items"("kit_id", "product_id", "variant_id");

-- AddForeignKey
ALTER TABLE "product_kits" ADD CONSTRAINT "product_kits_host_product_id_fkey" FOREIGN KEY ("host_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_items" ADD CONSTRAINT "product_kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "product_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_items" ADD CONSTRAINT "product_kit_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_items" ADD CONSTRAINT "product_kit_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN "product_kit_instance_id" TEXT,
ADD COLUMN "product_kit_id" TEXT;

-- CreateIndex
CREATE INDEX "cart_items_product_kit_instance_id_idx" ON "cart_items"("product_kit_instance_id");

-- DropIndex
DROP INDEX IF EXISTS "cart_items_cartId_productId_variantId_pricingScopeKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_variantId_pricingScopeKey_productKit_key" ON "cart_items"("cartId", "productId", "variantId", "pricingScopeKey", "product_kit_instance_id");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_kit_id_fkey" FOREIGN KEY ("product_kit_id") REFERENCES "product_kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "kit_discount_cents" INTEGER NOT NULL DEFAULT 0;
