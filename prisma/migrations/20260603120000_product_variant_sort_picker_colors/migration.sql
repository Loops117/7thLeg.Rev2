-- Variation display order + optional storefront picker button colors
ALTER TABLE "product_variants" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "product_variants" ADD COLUMN "picker_bg_hex" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "picker_fg_hex" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "picker_border_hex" TEXT;

WITH ranked AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "label" ASC) - 1)::INTEGER AS rn
  FROM "product_variants"
)
UPDATE "product_variants" AS v
SET "sort_order" = ranked.rn
FROM ranked
WHERE v."id" = ranked."id";
