-- Background tile scale range (random per tile, percent of 4rem base)
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "bg_tile_scale_min" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "bg_tile_scale_max" INTEGER NOT NULL DEFAULT 100;

-- One default variation for legacy products (listing price stays on `products.basePriceCents` with `priceDeltaCents` = 0)
INSERT INTO "product_variants" ("id", "productId", "label", "sku", "stock", "unlimitedStock", "active", "priceDeltaCents")
SELECT
  replace(gen_random_uuid()::text, '-', ''),
  p.id,
  'Default',
  NULL,
  p."quantity",
  p."unlimitedQuantity",
  true,
  0
FROM "products" p
WHERE NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."productId" = p.id);

-- When any variation row exists, storefront stock comes from variations; keep product row neutral
UPDATE "products" p
SET "quantity" = 0, "unlimitedQuantity" = false
WHERE EXISTS (SELECT 1 FROM "product_variants" v WHERE v."productId" = p.id);
