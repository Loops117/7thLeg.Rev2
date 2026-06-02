-- Favicon, apple-touch, and Open Graph images (Settings → Global).
ALTER TABLE "site_config" ADD COLUMN "site_branding_source" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "site_config" ADD COLUMN "site_branding_assets" JSONB;
