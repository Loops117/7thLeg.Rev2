-- Per-product: show full variation price or +/- difference on storefront option buttons.
ALTER TABLE "products" ADD COLUMN "variant_price_display" TEXT NOT NULL DEFAULT 'difference';
