-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "label_preview_match_product_watermark" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_preview_match_diagonal_brand" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_preview_protect_interaction" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_production_unwatermarked" BOOLEAN NOT NULL DEFAULT true;
