-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "watermarkImageUrl" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN "unlimitedStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "product_variants" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN "watermarkedUrl" TEXT;
ALTER TABLE "product_images" ADD COLUMN "useWatermarkedPublic" BOOLEAN NOT NULL DEFAULT false;
