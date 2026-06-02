-- Header nav: Shop / Featured / About visibility and custom labels
ALTER TABLE "site_config" ADD COLUMN "nav_shop_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "nav_shop_label" TEXT NOT NULL DEFAULT 'Shop';
ALTER TABLE "site_config" ADD COLUMN "nav_featured_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "nav_featured_label" TEXT NOT NULL DEFAULT 'Featured';
ALTER TABLE "site_config" ADD COLUMN "nav_about_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "nav_about_label" TEXT NOT NULL DEFAULT 'About';
