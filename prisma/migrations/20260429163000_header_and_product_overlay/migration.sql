-- Header visibility toggles + optional diagonal branding on product images
ALTER TABLE "site_config"
  ADD COLUMN IF NOT EXISTS "header_show_company_name" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "site_config"
  ADD COLUMN IF NOT EXISTS "header_show_company_logo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "site_config"
  ADD COLUMN IF NOT EXISTS "product_diagonal_brand_overlay" BOOLEAN NOT NULL DEFAULT false;
