-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "label_cart_show_subtotal_preview" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_cart_merge_with_store_cart" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_cart_min_quantity" INTEGER NOT NULL DEFAULT 1;
