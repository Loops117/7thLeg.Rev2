/*
  Warnings:

  - You are about to drop the column `productTypeId` on the `automatic_footers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "automatic_footers" DROP CONSTRAINT "automatic_footers_productTypeId_fkey";

-- AlterTable
ALTER TABLE "automatic_footers" DROP COLUMN "productTypeId";

-- CreateTable
CREATE TABLE "product_type_default_footers" (
    "typeId" TEXT NOT NULL,
    "footerId" TEXT NOT NULL,

    CONSTRAINT "product_type_default_footers_pkey" PRIMARY KEY ("typeId","footerId")
);

-- AddForeignKey
ALTER TABLE "product_type_default_footers" ADD CONSTRAINT "product_type_default_footers_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type_default_footers" ADD CONSTRAINT "product_type_default_footers_footerId_fkey" FOREIGN KEY ("footerId") REFERENCES "automatic_footers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
