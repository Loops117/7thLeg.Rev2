-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "nav_in_breeding_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_config" ADD COLUMN "nav_in_breeding_label" TEXT NOT NULL DEFAULT 'In Breeding';
ALTER TABLE "site_config" ADD COLUMN "in_breeding_page_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "in_breeding_page_title" TEXT NOT NULL DEFAULT 'In Breeding';
ALTER TABLE "site_config" ADD COLUMN "in_breeding_banner_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_config" ADD COLUMN "in_breeding_banner_html" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN "in_breeding_featured_strip_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_config" ADD COLUMN "in_breeding_featured_strip_config" JSONB;
ALTER TABLE "site_config" ADD COLUMN "in_breeding_product_card_config" JSONB;
ALTER TABLE "site_config" ADD COLUMN "in_breeding_footer_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_config" ADD COLUMN "in_breeding_footer_html" TEXT NOT NULL DEFAULT '';
