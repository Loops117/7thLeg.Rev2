-- AlterTable
ALTER TABLE "products" ADD COLUMN "shipping_units" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "shipping_options" ADD COLUMN "max_shipping_units" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "product_shipping_option_exclusions" (
    "product_id" TEXT NOT NULL,
    "shipping_option_id" TEXT NOT NULL,

    CONSTRAINT "product_shipping_option_exclusions_pkey" PRIMARY KEY ("product_id","shipping_option_id")
);

-- AddForeignKey
ALTER TABLE "product_shipping_option_exclusions" ADD CONSTRAINT "product_shipping_option_exclusions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_shipping_option_exclusions" ADD CONSTRAINT "product_shipping_option_exclusions_shipping_option_id_fkey" FOREIGN KEY ("shipping_option_id") REFERENCES "shipping_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
