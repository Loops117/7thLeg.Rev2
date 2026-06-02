-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "originalFilename" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "variantId" TEXT;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
