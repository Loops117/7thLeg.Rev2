-- Move bulk pricing from products to product_variants (per variation).
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "price_tiers_json" JSONB;

UPDATE "product_variants" pv
SET "price_tiers_json" = p."price_tiers_json"
FROM "products" p
WHERE pv."productId" = p."id"
  AND p."price_tiers_json" IS NOT NULL
  AND pv."price_tiers_json" IS NULL;

ALTER TABLE "products" DROP COLUMN IF EXISTS "price_tiers_json";
