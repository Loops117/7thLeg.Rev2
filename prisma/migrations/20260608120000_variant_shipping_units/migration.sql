-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN "shipping_units" INTEGER NOT NULL DEFAULT 1;

-- Copy existing product-level units onto each variation row.
UPDATE "product_variants" pv
SET "shipping_units" = p."shipping_units"
FROM "products" p
WHERE pv."productId" = p."id";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "shipping_units";
